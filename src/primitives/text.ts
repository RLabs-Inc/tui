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

// Using slotArray APIs - no direct signal imports needed
import { ComponentType, Attr } from '../types'
import { allocateIndex, releaseIndex, getCurrentParentIndex } from '../engine/registry'
import {
  pushCurrentComponent,
  popCurrentComponent,
  runMountCallbacks,
} from '../engine/lifecycle'
import { cleanupIndex as cleanupKeyboardListeners } from '../state/keyboard'
import { onComponent as onMouseComponent } from '../state/mouse'
import { getVariantStyle } from '../state/theme'
import { getActiveScope } from './scope'
import { enumSource } from './utils'

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
/** Override alignItems for this item: 0=auto, 1=stretch, 2=flex-start, 3=center, 4=flex-end */
function alignSelfToNum(alignSelf: string | undefined): number {
  switch (alignSelf) {
    case 'auto': return 0
    case 'stretch': return 1
    case 'flex-start': return 2
    case 'center': return 3
    case 'flex-end': return 4
    default: return 0
  }
}

/**
 * Convert content prop (string | number) to string source for setSource.
 * Handles: static values, signals, and getters.
 */
function contentToStringSource(
  content: TextProps['content']
): string | (() => string) {
  // Getter function - wrap to convert
  if (typeof content === 'function') {
    return () => String(content())
  }
  // Signal/binding/derived with .value
  if (content !== null && typeof content === 'object' && 'value' in content) {
    const reactive = content as { value: string | number }
    return () => String(reactive.value)
  }
  // Static value
  return String(content)
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
  const index = allocateIndex(props.id)

  // Track current component for lifecycle hooks
  pushCurrentComponent(index)

  // ==========================================================================
  // CORE - Always needed
  // ==========================================================================
  core.componentType[index] = ComponentType.TEXT
  core.parentIndex.setSource(index, getCurrentParentIndex())

  // Visible - only bind if passed
  if (props.visible !== undefined) {
    core.visible.setSource(index, props.visible)
  }

  // ==========================================================================
  // TEXT CONTENT - Always needed (this is a text component!)
  // Uses setSource() for stable slot tracking (fixes bind() replacement bug)
  // Converts numbers to strings automatically
  // ==========================================================================
  textArrays.textContent.setSource(index, contentToStringSource(props.content))

  // Text styling - only set if passed
  if (props.attrs !== undefined) textArrays.textAttrs.setSource(index, props.attrs)
  if (props.align !== undefined) textArrays.textAlign.setSource(index, enumSource(props.align, alignToNum))
  if (props.wrap !== undefined) textArrays.textWrap.setSource(index, enumSource(props.wrap, wrapToNum))

  // ==========================================================================
  // DIMENSIONS - Only bind what's passed (TITAN uses ?? 0 for undefined)
  // ==========================================================================
  if (props.width !== undefined) dimensions.width.setSource(index, props.width)
  if (props.height !== undefined) dimensions.height.setSource(index, props.height)
  if (props.minWidth !== undefined) dimensions.minWidth.setSource(index, props.minWidth)
  if (props.maxWidth !== undefined) dimensions.maxWidth.setSource(index, props.maxWidth)
  if (props.minHeight !== undefined) dimensions.minHeight.setSource(index, props.minHeight)
  if (props.maxHeight !== undefined) dimensions.maxHeight.setSource(index, props.maxHeight)

  // ==========================================================================
  // PADDING - Shorthand support
  // ==========================================================================
  if (props.padding !== undefined) {
    spacing.paddingTop.setSource(index, props.paddingTop ?? props.padding)
    spacing.paddingRight.setSource(index, props.paddingRight ?? props.padding)
    spacing.paddingBottom.setSource(index, props.paddingBottom ?? props.padding)
    spacing.paddingLeft.setSource(index, props.paddingLeft ?? props.padding)
  } else {
    if (props.paddingTop !== undefined) spacing.paddingTop.setSource(index, props.paddingTop)
    if (props.paddingRight !== undefined) spacing.paddingRight.setSource(index, props.paddingRight)
    if (props.paddingBottom !== undefined) spacing.paddingBottom.setSource(index, props.paddingBottom)
    if (props.paddingLeft !== undefined) spacing.paddingLeft.setSource(index, props.paddingLeft)
  }

  // ==========================================================================
  // FLEX ITEM - Only bind if passed (text can be a flex item)
  // ==========================================================================
  if (props.grow !== undefined) layout.flexGrow.setSource(index, props.grow)
  if (props.shrink !== undefined) layout.flexShrink.setSource(index, props.shrink)
  if (props.flexBasis !== undefined) layout.flexBasis.setSource(index, props.flexBasis)
  if (props.alignSelf !== undefined) layout.alignSelf.setSource(index, enumSource(props.alignSelf, alignSelfToNum))

  // ==========================================================================
  // VISUAL - Colors with variant support (only bind what's needed)
  // ==========================================================================
  if (props.variant && props.variant !== 'default') {
    // Variant colors - inline bindings that read theme at read time (no deriveds!)
    const variant = props.variant
    if (props.fg !== undefined) {
      visual.fgColor.setSource(index, props.fg)
    } else {
      visual.fgColor.setSource(index, () => getVariantStyle(variant).fg)
    }
    if (props.bg !== undefined) {
      visual.bgColor.setSource(index, props.bg)
    } else {
      visual.bgColor.setSource(index, () => getVariantStyle(variant).bg)
    }
  } else {
    // Direct colors - only bind if passed
    if (props.fg !== undefined) visual.fgColor.setSource(index, props.fg)
    if (props.bg !== undefined) visual.bgColor.setSource(index, props.bg)
  }
  if (props.opacity !== undefined) visual.opacity.setSource(index, props.opacity)

  // ==========================================================================
  // MOUSE HANDLERS
  // Registered when any mouse callback provided
  // ==========================================================================
  let unsubMouse: (() => void) | undefined

  if (props.onMouseDown || props.onMouseUp || props.onClick || props.onMouseEnter || props.onMouseLeave || props.onScroll) {
    unsubMouse = onMouseComponent(index, {
      onMouseDown: props.onMouseDown,
      onMouseUp: props.onMouseUp,
      onClick: props.onClick,
      onMouseEnter: props.onMouseEnter,
      onMouseLeave: props.onMouseLeave,
      onScroll: props.onScroll,
    })
  }

  // Component setup complete - run lifecycle callbacks
  popCurrentComponent()
  runMountCallbacks(index)

  // Cleanup function
  const cleanup = () => {
    unsubMouse?.()
    cleanupKeyboardListeners(index)
    releaseIndex(index)
  }

  // Auto-register with active scope if one exists
  const scope = getActiveScope()
  if (scope) {
    scope.cleanups.push(cleanup)
  }

  return cleanup
}
