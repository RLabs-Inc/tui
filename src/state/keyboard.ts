/**
 * TUI Framework - Keyboard Module
 *
 * State and handler registry for keyboard events.
 * Does NOT own stdin (that's input.ts).
 * Does NOT handle global shortcuts (that's global-keys.ts).
 *
 * API:
 *   lastEvent      - Reactive signal of last keyboard event
 *   lastKey        - Reactive signal of last key pressed
 *   on(handler)    - Subscribe to all keyboard events
 *   onKey(key, fn) - Subscribe to specific key(s)
 *   onFocused(i,fn)- Subscribe when component i has focus
 */

import { signal, derived } from '@rlabs-inc/signals'

// =============================================================================
// TYPES
// =============================================================================

export interface Modifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type KeyState = 'press' | 'repeat' | 'release'

export interface KeyboardEvent {
  key: string
  modifiers: Modifiers
  state: KeyState
  raw?: string
}

export type KeyHandler = (event: KeyboardEvent) => void | boolean

// =============================================================================
// STATE
// =============================================================================

/** Last keyboard event (reactive signal) */
export const lastEvent = signal<KeyboardEvent | null>(null)

/** Last key pressed (reactive derived) */
export const lastKey = derived(() => lastEvent.value?.key ?? '')

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

const globalHandlers = new Set<KeyHandler>()
const keyHandlers = new Map<string, Set<() => void | boolean>>()
const focusedHandlers = new Map<number, Set<KeyHandler>>()

// =============================================================================
// EVENT DISPATCH (called by global-keys.ts)
// =============================================================================

/**
 * Dispatch a keyboard event to all registered handlers.
 * Called by global-keys.ts after it processes global shortcuts.
 *
 * Returns true if any handler consumed the event.
 */
export function dispatch(event: KeyboardEvent): boolean {
  lastEvent.value = event

  // Dispatch to key-specific handlers
  const handlers = keyHandlers.get(event.key)
  if (handlers) {
    for (const handler of handlers) {
      if (handler() === true) return true
    }
  }

  // Dispatch to global handlers
  for (const handler of globalHandlers) {
    if (handler(event) === true) return true
  }

  return false
}

/**
 * Dispatch to focused component handlers.
 * Returns true if consumed.
 */
export function dispatchFocused(focusedIndex: number, event: KeyboardEvent): boolean {
  if (focusedIndex < 0) return false

  const handlers = focusedHandlers.get(focusedIndex)
  if (!handlers) return false

  for (const handler of handlers) {
    if (handler(event) === true) return true
  }

  return false
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Subscribe to all keyboard events.
 * Return true from handler to consume the event.
 */
export function on(handler: KeyHandler): () => void {
  globalHandlers.add(handler)
  return () => globalHandlers.delete(handler)
}

/**
 * Subscribe to specific key(s).
 * Handler receives no arguments - check lastEvent if needed.
 * Return true to consume the event.
 */
export function onKey(key: string | string[], handler: () => void | boolean): () => void {
  const keys = Array.isArray(key) ? key : [key]
  const unsubscribers: (() => void)[] = []

  for (const k of keys) {
    if (!keyHandlers.has(k)) {
      keyHandlers.set(k, new Set())
    }
    keyHandlers.get(k)!.add(handler)
    unsubscribers.push(() => {
      const set = keyHandlers.get(k)
      if (set) {
        set.delete(handler)
        if (set.size === 0) keyHandlers.delete(k)
      }
    })
  }

  return () => unsubscribers.forEach(fn => fn())
}

/**
 * Subscribe to events when a specific component has focus.
 * Return true from handler to consume the event.
 */
export function onFocused(index: number, handler: KeyHandler): () => void {
  if (!focusedHandlers.has(index)) {
    focusedHandlers.set(index, new Set())
  }
  focusedHandlers.get(index)!.add(handler)

  return () => {
    const handlers = focusedHandlers.get(index)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        focusedHandlers.delete(index)
      }
    }
  }
}

/**
 * Clean up all handlers for a component index.
 * Called when component is released to prevent memory leaks.
 */
export function cleanupIndex(index: number): void {
  focusedHandlers.delete(index)
}

/**
 * Clear all state and handlers.
 */
export function cleanup(): void {
  globalHandlers.clear()
  keyHandlers.clear()
  focusedHandlers.clear()
  lastEvent.value = null
}

// =============================================================================
// KEYBOARD OBJECT - Functions only, no state getters
// =============================================================================

export const keyboard = {
  // Handler registration
  on,
  onKey,
  onFocused,

  // Cleanup
  cleanupIndex,
  cleanup,
}
