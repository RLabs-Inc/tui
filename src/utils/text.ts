/**
 * TUI Framework - Text Utilities
 *
 * Fast, accurate text measurement and manipulation using Bun's native APIs.
 * Handles wide characters, emoji, CJK, and grapheme clusters correctly.
 */

import { stringWidth, charWidth, stripAnsi } from '../types/color'

// Re-export for convenience
export { stringWidth, charWidth, stripAnsi }

// =============================================================================
// TEXT MEASUREMENT
// =============================================================================

/**
 * Measure the display width of text in terminal columns.
 * Handles emoji, CJK, combining marks correctly.
 * Strips ANSI codes before measuring.
 */
export function measureText(text: string): number {
  const clean = stripAnsi(text)
  return stringWidth(clean)
}

// =============================================================================
// TEXT WRAPPING
// =============================================================================

/**
 * Wrap text to fit within a given width.
 * Uses accurate column counting with proper grapheme handling.
 *
 * @param text - Text to wrap
 * @param width - Maximum width in terminal columns
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, width: number): string[] {
  if (!text || width <= 0) return []

  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('')
      continue
    }

    // Quick path: if paragraph fits, no wrapping needed
    if (measureText(paragraph) <= width) {
      lines.push(paragraph)
      continue
    }

    // Word wrap with accurate width measurement
    let currentLine = ''
    let currentWidth = 0
    const words = paragraph.split(' ')

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (!word) continue

      const wordWidth = measureText(word)

      // Handle words longer than width - break by character
      if (wordWidth > width) {
        // Flush current line if any
        if (currentLine) {
          lines.push(currentLine)
          currentLine = ''
          currentWidth = 0
        }

        // Break long word by character width
        let wordPart = ''
        let partWidth = 0

        for (const char of word) {
          const cw = charWidth(char)

          if (partWidth + cw > width) {
            if (wordPart) {
              lines.push(wordPart)
              wordPart = ''
              partWidth = 0
            }
          }

          wordPart += char
          partWidth += cw
        }

        if (wordPart) {
          currentLine = wordPart
          currentWidth = partWidth
        }
        continue
      }

      // Check if word fits on current line
      const spaceWidth = currentLine ? 1 : 0
      if (currentWidth + spaceWidth + wordWidth <= width) {
        // Add to current line
        if (currentLine) {
          currentLine += ' '
          currentWidth += 1
        }
        currentLine += word
        currentWidth += wordWidth
      } else {
        // Start new line
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
        currentWidth = wordWidth
      }
    }

    // Don't forget last line
    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

/**
 * Wrap text by character (no word boundaries).
 * Useful for CJK text or when strict width is needed.
 */
export function wrapTextHard(text: string, width: number): string[] {
  if (!text || width <= 0) return []

  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('')
      continue
    }

    let currentLine = ''
    let currentWidth = 0

    for (const char of paragraph) {
      const cw = charWidth(char)

      if (currentWidth + cw > width) {
        lines.push(currentLine)
        currentLine = char
        currentWidth = cw
      } else {
        currentLine += char
        currentWidth += cw
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

// =============================================================================
// TEXT TRUNCATION
// =============================================================================

/**
 * Truncate text to fit within a given width, adding ellipsis if needed.
 *
 * @param text - Text to truncate
 * @param maxWidth - Maximum width including ellipsis
 * @param ellipsis - Ellipsis string (default: '…')
 */
export function truncateText(
  text: string,
  maxWidth: number,
  ellipsis: string = '…'
): string {
  const clean = stripAnsi(text)
  const textWidth = stringWidth(clean)

  if (textWidth <= maxWidth) {
    return text
  }

  const ellipsisWidth = stringWidth(ellipsis)
  const targetWidth = maxWidth - ellipsisWidth

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth)
  }

  // Truncate by display width
  let truncated = ''
  let currentWidth = 0

  for (const char of clean) {
    const cw = charWidth(char)
    if (currentWidth + cw > targetWidth) {
      break
    }
    truncated += char
    currentWidth += cw
  }

  return truncated + ellipsis
}

/**
 * Truncate text from the start (keep end).
 */
export function truncateStart(
  text: string,
  maxWidth: number,
  ellipsis: string = '…'
): string {
  const clean = stripAnsi(text)
  const textWidth = stringWidth(clean)

  if (textWidth <= maxWidth) {
    return text
  }

  const ellipsisWidth = stringWidth(ellipsis)
  const targetWidth = maxWidth - ellipsisWidth

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth)
  }

  // Build from end
  const chars = [...clean]
  let truncated = ''
  let currentWidth = 0

  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i]!
    const cw = charWidth(char)
    if (currentWidth + cw > targetWidth) {
      break
    }
    truncated = char + truncated
    currentWidth += cw
  }

  return ellipsis + truncated
}

