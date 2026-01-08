/**
 * TUI Framework - Engine
 *
 * The component engine using parallel arrays pattern.
 * Components allocate indices and write to arrays.
 * Deriveds read arrays and RETURN computed values.
 */

// Registry
export {
  allocateIndex,
  releaseIndex,
  getIndex,
  getId,
  getAllocatedIndices,
  isAllocated,
  getAllocatedCount,
  getCurrentParentIndex,
  pushParentContext,
  popParentContext,
  resetRegistry,
} from './registry'

// Parallel arrays
export * as arrays from './arrays'
