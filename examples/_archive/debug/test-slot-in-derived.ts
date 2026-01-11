/**
 * Test: Slot Getter Tracking in Derived
 *
 * This tests whether a derived properly tracks dependencies
 * when reading through a slot that points to a getter.
 */

import { signal, derived, effect, flushSync, slotArray } from '@rlabs-inc/signals'

console.log('=== Slot Getter Tracking Test ===\n')

// Create a count signal (like in all-features.ts)
const count = signal(0)

// Create a slotArray (like textContent)
const arr = slotArray<string>('')

// Set slot source to a getter (like text primitive does)
arr.setSource(0, () => `Count: ${count.value}`)

// Create a DERIVED that reads the slot (like frameBufferDerived)
const bufferDerived = derived(() => {
  const content = arr[0]
  console.log(`[derived] Read content: "${content}"`)
  return content
})

// Create an EFFECT that reads the derived (like render effect)
const renders: string[] = []
effect(() => {
  const buffer = bufferDerived.value
  renders.push(buffer)
  console.log(`[effect] Rendered: "${buffer}"`)
})
flushSync()

console.log('\n--- Incrementing count ---\n')

for (let i = 1; i <= 3; i++) {
  count.value = i
  console.log(`[main] Set count to ${i}`)
  flushSync()
}

console.log('\n=== Results ===')
console.log(`Renders captured: ${renders.length}`)
console.log(`Renders: ${JSON.stringify(renders)}`)

const expected = ['Count: 0', 'Count: 1', 'Count: 2', 'Count: 3']
const pass = JSON.stringify(renders) === JSON.stringify(expected)

if (pass) {
  console.log('\n✅ PASS: Derived properly tracks getter dependencies!')
} else {
  console.log('\n❌ FAIL: Derived NOT tracking getter dependencies')
  console.log(`Expected: ${JSON.stringify(expected)}`)
  console.log(`Got:      ${JSON.stringify(renders)}`)
}

process.exit(pass ? 0 : 1)
