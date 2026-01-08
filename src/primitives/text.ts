/**
 * TUI Framework - Text Primitive
 *
 * Display text with styling, alignment, and wrapping.
 *
 * REACTIVITY: Props are passed directly to bind() to preserve reactive links.
 * Don't extract values before binding - that breaks the connection!
 *
 * Usage:
 * ```ts
 * // Static text
 * text({ content: 'Hello, World!' })
 *
 * // Reactive text - pass the signal directly!
 * const message = signal('Hello')
 * text({ content: message })
 * message.value = 'Updated!'  // UI reacts automatically!
 *
 * // Reactive with derived
 * const count = signal(0)
 * const countText = derived(() => `Count: ${count.value}`)
 * text({ content: countText })
 * ```
 */

import { bind, derived } from '@rlabs-inc/signals'
import { ComponentType, Attr } from '../types'
import { allocateIndex, releaseIndex, getCurrentParentIndex } from '../engine/registry'
import { cleanupIndex as cleanupKeyboardListeners } from '../state/keyboard'
import { getVariantStyle } from '../state/theme'

// Import arrays
import * as core from '../engine/arrays/core'
import * as dimensions from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as layout from '../engine/arrays/layout'
import * as visual from '../engine/arrays/visual'
import * as textArrays from '../engine/arrays/text'

// Import types
import type { TextProps, Cleanup } from './types'

// =============================================================================
// HELPERS - For enum conversions with reactive support!
// =============================================================================

/** Convert align string to number */
function alignToNum(align: string | undefined): number {
  switch (align) {
    case 'center': return 1
    case 'right': return 2
    default: return 0 // left
  }
}

/** Convert wrap string to number */
function wrapToNum(wrap: string | undefined): number {
  switch (wrap) {
    case 'nowrap': return 0
    case 'truncate': return 2
    default: return 1 // wrap
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

// =============================================================================
// TEXT COMPONENT
// =============================================================================

/**
 * Create a text display component.
 *
 * Pass signals directly for reactive content - they stay connected!
 * The pipeline reads via unwrap() which tracks dependencies.
 *
 * Supports all theme variants:
 * - Core: default, primary, secondary, tertiary, accent
 * - Status: success, warning, error, info
 * - Surface: muted, surface, elevated, ghost, outline
 */
export function text(props: TextProps): Cleanup {
  const index = allocateIndex()

  // Component metadata
  core.componentType[index] = ComponentType.TEXT
  core.parentIndex[index] = bind(getCurrentParentIndex())
  core.visible[index] = bind(props.visible ?? true)

  // TEXT CONTENT - BIND DIRECTLY to preserve reactive link!
  textArrays.textContent[index] = bind(props.content)

  // Text styling - use bindEnumProp for reactive enum support!
  textArrays.textAttrs[index] = bind(props.attrs ?? Attr.NONE)
  textArrays.textAlign[index] = bindEnumProp(props.align, alignToNum)
  textArrays.textWrap[index] = bindEnumProp(props.wrap, wrapToNum)

  // Dimensions - BIND DIRECTLY
  dimensions.width[index] = bind(props.width ?? 0)
  dimensions.height[index] = bind(props.height ?? 0)
  dimensions.minWidth[index] = bind(props.minWidth ?? 0)
  dimensions.maxWidth[index] = bind(props.maxWidth ?? 0)
  dimensions.minHeight[index] = bind(props.minHeight ?? 0)
  dimensions.maxHeight[index] = bind(props.maxHeight ?? 0)

  // Padding - BIND DIRECTLY
  spacing.paddingTop[index] = bind(props.paddingTop ?? props.padding ?? 0)
  spacing.paddingRight[index] = bind(props.paddingRight ?? props.padding ?? 0)
  spacing.paddingBottom[index] = bind(props.paddingBottom ?? props.padding ?? 0)
  spacing.paddingLeft[index] = bind(props.paddingLeft ?? props.padding ?? 0)

  // Flex item properties - text can be a flex item too!
  layout.flexGrow[index] = bind(0)
  layout.flexShrink[index] = bind(1)
  layout.flexBasis[index] = bind(0)
  layout.alignSelf[index] = bind(0)

  // Visual - colors with VARIANT support (all 14 variants!)
  // If variant specified, create deriveds that track theme changes
  // User-specified colors override variant colors
  // Variants: default, primary, secondary, tertiary, accent,
  //           success, warning, error, info,
  //           muted, surface, elevated, ghost, outline
  if (props.variant && props.variant !== 'default') {
    // Create reactive deriveds for variant colors
    // These will update when theme changes!
    const variantFg = derived(() => getVariantStyle(props.variant!).fg)
    const variantBg = derived(() => getVariantStyle(props.variant!).bg)

    visual.fgColor[index] = bind(props.fg ?? variantFg)
    visual.bgColor[index] = bind(props.bg ?? variantBg)
  } else {
    // No variant - use props directly
    visual.fgColor[index] = bind(props.fg ?? null)
    visual.bgColor[index] = bind(props.bg ?? null)
  }
  visual.opacity[index] = bind(props.opacity ?? 1)

  // Cleanup function
  return () => {
    cleanupKeyboardListeners(index)  // Remove any focused key handlers
    releaseIndex(index)
  }
}
