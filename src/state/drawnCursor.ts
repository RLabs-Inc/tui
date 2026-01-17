/**
 * TUI Framework - Drawn Cursor State
 *
 * Manages cursor state for input components (input, textarea, custom editors).
 * Unlike the terminal native cursor (cursor.ts), this cursor is drawn into
 * the frameBuffer and supports full customization.
 *
 * Features:
 * - Style presets (block, bar, underline) or custom characters
 * - Blink animation with configurable FPS (default: 2 FPS)
 * - Custom colors (fg/bg) or inherit from component
 * - Alt character for blink "off" phase
 * - Integrates with animation module for efficient shared clocks
 *
 * Usage:
 * ```ts
 * import { createCursor, disposeCursor } from '../state/drawnCursor'
 *
 * // In input component:
 * const cursor = createCursor(index, {
 *   style: 'bar',
 *   blink: true,
 *   fps: 2,
 * })
 *
 * // Update position
 * cursor.setPosition(5)
 *
 * // Cleanup on unmount
 * disposeCursor(index)
 * ```
 */

import { signal } from '@rlabs-inc/signals'
import * as interaction from '../engine/arrays/interaction'
import { registerFocusCallbacks } from './focus'
import { onDestroy } from '../engine/lifecycle'

// =============================================================================
// TYPES
// =============================================================================

export type DrawnCursorStyle = 'block' | 'bar' | 'underline'

export interface DrawnCursorConfig {
  /** Cursor style preset */
  style?: DrawnCursorStyle
  /** Custom cursor character (overrides style) */
  char?: string
  /** Enable blink animation (default: true) */
  blink?: boolean
  /** Blink FPS (default: 2, which gives 500ms on/off cycle) */
  fps?: number
  /** Alt character for blink "off" phase (default: invisible/space) */
  altChar?: string
  /** Initial cursor position */
  position?: number
}

export interface DrawnCursor {
  /** Set cursor position in text */
  setPosition: (pos: number) => void
  /** Get current position */
  getPosition: () => number
  /** Manually show cursor (override blink) */
  show: () => void
  /** Manually hide cursor (override blink) */
  hide: () => void
  /** Check if cursor is currently visible */
  isVisible: () => boolean
  /** Cleanup - stops animation, clears arrays */
  dispose: () => void
}

// =============================================================================
// CURSOR CHARACTER CODEPOINTS
// =============================================================================

const CURSOR_CHARS: Record<DrawnCursorStyle, number> = {
  block: 0,        // 0 = special case: inverse block (swap fg/bg)
  bar: 0x2502,     // │ vertical line
  underline: 0x5F, // _ underscore
}

// =============================================================================
// BLINK ANIMATION REGISTRY
// Shared clocks per FPS - same pattern as animation.ts
// =============================================================================

interface BlinkRegistry {
  phase: ReturnType<typeof signal<boolean>>
  interval: ReturnType<typeof setInterval> | null
  subscribers: number
}

const blinkRegistry = new Map<number, BlinkRegistry>()

function getBlinkClock(fps: number): BlinkRegistry {
  let registry = blinkRegistry.get(fps)

  if (!registry) {
    registry = {
      phase: signal(true), // true = visible
      interval: null,
      subscribers: 0,
    }
    blinkRegistry.set(fps, registry)
  }

  return registry
}

function subscribeToBlink(fps: number): () => void {
  const registry = getBlinkClock(fps)
  registry.subscribers++

  // Start interval if first subscriber
  if (registry.subscribers === 1 && !registry.interval) {
    const ms = Math.floor(1000 / fps / 2) // Divide by 2 for on/off cycle
    registry.interval = setInterval(() => {
      registry.phase.value = !registry.phase.value
    }, ms)
  }

  return () => {
    registry.subscribers = Math.max(0, registry.subscribers - 1)

    // Stop interval if no more subscribers
    if (registry.subscribers === 0 && registry.interval) {
      clearInterval(registry.interval)
      registry.interval = null
      registry.phase.value = true // Reset to visible
    }
  }
}

// =============================================================================
// ACTIVE CURSORS REGISTRY
// =============================================================================

const activeCursors = new Map<number, {
  unsubscribeBlink: (() => void) | null
  unsubscribeFocus: () => void
  manualVisible: ReturnType<typeof signal<boolean | null>>
}>()

// =============================================================================
// CREATE CURSOR
// =============================================================================

