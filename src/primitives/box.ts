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

// No direct imports from signals - using slotArray APIs
import { ComponentType } from '../types'
import {
  allocateIndex,
  releaseIndex,
  getCurrentParentIndex,
  pushParentContext,
  popParentContext,
} from '../engine/registry'
import {
  pushCurrentComponent,
  popCurrentComponent,
  runMountCallbacks,
} from '../engine/lifecycle'
import { cleanupIndex as cleanupKeyboardListeners } from '../state/keyboard'
import { getVariantStyle } from '../state/theme'
import { getActiveScope } from './scope'
import { enumSource } from './utils'

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

  // Track current component for lifecycle hooks
  pushCurrentComponent(index)

  // ==========================================================================
  // CORE - Always needed
  // ==========================================================================
  core.componentType[index] = ComponentType.BOX
  core.parentIndex.setSource(index, getCurrentParentIndex())

  // Visible - only bind if passed (default is visible, handled by TITAN)
  if (props.visible !== undefined) {
    core.visible.setSource(index, props.visible)
  }

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
  // PADDING - Shorthand support: padding sets all 4, individual overrides
  // ==========================================================================
  if (props.padding !== undefined) {
    // Shorthand - set all 4 sides
    spacing.paddingTop.setSource(index, props.paddingTop ?? props.padding)
    spacing.paddingRight.setSource(index, props.paddingRight ?? props.padding)
    spacing.paddingBottom.setSource(index, props.paddingBottom ?? props.padding)
    spacing.paddingLeft.setSource(index, props.paddingLeft ?? props.padding)
  } else {
    // Individual only - bind only what's passed
    if (props.paddingTop !== undefined) spacing.paddingTop.setSource(index, props.paddingTop)
    if (props.paddingRight !== undefined) spacing.paddingRight.setSource(index, props.paddingRight)
    if (props.paddingBottom !== undefined) spacing.paddingBottom.setSource(index, props.paddingBottom)
    if (props.paddingLeft !== undefined) spacing.paddingLeft.setSource(index, props.paddingLeft)
  }

  // ==========================================================================
  // MARGIN - Shorthand support: margin sets all 4, individual overrides
  // ==========================================================================
  if (props.margin !== undefined) {
    // Shorthand - set all 4 sides
    spacing.marginTop.setSource(index, props.marginTop ?? props.margin)
    spacing.marginRight.setSource(index, props.marginRight ?? props.margin)
    spacing.marginBottom.setSource(index, props.marginBottom ?? props.margin)
    spacing.marginLeft.setSource(index, props.marginLeft ?? props.margin)
  } else {
    // Individual only - bind only what's passed
    if (props.marginTop !== undefined) spacing.marginTop.setSource(index, props.marginTop)
    if (props.marginRight !== undefined) spacing.marginRight.setSource(index, props.marginRight)
    if (props.marginBottom !== undefined) spacing.marginBottom.setSource(index, props.marginBottom)
    if (props.marginLeft !== undefined) spacing.marginLeft.setSource(index, props.marginLeft)
  }

  // Gap - only bind if passed
  if (props.gap !== undefined) spacing.gap.setSource(index, props.gap)

  // ==========================================================================
  // LAYOUT - Only bind what's passed (TITAN uses sensible defaults)
  // ==========================================================================
  if (props.flexDirection !== undefined) layout.flexDirection.setSource(index, enumSource(props.flexDirection, flexDirectionToNum))
  if (props.flexWrap !== undefined) layout.flexWrap.setSource(index, enumSource(props.flexWrap, flexWrapToNum))
  if (props.justifyContent !== undefined) layout.justifyContent.setSource(index, enumSource(props.justifyContent, justifyToNum))
  if (props.alignItems !== undefined) layout.alignItems.setSource(index, enumSource(props.alignItems, alignToNum))
  if (props.overflow !== undefined) layout.overflow.setSource(index, enumSource(props.overflow, overflowToNum))
  if (props.grow !== undefined) layout.flexGrow.setSource(index, props.grow)
  if (props.shrink !== undefined) layout.flexShrink.setSource(index, props.shrink)
  if (props.flexBasis !== undefined) layout.flexBasis.setSource(index, props.flexBasis)
  if (props.zIndex !== undefined) layout.zIndex.setSource(index, props.zIndex)
  if (props.alignSelf !== undefined) layout.alignSelf.setSource(index, enumSource(props.alignSelf, alignSelfToNum))

  // ==========================================================================
  // INTERACTION - Focusable handling
  // Auto-focusable for overflow:'scroll' (unless explicitly disabled)
  // ==========================================================================
  const shouldBeFocusable = props.focusable || (props.overflow === 'scroll' && props.focusable !== false)
  if (shouldBeFocusable) {
    interaction.focusable.setSource(index, 1)
    if (props.tabIndex !== undefined) interaction.tabIndex.setSource(index, props.tabIndex)
  }

  // ==========================================================================
  // VISUAL - Colors and borders (only bind what's passed)
  // ==========================================================================
  if (props.variant && props.variant !== 'default') {
    // Variant colors - use getters that read theme at read time
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
    if (props.borderColor !== undefined) {
      visual.borderColor.setSource(index, props.borderColor)
    } else {
      visual.borderColor.setSource(index, () => getVariantStyle(variant).border)
    }
  } else {
    // Direct colors - only bind if passed
    if (props.fg !== undefined) visual.fgColor.setSource(index, props.fg)
    if (props.bg !== undefined) visual.bgColor.setSource(index, props.bg)
    if (props.borderColor !== undefined) visual.borderColor.setSource(index, props.borderColor)
  }
  if (props.opacity !== undefined) visual.opacity.setSource(index, props.opacity)

  // Border style - shorthand and individual
  if (props.border !== undefined) visual.borderStyle.setSource(index, props.border)
  if (props.borderTop !== undefined) visual.borderTop.setSource(index, props.borderTop)
  if (props.borderRight !== undefined) visual.borderRight.setSource(index, props.borderRight)
  if (props.borderBottom !== undefined) visual.borderBottom.setSource(index, props.borderBottom)
  if (props.borderLeft !== undefined) visual.borderLeft.setSource(index, props.borderLeft)

  // Render children with this box as parent context
  if (props.children) {
    pushParentContext(index)
    try {
      props.children()
    } finally {
      popParentContext()
    }
  }

  // Component setup complete - run lifecycle callbacks
  popCurrentComponent()
  runMountCallbacks(index)

  // Cleanup function
  const cleanup = () => {
    cleanupKeyboardListeners(index)  // Remove any focused key handlers
    releaseIndex(index)
  }

  // Auto-register with active scope if one exists
  const scope = getActiveScope()
  if (scope) {
    scope.cleanups.push(cleanup)
  }

  return cleanup
}
