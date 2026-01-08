/**
 * TUI Compiler - AST Node Types
 *
 * Defines the abstract syntax tree structure for .tui files.
 * Clean, typed, no defensive code.
 */

// =============================================================================
// SOURCE LOCATION
// =============================================================================

export interface Position {
  line: number    // 1-indexed
  column: number  // 0-indexed
  offset: number  // Character offset from start
}

export interface SourceLocation {
  start: Position
  end: Position
}

// =============================================================================
// BASE NODE
// =============================================================================

export interface BaseNode {
  type: string
  loc: SourceLocation
}

// =============================================================================
// TOP-LEVEL: TUI FILE
// =============================================================================

export interface TuiFile extends BaseNode {
  type: 'TuiFile'
  script: ScriptBlock | null
  template: TemplateNode[]
}

// =============================================================================
// SCRIPT BLOCK
// =============================================================================

export interface ScriptBlock extends BaseNode {
  type: 'ScriptBlock'
  lang: 'js' | 'ts'
  content: string
  /** Imports detected in the script */
  imports: ImportDeclaration[]
  /** Exports (props) detected */
  exports: ExportDeclaration[]
}

export interface ImportDeclaration extends BaseNode {
  type: 'ImportDeclaration'
  source: string
  specifiers: ImportSpecifier[]
  raw: string
}

export interface ImportSpecifier {
  imported: string
  local: string
  isDefault: boolean
}

export interface ExportDeclaration extends BaseNode {
  type: 'ExportDeclaration'
  name: string
  hasDefault: boolean
  raw: string
}

// =============================================================================
// TEMPLATE NODES
// =============================================================================

export type TemplateNode =
  | Element
  | TextNode
  | ExpressionNode
  | IfBlock
  | EachBlock
  | AwaitBlock
  | Fragment

// =============================================================================
// ELEMENT
// =============================================================================

export interface Element extends BaseNode {
  type: 'Element'
  tag: string
  attributes: Attribute[]
  children: TemplateNode[]
  selfClosing: boolean
}

export type Attribute =
  | StaticAttribute
  | DynamicAttribute
  | SpreadAttribute
  | BindDirective
  | EventDirective
  | ShorthandAttribute

export interface StaticAttribute extends BaseNode {
  type: 'StaticAttribute'
  name: string
  value: string
}

export interface DynamicAttribute extends BaseNode {
  type: 'DynamicAttribute'
  name: string
  expression: string
}

export interface SpreadAttribute extends BaseNode {
  type: 'SpreadAttribute'
  expression: string
}

export interface BindDirective extends BaseNode {
  type: 'BindDirective'
  name: string      // e.g., 'value' from bind:value
  expression: string
}

export interface EventDirective extends BaseNode {
  type: 'EventDirective'
  name: string      // e.g., 'click' or 'key:enter'
  handler: string
  modifiers: string[]
}

export interface ShorthandAttribute extends BaseNode {
  type: 'ShorthandAttribute'
  name: string      // {foo} → name='foo', expression='foo'
}

// =============================================================================
// TEXT AND EXPRESSIONS
// =============================================================================

export interface TextNode extends BaseNode {
  type: 'TextNode'
  value: string
  /** Raw value before processing */
  raw: string
}

export interface ExpressionNode extends BaseNode {
  type: 'ExpressionNode'
  expression: string
  /** Whether this is inside text content (for auto-unwrap) */
  inText: boolean
}

// =============================================================================
// CONTROL FLOW: IF
// =============================================================================

export interface IfBlock extends BaseNode {
  type: 'IfBlock'
  condition: string
  consequent: TemplateNode[]
  alternate: IfBlock | TemplateNode[] | null
  isElseIf: boolean
}

// =============================================================================
// CONTROL FLOW: EACH
// =============================================================================

export interface EachBlock extends BaseNode {
  type: 'EachBlock'
  expression: string    // The iterable expression
  item: string          // Item variable name
  index: string | null  // Index variable name (optional)
  key: string | null    // Key expression for efficient updates
  body: TemplateNode[]
  fallback: TemplateNode[] | null  // {:else} content
}

// =============================================================================
// CONTROL FLOW: AWAIT
// =============================================================================

export interface AwaitBlock extends BaseNode {
  type: 'AwaitBlock'
  expression: string
  pending: TemplateNode[]
  value: string | null       // Variable name in {:then value}
  fulfilled: TemplateNode[]
  error: string | null       // Variable name in {:catch error}
  rejected: TemplateNode[]
}

// =============================================================================
// FRAGMENT
// =============================================================================

export interface Fragment extends BaseNode {
  type: 'Fragment'
  children: TemplateNode[]
}

// =============================================================================
// SLOT
// =============================================================================

export interface Slot extends BaseNode {
  type: 'Slot'
  name: string | null  // null = default slot
  fallback: TemplateNode[]
}

// =============================================================================
// HELPERS
// =============================================================================

export function createPosition(line: number, column: number, offset: number): Position {
  return { line, column, offset }
}

export function createLocation(start: Position, end: Position): SourceLocation {
  return { start, end }
}

export function isElement(node: TemplateNode): node is Element {
  return node.type === 'Element'
}

export function isTextNode(node: TemplateNode): node is TextNode {
  return node.type === 'TextNode'
}

export function isExpressionNode(node: TemplateNode): node is ExpressionNode {
  return node.type === 'ExpressionNode'
}

export function isIfBlock(node: TemplateNode): node is IfBlock {
  return node.type === 'IfBlock'
}

export function isEachBlock(node: TemplateNode): node is EachBlock {
  return node.type === 'EachBlock'
}

export function isAwaitBlock(node: TemplateNode): node is AwaitBlock {
  return node.type === 'AwaitBlock'
}

export function isFragment(node: TemplateNode): node is Fragment {
  return node.type === 'Fragment'
}
