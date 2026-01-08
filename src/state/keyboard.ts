/**
 * TUI Framework - Keyboard State Module
 *
 * Robust keyboard handling based on terminalKit patterns:
 * - InputBuffer for partial escape sequence handling
 * - Proper control key mapping (Ctrl+H ≠ Backspace)
 * - CSI, SS3, Kitty protocol support
 * - Alt+key detection
 *
 * API:
 *   keyboard.lastEvent  - Reactive last event
 *   keyboard.on(fn)     - Subscribe to all keys
 *   keyboard.onKey(k,fn)- Subscribe to specific key
 *   keyboard.onFocused(i,fn) - Subscribe when focused
 */

import { signal, derived } from '@rlabs-inc/signals'
import { focusedIndex } from '../engine/arrays/interaction'
import { processMouseEvent, type MouseEvent as TUIMouseEvent } from './mouse'
import { focusNext, focusPrevious, focus, blur, focusManager } from './focus'
import { handleArrowScroll, handlePageScroll, handleHomeEnd, handleWheelScroll } from './scroll'

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
  /** Normalized key name (e.g., 'Enter', 'ArrowUp', 'a') */
  key: string
  /** Modifier state */
  modifiers: Modifiers
  /** Key state (press/repeat/release) */
  state: KeyState
  /** Raw input bytes (for debugging) */
  raw?: string
}

export type KeyHandler = (event: KeyboardEvent) => void | boolean

// =============================================================================
// INPUT BUFFER (from terminalKit)
// =============================================================================

/**
 * Buffer for accumulating partial escape sequences.
 * Escape sequences can arrive split across multiple stdin reads.
 * Handles BOTH keyboard AND mouse events since stdin can deliver
 * interleaved data in a single chunk.
 */
class InputBuffer {
  private buffer: string = ''
  private timeout: Timer | null = null
  private readonly TIMEOUT_MS = 10 // Max wait for complete sequence (fast! we do 62K updates/sec)
  private onKeyboard: (event: KeyboardEvent) => void
  private onMouse: (event: TUIMouseEvent) => void

  constructor(
    onKeyboard: (event: KeyboardEvent) => void,
    onMouse: (event: TUIMouseEvent) => void
  ) {
    this.onKeyboard = onKeyboard
    this.onMouse = onMouse
  }

  /**
   * Add data to buffer and extract complete events
   */
  parse(data: Buffer): void {
    const str = data.toString()
    this.buffer += str

    // Clear any pending timeout
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    let consumed = 0

    while (consumed < this.buffer.length) {
      const remaining = this.buffer.slice(consumed)
      const result = this.parseOne(remaining)

      if (result.keyboard) {
        this.onKeyboard(result.keyboard)
        consumed += result.consumed
      } else if (result.mouse) {
        this.onMouse(result.mouse)
        consumed += result.consumed
      } else if (result.incomplete) {
        // Partial sequence - wait for more data
        break
      } else {
        // Unknown/invalid - skip one byte
        consumed++
      }
    }

    // Remove consumed data from buffer
    this.buffer = this.buffer.slice(consumed)

    // If buffer still has data, set timeout to flush as raw input
    // This handles genuine ESC key presses (vs ESC as start of sequence)
    if (this.buffer.length > 0) {
      this.timeout = setTimeout(() => {
        for (const char of this.buffer) {
          const code = char.charCodeAt(0)
          // Use controlKey for control characters, simpleKey for printable
          if (code < 32 || code === 127) {
            this.onKeyboard(this.controlKey(code))
          } else {
            this.onKeyboard(this.simpleKey(char))
          }
        }
        this.buffer = ''
      }, this.TIMEOUT_MS)
    }
  }

