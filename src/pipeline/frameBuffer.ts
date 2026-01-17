/**
 * TUI Framework - Production FrameBuffer Derived
 *
 * Transforms layout and component arrays into a renderable FrameBuffer.
 *
 * Production features:
 * - ClipRect-based clipping with intersection
 * - Scroll offset accumulation through parent chain
 * - Per-side border rendering (10 styles)
 * - Color inheritance (walk up parent tree)
 * - Opacity blending
 * - zIndex sorting
 * - Text wrapping and truncation
 *
 * This is a DERIVED - pure computation, returns data without side effects.
 * HitGrid updates are returned as data to be applied by the render effect.
 */

import { derived, neverEquals, signal } from '@rlabs-inc/signals'
import type { FrameBuffer, RGBA } from '../types'
import { ComponentType } from '../types'
import { Colors, TERMINAL_DEFAULT, rgbaBlend, rgbaLerp } from '../types/color'
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
import { getAllocatedIndices } from '../engine/registry'
import { wrapText, truncateText } from '../utils/text'
import {
  getInheritedFg,
  getInheritedBg,
  getBorderColors,
  getBorderStyles,
  getEffectiveOpacity,
} from '../engine/inheritance'

// Import arrays
import * as core from '../engine/arrays/core'
import * as visual from '../engine/arrays/visual'
import *as text from '../engine/arrays/text'
import *as spacing from '../engine/arrays/spacing'
import *as layout from '../engine/arrays/layout'
import *as interaction from '../engine/arrays/interaction'

// Import layout derived
import { layoutDerived, terminalWidth, terminalHeight, renderMode } from './layout'

// =============================================================================
// HIT REGION TYPE - returned as data, applied by render effect
// =============================================================================

export interface HitRegion {
  x: number
  y: number
  width: number
  height: number
  componentIndex: number
}

export interface FrameBufferResult {
  buffer: FrameBuffer
  hitRegions: HitRegion[]
  terminalSize: { width: number; height: number }
}

// =============================================================================
// FRAME BUFFER DERIVED
// =============================================================================

/**
 * Production frameBuffer derived.
 *
 * Reads from:
 * - layoutDerived (computed positions)
 * - All visual, text, spacing, interaction arrays
 * - terminalWidth, terminalHeight
 *
 * Returns:
 * - FrameBufferResult containing buffer, hitRegions, and terminal size
 * - hitRegions should be applied to HitGrid by the render effect (no side effects here!)
 */
