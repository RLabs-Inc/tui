/**
 * TUI Framework - Interaction Arrays
 *
 * State for scroll, focus, and mouse interactions.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 *
 * Exception: focusedIndex is a single signal, not an array.
 */

import { signal, bind, type Binding } from '@rlabs-inc/signals'

// =============================================================================
// SCROLL STATE
// =============================================================================

/** Is this component scrollable (has overflow content) */
export const scrollable: Binding<number>[] = [] // 0=no, 1=yes

/** Current vertical scroll offset */
export const scrollOffsetY: Binding<number>[] = []

/** Current horizontal scroll offset */
export const scrollOffsetX: Binding<number>[] = []

/** Maximum vertical scroll value (content height - viewport height) */
export const maxScrollY: Binding<number>[] = []

/** Maximum horizontal scroll value */
export const maxScrollX: Binding<number>[] = []

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

export function ensureCapacity(index: number): void {
  while (scrollable.length <= index) {
    scrollable.push(bind(0))
    scrollOffsetY.push(bind(0))
    scrollOffsetX.push(bind(0))
    maxScrollY.push(bind(0))
    maxScrollX.push(bind(0))
    focusable.push(bind(0))
    tabIndex.push(bind(-1))
    hovered.push(bind(0))
    pressed.push(bind(0))
    mouseEnabled.push(bind(1))
    cursorPosition.push(bind(0))
    selectionStart.push(bind(-1))
    selectionEnd.push(bind(-1))
  }
}

export function clearAtIndex(index: number): void {
  if (index < scrollable.length) {
    scrollable[index] = bind(0)
    scrollOffsetY[index] = bind(0)
    scrollOffsetX[index] = bind(0)
    maxScrollY[index] = bind(0)
    maxScrollX[index] = bind(0)
    focusable[index] = bind(0)
    tabIndex[index] = bind(-1)
    hovered[index] = bind(0)
    pressed[index] = bind(0)
    mouseEnabled[index] = bind(1)
    cursorPosition[index] = bind(0)
    selectionStart[index] = bind(-1)
    selectionEnd[index] = bind(-1)
  }
}
