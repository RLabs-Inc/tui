/**
 * TUI Framework - Input Parsing
 *
 * Parses terminal stdin into structured key, mouse, and other events.
 * Handles escape sequence buffering and the various protocols:
 * - CSI sequences (arrows, function keys)
 * - SS3 sequences (F1-F4)
 * - SGR mouse protocol
 * - Kitty keyboard protocol
 * - Bracketed paste
 */

import type { KeyEvent, MouseEvent, FocusEvent, Modifiers, KeyState, MouseButton, MouseAction } from '../types'

// =============================================================================
// Parsed Input Types
// =============================================================================

export type ParsedInput =
  | { type: 'key'; event: KeyEvent }
  | { type: 'mouse'; event: MouseEvent }
  | { type: 'focus'; event: FocusEvent }
  | { type: 'paste'; data: string }

// =============================================================================
// Input Buffer
// =============================================================================

/**
 * Buffer for accumulating partial escape sequences.
 * Escape sequences can arrive split across multiple stdin reads.
 */
export class InputBuffer {
  private buffer = ''
  private timeout: Timer | null = null
  private readonly TIMEOUT_MS = 50 // Max wait for complete sequence
  private pendingEvents: ParsedInput[] = []

  /**
   * Add data to buffer and extract complete events.
   */
  parse(data: string | Uint8Array): ParsedInput[] {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
    this.buffer += str

    // Clear any pending timeout
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    const events: ParsedInput[] = []
    let consumed = 0

    while (consumed < this.buffer.length) {
      const remaining = this.buffer.slice(consumed)
      const result = this.parseOne(remaining)

      if (result.event) {
        events.push(result.event)
        consumed += result.consumed
      } else if (result.incomplete) {
        // Partial sequence - wait for more data
        break
      } else {
        // Unknown/invalid - skip one byte
        consumed++
      }
    }

    // Remove consumed data
    this.buffer = this.buffer.slice(consumed)

    // If buffer still has data, set timeout to flush as raw input
    if (this.buffer.length > 0) {
      this.timeout = setTimeout(() => {
        for (const char of this.buffer) {
          this.pendingEvents.push({
            type: 'key',
            event: this.simpleKey(char),
          })
        }
        this.buffer = ''
      }, this.TIMEOUT_MS)
    }

    // Include any pending events from previous timeout
    if (this.pendingEvents.length > 0) {
      events.push(...this.pendingEvents)
      this.pendingEvents = []
    }

    return events
  }

  /**
   * Parse a single event from the start of the string.
   */
  private parseOne(data: string): { event?: ParsedInput; consumed: number; incomplete?: boolean } {
    if (data.length === 0) {
      return { consumed: 0 }
    }

    // Escape sequence
    if (data[0] === '\x1b') {
      return this.parseEscape(data)
    }

    // Regular character
    const char = data[0]
    const codepoint = char.codePointAt(0) ?? 0

    // Control characters
    if (codepoint < 32) {
      return {
        event: { type: 'key', event: this.controlKey(codepoint) },
        consumed: 1,
      }
    }

    // DEL
    if (codepoint === 127) {
      return {
        event: { type: 'key', event: this.simpleKey('Backspace') },
        consumed: 1,
      }
    }

    // Normal character (handles multi-byte Unicode)
    return {
      event: { type: 'key', event: this.simpleKey(char) },
      consumed: char.length,
    }
  }

  /**
   * Parse escape sequence.
   */
  private parseEscape(data: string): { event?: ParsedInput; consumed: number; incomplete?: boolean } {
    if (data.length === 1) {
      // Just ESC, might be start of sequence
      return { consumed: 0, incomplete: true }
    }

    const second = data[1]

    // CSI sequence: ESC [
    if (second === '[') {
      return this.parseCSI(data)
    }

    // SS3 sequence: ESC O
    if (second === 'O') {
      return this.parseSS3(data)
    }

    // Alt + key: ESC + char
    if (second.length === 1 && second.codePointAt(0)! >= 32) {
      return {
        event: {
          type: 'key',
          event: {
            key: second,
            modifiers: { ctrl: false, alt: true, shift: false, meta: false },
            state: 'press',
          },
        },
        consumed: 2,
      }
    }

    // Just ESC key
    return {
      event: { type: 'key', event: this.simpleKey('Escape') },
      consumed: 1,
    }
  }

  /**
   * Parse CSI sequence (ESC [ ...).
   */
  private parseCSI(data: string): { event?: ParsedInput; consumed: number; incomplete?: boolean } {
    // Find the terminator (letter or ~)
    let i = 2
    while (i < data.length) {
      const c = data.charCodeAt(i)
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 126) {
        break
      }
      i++
    }

    if (i >= data.length) {
      return { consumed: 0, incomplete: true }
    }

    const sequence = data.slice(2, i)
    const terminator = data[i]
    const consumed = i + 1

    // Focus events
    if (terminator === 'I') {
      return { event: { type: 'focus', event: { focused: true } }, consumed }
    }
    if (terminator === 'O') {
      return { event: { type: 'focus', event: { focused: false } }, consumed }
    }

    // Mouse SGR mode: ESC [ < params M/m
    if (sequence.startsWith('<')) {
      return this.parseMouseSGR(sequence, terminator, consumed)
    }

