/**
 * TUI Framework - Hierarchy Utilities
 *
 * Builds hierarchy data from parallel arrays for efficient iteration.
 * NO recursion - just flat loops over arrays.
 *
 * Key insight: Instead of walking a tree, we:
 * 1. Calculate depth for each component (one loop)
 * 2. Group children by parent (one loop)
 * 3. Build ordered children array (one loop)
 *
 * Result: O(n) regardless of nesting depth.
 */

import { unwrap } from '@rlabs-inc/signals'
import * as core from '../../../engine/arrays/core'
import * as layout from '../../../engine/arrays/layout'

// =============================================================================
// HIERARCHY DATA (reused across layouts)
// =============================================================================

// Depth of each component (root = 0)
export const depth: number[] = []

// Children organization
export const childStart: number[] = []   // Index into childrenOrdered
export const childCount: number[] = []   // Number of direct children

// Flat array of all children, ordered by parent
export const childrenOrdered: number[] = []

// Root components (parentIndex === -1)
export const roots: number[] = []

// Components sorted by depth (for bottom-up/top-down iteration)
export const sortedByDepth: number[] = []

// Maximum depth in the tree
export let maxDepth = 0

// =============================================================================
// HIERARCHY PREPARATION
// =============================================================================

/**
 * Prepare hierarchy data for layout.
 * Called once at the start of each layout pass.
 *
 * This replaces recursive tree traversal with flat array iteration.
 */
export function prepareHierarchy(indices: Set<number>): void {
  // Reset arrays
  roots.length = 0
  childrenOrdered.length = 0
  sortedByDepth.length = 0
  maxDepth = 0

  if (indices.size === 0) return

  // Step 1: Calculate depth for each component
  // This is the only "recursive-like" part, but we do it iteratively
  for (const i of indices) {
    let d = 0
    let p = unwrap(core.parentIndex[i]) ?? -1

    // Walk up to root, counting depth
    while (p >= 0 && indices.has(p)) {
      d++
      p = unwrap(core.parentIndex[p]) ?? -1
    }

    depth[i] = d
    if (d > maxDepth) maxDepth = d

    // Track roots
    if (d === 0) {
      roots.push(i)
    }
  }

  // Step 2: Group children by parent
  const childrenByParent = new Map<number, number[]>()

  for (const i of indices) {
    const parent = unwrap(core.parentIndex[i]) ?? -1

    if (parent >= 0) {
      let children = childrenByParent.get(parent)
      if (!children) {
        children = []
        childrenByParent.set(parent, children)
      }
      children.push(i)
    }
  }

  // Step 3: Sort children within each parent by order property
  for (const children of childrenByParent.values()) {
    children.sort((a, b) => {
      const orderA = unwrap(layout.order[a]) ?? 0
      const orderB = unwrap(layout.order[b]) ?? 0
      return orderA - orderB
    })
  }

  // Step 4: Build childrenOrdered array and set childStart/childCount
  let offset = 0

  for (const i of indices) {
    const children = childrenByParent.get(i)

    if (children && children.length > 0) {
      childStart[i] = offset
      childCount[i] = children.length

      for (const child of children) {
        childrenOrdered[offset++] = child
      }
    } else {
      childStart[i] = 0
      childCount[i] = 0
    }
  }

  // Step 5: Sort all indices by depth
  for (const i of indices) {
    sortedByDepth.push(i)
  }
  sortedByDepth.sort((a, b) => depth[a]! - depth[b]!)
}

/**
 * Get children of a component.
 * Returns array slice from childrenOrdered.
 */
export function getChildren(index: number): number[] {
  const start = childStart[index] ?? 0
  const count = childCount[index] ?? 0

  if (count === 0) return []

  const result: number[] = []
  for (let i = 0; i < count; i++) {
    result.push(childrenOrdered[start + i]!)
  }
  return result
}

/**
 * Check if component has children.
 */
export function hasChildren(index: number): boolean {
  return (childCount[index] ?? 0) > 0
}

/**
 * Get depth of a component.
 */
export function getDepth(index: number): number {
  return depth[index] ?? 0
}

/**
 * Iterate components in depth order (roots first, then children).
 * Useful for top-down traversal.
 */
export function* iterateTopDown(): Generator<number> {
  for (const i of sortedByDepth) {
    yield i
  }
}

/**
 * Iterate components in reverse depth order (deepest first).
 * Useful for bottom-up traversal (content sizing).
 */
export function* iterateBottomUp(): Generator<number> {
  for (let i = sortedByDepth.length - 1; i >= 0; i--) {
    yield sortedByDepth[i]!
  }
}

/**
 * Get the root components.
 */
export function getRoots(): number[] {
  return roots
}

/**
 * Reset hierarchy data (called when clearing layout).
 */
export function resetHierarchy(): void {
  depth.length = 0
  childStart.length = 0
  childCount.length = 0
  childrenOrdered.length = 0
  roots.length = 0
  sortedByDepth.length = 0
  maxDepth = 0
}
