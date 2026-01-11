/**
 * Test: Async Derived Updates (without flushSync)
 *
 * Tests if the effect scheduling works correctly when NOT using flushSync().
 * This mimics the real app's behavior more closely.
 */

import { signal, derived, effect, slotArray } from '@rlabs-inc/signals'

console.log('=== Async Derived Test (NO flushSync) ===\n')

// Simulate terminal size signals
const terminalWidth = signal(80)
const terminalHeight = signal(24)

// User's count signal
const count = signal(0)

// SlotArray with getter
const textContent = slotArray<string>('')
textContent.setSource(0, () => `Count: ${count.value}`)

// Nested deriveds (like TUI)
const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  return { width: tw, height: th }
})

const frameBufferDerived = derived(() => {
  const layout = layoutDerived.value
  const content = textContent[0]
  return { layout, content }
})

// Render effect
const renders: string[] = []
let renderCount = 0

effect(() => {
  renderCount++
  const result = frameBufferDerived.value
  renders.push(result.content)
  console.error(`[effect #${renderCount}] content="${result.content}"`)
})

// Wait for initial render
await new Promise(r => setTimeout(r, 50))
console.error(`\n[after initial] renders=${renders.length}`)

console.log('\n--- Incrementing count with delays (NO flushSync) ---\n')

// Increment with delays
for (let i = 1; i <= 5; i++) {
  await new Promise(r => setTimeout(r, 100))
  count.value = i
  console.error(`[main] Set count to ${i}`)
}

// Wait for effects to settle
await new Promise(r => setTimeout(r, 200))

console.log('\n=== Results ===')
console.log(`Renders: ${renders.length}`)
console.log(`Values: ${JSON.stringify(renders)}`)

const expected = ['Count: 0', 'Count: 1', 'Count: 2', 'Count: 3', 'Count: 4', 'Count: 5']
const pass = JSON.stringify(renders) === JSON.stringify(expected)

if (pass) {
  console.log('\n✅ PASS: Async scheduling works!')
} else {
  console.log('\n❌ FAIL: Async scheduling broken')
  console.log(`Expected: ${JSON.stringify(expected)}`)
}

process.exit(pass ? 0 : 1)
