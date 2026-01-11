/**
 * Test: Actual TUI Arrays
 *
 * Import the ACTUAL TUI arrays and test them directly.
 */

import { signal, derived, effect, flushSync } from '@rlabs-inc/signals'
import * as text from '../../src/engine/arrays/text'
import { allocateIndex, releaseIndex } from '../../src/engine/registry'

const tick = () => new Promise(r => setTimeout(r, 10))

async function main() {
  console.log('=== Actual TUI Arrays Test ===\n')

  // Create a user signal
  const count = signal(0)

  // Allocate an index (like text() primitive does)
  const idx = allocateIndex('test-text')
  console.log(`Allocated index: ${idx}`)

  // Set the source (like text primitive does)
  text.textContent.setSource(idx, () => `Count: ${count.value}`)

  // Create a derived that reads from the actual textContent array
  const bufferDerived = derived(() => {
    const content = text.textContent[idx]
    return content
  })

  // Render effect
  const renders: string[] = []

  effect(() => {
    const content = bufferDerived.value
    renders.push(content)
    console.error(`[render] content="${content}"`)
  })
  await tick()

  console.log('\n--- Incrementing count ---\n')

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

  // Cleanup
  releaseIndex(idx)

  const pass = renders.length === 6 && renders[5] === 'Count: 5'

  if (pass) {
    console.log('\n✅ PASS: Actual TUI arrays work correctly!')
  } else {
    console.log('\n❌ FAIL: Actual TUI arrays have tracking issues')
  }

  process.exit(pass ? 0 : 1)
}

main()
