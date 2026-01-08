/**
 * TUI Compiler
 *
 * Compile .tui template files to TypeScript.
 * Svelte-like DX for terminal UIs.
 *
 * @example
 * ```ts
 * import { compile } from '@rlabs-inc/tui-compiler'
 *
 * const result = compile(source, { filename: 'App.tui' })
 * console.log(result.code)
 * ```
 *
 * @example Using the Bun plugin
 * ```ts
 * import { tuiPlugin } from '@rlabs-inc/tui-compiler/plugin'
 * Bun.plugin(tuiPlugin)
 *
 * // Now you can import .tui files
 * import App from './App.tui'
 * ```
 */

// Parse
export { parse, tokenize } from './parse'
export type {
  TuiFile,
  ScriptBlock,
  TemplateNode,
  Element,
  TextNode,
  ExpressionNode,
  IfBlock,
  EachBlock,
  AwaitBlock,
  Fragment,
  Attribute,
  SourceLocation,
  Position,
} from './parse'

// Transform
export {
  createImportCollector,
  generateImports,
  analyzeScript,
  transformTemplate,
} from './transform'

// Generate
export { compile } from './generate'
export type { CompileOptions, CompileResult } from './generate'

// Errors
export { CompilerError, formatError, formatErrors } from './utils/errors'

// Plugin (re-export for convenience)
export { createTuiPlugin, tuiPlugin, register } from './plugin'
