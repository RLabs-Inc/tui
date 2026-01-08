# TUI Compiler Architecture

Internal documentation for compiler developers.

## Overview

The TUI compiler transforms `.tui` template files into TypeScript code that uses the TUI framework primitives.

```
.tui file
    ↓ Lexer
Tokens
    ↓ Parser
AST
    ↓ Analyzer
Analyzed AST + Import Info
    ↓ Transformer
Intermediate Representation
    ↓ Code Generator
TypeScript Output
```

## Directory Structure

```
packages/tui-compiler/
├── src/
│   ├── index.ts              # Main exports
│   ├── plugin.ts             # Bun plugin
│   ├── register.ts           # Auto-registration
│   │
│   ├── parse/                # Parsing phase
│   │   ├── ast.ts            # AST node types
│   │   ├── lexer.ts          # Tokenizer
│   │   ├── parser.ts         # Parser
│   │   └── index.ts
│   │
│   ├── transform/            # Analysis & transformation
│   │   ├── imports.ts        # Auto-import detection
│   │   ├── script.ts         # Script block analysis
│   │   ├── template.ts       # Template transformation
│   │   └── index.ts
│   │
│   ├── generate/             # Code generation
│   │   ├── codegen.ts        # TypeScript generator
│   │   └── index.ts
│   │
│   └── utils/
│       └── errors.ts         # Error handling
│
├── test/
│   └── compile.test.ts       # Test suite
│
├── examples/
│   ├── Counter.tui           # Example component
│   └── show-compiled.ts      # Shows compiled output
│
└── docs/
    ├── SYNTAX.md             # User-facing syntax docs
    └── ARCHITECTURE.md       # This file
```

## Phase 1: Lexer (`parse/lexer.ts`)

The lexer tokenizes the `.tui` source into a stream of tokens.

### Token Types

```typescript
type TokenType =
  // Structure
  | 'ScriptStart'       // <script> or <script lang="ts">
  | 'ScriptEnd'         // </script>
  | 'ScriptContent'     // Content inside script

  // Template
  | 'TagOpen'           // <
  | 'TagClose'          // >
  | 'TagSelfClose'      // />
  | 'TagEnd'            // </
  | 'TagName'           // box, text, etc.

  // Attributes
  | 'AttributeName'     // width, variant, etc.
  | 'AttributeEquals'   // =
  | 'AttributeValue'    // "value" or 'value'
  | 'AttributeExpr'     // {expression}
  | 'Spread'            // {...props}
  | 'Shorthand'         // {name}

  // Directives
  | 'BindDirective'     // bind:name
  | 'OnDirective'       // on:event

  // Text and expressions
  | 'Text'              // Plain text content
  | 'Expression'        // {expression}

  // Control flow
  | 'BlockOpen'         // {#
  | 'BlockContinue'     // {:
  | 'BlockClose'        // {/
  | 'BlockKeyword'      // if, each, await
  | 'BlockExpression'   // Condition after keyword

  // Special
  | 'FragmentOpen'      // <>
  | 'FragmentClose'     // </>
  | 'EOF'
```

### Lexer State Machine

The lexer operates in different modes:

1. **template** - Scanning template content
2. **script** - Inside `<script>` block
3. **tag** - Inside an element tag (scanning attributes)

### Key Methods

```typescript
class Lexer {
  tokenize(): Token[]           // Main entry point

  // Mode handlers
  private scanScriptBlock()     // Handle <script>
  private scanScriptContent()   // Handle script body
  private scanTemplateContent() // Handle template
  private scanTagContent()      // Handle attributes

  // Specific scanners
  private scanOpeningTag()
  private scanClosingTag()
  private scanAttribute()
  private scanExpression()
  private scanText()
  private scanBlockOpen()       // {#if, {#each, etc.
  private scanBlockContinue()   // {:else, {:then, etc.
  private scanBlockClose()      // {/if, {/each, etc.
}
```

## Phase 2: Parser (`parse/parser.ts`)

The parser transforms tokens into an Abstract Syntax Tree (AST).

### AST Node Types

