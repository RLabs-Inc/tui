/**
 * TUI Framework - Component Registry
 *
 * Manages index allocation for the parallel arrays pattern.
 * Each component gets a unique index, which is used across all arrays.
 *
 * Features:
 * - ID ↔ Index bidirectional mapping
 * - Free index pool for O(1) reuse
 * - ReactiveSet for allocatedIndices (deriveds react to add/remove)
 */

import { ReactiveSet } from '@rlabs-inc/signals'
import { ensureAllCapacity, clearAllAtIndex, resetAllArrays } from './arrays'
import { parentIndex as parentIndexArray } from './arrays/core'
import { resetTitanArrays } from '../pipeline/layout/titan-engine'
import { runDestroyCallbacks, resetLifecycle } from './lifecycle'

// =============================================================================
// Registry State
// =============================================================================

/** Map component ID to array index */
const idToIndex = new Map<string, number>()

/** Map array index to component ID */
const indexToId = new Map<number, string>()

/**
 * Set of currently allocated indices (for iteration).
 *
 * Using ReactiveSet so deriveds that iterate over this set
 * automatically react when components are added or removed.
 */
const allocatedIndices = new ReactiveSet<number>()

/** Pool of freed indices for reuse */
const freeIndices: number[] = []

/** Next index to allocate if pool is empty */
let nextIndex = 0

/** Counter for generating unique IDs */
let idCounter = 0

// =============================================================================
// Parent Context Stack
// =============================================================================

/** Stack of parent indices for nested component creation */
const parentStack: number[] = []

/** Get current parent index (-1 if at root) */
export function getCurrentParentIndex(): number {
  return parentStack.length > 0 ? (parentStack[parentStack.length - 1] ?? -1) : -1
}

/** Push a parent index onto the stack */
export function pushParentContext(index: number): void {
  parentStack.push(index)
}

/** Pop a parent index from the stack */
export function popParentContext(): void {
  parentStack.pop()
}

// =============================================================================
// Index Allocation
// =============================================================================

/**
 * Allocate an index for a new component.
 *
 * @param id - Optional component ID. If not provided, one is generated.
 * @returns The allocated index.
 */
export function allocateIndex(id?: string): number {
  // Generate ID if not provided
  const componentId = id ?? `c${idCounter++}`

  // Check if already allocated
  const existing = idToIndex.get(componentId)
  if (existing !== undefined) {
    return existing
  }

  // Reuse free index or allocate new
  const index = freeIndices.length > 0
    ? freeIndices.pop()!
    : nextIndex++

  // Register mappings
  idToIndex.set(componentId, index)
  indexToId.set(index, componentId)
  allocatedIndices.add(index)

  // Ensure arrays have capacity for this index
  ensureAllCapacity(index)

  return index
}

/**
 * Release an index back to the pool.
 * Also recursively releases all children!
 *
 * @param index - The index to release.
 */
export function releaseIndex(index: number): void {
  const id = indexToId.get(index)
  if (id === undefined) return

  // FIRST: Find and release all children (recursive!)
  // We collect children first to avoid modifying while iterating
  const children: number[] = []
  for (const childIndex of allocatedIndices) {
    if (parentIndexArray[childIndex] === index) {
      children.push(childIndex)
    }
  }
  // Release children recursively
  for (const childIndex of children) {
    releaseIndex(childIndex)
  }

  // Run destroy callbacks before cleanup
  runDestroyCallbacks(index)

  // Clean up mappings
  idToIndex.delete(id)
  indexToId.delete(index)
  allocatedIndices.delete(index)

  // Clear all array values at this index
  clearAllAtIndex(index)

  // Return to pool for reuse
  freeIndices.push(index)

  // AUTO-CLEANUP: When all components destroyed, reset all arrays to free memory
  if (allocatedIndices.size === 0) {
    resetAllArrays()
    resetTitanArrays()
    freeIndices.length = 0
    nextIndex = 0
    // Note: GC is NOT forced here to avoid performance hit during rapid create/destroy cycles
    // The FinalizationRegistry will clean up automatically when GC runs naturally
  }
}

// =============================================================================
// Lookups
// =============================================================================

/** Get index for a component ID */
export function getIndex(id: string): number | undefined {
  return idToIndex.get(id)
}

/** Get ID for an index */
export function getId(index: number): string | undefined {
  return indexToId.get(index)
}

/** Get all currently allocated indices */
export function getAllocatedIndices(): Set<number> {
  return allocatedIndices
}

/** Check if an index is currently allocated */
export function isAllocated(index: number): boolean {
  return allocatedIndices.has(index)
}

/** Get the current capacity (highest index that would be allocated next) */
export function getCapacity(): number {
  return nextIndex
}

/** Get the count of currently allocated components */
export function getAllocatedCount(): number {
  return allocatedIndices.size
}

// =============================================================================
// Reset (for testing)
// =============================================================================

/** Reset all registry state (for testing) */
export function resetRegistry(): void {
  idToIndex.clear()
  indexToId.clear()
  allocatedIndices.clear()
  freeIndices.length = 0
  nextIndex = 0
  idCounter = 0
  parentStack.length = 0
  resetLifecycle()
}
