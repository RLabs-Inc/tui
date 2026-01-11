/**
 * TUI Framework - Core Arrays
 *
 * The most fundamental component arrays:
 * - componentType: What kind of component (box, text, etc.)
 * - parentIndex: Parent in hierarchy
 * - visible: Is component rendered
 *
 * NOTE: Focus state (focusable, tabIndex) is in interaction.ts
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 * componentType is the exception - it stores values directly, not reactively.
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'
import { ComponentType } from '../../types'
import type { ComponentTypeValue } from '../../types'

/** Component type (box, text, input, etc.) - stores values directly (not reactive) */
export const componentType: ComponentTypeValue[] = []

/** Parent component index (-1 for root) */
export const parentIndex: SlotArray<number> = slotArray<number>(-1)

/** Is component visible (0/false = hidden, 1/true = visible) */
export const visible: SlotArray<number | boolean> = slotArray<number | boolean>(1)

/** Component ID (for debugging and lookups) */
export const componentId: SlotArray<string> = slotArray<string>('')

/**
 * Ensure array has capacity for the given index.
 * Called by registry when allocating.
 */
export function ensureCapacity(index: number): void {
  while (componentType.length <= index) {
    componentType.push(ComponentType.NONE)
  }
  parentIndex.ensureCapacity(index)
  visible.ensureCapacity(index)
  componentId.ensureCapacity(index)
}

/** Clear values at index (called when releasing) */
export function clearAtIndex(index: number): void {
  if (index < componentType.length) {
    componentType[index] = ComponentType.NONE
  }
  parentIndex.clear(index)
  visible.clear(index)
  componentId.clear(index)
}
