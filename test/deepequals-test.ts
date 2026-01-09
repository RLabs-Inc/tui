/**
 * Test: Does deepEquals prevent downstream recomputation?
 *
 * Theory: When layoutDerived recomputes but produces structurally identical output,
 * frameBufferDerived should NOT recompute (because layout's wv didn't increment).
 */
import { signal, effect, flushSync } from '@rlabs-inc/signals'
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

cleanupAll()
terminalWidth.value = 100
terminalHeight.value = 50

// Track recomputation counts
let layoutComputeCount = 0
let fbComputeCount = 0

// Create components with FIXED dimensions (no intrinsic sizing)
const textContent = signal('AAAA')  // 4 chars

box({
  width: 50,   // Fixed width
  height: 10,  // Fixed height
  children: () => {
    text({ content: textContent })
  }
})

// Initial computation
console.log('Initial layout:', layoutDerived.value.width[0], 'x', layoutDerived.value.height[0])
console.log('Initial FB generated')
frameBufferDerived.value

// Create effects to count recomputations
effect(() => {
  layoutDerived.value
  layoutComputeCount++
})

effect(() => {
  frameBufferDerived.value
  fbComputeCount++
})

flushSync()
console.log('\nAfter initial effects:')
console.log('  Layout computes:', layoutComputeCount)
console.log('  FB computes:', fbComputeCount)

// Reset counts
layoutComputeCount = 0
fbComputeCount = 0

// Now change text to SAME LENGTH (layout should produce identical output)
console.log('\n--- Changing text AAAA → BBBB (same length, same dimensions) ---')
textContent.value = 'BBBB'
flushSync()

console.log('After text change:')
console.log('  Layout computes:', layoutComputeCount)
console.log('  FB computes:', fbComputeCount)

// Check if layout output is actually the same
const layout1 = layoutDerived.value
textContent.value = 'CCCC'
flushSync()
const layout2 = layoutDerived.value

console.log('\nLayout output comparison:')
console.log('  x arrays equal:', JSON.stringify(layout1.x) === JSON.stringify(layout2.x))
console.log('  y arrays equal:', JSON.stringify(layout1.y) === JSON.stringify(layout2.y))
console.log('  width arrays equal:', JSON.stringify(layout1.width) === JSON.stringify(layout2.width))
console.log('  height arrays equal:', JSON.stringify(layout1.height) === JSON.stringify(layout2.height))

// Test with Bun.deepEquals directly
console.log('\nBun.deepEquals test:')
console.log('  Layouts deeply equal:', Bun.deepEquals(layout1, layout2))

cleanupAll()
