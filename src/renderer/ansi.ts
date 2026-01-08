/**
 * TUI Framework - ANSI Escape Codes
 *
 * Complete terminal control sequences.
 * Based on ansi-escapes library but zero dependencies.
 *
 * References:
 * - https://www2.ccs.neu.edu/research/gpc/VonaUtils/vona/terminal/vtansi.htm
 * - https://terminalguide.namepad.de/
 */

import type { RGBA, CellAttrs, CursorShape } from '../types'
import { Attr } from '../types'
import { isTerminalDefault, isAnsiColor, getAnsiIndex } from '../types/color'

// =============================================================================
// Constants & Terminal Detection
// =============================================================================

export const ESC = '\u001B'
export const CSI = '\u001B['
export const OSC = '\u001B]'
export const BEL = '\u0007'
export const SEP = ';'

/** Detect Apple Terminal (needs different save/restore sequences) */
const isAppleTerminal = process.env.TERM_PROGRAM === 'Apple_Terminal'

/** Detect Windows */
const isWindows = process.platform === 'win32'

/** Detect tmux (needs OSC wrapping) */
const isTmux = process.env.TERM?.startsWith('screen') ||
               process.env.TERM?.startsWith('tmux') ||
               process.env.TMUX !== undefined

/** Wrap OSC sequences for tmux compatibility */
function wrapOsc(sequence: string): string {
  if (isTmux) {
    // Tmux requires OSC sequences to be wrapped with DCS tmux; <sequence> ST
    // and all ESCs in <sequence> to be replaced with ESC ESC
    return '\u001BPtmux;' + sequence.replaceAll('\u001B', '\u001B\u001B') + '\u001B\\'
  }
  return sequence
}

// =============================================================================
// Cursor Movement
// =============================================================================

/**
 * Move cursor to absolute position.
 * @param x Column (0-indexed)
 * @param y Row (0-indexed, optional)
 */
export function cursorTo(x: number, y?: number): string {
  if (typeof y !== 'number') {
    return CSI + (x + 1) + 'G'
  }
  return CSI + (y + 1) + SEP + (x + 1) + 'H'
}

/**
 * Move cursor relative to current position.
 * @param x Columns to move (negative = left)
 * @param y Rows to move (negative = up)
 */
export function cursorMove(x: number, y?: number): string {
  let result = ''

  if (x < 0) {
    result += CSI + (-x) + 'D'
  } else if (x > 0) {
    result += CSI + x + 'C'
  }

  if (typeof y === 'number') {
    if (y < 0) {
      result += CSI + (-y) + 'A'
    } else if (y > 0) {
      result += CSI + y + 'B'
    }
  }

  return result
}

/** Move cursor up n rows (default 1) */
export function cursorUp(count: number = 1): string {
  return CSI + count + 'A'
}

/** Move cursor down n rows (default 1) */
export function cursorDown(count: number = 1): string {
  return CSI + count + 'B'
}

/** Move cursor forward (right) n columns (default 1) */
export function cursorForward(count: number = 1): string {
  return CSI + count + 'C'
}

/** Move cursor backward (left) n columns (default 1) */
export function cursorBackward(count: number = 1): string {
  return CSI + count + 'D'
}

/** Move cursor to first column */
export const cursorLeft = CSI + 'G'

/** Move cursor to next line */
export const cursorNextLine = CSI + 'E'

/** Move cursor to previous line */
export const cursorPrevLine = CSI + 'F'

/** Save cursor position (terminal-aware) */
export const cursorSavePosition = isAppleTerminal ? '\u001B7' : CSI + 's'

/** Restore cursor position (terminal-aware) */
export const cursorRestorePosition = isAppleTerminal ? '\u001B8' : CSI + 'u'

/** Query cursor position - terminal responds with CSI row;col R */
export const cursorGetPosition = CSI + '6n'

/** Hide cursor */
export const cursorHide = CSI + '?25l'

/** Show cursor */
export const cursorShow = CSI + '?25h'

// =============================================================================
// Legacy cursor names (for compatibility with our existing code)
// =============================================================================

/** @deprecated Use cursorTo() */
export function moveTo(x: number, y: number): string {
  return CSI + y + SEP + x + 'H'  // 1-indexed for legacy compatibility
}

/** @deprecated Use cursorUp() */
export function moveUp(n: number = 1): string {
  return n > 0 ? CSI + n + 'A' : ''
}

/** @deprecated Use cursorDown() */
export function moveDown(n: number = 1): string {
  return n > 0 ? CSI + n + 'B' : ''
}

/** @deprecated Use cursorForward() */
export function moveRight(n: number = 1): string {
  return n > 0 ? CSI + n + 'C' : ''
}

