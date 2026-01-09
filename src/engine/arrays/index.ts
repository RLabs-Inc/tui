/**
 * TUI Framework - Parallel Arrays
 *
 * All component state lives in these parallel arrays.
 * Each array index corresponds to one component.
 *
 * Components write directly to these arrays.
 * Deriveds read from these arrays and RETURN computed values.
 *
 * Array categories:
 * - core: Component type, parent, visibility
 * - dimensions: Width, height, min/max constraints
 * - spacing: Margin, padding, gap
 * - layout: Flexbox properties, positioning
 * - visual: Colors, borders, opacity
 * - text: Text content and styling
 * - interaction: Scroll, focus, mouse state
 */

export * as core from './core'
export * as dimensions from './dimensions'
export * as spacing from './spacing'
export * as layout from './layout'
export * as visual from './visual'
export * as text from './text'
export * as interaction from './interaction'

import { disconnectBinding } from '@rlabs-inc/signals'
import * as core from './core'
import * as dimensions from './dimensions'
import * as spacing from './spacing'
import * as layout from './layout'
import * as visual from './visual'
import * as text from './text'
import * as interaction from './interaction'

/**
 * Ensure all arrays have capacity for the given index.
 * Called by registry when allocating.
 */
export function ensureAllCapacity(index: number): void {
  core.ensureCapacity(index)
  dimensions.ensureCapacity(index)
  spacing.ensureCapacity(index)
  layout.ensureCapacity(index)
  visual.ensureCapacity(index)
  text.ensureCapacity(index)
  interaction.ensureCapacity(index)
}

/**
 * Clear all array values at an index.
 * Called by registry when releasing.
 */
export function clearAllAtIndex(index: number): void {
  core.clearAtIndex(index)
  dimensions.clearAtIndex(index)
  spacing.clearAtIndex(index)
  layout.clearAtIndex(index)
  visual.clearAtIndex(index)
  text.clearAtIndex(index)
  interaction.clearAtIndex(index)
}

/** Disconnect all bindings in an array before truncating */
function disconnectArray(arr: unknown[]): void {
  for (let i = 0; i < arr.length; i++) {
    disconnectBinding(arr[i] as any)
  }
  arr.length = 0
}

/**
 * Reset all parallel arrays to release memory.
 * Called automatically when all components are destroyed (allocatedIndices.size === 0).
 * This is the "reset on zero" cleanup - no manual API needed!
 *
 * IMPORTANT: Disconnects all bindings before truncating to break circular refs.
 */
export function resetAllArrays(): void {
  // Core arrays
  core.componentType.length = 0
  disconnectArray(core.parentIndex)
  disconnectArray(core.visible)
  disconnectArray(core.componentId)

  // Dimension arrays
  disconnectArray(dimensions.width)
  disconnectArray(dimensions.height)
  disconnectArray(dimensions.minWidth)
  disconnectArray(dimensions.minHeight)
  disconnectArray(dimensions.maxWidth)
  disconnectArray(dimensions.maxHeight)

  // Spacing arrays
  disconnectArray(spacing.marginTop)
  disconnectArray(spacing.marginRight)
  disconnectArray(spacing.marginBottom)
  disconnectArray(spacing.marginLeft)
  disconnectArray(spacing.paddingTop)
  disconnectArray(spacing.paddingRight)
  disconnectArray(spacing.paddingBottom)
  disconnectArray(spacing.paddingLeft)
  disconnectArray(spacing.gap)
  disconnectArray(spacing.rowGap)
  disconnectArray(spacing.columnGap)

  // Layout arrays
  disconnectArray(layout.flexDirection)
  disconnectArray(layout.flexWrap)
  disconnectArray(layout.justifyContent)
  disconnectArray(layout.alignItems)
  disconnectArray(layout.alignContent)
  disconnectArray(layout.flexGrow)
  disconnectArray(layout.flexShrink)
  disconnectArray(layout.flexBasis)
  disconnectArray(layout.alignSelf)
  disconnectArray(layout.order)
  disconnectArray(layout.position)
  disconnectArray(layout.top)
  disconnectArray(layout.right)
  disconnectArray(layout.bottom)
  disconnectArray(layout.left)
  disconnectArray(layout.borderTop)
  disconnectArray(layout.borderRight)
  disconnectArray(layout.borderBottom)
  disconnectArray(layout.borderLeft)
  disconnectArray(layout.zIndex)
  disconnectArray(layout.overflow)

  // Visual arrays
  disconnectArray(visual.fgColor)
  disconnectArray(visual.bgColor)
  disconnectArray(visual.opacity)
  disconnectArray(visual.borderStyle)
  disconnectArray(visual.borderColor)
  disconnectArray(visual.borderTop)
  disconnectArray(visual.borderRight)
  disconnectArray(visual.borderBottom)
  disconnectArray(visual.borderLeft)
  disconnectArray(visual.borderColorTop)
  disconnectArray(visual.borderColorRight)
  disconnectArray(visual.borderColorBottom)
  disconnectArray(visual.borderColorLeft)
  disconnectArray(visual.showFocusRing)
  disconnectArray(visual.focusRingColor)

  // Text arrays
  disconnectArray(text.textContent)
  disconnectArray(text.textAttrs)
  disconnectArray(text.textAlign)
  disconnectArray(text.textWrap)
  disconnectArray(text.ellipsis)

  // Interaction arrays
  disconnectArray(interaction.scrollOffsetX)
  disconnectArray(interaction.scrollOffsetY)
  disconnectArray(interaction.focusable)
  disconnectArray(interaction.tabIndex)
  disconnectArray(interaction.hovered)
  disconnectArray(interaction.pressed)
  disconnectArray(interaction.mouseEnabled)
  disconnectArray(interaction.cursorPosition)
  disconnectArray(interaction.selectionStart)
  disconnectArray(interaction.selectionEnd)
}
