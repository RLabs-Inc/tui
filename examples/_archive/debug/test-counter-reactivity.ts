/**
 * Test: Counter Reactivity (simulates all-features.ts behavior)
 *
 * This test mimics the exact pattern used in all-features.ts to verify
 * the counter updates properly without locking.
 */

import { signal, derived, effect, flushSync } from '@rlabs-inc/signals'
import { textContent } from '../../src/engine/arrays/text'
import { allocateIndex, releaseIndex } from '../../src/engine/registry'

console.log('=== Counter Reactivity Test (mirrors all-features.ts) ===\n')

// Simulate user state (same as all-features.ts)
const count = signal(0)
const doubleCount = derived(() => count.value * 2)

// Allocate component indices (like text() primitive does)
const idx1 = allocateIndex('counter-debug')
const idx2 = allocateIndex('counter-main')

// Set sources using getter functions (like text() primitive does)
textContent.setSource(idx1, () => `DEBUG COUNT: ${count.value}`)
textContent.setSource(idx2, () => `Count: ${count.value} | Double: ${doubleCount.value}`)

// Simulate pipeline reading the values
const debug: string[] = []
const main: string[] = []

effect(() => {
  const d = textContent[idx1]
  debug.push(d)
  console.log(`[DEBUG] ${d}`)
})

effect(() => {
  const m = textContent[idx2]
  main.push(m)
  console.log(`[MAIN]  ${m}`)
})
flushSync()

console.log('\n--- Simulating SPACE key presses (incrementing count) ---\n')

// Simulate pressing SPACE 5 times
for (let i = 0; i < 5; i++) {
  count.value++
  flushSync()
}

console.log('\n=== Results ===')
console.log(`Debug captures: ${debug.length}`)
console.log(`Main captures: ${main.length}`)

// Expected: 6 values each (initial + 5 increments)
const expectedDebug = [
  'DEBUG COUNT: 0',
  'DEBUG COUNT: 1',
  'DEBUG COUNT: 2',
  'DEBUG COUNT: 3',
  'DEBUG COUNT: 4',
  'DEBUG COUNT: 5'
]
const expectedMain = [
  'Count: 0 | Double: 0',
  'Count: 1 | Double: 2',
  'Count: 2 | Double: 4',
  'Count: 3 | Double: 6',
  'Count: 4 | Double: 8',
  'Count: 5 | Double: 10'
]

const passDebug = JSON.stringify(debug) === JSON.stringify(expectedDebug)
const passMain = JSON.stringify(main) === JSON.stringify(expectedMain)

if (passDebug && passMain) {
  console.log('\n✅ PASS: Counter reactivity works correctly!')
  console.log('The bug is FIXED - counter no longer locks after first increment.')
  process.exit(0)
} else {
  console.log('\n❌ FAIL: Counter reactivity not working correctly')
  if (!passDebug) {
    console.log(`Debug expected: ${JSON.stringify(expectedDebug)}`)
    console.log(`Debug got:      ${JSON.stringify(debug)}`)
  }
  if (!passMain) {
    console.log(`Main expected: ${JSON.stringify(expectedMain)}`)
    console.log(`Main got:      ${JSON.stringify(main)}`)
  }
  process.exit(1)
}
