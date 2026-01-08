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

/**
 * Reset all parallel arrays to release memory.
 * Called automatically when all components are destroyed (allocatedIndices.size === 0).
 * This is the "reset on zero" cleanup - no manual API needed!
 */
export function resetAllArrays(): void {
  // Core arrays
  core.componentType.length = 0
  core.parentIndex.length = 0
  core.visible.length = 0
  core.componentId.length = 0

  // Dimension arrays
  dimensions.width.length = 0
  dimensions.height.length = 0
  dimensions.minWidth.length = 0
  dimensions.minHeight.length = 0
  dimensions.maxWidth.length = 0
  dimensions.maxHeight.length = 0

  // Spacing arrays
  spacing.marginTop.length = 0
  spacing.marginRight.length = 0
  spacing.marginBottom.length = 0
  spacing.marginLeft.length = 0
  spacing.paddingTop.length = 0
  spacing.paddingRight.length = 0
  spacing.paddingBottom.length = 0
  spacing.paddingLeft.length = 0
  spacing.gap.length = 0
  spacing.rowGap.length = 0
  spacing.columnGap.length = 0

  // Layout arrays
  layout.flexDirection.length = 0
  layout.flexWrap.length = 0
  layout.justifyContent.length = 0
  layout.alignItems.length = 0
  layout.alignContent.length = 0
  layout.flexGrow.length = 0
  layout.flexShrink.length = 0
  layout.flexBasis.length = 0
  layout.alignSelf.length = 0
  layout.order.length = 0
  layout.position.length = 0
  layout.top.length = 0
  layout.right.length = 0
  layout.bottom.length = 0
  layout.left.length = 0
  layout.borderTop.length = 0
  layout.borderRight.length = 0
  layout.borderBottom.length = 0
  layout.borderLeft.length = 0
  layout.zIndex.length = 0
  layout.overflow.length = 0

  // Visual arrays
  visual.fgColor.length = 0
  visual.bgColor.length = 0
  visual.opacity.length = 0
  visual.borderStyle.length = 0
  visual.borderColor.length = 0
  visual.borderTop.length = 0
  visual.borderRight.length = 0
  visual.borderBottom.length = 0
  visual.borderLeft.length = 0
  visual.borderColorTop.length = 0
  visual.borderColorRight.length = 0
  visual.borderColorBottom.length = 0
  visual.borderColorLeft.length = 0
  visual.showFocusRing.length = 0
  visual.focusRingColor.length = 0

  // Text arrays
  text.textContent.length = 0
  text.textAttrs.length = 0
  text.textAlign.length = 0
  text.textWrap.length = 0
  text.ellipsis.length = 0

  // Interaction arrays (scroll offsets only - scrollable/max are computed by TITAN)
  interaction.scrollOffsetX.length = 0
  interaction.scrollOffsetY.length = 0
  interaction.focusable.length = 0
  interaction.tabIndex.length = 0
  interaction.hovered.length = 0
  interaction.pressed.length = 0
  interaction.mouseEnabled.length = 0
  interaction.cursorPosition.length = 0
  interaction.selectionStart.length = 0
  interaction.selectionEnd.length = 0
}
