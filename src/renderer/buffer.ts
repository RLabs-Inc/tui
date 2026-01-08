/**
 * TUI Framework - FrameBuffer Utilities
 *
 * Creating and manipulating 2D cell buffers.
 * The frameBuffer derived uses these to build what gets rendered.
 */

import type { Cell, RGBA, CellAttrs, FrameBuffer, BorderStyle } from '../types'
import { Attr, BorderChars } from '../types'
import { Colors, rgbaBlend, rgbaEqual, charWidth, stringWidth } from '../types/color'

// =============================================================================
// CLIP RECT - Production clipping support
// =============================================================================

/**
 * A rectangular clipping region.
 * All coordinates are in terminal cells.
 */
export interface ClipRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Check if a point is inside a clip rect.
 */
export function isInClipRect(clip: ClipRect | undefined, x: number, y: number): boolean {
  if (!clip) return true
  return x >= clip.x && x < clip.x + clip.width && y >= clip.y && y < clip.y + clip.height
}

/**
 * Compute the intersection of two clip rects.
 * Returns null if they don't overlap.
 */
export function intersectClipRects(a: ClipRect, b: ClipRect): ClipRect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)

  if (right <= x || bottom <= y) return null // No intersection

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  }
}

/**
 * Create a clip rect from component bounds.
 */
export function createClipRect(x: number, y: number, width: number, height: number): ClipRect {
  return { x, y, width, height }
}

// =============================================================================
// Buffer Creation
// =============================================================================

/**
 * Create a new FrameBuffer filled with empty cells.
 */
export function createBuffer(width: number, height: number, bg: RGBA = Colors.BLACK): FrameBuffer {
  const cells: Cell[][] = []

  for (let y = 0; y < height; y++) {
    const row: Cell[] = []
    for (let x = 0; x < width; x++) {
      row.push({
        char: 32, // space
        fg: Colors.WHITE,
        bg,
        attrs: Attr.NONE,
      })
    }
    cells.push(row)
  }

  return { width, height, cells }
}

/**
 * Clone a FrameBuffer (deep copy).
 */
export function cloneBuffer(buffer: FrameBuffer): FrameBuffer {
  const cells: Cell[][] = []

  for (let y = 0; y < buffer.height; y++) {
    const row: Cell[] = []
    const sourceRow = buffer.cells[y]
    if (!sourceRow) continue
    for (let x = 0; x < buffer.width; x++) {
      const cell = sourceRow[x]
      if (!cell) continue
      row.push({
        char: cell.char,
        fg: { ...cell.fg },
        bg: { ...cell.bg },
        attrs: cell.attrs,
      })
    }
    cells.push(row)
  }

  return { width: buffer.width, height: buffer.height, cells }
}

// =============================================================================
// Cell Access
// =============================================================================

/**
 * Get a cell at (x, y), returns undefined if out of bounds.
 */
export function getCell(buffer: FrameBuffer, x: number, y: number): Cell | undefined {
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) {
    return undefined
  }
  return buffer.cells[y]?.[x]
}

/**
 * Set a cell at (x, y). Handles alpha blending and optional clipping.
 *
 * @param buffer - The frame buffer
 * @param x - Column position
 * @param y - Row position
 * @param char - Character to write
 * @param fg - Foreground color
 * @param bg - Background color
 * @param attrs - Text attributes
 * @param clip - Optional clipping rectangle
 * @returns true if cell was written, false if clipped/out of bounds
 */
export function setCell(
  buffer: FrameBuffer,
  x: number,
  y: number,
  char: number | string,
  fg: RGBA,
  bg: RGBA,
  attrs: CellAttrs = Attr.NONE,
  clip?: ClipRect
): boolean {
  // Buffer bounds check
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) return false

  // Clip rect check
  if (!isInClipRect(clip, x, y)) return false

  const row = buffer.cells[y]
  if (!row) return false
  const cell = row[x]
  if (!cell) return false

  const codepoint = typeof char === 'string' ? (char.codePointAt(0) ?? 32) : char

  // Alpha blend background
  const blendedBg = bg.a === 255 ? bg : rgbaBlend(bg, cell.bg)

  cell.char = codepoint
  cell.fg = fg
  cell.bg = blendedBg
  cell.attrs = attrs
  return true
}

/**
 * Compare two cells for equality.
 */
export function cellEqual(a: Cell, b: Cell): boolean {
  return (
    a.char === b.char &&
    a.attrs === b.attrs &&
    rgbaEqual(a.fg, b.fg) &&
    rgbaEqual(a.bg, b.bg)
  )
}

