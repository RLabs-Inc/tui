/**
 * TUI Framework - History Rendering for Append Mode
 *
 * Provides utilities for rendering content to terminal history (scrollback).
 * Used in append mode where completed content is frozen to history while
 * active content remains reactive.
 *
 * Key concepts:
 * - History content is written once via FileSink (Bun's efficient stdout writer)
 * - Uses the same component API as active rendering
 * - Isolated rendering: creates temporary components, renders, cleans up
 */

import type { FrameBuffer, RGBA } from '../types'
import { ComponentType } from '../types'
import { Colors, TERMINAL_DEFAULT } from '../types/color'
import {
  createBuffer,
  fillRect,
  drawBorder,
  drawText,
  drawTextCentered,
  drawTextRight,
  createClipRect,
  intersectClipRects,
  type ClipRect,
  type BorderConfig,
} from '../renderer/buffer'
import {
  getAllocatedIndices,
  getCapacity,
  releaseIndex,
} from '../engine/registry'
import { wrapText, truncateText } from '../utils/text'
import {
  getInheritedFg,
  getInheritedBg,
  getBorderColors,
  getBorderStyles,
  hasBorder,
  getEffectiveOpacity,
} from '../engine/inheritance'
import { computeLayoutTitan } from '../pipeline/layout/titan-engine'
import { terminalWidth, terminalHeight } from '../pipeline/layout'
import * as ansi from '../renderer/ansi'

// Import arrays
import * as core from '../engine/arrays/core'
import * as visual from '../engine/arrays/visual'
import * as text from '../engine/arrays/text'
import * as spacing from '../engine/arrays/spacing'
import * as layout from '../engine/arrays/layout'
import * as interaction from '../engine/arrays/interaction'
import { Attr } from '../types'
import { rgbaEqual } from '../types/color'

// =============================================================================
// FILESINK WRITER
// =============================================================================

/**
 * Writer for appending to terminal stdout using Bun's FileSink API.
 * Buffers writes and flushes efficiently.
 */
export class HistoryWriter {
  private writer: ReturnType<ReturnType<typeof Bun.file>['writer']>
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
// BUFFER TO ANSI CONVERSION
// =============================================================================

/**
 * Convert a FrameBuffer to ANSI escape sequence string.
 */
function bufferToAnsi(buffer: FrameBuffer): string {
  if (buffer.height === 0) return ''

  const chunks: string[] = []

  // Track last colors/attrs for optimization
  let lastFg: RGBA | null = null
  let lastBg: RGBA | null = null
  let lastAttrs: number = Attr.NONE

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.cells[y]![x]!

      // Attributes changed - reset first
      if (cell.attrs !== lastAttrs) {
        chunks.push(ansi.reset)
        if (cell.attrs !== Attr.NONE) {
          chunks.push(ansi.attrs(cell.attrs))
        }
        lastFg = null
        lastBg = null
        lastAttrs = cell.attrs
      }

      // Foreground color changed
      if (!lastFg || !rgbaEqual(cell.fg, lastFg)) {
        chunks.push(ansi.fg(cell.fg))
        lastFg = cell.fg
      }

      // Background color changed
      if (!lastBg || !rgbaEqual(cell.bg, lastBg)) {
        chunks.push(ansi.bg(cell.bg))
        lastBg = cell.bg
      }

      // Output character
      if (cell.char === 0) {
        chunks.push(' ')
      } else {
        chunks.push(String.fromCodePoint(cell.char))
      }
    }
    chunks.push('\n')
  }

  chunks.push(ansi.reset)

  return chunks.join('')
}

// =============================================================================
// ISOLATED FRAME BUFFER COMPUTATION
// =============================================================================

/**
 * Compute a frame buffer for a specific set of component indices.
 * Used for isolated history rendering.
 */
