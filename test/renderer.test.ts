/**
 * TUI Framework - Renderer Module Tests
 *
 * Comprehensive tests for:
 * - ANSI escape sequences (cursor, erase, colors, attributes)
 * - FrameBuffer utilities (creation, manipulation, drawing)
 */

import { describe, test, expect } from 'bun:test'

// ANSI module imports
import {
  ESC,
  CSI,
  OSC,
  BEL,
  SEP,
  // Cursor movement
  cursorTo,
  cursorMove,
  cursorUp,
  cursorDown,
  cursorForward,
  cursorBackward,
  cursorLeft,
  cursorNextLine,
  cursorPrevLine,
  cursorHide,
  cursorShow,
  cursorSavePosition,
  cursorRestorePosition,
  cursorGetPosition,
  setCursorShape,
  // Erase functions
  eraseEndLine,
  eraseStartLine,
  eraseLine,
  eraseDown,
  eraseUp,
  eraseScreen,
  eraseLines,
  // Screen control
  clearViewport,
  clearScreen,
  clearTerminal,
  scrollUp,
  scrollDown,
  // Alternative screen
  enterAlternativeScreen,
  exitAlternativeScreen,
  // Synchronized output
  beginSync,
  endSync,
  // Colors
  fg,
  bg,
  reset,
  resetFg,
  resetBg,
  // Attributes
  attrs,
  bold,
  dim,
  italic,
  underline,
  blink,
  inverse,
  hidden,
  strikethrough,
  boldOff,
  dimOff,
  italicOff,
  underlineOff,
  blinkOff,
  inverseOff,
  hiddenOff,
  strikethroughOff,
  // Mouse
  enableMouse,
  disableMouse,
  // Keyboard
  enableKittyKeyboard,
  disableKittyKeyboard,
  // Bracketed paste
  enableBracketedPaste,
  disableBracketedPaste,
  // Focus events
  enableFocusReporting,
  disableFocusReporting,
  // Window
  setTitle,
  // Hyperlinks
  link,
} from '../src/renderer/ansi'

// Buffer module imports
import {
  // Clip rect
  ClipRect,
  isInClipRect,
  intersectClipRects,
  createClipRect,
  // Buffer creation
  createBuffer,
  cloneBuffer,
  // Cell access
  getCell,
  setCell,
  cellEqual,
  // Drawing primitives
  fillRect,
  drawChar,
  drawText,
  drawTextCentered,
  drawTextRight,
  drawProgressBar,
  drawScrollbarV,
  drawScrollbarH,
  applyClipping,
} from '../src/renderer/buffer'

// Types
import { Attr } from '../src/types'
import { Colors, ansiColor, rgba } from '../src/types/color'
import type { RGBA, Cell, FrameBuffer } from '../src/types'

// =============================================================================
// ANSI MODULE TESTS
// =============================================================================

describe('ANSI - Constants', () => {
  test('ESC constant is correct escape character', () => {
    expect(ESC).toBe('\u001B')
  })

  test('CSI constant is correct CSI sequence', () => {
    expect(CSI).toBe('\u001B[')
  })

  test('OSC constant is correct OSC sequence', () => {
    expect(OSC).toBe('\u001B]')
  })

  test('BEL constant is correct bell character', () => {
    expect(BEL).toBe('\u0007')
  })

  test('SEP constant is semicolon', () => {
    expect(SEP).toBe(';')
  })
})

// =============================================================================
// Cursor Movement Tests
// =============================================================================

