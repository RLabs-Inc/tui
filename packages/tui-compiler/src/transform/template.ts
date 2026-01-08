/**
 * TUI Compiler - Template Transformer
 *
 * Transforms template AST to function call code.
 * <box> → box({...})
 * <text>Hello {name}</text> → text({ content: derived(() => `Hello ${unwrap(name)}`) })
 */

import type {
  TemplateNode,
  Element,
  TextNode,
  ExpressionNode,
  IfBlock,
  EachBlock,
  AwaitBlock,
  Fragment,
  Slot,
  Attribute,
} from '../parse/ast'
import {
  type ImportCollector,
  isBuiltinComponent,
  isUserComponent,
  isSignalsPrimitive,
  isTuiPrimitive,
  SIGNALS_PRIMITIVES,
  TUI_PRIMITIVES,
} from './imports'

// =============================================================================
// TRANSFORM CONTEXT
// =============================================================================

export interface TransformContext {
  imports: ImportCollector
  indent: number
  inTextContent: boolean
}

export function createContext(imports: ImportCollector): TransformContext {
  return {
    imports,
    indent: 0,
    inTextContent: false,
  }
}

// =============================================================================
// MAIN TRANSFORMER
// =============================================================================

export function transformTemplate(
  nodes: TemplateNode[],
  ctx: TransformContext
): string {
  const lines: string[] = []

  for (const node of nodes) {
    const code = transformNode(node, ctx)
    if (code) {
      lines.push(code)
    }
  }

  return lines.join('\n')
}

export function transformNode(
  node: TemplateNode,
  ctx: TransformContext
): string {
  switch (node.type) {
    case 'Element':
      return transformElement(node, ctx)
    case 'TextNode':
      return transformText(node, ctx)
    case 'ExpressionNode':
      return transformExpression(node, ctx)
    case 'IfBlock':
      return transformIf(node, ctx)
    case 'EachBlock':
      return transformEach(node, ctx)
    case 'AwaitBlock':
      return transformAwait(node, ctx)
    case 'Fragment':
      return transformFragment(node, ctx)
    case 'Slot':
      return transformSlot(node, ctx)
    default:
      return ''
  }
}

// =============================================================================
// ELEMENT
// =============================================================================

function transformElement(node: Element, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)
  const tag = node.tag

  // Track import
  if (isBuiltinComponent(tag)) {
    ctx.imports.tui.add(tag)
  }

  // Build props
  const props = transformAttributes(node.attributes, ctx)

  // Handle children
  if (node.children.length > 0) {
    // Check if children are just text content (for text component)
    if (tag === 'text' && canBeInlineContent(node.children)) {
      const content = transformInlineContent(node.children, ctx)
      if (props) {
        return `${indent}${tag}({ ${props}, content: ${content} })`
      }
      return `${indent}${tag}({ content: ${content} })`
    }

    // For user components (PascalCase), pass children as slots
    if (isUserComponent(tag)) {
      return transformUserComponentWithChildren(node, ctx, indent, tag, props)
    }

    // Regular built-in children
    const childCtx = { ...ctx, indent: ctx.indent + 1 }
    const childCode = node.children
      .map(child => transformNode(child, childCtx))
      .filter(Boolean)
      .join('\n')

    if (props) {
      return `${indent}${tag}({\n${indent}  ${props},\n${indent}  children: () => {\n${childCode}\n${indent}  }\n${indent}})`
    }
    return `${indent}${tag}({\n${indent}  children: () => {\n${childCode}\n${indent}  }\n${indent}})`
  }

  // Self-closing or no children
  if (isUserComponent(tag)) {
    // User components: Component(props) or Component({...props})
    if (props) {
      return `${indent}${tag}({ ${props} })`
    }
    return `${indent}${tag}()`
  }

  if (props) {
    return `${indent}${tag}({ ${props} })`
  }
  return `${indent}${tag}()`
}

/**
 * Transform a user component with children into slot calls.
 * Children are grouped by their slot="name" attribute.
 */
