/**
 * TUI Framework - Box Primitive
 *
 * Container component with flexbox layout, borders, and background.
 * Children inherit parent context automatically.
 *
 * REACTIVITY: Props are passed directly to bind() to preserve reactive links.
 * Don't extract values before binding - that breaks the connection!
 *
 * Usage:
 * ```ts
 * const width = signal(40)
 * box({
 *   width,  // Reactive! Changes to width.value update the UI
 *   height: 10,  // Static
 *   border: 1,
 *   children: () => {
 *     text({ content: 'Hello!' })
 *   }
 * })
 * ```
 */

import { bind, derived } from '@rlabs-inc/signals'
import { ComponentType } from '../types'
import {
  allocateIndex,
  releaseIndex,
  getCurrentParentIndex,
  pushParentContext,
  popParentContext,
} from '../engine/registry'
import { cleanupIndex as cleanupKeyboardListeners } from '../state/keyboard'
import { getVariantStyle } from '../state/theme'

// Import arrays
import * as core from '../engine/arrays/core'
import * as dimensions from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as layout from '../engine/arrays/layout'
import * as visual from '../engine/arrays/visual'
import * as interaction from '../engine/arrays/interaction'

// Import types
import type { BoxProps, Cleanup } from './types'

// =============================================================================
// HELPERS - For enum conversions only, not for extracting values!
// =============================================================================

/** Convert flex direction string to number */
function flexDirectionToNum(dir: string | undefined): number {
  switch (dir) {
    case 'row': return 1
    case 'column-reverse': return 2
    case 'row-reverse': return 3
    default: return 0 // column
  }
}

/** Convert flex wrap string to number */
function flexWrapToNum(wrap: string | undefined): number {
  switch (wrap) {
    case 'wrap': return 1
    case 'wrap-reverse': return 2
    default: return 0 // nowrap
  }
}

/** Convert justify content string to number */
function justifyToNum(justify: string | undefined): number {
  switch (justify) {
    case 'center': return 1
    case 'flex-end': return 2
    case 'space-between': return 3
    case 'space-around': return 4
    case 'space-evenly': return 5
    default: return 0 // flex-start
  }
}

/** Convert align items string to number */
function alignToNum(align: string | undefined): number {
  switch (align) {
    case 'flex-start': return 1
    case 'center': return 2
    case 'flex-end': return 3
    case 'baseline': return 4
    default: return 0 // stretch
  }
}

/** Convert overflow string to number */
function overflowToNum(overflow: string | undefined): number {
  switch (overflow) {
    case 'hidden': return 1
    case 'scroll': return 2
    case 'auto': return 3
    default: return 0 // visible
  }
}

/** Convert align-self string to number (0 = auto) */
function alignSelfToNum(align: string | undefined): number {
  switch (align) {
    case 'stretch': return 1
    case 'flex-start': return 2
    case 'center': return 3
    case 'flex-end': return 4
    case 'baseline': return 5
    default: return 0 // auto (use parent's alignItems)
  }
}

/**
 * Create a reactive binding for enum props.
 * If the prop is a signal/derived, creates a derived that tracks changes.
 * If static, just converts directly.
 */
function bindEnumProp<T extends string>(
  prop: T | { value: T } | undefined,
  converter: (val: T | undefined) => number
): ReturnType<typeof bind<number>> {
  // If it's reactive (has .value), create a derived to track it
  if (prop !== undefined && typeof prop === 'object' && prop !== null && 'value' in prop) {
    return bind(derived(() => converter((prop as { value: T }).value)))
  }
  // Static value - just convert
  return bind(converter(prop as T | undefined))
}

/** Get static boolean for visible prop */
function getStaticBool(prop: unknown, defaultVal: boolean): boolean {
  if (prop === undefined) return defaultVal
  if (typeof prop === 'boolean') return prop
  if (typeof prop === 'object' && prop !== null && 'value' in prop) {
    return (prop as { value: boolean }).value
  }
  return defaultVal
}

// =============================================================================
// BOX COMPONENT
// =============================================================================

/**
 * Create a box container component.
 *
 * Boxes are the building blocks of layouts. They can:
 * - Have borders and backgrounds
 * - Use flexbox for child layout
 * - Contain other components as children
 * - Scroll their content
 *
 * Pass signals directly for reactive props - they stay connected!
 */