describe('ANSI - Cursor Movement', () => {
  test('cursorTo(x) moves to column (0-indexed input)', () => {
    expect(cursorTo(0)).toBe('\u001B[1G')
    expect(cursorTo(5)).toBe('\u001B[6G')
    expect(cursorTo(79)).toBe('\u001B[80G')
  })

  test('cursorTo(x, y) moves to absolute position (0-indexed input)', () => {
    expect(cursorTo(0, 0)).toBe('\u001B[1;1H')
    expect(cursorTo(10, 5)).toBe('\u001B[6;11H')
    expect(cursorTo(79, 23)).toBe('\u001B[24;80H')
  })

  test('cursorMove handles relative movement', () => {
    // Move right
    expect(cursorMove(5)).toBe('\u001B[5C')
    // Move left
    expect(cursorMove(-3)).toBe('\u001B[3D')
    // Move right and down
    expect(cursorMove(2, 1)).toBe('\u001B[2C\u001B[1B')
    // Move left and up
    expect(cursorMove(-2, -1)).toBe('\u001B[2D\u001B[1A')
    // No movement
    expect(cursorMove(0)).toBe('')
    expect(cursorMove(0, 0)).toBe('')
  })

  test('cursorUp moves cursor up n rows', () => {
    expect(cursorUp()).toBe('\u001B[1A')
    expect(cursorUp(1)).toBe('\u001B[1A')
    expect(cursorUp(5)).toBe('\u001B[5A')
  })

  test('cursorDown moves cursor down n rows', () => {
    expect(cursorDown()).toBe('\u001B[1B')
    expect(cursorDown(1)).toBe('\u001B[1B')
    expect(cursorDown(10)).toBe('\u001B[10B')
  })

  test('cursorForward moves cursor right n columns', () => {
    expect(cursorForward()).toBe('\u001B[1C')
    expect(cursorForward(1)).toBe('\u001B[1C')
    expect(cursorForward(20)).toBe('\u001B[20C')
  })

  test('cursorBackward moves cursor left n columns', () => {
    expect(cursorBackward()).toBe('\u001B[1D')
    expect(cursorBackward(1)).toBe('\u001B[1D')
    expect(cursorBackward(15)).toBe('\u001B[15D')
  })

  test('cursorLeft moves to first column', () => {
    expect(cursorLeft).toBe('\u001B[G')
  })

  test('cursorNextLine and cursorPrevLine work correctly', () => {
    expect(cursorNextLine).toBe('\u001B[E')
    expect(cursorPrevLine).toBe('\u001B[F')
  })
})

// =============================================================================
// Cursor Visibility Tests
// =============================================================================

describe('ANSI - Cursor Visibility', () => {
  test('cursorHide hides cursor', () => {
    expect(cursorHide).toBe('\u001B[?25l')
  })

  test('cursorShow shows cursor', () => {
    expect(cursorShow).toBe('\u001B[?25h')
  })

  test('cursorSavePosition saves cursor position', () => {
    // Note: Result depends on terminal detection
    expect(cursorSavePosition).toMatch(/\u001B[7s]?/)
  })

  test('cursorRestorePosition restores cursor position', () => {
    // Note: Result depends on terminal detection
    expect(cursorRestorePosition).toMatch(/\u001B[8u]?/)
  })

  test('cursorGetPosition queries cursor position', () => {
    expect(cursorGetPosition).toBe('\u001B[6n')
  })

  test('setCursorShape sets cursor shape', () => {
    // Block blinking
    expect(setCursorShape('block', true)).toBe('\u001B[1 q')
    // Block steady
    expect(setCursorShape('block', false)).toBe('\u001B[2 q')
    // Underline blinking
    expect(setCursorShape('underline', true)).toBe('\u001B[3 q')
    // Underline steady
    expect(setCursorShape('underline', false)).toBe('\u001B[4 q')
    // Bar blinking
    expect(setCursorShape('bar', true)).toBe('\u001B[5 q')
    // Bar steady
    expect(setCursorShape('bar', false)).toBe('\u001B[6 q')
  })
})

// =============================================================================
// Erase Sequences Tests
// =============================================================================

describe('ANSI - Erase Sequences', () => {
  test('eraseEndLine clears to end of line', () => {
    expect(eraseEndLine).toBe('\u001B[K')
  })

  test('eraseStartLine clears to start of line', () => {
    expect(eraseStartLine).toBe('\u001B[1K')
  })

  test('eraseLine clears entire line', () => {
    expect(eraseLine).toBe('\u001B[2K')
  })

  test('eraseDown clears screen from cursor down', () => {
    expect(eraseDown).toBe('\u001B[J')
  })

  test('eraseUp clears screen from cursor up', () => {
    expect(eraseUp).toBe('\u001B[1J')
  })

  test('eraseScreen clears entire screen', () => {
    expect(eraseScreen).toBe('\u001B[2J')
  })

  test('eraseLines clears multiple lines and moves cursor', () => {
    // 0 lines: empty string
    expect(eraseLines(0)).toBe('')
    // 1 line: erase line + cursor left
    expect(eraseLines(1)).toBe('\u001B[2K\u001B[G')
    // 2 lines: erase line, cursor up, erase line, cursor left
    expect(eraseLines(2)).toBe('\u001B[2K\u001B[1A\u001B[2K\u001B[G')
    // 3 lines
    expect(eraseLines(3)).toBe('\u001B[2K\u001B[1A\u001B[2K\u001B[1A\u001B[2K\u001B[G')
  })
})

