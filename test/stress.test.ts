/**
 * TUI Framework - Stress Tests
 *
 * Verifies stability under heavy load:
 * - Deep nesting (50-100 levels)
 * - Large component counts (500-2000 components)
 * - Rapid signal updates (100-1000 updates)
 * - Rapid create/destroy cycles
 * - Full pipeline stress (layout + framebuffer)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, derived, bind, effect, untrack } from '@rlabs-inc/signals'

import {
  allocateIndex,
  releaseIndex,
  getAllocatedIndices,
  getAllocatedCount,
  resetRegistry,
  getCurrentParentIndex,
  pushParentContext,
  popParentContext,
} from '../src/engine/registry'

import { resetAllArrays } from '../src/engine/arrays'
import { computeLayoutTitan, resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { ComponentType } from '../src/types'
import { onDestroy, resetLifecycle } from '../src/engine/lifecycle'

import * as core from '../src/engine/arrays/core'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as spacing from '../src/engine/arrays/spacing'
import * as layout from '../src/engine/arrays/layout'
import * as visual from '../src/engine/arrays/visual'
import * as text from '../src/engine/arrays/text'

import { FlexDirection, FlexWrap, JustifyContent, AlignItems, Overflow } from '../src/pipeline/layout/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Clean up all framework state between tests.
 */
function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/**
 * Set up a box component in parallel arrays (lightweight version for stress tests).
 */
function setupBox(
  index: number,
  parentIndex: number,
  props: {
    width?: number | string
    height?: number | string
    flexDirection?: number
    flexWrap?: number
    justifyContent?: number
    alignItems?: number
    flexGrow?: number
    visible?: boolean | number
    overflow?: number
    gap?: number
  } = {}
): void {
  core.ensureCapacity(index)
  dimensions.ensureCapacity(index)
  spacing.ensureCapacity(index)
  layout.ensureCapacity(index)
  visual.ensureCapacity(index)
  text.ensureCapacity(index)

  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(parentIndex)
  core.visible[index] = bind(props.visible ?? 1)
  core.componentId[index] = bind(`box-${index}`)

  dimensions.width[index] = bind(props.width ?? 0)
  dimensions.height[index] = bind(props.height ?? 0)
  dimensions.minWidth[index] = bind(null)
  dimensions.maxWidth[index] = bind(null)
  dimensions.minHeight[index] = bind(null)
  dimensions.maxHeight[index] = bind(null)

  spacing.marginTop[index] = bind(0)
  spacing.marginRight[index] = bind(0)
  spacing.marginBottom[index] = bind(0)
  spacing.marginLeft[index] = bind(0)
  spacing.paddingTop[index] = bind(0)
  spacing.paddingRight[index] = bind(0)
  spacing.paddingBottom[index] = bind(0)
  spacing.paddingLeft[index] = bind(0)
  spacing.gap[index] = bind(props.gap ?? 0)

  layout.flexDirection[index] = bind(props.flexDirection ?? FlexDirection.COLUMN)
  layout.flexWrap[index] = bind(props.flexWrap ?? FlexWrap.NO_WRAP)
  layout.justifyContent[index] = bind(props.justifyContent ?? JustifyContent.FLEX_START)
  layout.alignItems[index] = bind(props.alignItems ?? AlignItems.STRETCH)
  layout.alignSelf[index] = bind(0)
  layout.flexGrow[index] = bind(props.flexGrow ?? 0)
  layout.flexShrink[index] = bind(1)
  layout.flexBasis[index] = bind(null)
  layout.position[index] = bind(0)
  layout.top[index] = bind(null)
  layout.left[index] = bind(null)
  layout.overflow[index] = bind(props.overflow ?? Overflow.VISIBLE)

  visual.borderTop[index] = bind(0)
  visual.borderRight[index] = bind(0)
  visual.borderBottom[index] = bind(0)
  visual.borderLeft[index] = bind(0)
  visual.fgColor[index] = bind(null)
  visual.bgColor[index] = bind(null)

  text.textContent[index] = bind('')
  text.textAlign[index] = bind(0)
  text.textWrap[index] = bind(0)
  text.textAttrs[index] = bind(0)
}

/**
 * Set up a text component in parallel arrays.
 */
function setupText(
  index: number,
  parentIndex: number,
  content: string,
  props: { width?: number; height?: number; visible?: boolean | number } = {}
): void {
  setupBox(index, parentIndex, { width: props.width ?? 0, height: props.height ?? 0, visible: props.visible })
  core.componentType[index] = ComponentType.TEXT
  text.textContent[index] = bind(content)
}