export const frameBufferDerived = derived((): FrameBufferResult => {
  const computedLayout = layoutDerived.value
  const tw = terminalWidth.value
  const th = terminalHeight.value
  const mode = renderMode.value

  // Collect hit regions as DATA - no side effects!
  const hitRegions: HitRegion[] = []

  // Buffer sizing depends on render mode:
  // - Fullscreen: terminal dimensions (fixed viewport)
  // - Inline/Append: terminal width × content height (content determines size)
  const bufferWidth = tw
  const bufferHeight = mode === 'fullscreen'
    ? th
    : Math.max(1, computedLayout.contentHeight)  // Use content bounds for inline/append

  // Create fresh buffer with terminal default background
  const buffer = createBuffer(bufferWidth, bufferHeight, TERMINAL_DEFAULT)

  const indices = getAllocatedIndices()
  if (indices.size === 0) {
    return { buffer, hitRegions, terminalSize: { width: bufferWidth, height: bufferHeight } }
  }

  // Find root components and build child index map
  const rootIndices: number[] = []
  const childMap = new Map<number, number[]>()

  for (const i of indices) {
    if (core.componentType[i] === ComponentType.NONE) continue
    const vis = core.visible[i]
    if (vis === 0 || vis === false) continue

    const parent = core.parentIndex[i] ?? -1
    if (parent === -1) {
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

  // Sort roots by zIndex
  rootIndices.sort((a, b) => (layout.zIndex[a] || 0) - (layout.zIndex[b] || 0))

  // Sort children by zIndex
  for (const children of childMap.values()) {
    children.sort((a, b) => (layout.zIndex[a] || 0) - (layout.zIndex[b] || 0))
  }

  // Render tree recursively
  for (const rootIdx of rootIndices) {
    renderComponent(
      buffer,
      rootIdx,
      computedLayout,
      childMap,
      hitRegions,  // Pass hitRegions array to collect data
      undefined,   // No parent clip for roots
      0,           // No parent scroll Y
      0            // No parent scroll X
    )
  }

  return { buffer, hitRegions, terminalSize: { width: bufferWidth, height: bufferHeight } }
})

// =============================================================================
// RECURSIVE COMPONENT RENDERER
// =============================================================================

/**
 * Render a component and its children recursively.
 * Handles clipping, scrolling, and proper z-ordering.
 * Collects hit regions as data (no side effects).
 */
function renderComponent(
  buffer: FrameBuffer,
  index: number,
  computedLayout: { x: number[]; y: number[]; width: number[]; height: number[]; scrollable: number[] },
  childMap: Map<number, number[]>,
  hitRegions: HitRegion[],
  parentClip: ClipRect | undefined,
  parentScrollY: number,
  parentScrollX: number
): void {
  // Skip invisible/invalid components
  const vis = core.visible[index]
  if (vis === 0 || vis === false) return
  if (core.componentType[index] === ComponentType.NONE) return

  // Apply parent's scroll offset to this component's position
  const x = Math.floor((computedLayout.x[index] || 0) - parentScrollX)
  const y = Math.floor((computedLayout.y[index] || 0) - parentScrollY)
  const w = Math.floor(computedLayout.width[index] || 0)
  const h = Math.floor(computedLayout.height[index] || 0)

  if (w <= 0 || h <= 0) return

  // Create component bounds
  const componentBounds = createClipRect(x, y, w, h)

  // If parent is clipping, check if this component is visible
  if (parentClip) {
    const intersection = intersectClipRects(componentBounds, parentClip)
    if (!intersection) return // Completely clipped out
  }

  // Get effective colors (with inheritance)
  const fg = getInheritedFg(index)
  const bg = getInheritedBg(index)
  const opacity = getEffectiveOpacity(index)

  // Apply opacity to colors
  const effectiveFg = opacity < 1 ? { ...fg, a: Math.round(fg.a * opacity) } : fg
  const effectiveBg = opacity < 1 ? { ...bg, a: Math.round(bg.a * opacity) } : bg

  // Fill background if not transparent
  if (effectiveBg.a > 0 && effectiveBg.r !== -1) {
    fillRect(buffer, x, y, w, h, effectiveBg, parentClip)
  }

  // Collect hit region data (applied by render effect, not here - no side effects!)
  // Children are rendered after parents, so their regions will overwrite in order
  hitRegions.push({ x, y, width: w, height: h, componentIndex: index })

  // Get border configuration
  const borderStyles = getBorderStyles(index)
  const borderColors = getBorderColors(index)
  // Inline hasAnyBorder check - avoids redundant getBorderStyles call (was 12 array reads, now 8)
  const hasAnyBorder = borderStyles.top > 0 || borderStyles.right > 0 || borderStyles.bottom > 0 || borderStyles.left > 0

  // Draw borders
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

  // Calculate content area (inside borders and padding)
  const padTop = (spacing.paddingTop[index] || 0) + (hasAnyBorder && borderStyles.top > 0 ? 1 : 0)
  const padRight = (spacing.paddingRight[index] || 0) + (hasAnyBorder && borderStyles.right > 0 ? 1 : 0)
  const padBottom = (spacing.paddingBottom[index] || 0) + (hasAnyBorder && borderStyles.bottom > 0 ? 1 : 0)
  const padLeft = (spacing.paddingLeft[index] || 0) + (hasAnyBorder && borderStyles.left > 0 ? 1 : 0)

  const contentX = x + padLeft
  const contentY = y + padTop
  const contentW = w - padLeft - padRight
  const contentH = h - padTop - padBottom

  // Create content clip rect (for children and text)
  const contentBounds = createClipRect(contentX, contentY, contentW, contentH)
  const contentClip = parentClip
    ? intersectClipRects(contentBounds, parentClip)
    : contentBounds

  if (!contentClip || contentW <= 0 || contentH <= 0) {
    // No content area visible, but we still rendered the component itself
    return
  }

  // Render based on component type
  switch (core.componentType[index]) {
    case ComponentType.BOX:
      // Box just has background and border, already drawn
      // Render children below
      break

    case ComponentType.TEXT:
      renderText(buffer, index, contentX, contentY, contentW, contentH, effectiveFg, contentClip)
      break

    case ComponentType.INPUT:
      renderInput(buffer, index, contentX, contentY, contentW, contentH, effectiveFg, contentClip)
      break

    case ComponentType.PROGRESS:
      renderProgress(buffer, index, x, y, w, h, effectiveFg, parentClip)
      break

    case ComponentType.SELECT:
      renderSelect(buffer, index, contentX, contentY, contentW, contentH, effectiveFg, contentClip)
      break

    // CANVAS is handled via canvasCells array if needed
  }

  // Render children (only for BOX containers)
  if (core.componentType[index] === ComponentType.BOX) {
    const children = childMap.get(index) || []

    // Get this component's scroll offset (scrollable comes from layout, offset from interaction)
    const isScrollable = (computedLayout.scrollable[index] ?? 0) === 1
    const scrollY = isScrollable ? (interaction.scrollOffsetY[index] || 0) : 0
    const scrollX = isScrollable ? (interaction.scrollOffsetX[index] || 0) : 0

    // Accumulated scroll for children
    const childScrollY = parentScrollY + scrollY
    const childScrollX = parentScrollX + scrollX

    for (const childIdx of children) {
      renderComponent(
        buffer,
        childIdx,
        computedLayout,
        childMap,
        hitRegions,
        contentClip,
        childScrollY,
        childScrollX
      )
    }
  }
}

// =============================================================================
// COMPONENT RENDERERS
// =============================================================================

/**
 * Render text component content with wrapping.
 */
function renderText(
  buffer: FrameBuffer,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: RGBA,
  clip: ClipRect
): void {
  // Read through slotArray proxy - same pattern as color reads in inheritance.ts
  const rawValue = text.textContent[index]
  const content = rawValue == null ? '' : String(rawValue)
  if (!content) return

  const attrs = text.textAttrs[index] || 0
  const align = text.textAlign[index] || 0

  // Word wrap the text
  const lines = wrapText(content, w)

  for (let lineIdx = 0; lineIdx < lines.length && lineIdx < h; lineIdx++) {
    const line = lines[lineIdx] ?? ''
    const lineY = y + lineIdx

    // Skip if outside clip
    if (lineY < clip.y || lineY >= clip.y + clip.height) continue

    switch (align) {
      case 0: // left
        drawText(buffer, x, lineY, line, fg, undefined, attrs, clip)
        break
      case 1: // center
        drawTextCentered(buffer, x, lineY, w, line, fg, undefined, attrs, clip)
        break
      case 2: // right
        drawTextRight(buffer, x, lineY, w, line, fg, undefined, attrs, clip)
        break
    }
  }
}

/**
 * Render input component content.
 */
function renderInput(
  buffer: FrameBuffer,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: RGBA,
  clip: ClipRect
): void {
  // Read through slotArray proxy - same pattern as renderText
  const rawValue = text.textContent[index]
  const content = rawValue == null ? '' : String(rawValue)
  const attrs = text.textAttrs[index] || 0
  const cursorPos = interaction.cursorPosition[index] || 0

  if (w <= 0) return

  // Calculate visible portion of text (scroll to keep cursor visible)
  let displayText = content
  let displayOffset = 0

  if (content.length > w) {
    // Scroll to keep cursor in view
    if (cursorPos > w - 1) {
      displayOffset = cursorPos - w + 1
    }
    displayText = content.slice(displayOffset, displayOffset + w)
  }

  // Draw input text
  drawText(buffer, x, y, displayText, fg, undefined, attrs, clip)

  // Draw cursor if focused
  if (interaction.focusedIndex.value === index) {
    const cursorX = x + Math.min(cursorPos - displayOffset, w - 1)
    if (cursorX >= clip.x && cursorX < clip.x + clip.width && y >= clip.y && y < clip.y + clip.height) {
      // Read cursor configuration from arrays
      const cursorCharCode = interaction.cursorChar[index] ?? 0
      const cursorAltCharCode = interaction.cursorAltChar[index] ?? 0
      const cursorVisible = interaction.cursorVisible[index] ?? 1

      const cell = buffer.cells[y]?.[cursorX]
      if (cell) {
        const charUnderCursor = content[cursorPos] || ' '

        if (cursorVisible === 0) {
          // Blink "off" phase
          if (cursorAltCharCode > 0) {
            // Custom alt character for "off" phase
            cell.char = cursorAltCharCode
            cell.fg = fg
            cell.bg = getInheritedBg(index)
          }
          // else: leave cell unchanged (original text shows through)
        } else {
          // Cursor visible
          if (cursorCharCode === 0) {
            // Block cursor (inverse) - swap fg/bg
            cell.char = charUnderCursor.codePointAt(0) ?? 32
            cell.fg = getInheritedBg(index)
            cell.bg = fg
          } else {
            // Custom cursor character (bar, underline, or user-defined)
            cell.char = cursorCharCode
            cell.fg = fg
            cell.bg = getInheritedBg(index)
          }
        }
      }
    }
  }
}

/**
 * Render progress component.
 */
function renderProgress(
  buffer: FrameBuffer,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: RGBA,
  clip?: ClipRect
): void {
  const valueStr = text.textContent[index] || '0'  // SlotArray auto-unwraps
  const progress = Math.max(0, Math.min(1, parseFloat(valueStr) || 0))
  const filled = Math.round(progress * w)

  const dimFg = { ...fg, a: Math.floor(fg.a * 0.3) }

  for (let px = 0; px < w; px++) {
    const cellX = x + px
    if (clip && (cellX < clip.x || cellX >= clip.x + clip.width)) continue

    const isFilled = px < filled
    const char = isFilled ? '█' : '░'
    const color = isFilled ? fg : dimFg

    drawText(buffer, cellX, y, char, color, undefined, 0, clip)
  }
}

/**
 * Render select component.
 */
function renderSelect(
  buffer: FrameBuffer,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: RGBA,
  clip: ClipRect
): void {
  const content = text.textContent[index] || ''  // SlotArray auto-unwraps
  const attrs = text.textAttrs[index] || 0

  // For now, just show current selection
  const displayText = truncateText(content, w - 2) // Leave room for dropdown indicator

  drawText(buffer, x, y, displayText, fg, undefined, attrs, clip)

  // Draw dropdown indicator
  if (w > 2) {
    drawText(buffer, x + w - 2, y, '▼', fg, undefined, 0, clip)
  }
}