function computeBufferForIndices(
  indices: Set<number>,
  layoutResult: ReturnType<typeof computeLayoutTitan>,
  tw: number
): FrameBuffer {
  const bufferWidth = tw
  const bufferHeight = Math.max(1, layoutResult.contentHeight)

  // Create fresh buffer
  const buffer = createBuffer(bufferWidth, bufferHeight, TERMINAL_DEFAULT)

  if (indices.size === 0) {
    return buffer
  }

  // Find root components and build child index map (only for our indices)
  const rootIndices: number[] = []
  const childMap = new Map<number, number[]>()

  for (const i of indices) {
    if (core.componentType[i] === ComponentType.NONE) continue
    const vis = core.visible[i]
    if (vis === 0 || vis === false) continue

    const parent = core.parentIndex[i] ?? -1
    if (parent === -1 || !indices.has(parent)) {
      // Root if no parent or parent not in our set
      rootIndices.push(i)
    } else {
      const children = childMap.get(parent)
      if (children) {
        children.push(i)
      } else {
        childMap.set(parent, [i])
      }
    }
  }

  // Sort by zIndex
  rootIndices.sort((a, b) => (layout.zIndex[a] || 0) - (layout.zIndex[b] || 0))
  for (const children of childMap.values()) {
    children.sort((a, b) => (layout.zIndex[a] || 0) - (layout.zIndex[b] || 0))
  }

  // Render tree recursively
  for (const rootIdx of rootIndices) {
    renderComponentToBuffer(
      buffer,
      rootIdx,
      layoutResult,
      childMap,
      undefined,
      0,
      0
    )
  }

  return buffer
}

/**
 * Render a component and its children to a buffer.
 */
function renderComponentToBuffer(
  buffer: FrameBuffer,
  index: number,
  computedLayout: { x: number[]; y: number[]; width: number[]; height: number[]; scrollable: number[] },
  childMap: Map<number, number[]>,
  parentClip: ClipRect | undefined,
  parentScrollY: number,
  parentScrollX: number
): void {
  const vis = core.visible[index]
  if (vis === 0 || vis === false) return
  if (core.componentType[index] === ComponentType.NONE) return

  const x = Math.floor((computedLayout.x[index] || 0) - parentScrollX)
  const y = Math.floor((computedLayout.y[index] || 0) - parentScrollY)
  const w = Math.floor(computedLayout.width[index] || 0)
  const h = Math.floor(computedLayout.height[index] || 0)

  if (w <= 0 || h <= 0) return

  const componentBounds = createClipRect(x, y, w, h)

  if (parentClip) {
    const intersection = intersectClipRects(componentBounds, parentClip)
    if (!intersection) return
  }

  // Get colors
  const fg = getInheritedFg(index)
  const bg = getInheritedBg(index)
  const opacity = getEffectiveOpacity(index)

  const effectiveFg = opacity < 1 ? { ...fg, a: Math.round(fg.a * opacity) } : fg
  const effectiveBg = opacity < 1 ? { ...bg, a: Math.round(bg.a * opacity) } : bg

  // Fill background
  if (effectiveBg.a > 0 && effectiveBg.r !== -1) {
    fillRect(buffer, x, y, w, h, effectiveBg, parentClip)
  }

  // Borders
  const borderStyles = getBorderStyles(index)
  const borderColors = getBorderColors(index)
  const hasAnyBorder = hasBorder(index)

  if (hasAnyBorder && w >= 2 && h >= 2) {
    const config: BorderConfig = {
      styles: borderStyles,
      colors: {
        top: opacity < 1 ? { ...borderColors.top, a: Math.round(borderColors.top.a * opacity) } : borderColors.top,
        right: opacity < 1 ? { ...borderColors.right, a: Math.round(borderColors.right.a * opacity) } : borderColors.right,
        bottom: opacity < 1 ? { ...borderColors.bottom, a: Math.round(borderColors.bottom.a * opacity) } : borderColors.bottom,
        left: opacity < 1 ? { ...borderColors.left, a: Math.round(borderColors.left.a * opacity) } : borderColors.left,
      },
    }
    drawBorder(buffer, x, y, w, h, config, undefined, parentClip)
  }

  // Content area
  const padTop = (spacing.paddingTop[index] || 0) + (hasAnyBorder && borderStyles.top > 0 ? 1 : 0)
  const padRight = (spacing.paddingRight[index] || 0) + (hasAnyBorder && borderStyles.right > 0 ? 1 : 0)
  const padBottom = (spacing.paddingBottom[index] || 0) + (hasAnyBorder && borderStyles.bottom > 0 ? 1 : 0)
  const padLeft = (spacing.paddingLeft[index] || 0) + (hasAnyBorder && borderStyles.left > 0 ? 1 : 0)

  const contentX = x + padLeft
  const contentY = y + padTop
  const contentW = w - padLeft - padRight
  const contentH = h - padTop - padBottom

  const contentBounds = createClipRect(contentX, contentY, contentW, contentH)
  const contentClip = parentClip
    ? intersectClipRects(contentBounds, parentClip)
    : contentBounds

  if (!contentClip || contentW <= 0 || contentH <= 0) {
    return
  }

  // Render by type
  switch (core.componentType[index]) {
    case ComponentType.BOX:
      break

    case ComponentType.TEXT:
      renderTextToBuffer(buffer, index, contentX, contentY, contentW, contentH, effectiveFg, contentClip)
      break

    // Other types can be added as needed
  }

  // Render children
  if (core.componentType[index] === ComponentType.BOX) {
    const children = childMap.get(index) || []
    const isScrollable = (computedLayout.scrollable[index] ?? 0) === 1
    const scrollY = isScrollable ? (interaction.scrollOffsetY[index] || 0) : 0
    const scrollX = isScrollable ? (interaction.scrollOffsetX[index] || 0) : 0

    for (const childIdx of children) {
      renderComponentToBuffer(
        buffer,
        childIdx,
        computedLayout,
        childMap,
        contentClip,
        parentScrollY + scrollY,
        parentScrollX + scrollX
      )
    }
  }
}

