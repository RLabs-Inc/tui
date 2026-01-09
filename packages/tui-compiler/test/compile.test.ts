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
  test('reports unclosed tags', () => {
    const source = `<box><text>Unclosed`
    expect(() => parse(source)).toThrow(/Unclosed.*text/i)
  })

  test('reports unclosed {#if} blocks (with closed content)', () => {
    // When inner content is properly closed, the block error is reported
    const source = `{#if condition}<text content="test" />`
    expect(() => parse(source)).toThrow(/Unclosed.*if/i)
  })

  test('reports unclosed {#each} blocks (with closed content)', () => {
    const source = `{#each items as item}<text content="test" />`
    expect(() => parse(source)).toThrow(/Unclosed.*each/i)
  })

  test('reports unclosed {#await} blocks (with closed content)', () => {
    const source = `{#await promise}<text content="Loading" />`
    expect(() => parse(source)).toThrow(/Unclosed.*await/i)
  })

  test('reports innermost unclosed element first', () => {
    // When inner content is unclosed, that error is reported first
    const source = `{#if condition}<text>Missing close`
    expect(() => parse(source)).toThrow(/Unclosed.*text/i)
  })

  test('reports mismatched closing tags', () => {
    const source = `<box><text></box></text>`
    expect(() => parse(source)).toThrow()
  })

  test('reports duplicate attributes', () => {
    const source = `<box width={10} width={20} />`
    expect(() => parse(source)).toThrow(/Duplicate.*width/i)
  })

  test('reports duplicate static attributes', () => {
    const source = `<text content="a" content="b" />`
    expect(() => parse(source)).toThrow(/Duplicate.*content/i)
  })

  test('allows different attributes with same base name', () => {
    // bind:value and value are different
    const source = `<box width={10} height={20} />`
    expect(() => parse(source)).not.toThrow()
  })
})

describe('String-Aware Expression Parsing', () => {
  test('handles braces inside double-quoted strings', () => {
    const source = `<box width={foo === "}" ? 10 : 20} />`
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toBe('foo === "}" ? 10 : 20')
  })

  test('handles braces inside single-quoted strings', () => {
    const source = `<box width={foo === '}' ? 10 : 20} />`
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toBe("foo === '}' ? 10 : 20")
  })

  test('handles template literals with interpolation', () => {
    const source = '<text content={`Count: ${count}`} />'
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toBe('`Count: ${count}`')
  })

  test('handles nested braces in template literals', () => {
    const source = '<text content={`Value: ${obj.items.map(x => x.name).join(", ")}`} />'
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toContain('obj.items.map')
    expect(expr?.value).toContain('.join(", ")')
  })

  test('handles escape sequences in strings', () => {
    const source = `<text content={foo === "\\}" ? "a" : "b"} />`
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toContain('\\}')
  })

  test('handles complex ternary with strings', () => {
    const source = `<box bg={isSelected ? Colors.BLUE : undefined} />`
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toBe('isSelected ? Colors.BLUE : undefined')
  })

  test('handles filter with arrow function containing string', () => {
    const source = `<box width={items.filter(x => x.type === "active").length} />`
    const tokens = tokenize(source)
    const expr = tokens.find(t => t.type === 'AttributeExpr')
    expect(expr?.value).toBe('items.filter(x => x.type === "active").length')
  })
})

describe('Script Block String Awareness', () => {
  test('handles </script> inside double-quoted string', () => {
    const source = `
<script>
  const html = "</script>"
</script>
<box />`
    const result = compile(source)
    expect(result.code).toContain('const html = "</script>"')
  })

  test('handles </script> inside single-quoted string', () => {
    const source = `
<script>
  const html = '</script>'
</script>
<box />`
    const result = compile(source)
    expect(result.code).toContain("const html = '</script>'")
  })

  test('handles </script> inside template literal', () => {
    const source = `
<script>
  const html = \`</script>\`
</script>
<box />`
    const result = compile(source)
    expect(result.code).toContain('const html = `</script>`')
  })

  test('handles </script> inside single-line comment', () => {
    const source = `
<script>
  // </script> this is a comment
  const x = 1
</script>
<box />`
    const result = compile(source)
    expect(result.code).toContain('const x = 1')
  })

  test('handles </script> inside multi-line comment', () => {
    const source = `
<script>
  /*
   * </script> this is a comment
   */
  const x = 1
</script>
<box />`
    const result = compile(source)
    expect(result.code).toContain('const x = 1')
  })
})

describe('Script Event Handling', () => {
  test('preserves keyboard code in script', () => {
    const source = `
<script>
  import { keyboard } from '@rlabs-inc/tui'
  keyboard.onKey('Enter', () => console.log('enter'))
</script>
<box />
`
    const result = compile(source)

    // Script body is preserved
    expect(result.code).toContain("keyboard.onKey('Enter'")
  })

  test('event directives in template are ignored (use script instead)', () => {
    const source = `<box on:click={handleClick} on:key:enter={submit} />`
    const result = compile(source)

    // Event directives should be silently ignored
    expect(result.code).not.toContain('onClick')
    expect(result.code).not.toContain('onKey')
    expect(result.code).toContain('box()')
  })
})
