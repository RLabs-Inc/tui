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

// Margin
export const marginTop: Binding<number>[] = []
export const marginRight: Binding<number>[] = []
export const marginBottom: Binding<number>[] = []
export const marginLeft: Binding<number>[] = []

// Padding
export const paddingTop: Binding<number>[] = []
export const paddingRight: Binding<number>[] = []
export const paddingBottom: Binding<number>[] = []
export const paddingLeft: Binding<number>[] = []

// Gap (for flex containers)
export const gap: Binding<number>[] = []
export const rowGap: Binding<number>[] = []
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
