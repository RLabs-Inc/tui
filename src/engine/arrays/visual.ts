/**
 * TUI Framework - Visual Arrays
 *
 * Colors, borders, and visual styling.
 * Colors stored as RGBA objects for alpha blending support.
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 *
 * Border styles:
 *   0 = none
 *   1 = single   (─ │ ┌ ┐ └ ┘)
 *   2 = double   (═ ║ ╔ ╗ ╚ ╝)
 *   3 = rounded  (─ │ ╭ ╮ ╰ ╯)
 *   4 = heavy    (━ ┃ ┏ ┓ ┗ ┛)
 *   5 = dashed   (╌ ╎ ┌ ┐ └ ┘)
 *   6 = dotted   (· · · · · ·)
 *   7 = ascii    (- | + + + +)
 *   8 = block    (█ █ █ █ █ █)
 *   9 = mixedDoubleH (═ │ ╒ ╕ ╘ ╛)
 *  10 = mixedDoubleV (─ ║ ╓ ╖ ╙ ╜)
 *
 * Per-side borders can have independent styles.
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'
import type { RGBA } from '../../types'

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_FOCUS_COLOR: RGBA = { r: 100, g: 149, b: 237, a: 255 } // cornflowerblue

// =============================================================================
// COLORS - SlotArrays for stable reactive cells
// =============================================================================

/** Foreground color (text) - null means inherit from parent */
export const fgColor: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)

/** Background color - null means transparent/inherit */
export const bgColor: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)

/** Opacity 0-1 (1 = fully opaque) */
export const opacity: SlotArray<number> = slotArray<number>(1)

// =============================================================================
// BORDERS - Per-side independent styles
// =============================================================================

/** Default border style for all sides (0-10) */
export const borderStyle: SlotArray<number> = slotArray<number>(0)

/** Default border color for all sides - null means use foreground */
export const borderColor: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)

/** Top border style (0=none or inherit from borderStyle, 1-10=specific style) */
export const borderTop: SlotArray<number> = slotArray<number>(0)

/** Right border style */
export const borderRight: SlotArray<number> = slotArray<number>(0)

/** Bottom border style */
export const borderBottom: SlotArray<number> = slotArray<number>(0)

/** Left border style */
export const borderLeft: SlotArray<number> = slotArray<number>(0)

/** Per-side border colors - null means use borderColor or foreground */
export const borderColorTop: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)
export const borderColorRight: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)
export const borderColorBottom: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)
export const borderColorLeft: SlotArray<RGBA | null> = slotArray<RGBA | null>(null)

// =============================================================================
// FOCUS RING
// =============================================================================

/** Show focus ring when focused (1=yes, 0=no) */
export const showFocusRing: SlotArray<number> = slotArray<number>(0)

/** Focus ring color */
export const focusRingColor: SlotArray<RGBA> = slotArray<RGBA>(DEFAULT_FOCUS_COLOR)

/** Ensure capacity for all visual arrays */
export function ensureCapacity(index: number): void {
  fgColor.ensureCapacity(index)
  bgColor.ensureCapacity(index)
  opacity.ensureCapacity(index)
  borderStyle.ensureCapacity(index)
  borderColor.ensureCapacity(index)
  borderTop.ensureCapacity(index)
  borderRight.ensureCapacity(index)
  borderBottom.ensureCapacity(index)
  borderLeft.ensureCapacity(index)
  borderColorTop.ensureCapacity(index)
  borderColorRight.ensureCapacity(index)
  borderColorBottom.ensureCapacity(index)
  borderColorLeft.ensureCapacity(index)
  showFocusRing.ensureCapacity(index)
  focusRingColor.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  fgColor.clear(index)
  bgColor.clear(index)
  opacity.clear(index)
  borderStyle.clear(index)
  borderColor.clear(index)
  borderTop.clear(index)
  borderRight.clear(index)
  borderBottom.clear(index)
  borderLeft.clear(index)
  borderColorTop.clear(index)
  borderColorRight.clear(index)
  borderColorBottom.clear(index)
  borderColorLeft.clear(index)
  showFocusRing.clear(index)
  focusRingColor.clear(index)
}
