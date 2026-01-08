/**
 * TUI Framework - Output & Differential Rendering
 *
 * The DiffRenderer is the "Terminal GPU" - it takes FrameBuffers
 * and efficiently outputs only what changed since the last frame.
 *
 * Key optimizations:
 * - Stateful cell renderer (only emits changed attributes)
 * - Cursor position tracking (skips redundant moves)
 * - Synchronized output (prevents flicker)
 * - Batched writing (single syscall per frame)
 */

import type { Cell, RGBA, CellAttrs, FrameBuffer } from '../types'
import { Attr } from '../types'
import { rgbaEqual } from '../types/color'
import { cellEqual } from './buffer'
import * as ansi from './ansi'

// =============================================================================
// Output Buffer
// =============================================================================

/**
 * Batched output buffer.
 * Accumulates writes and flushes in a single syscall.
 */
export class OutputBuffer {
  private chunks: string[] = []
  private totalLength = 0

  write(str: string): void {
    if (str.length === 0) return
    this.chunks.push(str)
    this.totalLength += str.length
  }

  clear(): void {
    this.chunks = []
    this.totalLength = 0
  }

  get length(): number {
    return this.totalLength
  }

  toString(): string {
    return this.chunks.join('')
  }

  async flush(): Promise<void> {
    if (this.totalLength === 0) return

    const output = this.chunks.join('')
    this.clear()

    // Use Bun.write for performance
    await Bun.write(Bun.stdout, output)
  }

  flushSync(): void {
    if (this.totalLength === 0) return

    const output = this.chunks.join('')
    this.clear()

    process.stdout.write(output)
  }
}

// =============================================================================
// Stateful Cell Renderer
// =============================================================================

/**
 * Renders cells while tracking state to minimize output.
 * Only emits ANSI codes when values actually change.
 */
class StatefulCellRenderer {
  private lastFg: RGBA | null = null
  private lastBg: RGBA | null = null
  private lastAttrs: CellAttrs = Attr.NONE
  private lastX = -1
  private lastY = -1

  reset(): void {
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE
    this.lastX = -1
    this.lastY = -1
  }

  render(output: OutputBuffer, x: number, y: number, cell: Cell): void {
    // Move cursor if not sequential
    if (y !== this.lastY || x !== this.lastX + 1) {
      output.write(ansi.moveTo(x + 1, y + 1)) // ANSI is 1-indexed
    }

    // Attributes changed - need to reset first
    if (cell.attrs !== this.lastAttrs) {
      // Reset then apply new attributes
      output.write(ansi.reset)
      if (cell.attrs !== Attr.NONE) {
        output.write(ansi.attrs(cell.attrs))
      }
      // After reset, colors need to be re-emitted
      this.lastFg = null
      this.lastBg = null
      this.lastAttrs = cell.attrs
    }

    // Foreground color changed
    if (!this.lastFg || !rgbaEqual(cell.fg, this.lastFg)) {
      output.write(ansi.fg(cell.fg))
      this.lastFg = cell.fg
    }

    // Background color changed
    if (!this.lastBg || !rgbaEqual(cell.bg, this.lastBg)) {
      output.write(ansi.bg(cell.bg))
      this.lastBg = cell.bg
    }

    // Output character
    if (cell.char === 0) {
      // Continuation of wide character - skip
    } else {
      output.write(String.fromCodePoint(cell.char))
    }

    this.lastX = x
    this.lastY = y
  }

  /**
   * Render a cell for inline mode (no absolute positioning).
   * Writes attributes, colors, and character sequentially.
   */
  renderInline(output: OutputBuffer, cell: Cell): void {
    // Attributes changed - need to reset first
    if (cell.attrs !== this.lastAttrs) {
      output.write(ansi.reset)
      if (cell.attrs !== Attr.NONE) {
        output.write(ansi.attrs(cell.attrs))
      }
      this.lastFg = null
      this.lastBg = null
      this.lastAttrs = cell.attrs
    }

    // Foreground color changed
    if (!this.lastFg || !rgbaEqual(cell.fg, this.lastFg)) {
      output.write(ansi.fg(cell.fg))
      this.lastFg = cell.fg
    }

    // Background color changed
    if (!this.lastBg || !rgbaEqual(cell.bg, this.lastBg)) {
      output.write(ansi.bg(cell.bg))
      this.lastBg = cell.bg
    }

    // Output character (space for null/continuation)
    if (cell.char === 0) {
      output.write(' ')  // Continuation - write space to maintain grid
    } else {
      output.write(String.fromCodePoint(cell.char))
    }
  }
}

// =============================================================================
// Diff Renderer
// =============================================================================

/**
 * Differential renderer - only renders cells that changed.
 * Wraps output in synchronized block to prevent flicker.
 */
export class DiffRenderer {
  private output = new OutputBuffer()
  private cellRenderer = new StatefulCellRenderer()
  private previousBuffer: FrameBuffer | null = null

