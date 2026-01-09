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

import { bind, BINDING_SYMBOL } from '@rlabs-inc/signals'
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
 * Create a binding for enum props that converts at read time.
 * No derived needed - reads signal directly and converts inline.
 * This creates dependency directly on user's signal, no intermediate objects.
 */
function bindEnumProp<T extends string>(
  prop: T | { value: T } | undefined,
  converter: (val: T | undefined) => number
): ReturnType<typeof bind<number>> {
  // If it's reactive (has .value), create binding that converts at read time
  if (prop !== undefined && typeof prop === 'object' && prop !== null && 'value' in prop) {
    const reactiveSource = prop as { value: T }
    return {
      [BINDING_SYMBOL]: true,
      get value(): number {
        return converter(reactiveSource.value)
      },
      set value(_: number) {
        // Enum props are read-only from number side
      },
    } as unknown as ReturnType<typeof bind<number>>
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

  // ==========================================================================
  // CORE - Always needed
  // ==========================================================================
  core.componentType[index] = ComponentType.TEXT
  core.parentIndex[index] = bind(getCurrentParentIndex())

  // Visible - only bind if passed
  if (props.visible !== undefined) {
    core.visible[index] = bind(props.visible)
  }

  // ==========================================================================
  // TEXT CONTENT - Always needed (this is a text component!)
  // ==========================================================================
  textArrays.textContent[index] = bind(props.content)

  // Text styling - only bind if passed
  if (props.attrs !== undefined) textArrays.textAttrs[index] = bind(props.attrs)
  if (props.align !== undefined) textArrays.textAlign[index] = bindEnumProp(props.align, alignToNum)
  if (props.wrap !== undefined) textArrays.textWrap[index] = bindEnumProp(props.wrap, wrapToNum)

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
  // PADDING - Shorthand support
  // ==========================================================================
  if (props.padding !== undefined) {
    spacing.paddingTop[index] = bind(props.paddingTop ?? props.padding)
    spacing.paddingRight[index] = bind(props.paddingRight ?? props.padding)
    spacing.paddingBottom[index] = bind(props.paddingBottom ?? props.padding)
    spacing.paddingLeft[index] = bind(props.paddingLeft ?? props.padding)
  } else {
    if (props.paddingTop !== undefined) spacing.paddingTop[index] = bind(props.paddingTop)
    if (props.paddingRight !== undefined) spacing.paddingRight[index] = bind(props.paddingRight)
    if (props.paddingBottom !== undefined) spacing.paddingBottom[index] = bind(props.paddingBottom)
    if (props.paddingLeft !== undefined) spacing.paddingLeft[index] = bind(props.paddingLeft)
  }

  // ==========================================================================
  // FLEX ITEM - Only bind if passed (text can be a flex item)
  // ==========================================================================
  if (props.grow !== undefined) layout.flexGrow[index] = bind(props.grow)
  if (props.shrink !== undefined) layout.flexShrink[index] = bind(props.shrink)
  if (props.flexBasis !== undefined) layout.flexBasis[index] = bind(props.flexBasis)
  if (props.alignSelf !== undefined) layout.alignSelf[index] = bind(props.alignSelf)

  // ==========================================================================
  // VISUAL - Colors with variant support (only bind what's needed)
  // ==========================================================================
  if (props.variant && props.variant !== 'default') {
    // Variant colors - inline bindings that read theme at read time (no deriveds!)
    const variant = props.variant
    if (props.fg !== undefined) {
      visual.fgColor[index] = bind(props.fg)
    } else {
      visual.fgColor[index] = {
        [BINDING_SYMBOL]: true,
        get value() { return getVariantStyle(variant).fg },
        set value(_) {},
      } as any
    }
    if (props.bg !== undefined) {
      visual.bgColor[index] = bind(props.bg)
    } else {
      visual.bgColor[index] = {
        [BINDING_SYMBOL]: true,
        get value() { return getVariantStyle(variant).bg },
        set value(_) {},
      } as any
    }
  } else {
    // Direct colors - only bind if passed
    if (props.fg !== undefined) visual.fgColor[index] = bind(props.fg)
    if (props.bg !== undefined) visual.bgColor[index] = bind(props.bg)
  }
  if (props.opacity !== undefined) visual.opacity[index] = bind(props.opacity)

  // Cleanup function
  return () => {
    cleanupKeyboardListeners(index)
    releaseIndex(index)
  }
}