  /** Result from parsing - either a keyboard event, mouse event, or incomplete/nothing */
  private parseOne(data: string): { keyboard?: KeyboardEvent; mouse?: TUIMouseEvent; consumed: number; incomplete?: boolean } {
    if (data.length === 0) {
      return { consumed: 0 }
    }

    // Check for escape sequence
    if (data[0] === '\x1b') {
      return this.parseEscape(data)
    }

    // Regular character
    const char = data[0]!
    const codepoint = char.codePointAt(0) ?? 0

    // Control characters (0-31)
    if (codepoint < 32) {
      return {
        keyboard: this.controlKey(codepoint),
        consumed: 1,
      }
    }

    // DEL character (127)
    if (codepoint === 127) {
      return {
        keyboard: { key: 'Backspace', modifiers: this.defaultModifiers(), state: 'press' },
        consumed: 1,
      }
    }

    // Normal character (handle shift for uppercase letters)
    const isUpper = char >= 'A' && char <= 'Z'
    return {
      keyboard: {
        key: char,
        modifiers: { ...this.defaultModifiers(), shift: isUpper },
        state: 'press',
      },
      consumed: char.length,
    }
  }

  private parseEscape(data: string): { keyboard?: KeyboardEvent; mouse?: TUIMouseEvent; consumed: number; incomplete?: boolean } {
    if (data.length === 1) {
      // Just ESC, might be start of sequence
      return { consumed: 0, incomplete: true }
    }

    const second = data[1]!

    // CSI sequence: ESC [
    if (second === '[') {
      return this.parseCSI(data)
    }

    // SS3 sequence: ESC O
    if (second === 'O') {
      return this.parseSS3(data)
    }

    // Alt + key: ESC + char
    if (second.codePointAt(0)! >= 32) {
      return {
        keyboard: {
          key: second,
          modifiers: { ctrl: false, alt: true, shift: false, meta: false },
          state: 'press',
        },
        consumed: 2,
      }
    }

    // Just ESC key
    return {
      keyboard: { key: 'Escape', modifiers: this.defaultModifiers(), state: 'press' },
      consumed: 1,
    }
  }

  private parseCSI(data: string): { keyboard?: KeyboardEvent; mouse?: TUIMouseEvent; consumed: number; incomplete?: boolean } {
    // Check for SGR mouse: ESC [ < ... M/m
    if (data.length >= 3 && data[2] === '<') {
      return this.parseMouseSGR(data)
    }

    // Check for X10 mouse: ESC [ M followed by 3 bytes
    if (data.length >= 3 && data[2] === 'M') {
      return this.parseMouseX10(data)
    }

    // Find the terminator for keyboard CSI (letter or ~)
    let i = 2
    while (i < data.length) {
      const c = data.charCodeAt(i)
      // Terminator is A-Z, a-z, or ~
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 126) {
        break
      }
      i++
    }

    if (i >= data.length) {
      return { consumed: 0, incomplete: true }
    }

    const sequence = data.slice(2, i)
    const terminator = data[i]!
    const consumed = i + 1

