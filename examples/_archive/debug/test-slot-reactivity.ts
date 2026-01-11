/**
 * Test: SlotArray Reactivity
 *
 * Verifies that the text content updates properly when using slotArray.
 * This test runs headless (no terminal rendering) to check reactivity.
 */

import { signal, effect, flushSync } from '@rlabs-inc/signals'
import { textContent } from '../../src/engine/arrays/text'

console.log('=== SlotArray Reactivity Test ===\n')

// Create a user signal (simulates user's reactive state)
const count = signal(0)

// Simulate component setup - set slot source to a getter
textContent.setSource(0, () => `Count: ${count.value}`)

// Simulate pipeline - read the slot
const values: string[] = []
effect(() => {
  const content = textContent[0]
  values.push(content)
  console.log(`[effect] Read content: "${content}"`)
})
flushSync()

// Simulate user updates
console.log('\n--- Updating count ---')
for (let i = 1; i <= 5; i++) {
  count.value = i
  flushSync()
}

console.log('\n=== Results ===')
console.log(`Values captured: ${values.length}`)
console.log(`Values: ${JSON.stringify(values)}`)

const expected = ['Count: 0', 'Count: 1', 'Count: 2', 'Count: 3', 'Count: 4', 'Count: 5']
const pass = JSON.stringify(values) === JSON.stringify(expected)

console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'}: Reactivity working correctly!`)

if (!pass) {
  console.log(`Expected: ${JSON.stringify(expected)}`)
  console.log(`Got:      ${JSON.stringify(values)}`)
  process.exit(1)
}

process.exit(0)
