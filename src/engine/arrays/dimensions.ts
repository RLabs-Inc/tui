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
 * Note: 0 means "auto" for width/height, "no constraint" for min/max.
 */

import { bind, type Binding } from '@rlabs-inc/signals'

/** Requested width (0 = auto) */
export const width: Binding<number>[] = []

/** Requested height (0 = auto) */
export const height: Binding<number>[] = []

/** Minimum width constraint */
export const minWidth: Binding<number>[] = []

/** Minimum height constraint */
export const minHeight: Binding<number>[] = []

/** Maximum width constraint (0 = no max) */
export const maxWidth: Binding<number>[] = []

/** Maximum height constraint (0 = no max) */
export const maxHeight: Binding<number>[] = []

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
