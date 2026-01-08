/**
 * TUI Framework - Spacing Arrays
 *
 * Margin, padding, and gap values.
 * All values are in terminal cells (integers).
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 */

import { bind, type Binding } from '@rlabs-inc/signals'

// =============================================================================
// MARGIN - Space outside the component (offsets position in parent)
// =============================================================================

/** Top margin - adds space above the component (in cells) */
export const marginTop: Binding<number>[] = []

/** Right margin - adds space to the right of the component (in cells) */
export const marginRight: Binding<number>[] = []

/** Bottom margin - adds space below the component (in cells) */
export const marginBottom: Binding<number>[] = []

/** Left margin - adds space to the left of the component (in cells) */
export const marginLeft: Binding<number>[] = []

// =============================================================================
// PADDING - Space inside the component (reduces content area)
// =============================================================================

/** Top padding - pushes content down from top edge (in cells) */
export const paddingTop: Binding<number>[] = []

/** Right padding - pushes content left from right edge (in cells) */
export const paddingRight: Binding<number>[] = []

/** Bottom padding - pushes content up from bottom edge (in cells) */
export const paddingBottom: Binding<number>[] = []

/** Left padding - pushes content right from left edge (in cells) */
export const paddingLeft: Binding<number>[] = []

// =============================================================================
// GAP - Space between flex items (CSS gap property)
// =============================================================================

/** Gap between flex items in both directions (in cells) */
export const gap: Binding<number>[] = []

/** Row gap - vertical space between wrapped lines (in cells) */
export const rowGap: Binding<number>[] = []

/** Column gap - horizontal space between items in a row (in cells) */
export const columnGap: Binding<number>[] = []

export function ensureCapacity(index: number): void {
  while (marginTop.length <= index) {
    marginTop.push(bind(0))
    marginRight.push(bind(0))
    marginBottom.push(bind(0))
    marginLeft.push(bind(0))
    paddingTop.push(bind(0))
    paddingRight.push(bind(0))
    paddingBottom.push(bind(0))
    paddingLeft.push(bind(0))
    gap.push(bind(0))
    rowGap.push(bind(0))
    columnGap.push(bind(0))
  }
}

export function clearAtIndex(index: number): void {
  if (index < marginTop.length) {
    marginTop[index] = bind(0)
    marginRight[index] = bind(0)
    marginBottom[index] = bind(0)
    marginLeft[index] = bind(0)
    paddingTop[index] = bind(0)
    paddingRight[index] = bind(0)
    paddingBottom[index] = bind(0)
    paddingLeft[index] = bind(0)
    gap[index] = bind(0)
    rowGap[index] = bind(0)
    columnGap[index] = bind(0)
  }
}