/**
 * Truncate text from the middle (keep start and end).
 */
export function truncateMiddle(
  text: string,
  maxWidth: number,
  ellipsis: string = '…'
): string {
  const clean = stripAnsi(text)
  const textWidth = stringWidth(clean)

  if (textWidth <= maxWidth) {
    return text
  }

  const ellipsisWidth = stringWidth(ellipsis)
  const targetWidth = maxWidth - ellipsisWidth

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth)
  }

  // Split roughly in half
  const startWidth = Math.ceil(targetWidth / 2)
  const endWidth = Math.floor(targetWidth / 2)

  // Get start part
  let start = ''
  let sw = 0
  for (const char of clean) {
    const cw = charWidth(char)
    if (sw + cw > startWidth) break
    start += char
    sw += cw
  }

  // Get end part
  const chars = [...clean]
  let end = ''
  let ew = 0
  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i]!
    const cw = charWidth(char)
    if (ew + cw > endWidth) break
    end = char + end
    ew += cw
  }

  return start + ellipsis + end
}

// =============================================================================
// TEXT ALIGNMENT
// =============================================================================

/**
 * Pad text to center it within a given width.
 *
 * @param text - Text to center
 * @param width - Total width
 * @param fillChar - Character to use for padding (default: space)
 */
export function centerText(text: string, width: number, fillChar: string = ' '): string {
  const textWidth = measureText(text)

  if (textWidth >= width) {
    return text
  }

  const totalPadding = width - textWidth
  const leftPadding = Math.floor(totalPadding / 2)
  const rightPadding = totalPadding - leftPadding

  return fillChar.repeat(leftPadding) + text + fillChar.repeat(rightPadding)
}

/**
 * Pad text to right-align it within a given width.
 */
export function rightAlignText(text: string, width: number, fillChar: string = ' '): string {
  const textWidth = measureText(text)

  if (textWidth >= width) {
    return text
  }

  return fillChar.repeat(width - textWidth) + text
}

/**
 * Pad text to left-align it within a given width.
 */
export function leftAlignText(text: string, width: number, fillChar: string = ' '): string {
  const textWidth = measureText(text)

  if (textWidth >= width) {
    return text
  }

  return text + fillChar.repeat(width - textWidth)
}

// =============================================================================
// TEXT UTILITIES
// =============================================================================

/**
 * Split text into grapheme clusters (visual characters).
 * Handles emoji, combining marks, etc. correctly.
 */
export function splitGraphemes(text: string): string[] {
  // Use Intl.Segmenter if available (Bun supports it)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return [...segmenter.segment(text)].map(s => s.segment)
  }

  // Fallback to spread operator (works for most cases)
  return [...text]
}

/**
 * Get the character at a specific column position.
 * Handles wide characters correctly.
 *
 * @returns The character at the column, or null if out of bounds
 */
export function charAtColumn(text: string, column: number): string | null {
  if (column < 0) return null

  let currentCol = 0
  for (const char of text) {
    const cw = charWidth(char)
    if (column >= currentCol && column < currentCol + cw) {
      return char
    }
    currentCol += cw
  }

  return null
}

/**
 * Get the column position of a character index.
 *
 * @param text - The text
 * @param index - Character index (0-based)
 * @returns Column position in terminal columns
 */
export function indexToColumn(text: string, index: number): number {
  const chars = [...text]
  let column = 0

  for (let i = 0; i < index && i < chars.length; i++) {
    column += charWidth(chars[i]!)
  }

  return column
}

/**
 * Get the character index at a column position.
 *
 * @param text - The text
 * @param column - Column position
 * @returns Character index (0-based), or -1 if out of bounds
 */
export function columnToIndex(text: string, column: number): number {
  if (column < 0) return -1

  let currentCol = 0
  let index = 0

  for (const char of text) {
    if (currentCol >= column) {
      return index
    }
    currentCol += charWidth(char)
    index++
  }

  // Column is beyond text end
  return column <= currentCol ? index : -1
}

/**
 * Pad a number with leading zeros.
 */
export function padNumber(num: number, width: number): string {
  return String(num).padStart(width, '0')
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Format duration as human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}
