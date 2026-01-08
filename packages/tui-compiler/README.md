# @rlabs-inc/tui-compiler

Compiler for `.tui` template files - Svelte-like syntax for terminal UIs.

## Overview

The TUI compiler transforms `.tui` files into TypeScript components that work with the TUI framework. Write declarative templates with reactive expressions, and the compiler generates efficient, type-safe code.

```tui
<script>
  import { signal } from '@rlabs-inc/signals'

  const count = signal(0)
  const increment = () => count.value++
</script>

<box border={1} padding={1}>
  <text>Count: {count}</text>
</box>
```

Compiles to:

```typescript
import { signal, derived, unwrap } from '@rlabs-inc/signals'
import { box, text } from '@rlabs-inc/tui'

export default function Counter() {
  const count = signal(0)
  const increment = () => count.value++

  box({
    border: 1,
    padding: 1,
    children: () => {
      text({ content: derived(() => `Count: ${unwrap(count)}`) })
    }
  })
}
```

## Installation

```bash
bun add @rlabs-inc/tui-compiler
```

## Usage

### Bun Plugin (Recommended)

Register the plugin to import `.tui` files directly:

```typescript
// bunfig.toml or in your entry file
import '@rlabs-inc/tui-compiler/register'

// Now you can import .tui files!
import Counter from './Counter.tui'
```

Or configure manually:

```typescript
import { tuiPlugin } from '@rlabs-inc/tui-compiler/plugin'

Bun.plugin(tuiPlugin())
```

### Programmatic API

```typescript
import { compile } from '@rlabs-inc/tui-compiler'

const source = `<box><text>Hello</text></box>`
const result = compile(source, { filename: 'Hello.tui' })

console.log(result.code)      // Generated TypeScript
console.log(result.imports)   // Detected imports
console.log(result.warnings)  // Any warnings
```

## Syntax

### Script Block

TypeScript/JavaScript code goes in `<script>`:

```tui
<script>
  import { signal, derived } from '@rlabs-inc/signals'
  import { keyboard } from '@rlabs-inc/tui'

  const name = signal('World')

  // Event handling via APIs
  keyboard.onKey('Enter', () => console.log('Enter pressed'))
</script>
```

### Props (Component Inputs)

Export variables to define component props:

```tui
<script>
  export let label = 'Click me'
  export let variant = 'primary'
</script>

<box {variant}>
  <text>{label}</text>
</box>
```

### Template Expressions

Dynamic values use `{expression}`:

```tui
<text>Hello {name}</text>
<text>Count: {count.value}</text>
<text>{items.length} items</text>
```

### Attributes

```tui
<!-- Static -->
<box width="50" border={1}>

<!-- Dynamic -->
<box width={dynamicWidth} height={computed.value}>

<!-- Shorthand (same name) -->
<box {variant} {border}>

<!-- Spread -->
<box {...props}>
```

### Control Flow

#### Conditionals

```tui
{#if condition}
  <text>Shown when true</text>
{:else if other}
  <text>Alternative</text>
{:else}
  <text>Fallback</text>
{/if}
```

#### Loops

```tui
{#each items as item, index (item.id)}
  <text>{index}: {item.name}</text>
{:else}
  <text>No items</text>
{/each}
```

#### Async

```tui
{#await promise}
  <text>Loading...</text>
{:then data}
  <text>Got: {data}</text>
{:catch error}
  <text>Error: {error.message}</text>
{/await}
```

### Slots

Components can accept children via slots:

```tui
<!-- Card.tui -->
<box border={1}>
  <slot />           <!-- Default slot -->
  <slot name="footer" />  <!-- Named slot -->
</box>

<!-- Usage -->
<Card>
  <text>Card content</text>
  <text slot="footer">Footer text</text>
</Card>
```

### Two-Way Binding

Bind signals to component props:

```tui
<script>
  const username = signal('')
</script>

<input bind:value={username} />
```

> Note: The `input` primitive is not yet implemented. Two-way binding infrastructure is ready.

### Event Handling

Use the keyboard and mouse APIs in your script:

```tui
<script>
  import { keyboard, mouse } from '@rlabs-inc/tui'

  keyboard.onKey('Enter', handleSubmit)
  keyboard.onFocused(componentIndex, handleFocusedKey)
  mouse.onClick(handleClick)
</script>
```

> Note: Template event syntax (`on:click`, `on:key:enter`) is not yet implemented.

## Built-in Components

The compiler auto-imports these from `@rlabs-inc/tui`:

- `box` - Container with flexbox layout, borders, backgrounds
- `text` - Text display with styling

## What's Implemented

- [x] Script blocks (JS/TS)
- [x] Props via `export let`
- [x] Template expressions `{expr}`
- [x] Static and dynamic attributes
- [x] Shorthand attributes `{name}`
- [x] Spread attributes `{...props}`
- [x] Control flow: `{#if}`, `{#each}`, `{#await}`
- [x] Slots (default and named)
- [x] Two-way binding syntax `bind:value`
- [x] Auto-imports for signals and TUI primitives
- [x] Component composition (PascalCase = user component)

## Not Yet Implemented

- [ ] Template event directives (`on:click`, `on:key:enter`)
- [ ] `input`, `select`, `progress` primitives
- [ ] Source maps
- [ ] Hot module replacement

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for compiler internals:

1. **Lexer** - Tokenizes .tui source
2. **Parser** - Builds AST
3. **Transformer** - Converts template AST to code
4. **Code Generator** - Produces final TypeScript

## License

MIT
