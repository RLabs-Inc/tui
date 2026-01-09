/**
 * Deep Nesting Benchmark
 *
 * Tests layout performance with extreme nesting depth.
 * Yoga failed at 50 levels (1.7s). Let's see what our engine can do!
 */

import { signal } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { layoutDerived } from '../src/pipeline/layout'
import { getAllocatedIndices } from '../src/engine/registry'

// Test depths
const DEPTHS = [50, 100, 200, 500, 1000]

console.log('='.repeat(60))
console.log('DEEP NESTING BENCHMARK')
console.log('='.repeat(60))
console.log('')

for (const depth of DEPTHS) {
  // Create nested boxes
  let parent = box({
    width: 100,
    height: 50,
    padding: 1,
  })

  const start = Bun.nanoseconds()

  // Create the nesting
  let current = parent
  for (let i = 0; i < depth; i++) {
    const child = box({
      parent: current.index,
      flexGrow: 1,
    })
    current = child
  }

  // Add text at the deepest level
  text({
    parent: current.index,
    content: `Depth: ${depth}`,
  })

  const createTimeNs = Bun.nanoseconds() - start

  // Force layout computation
  const layoutStart = Bun.nanoseconds()
  const layout = layoutDerived.value
  const layoutTimeNs = Bun.nanoseconds() - layoutStart

  // Convert to milliseconds for display
  const createTime = createTimeNs / 1_000_000
  const layoutTime = layoutTimeNs / 1_000_000

  const indices = getAllocatedIndices()

  console.log(`Depth ${depth.toString().padStart(4)}:`)
  console.log(`  Components: ${indices.size}`)
  console.log(`  Create:     ${createTime.toFixed(3)}ms`)
  console.log(`  Layout:     ${layoutTime.toFixed(3)}ms`)
  console.log(`  Total:      ${(createTime + layoutTime).toFixed(3)}ms`)

  // Check if layout actually computed
  const rootWidth = layout.width[parent.index]
  const rootHeight = layout.height[parent.index]
  console.log(`  Root size:  ${rootWidth}x${rootHeight}`)
  console.log('')

  // Cleanup for next iteration
  // (In real app would use destroy(), but let's just proceed)
}

console.log('='.repeat(60))
console.log('BENCHMARK COMPLETE')
console.log('='.repeat(60))
console.log('')
console.log('For comparison, Yoga took 1.7 SECONDS for just 50 levels!')
console.log('')

process.exit(0)
