/**
 * TUI Framework - Parallel Arrays Lifecycle Tests
 *
 * Tests for the component registry and parallel arrays:
 * - Index allocation
 * - Index deallocation and reuse
 * - Automatic array cleanup when all components destroyed
 * - ensureCapacity behavior
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { bind, unwrap, signal } from '@rlabs-inc/signals'

import {
  allocateIndex,
  releaseIndex,
  getAllocatedIndices,
  getCapacity,
  getAllocatedCount,
  resetRegistry,
} from '../src/engine/registry'

import * as core from '../src/engine/arrays/core'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as spacing from '../src/engine/arrays/spacing'
import * as layout from '../src/engine/arrays/layout'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { ComponentType } from '../src/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  // Reset registry
  resetRegistry()
  // Reset arrays
  resetAllArrays()
  resetTitanArrays()
}

// =============================================================================
// INDEX ALLOCATION TESTS
// =============================================================================

describe('Parallel Arrays - Index Allocation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('allocateIndex returns sequential indices', () => {
    const idx1 = allocateIndex()
    const idx2 = allocateIndex()
    const idx3 = allocateIndex()

    expect(idx1).toBe(0)
    expect(idx2).toBe(1)
    expect(idx3).toBe(2)
  })

  test('getAllocatedIndices tracks allocated indices', () => {
    allocateIndex()
    allocateIndex()

    const allocated = getAllocatedIndices()
    expect(allocated.size).toBe(2)
    expect(allocated.has(0)).toBe(true)
    expect(allocated.has(1)).toBe(true)
  })

  test('getAllocatedCount tracks number of allocated components', () => {
    expect(getAllocatedCount()).toBe(0)

    allocateIndex()
    expect(getAllocatedCount()).toBe(1)

    allocateIndex()
    expect(getAllocatedCount()).toBe(2)
  })
})

// =============================================================================
// INDEX RELEASE TESTS
// =============================================================================

describe('Parallel Arrays - Index Release', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('releaseIndex removes from allocated set', () => {
    const idx = allocateIndex()
    expect(getAllocatedIndices().has(idx)).toBe(true)

    releaseIndex(idx)
    expect(getAllocatedIndices().has(idx)).toBe(false)
  })

  test('released indices are reused', () => {
    const idx1 = allocateIndex() // 0
    const idx2 = allocateIndex() // 1
    const idx3 = allocateIndex() // 2

    releaseIndex(idx2) // Release middle index

    // Next allocation should reuse idx2
    const idx4 = allocateIndex()
    expect(idx4).toBe(1) // Reused!
  })

  test('multiple releases all get reused', () => {
    const indices: number[] = []
    for (let i = 0; i < 5; i++) {
      indices.push(allocateIndex())
    }

    // Release indices 1, 2, 3
    releaseIndex(1)
    releaseIndex(2)
    releaseIndex(3)

    // Next 3 allocations should reuse 1, 2, 3 (order may vary)
    const reused: number[] = []
    for (let i = 0; i < 3; i++) {
      reused.push(allocateIndex())
    }

    expect(reused.sort()).toEqual([1, 2, 3])
  })
})

// =============================================================================
// AUTOMATIC CLEANUP TESTS
// =============================================================================

describe('Parallel Arrays - Automatic Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('arrays are cleared when all components released', () => {
    // Allocate and set up some components
    const idx1 = allocateIndex()
    const idx2 = allocateIndex()

    core.ensureCapacity(idx1)
    core.ensureCapacity(idx2)
    core.componentType[idx1] = ComponentType.BOX
    core.componentType[idx2] = ComponentType.BOX

    // Verify arrays have data
    expect(core.componentType.length).toBeGreaterThan(0)

    // Release all
    releaseIndex(idx1)
    releaseIndex(idx2)

    // Arrays should be cleared
    expect(getAllocatedIndices().size).toBe(0)
    // Note: Array clearing happens through resetAllArrays() called from registry
  })
})

// =============================================================================
// ENSURE CAPACITY TESTS
// =============================================================================

describe('Parallel Arrays - Ensure Capacity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('ensureCapacity grows arrays as needed', () => {
    const idx = 10

    // Arrays should be empty
    expect(core.componentType.length).toBe(0)

    // Ensure capacity for index 10
    core.ensureCapacity(idx)

    // Arrays should have grown to accommodate index 10
    expect(core.componentType.length).toBeGreaterThan(idx)
    expect(core.parentIndex.length).toBeGreaterThan(idx)
    expect(core.visible.length).toBeGreaterThan(idx)
  })

  test('ensureCapacity creates slots with default values', () => {
    core.ensureCapacity(5)

    // Slots are initialized with sensible defaults (not undefined)
    expect(core.componentType[0]).toBe(ComponentType.NONE)
    expect(unwrap(core.parentIndex[0])).toBe(-1) // Default parent index
    expect(unwrap(core.visible[0])).toBe(1) // Default visible
  })

  test('dimensions ensureCapacity creates slots with defaults', () => {
    dimensions.ensureCapacity(3)

    // Slots exist with default value 0
    expect(dimensions.width.length).toBeGreaterThanOrEqual(3)
    expect(unwrap(dimensions.width[0])).toBe(0)
  })

  test('spacing ensureCapacity creates slots with defaults', () => {
    spacing.ensureCapacity(3)

    // Slots exist with default value 0
    expect(spacing.marginTop.length).toBeGreaterThanOrEqual(3)
    expect(unwrap(spacing.marginTop[0])).toBe(0)
  })

  test('layout ensureCapacity creates slots with defaults', () => {
    layout.ensureCapacity(3)

    // Slots exist with default value 0
    expect(layout.flexDirection.length).toBeGreaterThanOrEqual(3)
    expect(unwrap(layout.flexDirection[0])).toBe(0)
  })
})

// =============================================================================
// ARRAY CLEARING TESTS
// =============================================================================

describe('Parallel Arrays - Clear at Index', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('clearAtIndex resets slots to default values', () => {
    const idx = 0

    // Set up component with bindings
    core.ensureCapacity(idx + 1)
    core.componentType[idx] = ComponentType.BOX
    core.parentIndex.setSource(idx, 5)
    core.visible.setSource(idx, false)
    core.componentId.setSource(idx, 'test-component')

    dimensions.ensureCapacity(idx + 1)
    dimensions.width.setSource(idx, 100)
    dimensions.height.setSource(idx, 50)

    // Verify setup
    expect(core.componentType[idx]).toBe(ComponentType.BOX)
    expect(unwrap(core.parentIndex[idx])).toBe(5)
    expect(unwrap(dimensions.width[idx])).toBe(100)

    // Clear - this resets to defaults
    core.clearAtIndex(idx)
    dimensions.clearAtIndex(idx)

    // componentType resets to NONE, values reset to defaults
    expect(core.componentType[idx]).toBe(ComponentType.NONE)
    expect(unwrap(core.parentIndex[idx])).toBe(-1) // default
    expect(unwrap(core.visible[idx])).toBe(1) // default
    expect(unwrap(dimensions.width[idx])).toBe(0) // default
    expect(unwrap(dimensions.height[idx])).toBe(0) // default
  })
})

// =============================================================================
// BINDING BEHAVIOR TESTS
// =============================================================================

describe('Parallel Arrays - Binding Behavior', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('slots track reactive sources via setSource', () => {
    const widthSignal = signal(100)
    dimensions.ensureCapacity(1)
    dimensions.width.setSource(0, widthSignal)

    // Initial value
    expect(unwrap(dimensions.width[0])).toBe(100)

    // Update source signal
    widthSignal.value = 200

    // Slot reflects update
    expect(unwrap(dimensions.width[0])).toBe(200)
  })

  test('multiple indices are independent', () => {
    const width0 = signal(100)
    const width1 = signal(200)

    dimensions.ensureCapacity(2)
    dimensions.width.setSource(0, width0)
    dimensions.width.setSource(1, width1)

    // Values are independent
    expect(unwrap(dimensions.width[0])).toBe(100)
    expect(unwrap(dimensions.width[1])).toBe(200)

    // Update one
    width0.value = 50

    // Other unchanged
    expect(unwrap(dimensions.width[0])).toBe(50)
    expect(unwrap(dimensions.width[1])).toBe(200)
  })
})

// =============================================================================
// STRESS TESTS
// =============================================================================

describe('Parallel Arrays - Stress Tests', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('handles 1000 allocations', () => {
    const indices: number[] = []

    for (let i = 0; i < 1000; i++) {
      const idx = allocateIndex()
      indices.push(idx)
      core.ensureCapacity(idx)
      core.componentType[idx] = ComponentType.BOX
    }

    expect(getAllocatedIndices().size).toBe(1000)

    // Release half
    for (let i = 0; i < 500; i++) {
      releaseIndex(indices[i]!)
    }

    expect(getAllocatedIndices().size).toBe(500)

    // Allocate 500 more - should reuse released indices
    for (let i = 0; i < 500; i++) {
      allocateIndex()
    }

    expect(getAllocatedIndices().size).toBe(1000)
  })

  test('rapid allocate/release cycles', () => {
    for (let cycle = 0; cycle < 100; cycle++) {
      const indices: number[] = []

      // Allocate 10
      for (let i = 0; i < 10; i++) {
        indices.push(allocateIndex())
      }

      // Release all
      for (const idx of indices) {
        releaseIndex(idx)
      }
    }

    // Should be back to 0
    expect(getAllocatedIndices().size).toBe(0)
  })
})
