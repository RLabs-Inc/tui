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
// CURSOR STYLING (for customizable cursor appearance)
// =============================================================================

/**
 * Cursor character codepoint.
 * 0 = use inverse block (default), >0 = custom character
 * Presets: bar=0x2502 (│), underline=0x5F (_)
 */
export const cursorChar: SlotArray<number> = slotArray<number>(0)

/**
 * Cursor alternate character for blink "off" phase.
 * 0 = space (invisible), >0 = custom character
 */
export const cursorAltChar: SlotArray<number> = slotArray<number>(0)

/**
 * Cursor blink rate in FPS.
 * 0 = no blink, >0 = blink at this FPS (default would be 2 = 500ms cycle)
 */
export const cursorBlinkFps: SlotArray<number> = slotArray<number>(0)

/**
 * Custom cursor foreground color (packed RGBA or 0 for default).
 * When 0, uses inverted colors from component's bg.
 */
export const cursorFg: SlotArray<number> = slotArray<number>(0)

/**
 * Custom cursor background color (packed RGBA or 0 for default).
 * When 0, uses component's fg color.
 */
export const cursorBg: SlotArray<number> = slotArray<number>(0)

/**
 * Cursor visibility state for blink animation.
 * 1 = visible (default), 0 = hidden
 * Managed by input component's animation, read by frameBuffer.
 */
export const cursorVisible: SlotArray<number> = slotArray<number>(1)

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
  cursorChar.ensureCapacity(index)
  cursorAltChar.ensureCapacity(index)
  cursorBlinkFps.ensureCapacity(index)
  cursorFg.ensureCapacity(index)
  cursorBg.ensureCapacity(index)
  cursorVisible.ensureCapacity(index)
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
  cursorChar.clear(index)
  cursorAltChar.clear(index)
  cursorBlinkFps.clear(index)
  cursorFg.clear(index)
  cursorBg.clear(index)
  cursorVisible.clear(index)
}