// =============================================================================
// Screen Control Tests
// =============================================================================

describe('ANSI - Screen Control', () => {
  test('clearViewport clears screen and homes cursor', () => {
    expect(clearViewport).toBe('\u001B[2J\u001B[H')
  })

  test('clearScreen uses RIS sequence', () => {
    expect(clearScreen).toBe('\u001Bc')
  })

  test('scrollUp scrolls display up', () => {
    expect(scrollUp).toBe('\u001B[S')
  })

  test('scrollDown scrolls display down', () => {
    expect(scrollDown).toBe('\u001B[T')
  })
})

// =============================================================================
// Alternative Screen Tests
// =============================================================================

describe('ANSI - Alternative Screen Buffer', () => {
  test('enterAlternativeScreen enters alternate buffer', () => {
    expect(enterAlternativeScreen).toBe('\u001B[?1049h')
  })

  test('exitAlternativeScreen exits alternate buffer', () => {
    expect(exitAlternativeScreen).toBe('\u001B[?1049l')
  })
})

// =============================================================================
// Synchronized Output Tests
// =============================================================================

describe('ANSI - Synchronized Output', () => {
  test('beginSync starts synchronized update', () => {
    expect(beginSync).toBe('\u001B[?2026h')
  })

  test('endSync ends synchronized update', () => {
    expect(endSync).toBe('\u001B[?2026l')
  })
})

// =============================================================================
// Color Encoding Tests
// =============================================================================

describe('ANSI - Color Encoding', () => {
  test('fg generates true color foreground sequence', () => {
    expect(fg({ r: 255, g: 0, b: 0, a: 255 })).toBe('\u001B[38;2;255;0;0m')
    expect(fg({ r: 0, g: 255, b: 0, a: 255 })).toBe('\u001B[38;2;0;255;0m')
    expect(fg({ r: 0, g: 0, b: 255, a: 255 })).toBe('\u001B[38;2;0;0;255m')
    expect(fg({ r: 128, g: 128, b: 128, a: 255 })).toBe('\u001B[38;2;128;128;128m')
  })

  test('bg generates true color background sequence', () => {
    expect(bg({ r: 255, g: 0, b: 0, a: 255 })).toBe('\u001B[48;2;255;0;0m')
    expect(bg({ r: 0, g: 255, b: 0, a: 255 })).toBe('\u001B[48;2;0;255;0m')
    expect(bg({ r: 0, g: 0, b: 255, a: 255 })).toBe('\u001B[48;2;0;0;255m')
  })

  test('fg handles terminal default color', () => {
    // Terminal default color has r: -1
    const terminalDefault = { r: -1, g: -1, b: -1, a: 255 }
    expect(fg(terminalDefault)).toBe('\u001B[39m')
  })

  test('bg handles terminal default color', () => {
    const terminalDefault = { r: -1, g: -1, b: -1, a: 255 }
    expect(bg(terminalDefault)).toBe('\u001B[49m')
  })

  test('fg handles ANSI standard colors (0-7)', () => {
    expect(fg(ansiColor(0))).toBe('\u001B[30m') // black
    expect(fg(ansiColor(1))).toBe('\u001B[31m') // red
    expect(fg(ansiColor(7))).toBe('\u001B[37m') // white
  })

  test('fg handles ANSI bright colors (8-15)', () => {
    expect(fg(ansiColor(8))).toBe('\u001B[90m')  // bright black
    expect(fg(ansiColor(9))).toBe('\u001B[91m')  // bright red
    expect(fg(ansiColor(15))).toBe('\u001B[97m') // bright white
  })

  test('fg handles extended 256-color palette', () => {
    expect(fg(ansiColor(16))).toBe('\u001B[38;5;16m')
    expect(fg(ansiColor(100))).toBe('\u001B[38;5;100m')
    expect(fg(ansiColor(255))).toBe('\u001B[38;5;255m')
  })

  test('bg handles ANSI standard colors (0-7)', () => {
    expect(bg(ansiColor(0))).toBe('\u001B[40m') // black
    expect(bg(ansiColor(1))).toBe('\u001B[41m') // red
    expect(bg(ansiColor(7))).toBe('\u001B[47m') // white
  })

  test('bg handles ANSI bright colors (8-15)', () => {
    expect(bg(ansiColor(8))).toBe('\u001B[100m')  // bright black
    expect(bg(ansiColor(9))).toBe('\u001B[101m')  // bright red
    expect(bg(ansiColor(15))).toBe('\u001B[107m') // bright white
  })

  test('bg handles extended 256-color palette', () => {
    expect(bg(ansiColor(16))).toBe('\u001B[48;5;16m')
    expect(bg(ansiColor(100))).toBe('\u001B[48;5;100m')
    expect(bg(ansiColor(255))).toBe('\u001B[48;5;255m')
  })

  test('reset resets all attributes', () => {
    expect(reset).toBe('\u001B[0m')
  })

  test('resetFg resets foreground color', () => {
    expect(resetFg).toBe('\u001B[39m')
  })

  test('resetBg resets background color', () => {
    expect(resetBg).toBe('\u001B[49m')
  })
})

