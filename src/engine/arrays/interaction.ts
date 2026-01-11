/**
 * TUI Framework - Interaction Arrays
 *
 * State for scroll, focus, and mouse interactions.
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 *
 * Exception: focusedIndex is a single signal, not an array.
 *
 * NOTE: scrollable/maxScrollX/maxScrollY are COMPUTED by TITAN layout engine
 * and live in ComputedLayout, not here. Only scroll OFFSETS (user state) are here.
 */

import { signal, slotArray, type SlotArray } from '@rlabs-inc/signals'

// =============================================================================
// SCROLL STATE (user-controlled position only)
// =============================================================================

/** Current vertical scroll offset (user state) */
export const scrollOffsetY: SlotArray<number> = slotArray<number>(0)

/** Current horizontal scroll offset (user state) */
export const scrollOffsetX: SlotArray<number> = slotArray<number>(0)

// NOTE: scrollable, maxScrollX, maxScrollY are COMPUTED values from TITAN.
// Read them from layoutDerived.value, not from interaction arrays.

// =============================================================================
// FOCUS STATE
// =============================================================================

/** Can this component receive focus */
export const focusable: SlotArray<number> = slotArray<number>(0) // 0=no, 1=yes

/** Tab order for focus navigation (-1 = not in tab order) */
export const tabIndex: SlotArray<number> = slotArray<number>(-1)

/** Currently focused component index (-1 = none) - SINGLE SIGNAL, not array */
export const focusedIndex = signal(-1)

// =============================================================================
// MOUSE STATE
// =============================================================================

/** Is mouse currently hovering over this component */
export const hovered: SlotArray<number> = slotArray<number>(0) // 0=no, 1=yes

/** Is mouse button currently pressed on this component */
export const pressed: SlotArray<number> = slotArray<number>(0) // 0=no, 1=yes

/** Is mouse events enabled for this component */
export const mouseEnabled: SlotArray<number> = slotArray<number>(0) // 0=no, 1=yes

// =============================================================================
// CURSOR STATE (for input components)
// =============================================================================

/** Cursor position in text content */
export const cursorPosition: SlotArray<number> = slotArray<number>(0)

/** Selection start position (-1 = no selection) */
export const selectionStart: SlotArray<number> = slotArray<number>(-1)

/** Selection end position */
export const selectionEnd: SlotArray<number> = slotArray<number>(-1)

// =============================================================================
// CAPACITY MANAGEMENT
// =============================================================================

/** Ensure capacity for all interaction arrays */
export function ensureCapacity(index: number): void {
  scrollOffsetY.ensureCapacity(index)
  scrollOffsetX.ensureCapacity(index)
  focusable.ensureCapacity(index)
  tabIndex.ensureCapacity(index)
  hovered.ensureCapacity(index)
  pressed.ensureCapacity(index)
  mouseEnabled.ensureCapacity(index)
  cursorPosition.ensureCapacity(index)
  selectionStart.ensureCapacity(index)
  selectionEnd.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  scrollOffsetY.clear(index)
  scrollOffsetX.clear(index)
  focusable.clear(index)
  tabIndex.clear(index)
  hovered.clear(index)
  pressed.clear(index)
  mouseEnabled.clear(index)
  cursorPosition.clear(index)
  selectionStart.clear(index)
  selectionEnd.clear(index)
}