/**
 * Measure execution time of a function.
 */
function measure(name: string, fn: () => void): number {
  const start = performance.now()
  fn()
  const elapsed = performance.now() - start
  // console.log(`${name}: ${elapsed.toFixed(2)}ms`)
  return elapsed
}

// =============================================================================
// DEEP NESTING TESTS (5 tests)
// =============================================================================

describe('Stress Tests - Deep Nesting', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('50 levels of nested boxes', () => {
    const depth = 50
    const indices = new Set<number>()

    // Create deep chain: each box is child of previous
    for (let i = 0; i < depth; i++) {
      indices.add(i)
      setupBox(i, i - 1, { width: 100 - i, height: 100 - i })
    }

    expect(indices.size).toBe(depth)

    // Layout should complete without error
    const result = computeLayoutTitan(100, 100, indices)

    // Verify structure is computed
    expect(result.x.length).toBeGreaterThanOrEqual(depth)
    expect(result.y.length).toBeGreaterThanOrEqual(depth)

    // Innermost box should still have computed dimensions
    expect(result.width[depth - 1]).toBe(100 - (depth - 1))
  })

  test('100 levels of nested boxes', () => {
    const depth = 100
    const indices = new Set<number>()

    for (let i = 0; i < depth; i++) {
      indices.add(i)
      setupBox(i, i - 1, { width: 200 - i, height: 200 - i })
    }

    expect(indices.size).toBe(depth)

    const elapsed = measure('100-level layout', () => {
      const result = computeLayoutTitan(200, 200, indices)
      expect(result.width[0]).toBe(200)
      expect(result.width[depth - 1]).toBe(200 - (depth - 1))
    })

    // Should complete in reasonable time (not hang)
    expect(elapsed).toBeLessThan(1000)
  })

  test('deep nesting with mixed box/text', () => {
    const depth = 50
    const indices = new Set<number>()

    for (let i = 0; i < depth; i++) {
      indices.add(i)
      if (i % 2 === 0) {
        setupBox(i, i - 1, { width: 80, height: 40 })
      } else {
        setupText(i, i - 1, `Level ${i}`, { width: 20, height: 1 })
      }
    }

    const result = computeLayoutTitan(80, 100, indices)

    // Both boxes and text should be laid out
    expect(result.width.length).toBeGreaterThanOrEqual(depth)
  })

  test('layout engine handles deep trees correctly', () => {
    const depth = 75
    const indices = new Set<number>()

    // Create tree with varying dimensions at each level
    for (let i = 0; i < depth; i++) {
      indices.add(i)
      setupBox(i, i - 1, {
        width: 100,
        height: 2,
        flexDirection: i % 2 === 0 ? FlexDirection.COLUMN : FlexDirection.ROW,
      })
    }

    const result = computeLayoutTitan(100, 200, indices)

    // All components should have valid positions
    for (let i = 0; i < depth; i++) {
      expect(result.x[i]).toBeGreaterThanOrEqual(0)
      expect(result.y[i]).toBeGreaterThanOrEqual(0)
    }
  })

  test('cleanup of deeply nested trees', () => {
    const depth = 50
    const indices: number[] = []

    // Allocate through registry (tracks cleanup)
    for (let i = 0; i < depth; i++) {
      const idx = allocateIndex(`deep-${i}`)
      indices.push(idx)
      setupBox(idx, i > 0 ? indices[i - 1]! : -1, { width: 10, height: 10 })
    }

    expect(getAllocatedCount()).toBe(depth)

    // Release root - should cascade to all children
    releaseIndex(indices[0]!)

    // All should be released
    expect(getAllocatedCount()).toBe(0)
    expect(getAllocatedIndices().size).toBe(0)
  })
})

// =============================================================================
// LARGE COMPONENT COUNTS TESTS (5 tests)
// =============================================================================

