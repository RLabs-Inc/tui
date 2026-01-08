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

import { bind } from '@rlabs-inc/signals'
import { ComponentType, Attr } from '../types'
import { allocateIndex, releaseIndex, getCurrentParentIndex } from '../engine/registry'
import { cleanupIndex as cleanupKeyboardListeners } from '../state/keyboard'

// Import arrays
import * as core from '../engine/arrays/core'
import * as dimensions from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as visual from '../engine/arrays/visual'
import * as textArrays from '../engine/arrays/text'

// Import types
import type { TextProps, Cleanup } from './types'

// =============================================================================
// HELPERS - For enum conversions only!
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

/** Get static string for enum conversion */
function getStaticString(prop: unknown): string | undefined {
  if (prop === undefined) return undefined
  if (typeof prop === 'string') return prop
  if (typeof prop === 'object' && prop !== null && 'value' in prop) {
    return (prop as { value: string }).value
  }
  return undefined
}

/** Get static boolean */
function getStaticBool(prop: unknown, defaultVal: boolean): boolean {
  if (prop === undefined) return defaultVal
  if (typeof prop === 'boolean') return prop
  if (typeof prop === 'object' && prop !== null && 'value' in prop) {
    return (prop as { value: boolean }).value
  }
  return defaultVal
}

// =============================================================================
// TEXT COMPONENT
// =============================================================================

/**
 * Create a text display component.
 *
 * Pass signals directly for reactive content - they stay connected!
 * The pipeline reads via unwrap() which tracks dependencies.
 */
export function text(props: TextProps): Cleanup {
  const index = allocateIndex()

  // Component metadata
  core.componentType[index] = ComponentType.TEXT
  core.parentIndex[index] = bind(getCurrentParentIndex())
  core.visible[index] = bind(props.visible ?? 1)

  // TEXT CONTENT - BIND DIRECTLY to preserve reactive link!
  textArrays.textContent[index] = bind(props.content)

  // Text styling - BIND DIRECTLY
  textArrays.textAttrs[index] = bind(props.attrs ?? Attr.NONE)
  textArrays.textAlign[index] = bind(alignToNum(getStaticString(props.align)))
  textArrays.textWrap[index] = bind(wrapToNum(getStaticString(props.wrap)))

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

  // Colors - BIND DIRECTLY!
  visual.fgColor[index] = bind(props.fg ?? null)
  visual.bgColor[index] = bind(props.bg ?? null)
  visual.opacity[index] = bind(props.opacity ?? 1)

  // Cleanup function
  return () => {
    cleanupKeyboardListeners(index)  // Remove any focused key handlers
    releaseIndex(index)
  }
}