/** @deprecated Use cursorBackward() */
export function moveLeft(n: number = 1): string {
  return n > 0 ? CSI + n + 'D' : ''
}

/** @deprecated Use cursorTo(x) */
export function moveToColumn(x: number): string {
  return CSI + x + 'G'
}

/** Move cursor to beginning of line */
export const carriageReturn = '\r'

/** @deprecated Use cursorSavePosition */
export const saveCursor = cursorSavePosition

/** @deprecated Use cursorRestorePosition */
export const restoreCursor = cursorRestorePosition

/** Save cursor position (DEC private - more robust) */
export const saveCursorDEC = '\u001B7'

/** Restore cursor position (DEC private - more robust) */
export const restoreCursorDEC = '\u001B8'

/** @deprecated Use cursorGetPosition */
export const queryCursorPosition = cursorGetPosition

/** @deprecated Use cursorHide */
export const hideCursor = cursorHide

/** @deprecated Use cursorShow */
export const showCursor = cursorShow

// =============================================================================
// Cursor Shape
// =============================================================================

/** Set cursor shape */
export function setCursorShape(shape: CursorShape, blinking: boolean = true): string {
  // DECSCUSR (cursor shape)
  // 0 = blinking block, 1 = blinking block, 2 = steady block
  // 3 = blinking underline, 4 = steady underline
  // 5 = blinking bar, 6 = steady bar
  const base = shape === 'block' ? 1 : shape === 'underline' ? 3 : 5
  const code = blinking ? base : base + 1
  return CSI + code + ' q'
}

// =============================================================================
// Erase Functions
// =============================================================================

/** Erase from cursor to end of line */
export const eraseEndLine = CSI + 'K'

/** Erase from cursor to start of line */
export const eraseStartLine = CSI + '1K'

/** Erase entire line */
export const eraseLine = CSI + '2K'

/** Erase screen from cursor down */
export const eraseDown = CSI + 'J'

/** Erase screen from cursor up */
export const eraseUp = CSI + '1J'

/** Erase entire screen */
export const eraseScreen = CSI + '2J'

/**
 * Erase from current cursor position up the specified amount of rows.
 * This is THE key function for inline mode rendering.
 * Matches ansi-escapes exactly.
 */
export function eraseLines(count: number): string {
  let clear = ''

  for (let i = 0; i < count; i++) {
    clear += eraseLine + (i < count - 1 ? cursorUp() : '')
  }

  if (count) {
    clear += cursorLeft
  }

  return clear
}

// TODO: Test this optimized version - uses array.join() instead of += in loop
// export function eraseLinesOptimized(count: number): string {
//   if (count === 0) return ''
//   if (count === 1) return eraseLine + cursorLeft
//   const lineAndUp = eraseLine + CSI + '1A'
//   const parts: string[] = []
//   for (let i = 0; i < count - 1; i++) parts.push(lineAndUp)
//   parts.push(eraseLine)
//   parts.push(cursorLeft)
//   return parts.join('')
// }

// Legacy aliases
/** @deprecated Use eraseLine */
export const clearEntireLine = eraseLine

/** @deprecated Use eraseEndLine */
export const clearLine = eraseEndLine

/** @deprecated Use eraseDown */
export const clearToEnd = eraseDown

// =============================================================================
// Screen Control
// =============================================================================

/**
 * Clear only the visible terminal screen (viewport).
 * Does NOT affect scrollback buffer or terminal state.
 * SAFE for inline/append modes.
 */
export const clearViewport = eraseScreen + CSI + 'H'

/**
 * Clear the terminal screen.
 * WARNING: Uses RIS (Reset to Initial State) which may:
 * - Clear scrollback buffer in some terminals
 * - Reset terminal modes and state
 * Consider using clearViewport for safer clearing.
 */
export const clearScreen = '\u001Bc'

/**
 * Clear the whole terminal including scrollback buffer.
 * Use for fullscreen mode cleanup.
 */
export const clearTerminal = isWindows
  ? eraseScreen + CSI + '0f'
  : eraseScreen + CSI + '3J' + CSI + 'H'

/** Clear scrollback buffer only (xterm) */
export const clearScrollback = CSI + '3J'

/** Scroll display up one line */
export const scrollUp = CSI + 'S'

/** Scroll display down one line */
export const scrollDown = CSI + 'T'

// =============================================================================
// Alternative Screen Buffer
// =============================================================================

/** Enter alternative screen buffer (fullscreen mode) */
export const enterAlternativeScreen = CSI + '?1049h'

/** Exit alternative screen buffer */
export const exitAlternativeScreen = CSI + '?1049l'

