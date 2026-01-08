/**
 * TUI Framework - Color and Style Inheritance
 *
 * Utilities for walking up the component tree to inherit colors and styles.
 * Used when a component has null colors (meaning "inherit from parent").
 */

import { unwrap } from '@rlabs-inc/signals'
import type { RGBA } from '../types'
import { Colors, TERMINAL_DEFAULT } from '../types/color'
import * as core from './arrays/core'
import * as visual from './arrays/visual'

/**
 * Get inherited foreground color by walking up the parent tree.
 * Returns TERMINAL_DEFAULT if no explicit color is found.
 */
export function getInheritedFg(index: number): RGBA {
  let current: number = index

  while (current >= 0) {
    const fg = unwrap(visual.fgColor[current])
    if (fg !== null && fg !== undefined) return fg
    const parent = unwrap(core.parentIndex[current])
    if (parent === undefined || parent < 0) break
    current = parent
  }

  return TERMINAL_DEFAULT
}

/**
 * Get inherited background color by walking up the parent tree.
 * Returns TERMINAL_DEFAULT if no explicit color is found.
 */
export function getInheritedBg(index: number): RGBA {
  let current: number = index

  while (current >= 0) {
    const bg = unwrap(visual.bgColor[current])
    if (bg !== null && bg !== undefined) return bg
    const parent = unwrap(core.parentIndex[current])
    if (parent === undefined || parent < 0) break
    current = parent
  }

  return TERMINAL_DEFAULT
}

/**
 * Get inherited border color for a specific side.
 * Falls back to unified border color, then foreground color.
 */
export function getInheritedBorderColor(index: number, side: 'top' | 'right' | 'bottom' | 'left'): RGBA {
  const colorArray = {
    top: visual.borderColorTop,
    right: visual.borderColorRight,
    bottom: visual.borderColorBottom,
    left: visual.borderColorLeft,
  }[side]

  const color = unwrap(colorArray[index])
  if (color !== null && color !== undefined) return color

  // Try unified border color
  const unifiedColor = unwrap(visual.borderColor[index])
  if (unifiedColor !== null && unifiedColor !== undefined) return unifiedColor

  // Fall back to foreground color
  return getInheritedFg(index)
}

/**
 * Get all four border colors for a component.
 */
export function getBorderColors(index: number): {
  top: RGBA
  right: RGBA
  bottom: RGBA
  left: RGBA
} {
  const fg = getInheritedFg(index)
  const unified = unwrap(visual.borderColor[index])
  const fallback = unified ?? fg

  return {
    top: unwrap(visual.borderColorTop[index]) ?? fallback,
    right: unwrap(visual.borderColorRight[index]) ?? fallback,
    bottom: unwrap(visual.borderColorBottom[index]) ?? fallback,
    left: unwrap(visual.borderColorLeft[index]) ?? fallback,
  }
}

/**
 * Get all four border styles for a component.
 * Falls back to the unified borderStyle if per-side not set.
 */
export function getBorderStyles(index: number): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const unified = unwrap(visual.borderStyle[index]) || 0

  return {
    top: unwrap(visual.borderTop[index]) || unified,
    right: unwrap(visual.borderRight[index]) || unified,
    bottom: unwrap(visual.borderBottom[index]) || unified,
    left: unwrap(visual.borderLeft[index]) || unified,
  }
}

/**
 * Check if a component has any border.
 */
export function hasBorder(index: number): boolean {
  const styles = getBorderStyles(index)
  return styles.top > 0 || styles.right > 0 || styles.bottom > 0 || styles.left > 0
}

/**
 * Get effective opacity by multiplying down the parent chain.
 */
export function getEffectiveOpacity(index: number): number {
  let opacity = 1
  let current: number | undefined = index

  while (current !== undefined && current >= 0) {
    const nodeOpacity = unwrap(visual.opacity[current])
    if (nodeOpacity !== undefined && nodeOpacity !== 1) {
      opacity *= nodeOpacity
    }
    current = unwrap(core.parentIndex[current])
  }

  return opacity
}