// =============================================================================
// Drawing Primitives
// =============================================================================

/**
 * Fill a rectangle with a background color.
 * Handles alpha blending and optional clipping.
 */
export function fillRect(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  bg: RGBA,
  clip?: ClipRect
): void {
  // Compute visible bounds
  let x1 = Math.max(0, x)
  let y1 = Math.max(0, y)
  let x2 = Math.min(buffer.width, x + width)
  let y2 = Math.min(buffer.height, y + height)

  // Apply clip rect
  if (clip) {
    x1 = Math.max(x1, clip.x)
    y1 = Math.max(y1, clip.y)
    x2 = Math.min(x2, clip.x + clip.width)
    y2 = Math.min(y2, clip.y + clip.height)
  }

  for (let py = y1; py < y2; py++) {
    const row = buffer.cells[py]
    if (!row) continue
    for (let px = x1; px < x2; px++) {
      const cell = row[px]
      if (!cell) continue
      cell.bg = bg.a === 255 ? bg : rgbaBlend(bg, cell.bg)
    }
  }
}

/**
 * Per-side border configuration.
 */
export interface BorderConfig {
  styles: { top: number; right: number; bottom: number; left: number }
  colors: { top: RGBA; right: RGBA; bottom: RGBA; left: RGBA }
}

/**
 * Draw borders with independent per-side styles and colors.
 * Handles:
 * - Independent styles per side (top, right, bottom, left)
 * - Independent colors per side
 * - Proper corner character selection based on meeting sides
 * - Clipping support
 */
export function drawBorder(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  config: BorderConfig,
  bg?: RGBA,
  clip?: ClipRect
): void {
  if (width < 1 || height < 1) return

  const { styles, colors } = config
  const hasTop = styles.top > 0
  const hasRight = styles.right > 0
  const hasBottom = styles.bottom > 0
  const hasLeft = styles.left > 0

  // Quick exit if no borders
  if (!hasTop && !hasRight && !hasBottom && !hasLeft) return

  // Helper to get border characters for a style (direct numeric access)
  const getChars = (style: number) => {
    if (style <= 0) return null
    return BorderChars[style]
  }

  // Char indices: [0]=horizontal, [1]=vertical, [2]=topLeft, [3]=topRight, [4]=bottomRight, [5]=bottomLeft

  // Draw top edge (horizontal char)
  if (hasTop && width > 2) {
    const chars = getChars(styles.top)
    if (chars) {
      for (let px = x + 1; px < x + width - 1; px++) {
        drawChar(buffer, px, y, chars[0], colors.top, bg, Attr.NONE, clip)
      }
    }
  }

  // Draw bottom edge (horizontal char)
  if (hasBottom && width > 2) {
    const chars = getChars(styles.bottom)
    if (chars) {
      for (let px = x + 1; px < x + width - 1; px++) {
        drawChar(buffer, px, y + height - 1, chars[0], colors.bottom, bg, Attr.NONE, clip)
      }
    }
  }

  // Draw left edge (vertical char)
  if (hasLeft && height > 2) {
    const chars = getChars(styles.left)
    if (chars) {
      for (let py = y + 1; py < y + height - 1; py++) {
        drawChar(buffer, x, py, chars[1], colors.left, bg, Attr.NONE, clip)
      }
    }
  }

  // Draw right edge (vertical char)
  if (hasRight && height > 2) {
    const chars = getChars(styles.right)
    if (chars) {
      for (let py = y + 1; py < y + height - 1; py++) {
        drawChar(buffer, x + width - 1, py, chars[1], colors.right, bg, Attr.NONE, clip)
      }
    }
  }

  // Corners - only draw corner character when BOTH connecting sides exist
  // Otherwise draw the straight edge character for the side that exists

  // Top-left corner
  if (hasTop && hasLeft) {
    // Both sides exist - draw corner [2]
    const cornerStyle = styles.top // top takes precedence
    const cornerColor = colors.top
    const chars = getChars(cornerStyle)
    if (chars) {
      drawChar(buffer, x, y, chars[2], cornerColor, bg, Attr.NONE, clip)
    }
  } else if (hasTop) {
    // Only top - draw horizontal [0]
    const chars = getChars(styles.top)
    if (chars) {
      drawChar(buffer, x, y, chars[0], colors.top, bg, Attr.NONE, clip)
    }
  } else if (hasLeft) {
    // Only left - draw vertical [1]
    const chars = getChars(styles.left)
    if (chars) {
      drawChar(buffer, x, y, chars[1], colors.left, bg, Attr.NONE, clip)
    }
  }

  // Top-right corner
  if (hasTop && hasRight) {
    // Both sides exist - draw corner [3]
    const cornerStyle = styles.top
    const cornerColor = colors.top
    const chars = getChars(cornerStyle)
    if (chars) {
      drawChar(buffer, x + width - 1, y, chars[3], cornerColor, bg, Attr.NONE, clip)
    }
  } else if (hasTop) {
    // Only top - draw horizontal [0]
    const chars = getChars(styles.top)
    if (chars) {
      drawChar(buffer, x + width - 1, y, chars[0], colors.top, bg, Attr.NONE, clip)
    }
  } else if (hasRight) {
    // Only right - draw vertical [1]
    const chars = getChars(styles.right)
    if (chars) {
      drawChar(buffer, x + width - 1, y, chars[1], colors.right, bg, Attr.NONE, clip)
    }
  }

  // Bottom-left corner
  if (hasBottom && hasLeft) {
    // Both sides exist - draw corner [5]
    const cornerStyle = styles.bottom
    const cornerColor = colors.bottom
    const chars = getChars(cornerStyle)
    if (chars) {
      drawChar(buffer, x, y + height - 1, chars[5], cornerColor, bg, Attr.NONE, clip)
    }
  } else if (hasBottom) {
    // Only bottom - draw horizontal [0]
    const chars = getChars(styles.bottom)
    if (chars) {
      drawChar(buffer, x, y + height - 1, chars[0], colors.bottom, bg, Attr.NONE, clip)
    }
  } else if (hasLeft) {
    // Only left - draw vertical [1]
    const chars = getChars(styles.left)
    if (chars) {
      drawChar(buffer, x, y + height - 1, chars[1], colors.left, bg, Attr.NONE, clip)
    }
  }

  // Bottom-right corner
  if (hasBottom && hasRight) {
    // Both sides exist - draw corner [4]
    const cornerStyle = styles.bottom
    const cornerColor = colors.bottom
    const chars = getChars(cornerStyle)
    if (chars) {
      drawChar(buffer, x + width - 1, y + height - 1, chars[4], cornerColor, bg, Attr.NONE, clip)
    }
  } else if (hasBottom) {
    // Only bottom - draw horizontal [0]
    const chars = getChars(styles.bottom)
    if (chars) {
      drawChar(buffer, x + width - 1, y + height - 1, chars[0], colors.bottom, bg, Attr.NONE, clip)
    }
  } else if (hasRight) {
    // Only right - draw vertical [1]
    const chars = getChars(styles.right)
    if (chars) {
      drawChar(buffer, x + width - 1, y + height - 1, chars[1], colors.right, bg, Attr.NONE, clip)
    }
  }
}