```typescript
// Top level
interface TuiFile {
  type: 'TuiFile'
  script: ScriptBlock | null
  template: TemplateNode[]
}

// Script
interface ScriptBlock {
  type: 'ScriptBlock'
  lang: 'js' | 'ts'
  content: string
}

// Template nodes
type TemplateNode =
  | Element
  | TextNode
  | ExpressionNode
  | IfBlock
  | EachBlock
  | AwaitBlock
  | Fragment

// Element
interface Element {
  type: 'Element'
  tag: string
  attributes: Attribute[]
  children: TemplateNode[]
  selfClosing: boolean
}

// Attributes
type Attribute =
  | StaticAttribute      // name="value"
  | DynamicAttribute     // name={expr}
  | SpreadAttribute      // {...props}
  | BindDirective        // bind:name={expr}
  | EventDirective       // on:event={handler}
  | ShorthandAttribute   // {name}

// Control flow
interface IfBlock {
  type: 'IfBlock'
  condition: string
  consequent: TemplateNode[]
  alternate: IfBlock | TemplateNode[] | null
}

interface EachBlock {
  type: 'EachBlock'
  expression: string
  item: string
  index: string | null
  key: string | null
  body: TemplateNode[]
  fallback: TemplateNode[] | null
}
```

### Parser Methods

```typescript
class Parser {
  parse(): TuiFile              // Main entry point

  // Block parsers
  private parseScriptBlock()
  private parseTemplateNode()

  // Element parsing
  private parseElement()
  private parseAttributes()
  private parseAttribute()
  private parseChildren()

  // Control flow
  private parseBlock()
  private parseIfBlock()
  private parseEachBlock()
  private parseAwaitBlock()

  // Text/expressions
  private parseText()
  private parseExpression()
}
```

## Phase 3: Transform (`transform/`)

### Import Detection (`imports.ts`)

Automatically detects and collects required imports:

```typescript
// Signals primitives we auto-import
const SIGNALS_PRIMITIVES = new Set([
  'signal', 'state', 'derived', 'effect', 'bind',
  'linkedSignal', 'createSelector', 'effectScope',
  'batch', 'untrack', 'peek', 'flushSync', 'tick', 'unwrap',
  'ReactiveMap', 'ReactiveSet',
  'setContext', 'getContext',
])

// TUI primitives we auto-import
const TUI_PRIMITIVES = new Set([
  'box', 'text', 'input', 'select', 'progress', 'canvas',
  'mount', 'keyboard', 'mouse', 'focus', 'scroll', 'cursor', 'theme',
])

interface ImportCollector {
  signals: Set<string>              // From @rlabs-inc/signals
  tui: Set<string>                  // From @rlabs-inc/tui
  components: Map<string, string>   // User components
}
```

### Script Analysis (`script.ts`)

Analyzes the script block:

```typescript
interface ScriptAnalysis {
  content: string
  lang: 'js' | 'ts'
  userImports: string[]       // Preserved user imports
  exports: PropExport[]       // Component props
  body: string                // Code after removing imports/exports
  usedIdentifiers: Set<string>
}

interface PropExport {
  name: string
  hasDefault: boolean
  defaultValue?: string
  type?: string
}
```

### Template Transform (`template.ts`)

Transforms template AST to function calls:

```typescript
// Input: <box width="50"><text>Hello</text></box>
// Output: box({ width: "50", children: () => { text({ content: "Hello" }) } })

// Input: <text>Count: {count}</text>
// Output: text({ content: derived(() => `Count: ${unwrap(count)}`) })
```

Key transformations:

| Template | Generated Code |
|----------|----------------|
| `<box>` | `box({...})` |
| `<text>Hello</text>` | `text({ content: "Hello" })` |
| `<text>{expr}</text>` | `text({ content: expr })` |
| `<text>Hi {name}!</text>` | `text({ content: derived(() => \`Hi ${unwrap(name)}!\`) })` |
| `width="50"` | `width: "50"` |
| `width={expr}` | `width: expr` (or `derived(() => expr)` if complex) |
| `{...props}` | `...props` |
| `{name}` | `name` (shorthand) |
| `bind:value={x}` | `value: x` |
| `on:click={fn}` | `onClick: fn` |