export function box(props: BoxProps = {}): Cleanup {
  const index = allocateIndex(props.id)

  // ==========================================================================
  // CORE - Always needed
  // ==========================================================================
  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(getCurrentParentIndex())

  // Visible - only bind if passed (default is visible, handled by TITAN)
  if (props.visible !== undefined) {
    core.visible[index] = bind(props.visible)
  }

  // ==========================================================================
  // DIMENSIONS - Only bind what's passed (TITAN uses ?? 0 for undefined)
  // ==========================================================================
  if (props.width !== undefined) dimensions.width[index] = bind(props.width)
  if (props.height !== undefined) dimensions.height[index] = bind(props.height)
  if (props.minWidth !== undefined) dimensions.minWidth[index] = bind(props.minWidth)
  if (props.maxWidth !== undefined) dimensions.maxWidth[index] = bind(props.maxWidth)
  if (props.minHeight !== undefined) dimensions.minHeight[index] = bind(props.minHeight)
  if (props.maxHeight !== undefined) dimensions.maxHeight[index] = bind(props.maxHeight)

  // ==========================================================================
  // PADDING - Shorthand support: padding sets all 4, individual overrides
  // ==========================================================================
  if (props.padding !== undefined) {
    // Shorthand - set all 4 sides
    spacing.paddingTop[index] = bind(props.paddingTop ?? props.padding)
    spacing.paddingRight[index] = bind(props.paddingRight ?? props.padding)
    spacing.paddingBottom[index] = bind(props.paddingBottom ?? props.padding)
    spacing.paddingLeft[index] = bind(props.paddingLeft ?? props.padding)
  } else {
    // Individual only - bind only what's passed
    if (props.paddingTop !== undefined) spacing.paddingTop[index] = bind(props.paddingTop)
    if (props.paddingRight !== undefined) spacing.paddingRight[index] = bind(props.paddingRight)
    if (props.paddingBottom !== undefined) spacing.paddingBottom[index] = bind(props.paddingBottom)
    if (props.paddingLeft !== undefined) spacing.paddingLeft[index] = bind(props.paddingLeft)
  }

  // ==========================================================================
  // MARGIN - Shorthand support: margin sets all 4, individual overrides
  // ==========================================================================
  if (props.margin !== undefined) {
    // Shorthand - set all 4 sides
    spacing.marginTop[index] = bind(props.marginTop ?? props.margin)
    spacing.marginRight[index] = bind(props.marginRight ?? props.margin)
    spacing.marginBottom[index] = bind(props.marginBottom ?? props.margin)
    spacing.marginLeft[index] = bind(props.marginLeft ?? props.margin)
  } else {
    // Individual only - bind only what's passed
    if (props.marginTop !== undefined) spacing.marginTop[index] = bind(props.marginTop)
    if (props.marginRight !== undefined) spacing.marginRight[index] = bind(props.marginRight)
    if (props.marginBottom !== undefined) spacing.marginBottom[index] = bind(props.marginBottom)
    if (props.marginLeft !== undefined) spacing.marginLeft[index] = bind(props.marginLeft)
  }

  // Gap - only bind if passed
  if (props.gap !== undefined) spacing.gap[index] = bind(props.gap)

  // ==========================================================================
  // LAYOUT - Only bind what's passed (TITAN uses sensible defaults)
  // ==========================================================================
  if (props.flexDirection !== undefined) layout.flexDirection[index] = bindEnumProp(props.flexDirection, flexDirectionToNum)
  if (props.flexWrap !== undefined) layout.flexWrap[index] = bindEnumProp(props.flexWrap, flexWrapToNum)
  if (props.justifyContent !== undefined) layout.justifyContent[index] = bindEnumProp(props.justifyContent, justifyToNum)
  if (props.alignItems !== undefined) layout.alignItems[index] = bindEnumProp(props.alignItems, alignToNum)
  if (props.overflow !== undefined) layout.overflow[index] = bindEnumProp(props.overflow, overflowToNum)
  if (props.grow !== undefined) layout.flexGrow[index] = bind(props.grow)
  if (props.shrink !== undefined) layout.flexShrink[index] = bind(props.shrink)
  if (props.flexBasis !== undefined) layout.flexBasis[index] = bind(props.flexBasis)
  if (props.zIndex !== undefined) layout.zIndex[index] = bind(props.zIndex)
  if (props.alignSelf !== undefined) layout.alignSelf[index] = bindEnumProp(props.alignSelf, alignSelfToNum)

  // ==========================================================================
  // INTERACTION - Only bind if focusable
  // ==========================================================================
  if (props.focusable) {
    interaction.focusable[index] = bind(1)
    if (props.tabIndex !== undefined) interaction.tabIndex[index] = bind(props.tabIndex)
  }

  // ==========================================================================
  // VISUAL - Colors and borders (only bind what's passed)
  // ==========================================================================
  if (props.variant && props.variant !== 'default') {
    // Variant colors - create deriveds that track theme changes
    const variantFg = derived(() => getVariantStyle(props.variant!).fg)
    const variantBg = derived(() => getVariantStyle(props.variant!).bg)
    const variantBorder = derived(() => getVariantStyle(props.variant!).border)
    visual.fgColor[index] = bind(props.fg ?? variantFg)
    visual.bgColor[index] = bind(props.bg ?? variantBg)
    visual.borderColor[index] = bind(props.borderColor ?? variantBorder)
  } else {
    // Direct colors - only bind if passed
    if (props.fg !== undefined) visual.fgColor[index] = bind(props.fg)
    if (props.bg !== undefined) visual.bgColor[index] = bind(props.bg)
    if (props.borderColor !== undefined) visual.borderColor[index] = bind(props.borderColor)
  }
  if (props.opacity !== undefined) visual.opacity[index] = bind(props.opacity)

  // Border style - shorthand and individual
  if (props.border !== undefined) visual.borderStyle[index] = bind(props.border)
  if (props.borderTop !== undefined) visual.borderTop[index] = bind(props.borderTop)
  if (props.borderRight !== undefined) visual.borderRight[index] = bind(props.borderRight)
  if (props.borderBottom !== undefined) visual.borderBottom[index] = bind(props.borderBottom)
  if (props.borderLeft !== undefined) visual.borderLeft[index] = bind(props.borderLeft)

  // Render children with this box as parent context
  if (props.children) {
    pushParentContext(index)
    try {
      props.children()
    } finally {
      popParentContext()
    }
  }

  // Cleanup function
  return () => {
    cleanupKeyboardListeners(index)  // Remove any focused key handlers
    releaseIndex(index)
  }
}