function transformUserComponentWithChildren(
  node: Element,
  ctx: TransformContext,
  indent: string,
  tag: string,
  props: string
): string {
  // Group children by slot name
  const slots: Map<string, Element[]> = new Map()
  const defaultSlotChildren: (Element | TextNode | ExpressionNode | IfBlock | EachBlock | AwaitBlock | Fragment | Slot)[] = []

  for (const child of node.children) {
    // Check for slot attribute on elements
    if (child.type === 'Element') {
      const slotAttr = child.attributes.find(
        a => a.type === 'StaticAttribute' && a.name === 'slot'
      )
      if (slotAttr && slotAttr.type === 'StaticAttribute') {
        const slotName = slotAttr.value
        if (!slots.has(slotName)) {
          slots.set(slotName, [])
        }
        // Remove the slot attribute from the child
        const childWithoutSlot: Element = {
          ...child,
          attributes: child.attributes.filter(a => a !== slotAttr)
        }
        slots.get(slotName)!.push(childWithoutSlot)
        continue
      }
    }
    // Everything else goes to default slot
    defaultSlotChildren.push(child)
  }

  // Build slots object
  const slotParts: string[] = []
  const childCtx = { ...ctx, indent: ctx.indent + 2 }

  // Default slot
  if (defaultSlotChildren.length > 0) {
    const defaultCode = defaultSlotChildren
      .map(child => transformNode(child, childCtx))
      .filter(Boolean)
      .join('\n')
    slotParts.push(`${indent}    default: () => {\n${defaultCode}\n${indent}    }`)
  }

  // Named slots
  for (const [slotName, slotChildren] of slots) {
    const slotCode = slotChildren
      .map(child => transformNode(child, childCtx))
      .filter(Boolean)
      .join('\n')
    slotParts.push(`${indent}    ${slotName}: () => {\n${slotCode}\n${indent}    }`)
  }

  // Generate component call
  const slotsObj = slotParts.length > 0
    ? `{\n${slotParts.join(',\n')}\n${indent}  }`
    : '{}'

  if (props) {
    return `${indent}${tag}({ ${props} }, ${slotsObj})`
  }
  return `${indent}${tag}({}, ${slotsObj})`
}

// Helper to scan expressions for auto-imports
function scanExpressionForImports(expr: string, ctx: TransformContext): void {
  const allPrimitives = [...SIGNALS_PRIMITIVES, ...TUI_PRIMITIVES]
  for (const primitive of allPrimitives) {
    if (expr.includes(primitive)) {
      const regex = new RegExp(`\\b${primitive}\\b`)
      if (regex.test(expr)) {
        if (isSignalsPrimitive(primitive)) {
          ctx.imports.signals.add(primitive)
        } else if (isTuiPrimitive(primitive)) {
          ctx.imports.tui.add(primitive)
        }
      }
    }
  }
}

function transformAttributes(attrs: Attribute[], ctx: TransformContext): string {
  const parts: string[] = []

  for (const attr of attrs) {
    switch (attr.type) {
      case 'StaticAttribute':
        parts.push(`${attr.name}: ${JSON.stringify(attr.value)}`)
        break

      case 'DynamicAttribute':
        // Scan expression for imports
        scanExpressionForImports(attr.expression, ctx)
        // Pass expression directly - bind() in primitives handles reactivity
        // Only wrap in derived() if it's a computed expression that reads signals
        if (needsDerived(attr.expression)) {
          ctx.imports.signals.add('derived')
          parts.push(`${attr.name}: derived(() => ${attr.expression})`)
        } else {
          parts.push(`${attr.name}: ${attr.expression}`)
        }
        break

      case 'SpreadAttribute':
        parts.push(`...${attr.expression}`)
        break

      case 'ShorthandAttribute':
        parts.push(attr.name)
        break

      case 'BindDirective':
        parts.push(`${attr.name}: ${attr.expression}`)
        break

      case 'EventDirective':
        // Event directives not yet supported in templates
        // Use keyboard.onKey(), mouse.onClick(), etc. in <script> instead
        break
    }
  }

  return parts.join(', ')
}

// =============================================================================
// TEXT CONTENT
// =============================================================================

function canBeInlineContent(nodes: TemplateNode[]): boolean {
  return nodes.every(
    n => n.type === 'TextNode' || n.type === 'ExpressionNode'
  )
}