/**
 * Create a drawn cursor for a component.
 *
 * @param index Component index
 * @param config Cursor configuration
 * @returns Cursor control object
 *
 * @example
 * ```ts
 * const cursor = createCursor(index, {
 *   style: 'bar',      // 'block' | 'bar' | 'underline'
 *   blink: true,       // default: true
 *   fps: 2,            // default: 2 (500ms cycle)
 * })
 *
 * cursor.setPosition(5)
 * ```
 */
export function createCursor(index: number, config: DrawnCursorConfig = {}): DrawnCursor {
  const {
    style = 'block',
    char,
    blink = true,
    fps = 2,
    altChar,
    position = 0,
  } = config

  // Determine cursor character codepoint
  let charCode: number
  if (char) {
    charCode = char.codePointAt(0) ?? 0
  } else {
    charCode = CURSOR_CHARS[style]
  }

  // Determine alt character for blink "off" phase
  const altCharCode = altChar ? (altChar.codePointAt(0) ?? 0) : 0

  // Set cursor arrays
  interaction.cursorChar.setSource(index, charCode)
  interaction.cursorAltChar.setSource(index, altCharCode)
  interaction.cursorBlinkFps.setSource(index, blink ? fps : 0)
  interaction.cursorPosition.setSource(index, position)

  // Manual visibility override (null = use blink, true/false = override)
  const manualVisible = signal<boolean | null>(null)

  // Blink subscription (managed by focus callbacks, not effect)
  let unsubscribeBlink: (() => void) | null = null
  const shouldBlink = blink && fps > 0

  // Register focus callbacks to start/stop blink (imperative, at the source)
  const unsubscribeFocus = registerFocusCallbacks(index, {
    onFocus: () => {
      if (shouldBlink && !unsubscribeBlink) {
        unsubscribeBlink = subscribeToBlink(fps)
      }
    },
    onBlur: () => {
      if (unsubscribeBlink) {
        unsubscribeBlink()
        unsubscribeBlink = null
      }
    },
  })

  // Cursor visibility as derived getter (reactive, no effect)
  interaction.cursorVisible.setSource(index, () => {
    // Manual override takes precedence
    if (manualVisible.value !== null) {
      return manualVisible.value ? 1 : 0
    }
    // Not focused = always visible (cursor shows but doesn't blink)
    if (interaction.focusedIndex.value !== index) {
      return 1
    }
    // Focused + blink disabled = always visible
    if (!shouldBlink) {
      return 1
    }
    // Focused + blink enabled = follow blink clock
    return getBlinkClock(fps).phase.value ? 1 : 0
  })

  // Store in registry for cleanup
  activeCursors.set(index, {
    unsubscribeBlink,
    unsubscribeFocus,
    manualVisible,
  })

  // Register safety-net cleanup with lifecycle system.
  // This ensures cursor is disposed even if component forgets to call dispose()
  // or an error path skips cleanup. disposeCursor() is idempotent (safe to call twice).
  onDestroy(() => {
    disposeCursor(index)
  })

  // Return control object
  return {
    setPosition(pos: number) {
      interaction.cursorPosition.setSource(index, pos)
    },

    getPosition() {
      return interaction.cursorPosition[index] || 0
    },

    show() {
      manualVisible.value = true
    },

    hide() {
      manualVisible.value = false
    },

    isVisible() {
      return (interaction.cursorVisible[index] ?? 1) === 1
    },

    dispose() {
      disposeCursor(index)
    },
  }
}

// =============================================================================
// DISPOSE CURSOR
// =============================================================================

/**
 * Dispose a cursor and clean up its resources.
 *
 * @param index Component index
 */
export function disposeCursor(index: number): void {
  const cursor = activeCursors.get(index)

  if (cursor) {
    // Unsubscribe from focus callbacks
    cursor.unsubscribeFocus()

    // Unsubscribe from blink (if active)
    cursor.unsubscribeBlink?.()

    // Remove from registry
    activeCursors.delete(index)
  }

  // Clear cursor arrays
  interaction.cursorChar.clear(index)
  interaction.cursorAltChar.clear(index)
  interaction.cursorBlinkFps.clear(index)
  interaction.cursorVisible.clear(index)
  // Note: cursorPosition is managed by component, don't clear here
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/** Get cursor style codepoint */
export function getCursorCharCode(style: DrawnCursorStyle): number {
  return CURSOR_CHARS[style]
}

/** Check if a component has an active cursor */
export function hasCursor(index: number): boolean {
  return activeCursors.has(index)
}