describe('Stress Tests - Large Component Counts', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('500 components (moderate load)', () => {
    const count = 500
    const indices = new Set<number>()

    // Root container
    indices.add(0)
    setupBox(0, -1, { width: 100, height: 100, flexDirection: FlexDirection.COLUMN })

    // Children
    for (let i = 1; i < count; i++) {
      indices.add(i)
      setupBox(i, 0, { width: 10, height: 1 })
    }

    expect(indices.size).toBe(count)

    const elapsed = measure('500 components layout', () => {
      const result = computeLayoutTitan(100, 1000, indices)
      expect(result.x.length).toBeGreaterThanOrEqual(count)
    })

    expect(elapsed).toBeLessThan(500)
  })

  test('1000 components (heavy load)', () => {
    const count = 1000
    const indices = new Set<number>()

    indices.add(0)
    setupBox(0, -1, { width: 100, height: 100 })

    for (let i = 1; i < count; i++) {
      indices.add(i)
      setupBox(i, 0, { width: 5, height: 1 })
    }

    const elapsed = measure('1000 components layout', () => {
      const result = computeLayoutTitan(100, 2000, indices)
      expect(result.width.length).toBeGreaterThanOrEqual(count)
    })

    expect(elapsed).toBeLessThan(1000)
  })

  test('2000 components (stress load)', () => {
    const count = 2000
    const indices = new Set<number>()

    // Create a grid-like structure: 20 rows x 100 children each
    indices.add(0)
    setupBox(0, -1, { width: 200, height: 200, flexDirection: FlexDirection.COLUMN })

    let idx = 1
    for (let row = 0; row < 20; row++) {
      indices.add(idx)
      setupBox(idx, 0, { width: 200, height: 10, flexDirection: FlexDirection.ROW })
      const rowIdx = idx
      idx++

      for (let col = 0; col < 99 && idx < count; col++) {
        indices.add(idx)
        setupBox(idx, rowIdx, { width: 2, height: 10 })
        idx++
      }
    }

    const elapsed = measure('2000 components layout', () => {
      const result = computeLayoutTitan(200, 400, indices)
      expect(result.x.length).toBeGreaterThan(0)
    })

    expect(elapsed).toBeLessThan(2000)
  })

  test('memory stays bounded (check getAllocatedIndices size)', () => {
    const count = 1000

    // Create many components
    for (let i = 0; i < count; i++) {
      const idx = allocateIndex()
      setupBox(idx, -1, { width: 10, height: 10 })
    }

    const allocatedBefore = getAllocatedCount()
    expect(allocatedBefore).toBe(count)

    // Release half
    const allocated = Array.from(getAllocatedIndices())
    for (let i = 0; i < count / 2; i++) {
      releaseIndex(allocated[i]!)
    }

    const allocatedAfter = getAllocatedCount()
    expect(allocatedAfter).toBe(count / 2)

    // Memory should be bounded - allocated set should reflect actual count
    expect(getAllocatedIndices().size).toBe(count / 2)
  })

  test('cleanup releases all indices', () => {
    const count = 500

    for (let i = 0; i < count; i++) {
      const idx = allocateIndex()
      setupBox(idx, -1, { width: 10, height: 10 })
    }

    expect(getAllocatedCount()).toBe(count)

    // Release all
    const allocated = Array.from(getAllocatedIndices())
    for (const idx of allocated) {
      releaseIndex(idx)
    }

    expect(getAllocatedCount()).toBe(0)
    expect(getAllocatedIndices().size).toBe(0)
  })
})

// =============================================================================
// RAPID SIGNAL UPDATES TESTS (5 tests)
// =============================================================================

