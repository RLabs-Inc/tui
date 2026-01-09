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

/** LAZY BINDING: Push undefined, primitives create bindings for used props only */
export function ensureCapacity(index: number): void {
  while (marginTop.length <= index) {
    marginTop.push(undefined as any)
    marginRight.push(undefined as any)
    marginBottom.push(undefined as any)
    marginLeft.push(undefined as any)
    paddingTop.push(undefined as any)
    paddingRight.push(undefined as any)
    paddingBottom.push(undefined as any)
    paddingLeft.push(undefined as any)
    gap.push(undefined as any)
    rowGap.push(undefined as any)
    columnGap.push(undefined as any)
  }
}

export function clearAtIndex(index: number): void {
  if (index < marginTop.length) {
    marginTop[index] = undefined as any
    marginRight[index] = undefined as any
    marginBottom[index] = undefined as any
    marginLeft[index] = undefined as any
    paddingTop[index] = undefined as any
    paddingRight[index] = undefined as any
    paddingBottom[index] = undefined as any
    paddingLeft[index] = undefined as any
    gap[index] = undefined as any
    rowGap[index] = undefined as any
    columnGap[index] = undefined as any
  }
}