    // Keyboard sequences
    return this.parseCSIKey(sequence, terminator, consumed)
  }

  /** Parse SGR mouse: ESC [ < button ; x ; y M/m */
  private parseMouseSGR(data: string): { mouse?: TUIMouseEvent; consumed: number; incomplete?: boolean } {
    // Match the full SGR mouse sequence
    const match = data.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
    if (!match) {
      // Check if it might be incomplete (still receiving digits/semicolons)
      if (data.match(/^\x1b\[<[\d;]*$/)) {
        return { consumed: 0, incomplete: true }
      }
      return { consumed: 0 }
    }

    const [full, buttonStr, xStr, yStr, terminator] = match
    const buttonCode = parseInt(buttonStr!, 10)
    const x = parseInt(xStr!, 10) - 1  // Convert to 0-based
    const y = parseInt(yStr!, 10) - 1

    const baseButton = buttonCode & 3
    const isScroll = (buttonCode & 64) !== 0
    const isMotion = (buttonCode & 32) !== 0

    const shiftKey = (buttonCode & 4) !== 0
    const altKey = (buttonCode & 8) !== 0
    const ctrlKey = (buttonCode & 16) !== 0

    type MouseAction = 'down' | 'up' | 'move' | 'drag' | 'scroll'
    let action: MouseAction
    let scrollDirection: 'up' | 'down' | undefined
    let button = baseButton

    if (isScroll) {
      action = 'scroll'
      scrollDirection = baseButton === 0 ? 'up' : 'down'
      button = 3  // NONE
    } else if (isMotion) {
      action = baseButton === 3 ? 'move' : 'drag'
    } else {
      action = terminator === 'M' ? 'down' : 'up'
    }

    return {
      mouse: {
        action,
        button,
        x,
        y,
        shiftKey,
        altKey,
        ctrlKey,
        scroll: scrollDirection ? { direction: scrollDirection, delta: 1 } : undefined,
        componentIndex: -1,  // Will be filled by mouse module
      },
      consumed: full!.length,
    }
  }

  /** Parse X10 mouse: ESC [ M followed by 3 bytes */
  private parseMouseX10(data: string): { mouse?: TUIMouseEvent; consumed: number; incomplete?: boolean } {
    if (data.length < 6) {
      return { consumed: 0, incomplete: true }
    }

    const buttonByte = data.charCodeAt(3) - 32
    const x = data.charCodeAt(4) - 33  // Convert to 0-based
    const y = data.charCodeAt(5) - 33

    const baseButton = buttonByte & 3
    const isScroll = (buttonByte & 64) !== 0

    const shiftKey = (buttonByte & 4) !== 0
    const altKey = (buttonByte & 8) !== 0
    const ctrlKey = (buttonByte & 16) !== 0

    type MouseAction = 'down' | 'up' | 'move' | 'drag' | 'scroll'
    let action: MouseAction
    let scrollDirection: 'up' | 'down' | undefined
    let button = baseButton

    if (isScroll) {
      action = 'scroll'
      scrollDirection = baseButton === 0 ? 'up' : 'down'
      button = 3  // NONE
    } else {
      action = baseButton === 3 ? 'up' : 'down'
      if (baseButton === 3) button = 0  // Normalize to LEFT for up events
    }

    return {
      mouse: {
        action,
        button,
        x,
        y,
        shiftKey,
        altKey,
        ctrlKey,
        scroll: scrollDirection ? { direction: scrollDirection, delta: 1 } : undefined,
        componentIndex: -1,  // Will be filled by mouse module
      },
      consumed: 6,
    }
  }

  private parseCSIKey(
    sequence: string,
    terminator: string,
    consumed: number
  ): { keyboard?: KeyboardEvent; consumed: number } {
    const modifiers = this.defaultModifiers()

    // Parse modifiers from sequence (e.g., "1;5" means Ctrl)
    const parts = sequence.split(';')
    if (parts.length >= 2) {
      const mod = parseInt(parts[1]!, 10) - 1
      modifiers.shift = (mod & 1) !== 0
      modifiers.alt = (mod & 2) !== 0
      modifiers.ctrl = (mod & 4) !== 0
      modifiers.meta = (mod & 8) !== 0
    }

    let key: string

    // Arrow keys
    if (terminator === 'A') key = 'ArrowUp'
    else if (terminator === 'B') key = 'ArrowDown'
    else if (terminator === 'C') key = 'ArrowRight'
    else if (terminator === 'D') key = 'ArrowLeft'
    else if (terminator === 'H') key = 'Home'
    else if (terminator === 'F') key = 'End'
    else if (terminator === 'Z') {
      // Shift+Tab
      key = 'Tab'
      modifiers.shift = true
    }
    // Function keys (~ terminator)
    else if (terminator === '~') {
      const code = parseInt(parts[0]!, 10)
      switch (code) {
        case 1: key = 'Home'; break
        case 2: key = 'Insert'; break
        case 3: key = 'Delete'; break
        case 4: key = 'End'; break
        case 5: key = 'PageUp'; break
        case 6: key = 'PageDown'; break
        case 7: key = 'Home'; break
        case 8: key = 'End'; break
        case 11: key = 'F1'; break
        case 12: key = 'F2'; break
        case 13: key = 'F3'; break
        case 14: key = 'F4'; break
        case 15: key = 'F5'; break
        case 17: key = 'F6'; break
        case 18: key = 'F7'; break
        case 19: key = 'F8'; break
        case 20: key = 'F9'; break
        case 21: key = 'F10'; break
        case 23: key = 'F11'; break
        case 24: key = 'F12'; break
        default: key = `F${code}`; break
      }
    }
    // Kitty keyboard protocol
    else if (terminator === 'u') {
      return this.parseKittyKey(sequence, consumed)
    }
    else {
      key = `CSI${sequence}${terminator}`
    }

    return {
      keyboard: { key, modifiers, state: 'press' },
      consumed,
    }
  }

  private parseKittyKey(sequence: string, consumed: number): { keyboard?: KeyboardEvent; consumed: number } {
    const parts = sequence.split(';')
    const codepoint = parseInt(parts[0]!, 10)
    const modifiers = this.defaultModifiers()
    let state: KeyState = 'press'

    if (parts.length >= 2) {
      const modBits = parseInt(parts[1]!, 10) - 1
      modifiers.shift = (modBits & 1) !== 0
      modifiers.alt = (modBits & 2) !== 0
      modifiers.ctrl = (modBits & 4) !== 0
      modifiers.meta = (modBits & 8) !== 0
    }

    if (parts.length >= 3) {
      const eventType = parseInt(parts[2]!, 10)
      if (eventType === 1) state = 'press'
      else if (eventType === 2) state = 'repeat'
      else if (eventType === 3) state = 'release'
    }

    let key: string
    if (codepoint === 13) key = 'Enter'
    else if (codepoint === 9) key = 'Tab'
    else if (codepoint === 127) key = 'Backspace'
    else if (codepoint === 27) key = 'Escape'
    else key = String.fromCodePoint(codepoint)

    return {
      keyboard: { key, modifiers, state },
      consumed,
    }
  }

  private parseSS3(data: string): { keyboard?: KeyboardEvent; consumed: number; incomplete?: boolean } {
    if (data.length < 3) {
      return { consumed: 0, incomplete: true }
    }

    const terminator = data[2]!
    let key: string

    switch (terminator) {
      case 'P': key = 'F1'; break
      case 'Q': key = 'F2'; break
      case 'R': key = 'F3'; break
      case 'S': key = 'F4'; break
      case 'H': key = 'Home'; break
      case 'F': key = 'End'; break
      case 'A': key = 'ArrowUp'; break
      case 'B': key = 'ArrowDown'; break
      case 'C': key = 'ArrowRight'; break
      case 'D': key = 'ArrowLeft'; break
      default: key = `SS3${terminator}`; break
    }

    return {
      keyboard: { key, modifiers: this.defaultModifiers(), state: 'press' },
      consumed: 3,
    }
  }

  /**
   * Map control character to key event
   * This is the KEY fix - proper Ctrl+letter vs special key mapping
   */
  private controlKey(code: number): KeyboardEvent {
    let key: string
    const modifiers = this.defaultModifiers()

    switch (code) {
      case 0: key = '@'; modifiers.ctrl = true; break
      case 1: key = 'a'; modifiers.ctrl = true; break
      case 2: key = 'b'; modifiers.ctrl = true; break
      case 3: key = 'c'; modifiers.ctrl = true; break
      case 4: key = 'd'; modifiers.ctrl = true; break
      case 5: key = 'e'; modifiers.ctrl = true; break
      case 6: key = 'f'; modifiers.ctrl = true; break
      case 7: key = 'g'; modifiers.ctrl = true; break
      // 8 = Backspace (NOT Ctrl+H!)
      case 8: key = 'Backspace'; break
      // 9 = Tab (NOT Ctrl+I!)
      case 9: key = 'Tab'; break
      // 10 = Enter/LF (NOT Ctrl+J!)
      case 10: key = 'Enter'; break
      case 11: key = 'k'; modifiers.ctrl = true; break
      case 12: key = 'l'; modifiers.ctrl = true; break
      // 13 = Enter/CR (NOT Ctrl+M!)
      case 13: key = 'Enter'; break
      case 14: key = 'n'; modifiers.ctrl = true; break
      case 15: key = 'o'; modifiers.ctrl = true; break
      case 16: key = 'p'; modifiers.ctrl = true; break
      case 17: key = 'q'; modifiers.ctrl = true; break
      case 18: key = 'r'; modifiers.ctrl = true; break
      case 19: key = 's'; modifiers.ctrl = true; break
      case 20: key = 't'; modifiers.ctrl = true; break
      case 21: key = 'u'; modifiers.ctrl = true; break
      case 22: key = 'v'; modifiers.ctrl = true; break
      case 23: key = 'w'; modifiers.ctrl = true; break
      case 24: key = 'x'; modifiers.ctrl = true; break
      case 25: key = 'y'; modifiers.ctrl = true; break
      case 26: key = 'z'; modifiers.ctrl = true; break
      // 27 = Escape
      case 27: key = 'Escape'; break
      case 28: key = '\\'; modifiers.ctrl = true; break
      case 29: key = ']'; modifiers.ctrl = true; break
      case 30: key = '^'; modifiers.ctrl = true; break
      case 31: key = '_'; modifiers.ctrl = true; break
      default: key = `Ctrl+${code}`; break
    }

    return { key, modifiers, state: 'press' }
  }

  private simpleKey(key: string): KeyboardEvent {
    return { key, modifiers: this.defaultModifiers(), state: 'press' }
  }

  private defaultModifiers(): Modifiers {
    return { ctrl: false, alt: false, shift: false, meta: false }
  }

  clear(): void {
    this.buffer = ''
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}

// =============================================================================
// STATE
// =============================================================================

let initialized = false
let inputBuffer: InputBuffer | null = null
const listeners = new Set<KeyHandler>()
const focusedListeners = new Map<number, Set<KeyHandler>>()

// Reactive state
const _lastEvent = signal<KeyboardEvent | null>(null)

/** Last keyboard event (reactive) */
export const lastEvent = derived(() => _lastEvent.value)

/** Last key pressed (reactive) */
export const lastKey = derived(() => _lastEvent.value?.key ?? '')

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Whether Ctrl+C should exit the app (can be overridden) */
let exitOnCtrlC = true

/** Set whether Ctrl+C exits the app */
export function setExitOnCtrlC(enabled: boolean): void {
  exitOnCtrlC = enabled
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

let cleanupCallback: (() => void) | null = null

function handleEvent(event: KeyboardEvent): void {
  // Update reactive state
  _lastEvent.value = event

  // System-level: Ctrl+C exits (configurable)
  if (exitOnCtrlC && event.key === 'c' && event.modifiers.ctrl) {
    cleanup()
    process.exit(0)
  }

  // Tab navigation (uses focus.ts with history support)
  if (event.key === 'Tab' && !event.modifiers.ctrl && !event.modifiers.alt) {
    if (event.modifiers.shift) {
      focusPrevious()
    } else {
      focusNext()
    }
    return // Tab is always consumed
  }

  // Dispatch to focused component handlers first
  const currentFocus = focusedIndex.value
  if (currentFocus >= 0) {
    const handlers = focusedListeners.get(currentFocus)
    if (handlers) {
      for (const handler of handlers) {
        if (handler(event) === true) return // Consumed
      }
    }
  }

  // Built-in scroll handling (after focused handlers, so they can override)
  // Arrow keys scroll focused scrollable
  if (event.key === 'ArrowUp' && handleArrowScroll('up')) return
  if (event.key === 'ArrowDown' && handleArrowScroll('down')) return
  if (event.key === 'ArrowLeft' && handleArrowScroll('left')) return
  if (event.key === 'ArrowRight' && handleArrowScroll('right')) return

  // Page Up/Down for larger scroll
  if (event.key === 'PageUp' && handlePageScroll('up')) return
  if (event.key === 'PageDown' && handlePageScroll('down')) return

  // Home/End for scroll to start/end
  if (event.key === 'Home' && !event.modifiers.ctrl && handleHomeEnd('home')) return
  if (event.key === 'End' && !event.modifiers.ctrl && handleHomeEnd('end')) return

  // Dispatch to global handlers
  for (const handler of listeners) {
    if (handler(event) === true) return // Consumed
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initialize(onCleanup?: () => void): void {
  if (initialized || !process.stdin.isTTY) return
  initialized = true
  cleanupCallback = onCleanup ?? null

  // Unified input buffer handles BOTH keyboard and mouse events
  // This correctly handles interleaved data in a single stdin chunk
  inputBuffer = new InputBuffer(handleKeyboardEvent, handleMouseEvent)

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', handleInput)
}

function handleKeyboardEvent(event: KeyboardEvent): void {
  handleEvent(event)
}

function handleMouseEvent(event: TUIMouseEvent): void {
  // Handle scroll wheel (before routing to mouse module)
  if (event.action === 'scroll' && event.scroll) {
    const direction = event.scroll.direction
    // Try hovered element first, fallback to focused
    handleWheelScroll(event.x, event.y, direction)
  }

  // Route to mouse module for click/hover/drag processing
  processMouseEvent(event)
}

function handleInput(data: Buffer): void {
  // Unified parser handles both keyboard and mouse - no routing needed!
  inputBuffer?.parse(data)
}

export function cleanup(): void {
  initialized = false
  listeners.clear()
  focusedListeners.clear()
  _lastEvent.value = null
  inputBuffer?.clear()
  inputBuffer = null

  if (process.stdin.isTTY) {
    process.stdin.removeListener('data', handleInput)
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }

  process.stdout.write('\x1b[?25h') // Show cursor

  if (cleanupCallback) {
    cleanupCallback()
    cleanupCallback = null
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function on(handler: KeyHandler): () => void {
  if (!initialized) initialize()
  listeners.add(handler)
  return () => listeners.delete(handler)
}

export function onKey(key: string | string[], handler: () => void | boolean): () => void {
  const keys = Array.isArray(key) ? key : [key]
  return on((event) => {
    if (keys.includes(event.key)) {
      return handler()
    }
  })
}

export function onFocused(index: number, handler: KeyHandler): () => void {
  if (!initialized) initialize()

  if (!focusedListeners.has(index)) {
    focusedListeners.set(index, new Set())
  }
  focusedListeners.get(index)!.add(handler)

  return () => {
    const handlers = focusedListeners.get(index)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        focusedListeners.delete(index)
      }
    }
  }
}

/**
 * Clean up all listeners for a component index.
 * Called when a component is released to prevent memory leaks.
 */
export function cleanupIndex(index: number): void {
  focusedListeners.delete(index)
}

// =============================================================================
// KEYBOARD OBJECT
// =============================================================================

export const keyboard = {
  // Reactive state
  get lastEvent() { return lastEvent.value },
  get lastKey() { return lastKey.value },

  // Handler registration
  on,
  onKey,
  onFocused,

  // Focus navigation (re-exported from focus.ts for convenience)
  focusNext,
  focusPrevious,
  focus,
  blur,
  get focusedIndex() { return focusedIndex.value },

  // Configuration
  setExitOnCtrlC,

  // Lifecycle
  initialize,
  cleanup,
}
