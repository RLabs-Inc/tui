/**
 * TUI Framework - Input Module
 *
 * Owns stdin. Parses all terminal input (keyboard + mouse).
 * Routes typed events to keyboard and mouse modules.
 *
 * This is the ONLY module that touches process.stdin.
 */

import type { KeyboardEvent } from './keyboard'
import type { MouseEvent } from './mouse'

// =============================================================================
// TYPES
// =============================================================================

type KeyboardHandler = (event: KeyboardEvent) => void
type MouseHandler = (event: MouseEvent) => void

interface Modifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

type KeyState = 'press' | 'repeat' | 'release'

// =============================================================================
// INPUT BUFFER - Unified Parser
// =============================================================================

/**
 * Buffer for accumulating partial escape sequences.
 * Escape sequences can arrive split across multiple stdin reads.
 * Handles BOTH keyboard AND mouse since stdin delivers interleaved data.
 */
class InputBuffer {
  private buffer = ''
  private timeout: Timer | null = null
  private readonly TIMEOUT_MS = 10

  constructor(
    private onKeyboard: KeyboardHandler,
    private onMouse: MouseHandler
  ) {}

  parse(data: Buffer): void {
    this.buffer += data.toString()

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
        break
      } else {
        consumed++
      }
    }

    this.buffer = this.buffer.slice(consumed)

    // Timeout flushes incomplete sequences as raw input (handles genuine ESC key)
    if (this.buffer.length > 0) {
      this.timeout = setTimeout(() => {
        for (const char of this.buffer) {
          const code = char.charCodeAt(0)
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

  private parseOne(data: string): ParseResult {
    if (data.length === 0) return { consumed: 0 }

    if (data[0] === '\x1b') {
      return this.parseEscape(data)
    }

    const char = data[0]!
    const code = char.codePointAt(0) ?? 0

    if (code < 32) {
      return { keyboard: this.controlKey(code), consumed: 1 }
    }

    if (code === 127) {
      return { keyboard: this.key('Backspace'), consumed: 1 }
    }

    // Normalize space to 'Space' for consistency
    if (code === 32) {
      return { keyboard: this.key('Space'), consumed: 1 }
    }

    const isUpper = char >= 'A' && char <= 'Z'
    return {
      keyboard: { key: char, modifiers: this.mods({ shift: isUpper }), state: 'press' },
      consumed: char.length,
    }
  }

  // ===========================================================================
  // ESCAPE SEQUENCES
  // ===========================================================================

  private parseEscape(data: string): ParseResult {
    if (data.length === 1) {
      return { consumed: 0, incomplete: true }
    }

    const second = data[1]!

    if (second === '[') return this.parseCSI(data)
    if (second === 'O') return this.parseSS3(data)

    // Alt + key
    if (second.codePointAt(0)! >= 32) {
      return {
        keyboard: { key: second, modifiers: this.mods({ alt: true }), state: 'press' },
        consumed: 2,
      }
    }

    return { keyboard: this.key('Escape'), consumed: 1 }
  }

  private parseCSI(data: string): ParseResult {
    // SGR mouse: ESC [ < ...
    if (data.length >= 3 && data[2] === '<') {
      return this.parseMouseSGR(data)
    }

    // X10 mouse: ESC [ M ...
    if (data.length >= 3 && data[2] === 'M') {
      return this.parseMouseX10(data)
    }

    // Find terminator (A-Z, a-z, or ~)
    let i = 2
    while (i < data.length) {
      const c = data.charCodeAt(i)
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 126) break
      i++
    }

    if (i >= data.length) {
      return { consumed: 0, incomplete: true }
    }

    const sequence = data.slice(2, i)
    const terminator = data[i]!

    return this.parseCSIKey(sequence, terminator, i + 1)
  }

  private parseCSIKey(sequence: string, terminator: string, consumed: number): ParseResult {
    const parts = sequence.split(';')
    const modifiers = this.mods()

    if (parts.length >= 2) {
      const mod = parseInt(parts[1]!, 10) - 1
      modifiers.shift = (mod & 1) !== 0
      modifiers.alt = (mod & 2) !== 0
      modifiers.ctrl = (mod & 4) !== 0
      modifiers.meta = (mod & 8) !== 0
    }

    let key: string

    switch (terminator) {
      case 'A': key = 'ArrowUp'; break
      case 'B': key = 'ArrowDown'; break
      case 'C': key = 'ArrowRight'; break
      case 'D': key = 'ArrowLeft'; break
      case 'H': key = 'Home'; break
      case 'F': key = 'End'; break
      case 'Z': key = 'Tab'; modifiers.shift = true; break
      case '~': key = this.parseTildeKey(parts[0]!); break
      case 'u': return this.parseKittyKey(sequence, consumed)
      default: key = `CSI${sequence}${terminator}`
    }

    return { keyboard: { key, modifiers, state: 'press' }, consumed }
  }

  private parseTildeKey(code: string): string {
    switch (parseInt(code, 10)) {
      case 1: case 7: return 'Home'
      case 2: return 'Insert'
      case 3: return 'Delete'
      case 4: case 8: return 'End'
      case 5: return 'PageUp'
      case 6: return 'PageDown'
      case 11: return 'F1'
      case 12: return 'F2'
      case 13: return 'F3'
      case 14: return 'F4'
      case 15: return 'F5'
      case 17: return 'F6'
      case 18: return 'F7'
      case 19: return 'F8'
      case 20: return 'F9'
      case 21: return 'F10'
      case 23: return 'F11'
      case 24: return 'F12'
      default: return `F${code}`
    }
  }

  private parseKittyKey(sequence: string, consumed: number): ParseResult {
    const parts = sequence.split(';')
    const codepoint = parseInt(parts[0]!, 10)
    const modifiers = this.mods()
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
      if (eventType === 2) state = 'repeat'
      else if (eventType === 3) state = 'release'
    }

    let key: string
    switch (codepoint) {
      case 13: key = 'Enter'; break
      case 9: key = 'Tab'; break
      case 127: key = 'Backspace'; break
      case 27: key = 'Escape'; break
      default: key = String.fromCodePoint(codepoint)
    }

    return { keyboard: { key, modifiers, state }, consumed }
  }

  private parseSS3(data: string): ParseResult {
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
      default: key = `SS3${terminator}`
    }

    return { keyboard: this.key(key), consumed: 3 }
  }

  // ===========================================================================
  // MOUSE PARSING
  // ===========================================================================

  private parseMouseSGR(data: string): ParseResult {
    const match = data.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
    if (!match) {
      if (data.match(/^\x1b\[<[\d;]*$/)) {
        return { consumed: 0, incomplete: true }
      }
      return { consumed: 0 }
    }

    const [full, buttonStr, xStr, yStr, terminator] = match
    const buttonCode = parseInt(buttonStr!, 10)
    const x = parseInt(xStr!, 10) - 1
    const y = parseInt(yStr!, 10) - 1

    const baseButton = buttonCode & 3
    const isScroll = (buttonCode & 64) !== 0
    const isMotion = (buttonCode & 32) !== 0

    type Action = 'down' | 'up' | 'move' | 'drag' | 'scroll'
    let action: Action
    let button = baseButton
    let scrollDirection: 'up' | 'down' | undefined

    if (isScroll) {
      action = 'scroll'
      scrollDirection = baseButton === 0 ? 'up' : 'down'
      button = 3
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
        shiftKey: (buttonCode & 4) !== 0,
        altKey: (buttonCode & 8) !== 0,
        ctrlKey: (buttonCode & 16) !== 0,
        scroll: scrollDirection ? { direction: scrollDirection, delta: 1 } : undefined,
        componentIndex: -1,
      },
      consumed: full!.length,
    }
  }

  private parseMouseX10(data: string): ParseResult {
    if (data.length < 6) {
      return { consumed: 0, incomplete: true }
    }

    const buttonByte = data.charCodeAt(3) - 32
    const x = data.charCodeAt(4) - 33
    const y = data.charCodeAt(5) - 33

    const baseButton = buttonByte & 3
    const isScroll = (buttonByte & 64) !== 0

    type Action = 'down' | 'up' | 'move' | 'drag' | 'scroll'
    let action: Action
    let button = baseButton
    let scrollDirection: 'up' | 'down' | undefined

    if (isScroll) {
      action = 'scroll'
      scrollDirection = baseButton === 0 ? 'up' : 'down'
      button = 3
    } else {
      action = baseButton === 3 ? 'up' : 'down'
      if (baseButton === 3) button = 0
    }

    return {
      mouse: {
        action,
        button,
        x,
        y,
        shiftKey: (buttonByte & 4) !== 0,
        altKey: (buttonByte & 8) !== 0,
        ctrlKey: (buttonByte & 16) !== 0,
        scroll: scrollDirection ? { direction: scrollDirection, delta: 1 } : undefined,
        componentIndex: -1,
      },
      consumed: 6,
    }
  }

  // ===========================================================================
  // CONTROL KEYS
  // ===========================================================================

  private controlKey(code: number): KeyboardEvent {
    let key: string
    const modifiers = this.mods()

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
      case 10: case 13: key = 'Enter'; break
      case 11: key = 'k'; modifiers.ctrl = true; break
      case 12: key = 'l'; modifiers.ctrl = true; break
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
      default: key = `Ctrl+${code}`
    }

    return { key, modifiers, state: 'press' }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private key(key: string): KeyboardEvent {
    return { key, modifiers: this.mods(), state: 'press' }
  }

  private simpleKey(key: string): KeyboardEvent {
    return { key, modifiers: this.mods(), state: 'press' }
  }

  private mods(overrides: Partial<Modifiers> = {}): Modifiers {
    return { ctrl: false, alt: false, shift: false, meta: false, ...overrides }
  }

  clear(): void {
    this.buffer = ''
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}

interface ParseResult {
  keyboard?: KeyboardEvent
  mouse?: MouseEvent
  consumed: number
  incomplete?: boolean
}

// =============================================================================
// STATE
// =============================================================================

let initialized = false
let inputBuffer: InputBuffer | null = null
let keyboardHandler: KeyboardHandler | null = null
let mouseHandler: MouseHandler | null = null

// =============================================================================
// STDIN MANAGEMENT
// =============================================================================

function handleData(data: Buffer): void {
  inputBuffer?.parse(data)
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize stdin input handling.
 * Call once at app start. Subsequent calls are no-ops.
 */
export function initialize(
  onKeyboard: KeyboardHandler,
  onMouse: MouseHandler
): void {
  if (initialized) return
  if (!process.stdin.isTTY) return

  initialized = true
  keyboardHandler = onKeyboard
  mouseHandler = onMouse

  inputBuffer = new InputBuffer(onKeyboard, onMouse)

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', handleData)
}

/**
 * Clean up stdin handling.
 */
export function cleanup(): void {
  if (!initialized) return

  initialized = false
  inputBuffer?.clear()
  inputBuffer = null
  keyboardHandler = null
  mouseHandler = null

  if (process.stdin.isTTY) {
    process.stdin.removeListener('data', handleData)
    process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}

/**
 * Check if input system is initialized.
 */
export function isInitialized(): boolean {
  return initialized
}

export const input = {
  initialize,
  cleanup,
  isInitialized,
}
