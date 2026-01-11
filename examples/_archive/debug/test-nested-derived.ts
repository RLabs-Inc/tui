/**
 * Test: Nested Derived with SlotArray
 *
 * This test mimics the EXACT structure of TUI's pipeline:
 * 1. layoutDerived - reads terminal size signals
 * 2. frameBufferDerived - reads layoutDerived.value THEN reads slotArray
 * 3. count signal - read by slotArray's getter
 *
 * We're testing if the nested derived structure causes tracking to fail.
 */

import { signal, derived, effect, flushSync, slotArray } from '@rlabs-inc/signals'

console.log('=== Nested Derived + SlotArray Test ===\n')

// Simulate terminal size signals (like layoutDerived dependencies)
const terminalWidth = signal(80)
const terminalHeight = signal(24)

// Simulate user's count signal
const count = signal(0)

// Simulate textContent slotArray
const textContent = slotArray<string>('')
textContent.setSource(0, () => `Count: ${count.value}`)

// Simulate layoutDerived (reads terminal signals, returns layout data)
const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  console.error(`  [layoutDerived] tw=${tw}, th=${th}`)
  return { width: tw, height: th }
})

// Simulate frameBufferDerived (reads layoutDerived THEN reads textContent)
const frameBufferDerived = derived(() => {
  const layout = layoutDerived.value  // Read layoutDerived FIRST
  const content = textContent[0]       // Then read slotArray
  console.error(`  [frameBufferDerived] layout=${JSON.stringify(layout)}, content="${content}"`)
  return { layout, content }
})

// Simulate render effect
const renders: string[] = []
effect(() => {
  const result = frameBufferDerived.value
  renders.push(result.content)
  console.error(`[render effect] content="${result.content}"`)
})
flushSync()

// No dependency check - just track renders

console.log('\n--- Incrementing count (should trigger re-render each time) ---\n')

for (let i = 1; i <= 5; i++) {
  count.value = i
  console.error(`\n[main] Set count to ${i}`)
  flushSync()
}

console.log('\n=== Results ===')
console.log(`Renders: ${renders.length}`)
console.log(`Values: ${JSON.stringify(renders)}`)

const expected = ['Count: 0', 'Count: 1', 'Count: 2', 'Count: 3', 'Count: 4', 'Count: 5']
const pass = JSON.stringify(renders) === JSON.stringify(expected)

if (pass) {
  console.log('\n✅ PASS: Nested derived tracking works!')
} else {
  console.log('\n❌ FAIL: Tracking broken')
  console.log(`Expected: ${JSON.stringify(expected)}`)
}

process.exit(pass ? 0 : 1)
