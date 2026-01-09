/**
 * TUI Compiler - Integration Tests
 *
 * Tests that compiled .tui files actually work with the TUI framework.
 * Not just "does it compile?" but "does the compiled code run correctly?"
 *
 * Note: Uses Function constructor to evaluate compiled code - this is intentional
 * for testing purposes only. The compiled output is from our own compiler.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { compile } from '../src/index'
import { signal, derived, bind, unwrap } from '@rlabs-inc/signals'

// We need to import TUI primitives to execute compiled code
import { box, text } from '../../../src/primitives'
import { resetRegistry, getAllocatedIndices } from '../../../src/engine/registry'
import * as core from '../../../src/engine/arrays/core'
import * as dimensions from '../../../src/engine/arrays/dimensions'
import * as visual from '../../../src/engine/arrays/visual'
import * as textArrays from '../../../src/engine/arrays/text'
import { resetAllArrays } from '../../../src/engine/arrays'
import { resetTitanArrays } from '../../../src/pipeline/layout/titan-engine'
import { ComponentType } from '../../../src/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/**
 * Compile and execute a .tui component.
 * Returns the number of components created.
 *
 * Note: Uses Function constructor for test evaluation - safe because
 * we're only evaluating code from our own compiler output.
 */
function compileAndRun(source: string, filename: string = 'Test.tui'): number {
  const result = compile(source, { filename })

  // Create a function from the compiled code
  // Strip imports and convert export to return
  const moduleCode = result.code
    .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
    .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
    .replace(/export default function/, 'return function')

  // Create and execute - intentional use of Function for testing
  const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
  const Component = createComponent(signal, derived, bind, box, text)
  Component()

  return getAllocatedIndices().size
}

// =============================================================================
// BASIC COMPILATION INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Basic Components', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('simple box creates component', () => {
    const source = `<box width={40} height={10} />`
    const count = compileAndRun(source)
    expect(count).toBe(1)
    expect(core.componentType[0]).toBe(ComponentType.BOX)
  })

  test('simple text creates component', () => {
    const source = `<text content="Hello World" />`
    const count = compileAndRun(source)
    expect(count).toBe(1)
    expect(core.componentType[0]).toBe(ComponentType.TEXT)
  })

  test('nested boxes create multiple components', () => {
    const source = `
<box width={80} height={24}>
  <box width={40} height={10} />
  <box width={40} height={10} />
</box>`
    const count = compileAndRun(source)
    expect(count).toBe(3)
  })

  test('box with text children', () => {
    const source = `
<box width={80} height={24}>
  <text content="Line 1" />
  <text content="Line 2" />
</box>`
    const count = compileAndRun(source)
    expect(count).toBe(3)
    expect(core.componentType[0]).toBe(ComponentType.BOX)
    expect(core.componentType[1]).toBe(ComponentType.TEXT)
    expect(core.componentType[2]).toBe(ComponentType.TEXT)
  })
})

// =============================================================================
// REACTIVE PROPS INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Reactive Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('static numeric props bind correctly', () => {
    const source = `<box width={40} height={10} />`
    compileAndRun(source)
    expect(unwrap(dimensions.width[0])).toBe(40)
    expect(unwrap(dimensions.height[0])).toBe(10)
  })

  test('percentage dimensions work', () => {
    const source = `<box width="50%" height="100%" />`
    compileAndRun(source)
    expect(unwrap(dimensions.width[0])).toBe('50%')
    expect(unwrap(dimensions.height[0])).toBe('100%')
  })
})

// =============================================================================
// CONDITIONAL RENDERING INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Conditional Rendering', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('{#if}/{:else} creates both branches', () => {
    const result = compile(`
<script>
  const show = signal(true)
</script>

{#if show.value}
  <text content="Yes" />
{:else}
  <text content="No" />
{/if}
`, { filename: 'IfElse.tui' })

    const moduleCode = result.code
      .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
      .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
      .replace(/export default function/, 'return function')

    const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
    const Component = createComponent(signal, derived, bind, box, text)
    Component()

    // Both branches create components (visibility controls which shows)
    expect(getAllocatedIndices().size).toBe(2)
  })
})

// =============================================================================
// LOOP RENDERING INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Loop Rendering', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('{#each} creates components for each item', () => {
    const result = compile(`
<script>
  const items = ['A', 'B', 'C']
</script>

{#each items as item}
  <text content={item} />
{/each}
`, { filename: 'EachLoop.tui' })

    const moduleCode = result.code
      .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
      .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
      .replace(/export default function/, 'return function')

    const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
    const Component = createComponent(signal, derived, bind, box, text)
    Component()

    // 3 items = 3 text components
    expect(getAllocatedIndices().size).toBe(3)
  })

  test('{#each} with index creates correct values', () => {
    const result = compile(`
<script>
  const items = ['X', 'Y', 'Z']
</script>

{#each items as item, i}
  <box width={10 + i} height={5} />
{/each}
`, { filename: 'EachWithIndex.tui' })

    const moduleCode = result.code
      .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
      .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
      .replace(/export default function/, 'return function')

    const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
    const Component = createComponent(signal, derived, bind, box, text)
    Component()

    expect(getAllocatedIndices().size).toBe(3)
    // Widths should be 10, 11, 12 based on index
    expect(unwrap(dimensions.width[0])).toBe(10)
    expect(unwrap(dimensions.width[1])).toBe(11)
    expect(unwrap(dimensions.width[2])).toBe(12)
  })
})