/**
 * Draw a single character at (x, y).
 * Supports optional clipping.
 */
export function drawChar(
  buffer: FrameBuffer,
  x: number,
  y: number,
  char: string | number,
  fg: RGBA,
  bg?: RGBA,
  attrs: CellAttrs = Attr.NONE,
  clip?: ClipRect
): boolean {
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) return false
  if (!isInClipRect(clip, x, y)) return false

  const row = buffer.cells[y]
  if (!row) return false
  const cell = row[x]
  if (!cell) return false

  const codepoint = typeof char === 'string' ? (char.codePointAt(0) ?? 32) : char

  cell.char = codepoint
  cell.fg = fg
  cell.attrs = attrs

  if (bg) {
    cell.bg = bg.a === 255 ? bg : rgbaBlend(bg, cell.bg)
  }
  return true
}

/**
 * Draw text at (x, y).
 * Handles wide characters (emoji, CJK) correctly.
 * Supports optional clipping.
 */
export function drawText(
  buffer: FrameBuffer,
  x: number,
  y: number,
  text: string,
  fg: RGBA,
  bg?: RGBA,
  attrs: CellAttrs = Attr.NONE,
  clip?: ClipRect
): number {
  if (y < 0 || y >= buffer.height) return 0
  if (clip && (y < clip.y || y >= clip.y + clip.height)) return 0

  const row = buffer.cells[y]
  if (!row) return 0

  let col = x
  for (const char of text) {
    if (col >= buffer.width) break
    if (clip && col >= clip.x + clip.width) break

    if (col < 0 || (clip && col < clip.x)) {
      const w = charWidth(char)
      col += w
      continue
    }

    const width = charWidth(char)
    const codepoint = char.codePointAt(0) ?? 32

    // Draw the character
    const cell = row[col]
    if (cell) {
      cell.char = codepoint
      cell.fg = fg
      cell.attrs = attrs
      if (bg) {
        cell.bg = bg.a === 255 ? bg : rgbaBlend(bg, cell.bg)
      }
    }

    // For wide characters, mark continuation cells
    if (width === 2 && col + 1 < buffer.width) {
      if (!clip || col + 1 < clip.x + clip.width) {
        const next = row[col + 1]
        if (next) {
          next.char = 0 // continuation marker
          next.fg = fg
          next.attrs = attrs
          if (bg) {
            next.bg = bg.a === 255 ? bg : rgbaBlend(bg, next.bg)
          }
        }
      }
    }

    col += width
  }

  return col - x // Return actual width drawn
}

