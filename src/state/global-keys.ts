/**
 * TUI Framework - Global Keys Module
 *
 * Central location for ALL global keyboard and mouse shortcuts.
 * This is the ONLY place where global input behaviors are defined.
 *
 * Wires together: input, keyboard, mouse, focus, scroll
 *
 * Global behaviors:
 * - Ctrl+C: Exit application
 * - Tab/Shift+Tab: Focus navigation
 * - Arrow keys: Scroll focused scrollable
 * - Page Up/Down: Large scroll jumps
 * - Home/End: Scroll to start/end
 * - Mouse wheel: Scroll hovered or focused
 */

import { input } from './input'
import { keyboard, dispatch as dispatchKeyboard, dispatchFocused } from './keyboard'
import { mouse, dispatch as dispatchMouse } from './mouse'
import { focusNext, focusPrevious, focusedIndex } from './focus'
import { handleArrowScroll, handlePageScroll, handleHomeEnd, handleWheelScroll } from './scroll'
import type { KeyboardEvent } from './keyboard'
import type { MouseEvent } from './mouse'

// =============================================================================
// STATE
// =============================================================================

let initialized = false
let cleanupCallback: (() => void) | null = null
let exitOnCtrlC = true

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function handleKeyboardEvent(event: KeyboardEvent): void {
  try {
    // Only process press events for most shortcuts
    const isPress = event.state === 'press'

    // Ctrl+C - exit (always, even on release for safety)
    if (exitOnCtrlC && event.key === 'c' && event.modifiers.ctrl) {
      cleanup()
      process.exit(0)
    }

    // Skip non-press events for other shortcuts
    if (!isPress) {
      // Still dispatch to handlers (they may want release events)
      dispatchFocused(focusedIndex.value, event)
      dispatchKeyboard(event)
      return
    }

    // Tab - focus navigation
    if (event.key === 'Tab' && !event.modifiers.ctrl && !event.modifiers.alt) {
      if (event.modifiers.shift) {
        focusPrevious()
      } else {
        focusNext()
      }
      return // Tab is always consumed
    }

    // Dispatch to focused component handlers first
    if (dispatchFocused(focusedIndex.value, event)) {
      return // Consumed by focused handler
    }

    // Dispatch to user handlers (keyboard.onKey)
    // If user returns true, they handled it - skip framework defaults
    if (dispatchKeyboard(event)) {
      return // User handled it
    }

    // =========================================================================
    // FRAMEWORK DEFAULTS - only run if user didn't handle
    // =========================================================================

    // Arrow keys - scroll focused scrollable
    if (event.key === 'ArrowUp' && handleArrowScroll('up')) return
    if (event.key === 'ArrowDown' && handleArrowScroll('down')) return
    if (event.key === 'ArrowLeft' && handleArrowScroll('left')) return
    if (event.key === 'ArrowRight' && handleArrowScroll('right')) return

    // Page Up/Down
    if (event.key === 'PageUp' && handlePageScroll('up')) return
    if (event.key === 'PageDown' && handlePageScroll('down')) return

    // Home/End (without Ctrl - Ctrl+Home/End could be used for something else)
    if (event.key === 'Home' && !event.modifiers.ctrl && handleHomeEnd('home')) return
    if (event.key === 'End' && !event.modifiers.ctrl && handleHomeEnd('end')) return
  } catch (err) {
    console.error('[TUI] Keyboard handler error:', err)
  }
}

function handleMouseEvent(event: MouseEvent): void {
  // Mouse wheel - scroll hovered or focused
  if (event.action === 'scroll' && event.scroll) {
    handleWheelScroll(event.x, event.y, event.scroll.direction)
  }

  // Dispatch to mouse module for hover/click handling
  dispatchMouse(event)
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the global input system.
 * Sets up stdin handling and wires all global shortcuts.
 */
export function initialize(options?: {
  onCleanup?: () => void
  exitOnCtrlC?: boolean
  enableMouse?: boolean
}): void {
  if (initialized) return

  initialized = true
  cleanupCallback = options?.onCleanup ?? null
  exitOnCtrlC = options?.exitOnCtrlC ?? true

  // Initialize input system with our handlers
  input.initialize(handleKeyboardEvent, handleMouseEvent)

  // Enable mouse tracking if requested
  if (options?.enableMouse !== false) {
    mouse.enableTracking()
  }
}

/**
 * Clean up the global input system.
 */
export function cleanup(): void {
  if (!initialized) return

  initialized = false

  // Clean up all modules
  mouse.cleanup()
  keyboard.cleanup()
  input.cleanup()

  // Show cursor
  process.stdout.write('\x1b[?25h')

  // Call user cleanup
  if (cleanupCallback) {
    cleanupCallback()
    cleanupCallback = null
  }
}

/**
 * Set whether Ctrl+C exits the application.
 */
export function setExitOnCtrlC(enabled: boolean): void {
  exitOnCtrlC = enabled
}

/**
 * Check if global keys system is initialized.
 */
export function isInitialized(): boolean {
  return initialized
}

// =============================================================================
// EXPORT
// =============================================================================

export const globalKeys = {
  initialize,
  cleanup,
  setExitOnCtrlC,
  isInitialized,
}