// Legacy aliases
/** @deprecated Use enterAlternativeScreen */
export const enterAltScreen = enterAlternativeScreen

/** @deprecated Use exitAlternativeScreen */
export const exitAltScreen = exitAlternativeScreen

// =============================================================================
// Synchronized Output (flicker-free)
// =============================================================================

/** Begin synchronized update - terminal buffers all output */
export const beginSync = CSI + '?2026h'

/** End synchronized update - terminal flushes buffered output */
export const endSync = CSI + '?2026l'

// =============================================================================
// Colors
// =============================================================================

/** Reset all attributes and colors */
export const reset = CSI + '0m'

/** Foreground color (true color or ANSI palette) */
export function fg(color: RGBA): string {
  if (isTerminalDefault(color)) {
    return CSI + '39m' // Default foreground
  }
  if (isAnsiColor(color)) {
    const index = getAnsiIndex(color)
    // Standard colors 0-7: use 30-37
    if (index >= 0 && index <= 7) {
      return CSI + (30 + index) + 'm'
    }
    // Bright colors 8-15: use 90-97
    if (index >= 8 && index <= 15) {
      return CSI + (90 + index - 8) + 'm'
    }
    // Extended 256-color palette: use 38;5;n
    return CSI + '38;5;' + index + 'm'
  }
  return CSI + '38;2;' + color.r + ';' + color.g + ';' + color.b + 'm'
}

/** Background color (true color or ANSI palette) */
export function bg(color: RGBA): string {
  if (isTerminalDefault(color)) {
    return CSI + '49m' // Default background
  }
  if (isAnsiColor(color)) {
    const index = getAnsiIndex(color)
    // Standard colors 0-7: use 40-47
    if (index >= 0 && index <= 7) {
      return CSI + (40 + index) + 'm'
    }
    // Bright colors 8-15: use 100-107
    if (index >= 8 && index <= 15) {
      return CSI + (100 + index - 8) + 'm'
    }
    // Extended 256-color palette: use 48;5;n
    return CSI + '48;5;' + index + 'm'
  }
  return CSI + '48;2;' + color.r + ';' + color.g + ';' + color.b + 'm'
}

/** Reset foreground to default */
export const resetFg = CSI + '39m'

/** Reset background to default */
export const resetBg = CSI + '49m'

// =============================================================================
// Text Attributes
// =============================================================================

/** Apply text attributes from bitfield */
export function attrs(a: CellAttrs): string {
  if (a === Attr.NONE) return ''

  const codes: number[] = []
  if (a & Attr.BOLD) codes.push(1)
  if (a & Attr.DIM) codes.push(2)
  if (a & Attr.ITALIC) codes.push(3)
  if (a & Attr.UNDERLINE) codes.push(4)
  if (a & Attr.BLINK) codes.push(5)
  if (a & Attr.INVERSE) codes.push(7)
  if (a & Attr.HIDDEN) codes.push(8)
  if (a & Attr.STRIKETHROUGH) codes.push(9)

  return codes.length > 0 ? CSI + codes.join(';') + 'm' : ''
}

/** Bold on */
export const bold = CSI + '1m'
/** Dim on */
export const dim = CSI + '2m'
/** Italic on */
export const italic = CSI + '3m'
/** Underline on */
export const underline = CSI + '4m'
/** Blink on */
export const blink = CSI + '5m'
/** Inverse on */
export const inverse = CSI + '7m'
/** Hidden on */
export const hidden = CSI + '8m'
/** Strikethrough on */
export const strikethrough = CSI + '9m'

/** Bold off */
export const boldOff = CSI + '22m'
/** Dim off */
export const dimOff = CSI + '22m'
/** Italic off */
export const italicOff = CSI + '23m'
/** Underline off */
export const underlineOff = CSI + '24m'
/** Blink off */
export const blinkOff = CSI + '25m'
/** Inverse off */
export const inverseOff = CSI + '27m'
/** Hidden off */
export const hiddenOff = CSI + '28m'
/** Strikethrough off */
export const strikethroughOff = CSI + '29m'

// =============================================================================
// Hyperlinks
// =============================================================================

/**
 * Create a clickable hyperlink.
 * Supported terminals: iTerm2, VTE (GNOME Terminal, etc.), Windows Terminal
 * @see https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 */
export function link(text: string, url: string): string {
  const openLink = wrapOsc(OSC + '8' + SEP + SEP + url + BEL)
  const closeLink = wrapOsc(OSC + '8' + SEP + SEP + BEL)
  return openLink + text + closeLink
}

// =============================================================================
// Images (iTerm2)
// =============================================================================

