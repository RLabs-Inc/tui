/**
 * TUI Framework - Two-Region Append Renderer
 *
 * Implements a hybrid static/reactive rendering mode optimized for chat-like UIs:
 *
 * STATIC REGION (Terminal History):
 * - Completed messages written once via Bun.file(1).writer()
 * - No re-rendering, pure append-only
 * - Native terminal scroll, copy/paste, search
 * - O(1) cost after initial write
 *
 * REACTIVE REGION (Active TUI):
 * - Last N messages + input area
 * - Full reactive rendering pipeline
 * - Interactive (focus, scroll, mouse)
 * - Fixed-size = O(1) render time
 *
 * This architecture enables:
 * - Infinite conversation length with constant performance
 * - Rich interactive UI for active content
 * - Graceful degradation to static output
 * - CLI-like feel with TUI interactivity
 */

import type { Cell, RGBA, CellAttrs, FrameBuffer } from '../types'
import { Attr } from '../types'
import { rgbaEqual } from '../types/color'
import * as ansi from './ansi'

// =============================================================================
// FileSink Writer for Static Region
// =============================================================================

/**
 * Writer for appending to terminal stdout using Bun's FileSink API.
 * Buffers writes and flushes efficiently.
 */
class StdoutWriter {
  private writer: any // FileSink type
  private hasContent = false

  constructor() {
    // Create writer for stdout (file descriptor 1)
    const stdoutFile = Bun.file(1)
    this.writer = stdoutFile.writer({ highWaterMark: 1024 * 1024 }) // 1MB buffer
  }

  write(content: string): void {
    if (content.length === 0) return
    this.writer.write(content)
    this.hasContent = true
  }

  flush(): void {
    if (this.hasContent) {
      this.writer.flush()
      this.hasContent = false
    }
  }

  end(): void {
    this.writer.end()
  }
}

// =============================================================================
// Message Tracking
// =============================================================================

interface MessageMetadata {
  id: string
  lineCount: number
  content: string
}

// =============================================================================
// Two-Region Append Renderer
// =============================================================================

/**
 * Renders frame buffer in two distinct regions:
 * 1. Static region: Frozen completed content (terminal history)
 * 2. Reactive region: Live updating content (last N lines)
 *
 * The boundary between regions shifts as content completes.
 */
export class AppendRegionRenderer {
  private staticWriter = new StdoutWriter()
  private frozenMessages = new Set<string>()
  private totalStaticLines = 0

  // Cell rendering state (for ANSI optimization)
  private lastFg: RGBA | null = null
  private lastBg: RGBA | null = null
  private lastAttrs: CellAttrs = Attr.NONE

  // Previous reactive output for change detection
  private previousReactiveOutput = ''

  /**
   * Render frame buffer with two-region strategy.
   *
   * @param buffer - Full frame buffer
   * @param options.staticHeight - Number of lines to freeze into static region
   * @param options.messageIds - Optional array of message IDs for tracking
   */
  render(
    buffer: FrameBuffer,
    options: {
      staticHeight: number
      messageIds?: string[]
    } = { staticHeight: 0 }
  ): void {
    const { staticHeight, messageIds = [] } = options

    // Split buffer into two regions
    const staticBuffer = this.extractRegion(buffer, 0, staticHeight)
    const reactiveBuffer = this.extractRegion(buffer, staticHeight, buffer.height - staticHeight)

    // STATIC REGION: Freeze new content to terminal history
    if (staticHeight > this.totalStaticLines) {
      const newStaticLines = staticHeight - this.totalStaticLines
      const newStaticBuffer = this.extractRegion(
        buffer,
        this.totalStaticLines,
        newStaticLines
      )

      const staticOutput = this.buildStaticOutput(newStaticBuffer)
      this.staticWriter.write(staticOutput)
      this.staticWriter.flush()

      this.totalStaticLines = staticHeight
    }

    // REACTIVE REGION: Clear and re-render active content
    const reactiveOutput = this.buildReactiveOutput(reactiveBuffer)

    // Only update if changed
    if (reactiveOutput !== this.previousReactiveOutput) {
      // Clear from current position down
      process.stdout.write(ansi.eraseDown)

      // Render reactive content
      process.stdout.write(reactiveOutput)

      this.previousReactiveOutput = reactiveOutput
    }
  }

  /**
   * Extract a region from the frame buffer.
   */
  private extractRegion(buffer: FrameBuffer, startY: number, height: number): FrameBuffer {
    if (height <= 0) {
      return {
        width: buffer.width,
        height: 0,
        cells: []
      }
    }

    const endY = Math.min(startY + height, buffer.height)
    const actualHeight = endY - startY

    return {
      width: buffer.width,
      height: actualHeight,
      cells: buffer.cells.slice(startY, endY)
    }
  }

  /**
   * Build output for static region (append once, forget).
   */
  private buildStaticOutput(buffer: FrameBuffer): string {
    if (buffer.height === 0) return ''

    const chunks: string[] = []

    // Reset rendering state
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.cells[y]![x]
        this.renderCell(chunks, cell!)
      }
      chunks.push('\n')
    }

    chunks.push(ansi.reset)

    return chunks.join('')
  }

  /**
   * Build output for reactive region (cleared and re-rendered each frame).
   */
  private buildReactiveOutput(buffer: FrameBuffer): string {
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
  private renderCell(chunks: string[], cell: Cell): void {
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
   * Mark a message as frozen (moved to static region).
   */
  freezeMessage(messageId: string): void {
    this.frozenMessages.add(messageId)
  }

  /**
   * Check if a message has been frozen.
   */
  isFrozen(messageId: string): boolean {
    return this.frozenMessages.has(messageId)
  }

  /**
   * Get total number of static lines rendered.
   */
  getStaticLineCount(): number {
    return this.totalStaticLines
  }

  /**
   * Reset the renderer state.
   */
  reset(): void {
    this.frozenMessages.clear()
    this.totalStaticLines = 0
    this.previousReactiveOutput = ''
    this.lastFg = null
    this.lastBg = null
    this.lastAttrs = Attr.NONE
  }

  /**
   * Cleanup when unmounting.
   */
  cleanup(): void {
    this.staticWriter.end()
  }
}