// =============================================================================
// Text Attributes Tests
// =============================================================================

describe('ANSI - Text Attributes', () => {
  test('attrs with NONE returns empty string', () => {
    expect(attrs(Attr.NONE)).toBe('')
  })

  test('attrs generates single attribute codes', () => {
    expect(attrs(Attr.BOLD)).toBe('\u001B[1m')
    expect(attrs(Attr.DIM)).toBe('\u001B[2m')
    expect(attrs(Attr.ITALIC)).toBe('\u001B[3m')
    expect(attrs(Attr.UNDERLINE)).toBe('\u001B[4m')
    expect(attrs(Attr.BLINK)).toBe('\u001B[5m')
    expect(attrs(Attr.INVERSE)).toBe('\u001B[7m')
    expect(attrs(Attr.HIDDEN)).toBe('\u001B[8m')
    expect(attrs(Attr.STRIKETHROUGH)).toBe('\u001B[9m')
  })

  test('attrs generates combined attribute codes', () => {
    expect(attrs(Attr.BOLD | Attr.ITALIC)).toBe('\u001B[1;3m')
    expect(attrs(Attr.BOLD | Attr.UNDERLINE)).toBe('\u001B[1;4m')
    expect(attrs(Attr.DIM | Attr.ITALIC | Attr.STRIKETHROUGH)).toBe('\u001B[2;3;9m')
  })

  test('individual attribute on constants', () => {
    expect(bold).toBe('\u001B[1m')
    expect(dim).toBe('\u001B[2m')
    expect(italic).toBe('\u001B[3m')
    expect(underline).toBe('\u001B[4m')
    expect(blink).toBe('\u001B[5m')
    expect(inverse).toBe('\u001B[7m')
    expect(hidden).toBe('\u001B[8m')
    expect(strikethrough).toBe('\u001B[9m')
  })

  test('individual attribute off constants', () => {
    expect(boldOff).toBe('\u001B[22m')
    expect(dimOff).toBe('\u001B[22m')
    expect(italicOff).toBe('\u001B[23m')
    expect(underlineOff).toBe('\u001B[24m')
    expect(blinkOff).toBe('\u001B[25m')
    expect(inverseOff).toBe('\u001B[27m')
    expect(hiddenOff).toBe('\u001B[28m')
    expect(strikethroughOff).toBe('\u001B[29m')
  })
})

// =============================================================================
// Mouse & Keyboard Tests
// =============================================================================

describe('ANSI - Mouse Tracking', () => {
  test('enableMouse enables SGR mouse tracking', () => {
    expect(enableMouse).toContain('\u001B[?1000h')
    expect(enableMouse).toContain('\u001B[?1006h')
  })

  test('disableMouse disables SGR mouse tracking', () => {
    expect(disableMouse).toContain('\u001B[?1000l')
    expect(disableMouse).toContain('\u001B[?1006l')
  })
})

