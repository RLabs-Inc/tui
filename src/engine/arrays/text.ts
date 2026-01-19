/**
 * TUI Framework - Text Arrays
 *
 * Text content and styling for text/input components.
 *
 * Uses trackedSlotArray for automatic dirty tracking - when text properties
 * change, the index is automatically added to dirtyText ReactiveSet.
 * This enables O(1) layout skipping when no text changed.
 *
 * Flow: user signal → setSource() → marks dirty → Slot tracks → arr[i] reads value → dependency!
 */

import { trackedSlotArray, type SlotArray } from '@rlabs-inc/signals'
import type { CellAttrs } from '../../types'
import { dirtyText } from './dirty'

// Text content - TrackedSlotArray auto-tracks and auto-unwraps, marks dirty on change
export const textContent: SlotArray<string> = trackedSlotArray<string>('', dirtyText)

// Text styling (CellAttrs bitfield)
export const textAttrs: SlotArray<CellAttrs> = trackedSlotArray<CellAttrs>(0, dirtyText)

// Text alignment: 0=left, 1=center, 2=right
export const textAlign: SlotArray<number> = trackedSlotArray<number>(0, dirtyText)

// Text wrapping: 0=nowrap, 1=wrap, 2=truncate
export const textWrap: SlotArray<number> = trackedSlotArray<number>(1, dirtyText)  // wrap by default

// Ellipsis for truncated text
export const ellipsis: SlotArray<string> = trackedSlotArray<string>('...', dirtyText)

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