/**
 * Render text component to buffer.
 */
function renderTextToBuffer(
  buffer: FrameBuffer,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: RGBA,
  clip: ClipRect
): void {
  const rawValue = text.textContent[index]
  const content = rawValue == null ? '' : String(rawValue)
  if (!content) return

  const attrs = text.textAttrs[index] || 0
  const align = text.textAlign[index] || 0

  const lines = wrapText(content, w)

  for (let lineIdx = 0; lineIdx < lines.length && lineIdx < h; lineIdx++) {
    const line = lines[lineIdx] ?? ''
    const lineY = y + lineIdx

    if (lineY < clip.y || lineY >= clip.y + clip.height) continue

    switch (align) {
      case 0:
        drawText(buffer, x, lineY, line, fg, undefined, attrs, clip)
        break
      case 1:
        drawTextCentered(buffer, x, lineY, w, line, fg, undefined, attrs, clip)
        break
      case 2:
        drawTextRight(buffer, x, lineY, w, line, fg, undefined, attrs, clip)
        break
    }
  }
}

// =============================================================================
// RENDER TO HISTORY
// =============================================================================

/**
 * Create a renderToHistory function bound to a HistoryWriter and AppendRegionRenderer.
 *
 * The renderer is needed to coordinate:
 * 1. Erase the active area BEFORE writing history
 * 2. History is written (becomes permanent scrollback)
 * 3. Next render will start fresh below the history
 *
 * Usage:
 * ```ts
 * const renderToHistory = createRenderToHistory(historyWriter, appendRegionRenderer)
 *
 * // When freezing content:
 * renderToHistory(() => {
 *   Message({ content: 'Hello!' })
 * })
 * ```
 */
export function createRenderToHistory(
  historyWriter: HistoryWriter,
  appendRegionRenderer: { eraseActive: () => void }
) {
  return function renderToHistory(componentFn: () => void): void {
    // STEP 1: Erase the active area first
    // This clears the screen so history can be written in its place
    appendRegionRenderer.eraseActive()

    // Save current allocated indices BEFORE creating history components
    const beforeIndices = new Set(getAllocatedIndices())

    // Run component function - creates new components
    componentFn()

    // Find NEW indices (ones that didn't exist before)
    const historyIndices = new Set<number>()
    for (const idx of getAllocatedIndices()) {
      if (!beforeIndices.has(idx)) {
        historyIndices.add(idx)
      }
    }

    if (historyIndices.size === 0) {
      return
    }

    // Get terminal width for layout
    const tw = terminalWidth.value
    const th = terminalHeight.value

    // Compute layout for just history components
    const layoutResult = computeLayoutTitan(tw, th, historyIndices, false)

    // Build frame buffer for history components
    const buffer = computeBufferForIndices(historyIndices, layoutResult, tw)

    // STEP 2: Convert to ANSI and write to history
    // This becomes permanent terminal scrollback
    const output = bufferToAnsi(buffer)
    historyWriter.write(output)
    historyWriter.flush()

    // Cleanup: release all history components
    // Note: This will trigger reactive updates, but the history is already written
    // The renderer's previousHeight is already 0 from eraseActive(), so next render
    // will simply render the active area fresh below our history output
    for (const idx of historyIndices) {
      releaseIndex(idx)
    }
  }
}
