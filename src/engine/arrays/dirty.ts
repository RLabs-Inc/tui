/**
 * TUI Framework - Dirty Tracking Infrastructure
 *
 * Central ReactiveSet instances for tracking which component indices have changed.
 * Used by trackedSlotArray to automatically mark dirty indices on mutations.
 *
 * This enables O(1) skipping of layout/render when nothing changed:
 *   if (dirtyText.size === 0) return cachedLayout  // Skip!
 *
 * Philosophy:
 * - Each array category gets one ReactiveSet
 * - Arrays use trackedSlotArray(defaultValue, dirtySet)
 * - Layout/render clears dirty sets after processing
 * - Fine-grained reactivity: derived only re-runs when dirty.size changes
 */

import { ReactiveSet } from '@rlabs-inc/signals'

/**
 * Tracks changes to text arrays (textContent, textAttrs, textAlign, textWrap, ellipsis).
 * Used by layout engine to skip text measurement when no text changed.
 */
export const dirtyText = new ReactiveSet<number>()

/**
 * Tracks changes to dimension arrays (width, height, minWidth, maxWidth, etc.).
 * Used by layout engine to skip layout when only visual properties changed.
 */
export const dirtyLayout = new ReactiveSet<number>()

/**
 * Tracks changes to visual arrays (colors, borders, bg, fg, etc.).
 * Layout can skip entirely when only these change (visual-only updates).
 */
export const dirtyVisual = new ReactiveSet<number>()

/**
 * Tracks changes to hierarchy (parent/children relationships).
 * Forces full layout recalculation when tree structure changes.
 */
export const dirtyHierarchy = new ReactiveSet<number>()

/**
 * Tracks changes to scroll state (scrollX, scrollY, scrollEnabled).
 * Used by render to skip viewport calculations when scroll unchanged.
 */
export const dirtyScroll = new ReactiveSet<number>()

/**
 * Clear all dirty tracking sets.
 * Call after processing updates to prepare for next frame.
 */
export function clearAllDirty(): void {
  dirtyText.clear()
  dirtyLayout.clear()
  dirtyVisual.clear()
  dirtyHierarchy.clear()
  dirtyScroll.clear()
}

/**
 * Check if ANY category is dirty.
 * Useful for frame skipping at the highest level.
 */
export function isAnyDirty(): boolean {
  return (
    dirtyText.size > 0 ||
    dirtyLayout.size > 0 ||
    dirtyVisual.size > 0 ||
    dirtyHierarchy.size > 0 ||
    dirtyScroll.size > 0
  )
}
