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
 * CRITICAL: Arrays storing Bindings must be regular arrays (NOT state!)
 * state() proxies snapshot getter values, breaking reactivity.
 * componentType is the exception - it stores values directly, not bindings.
 */

import { bind, disconnectBinding, type Binding } from '@rlabs-inc/signals'
import { ComponentType } from '../../types'
import type { ComponentTypeValue } from '../../types'

/** Component type (box, text, input, etc.) - stores values directly */
export const componentType: ComponentTypeValue[] = []

/** Parent component index (-1 for root) */
export const parentIndex: Binding<number>[] = []

/** Is component visible (0/false = hidden, 1/true = visible) */
export const visible: Binding<number | boolean>[] = []

/** Component ID (for debugging and lookups) */
export const componentId: Binding<string>[] = []

/**
 * Ensure array has capacity for the given index.
 * Called by registry when allocating.
 *
 * LAZY BINDING: We push undefined here, not bindings.
 * Primitives create bindings only for props they actually use.
 * This reduces memory from ~70 bindings/component to ~5-10.
 */
export function ensureCapacity(index: number): void {
  while (componentType.length <= index) {
    componentType.push(ComponentType.NONE)
    parentIndex.push(undefined as any)
    visible.push(undefined as any)
    componentId.push(undefined as any)
  }
}

/** Clear values at index (called when releasing) */
export function clearAtIndex(index: number): void {
  if (index < componentType.length) {
    componentType[index] = ComponentType.NONE
    disconnectBinding(parentIndex[index])
    disconnectBinding(visible[index])
    disconnectBinding(componentId[index])
    parentIndex[index] = undefined as any
    visible[index] = undefined as any
    componentId[index] = undefined as any
  }
}