## Phase 4: Code Generation (`generate/codegen.ts`)

Generates the final TypeScript output:

```typescript
interface CompileOptions {
  filename?: string
  sourcemap?: boolean
  dev?: boolean
  name?: string
}

interface CompileResult {
  code: string
  map?: string
  warnings: string[]
  imports: {
    signals: string[]
    tui: string[]
    components: [string, string][]
  }
}
```

### Output Structure

```typescript
/**
 * Generated by TUI Compiler
 * Source: Component.tui
 */

// Auto-generated imports
import { signal, derived } from '@rlabs-inc/signals'
import { box, text } from '@rlabs-inc/tui'

// User imports (preserved)
import SomeLib from 'some-lib'

// Props interface (if component has props)
interface Props {
  label?: string
  count: number
}

// Component function
export default function ComponentName(props: Props) {
  // Props destructuring
  const { label = 'default', count } = props

  // User script body
  const doubled = derived(() => count * 2)

  // Template
  box({
    children: () => {
      text({ content: label })
    }
  })
}
```

## Phase 5: Bun Plugin (`plugin.ts`)

Integrates with Bun's module system:

```typescript
import type { BunPlugin } from 'bun'

export function createTuiPlugin(options?: TuiPluginOptions): BunPlugin {
  return {
    name: 'tui-compiler',
    setup(build) {
      build.onLoad({ filter: /\.tui$/ }, async ({ path }) => {
        const source = await Bun.file(path).text()
        const result = compile(source, { filename: path, ...options })

        return {
          contents: result.code,
          loader: 'tsx',
        }
      })
    }
  }
}
```

### Usage

```typescript
// Method 1: Explicit registration
import { tuiPlugin } from '@rlabs-inc/tui-compiler/plugin'
Bun.plugin(tuiPlugin)

// Method 2: Auto-registration (bunfig.toml)
// preload = ["@rlabs-inc/tui-compiler/register"]

// Method 3: Import in entry file
import '@rlabs-inc/tui-compiler/register'
```

## Error Handling (`utils/errors.ts`)

Beautiful error messages with source context:

```typescript
class CompilerError extends Error {
  code: ErrorCode
  loc: SourceLocation
  filename: string
  source: string
  hint?: string

  format(): string  // Returns formatted error with source context
}

// Example output:
//
// error[UNCLOSED_TAG]: Unclosed <box> tag
//   --> Component.tui:5:3
//
// 3 | <box>
// 4 |   <text>Hello
//   |   ^^^^^^^^^^^^
//
// hint: Add </text> to close the tag
```

## Adding New Features

### Adding a New Element Type

1. No changes needed in parser (generic element handling)
2. Add to `TUI_PRIMITIVES` in `transform/imports.ts`
3. Template transformer handles it automatically

### Adding a New Directive

1. Add token type in `lexer.ts` if needed
2. Add attribute type in `ast.ts`
3. Handle in `parser.ts` `parseAttribute()`
4. Transform in `template.ts` `transformAttributes()`

### Adding a New Control Flow Block

1. Add token handling in `lexer.ts` `scanBlockOpen()`, etc.
2. Add AST type in `ast.ts`
3. Add parser method in `parser.ts`
4. Add transformer in `template.ts`

## Testing

Run tests:

```bash
cd packages/tui-compiler
bun test
```

Test structure:
- Lexer tests: Token generation
- Parser tests: AST structure
- Compiler tests: Full compilation
- Error tests: Error detection and messages

## Performance Considerations

1. **Lexer**: Single-pass, O(n) tokenization
2. **Parser**: Single-pass, recursive descent
3. **Transform**: Single AST traversal
4. **No runtime overhead**: All work done at compile time

## Future Improvements

1. **Source maps**: Map generated code back to .tui source
2. **Error recovery**: Continue parsing after errors
3. **Incremental compilation**: Cache AST for unchanged files
4. **Watch mode**: Recompile on file changes
5. **IDE integration**: Language server for autocomplete
