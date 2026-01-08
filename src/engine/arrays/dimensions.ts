/**
 * TUI Framework - Dimension Arrays
 *
 * Width, height, min/max constraints.
 * These are INPUT values that components write.
 * The layout derived READS these and RETURNS computed positions.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 *
 * Supports both absolute and percentage dimensions:
 *   - number: Absolute value in cells (e.g., 50)
 *   - string: Percentage of parent (e.g., '50%', '100%')
 *
 * TITAN resolves percentages against parent computed sizes at layout time.
 *
 * Note: 0 means "auto" for width/height, "no constraint" for min/max.
 */

import { bind, type Binding } from '@rlabs-inc/signals'
import type { Dimension } from '../../types'

/** Requested width (0 = auto, '100%' = full parent width) */
export const width: Binding<Dimension>[] = []

/** Requested height (0 = auto, '100%' = full parent height) */
export const height: Binding<Dimension>[] = []

/** Minimum width constraint */
export const minWidth: Binding<Dimension>[] = []

/** Minimum height constraint */
export const minHeight: Binding<Dimension>[] = []

/** Maximum width constraint (0 = no max) */
export const maxWidth: Binding<Dimension>[] = []

/** Maximum height constraint (0 = no max) */
export const maxHeight: Binding<Dimension>[] = []

export function ensureCapacity(index: number): void {
  while (width.length <= index) {
    width.push(bind(0))
    height.push(bind(0))
    minWidth.push(bind(0))
    minHeight.push(bind(0))
    maxWidth.push(bind(0))
    maxHeight.push(bind(0))
  }
}

export function clearAtIndex(index: number): void {
  if (index < width.length) {
    width[index] = bind(0)
    height[index] = bind(0)
    minWidth[index] = bind(0)
    minHeight[index] = bind(0)
    maxWidth[index] = bind(0)
    maxHeight[index] = bind(0)
  }
}
