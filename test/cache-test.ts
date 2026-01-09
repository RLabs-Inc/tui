/**
 * Test: Does intrinsic caching help when text is UNCHANGED?
 *
 * Scenarios where cache helps:
 * - Window resize (re-layout same text)
 * - Parent size change
 * - Re-render without text change
 */
import { signal } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

console.log("=== INTRINSIC CACHE TEST ===\n")

// Test 1: Re-layout with UNCHANGED text (cache should hit)
console.log("--- Test 1: Re-layout unchanged text (1000 components) ---")
cleanupAll()
terminalWidth.value = 100
terminalHeight.value = 50

const textSignals: ReturnType<typeof signal<string>>[] = []
for (let i = 0; i < 1000; i++) {
  const s = signal(`Row ${i} - some longer text content here`)
  textSignals.push(s)
  box({
    width: 80,
    height: 3,
    children: () => {
      text({ content: s })
    }
  })
}

// Initial layout (cache miss - populates cache)
let start = Bun.nanoseconds()
layoutDerived.value
let elapsed = Bun.nanoseconds() - start
console.log(`First layout (cache cold):  ${(elapsed / 1_000_000).toFixed(2)}ms`)

// Force re-layout by changing terminal size (but text is still cached!)
terminalWidth.value = 101  // Small change forces relayout
start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`Second layout (text cached): ${(elapsed / 1_000_000).toFixed(2)}ms`)

// Another size change
terminalWidth.value = 100
start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`Third layout (text cached):  ${(elapsed / 1_000_000).toFixed(2)}ms`)

// Now CHANGE just ONE text, then re-layout
console.log("\n--- Changing ONE text out of 1000 ---")
textSignals[500].value = "Changed text content!"

start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`Layout after 1 change:      ${(elapsed / 1_000_000).toFixed(2)}ms (999 cached, 1 computed)`)

// Compare: change ALL texts
console.log("\n--- Changing ALL texts ---")
for (let i = 0; i < textSignals.length; i++) {
  textSignals[i].value = `New content ${i}`
}

start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`Layout after all change:    ${(elapsed / 1_000_000).toFixed(2)}ms (0 cached, 1000 computed)`)

// Test 2: Larger scale
console.log("\n\n--- Test 2: Scale test (10000 components) ---")
cleanupAll()

for (let i = 0; i < 10000; i++) {
  const s = signal(`Row ${i} - some longer text`)
  textSignals.push(s)
  box({
    width: 80,
    height: 3,
    children: () => {
      text({ content: s })
    }
  })
}

start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`First layout (cold):        ${(elapsed / 1_000_000).toFixed(2)}ms`)

start = Bun.nanoseconds()
layoutDerived.value
elapsed = Bun.nanoseconds() - start
console.log(`Second layout (cached):     ${(elapsed / 1_000_000).toFixed(2)}ms`)

const speedup = ((elapsed / 1_000_000) > 0.01) ? "Minimal speedup - iteration still dominates" : "Good speedup!"
console.log(`\nConclusion: ${speedup}`)

cleanupAll()