function transformInlineContent(
  nodes: TemplateNode[],
  ctx: TransformContext
): string {
  // Single static text
  if (nodes.length === 1 && nodes[0]!.type === 'TextNode') {
    return JSON.stringify((nodes[0] as TextNode).value)
  }

  // Single expression - always wrap in derived + unwrap for unified DX
  // This handles signal(), state(), derived(), and plain values uniformly
  if (nodes.length === 1 && nodes[0]!.type === 'ExpressionNode') {
    const expr = (nodes[0] as ExpressionNode).expression
    ctx.imports.signals.add('derived')
    ctx.imports.signals.add('unwrap')
    return `derived(() => unwrap(${expr}))`
  }

  // Mixed content - create template literal
  ctx.imports.signals.add('derived')
  ctx.imports.signals.add('unwrap')

  const parts = nodes.map(node => {
    if (node.type === 'TextNode') {
      return escapeTemplateString((node as TextNode).value)
    }
    if (node.type === 'ExpressionNode') {
      const expr = (node as ExpressionNode).expression
      return `\${unwrap(${expr})}`
    }
    return ''
  })

  return `derived(() => \`${parts.join('')}\`)`
}

function transformText(node: TextNode, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)
  const value = node.value.trim()

  if (!value) return ''

  ctx.imports.tui.add('text')
  return `${indent}text({ content: ${JSON.stringify(value)} })`
}

function transformExpression(node: ExpressionNode, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)
  const expr = node.expression

  ctx.imports.tui.add('text')
  ctx.imports.signals.add('derived')
  ctx.imports.signals.add('unwrap')

  // Always use derived + unwrap for unified DX across signal/state/derived/plain
  return `${indent}text({ content: derived(() => unwrap(${expr})) })`
}

// =============================================================================
// CONTROL FLOW
// =============================================================================

function transformIf(node: IfBlock, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)
  ctx.imports.signals.add('derived')

  let code = `${indent}// Conditional: {#if ${node.condition}}\n`

  // Collect all conditions for else branches
  const conditions: string[] = [node.condition]

  // If branch - inject visible into each child
  code += transformBranchChildren(node.consequent, node.condition, ctx)

  // Handle else if / else chains
  code += transformIfBranches(node.alternate, conditions, ctx)

  return code
}

/**
 * Transform children of a conditional branch by injecting visible prop.
 * No wrapper boxes - just add visible to each top-level child.
 */
function transformBranchChildren(
  children: TemplateNode[],
  condition: string,
  ctx: TransformContext
): string {
  let code = ''

  for (const child of children) {
    if (child.type === 'Element') {
      // Inject visible prop into the element
      code += transformElementWithVisible(child, condition, ctx) + '\n'
    } else if (child.type === 'TextNode' || child.type === 'ExpressionNode') {
      // For text nodes, we need to wrap in text() with visible
      // But text() doesn't have visible prop, so wrap in box
      // Actually, let's check if it's just whitespace
      if (child.type === 'TextNode' && !(child as TextNode).value.trim()) {
        continue // Skip whitespace
      }
      // For non-element children, we DO need a wrapper since text() doesn't have visible
      ctx.imports.tui.add('box')
      const indent = '  '.repeat(ctx.indent)
      code += `${indent}box({ visible: derived(() => ${condition}), children: () => {\n`
      code += transformNode(child, { ...ctx, indent: ctx.indent + 1 }) + '\n'
      code += `${indent}}})\n`
    } else {
      // Other nodes (nested if/each) - transform normally
      code += transformNode(child, ctx) + '\n'
    }
  }

  return code
}

/**
 * Transform an element with an injected visible prop.
 */
