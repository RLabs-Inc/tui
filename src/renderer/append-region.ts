/**
 * TUI Framework - Append Mode Renderer
 *
 * Simple renderer for append mode:
 * - Clears active region (eraseDown from cursor)
 * - Renders active content
 *
 * History content is handled separately via renderToHistory().
 * The app controls what goes to history vs active area.
 *
 * This renderer is essentially inline mode with cursor at the
 * boundary between frozen history and active content.
 */

import type { FrameBuffer, RGBA, CellAttrs } from '../types'
import { Attr } from '../types'
import { rgbaEqual } from '../types/color'
import * as ansi from './ansi'

// =============================================================================
// APPEND MODE RENDERER
// =============================================================================

/**
 * Simple append mode renderer.
 * Erases previous active content and renders fresh.
 *
 * Like InlineRenderer but only erases the active area (preserves history).
 */
export class AppendRegionRenderer {
  // Cell rendering state (for ANSI optimization)
  private lastFg: RGBA | null = null
  private lastBg: RGBA | null = null
  private lastAttrs: CellAttrs = Attr.NONE

  // Track previous height to know how many lines to erase
  private previousHeight = 0

  /**
   * Render frame buffer as active content.
   * Erases exactly the previous content, then writes fresh.
   */
  render(buffer: FrameBuffer): void {
    const output = this.buildOutput(buffer)

    // Erase previous active content (move up and clear each line)
    if (this.previousHeight > 0) {
      process.stdout.write(ansi.eraseLines(this.previousHeight))
    }

    // Render active content
    process.stdout.write(output)

    // Track height for next render
    // +1 because buildOutput adds trailing newline which moves cursor down one line
    this.previousHeight = buffer.height + 1
  }

  /**
   * Erase the current active area.
   * Call this BEFORE writing to history so we clear the screen first.
   */
  eraseActive(): void {
    if (this.previousHeight > 0) {
      process.stdout.write(ansi.eraseLines(this.previousHeight))
      this.previousHeight = 0
    }
  }

  /**
   * Call this after writing to history.
   * Resets height tracking so next render doesn't try to erase history.
   */
  invalidate(): void {
    this.previousHeight = 0
  }

  /**
   * Build output string for the buffer.
   */
  private buildOutput(buffer: FrameBuffer): string {
    if (buffer.height === 0) return ''

    const chunks: string[] = []

    // Reset rendering state
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE

    for (let y = 0; y < buffer.height; y++) {
      if (y > 0) {
        chunks.push('\n')
      }

      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.cells[y]![x]
        this.renderCell(chunks, cell!)
      }
    }

    chunks.push(ansi.reset)
    chunks.push('\n')

    return chunks.join('')
  }

  /**
   * Render a single cell with ANSI optimization.
   */
  private renderCell(chunks: string[], cell: { char: number; fg: RGBA; bg: RGBA; attrs: CellAttrs }): void {
    // Attributes changed - reset first
    if (cell.attrs !== this.lastAttrs) {
      chunks.push(ansi.reset)
      if (cell.attrs !== Attr.NONE) {
        chunks.push(ansi.attrs(cell.attrs))
      }
      this.lastFg = null
      this.lastBg = null
      this.lastAttrs = cell.attrs
    }

    // Foreground color changed
    if (!this.lastFg || !rgbaEqual(cell.fg, this.lastFg)) {
      chunks.push(ansi.fg(cell.fg))
      this.lastFg = cell.fg
    }

    // Background color changed
    if (!this.lastBg || !rgbaEqual(cell.bg, this.lastBg)) {
      chunks.push(ansi.bg(cell.bg))
      this.lastBg = cell.bg
    }

    // Output character
    if (cell.char === 0) {
      chunks.push(' ')
    } else {
      chunks.push(String.fromCodePoint(cell.char))
    }
  }

  /**
   * Reset renderer state.
   */
  reset(): void {
    this.previousHeight = 0
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE
  }

  /**
   * Cleanup (no-op for simplified renderer).
   */
  cleanup(): void {
    // Nothing to cleanup - we don't own the FileSink
  }
}
