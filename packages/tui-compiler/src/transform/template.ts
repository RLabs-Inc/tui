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
  Attribute,
} from '../parse/ast'
import {
  type ImportCollector,
  isBuiltinComponent,
  isUserComponent,
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

    // Regular children
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
  if (props) {
    return `${indent}${tag}({ ${props} })`
  }
  return `${indent}${tag}()`
}

function transformAttributes(attrs: Attribute[], ctx: TransformContext): string {
  const parts: string[] = []

  for (const attr of attrs) {
    switch (attr.type) {
      case 'StaticAttribute':
        parts.push(`${attr.name}: ${JSON.stringify(attr.value)}`)
        break

      case 'DynamicAttribute':
        // Check if it's a simple identifier or needs derived
        if (isSimpleIdentifier(attr.expression)) {
          parts.push(`${attr.name}: ${attr.expression}`)
        } else {
          ctx.imports.signals.add('derived')
          parts.push(`${attr.name}: derived(() => ${attr.expression})`)
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
        const eventName = `on${capitalize(attr.name)}`
        parts.push(`${eventName}: ${attr.handler}`)
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

  // Single expression
  if (nodes.length === 1 && nodes[0]!.type === 'ExpressionNode') {
    const expr = (nodes[0] as ExpressionNode).expression
    if (isSimpleIdentifier(expr)) {
      return expr
    }
    ctx.imports.signals.add('derived')
    return `derived(() => ${expr})`
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

  if (isSimpleIdentifier(expr)) {
    return `${indent}text({ content: ${expr} })`
  }

  ctx.imports.signals.add('derived')
  return `${indent}text({ content: derived(() => ${expr}) })`
}

// =============================================================================
// CONTROL FLOW
// =============================================================================

function transformIf(node: IfBlock, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)

  // We need to generate conditional rendering code
  // This uses derived + effect pattern for now
  ctx.imports.signals.add('derived')
  ctx.imports.signals.add('effect')

  const conditionVar = `_if_${Math.random().toString(36).slice(2, 8)}`

  let code = `${indent}// Conditional: {#if ${node.condition}}\n`
  code += `${indent}const ${conditionVar} = derived(() => ${node.condition})\n`
  code += `${indent}effect(() => {\n`
  code += `${indent}  if (${conditionVar}.value) {\n`

  const consequentCtx = { ...ctx, indent: ctx.indent + 2 }
  for (const child of node.consequent) {
    code += transformNode(child, consequentCtx) + '\n'
  }

  code += `${indent}  }`

  if (node.alternate) {
    if (Array.isArray(node.alternate)) {
      code += ` else {\n`
      const alternateCtx = { ...ctx, indent: ctx.indent + 2 }
      for (const child of node.alternate) {
        code += transformNode(child, alternateCtx) + '\n'
      }
      code += `${indent}  }`
    } else {
      // else if
      code += ` else if (${(node.alternate as IfBlock).condition}) {\n`
      const elseIfCtx = { ...ctx, indent: ctx.indent + 2 }
      for (const child of (node.alternate as IfBlock).consequent) {
        code += transformNode(child, elseIfCtx) + '\n'
      }
      code += `${indent}  }`
    }
  }

  code += `\n${indent}})`

  return code
}

function transformEach(node: EachBlock, ctx: TransformContext): string {
  const indent = '  '.repeat(ctx.indent)

  ctx.imports.signals.add('derived')
  ctx.imports.signals.add('effect')

  const indexPart = node.index ? `, ${node.index}` : ''

  let code = `${indent}// Loop: {#each ${node.expression} as ${node.item}${indexPart}}\n`
  code += `${indent}effect(() => {\n`
  code += `${indent}  for (const [${node.index ?? '_i'}, ${node.item}] of (${node.expression}).entries()) {\n`

  const bodyCtx = { ...ctx, indent: ctx.indent + 2 }
  for (const child of node.body) {
    code += transformNode(child, bodyCtx) + '\n'
  }

  code += `${indent}  }\n`
  code += `${indent}})`

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
// HELPERS
// =============================================================================

function isSimpleIdentifier(expr: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expr.trim())
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