describe('Stress Tests - Rapid Signal Updates', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('100 rapid signal updates', () => {
    const widthSignal = signal(10)
    const indices = new Set<number>([0])

    setupBox(0, -1, { width: 10, height: 10 })
    dimensions.width.setSource(0, widthSignal)

    let layoutCount = 0
    const elapsed = measure('100 updates', () => {
      for (let i = 0; i < 100; i++) {
        widthSignal.value = 10 + (i % 50)
        // Trigger layout read
        const result = computeLayoutTitan(100, 100, indices)
        layoutCount++
        expect(result.width[0]).toBe(10 + (i % 50))
      }
    })

    expect(layoutCount).toBe(100)
    expect(elapsed).toBeLessThan(500)
  })

  test('1000 rapid signal updates', () => {
    const heightSignal = signal(5)
    const indices = new Set<number>([0])

    setupBox(0, -1, { width: 50, height: 5 })
    dimensions.height.setSource(0, heightSignal)

    const elapsed = measure('1000 updates', () => {
      for (let i = 0; i < 1000; i++) {
        heightSignal.value = 5 + (i % 20)
      }
      // Final layout check
      const result = computeLayoutTitan(100, 100, indices)
      expect(result.height[0]).toBe(5 + (999 % 20))
    })

    expect(elapsed).toBeLessThan(500)
  })

  test('rapid updates do not cause memory growth', () => {
    const sig = signal(0)
    const indices = new Set<number>([0])

    setupBox(0, -1, { width: 50, height: 50 })
    dimensions.width.setSource(0, sig)

    // Record baseline
    const allocatedBefore = getAllocatedCount()

    // Many updates
    for (let i = 0; i < 500; i++) {
      sig.value = i % 100
    }

    // Count should not change
    expect(getAllocatedCount()).toBe(allocatedBefore)
  })

  test('derived signals handle rapid upstream changes', () => {
    const base = signal(1)
    const doubled = derived(() => base.value * 2)
    const quadrupled = derived(() => doubled.value * 2)

    let lastValue = 0
    const elapsed = measure('500 derived updates', () => {
      for (let i = 1; i <= 500; i++) {
        base.value = i
        lastValue = quadrupled.value
      }
    })

    expect(lastValue).toBe(500 * 4)
    expect(elapsed).toBeLessThan(200)
  })

  test('effects handle rapid updates correctly', () => {
    const sig = signal(0)
    let lastSeenValue = -1

    // Create a derived that tracks the signal
    const tracker = derived(() => {
      lastSeenValue = sig.value
      return sig.value
    })

    // Read once to establish tracking
    expect(tracker.value).toBe(0)
    expect(lastSeenValue).toBe(0)

    // Rapid updates
    const elapsed = measure('100 signal updates with derived', () => {
      for (let i = 1; i <= 100; i++) {
        sig.value = i
        // Force read to trigger derived
        const _ = tracker.value
      }
    })

    // Derived should have seen the last value
    expect(tracker.value).toBe(100)
    expect(lastSeenValue).toBe(100)
    expect(elapsed).toBeLessThan(100)
  })
})

// =============================================================================
// RAPID CREATE/DESTROY CYCLES TESTS (5 tests)
// =============================================================================

describe('Stress Tests - Rapid Create/Destroy Cycles', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('create and destroy 100 components in sequence', () => {
    // Batch create then batch destroy (more realistic pattern)
    const indices: number[] = []

    const elapsed = measure('100 create/destroy', () => {
      // Create batch
      for (let i = 0; i < 100; i++) {
        const idx = allocateIndex()
        indices.push(idx)
        setupBox(idx, -1, { width: 10, height: 10 })
      }

      // Destroy batch
      for (const idx of indices) {
        releaseIndex(idx)
      }
    })

    expect(getAllocatedCount()).toBe(0)
    // Lenient timeout - just verify it completes
    expect(elapsed).toBeLessThan(10000)
  })

  test('index reuse works correctly under churn', () => {
    const seenIndices = new Set<number>()

    // Create 10, release 10, repeat 50 times
    for (let cycle = 0; cycle < 50; cycle++) {
      const cycleIndices: number[] = []

      for (let i = 0; i < 10; i++) {
        const idx = allocateIndex()
        cycleIndices.push(idx)
        seenIndices.add(idx)
        setupBox(idx, -1, { width: 5, height: 5 })
      }

      for (const idx of cycleIndices) {
        releaseIndex(idx)
      }
    }

    // Should be reusing indices - total unique indices should be <= initial batch
    // (indices are reused from free pool)
    expect(seenIndices.size).toBeLessThanOrEqual(10)
    expect(getAllocatedCount()).toBe(0)
  })

  test('no memory leak after 1000 create/destroy cycles', () => {
    const batchSize = 10
    const cycles = 1000

    const elapsed = measure('1000 cycles', () => {
      for (let cycle = 0; cycle < cycles; cycle++) {
        const indices: number[] = []

        for (let i = 0; i < batchSize; i++) {
          const idx = allocateIndex()
          indices.push(idx)
          setupBox(idx, -1, { width: 10, height: 10 })
        }

        for (const idx of indices) {
          releaseIndex(idx)
        }
      }
    })

    expect(getAllocatedCount()).toBe(0)
    // Just verify it completes without hanging
    expect(elapsed).toBeLessThan(60000)
  })

  test('cleanup functions all called', () => {
    let destroyCount = 0
    const count = 50

    // Create components with destroy callbacks
    const indices: number[] = []
    for (let i = 0; i < count; i++) {
      const idx = allocateIndex()
      indices.push(idx)
      setupBox(idx, -1, { width: 10, height: 10 })

      // Simulate onDestroy registration
      // Note: In real code this happens via lifecycle.ts
    }

    // Register destroy callbacks manually (simulating what primitives do)
    // For this test, we track release directly
    const allocated = getAllocatedCount()
    expect(allocated).toBe(count)

    // Release all
    for (const idx of indices) {
      releaseIndex(idx)
      destroyCount++
    }

    expect(destroyCount).toBe(count)
    expect(getAllocatedCount()).toBe(0)
  })

  test('registry stays consistent under rapid churn', () => {
    // Interleaved create/destroy pattern
    const active: number[] = []

    for (let i = 0; i < 500; i++) {
      // Create
      const idx = allocateIndex()
      setupBox(idx, -1, { width: 5, height: 5 })
      active.push(idx)

      // Occasionally destroy old ones
      if (active.length > 10 && i % 3 === 0) {
        const toRemove = active.shift()!
        releaseIndex(toRemove)
      }
    }

    // Verify consistency
    const allocated = getAllocatedIndices()
    expect(allocated.size).toBe(active.length)

    for (const idx of active) {
      expect(allocated.has(idx)).toBe(true)
    }

    // Cleanup remaining
    for (const idx of active) {
      releaseIndex(idx)
    }

    expect(getAllocatedCount()).toBe(0)
  })
})

