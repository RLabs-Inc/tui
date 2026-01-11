/**
 * TUI Framework - Text Arrays
 *
 * Text content and styling for text/input components.
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 * This fixes the bind() tracking bug where deriveds miss updates
 * when binding objects are replaced.
 *
 * Flow: user signal → setSource() → Slot tracks → arr[i] reads value → dependency!
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'
import type { CellAttrs } from '../../types'

// Text content - SlotArray auto-tracks and auto-unwraps
export const textContent: SlotArray<string> = slotArray<string>('')

// Text styling (CellAttrs bitfield)
export const textAttrs: SlotArray<CellAttrs> = slotArray<CellAttrs>(0)

// Text alignment: 0=left, 1=center, 2=right
export const textAlign: SlotArray<number> = slotArray<number>(0)

// Text wrapping: 0=nowrap, 1=wrap, 2=truncate
export const textWrap: SlotArray<number> = slotArray<number>(1)  // wrap by default

// Ellipsis for truncated text
export const ellipsis: SlotArray<string> = slotArray<string>('...')

/** Ensure capacity for all text arrays */
export function ensureCapacity(index: number): void {
  textContent.ensureCapacity(index)
  textAttrs.ensureCapacity(index)
  textAlign.ensureCapacity(index)
  textWrap.ensureCapacity(index)
  ellipsis.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  textContent.clear(index)
  textAttrs.clear(index)
  textAlign.clear(index)
  textWrap.clear(index)
  ellipsis.clear(index)
}
