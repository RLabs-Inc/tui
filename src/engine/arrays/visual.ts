/**
 * TUI Framework - Visual Arrays
 *
 * Colors, borders, and visual styling.
 * Colors stored as RGBA objects for alpha blending support.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
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

import { bind, type Binding } from '@rlabs-inc/signals'
import type { RGBA } from '../../types'

// =============================================================================
// COLORS - Regular arrays to preserve binding reactivity
// =============================================================================

/** Foreground color (text) - null means inherit from parent */
export const fgColor: Binding<RGBA | null>[] = []

/** Background color - null means transparent/inherit */
export const bgColor: Binding<RGBA | null>[] = []

/** Opacity 0-1 (1 = fully opaque) */
export const opacity: Binding<number>[] = []

// =============================================================================
// BORDERS - Per-side independent styles
// =============================================================================

/** Default border style for all sides (0-10) */
export const borderStyle: Binding<number>[] = []

/** Default border color for all sides - null means use foreground */
export const borderColor: Binding<RGBA | null>[] = []

/** Top border style (0=none or inherit from borderStyle, 1-10=specific style) */
export const borderTop: Binding<number>[] = []

/** Right border style */
export const borderRight: Binding<number>[] = []

/** Bottom border style */
export const borderBottom: Binding<number>[] = []

/** Left border style */
export const borderLeft: Binding<number>[] = []

/** Per-side border colors - null means use borderColor or foreground */
export const borderColorTop: Binding<RGBA | null>[] = []
export const borderColorRight: Binding<RGBA | null>[] = []
export const borderColorBottom: Binding<RGBA | null>[] = []
export const borderColorLeft: Binding<RGBA | null>[] = []

// =============================================================================
// FOCUS RING
// =============================================================================

/** Show focus ring when focused (1=yes, 0=no) */
export const showFocusRing: Binding<number>[] = []

/** Focus ring color */
export const focusRingColor: Binding<RGBA>[] = []

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_FOCUS_COLOR: RGBA = { r: 100, g: 149, b: 237, a: 255 } // cornflowerblue

export function ensureCapacity(index: number): void {
  while (fgColor.length <= index) {
    fgColor.push(bind(null))
    bgColor.push(bind(null))
    opacity.push(bind(1))
    borderStyle.push(bind(0))
    borderColor.push(bind(null))
    borderTop.push(bind(0))
    borderRight.push(bind(0))
    borderBottom.push(bind(0))
    borderLeft.push(bind(0))
    borderColorTop.push(bind(null))
    borderColorRight.push(bind(null))
    borderColorBottom.push(bind(null))
    borderColorLeft.push(bind(null))
    showFocusRing.push(bind(1))
    focusRingColor.push(bind({ ...DEFAULT_FOCUS_COLOR }))
  }
}

export function clearAtIndex(index: number): void {
  if (index < fgColor.length) {
    fgColor[index] = bind(null)
    bgColor[index] = bind(null)
    opacity[index] = bind(1)
    borderStyle[index] = bind(0)
    borderColor[index] = bind(null)
    borderTop[index] = bind(0)
    borderRight[index] = bind(0)
    borderBottom[index] = bind(0)
    borderLeft[index] = bind(0)
    borderColorTop[index] = bind(null)
    borderColorRight[index] = bind(null)
    borderColorBottom[index] = bind(null)
    borderColorLeft[index] = bind(null)
    showFocusRing[index] = bind(1)
    focusRingColor[index] = bind({ ...DEFAULT_FOCUS_COLOR })
  }
}
