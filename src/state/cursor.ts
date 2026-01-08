/**
 * TUI Framework - Cursor State
 *
 * Reactive cursor control for terminal applications.
 * Handles visibility, shape, position, and blinking.
 *
 * Usage:
 * ```ts
 * import { cursor } from './state/cursor'
 *
 * // Show/hide
 * cursor.show()
 * cursor.hide()
 *
 * // Shape
 * cursor.setShape('bar')           // bar, block, underline
 * cursor.setShape('block', false)  // non-blinking block
 *
 * // Position
 * cursor.moveTo(10, 5)
 * cursor.moveBy(1, 0)  // move right 1
 *
 * // Save/restore
 * cursor.save()
 * cursor.restore()
 * ```
 */

import { signal, effect } from '@rlabs-inc/signals'
import type { CursorShape } from '../types'
import {
  cursorShow,
  cursorHide,
  cursorTo,
  cursorMove,
  cursorSavePosition,
  cursorRestorePosition,
  setCursorShape,
} from '../renderer/ansi'

// =============================================================================
// CURSOR STATE
// =============================================================================

/** Current cursor visibility */
export const visible = signal(true)

/** Current cursor shape */
export const shape = signal<CursorShape>('block')

/** Cursor blinking */
export const blinking = signal(true)

/** Cursor X position (column, 0-indexed) */
export const x = signal(0)

/** Cursor Y position (row, 0-indexed) */
export const y = signal(0)

// =============================================================================
// CURSOR CONTROL FUNCTIONS
// =============================================================================

/** Show the cursor */
export function show(): void {
  visible.value = true
}

/** Hide the cursor */
export function hide(): void {
  visible.value = false
}

/** Toggle cursor visibility */
export function toggle(): void {
  visible.value = !visible.value
}

/**
 * Set cursor shape.
 * @param newShape 'block' | 'underline' | 'bar'
 * @param blink Whether cursor should blink (default: true)
 */
export function setShape(newShape: CursorShape, blink: boolean = true): void {
  shape.value = newShape
  blinking.value = blink
}

/**
 * Move cursor to absolute position.
 * @param col Column (0-indexed)
 * @param row Row (0-indexed)
 */
export function moveTo(col: number, row: number): void {
  x.value = col
  y.value = row
}

/**
 * Move cursor relative to current position.
 * @param dx Columns to move (negative = left)
 * @param dy Rows to move (negative = up)
 */
export function moveBy(dx: number, dy: number): void {
  x.value += dx
  y.value += dy
}

/** Save current cursor position */
export function save(): string {
  return cursorSavePosition
}

/** Restore saved cursor position */
export function restore(): string {
  return cursorRestorePosition
}

// =============================================================================
// ANSI OUTPUT GENERATORS
// =============================================================================

/** Get ANSI sequence for current visibility */
export function getVisibilitySequence(): string {
  return visible.value ? cursorShow : cursorHide
}

/** Get ANSI sequence for current shape */
export function getShapeSequence(): string {
  return setCursorShape(shape.value, blinking.value)
}

/** Get ANSI sequence to move to current position */
export function getPositionSequence(): string {
  return cursorTo(x.value, y.value)
}

// =============================================================================
// REACTIVE CURSOR OBJECT (for convenience)
// =============================================================================

/**
 * Cursor control object with all functions.
 * Import this for a cleaner API:
 *
 * ```ts
 * import { cursor } from './state/cursor'
 * cursor.show()
 * cursor.setShape('bar')
 * ```
 */
export const cursor = {
  // State (readable)
  get visible() { return visible.value },
  get shape() { return shape.value },
  get blinking() { return blinking.value },
  get x() { return x.value },
  get y() { return y.value },

  // Control functions
  show,
  hide,
  toggle,
  setShape,
  moveTo,
  moveBy,
  save,
  restore,

  // ANSI sequences
  getVisibilitySequence,
  getShapeSequence,
  getPositionSequence,
}

export default cursor
