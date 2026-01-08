/**
 * TUI Framework - Scroll State Module
 *
 * Manages scrolling behavior:
 * - Per-component scroll offset (user state via interaction arrays)
 * - Scroll bounds from layout (computed by TITAN)
 * - Scroll-into-view for focused elements
 * - Mouse wheel and keyboard arrow scrolling
 *
 * Built-in behaviors:
 * - Arrow keys scroll focused scrollable container
 * - Mouse wheel scrolls element under cursor (fallback to focused)
 * - Page Up/Down for large jumps
 * - Home/End for start/end
 *
 * Architecture:
 * - scrollOffsetX/Y = user state (interaction arrays)
 * - scrollable/maxScrollX/Y = computed by TITAN (read from layoutDerived)
 */

import { unwrap } from '@rlabs-inc/signals'
import * as interaction from '../engine/arrays/interaction'
import { focusedIndex } from '../engine/arrays/interaction'
import { layoutDerived } from '../pipeline/layout'
import { hitGrid } from './mouse'

// =============================================================================
// SCROLL CONSTANTS
// =============================================================================

/** Default scroll amount for arrow keys (lines) */
export const LINE_SCROLL = 1

/** Default scroll amount for mouse wheel */
export const WHEEL_SCROLL = 3

/** Default scroll amount for Page Up/Down */
export const PAGE_SCROLL_FACTOR = 0.9 // 90% of viewport

// =============================================================================
// SCROLL STATE ACCESS
// =============================================================================

/** Check if a component is scrollable (reads from computed layout) */
export function isScrollable(index: number): boolean {
  const computed = layoutDerived.value
  return (computed.scrollable[index] ?? 0) === 1
}

/** Get current scroll offset for a component (user state) */
export function getScrollOffset(index: number): { x: number; y: number } {
  return {
    x: unwrap(interaction.scrollOffsetX[index]) ?? 0,
    y: unwrap(interaction.scrollOffsetY[index]) ?? 0,
  }
}

/** Get maximum scroll values for a component (reads from computed layout) */
export function getMaxScroll(index: number): { x: number; y: number } {
  const computed = layoutDerived.value
  return {
    x: computed.maxScrollX[index] ?? 0,
    y: computed.maxScrollY[index] ?? 0,
  }
}

// =============================================================================
// SCROLL OPERATIONS
// =============================================================================

/** Set scroll offset for a component (clamped to valid range) */
export function setScrollOffset(index: number, x: number, y: number): void {
  if (!isScrollable(index)) return

  const max = getMaxScroll(index)

  // Clamp values
  const clampedX = Math.max(0, Math.min(x, max.x))
  const clampedY = Math.max(0, Math.min(y, max.y))

  if (interaction.scrollOffsetX[index]) {
    interaction.scrollOffsetX[index]!.value = clampedX
  }
  if (interaction.scrollOffsetY[index]) {
    interaction.scrollOffsetY[index]!.value = clampedY
  }
}

/** Scroll by a delta amount */
export function scrollBy(index: number, deltaX: number, deltaY: number): boolean {
  if (!isScrollable(index)) return false

  const current = getScrollOffset(index)
  const max = getMaxScroll(index)

  const newX = Math.max(0, Math.min(current.x + deltaX, max.x))
  const newY = Math.max(0, Math.min(current.y + deltaY, max.y))

  // Check if we actually scrolled
  if (newX === current.x && newY === current.y) {
    return false // Already at boundary
  }

  setScrollOffset(index, newX, newY)
  return true
}

/** Scroll to top */
export function scrollToTop(index: number): void {
  setScrollOffset(index, getScrollOffset(index).x, 0)
}

/** Scroll to bottom */
export function scrollToBottom(index: number): void {
  setScrollOffset(index, getScrollOffset(index).x, getMaxScroll(index).y)
}

/** Scroll to start (horizontal) */
export function scrollToStart(index: number): void {
  setScrollOffset(index, 0, getScrollOffset(index).y)
}

/** Scroll to end (horizontal) */
export function scrollToEnd(index: number): void {
  setScrollOffset(index, getMaxScroll(index).x, getScrollOffset(index).y)
}

// =============================================================================
// SCROLL CHAINING
// =============================================================================

/**
 * Scroll with chaining - if at boundary, try parent
 * Returns true if any scrolling occurred
 */
export function scrollByWithChaining(
  index: number,
  deltaX: number,
  deltaY: number,
  getParent?: (i: number) => number
): boolean {
  // Try to scroll this component
  if (scrollBy(index, deltaX, deltaY)) {
    return true
  }

  // If at boundary and we have a parent getter, try parent
  if (getParent) {
    const parent = getParent(index)
    if (parent >= 0 && isScrollable(parent)) {
      return scrollByWithChaining(parent, deltaX, deltaY, getParent)
    }
  }

  return false
}

