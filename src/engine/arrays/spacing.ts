/**
 * TUI Framework - Spacing Arrays
 *
 * Margin, padding, and gap values.
 * All values are in terminal cells (integers).
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'

// =============================================================================
// MARGIN - Space outside the component (offsets position in parent)
// =============================================================================

/** Top margin - adds space above the component (in cells) */
export const marginTop: SlotArray<number> = slotArray<number>(0)

/** Right margin - adds space to the right of the component (in cells) */
export const marginRight: SlotArray<number> = slotArray<number>(0)

/** Bottom margin - adds space below the component (in cells) */
export const marginBottom: SlotArray<number> = slotArray<number>(0)

/** Left margin - adds space to the left of the component (in cells) */
export const marginLeft: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// PADDING - Space inside the component (reduces content area)
// =============================================================================

/** Top padding - pushes content down from top edge (in cells) */
export const paddingTop: SlotArray<number> = slotArray<number>(0)

/** Right padding - pushes content left from right edge (in cells) */
export const paddingRight: SlotArray<number> = slotArray<number>(0)

/** Bottom padding - pushes content up from bottom edge (in cells) */
export const paddingBottom: SlotArray<number> = slotArray<number>(0)

/** Left padding - pushes content right from left edge (in cells) */
export const paddingLeft: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// GAP - Space between flex items (CSS gap property)
// =============================================================================

/** Gap between flex items in both directions (in cells) */
export const gap: SlotArray<number> = slotArray<number>(0)

/** Row gap - vertical space between wrapped lines (in cells) */
export const rowGap: SlotArray<number> = slotArray<number>(0)

/** Column gap - horizontal space between items in a row (in cells) */
export const columnGap: SlotArray<number> = slotArray<number>(0)

/** Ensure capacity for all spacing arrays */
export function ensureCapacity(index: number): void {
  marginTop.ensureCapacity(index)
  marginRight.ensureCapacity(index)
  marginBottom.ensureCapacity(index)
  marginLeft.ensureCapacity(index)
  paddingTop.ensureCapacity(index)
  paddingRight.ensureCapacity(index)
  paddingBottom.ensureCapacity(index)
  paddingLeft.ensureCapacity(index)
  gap.ensureCapacity(index)
  rowGap.ensureCapacity(index)
  columnGap.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  marginTop.clear(index)
  marginRight.clear(index)
  marginBottom.clear(index)
  marginLeft.clear(index)
  paddingTop.clear(index)
  paddingRight.clear(index)
  paddingBottom.clear(index)
  paddingLeft.clear(index)
  gap.clear(index)
  rowGap.clear(index)
  columnGap.clear(index)
}
