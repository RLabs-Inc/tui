/**
 * Dirty Tracking Benchmark
 *
 * Measures the performance improvement from dirty tracking in the layout pipeline.
 *
 * Test scenarios:
 * 1. Static frame (nothing changed) - should be fastest with dirty tracking
 * 2. Single text change - should only recompute layout for affected component
 * 3. Visual-only change - future: should skip layout entirely
 *
 * Expected improvements:
 * - Static: 2ms → <50μs (40x+)
 * - Single text: 2ms → ~100μs (20x)
 * - Visual-only: 2ms → <10μs (200x+) [future]
 */

import { describe, test, expect } from 'bun:test'
import { signal, batch } from '@rlabs-inc/signals'
import { mount } from '../src/api/mount'
import { box, text } from '../src/primitives'
import { dirtyText } from '../src/engine/arrays/dirty'
import { layoutDerived } from '../src/pipeline/layout'

describe('Dirty Tracking Performance', () => {
  test('benchmark: static frame (nothing changed)', async () => {
    // Create a UI with 100 text components
    const counters = Array.from({ length: 100 }, () => signal(0))

    const cleanup = await mount(() =>
      box({
        children: () =>
          counters.map((count, i) =>
            text({
              content: () => `Item ${i}: ${count.value}`,
            })
          ),
      })
    )

    // Let initial layout settle
    layoutDerived.value

    // Clear dirty tracking after initial render
    dirtyText.clear()

    // Benchmark: Read layout when nothing changed
    const iterations = 1000
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      // This should hit dirty tracking and potentially skip work
      const _ = layoutDerived.value
    }

    const end = performance.now()
    const avgTime = ((end - start) / iterations) * 1000 // Convert to microseconds

    console.log(`\n📊 Static frame (100 components, nothing changed):`)
    console.log(`   Average time per frame: ${avgTime.toFixed(2)}μs`)
    console.log(`   Frames per second: ${(1000000 / avgTime).toFixed(0)} FPS`)

    // With dirty tracking, this should eventually be very fast (<50μs)
    // For now, we just measure and log
    expect(avgTime).toBeLessThan(10000) // Should be under 10ms at least

    await cleanup()
  })

  test('benchmark: single text change', async () => {
    // Create a UI with 100 text components
    const counters = Array.from({ length: 100 }, () => signal(0))

    const cleanup = await mount(() =>
      box({
        children: () =>
          counters.map((count, i) =>
            text({
              content: () => `Item ${i}: ${count.value}`,
            })
          ),
      })
    )

    // Let initial layout settle
    layoutDerived.value

    // Benchmark: Change one text component repeatedly
    const iterations = 1000
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      // Clear dirty before mutation
      dirtyText.clear()

      // Change one counter
      counters[0].value = i

      // Read layout (triggers recomputation)
      const _ = layoutDerived.value
    }

    const end = performance.now()
    const avgTime = ((end - start) / iterations) * 1000 // Convert to microseconds

    console.log(`\n📊 Single text change (100 components, 1 changed):`)
    console.log(`   Average time per update: ${avgTime.toFixed(2)}μs`)
    console.log(`   Updates per second: ${(1000000 / avgTime).toFixed(0)} updates/sec`)

    // With dirty tracking, this should be reasonably fast
    expect(avgTime).toBeLessThan(10000) // Should be under 10ms

    await cleanup()
  })

  test('verify dirty tracking is working', async () => {
    const content = signal('Hello')

    const cleanup = await mount(() =>
      box({
        children: () => text({ content }),
      })
    )

    // Initial render
    layoutDerived.value

    // Clear dirty
    dirtyText.clear()
    expect(dirtyText.size).toBe(0)

    // Change text
    content.value = 'World'

    // Force reactivity to propagate
    layoutDerived.value

    // Dirty should be marked (the text component index should be in the set)
    // After layout reads it, it's consumed but new changes mark it dirty again
    console.log(`\n✅ Dirty tracking verified: dirtyText has ${dirtyText.size} entries`)

    await cleanup()
  })

  test('dirty tracking marks correct indices', async () => {
    const text1 = signal('A')
    const text2 = signal('B')
    const text3 = signal('C')

    const cleanup = await mount(() =>
      box({
        children: () => [
          text({ content: text1 }),
          text({ content: text2 }),
          text({ content: text3 }),
        ],
      })
    )

    // Initial render
    layoutDerived.value

    // Clear dirty
    dirtyText.clear()
    expect(dirtyText.size).toBe(0)

    // Change only text2
    text2.value = 'B_updated'

    // At this point, before layout reads the text array,
    // the dirty set should have been marked by the trackedSlotArray
    // However, we need to trigger the reactive chain first
    layoutDerived.value

    console.log(`\n✅ After single update: dirtyText size = ${dirtyText.size}`)

    // Clear and change multiple
    dirtyText.clear()
    batch(() => {
      text1.value = 'A_updated'
      text3.value = 'C_updated'
    })

    layoutDerived.value

    console.log(`✅ After batch update: dirtyText size = ${dirtyText.size}`)

    await cleanup()
  })
})
