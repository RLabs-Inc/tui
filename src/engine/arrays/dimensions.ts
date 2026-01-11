/**
 * TUI Framework - Dimension Arrays
 *
 * Width, height, min/max constraints.
 * These are INPUT values that components write.
 * The layout derived READS these and RETURNS computed positions.
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 *
 * Supports both absolute and percentage dimensions:
 *   - number: Absolute value in cells (e.g., 50)
 *   - string: Percentage of parent (e.g., '50%', '100%')
 *
 * TITAN resolves percentages against parent computed sizes at layout time.
 *
 * Note: 0 means "auto" for width/height, "no constraint" for min/max.
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'
import type { Dimension } from '../../types'

/** Requested width (0 = auto, '100%' = full parent width) */
export const width: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Requested height (0 = auto, '100%' = full parent height) */
export const height: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Minimum width constraint */
export const minWidth: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Minimum height constraint */
export const minHeight: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Maximum width constraint (0 = no max) */
export const maxWidth: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Maximum height constraint (0 = no max) */
export const maxHeight: SlotArray<Dimension> = slotArray<Dimension>(0)

/** Ensure capacity for all dimension arrays */
export function ensureCapacity(index: number): void {
  width.ensureCapacity(index)
  height.ensureCapacity(index)
  minWidth.ensureCapacity(index)
  minHeight.ensureCapacity(index)
  maxWidth.ensureCapacity(index)
  maxHeight.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  width.clear(index)
  height.clear(index)
  minWidth.clear(index)
  minHeight.clear(index)
  maxWidth.clear(index)
  maxHeight.clear(index)
}
