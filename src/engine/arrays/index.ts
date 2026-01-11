/**
 * TUI Framework - Parallel Arrays
 *
 * All component state lives in these parallel arrays.
 * Each array index corresponds to one component.
 *
 * Components write directly to these arrays using setSource().
 * Deriveds read from these arrays directly (no unwrap needed).
 *
 * All arrays use slotArray for stable reactive cells that NEVER get replaced.
 * This fixes the bind() tracking bug where deriveds miss updates.
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

import { type SlotArray } from '@rlabs-inc/signals'
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

/** Clear all slots in a SlotArray (slots are stable, just reset to defaults) */
function clearSlotArray<T>(arr: SlotArray<T>): void {
  for (let i = 0; i < arr.length; i++) {
    arr.clear(i)
  }
}

/**
 * Reset all parallel arrays to release memory.
 * Called automatically when all components are destroyed (allocatedIndices.size === 0).
 * This is the "reset on zero" cleanup - no manual API needed!
 *
 * SlotArrays are stable - we just clear them to defaults.
 */
export function resetAllArrays(): void {
  // Core arrays (componentType is plain array, rest are slotArrays)
  core.componentType.length = 0
  clearSlotArray(core.parentIndex)
  clearSlotArray(core.visible)
  clearSlotArray(core.componentId)

  // Dimension arrays (all slotArrays)
  clearSlotArray(dimensions.width)
  clearSlotArray(dimensions.height)
  clearSlotArray(dimensions.minWidth)
  clearSlotArray(dimensions.minHeight)
  clearSlotArray(dimensions.maxWidth)
  clearSlotArray(dimensions.maxHeight)

  // Spacing arrays (all slotArrays)
  clearSlotArray(spacing.marginTop)
  clearSlotArray(spacing.marginRight)
  clearSlotArray(spacing.marginBottom)
  clearSlotArray(spacing.marginLeft)
  clearSlotArray(spacing.paddingTop)
  clearSlotArray(spacing.paddingRight)
  clearSlotArray(spacing.paddingBottom)
  clearSlotArray(spacing.paddingLeft)
  clearSlotArray(spacing.gap)
  clearSlotArray(spacing.rowGap)
  clearSlotArray(spacing.columnGap)

  // Layout arrays (all slotArrays)
  clearSlotArray(layout.flexDirection)
  clearSlotArray(layout.flexWrap)
  clearSlotArray(layout.justifyContent)
  clearSlotArray(layout.alignItems)
  clearSlotArray(layout.alignContent)
  clearSlotArray(layout.flexGrow)
  clearSlotArray(layout.flexShrink)
  clearSlotArray(layout.flexBasis)
  clearSlotArray(layout.alignSelf)
  clearSlotArray(layout.order)
  clearSlotArray(layout.position)
  clearSlotArray(layout.top)
  clearSlotArray(layout.right)
  clearSlotArray(layout.bottom)
  clearSlotArray(layout.left)
  clearSlotArray(layout.borderTop)
  clearSlotArray(layout.borderRight)
  clearSlotArray(layout.borderBottom)
  clearSlotArray(layout.borderLeft)
  clearSlotArray(layout.zIndex)
  clearSlotArray(layout.overflow)

  // Visual arrays (all slotArrays)
  clearSlotArray(visual.fgColor)
  clearSlotArray(visual.bgColor)
  clearSlotArray(visual.opacity)
  clearSlotArray(visual.borderStyle)
  clearSlotArray(visual.borderColor)
  clearSlotArray(visual.borderTop)
  clearSlotArray(visual.borderRight)
  clearSlotArray(visual.borderBottom)
  clearSlotArray(visual.borderLeft)
  clearSlotArray(visual.borderColorTop)
  clearSlotArray(visual.borderColorRight)
  clearSlotArray(visual.borderColorBottom)
  clearSlotArray(visual.borderColorLeft)
  clearSlotArray(visual.showFocusRing)
  clearSlotArray(visual.focusRingColor)

  // Text arrays (all slotArrays)
  clearSlotArray(text.textContent)
  clearSlotArray(text.textAttrs)
  clearSlotArray(text.textAlign)
  clearSlotArray(text.textWrap)
  clearSlotArray(text.ellipsis)

  // Interaction arrays (all slotArrays)
  clearSlotArray(interaction.scrollOffsetX)
  clearSlotArray(interaction.scrollOffsetY)
  clearSlotArray(interaction.focusable)
  clearSlotArray(interaction.tabIndex)
  clearSlotArray(interaction.hovered)
  clearSlotArray(interaction.pressed)
  clearSlotArray(interaction.mouseEnabled)
  clearSlotArray(interaction.cursorPosition)
  clearSlotArray(interaction.selectionStart)
  clearSlotArray(interaction.selectionEnd)
}