/**
 * Draw text centered horizontally within a width.
 */
export function drawTextCentered(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  text: string,
  fg: RGBA,
  bg?: RGBA,
  attrs: CellAttrs = Attr.NONE,
  clip?: ClipRect
): void {
  const textWidth = stringWidth(text)
  const startX = x + Math.floor((width - textWidth) / 2)
  drawText(buffer, startX, y, text, fg, bg, attrs, clip)
}

/**
 * Draw text right-aligned within a width.
 */
export function drawTextRight(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  text: string,
  fg: RGBA,
  bg?: RGBA,
  attrs: CellAttrs = Attr.NONE,
  clip?: ClipRect
): void {
  const textWidth = stringWidth(text)
  const startX = x + width - textWidth
  drawText(buffer, startX, y, text, fg, bg, attrs, clip)
}

// =============================================================================
// Clipping
// =============================================================================

/**
 * Apply clipping - clear cells outside the clip region to their backgrounds.
 * Used for overflow: hidden
 */
export function applyClipping(
  buffer: FrameBuffer,
  clipX: number,
  clipY: number,
  clipWidth: number,
  clipHeight: number
): void {
  // Everything outside the clip region keeps only its background
  for (let y = 0; y < buffer.height; y++) {
    const row = buffer.cells[y]
    if (!row) continue
    for (let x = 0; x < buffer.width; x++) {
      const inClip =
        x >= clipX &&
        x < clipX + clipWidth &&
        y >= clipY &&
        y < clipY + clipHeight

      if (!inClip) {
        const cell = row[x]
        if (cell) {
          cell.char = 32 // space
          cell.attrs = Attr.NONE
        }
      }
    }
  }
}

// =============================================================================
// Progress Bar
// =============================================================================

/**
 * Draw a progress bar.
 */
export function drawProgressBar(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  progress: number, // 0-1
  filledChar: string,
  emptyChar: string,
  filledFg: RGBA,
  emptyFg: RGBA,
  bg?: RGBA
): void {
  const filled = Math.round(progress * width)

  for (let i = 0; i < width; i++) {
    const isFilled = i < filled
    drawChar(
      buffer,
      x + i,
      y,
      isFilled ? filledChar : emptyChar,
      isFilled ? filledFg : emptyFg,
      bg
    )
  }
}

// =============================================================================
// Scrollbar
// =============================================================================

/**
 * Draw a vertical scrollbar.
 */
export function drawScrollbarV(
  buffer: FrameBuffer,
  x: number,
  y: number,
  height: number,
  scrollPosition: number, // 0-1
  viewportRatio: number, // visible / total
  trackFg: RGBA,
  thumbFg: RGBA,
  bg?: RGBA
): void {
  const thumbHeight = Math.max(1, Math.round(height * viewportRatio))
  const thumbStart = Math.round((height - thumbHeight) * scrollPosition)

  for (let i = 0; i < height; i++) {
    const isThumb = i >= thumbStart && i < thumbStart + thumbHeight
    drawChar(buffer, x, y + i, '│', isThumb ? thumbFg : trackFg, bg)
  }
}

/**
 * Draw a horizontal scrollbar.
 */
export function drawScrollbarH(
  buffer: FrameBuffer,
  x: number,
  y: number,
  width: number,
  scrollPosition: number, // 0-1
  viewportRatio: number, // visible / total
  trackFg: RGBA,
  thumbFg: RGBA,
  bg?: RGBA
): void {
  const thumbWidth = Math.max(1, Math.round(width * viewportRatio))
  const thumbStart = Math.round((width - thumbWidth) * scrollPosition)

  for (let i = 0; i < width; i++) {
    const isThumb = i >= thumbStart && i < thumbStart + thumbWidth
    drawChar(buffer, x + i, y, '─', isThumb ? thumbFg : trackFg, bg)
  }
}