describe('ANSI - Keyboard', () => {
  test('enableKittyKeyboard enables enhanced key reporting', () => {
    expect(enableKittyKeyboard).toBe('\u001B[>1u')
  })

  test('disableKittyKeyboard disables enhanced key reporting', () => {
    expect(disableKittyKeyboard).toBe('\u001B[<u')
  })
})

describe('ANSI - Bracketed Paste', () => {
  test('enableBracketedPaste enables paste mode', () => {
    expect(enableBracketedPaste).toBe('\u001B[?2004h')
  })

  test('disableBracketedPaste disables paste mode', () => {
    expect(disableBracketedPaste).toBe('\u001B[?2004l')
  })
})

describe('ANSI - Focus Reporting', () => {
  test('enableFocusReporting enables focus events', () => {
    expect(enableFocusReporting).toBe('\u001B[?1004h')
  })

  test('disableFocusReporting disables focus events', () => {
    expect(disableFocusReporting).toBe('\u001B[?1004l')
  })
})

// =============================================================================
// Window & Title Tests
// =============================================================================

describe('ANSI - Window Title', () => {
  test('setTitle sets terminal window title', () => {
    expect(setTitle('My App')).toBe('\u001B]0;My App\u0007')
    expect(setTitle('TUI Framework')).toBe('\u001B]0;TUI Framework\u0007')
  })
})

// =============================================================================
// Hyperlink Tests
// =============================================================================

describe('ANSI - Hyperlinks', () => {
  test('link creates clickable hyperlink', () => {
    const result = link('Click me', 'https://example.com')
    expect(result).toContain('https://example.com')
    expect(result).toContain('Click me')
    expect(result).toContain('\u001B]8;;')
  })
})

// =============================================================================
// BUFFER MODULE TESTS
// =============================================================================

// =============================================================================
// Clip Rect Tests
// =============================================================================

describe('Buffer - ClipRect', () => {
  test('createClipRect creates clip rect with correct properties', () => {
    const clip = createClipRect(10, 20, 30, 40)
    expect(clip.x).toBe(10)
    expect(clip.y).toBe(20)
    expect(clip.width).toBe(30)
    expect(clip.height).toBe(40)
  })

  test('isInClipRect returns true for points inside', () => {
    const clip = createClipRect(10, 10, 20, 20)
    expect(isInClipRect(clip, 10, 10)).toBe(true) // top-left corner
    expect(isInClipRect(clip, 15, 15)).toBe(true) // center
    expect(isInClipRect(clip, 29, 29)).toBe(true) // just inside
  })

  test('isInClipRect returns false for points outside', () => {
    const clip = createClipRect(10, 10, 20, 20)
    expect(isInClipRect(clip, 9, 10)).toBe(false)  // left of clip
    expect(isInClipRect(clip, 10, 9)).toBe(false)  // above clip
    expect(isInClipRect(clip, 30, 10)).toBe(false) // right of clip
    expect(isInClipRect(clip, 10, 30)).toBe(false) // below clip
  })

  test('isInClipRect returns true when no clip provided', () => {
    expect(isInClipRect(undefined, 0, 0)).toBe(true)
    expect(isInClipRect(undefined, 100, 100)).toBe(true)
  })

  test('intersectClipRects returns intersection of overlapping rects', () => {
    const a = createClipRect(0, 0, 20, 20)
    const b = createClipRect(10, 10, 20, 20)
    const result = intersectClipRects(a, b)

    expect(result).not.toBeNull()
    expect(result!.x).toBe(10)
    expect(result!.y).toBe(10)
    expect(result!.width).toBe(10)
    expect(result!.height).toBe(10)
  })

  test('intersectClipRects returns null for non-overlapping rects', () => {
    const a = createClipRect(0, 0, 10, 10)
    const b = createClipRect(20, 20, 10, 10)
    expect(intersectClipRects(a, b)).toBeNull()
  })

  test('intersectClipRects returns null for adjacent rects (edge touching)', () => {
    const a = createClipRect(0, 0, 10, 10)
    const b = createClipRect(10, 0, 10, 10)
    expect(intersectClipRects(a, b)).toBeNull()
  })
})