function transformElementWithVisible(
  node: Element,
  condition: string,
  ctx: TransformContext
): string {
  const indent = '  '.repeat(ctx.indent)
  const tag = node.tag

  // Track import
  if (isBuiltinComponent(tag)) {
    ctx.imports.tui.add(tag)
  }

  // Build props with visible injected
  const props = transformAttributes(node.attributes, ctx)
  const visibleProp = `visible: derived(() => ${condition})`
  const allProps = props ? `${visibleProp}, ${props}` : visibleProp

  // Handle children
  if (node.children.length > 0) {
    // Check if children are just text content (for text component)
    if (tag === 'text' && canBeInlineContent(node.children)) {
      const content = transformInlineContent(node.children, ctx)
      return `${indent}${tag}({ ${allProps}, content: ${content} })`
    }

    // For user components (PascalCase), pass children as slots
    if (isUserComponent(tag)) {
      return transformUserComponentWithVisibleAndChildren(node, ctx, indent, tag, allProps)
    }

    // Regular built-in children
    const childCtx = { ...ctx, indent: ctx.indent + 1 }
    const childCode = node.children
      .map(child => transformNode(child, childCtx))
      .filter(Boolean)
      .join('\n')

    return `${indent}${tag}({\n${indent}  ${allProps},\n${indent}  children: () => {\n${childCode}\n${indent}  }\n${indent}})`
  }

  // Self-closing or no children
  if (isUserComponent(tag)) {
    return `${indent}${tag}({ ${allProps} })`
  }

  return `${indent}${tag}({ ${allProps} })`
}

/**
 * Transform user component with visible and children.
 */
function transformUserComponentWithVisibleAndChildren(
  node: Element,
  ctx: TransformContext,
  indent: string,
  tag: string,
  allProps: string
): string {
  // Simplified: just pass children as default slot
  const childCtx = { ...ctx, indent: ctx.indent + 2 }
  const childCode = node.children
    .map(child => transformNode(child, childCtx))
    .filter(Boolean)
    .join('\n')

  const slotsObj = `{\n${indent}    default: () => {\n${childCode}\n${indent}    }\n${indent}  }`
  return `${indent}${tag}({ ${allProps} }, ${slotsObj})`
}

// Helper to generate else if / else branches with visible prop
function transformIfBranches(
  alternate: IfBlock['alternate'],
  previousConditions: string[],
  ctx: TransformContext
): string {
  if (!alternate) {
    return ''
  }

  ctx.imports.signals.add('derived')

  if (Array.isArray(alternate)) {
    // Final else block - visible when ALL previous conditions are false
    const elseCondition = previousConditions.map(c => `!(${c})`).join(' && ')
    return transformBranchChildren(alternate, elseCondition, ctx)
  } else {
    // else if branch
    const elseIfNode = alternate as IfBlock
    // visible when this condition is true AND all previous are false
    const prevFalse = previousConditions.map(c => `!(${c})`).join(' && ')
    const elseIfCondition = `(${prevFalse}) && (${elseIfNode.condition})`

    let code = transformBranchChildren(elseIfNode.consequent, elseIfCondition, ctx)

    // Recurse for further else if / else - add this condition to the list
    const newConditions = [...previousConditions, elseIfNode.condition]
    code += transformIfBranches(elseIfNode.alternate, newConditions, ctx)
    return code
  }
}

function transformEach(node: EachBlock, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)

  // TUI architecture: NO effects! Simple loop at mount time.
  // For reactive arrays that change length, use a List component (future feature)
  const indexPart = node.index ? `, ${node.index}` : ''

  let code = `${indent}// Loop: {#each ${node.expression} as ${node.item}${indexPart}}\n`
  // Use .value if it's a signal/state, otherwise direct access
  // For arrays created with state(), access directly; for signal(), use .value
  code += `${indent}for (const [${node.index ?? '_i'}, ${node.item}] of (${node.expression}).entries()) {\n`

  const bodyCtx = { ...ctx, indent: ctx.indent + 1 }
  for (const child of node.body) {
    code += transformNode(child, bodyCtx) + '\n'
  }

  code += `${indent}}`

  return code
}

