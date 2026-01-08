/**
 * TUI Compiler Tests
 *
 * Verify the compiler produces correct output.
 */

import { describe, test, expect } from 'bun:test'
import { compile } from '../src'
import { tokenize, parse } from '../src/parse'

describe('Lexer', () => {
  test('tokenizes simple template', () => {
    const source = `<box><text>Hello</text></box>`
    const tokens = tokenize(source)

    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.some(t => t.type === 'TagName' && t.value === 'box')).toBe(true)
    expect(tokens.some(t => t.type === 'TagName' && t.value === 'text')).toBe(true)
    expect(tokens.some(t => t.type === 'Text' && t.value === 'Hello')).toBe(true)
  })

  test('tokenizes script block', () => {
    const source = `<script>const count = signal(0)</script>`
    const tokens = tokenize(source)

    expect(tokens.some(t => t.type === 'ScriptStart')).toBe(true)
    expect(tokens.some(t => t.type === 'ScriptContent')).toBe(true)
    expect(tokens.some(t => t.type === 'ScriptEnd')).toBe(true)
  })

  test('tokenizes expressions', () => {
    const source = `<text>{count}</text>`
    const tokens = tokenize(source)

    expect(tokens.some(t => t.type === 'Expression' && t.value === 'count')).toBe(true)
  })

  test('tokenizes control flow', () => {
    const source = `{#if condition}<text>Yes</text>{/if}`
    const tokens = tokenize(source)

    expect(tokens.some(t => t.type === 'BlockOpen')).toBe(true)
    expect(tokens.some(t => t.type === 'BlockKeyword' && t.value === 'if')).toBe(true)
    expect(tokens.some(t => t.type === 'BlockClose')).toBe(true)
  })
})

describe('Parser', () => {
  test('parses simple template', () => {
    const source = `<box><text>Hello</text></box>`
    const ast = parse(source)

    expect(ast.type).toBe('TuiFile')
    expect(ast.template.length).toBe(1)
    expect(ast.template[0]!.type).toBe('Element')

    const box = ast.template[0] as any
    expect(box.tag).toBe('box')
    expect(box.children.length).toBe(1)
  })

  test('parses script block', () => {
    const source = `<script>const count = signal(0)</script><box />`
    const ast = parse(source)

    expect(ast.script).not.toBeNull()
    expect(ast.script!.content).toContain('signal(0)')
  })

  test('parses attributes', () => {
    const source = `<box width="50" height={100} variant="primary" />`
    const ast = parse(source)

    const box = ast.template[0] as any
    expect(box.attributes.length).toBe(3)
  })

  test('parses if block', () => {
    const source = `{#if show}<text>Visible</text>{/if}`
    const ast = parse(source)

    const ifBlock = ast.template[0] as any
    expect(ifBlock.type).toBe('IfBlock')
    expect(ifBlock.condition).toBe('show')
  })

  test('parses each block', () => {
    const source = `{#each items as item, i (item.id)}<text>{item.name}</text>{/each}`
    const ast = parse(source)

    const eachBlock = ast.template[0] as any
    expect(eachBlock.type).toBe('EachBlock')
    expect(eachBlock.expression).toBe('items')
    expect(eachBlock.item).toBe('item')
    expect(eachBlock.index).toBe('i')
    expect(eachBlock.key).toBe('item.id')
  })
})

describe('Compiler', () => {
  test('compiles simple component', () => {
    const source = `
<script>
  const count = signal(0)
</script>

<box>
  <text>Count: {count}</text>
</box>
`
    const result = compile(source, { filename: 'Counter.tui' })

    expect(result.code).toContain('export default function Counter')
    expect(result.code).toContain('signal')
    expect(result.code).toContain('box(')
    expect(result.code).toContain('text(')
    expect(result.imports.signals).toContain('signal')
    expect(result.imports.tui).toContain('box')
    expect(result.imports.tui).toContain('text')
  })

  test('compiles component with props', () => {
    const source = `
<script>
  export let label = 'Click me'
  export let variant = 'primary'
</script>

<box {variant}>
  <text>{label}</text>
</box>
`
    const result = compile(source, { filename: 'Button.tui' })

    expect(result.code).toContain('interface Props')
    expect(result.code).toContain('props: Props')
    expect(result.code).toContain('label')
    expect(result.code).toContain('variant')
  })

  test('compiles mixed text content', () => {
    const source = `<text>Hello {name}!</text>`
    const result = compile(source)

    expect(result.code).toContain('derived')
    expect(result.code).toContain('unwrap')
  })

  test('auto-imports signals primitives', () => {
    const source = `
<script>
  const count = signal(0)
  const doubled = derived(() => count.value * 2)
  effect(() => console.log(doubled.value))
</script>
`
    const result = compile(source)

    expect(result.imports.signals).toContain('signal')
    expect(result.imports.signals).toContain('derived')
    expect(result.imports.signals).toContain('effect')
  })

  test('compiles TypeScript', () => {
    const source = `
<script lang="ts">
  interface User {
    name: string
  }
  const user = signal<User>({ name: 'Test' })
</script>

<text>{user.value.name}</text>
`
    const result = compile(source)

    expect(result.code).toContain('interface User')
  })
})

describe('Error Handling', () => {
  test.skip('reports unclosed tags', () => {
    // TODO: Improve parser to detect and report unclosed tags
    const source = `<box><text>Unclosed`
    expect(() => parse(source)).toThrow()
  })
})