// =============================================================================
// Buffer Creation Tests
// =============================================================================

describe('Buffer - Creation', () => {
  test('createBuffer creates buffer with correct dimensions', () => {
    const buffer = createBuffer(80, 24)
    expect(buffer.width).toBe(80)
    expect(buffer.height).toBe(24)
    expect(buffer.cells.length).toBe(24)
    expect(buffer.cells[0]!.length).toBe(80)
  })

  test('createBuffer fills cells with default background', () => {
    const buffer = createBuffer(10, 10)
    const cell = buffer.cells[0]![0]!
    expect(cell.char).toBe(32) // space
    expect(cell.fg).toEqual(Colors.WHITE)
    expect(cell.bg).toEqual(Colors.BLACK)
    expect(cell.attrs).toBe(Attr.NONE)
  })

  test('createBuffer accepts custom background color', () => {
    const customBg = rgba(100, 50, 200, 255)
    const buffer = createBuffer(10, 10, customBg)
    const cell = buffer.cells[5]![5]!
    expect(cell.bg).toEqual(customBg)
  })

  test('cloneBuffer creates deep copy', () => {
    const buffer = createBuffer(10, 10)
    buffer.cells[0]![0]!.char = 65 // 'A'
    buffer.cells[0]![0]!.fg = Colors.RED

    const clone = cloneBuffer(buffer)

    // Clone has same values
    expect(clone.cells[0]![0]!.char).toBe(65)
    expect(clone.cells[0]![0]!.fg).toEqual(Colors.RED)

    // Modifying clone doesn't affect original
    clone.cells[0]![0]!.char = 66 // 'B'
    expect(buffer.cells[0]![0]!.char).toBe(65)
  })
})

// =============================================================================
// Cell Access Tests
// =============================================================================

describe('Buffer - Cell Access', () => {
  test('getCell returns cell at valid position', () => {
    const buffer = createBuffer(10, 10)
    buffer.cells[5]![5]!.char = 88 // 'X'

    const cell = getCell(buffer, 5, 5)
    expect(cell).not.toBeUndefined()
    expect(cell!.char).toBe(88)
  })

  test('getCell returns undefined for out of bounds', () => {
    const buffer = createBuffer(10, 10)

    expect(getCell(buffer, -1, 0)).toBeUndefined()
    expect(getCell(buffer, 0, -1)).toBeUndefined()
    expect(getCell(buffer, 10, 0)).toBeUndefined()
    expect(getCell(buffer, 0, 10)).toBeUndefined()
  })

  test('setCell writes to valid position', () => {
    const buffer = createBuffer(10, 10)

    const result = setCell(buffer, 5, 5, 'A', Colors.RED, Colors.BLUE, Attr.BOLD)
    expect(result).toBe(true)

    const cell = buffer.cells[5]![5]!
    expect(cell.char).toBe(65) // 'A'
    expect(cell.fg).toEqual(Colors.RED)
    expect(cell.bg).toEqual(Colors.BLUE)
    expect(cell.attrs).toBe(Attr.BOLD)
  })

  test('setCell returns false for out of bounds', () => {
    const buffer = createBuffer(10, 10)

    expect(setCell(buffer, -1, 0, 'A', Colors.WHITE, Colors.BLACK)).toBe(false)
    expect(setCell(buffer, 10, 0, 'A', Colors.WHITE, Colors.BLACK)).toBe(false)
  })

  test('setCell respects clip rect', () => {
    const buffer = createBuffer(10, 10)
    const clip = createClipRect(5, 5, 3, 3)

    // Inside clip - should work
    expect(setCell(buffer, 5, 5, 'A', Colors.WHITE, Colors.BLACK, Attr.NONE, clip)).toBe(true)

    // Outside clip - should fail
    expect(setCell(buffer, 0, 0, 'B', Colors.WHITE, Colors.BLACK, Attr.NONE, clip)).toBe(false)
  })

  test('setCell handles numeric codepoint', () => {
    const buffer = createBuffer(10, 10)
    setCell(buffer, 0, 0, 65, Colors.WHITE, Colors.BLACK) // 65 = 'A'

    expect(buffer.cells[0]![0]!.char).toBe(65)
  })

  test('cellEqual compares cells correctly', () => {
    const a: Cell = { char: 65, fg: Colors.WHITE, bg: Colors.BLACK, attrs: Attr.NONE }
    const b: Cell = { char: 65, fg: Colors.WHITE, bg: Colors.BLACK, attrs: Attr.NONE }
    const c: Cell = { char: 66, fg: Colors.WHITE, bg: Colors.BLACK, attrs: Attr.NONE }
    const d: Cell = { char: 65, fg: Colors.RED, bg: Colors.BLACK, attrs: Attr.NONE }

    expect(cellEqual(a, b)).toBe(true)
    expect(cellEqual(a, c)).toBe(false)
    expect(cellEqual(a, d)).toBe(false)
  })
})