export interface ImageOptions {
  /** Width: number (cells), `${n}px`, `${n}%`, or 'auto' */
  width?: string | number
  /** Height: number (cells), `${n}px`, `${n}%`, or 'auto' */
  height?: string | number
  /** Preserve aspect ratio (default: true) */
  preserveAspectRatio?: boolean
}

/**
 * Display an inline image (iTerm2 only).
 * @param data Image buffer
 * @param options Size options
 */
export function image(data: Buffer | Uint8Array, options: ImageOptions = {}): string {
  let result = OSC + '1337;File=inline=1'

  if (options.width) {
    result += ';width=' + options.width
  }

  if (options.height) {
    result += ';height=' + options.height
  }

  if (options.preserveAspectRatio === false) {
    result += ';preserveAspectRatio=0'
  }

  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  result += ';size=' + buffer.byteLength + ':' + buffer.toString('base64') + BEL

  return wrapOsc(result)
}

// =============================================================================
// Terminal Bells & Sounds
// =============================================================================

/** Output a beeping sound */
export const beep = BEL

// =============================================================================
// Mouse Tracking (SGR protocol)
// =============================================================================

/** Enable SGR mouse tracking (better protocol with proper button release) */
export const enableMouse = CSI + '?1000h' + CSI + '?1002h' + CSI + '?1003h' + CSI + '?1006h'

/** Disable SGR mouse tracking */
export const disableMouse = CSI + '?1006l' + CSI + '?1003l' + CSI + '?1002l' + CSI + '?1000l'

// =============================================================================
// Keyboard (Kitty protocol)
// =============================================================================

/** Enable Kitty keyboard protocol (enhanced key reporting) */
export const enableKittyKeyboard = CSI + '>1u'

/** Disable Kitty keyboard protocol */
export const disableKittyKeyboard = CSI + '<u'

// =============================================================================
// Bracketed Paste
// =============================================================================

/** Enable bracketed paste mode */
export const enableBracketedPaste = CSI + '?2004h'

/** Disable bracketed paste mode */
export const disableBracketedPaste = CSI + '?2004l'

// =============================================================================
// Focus Events
// =============================================================================

/** Enable focus reporting */
export const enableFocusReporting = CSI + '?1004h'

/** Disable focus reporting */
export const disableFocusReporting = CSI + '?1004l'

// =============================================================================
// Window/Title
// =============================================================================

/** Set terminal window title */
export function setTitle(title: string): string {
  return OSC + '0;' + title + BEL
}

// =============================================================================
// Terminal Queries
// =============================================================================

/** Query terminal size (response: CSI 8 ; height ; width t) */
export const querySize = CSI + '18t'

// =============================================================================
// iTerm2 Specific
// =============================================================================

export const iTerm = {
  /** Set current working directory (enables Cmd-click on relative paths) */
  setCwd: (cwd: string = process.cwd()): string => {
    return wrapOsc(OSC + '50;CurrentDir=' + cwd + BEL)
  },

  /** Create an annotation (tooltip/note on text) */
  annotation: (message: string, options: {
    length?: number
    x?: number
    y?: number
    isHidden?: boolean
  } = {}): string => {
    let result = OSC + '1337;'

    const hasX = options.x !== undefined
    const hasY = options.y !== undefined
    if ((hasX || hasY) && !(hasX && hasY && options.length !== undefined)) {
      throw new Error('`x`, `y` and `length` must be defined when `x` or `y` is defined')
    }

    const cleanMessage = message.replaceAll('|', '')
    result += options.isHidden ? 'AddHiddenAnnotation=' : 'AddAnnotation='

    if (options.length && options.length > 0) {
      result += hasX
        ? [cleanMessage, options.length, options.x, options.y].join('|')
        : [options.length, cleanMessage].join('|')
    } else {
      result += cleanMessage
    }

    return wrapOsc(result + BEL)
  },
}

// =============================================================================
// ConEmu Specific
// =============================================================================

export const ConEmu = {
  /** Set current working directory */
  setCwd: (cwd: string = process.cwd()): string => {
    return wrapOsc(OSC + '9;9;' + cwd + BEL)
  },
}

/** Set CWD for both iTerm2 and ConEmu */
export function setCwd(cwd: string = process.cwd()): string {
  return iTerm.setCwd(cwd) + ConEmu.setCwd(cwd)
}

// =============================================================================
// Legacy compatibility - moveToClear
// =============================================================================

/** Move cursor to absolute position AND clear from there to end of screen */
export function moveToClear(row: number, col: number): string {
  return CSI + row + ';' + col + 'H' + CSI + '0J'
}

/** SS3 prefix for function keys */
export const SS3 = '\u001BO'