  /**
   * Render a frame buffer, diffing against previous frame.
   * Returns true if anything was rendered.
   */
  render(buffer: FrameBuffer): boolean {
    const prev = this.previousBuffer
    let hasChanges = false

    // NOTE: Synchronized output (CSI?2026h) disabled - was causing row 0 issues
    // this.output.write(ansi.beginSync)

    // Reset cell renderer state at start of frame
    this.cellRenderer.reset()

    // Render changed cells
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.cells[y]![x]

        // Skip if unchanged from previous frame
        if (prev && y < prev.height && x < prev.width) {
          const prevCell = prev.cells[y]![x]
          if (cellEqual(cell!, prevCell!)) continue
        }

        hasChanges = true
        this.cellRenderer.render(this.output, x, y, cell!)
      }
    }

    // End synchronized output
    this.output.write(ansi.endSync)

    // Flush to terminal
    this.output.flushSync()

    // Store for next diff
    this.previousBuffer = buffer

    return hasChanges
  }

  /**
   * Force full redraw (no diffing).
   */
  renderFull(buffer: FrameBuffer): void {
    // Begin synchronized output
    this.output.write(ansi.beginSync)

    // Clear and reset
    this.output.write(ansi.moveTo(1, 1))
    this.cellRenderer.reset()

    // Render all cells
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.cells[y]![x]
        this.cellRenderer.render(this.output, x, y, cell!)
      }
    }

    // End synchronized output
    this.output.write(ansi.endSync)

    // Flush to terminal
    this.output.flushSync()

    // Store for next diff
    this.previousBuffer = buffer
  }

  /**
   * Clear stored previous buffer (force full render on next call).
   */
  invalidate(): void {
    this.previousBuffer = null
  }

  /**
   * Get output buffer for additional writes.
   */
  getOutput(): OutputBuffer {
    return this.output
  }
}

// =============================================================================
// Render Mode Helpers
// =============================================================================

/**
 * Setup for inline render mode.
 * Saves cursor position before first render.
 */
export function setupInlineMode(output: OutputBuffer): void {
  output.write(ansi.saveCursor)
}

/**
 * Position cursor for inline mode update.
 */
export function positionInlineMode(output: OutputBuffer): void {
  output.write(ansi.restoreCursor)
}

/**
 * Position cursor for append mode update.
 * Moves up to overwrite previous content.
 */
export function positionAppendMode(output: OutputBuffer, previousHeight: number): void {
  if (previousHeight > 0) {
    output.write(ansi.moveUp(previousHeight))
    output.write(ansi.carriageReturn)
  }
}

/**
 * Position cursor after append mode render.
 * Moves to line after content.
 */
export function finalizeAppendMode(output: OutputBuffer, height: number): void {
  output.write(ansi.moveTo(1, height + 1))
}

// =============================================================================
// Inline Renderer
// =============================================================================

/**
 * Inline renderer matching Ink's log-update approach.
 * Uses our own ansi.ts (zero dependencies).
 */
export class InlineRenderer {
  private output = new OutputBuffer()
  private previousLineCount = 0
  private previousOutput = ''

  // Cell rendering state (for ANSI optimization)
  private lastFg: RGBA | null = null
  private lastBg: RGBA | null = null
  private lastAttrs: CellAttrs = Attr.NONE

  /**
   * Render a frame buffer for inline mode.
   * Follows log-update's algorithm:
   * 1. Build output with trailing newline
   * 2. eraseLines(previousLineCount) + output
   * 3. Track new line count
   *
   * KEY INSIGHT FROM INK:
   * When content height >= terminal rows, eraseLines can't reach content
   * that scrolled off the top into scrollback. In this case, use clearTerminal
   * to wipe everything including scrollback, then redraw.
   */
  render(buffer: FrameBuffer): void {
    // Build the output string
    const output = this.buildOutput(buffer)

    // Skip if output unchanged
    if (output === this.previousOutput) {
      return
    }

    // Get terminal viewport height
    const terminalRows = process.stdout.rows || 24

    // When content height >= terminal rows, eraseLines can't reach content
    // that scrolled off into scrollback. Use clearTerminal instead.
    if (this.previousLineCount >= terminalRows) {
      this.output.write(ansi.clearTerminal + output)
    } else {
      this.output.write(ansi.eraseLines(this.previousLineCount) + output)
    }
    this.output.flushSync()

    // Track for next render
    this.previousOutput = output
    // buffer.height + 1 because:
    // - We output buffer.height lines of content
    // - Plus a trailing newline that puts cursor on the next line
    // - eraseLines works from cursor position upward, so we need to erase
    //   buffer.height lines PLUS the empty line we're currently on
    this.previousLineCount = buffer.height + 1
  }

  /**
   * Build output string from frame buffer.
   */
  private buildOutput(buffer: FrameBuffer): string {
    const chunks: string[] = []

    // Reset cell rendering state
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
    chunks.push('\n')  // Trailing newline positions cursor for next eraseLines

    return chunks.join('')
  }

  /**
   * Render a single cell to chunks array.
   */
  private renderCell(chunks: string[], cell: Cell): void {
    if (cell.attrs !== this.lastAttrs) {
      chunks.push(ansi.reset)
      if (cell.attrs !== Attr.NONE) {
        chunks.push(ansi.attrs(cell.attrs))
      }
      this.lastFg = null
      this.lastBg = null
      this.lastAttrs = cell.attrs
    }

    if (!this.lastFg || !rgbaEqual(cell.fg, this.lastFg)) {
      chunks.push(ansi.fg(cell.fg))
      this.lastFg = cell.fg
    }

    if (!this.lastBg || !rgbaEqual(cell.bg, this.lastBg)) {
      chunks.push(ansi.bg(cell.bg))
      this.lastBg = cell.bg
    }

    if (cell.char === 0) {
      chunks.push(' ')
    } else {
      chunks.push(String.fromCodePoint(cell.char))
    }
  }

  /**
   * Clear all rendered content and reset state.
   */
  clear(): void {
    if (this.previousLineCount > 0) {
      this.output.write(ansi.eraseLines(this.previousLineCount))
      this.output.flushSync()
    }
    this.reset()
  }

  /**
   * Reset the renderer state.
   */
  reset(): void {
    this.previousLineCount = 0
    this.previousOutput = ''
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE
  }
}