// =============================================================================
// Drawing Primitives Tests
// =============================================================================

describe('Buffer - Drawing Primitives', () => {
  test('fillRect fills area with background color', () => {
    const buffer = createBuffer(10, 10)
    fillRect(buffer, 2, 2, 4, 4, Colors.RED)

    // Inside rectangle
    expect(buffer.cells[2]![2]!.bg).toEqual(Colors.RED)
    expect(buffer.cells[5]![5]!.bg).toEqual(Colors.RED)

    // Outside rectangle
    expect(buffer.cells[0]![0]!.bg).toEqual(Colors.BLACK)
    expect(buffer.cells[6]![6]!.bg).toEqual(Colors.BLACK)
  })

  test('fillRect respects clip rect', () => {
    const buffer = createBuffer(10, 10)
    const clip = createClipRect(3, 3, 2, 2)

    fillRect(buffer, 0, 0, 10, 10, Colors.RED, clip)

    // Inside clip
    expect(buffer.cells[3]![3]!.bg).toEqual(Colors.RED)
    expect(buffer.cells[4]![4]!.bg).toEqual(Colors.RED)

    // Outside clip
    expect(buffer.cells[0]![0]!.bg).toEqual(Colors.BLACK)
    expect(buffer.cells[5]![5]!.bg).toEqual(Colors.BLACK)
  })

  test('drawChar writes single character', () => {
    const buffer = createBuffer(10, 10)

    drawChar(buffer, 5, 5, 'X', Colors.RED, Colors.BLUE, Attr.BOLD)

    const cell = buffer.cells[5]![5]!
    expect(cell.char).toBe(88) // 'X'
    expect(cell.fg).toEqual(Colors.RED)
    expect(cell.attrs).toBe(Attr.BOLD)
  })

  test('drawChar respects clip rect', () => {
    const buffer = createBuffer(10, 10)
    const clip = createClipRect(5, 5, 2, 2)

    expect(drawChar(buffer, 5, 5, 'X', Colors.WHITE, undefined, Attr.NONE, clip)).toBe(true)
    expect(drawChar(buffer, 0, 0, 'Y', Colors.WHITE, undefined, Attr.NONE, clip)).toBe(false)
  })

  test('drawText writes string to buffer', () => {
    const buffer = createBuffer(20, 5)

    const width = drawText(buffer, 0, 0, 'Hello', Colors.WHITE)

    expect(width).toBe(5)
    expect(buffer.cells[0]![0]!.char).toBe(72)  // 'H'
    expect(buffer.cells[0]![1]!.char).toBe(101) // 'e'
    expect(buffer.cells[0]![4]!.char).toBe(111) // 'o'
  })

  test('drawText clips at buffer boundary', () => {
    const buffer = createBuffer(5, 1)

    const width = drawText(buffer, 0, 0, 'Hello World', Colors.WHITE)

    // Only 5 chars fit
    expect(width).toBe(5)
    expect(buffer.cells[0]![4]!.char).toBe(111) // 'o'
  })

  test('drawText respects clip rect', () => {
    const buffer = createBuffer(20, 5)
    const clip = createClipRect(2, 0, 3, 1)

    drawText(buffer, 0, 0, 'Hello', Colors.WHITE, undefined, Attr.NONE, clip)

    // Clipped: only chars at positions 2, 3, 4 should be visible
    expect(buffer.cells[0]![0]!.char).toBe(32)  // space (not drawn)
    expect(buffer.cells[0]![2]!.char).toBe(108) // 'l'
    expect(buffer.cells[0]![3]!.char).toBe(108) // 'l'
    expect(buffer.cells[0]![4]!.char).toBe(111) // 'o'
  })

  test('drawTextCentered centers text horizontally', () => {
    const buffer = createBuffer(20, 1)

    drawTextCentered(buffer, 0, 0, 10, 'Hi', Colors.WHITE)

    // 'Hi' is 2 chars, centered in 10 -> starts at position 4
    expect(buffer.cells[0]![4]!.char).toBe(72)  // 'H'
    expect(buffer.cells[0]![5]!.char).toBe(105) // 'i'
  })

  test('drawTextRight right-aligns text', () => {
    const buffer = createBuffer(20, 1)

    drawTextRight(buffer, 0, 0, 10, 'Hi', Colors.WHITE)

    // 'Hi' is 2 chars, right-aligned in 10 -> starts at position 8
    expect(buffer.cells[0]![8]!.char).toBe(72)  // 'H'
    expect(buffer.cells[0]![9]!.char).toBe(105) // 'i'
  })
})

