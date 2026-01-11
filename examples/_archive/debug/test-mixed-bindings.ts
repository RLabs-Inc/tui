/**
 * Test: Mixed Bindings
 *
 * TUI uses BOTH slotArray (textContent) and regular bindings (core, dimensions, etc.)
 * This tests if mixing them causes tracking issues.
 */

import { signal, derived, effect, slotArray, bind, unwrap, type Binding } from '@rlabs-inc/signals'

const tick = () => new Promise(r => setTimeout(r, 10))

async function main() {
  console.log('=== Mixed Bindings Test ===\n')

  // User signals
  const count = signal(0)

  // SlotArray (like textContent - converted to slot)
  const textContent = slotArray<string>('')
  textContent.setSource(0, () => `Count: ${count.value}`)

  // Regular binding arrays (like core.visible - NOT converted)
  const visible: Binding<boolean>[] = []
  const parentIndex: Binding<number>[] = []

  // Set up bindings for a few "components"
  for (let i = 0; i < 5; i++) {
    visible.push(bind(true))
    parentIndex.push(bind(i > 0 ? i - 1 : -1))
  }

  // Simulate layoutDerived
  const terminalWidth = signal(80)
  const layoutDerived = derived(() => {
    const tw = terminalWidth.value
    // Read from regular binding arrays (like real layout does)
    const vis = unwrap(visible[0])
    return { width: tw, vis }
  })

  // Simulate frameBufferDerived - reads BOTH slot and regular bindings
  const frameBufferDerived = derived(() => {
    const layout = layoutDerived.value

    // Read from regular binding array (like core.visible check)
    const vis = unwrap(visible[0])
    const parent = unwrap(parentIndex[0])

    // Then read from slotArray (like textContent)
    const content = textContent[0]

    return { layout, vis, parent, content }
  })

  // Render effect
  const renders: string[] = []

  effect(() => {
    const fb = frameBufferDerived.value
    renders.push(fb.content)
    console.error(`[render] content="${fb.content}", vis=${fb.vis}`)
  })
  await tick()

  console.log('\n--- Incrementing count (should trigger re-render each time) ---\n')

  for (let i = 1; i <= 5; i++) {
    await new Promise(r => setTimeout(r, 100))
    count.value = i
    console.error(`[main] Set count to ${i}`)
  }
  await tick()

  console.log('\n=== Results ===')
  console.log(`Total renders: ${renders.length}`)
  for (let i = 0; i < renders.length; i++) {
    console.log(`  ${i}: ${renders[i]}`)
  }

  const pass = renders.length === 6 && renders[5] === 'Count: 5'

  if (pass) {
    console.log('\n✅ PASS: Mixed bindings work correctly!')
  } else {
    console.log('\n❌ FAIL: Mixed bindings cause tracking issues')
    console.log(`Expected 6 renders, got ${renders.length}`)
    console.log(`Expected last to be "Count: 5", got ${renders[renders.length - 1]}`)
  }

  process.exit(pass ? 0 : 1)
}

main()