// =============================================================================
// TEXT CONTENT INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Text Content', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('static text content', () => {
    const source = `<text content="Hello World" />`
    compileAndRun(source)
    expect(unwrap(textArrays.textContent[0])).toBe('Hello World')
  })

  test('inline text content between tags', () => {
    const source = `<text>Simple inline text</text>`
    compileAndRun(source)
    expect(unwrap(textArrays.textContent[0])).toBe('Simple inline text')
  })
})

// =============================================================================
// AWAIT INTEGRATION TESTS
// =============================================================================

describe('Compiler Integration - Await (No Effects)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('{#await} uses derived not effect', () => {
    const result = compile(`
<script>
  const promise = Promise.resolve('Done')
</script>

{#await promise}
  <text content="Loading..." />
{:then value}
  <text content={value} />
{/await}
`, { filename: 'AwaitTest.tui' })

    // CRITICAL: Verify our fix - no effect import!
    expect(result.code).not.toContain('effect')
    expect(result.code).toContain('derived')
    expect(result.code).toContain('signal')
  })

  test('{#await} creates all branches', () => {
    const result = compile(`
<script>
  const promise = Promise.resolve('Done')
</script>

{#await promise}
  <text content="Loading..." />
{:then value}
  <text content="Success" />
{:catch error}
  <text content="Error" />
{/await}
`, { filename: 'AwaitFull.tui' })

    const moduleCode = result.code
      .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
      .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
      .replace(/export default function/, 'return function')

    const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
    const Component = createComponent(signal, derived, bind, box, text)
    Component()

    // All 3 branches created (visibility controls which shows)
    expect(getAllocatedIndices().size).toBe(3)
  })
})

// =============================================================================
// COMPLEX COMPONENT INTEGRATION
// =============================================================================

describe('Compiler Integration - Complex Components', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('dashboard-like nested layout', () => {
    const source = `
<box width={80} height={24} flexDirection="column">
  <box width="100%" height={3}>
    <text content="Header" />
  </box>
  <box width="100%" height={18} flexDirection="row">
    <box width="20%" height="100%">
      <text content="Sidebar" />
    </box>
    <box width="80%" height="100%">
      <text content="Main" />
    </box>
  </box>
  <box width="100%" height={3}>
    <text content="Footer" />
  </box>
</box>`
    const count = compileAndRun(source)

    // Root + header + headerText + middle + sidebar + sidebarText + main + mainText + footer + footerText = 10
    expect(count).toBe(10)
  })

  test('loop inside conditional', () => {
    const result = compile(`
<script>
  const showList = true
  const items = ['A', 'B', 'C']
</script>

{#if showList}
  {#each items as item}
    <text content={item} />
  {/each}
{/if}
`, { filename: 'LoopInConditional.tui' })

    const moduleCode = result.code
      .replace(/import .* from ['"]@rlabs-inc\/signals['"];?\n?/g, '')
      .replace(/import .* from ['"]@rlabs-inc\/tui['"];?\n?/g, '')
      .replace(/export default function/, 'return function')

    const createComponent = Function('signal', 'derived', 'bind', 'box', 'text', moduleCode)
    const Component = createComponent(signal, derived, bind, box, text)
    Component()

    // 3 text components from the loop
    expect(getAllocatedIndices().size).toBe(3)
  })
})

// =============================================================================
// AUTO-IMPORT VERIFICATION
// =============================================================================

describe('Compiler Integration - Auto Imports', () => {
  test('auto-imports box when used', () => {
    const result = compile(`<box width={10} height={10} />`, { filename: 'AutoBox.tui' })
    expect(result.code).toContain("import { box }")
  })

  test('auto-imports text when used', () => {
    const result = compile(`<text content="Hi" />`, { filename: 'AutoText.tui' })
    expect(result.code).toContain("import { text }")
  })

  test('auto-imports both when both used', () => {
    const result = compile(`
<box>
  <text content="Hi" />
</box>`, { filename: 'AutoBoth.tui' })
    expect(result.code).toContain("box")
    expect(result.code).toContain("text")
  })

  test('auto-imports signal when used in script', () => {
    const result = compile(`
<script>
  const x = signal(0)
</script>
<box width={x} />`, { filename: 'AutoSignal.tui' })
    expect(result.code).toContain("signal")
  })

  test('auto-imports derived when used', () => {
    const result = compile(`
<script>
  const x = signal(0)
  const y = derived(() => x.value * 2)
</script>
<box width={y} />`, { filename: 'AutoDerived.tui' })
    expect(result.code).toContain("derived")
  })
})