// =============================================================================
// Progress Bar & Scrollbar Tests
// =============================================================================

describe('Buffer - Progress Bar', () => {
  test('drawProgressBar renders progress indicator', () => {
    const buffer = createBuffer(20, 1)

    drawProgressBar(buffer, 0, 0, 10, 0.5, '#', '-', Colors.GREEN, Colors.GRAY)

    // 50% progress = 5 filled chars
    expect(buffer.cells[0]![0]!.char).toBe(35)  // '#'
    expect(buffer.cells[0]![4]!.char).toBe(35)  // '#'
    expect(buffer.cells[0]![5]!.char).toBe(45)  // '-'
    expect(buffer.cells[0]![9]!.char).toBe(45)  // '-'
  })

  test('drawProgressBar handles 0% and 100%', () => {
    const buffer = createBuffer(20, 1)

    drawProgressBar(buffer, 0, 0, 5, 0, '#', '-', Colors.GREEN, Colors.GRAY)
    expect(buffer.cells[0]![0]!.char).toBe(45) // '-' (empty)

    drawProgressBar(buffer, 10, 0, 5, 1, '#', '-', Colors.GREEN, Colors.GRAY)
    expect(buffer.cells[0]![10]!.char).toBe(35) // '#' (filled)
    expect(buffer.cells[0]![14]!.char).toBe(35) // '#' (filled)
  })
})

describe('Buffer - Scrollbars', () => {
  test('drawScrollbarV renders vertical scrollbar', () => {
    const buffer = createBuffer(5, 10)

    drawScrollbarV(buffer, 0, 0, 10, 0.5, 0.5, Colors.GRAY, Colors.WHITE)

    // Scrollbar should be drawn
    const cellMid = buffer.cells[5]![0]!
    expect(cellMid.char).not.toBe(32) // Not a space
  })

  test('drawScrollbarH renders horizontal scrollbar', () => {
    const buffer = createBuffer(10, 5)

    drawScrollbarH(buffer, 0, 0, 10, 0.5, 0.5, Colors.GRAY, Colors.WHITE)

    // Scrollbar should be drawn
    const cellMid = buffer.cells[0]![5]!
    expect(cellMid.char).not.toBe(32) // Not a space
  })
})

// =============================================================================
// Clipping Tests
// =============================================================================

describe('Buffer - Clipping', () => {
  test('applyClipping clears cells outside clip region', () => {
    const buffer = createBuffer(10, 10)

    // Fill entire buffer with 'X'
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        buffer.cells[y]![x]!.char = 88 // 'X'
      }
    }

    // Apply clipping
    applyClipping(buffer, 2, 2, 4, 4)

    // Inside clip - unchanged
    expect(buffer.cells[3]![3]!.char).toBe(88) // 'X'

    // Outside clip - cleared to space
    expect(buffer.cells[0]![0]!.char).toBe(32) // space
    expect(buffer.cells[9]![9]!.char).toBe(32) // space
  })
})