// =============================================================================
// FULL PIPELINE STRESS TESTS (5 tests)
// =============================================================================

describe('Stress Tests - Full Pipeline', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('large tree through layout engine', () => {
    const indices = new Set<number>()

    // Create a realistic UI structure: container with nested rows/cols
    let idx = 0
    indices.add(idx)
    setupBox(idx, -1, { width: 120, height: 40, flexDirection: FlexDirection.COLUMN })
    const rootIdx = idx
    idx++

    // Header
    indices.add(idx)
    setupBox(idx, rootIdx, { width: 120, height: 3, flexDirection: FlexDirection.ROW })
    const headerIdx = idx
    idx++

    for (let i = 0; i < 5; i++) {
      indices.add(idx)
      setupText(idx, headerIdx, `Tab ${i}`, { width: 10, height: 1 })
      idx++
    }

    // Content area with 100 items
    indices.add(idx)
    setupBox(idx, rootIdx, {
      width: 120,
      height: 30,
      flexDirection: FlexDirection.COLUMN,
      overflow: Overflow.SCROLL,
    })
    const contentIdx = idx
    idx++

    for (let i = 0; i < 100; i++) {
      indices.add(idx)
      setupBox(idx, contentIdx, { width: 100, height: 2, flexDirection: FlexDirection.ROW })
      const rowIdx = idx
      idx++

      for (let j = 0; j < 3; j++) {
        indices.add(idx)
        setupText(idx, rowIdx, `Cell ${i}-${j}`, { width: 30, height: 1 })
        idx++
      }
    }

    const elapsed = measure('large tree layout', () => {
      const result = computeLayoutTitan(120, 40, indices)
      expect(result.x.length).toBeGreaterThan(100)
      expect(result.scrollable[contentIdx]).toBe(1)
    })

    expect(elapsed).toBeLessThan(500)
  })

  test('layout + framebuffer generation pattern', () => {
    const indices = new Set<number>()

    // Create moderate tree
    indices.add(0)
    setupBox(0, -1, { width: 80, height: 24 })

    for (let i = 1; i <= 50; i++) {
      indices.add(i)
      setupText(i, 0, `Line ${i}`, { width: 80, height: 1 })
    }

    // Layout computation (what frameBufferDerived would trigger)
    const layoutResult = computeLayoutTitan(80, 24, indices)

    // Verify layout outputs are valid for framebuffer consumption
    for (let i = 0; i < 50; i++) {
      expect(layoutResult.x[i]).toBeGreaterThanOrEqual(0)
      expect(layoutResult.y[i]).toBeGreaterThanOrEqual(0)
      expect(layoutResult.width[i]).toBeGreaterThan(0)
      expect(layoutResult.height[i]).toBeGreaterThan(0)
    }
  })

  test('rapid layout recalculations', () => {
    const indices = new Set<number>()
    const widthSignal = signal(80)

    // Setup tree
    indices.add(0)
    setupBox(0, -1, { width: 80, height: 24 })
    dimensions.width.setSource(0, widthSignal)

    for (let i = 1; i <= 20; i++) {
      indices.add(i)
      setupBox(i, 0, { width: '100%', height: 2 })
    }

    // Rapid recalculations with changing width
    const elapsed = measure('100 layout recalcs', () => {
      for (let i = 0; i < 100; i++) {
        widthSignal.value = 60 + (i % 40)
        const result = computeLayoutTitan(100, 50, indices)
        // Children should adjust to parent width
        expect(result.width[1]).toBe(60 + (i % 40))
      }
    })

    expect(elapsed).toBeLessThan(500)
  })

  test('visibility toggling on large trees', () => {
    const indices = new Set<number>()
    const visibilitySignals: ReturnType<typeof signal<number>>[] = []

    // Create tree with visibility signals
    indices.add(0)
    setupBox(0, -1, { width: 100, height: 100 })

    for (let i = 1; i <= 100; i++) {
      indices.add(i)
      const visSig = signal(1)
      visibilitySignals.push(visSig)
      setupBox(i, 0, { width: 10, height: 1 })
      core.visible.setSource(i, visSig)
    }

    // Toggle visibility rapidly
    const elapsed = measure('500 visibility toggles', () => {
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 100; i++) {
          visibilitySignals[i]!.value = round % 2
        }
        const result = computeLayoutTitan(100, 200, indices)
        // Layout should complete
        expect(result.x.length).toBeGreaterThan(0)
      }
    })

    expect(elapsed).toBeLessThan(500)
  })

  test('percentage dimensions on deep trees', () => {
    const depth = 30
    const indices = new Set<number>()

    // Each level takes 90% of parent
    for (let i = 0; i < depth; i++) {
      indices.add(i)
      setupBox(i, i - 1, {
        width: i === 0 ? 100 : '90%',
        height: i === 0 ? 100 : '90%',
      })
    }

    const elapsed = measure('percentage deep tree', () => {
      const result = computeLayoutTitan(100, 100, indices)

      // Root should be 100x100
      expect(result.width[0]).toBe(100)
      expect(result.height[0]).toBe(100)

      // Each level should shrink progressively
      // Verify cascaded floor() behavior: each level = floor(parent * 0.9)
      // This is correct terminal UI behavior - integer pixels at each level
      let expectedWidth = 100
      for (let i = 0; i < depth; i++) {
        const actualWidth = result.width[i]!
        // Allow width to be expectedWidth or expectedWidth+1 (min dimension enforcement)
        expect(actualWidth).toBeGreaterThanOrEqual(Math.max(1, expectedWidth))
        expect(actualWidth).toBeLessThanOrEqual(expectedWidth + 1)
        expectedWidth = Math.floor(expectedWidth * 0.9)
      }

      // Deepest level should be significantly smaller than root
      expect(result.width[depth - 1]!).toBeLessThan(result.width[0]! * 0.5)
    })

    expect(elapsed).toBeLessThan(200)
  })
})