    // Keyboard sequences
    return this.parseCSIKey(sequence, terminator, consumed)
  }

  /**
   * Parse SGR mouse event.
   * Format: ESC [ < button ; x ; y M/m
   */
  private parseMouseSGR(
    sequence: string,
    terminator: string,
    consumed: number
  ): { event?: ParsedInput; consumed: number } {
    const params = sequence.slice(1).split(';').map(Number)
    if (params.length < 3) {
      return { consumed }
    }

    const [buttonCode, x, y] = params

    // Decode button and action
    const baseButton = buttonCode & 3
    const isScroll = (buttonCode & 64) !== 0
    const isMotion = (buttonCode & 32) !== 0

    let button: MouseButton
    let action: MouseAction
    let scrollDelta: number | undefined

    if (isScroll) {
      button = 'none'
      action = 'scroll'
      scrollDelta = baseButton === 0 ? -1 : 1 // 0 = up, 1 = down
    } else if (isMotion && baseButton === 3) {
      button = 'none'
      action = 'move'
    } else {
      button = (['left', 'middle', 'right', 'none'] as const)[baseButton]
      action = terminator === 'M' ? 'down' : 'up'
    }

    // Modifiers
    const modifiers: Modifiers = {
      shift: (buttonCode & 4) !== 0,
      alt: (buttonCode & 8) !== 0,
      ctrl: (buttonCode & 16) !== 0,
      meta: false,
    }

    return {
      event: {
        type: 'mouse',
        event: {
          x: x - 1, // Convert to 0-indexed
          y: y - 1,
          button,
          action,
          scrollDelta,
          modifiers,
        },
      },
      consumed,
    }
  }

  /**
   * Parse CSI keyboard sequence.
   */
  private parseCSIKey(
    sequence: string,
    terminator: string,
    consumed: number
  ): { event?: ParsedInput; consumed: number } {
    const modifiers = this.defaultModifiers()

    // Parse modifiers from sequence (e.g., "1;5" means Ctrl)
    const parts = sequence.split(';')
    if (parts.length >= 2) {
      const mod = parseInt(parts[1], 10) - 1
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
      const code = parseInt(parts[0], 10)
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
      event: {
        type: 'key',
        event: { key, modifiers, state: 'press' },
      },
      consumed,
    }
  }

  /**
   * Parse Kitty keyboard protocol sequence.
   * Format: ESC [ codepoint ; modifiers [: event_type] u
   */
  private parseKittyKey(sequence: string, consumed: number): { event?: ParsedInput; consumed: number } {
    const parts = sequence.split(';')
    const codepoint = parseInt(parts[0], 10)
    const modifiers = this.defaultModifiers()
    let state: KeyState = 'press'

    if (parts.length >= 2) {
      // Modifiers may include event type after colon
      const modParts = parts[1].split(':')
      const modBits = parseInt(modParts[0], 10) - 1
      modifiers.shift = (modBits & 1) !== 0
      modifiers.alt = (modBits & 2) !== 0
      modifiers.ctrl = (modBits & 4) !== 0
      modifiers.meta = (modBits & 8) !== 0

      if (modParts.length >= 2) {
        const eventType = parseInt(modParts[1], 10)
        if (eventType === 1) state = 'press'
        else if (eventType === 2) state = 'repeat'
        else if (eventType === 3) state = 'release'
      }
    }

    // Map codepoint to key name
    let key: string
    switch (codepoint) {
      case 13: key = 'Enter'; break
      case 9: key = 'Tab'; break
      case 127: key = 'Backspace'; break
      case 27: key = 'Escape'; break
      case 32: key = 'Space'; break
      default:
        key = codepoint >= 32 && codepoint < 127
          ? String.fromCodePoint(codepoint)
          : String.fromCodePoint(codepoint)
    }

    return {
      event: {
        type: 'key',
        event: { key, modifiers, state },
      },
      consumed,
    }
  }

  /**
   * Parse SS3 sequence (ESC O ...).
   */
  private parseSS3(data: string): { event?: ParsedInput; consumed: number; incomplete?: boolean } {
    if (data.length < 3) {
      return { consumed: 0, incomplete: true }
    }

    const terminator = data[2]
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
      event: {
        type: 'key',
        event: { key, modifiers: this.defaultModifiers(), state: 'press' },
      },
      consumed: 3,
    }
  }

  /**
   * Create a simple key event.
   */
  private simpleKey(key: string): KeyEvent {
    return {
      key,
      modifiers: this.defaultModifiers(),
      state: 'press',
    }
  }

  /**
   * Create a control key event.
   */
  private controlKey(code: number): KeyEvent {
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
      case 8: key = 'Backspace'; break
      case 9: key = 'Tab'; break
      case 10: key = 'Enter'; break
      case 11: key = 'k'; modifiers.ctrl = true; break
      case 12: key = 'l'; modifiers.ctrl = true; break
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
      case 27: key = 'Escape'; break
      case 28: key = '\\'; modifiers.ctrl = true; break
      case 29: key = ']'; modifiers.ctrl = true; break
      case 30: key = '^'; modifiers.ctrl = true; break
      case 31: key = '_'; modifiers.ctrl = true; break
      default: key = `Ctrl+${code}`; break
    }

    return { key, modifiers, state: 'press' }
  }

  /**
   * Default modifiers (all false).
   */
  private defaultModifiers(): Modifiers {
    return { ctrl: false, alt: false, shift: false, meta: false }
  }

  /**
   * Clear buffer.
   */
  clear(): void {
    this.buffer = ''
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    this.pendingEvents = []
  }
}
