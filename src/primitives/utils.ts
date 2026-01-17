/**
 * TUI Framework - Primitive Utilities
 *
 * Shared helpers for primitives.
 * Most conversion functions are now inline in each primitive.
 */

import { isBinding, type WritableSignal, type Binding } from '@rlabs-inc/signals'

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a value is a signal (has .value getter/setter)
 */
export function isWritableSignal<T>(value: unknown): value is WritableSignal<T> {
  return value !== null && typeof value === 'object' && 'value' in value
}

/**
 * Check if a value is reactive (signal or binding)
 */
export function isReactive<T>(value: unknown): value is WritableSignal<T> | Binding<T> {
  return isWritableSignal(value) || isBinding(value)
}

/**
 * Unwrap a potentially reactive value to get current value.
 * Handles: signals, bindings, getters, or raw values.
 */
export function getValue<T>(prop: T | { value: T } | (() => T) | undefined, defaultVal: T): T {
  if (prop === undefined) return defaultVal
  if (typeof prop === 'function') return (prop as () => T)()
  if (typeof prop === 'object' && prop !== null && 'value' in prop) return (prop as { value: T }).value
  return prop as T
}

// =============================================================================
// ENUM SOURCE
// =============================================================================

/**
 * Create a slot source for enum props - returns getter for reactive, value for static.
 * For use with slotArray.setSource()
 * Handles: static values, signals/bindings ({ value: T }), and getter functions (() => T)
 */
export function enumSource<T extends string>(
  prop: T | { value: T } | (() => T) | undefined,
  converter: (val: T | undefined) => number
): number | (() => number) {
  // Handle getter function (inline derived)
  if (typeof prop === 'function') {
    return () => converter(prop())
  }
  // Handle object with .value (signal/binding/derived)
  if (prop !== undefined && typeof prop === 'object' && prop !== null && 'value' in prop) {
    const reactiveSource = prop as { value: T }
    return () => converter(reactiveSource.value)
  }
  // Static value
  return converter(prop as T | undefined)
}
