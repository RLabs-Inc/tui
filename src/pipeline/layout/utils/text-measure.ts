/**
 * TUI Framework - Text Measurement
 *
 * Terminal text measurement using Bun.stringWidth.
 * Handles Unicode, emoji, CJK wide characters correctly.
 */

import { stringWidth } from '../../../utils/text'

/**
 * Measure the width of a string in terminal cells.
 * Handles:
 * - Regular ASCII (1 cell each)
 * - Emoji (usually 2 cells)
 * - CJK characters (2 cells)
 * - Control characters (0 cells)
 */
export function measureTextWidth(content: string): number {
  return stringWidth(content)
}

/**
 * Measure text height when wrapped to a maximum width.
 * Returns number of lines.
 */
export function measureTextHeight(content: string, maxWidth: number): number {
  if (!content || maxWidth <= 0) return 0

  // Simple word wrap - count lines
  let lines = 1
  let currentLineWidth = 0

  // Split by existing newlines first
  const paragraphs = content.split('\n')

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i]!
    if (paragraph === '') {
      lines++
      continue
    }

    // Process each character
    for (const char of paragraph) {
      const charWidth = stringWidth(char)

      if (currentLineWidth + charWidth > maxWidth && currentLineWidth > 0) {
        lines++
        currentLineWidth = charWidth
      } else {
        currentLineWidth += charWidth
      }
    }

    // Reset for next paragraph
    currentLineWidth = 0
    if (i < paragraphs.length - 1) {
      lines++
    }
  }

  return lines
}

/**
 * Measure text dimensions for layout.
 * Returns both width (longest line) and height (number of lines).
 */
export function measureText(
  content: string,
  maxWidth: number
): { width: number; height: number } {
  if (!content) return { width: 0, height: 0 }

  const lines = wrapTextLines(content, maxWidth)
  let maxLineWidth = 0

  for (const line of lines) {
    const lineWidth = stringWidth(line)
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth
    }
  }

  return {
    width: maxLineWidth,
    height: lines.length,
  }
}

/**
 * Wrap text to a maximum width, returning array of lines.
 * Simple word-boundary wrapping with fallback to character wrap.
 */
export function wrapTextLines(content: string, maxWidth: number): string[] {
  if (!content) return []
  if (maxWidth <= 0) return [content]

  const result: string[] = []
  const paragraphs = content.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      result.push('')
      continue
    }

    let currentLine = ''
    let currentWidth = 0
    const words = paragraph.split(' ')

    for (let i = 0; i < words.length; i++) {
      const word = words[i]!
      const wordWidth = stringWidth(word)

      // Check if word fits on current line
      const needsSpace = currentLine.length > 0
      const spaceWidth = needsSpace ? 1 : 0

      if (currentWidth + spaceWidth + wordWidth <= maxWidth) {
        // Word fits
        if (needsSpace) {
          currentLine += ' '
          currentWidth += 1
        }
        currentLine += word
        currentWidth += wordWidth
      } else if (currentLine.length === 0) {
        // Word is too long for any line - character wrap
        let remaining = word
        while (remaining.length > 0) {
          let chunk = ''
          let chunkWidth = 0
          for (const char of remaining) {
            const charWidth = stringWidth(char)
            if (chunkWidth + charWidth > maxWidth && chunk.length > 0) {
              break
            }
            chunk += char
            chunkWidth += charWidth
          }
          result.push(chunk)
          remaining = remaining.slice(chunk.length)
        }
        currentLine = ''
        currentWidth = 0
      } else {
        // Start new line
        result.push(currentLine)
        currentLine = word
        currentWidth = wordWidth
      }
    }

    if (currentLine.length > 0) {
      result.push(currentLine)
    }
  }

  return result.length > 0 ? result : ['']
}
