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

  // Internal state
  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(getCurrentParentIndex())

  // Visible - bind directly, pipeline will handle truthy/falsy
  // If it's a signal/derived, bind preserves the link
  // We store as-is and check truthiness in pipeline
  core.visible[index] = bind(props.visible ?? true)

  // Dimensions - BIND DIRECTLY to preserve reactive link!
  dimensions.width[index] = bind(props.width ?? 0)
  dimensions.height[index] = bind(props.height ?? 0)
  dimensions.minWidth[index] = bind(props.minWidth ?? 0)
  dimensions.maxWidth[index] = bind(props.maxWidth ?? 0)
  dimensions.minHeight[index] = bind(props.minHeight ?? 0)
  dimensions.maxHeight[index] = bind(props.maxHeight ?? 0)

  // Padding - BIND DIRECTLY
  const defaultPad = typeof props.padding === 'number' ? props.padding : 0
  spacing.paddingTop[index] = bind(props.paddingTop ?? props.padding ?? 0)
  spacing.paddingRight[index] = bind(props.paddingRight ?? props.padding ?? 0)
  spacing.paddingBottom[index] = bind(props.paddingBottom ?? props.padding ?? 0)
  spacing.paddingLeft[index] = bind(props.paddingLeft ?? props.padding ?? 0)

  // Margin - BIND DIRECTLY
  spacing.marginTop[index] = bind(props.marginTop ?? props.margin ?? 0)
  spacing.marginRight[index] = bind(props.marginRight ?? props.margin ?? 0)
  spacing.marginBottom[index] = bind(props.marginBottom ?? props.margin ?? 0)
  spacing.marginLeft[index] = bind(props.marginLeft ?? props.margin ?? 0)

  // Gap - BIND DIRECTLY
  spacing.gap[index] = bind(props.gap ?? 0)

  // Layout enums - reactive via bindEnumProp (tracks signal changes)
  layout.flexDirection[index] = bindEnumProp(props.flexDirection, flexDirectionToNum)
  layout.flexWrap[index] = bindEnumProp(props.flexWrap, flexWrapToNum)
  layout.justifyContent[index] = bindEnumProp(props.justifyContent, justifyToNum)
  layout.alignItems[index] = bindEnumProp(props.alignItems, alignToNum)
  layout.overflow[index] = bindEnumProp(props.overflow, overflowToNum)

  // Layout numbers - BIND DIRECTLY
  layout.flexGrow[index] = bind(props.grow ?? 0)
  layout.flexShrink[index] = bind(props.shrink ?? 1)
  layout.zIndex[index] = bind(props.zIndex ?? 0)

  // NOTE: scrollable is computed by TITAN based on overflow prop + content size
  // No need to set it here - TITAN handles overflow: 'scroll' and 'auto'

  // Interaction - focus - BIND DIRECTLY!
  interaction.focusable[index] = bind(props.focusable ? 1 : 0)
  interaction.tabIndex[index] = bind(props.tabIndex ?? 0)

  // Visual - colors with VARIANT support
  // If variant specified, create deriveds that track theme changes
  // User-specified colors override variant colors
  if (props.variant && props.variant !== 'default') {
    // Create reactive deriveds for variant colors
    // These will update when theme changes!
    const variantFg = derived(() => getVariantStyle(props.variant!).fg)
    const variantBg = derived(() => getVariantStyle(props.variant!).bg)
    const variantBorder = derived(() => getVariantStyle(props.variant!).border)

    visual.fgColor[index] = bind(props.fg ?? variantFg)
    visual.bgColor[index] = bind(props.bg ?? variantBg)
    visual.borderColor[index] = bind(props.borderColor ?? variantBorder)
  } else {
    // No variant - use props directly
    visual.fgColor[index] = bind(props.fg ?? null)
    visual.bgColor[index] = bind(props.bg ?? null)
    visual.borderColor[index] = bind(props.borderColor ?? null)
  }
  visual.opacity[index] = bind(props.opacity ?? 1)

  // Visual - border style
  visual.borderStyle[index] = bind(props.border ?? 0)
  visual.borderTop[index] = bind(props.borderTop ?? 0)
  visual.borderRight[index] = bind(props.borderRight ?? 0)
  visual.borderBottom[index] = bind(props.borderBottom ?? 0)
  visual.borderLeft[index] = bind(props.borderLeft ?? 0)

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