// =============================================================================
// FIND SCROLLABLE
// =============================================================================

/** Find the scrollable container at coordinates (uses HitGrid) */
export function findScrollableAt(x: number, y: number): number {
  const componentIndex = hitGrid.get(x, y)
  if (componentIndex >= 0 && isScrollable(componentIndex)) {
    return componentIndex
  }
  // Could walk up parent chain here, but we'd need parent info
  return -1
}

/** Get the focused scrollable, or -1 */
export function getFocusedScrollable(): number {
  const focused = focusedIndex.value
  if (focused >= 0 && isScrollable(focused)) {
    return focused
  }
  return -1
}

// =============================================================================
// KEYBOARD SCROLL HANDLERS
// =============================================================================

/** Handle arrow key scroll (for focused scrollable) */
export function handleArrowScroll(
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  const scrollable = getFocusedScrollable()
  if (scrollable < 0) return false

  switch (direction) {
    case 'up':
      return scrollBy(scrollable, 0, -LINE_SCROLL)
    case 'down':
      return scrollBy(scrollable, 0, LINE_SCROLL)
    case 'left':
      return scrollBy(scrollable, -LINE_SCROLL, 0)
    case 'right':
      return scrollBy(scrollable, LINE_SCROLL, 0)
  }
}

/** Handle Page Up/Down */
export function handlePageScroll(direction: 'up' | 'down'): boolean {
  const scrollable = getFocusedScrollable()
  if (scrollable < 0) return false

  // Get viewport height from somewhere (would need layout info)
  // For now, use a fixed amount
  const pageAmount = 10 // lines

  if (direction === 'up') {
    return scrollBy(scrollable, 0, -pageAmount)
  } else {
    return scrollBy(scrollable, 0, pageAmount)
  }
}

/** Handle Home/End for scroll */
export function handleHomeEnd(key: 'home' | 'end'): boolean {
  const scrollable = getFocusedScrollable()
  if (scrollable < 0) return false

  if (key === 'home') {
    scrollToTop(scrollable)
  } else {
    scrollToBottom(scrollable)
  }
  return true
}

// =============================================================================
// MOUSE WHEEL HANDLER
// =============================================================================

/** Handle mouse wheel scroll */
export function handleWheelScroll(
  x: number,
  y: number,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  // First try element under cursor
  let scrollable = findScrollableAt(x, y)

  // Fallback to focused scrollable
  if (scrollable < 0) {
    scrollable = getFocusedScrollable()
  }

  if (scrollable < 0) return false

  switch (direction) {
    case 'up':
      return scrollBy(scrollable, 0, -WHEEL_SCROLL)
    case 'down':
      return scrollBy(scrollable, 0, WHEEL_SCROLL)
    case 'left':
      return scrollBy(scrollable, -WHEEL_SCROLL, 0)
    case 'right':
      return scrollBy(scrollable, WHEEL_SCROLL, 0)
  }
}

// =============================================================================
// SCROLL INTO VIEW
// =============================================================================

/**
 * Scroll to make a child component visible within a scrollable parent
 * This is called when focus changes to ensure focused element is visible
 */
export function scrollIntoView(
  childIndex: number,
  scrollableIndex: number,
  childY: number,
  childHeight: number,
  viewportHeight: number
): void {
  if (!isScrollable(scrollableIndex)) return

  const current = getScrollOffset(scrollableIndex)
  const viewportTop = current.y
  const viewportBottom = viewportTop + viewportHeight

  // Check if child is already visible
  const childTop = childY
  const childBottom = childY + childHeight

  if (childTop >= viewportTop && childBottom <= viewportBottom) {
    // Already visible
    return
  }

  // Scroll to make visible (minimal scroll)
  if (childTop < viewportTop) {
    // Child is above viewport - scroll up
    setScrollOffset(scrollableIndex, current.x, childTop)
  } else if (childBottom > viewportBottom) {
    // Child is below viewport - scroll down
    setScrollOffset(scrollableIndex, current.x, childBottom - viewportHeight)
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const scroll = {
  // Constants
  LINE_SCROLL,
  WHEEL_SCROLL,
  PAGE_SCROLL_FACTOR,

  // State access
  isScrollable,
  getScrollOffset,
  getMaxScroll,

  // Operations
  setScrollOffset,
  scrollBy,
  scrollToTop,
  scrollToBottom,
  scrollToStart,
  scrollToEnd,
  scrollByWithChaining,

  // Finders
  findScrollableAt,
  getFocusedScrollable,

  // Handlers
  handleArrowScroll,
  handlePageScroll,
  handleHomeEnd,
  handleWheelScroll,

  // Scroll into view
  scrollIntoView,
}
