/**
 * TUI Framework - Interaction Arrays
 *
 * State for scroll, focus, and mouse interactions.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 *
 * Exception: focusedIndex is a single signal, not an array.
 *
 * NOTE: scrollable/maxScrollX/maxScrollY are COMPUTED by TITAN layout engine
 * and live in ComputedLayout, not here. Only scroll OFFSETS (user state) are here.
 */

import { signal, bind, type Binding } from '@rlabs-inc/signals'

// =============================================================================
// SCROLL STATE (user-controlled position only)
// =============================================================================

/** Current vertical scroll offset (user state) */
export const scrollOffsetY: Binding<number>[] = []

/** Current horizontal scroll offset (user state) */
export const scrollOffsetX: Binding<number>[] = []

// NOTE: scrollable, maxScrollX, maxScrollY are COMPUTED values from TITAN.
// Read them from layoutDerived.value, not from interaction arrays.

// =============================================================================
// FOCUS STATE
// =============================================================================

/** Can this component receive focus */
export const focusable: Binding<number>[] = [] // 0=no, 1=yes

/** Tab order for focus navigation (-1 = not in tab order) */
export const tabIndex: Binding<number>[] = []

/** Currently focused component index (-1 = none) - SINGLE SIGNAL, not array */
export const focusedIndex = signal(-1)

// =============================================================================
// MOUSE STATE
// =============================================================================

/** Is mouse currently hovering over this component */
export const hovered: Binding<number>[] = [] // 0=no, 1=yes

/** Is mouse button currently pressed on this component */
export const pressed: Binding<number>[] = [] // 0=no, 1=yes

/** Is mouse events enabled for this component */
export const mouseEnabled: Binding<number>[] = [] // 0=no, 1=yes

// =============================================================================
// CURSOR STATE (for input components)
// =============================================================================

/** Cursor position in text content */
export const cursorPosition: Binding<number>[] = []

/** Selection start position (-1 = no selection) */
export const selectionStart: Binding<number>[] = []

/** Selection end position */
export const selectionEnd: Binding<number>[] = []

// =============================================================================
// CAPACITY MANAGEMENT
// =============================================================================

/** LAZY BINDING: Push undefined, primitives create bindings for used props only */
export function ensureCapacity(index: number): void {
  while (scrollOffsetY.length <= index) {
    scrollOffsetY.push(undefined as any)
    scrollOffsetX.push(undefined as any)
    focusable.push(undefined as any)
    tabIndex.push(undefined as any)
    hovered.push(undefined as any)
    pressed.push(undefined as any)
    mouseEnabled.push(undefined as any)
    cursorPosition.push(undefined as any)
    selectionStart.push(undefined as any)
    selectionEnd.push(undefined as any)
  }
}

export function clearAtIndex(index: number): void {
  if (index < scrollOffsetY.length) {
    scrollOffsetY[index] = undefined as any
    scrollOffsetX[index] = undefined as any
    focusable[index] = undefined as any
    tabIndex[index] = undefined as any
    hovered[index] = undefined as any
    pressed[index] = undefined as any
    mouseEnabled[index] = undefined as any
    cursorPosition[index] = undefined as any
    selectionStart[index] = undefined as any
    selectionEnd[index] = undefined as any
  }
}