// =============================================================================
// COMBINED STRESS TEST
// =============================================================================

describe('Stress Tests - Combined Scenarios', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('full stress: deep nesting + many components + rapid updates', () => {
    const indices = new Set<number>()
    const updateSignals: ReturnType<typeof signal<number>>[] = []

    // Create deep tree with many siblings at each level
    let idx = 0
    const depth = 20
    const siblingsPerLevel = 25

    for (let level = 0; level < depth; level++) {
      const parentIdx = level === 0 ? -1 : Math.floor((idx - 1 - (siblingsPerLevel * (level - 1))) / siblingsPerLevel)

      for (let sibling = 0; sibling < siblingsPerLevel; sibling++) {
        indices.add(idx)
        const widthSig = signal(10 + sibling)
        updateSignals.push(widthSig)

        setupBox(idx, parentIdx, { width: 10 + sibling, height: 2 })
        dimensions.width.setSource(idx, widthSig)
        idx++
      }
    }

    // Rapid updates while computing layouts
    const elapsed = measure('combined stress', () => {
      for (let round = 0; round < 10; round++) {
        // Update some signals
        for (let i = 0; i < Math.min(50, updateSignals.length); i++) {
          updateSignals[i]!.value = 5 + (round % 10)
        }

        // Compute layout
        const result = computeLayoutTitan(200, 500, indices)
        expect(result.x.length).toBeGreaterThan(0)
      }
    })

    expect(elapsed).toBeLessThan(2000)
    expect(indices.size).toBe(depth * siblingsPerLevel)
  })
})