function transformAwait(node: AwaitBlock, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)

  // For now, a simplified async handling
  ctx.imports.signals.add('signal')
  ctx.imports.signals.add('effect')

  const stateVar = `_await_${Math.random().toString(36).slice(2, 8)}`

  let code = `${indent}// Await: {#await ${node.expression}}\n`
  code += `${indent}const ${stateVar} = signal({ status: 'pending', value: null, error: null })\n`
  code += `${indent};(${node.expression}).then(\n`
  code += `${indent}  ${node.value ?? 'v'} => ${stateVar}.value = { status: 'fulfilled', value: ${node.value ?? 'v'}, error: null },\n`
  code += `${indent}  ${node.error ?? 'e'} => ${stateVar}.value = { status: 'rejected', value: null, error: ${node.error ?? 'e'} }\n`
  code += `${indent})\n`

  // Render based on state
  code += `${indent}effect(() => {\n`
  code += `${indent}  const s = ${stateVar}.value\n`

  if (node.pending.length > 0) {
    code += `${indent}  if (s.status === 'pending') {\n`
    const pendingCtx = { ...ctx, indent: ctx.indent + 2 }
    for (const child of node.pending) {
      code += transformNode(child, pendingCtx) + '\n'
    }
    code += `${indent}  }\n`
  }

  if (node.fulfilled.length > 0) {
    code += `${indent}  if (s.status === 'fulfilled') {\n`
    if (node.value) {
      code += `${indent}    const ${node.value} = s.value\n`
    }
    const fulfilledCtx = { ...ctx, indent: ctx.indent + 2 }
    for (const child of node.fulfilled) {
      code += transformNode(child, fulfilledCtx) + '\n'
    }
    code += `${indent}  }\n`
  }

  if (node.rejected.length > 0) {
    code += `${indent}  if (s.status === 'rejected') {\n`
    if (node.error) {
      code += `${indent}    const ${node.error} = s.error\n`
    }
    const rejectedCtx = { ...ctx, indent: ctx.indent + 2 }
    for (const child of node.rejected) {
      code += transformNode(child, rejectedCtx) + '\n'
    }
    code += `${indent}  }\n`
  }

  code += `${indent}})`

  return code
}

function transformFragment(node: Fragment, ctx: TransformContext): string {
  return node.children
    .map(child => transformNode(child, ctx))
    .filter(Boolean)
    .join('\n')
}

// =============================================================================
// SLOT
// =============================================================================

function transformSlot(node: Slot, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)
  const slotName = node.name ?? 'default'

  // If there's fallback content, generate a conditional render
  if (node.fallback.length > 0) {
    const fallbackCtx = { ...ctx, indent: ctx.indent + 1 }
    const fallbackCode = node.fallback
      .map(child => transformNode(child, fallbackCtx))
      .filter(Boolean)
      .join('\n')

    // Generate: if ($$slots?.slotName) $$slots.slotName() else { fallback }
    return `${indent}if ($$slots?.${slotName}) {\n${indent}  $$slots.${slotName}()\n${indent}} else {\n${fallbackCode}\n${indent}}`
  }

  // No fallback - simple slot render
  return `${indent}$$slots?.${slotName}?.()`
}

// =============================================================================
// HELPERS
// =============================================================================

function isSimpleIdentifier(expr: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expr.trim())
}

/**
 * Check if an expression needs to be wrapped in derived().
 * Only reactive expressions that read signals need derived().
 * Static values, constants, and simple identifiers are passed directly.
 */
function needsDerived(expr: string): boolean {
  const trimmed = expr.trim()

  // Literals don't need derived
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return false // number
  if (/^["'`].*["'`]$/.test(trimmed) && !trimmed.includes('${')) return false // simple string
  if (trimmed === 'true' || trimmed === 'false') return false // boolean
  if (trimmed === 'null' || trimmed === 'undefined') return false

  // Simple identifiers - let bind() handle reactivity
  if (isSimpleIdentifier(trimmed)) return false

  // Property access on constants (Colors.RED, etc) - no derived
  if (/^[A-Z][a-zA-Z0-9_$]*\.[A-Z_][A-Z0-9_]*$/.test(trimmed)) return false

  // Template literal with interpolation needs derived
  if (trimmed.includes('${')) return true

  // Reading .value from a signal needs derived
  if (/\.value\b/.test(trimmed)) return true

  // Array access with signal (e.g., items[index.value]) needs derived
  if (/\[.*\.value.*\]/.test(trimmed)) return true

  // Function calls might need derived (depends on what they do)
  if (/\(.*\)/.test(trimmed)) return true

  // Ternary expressions likely involve signal reads
  if (trimmed.includes('?') && trimmed.includes(':')) return true

  // Simple property access (foo.bar, Colors.RED) - no derived
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/.test(trimmed)) return false

  // Array/object literals - no derived
  if (/^\[.*\]$/.test(trimmed) || /^\{.*\}$/.test(trimmed)) return false

  // Default: wrap in derived to be safe
  return true
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function escapeTemplateString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}
