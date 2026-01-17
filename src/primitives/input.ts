/**
 * TUI Framework - Input Primitive
 *
 * Single-line text input with full reactivity.
 *
 * Features:
 * - Two-way value binding via slot arrays
 * - Cursor navigation (arrows, home, end)
 * - Text editing (backspace, delete)
 * - Password mode
 * - Placeholder text
 * - Theme variants
 * - Cursor configuration (style, blink, color)
 *
 * Usage:
 * ```ts
 * const name = signal('')
 * input({
 *   value: name,
 *   placeholder: 'Enter your name...',
 *   onSubmit: (val) => console.log('Submitted:', val)
 * })
 * ```
 */

import { signal } from '@rlabs-inc/signals'
import { ComponentType } from '../types'
import { allocateIndex, releaseIndex, getCurrentParentIndex } from '../engine/registry'
import {
  pushCurrentComponent,
  popCurrentComponent,
  runMountCallbacks,
} from '../engine/lifecycle'
import { cleanupIndex as cleanupKeyboardListeners, onFocused } from '../state/keyboard'
import { getVariantStyle, t } from '../state/theme'
import { focus as focusComponent, registerFocusCallbacks } from '../state/focus'
import { createCursor, disposeCursor } from '../state/drawnCursor'
import { getActiveScope } from './scope'

// Import arrays
import * as core from '../engine/arrays/core'
import * as dimensions from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as layout from '../engine/arrays/layout'
import * as visual from '../engine/arrays/visual'
import * as textArrays from '../engine/arrays/text'
import * as interaction from '../engine/arrays/interaction'

// Import types
import type { InputProps, Cleanup, BlinkConfig } from './types'
import type { KeyboardEvent } from '../state/keyboard'

// =============================================================================
// INPUT COMPONENT
// =============================================================================

/**
 * Create a single-line text input component.
 *
 * Pass a WritableSignal or Binding for two-way value binding.
 * The component handles keyboard input when focused.
 *
 * Supports theme variants for consistent styling:
 * - Core: default, primary, secondary, tertiary, accent
 * - Status: success, warning, error, info
 * - Surface: muted, surface, elevated, ghost, outline
 */
export function input(props: InputProps): Cleanup {
  const index = allocateIndex()

  // Track current component for lifecycle hooks
  pushCurrentComponent(index)

  // ==========================================================================
  // INTERNAL STATE
  // ==========================================================================

  // Cursor position within the text - local signal synced to slot array
  const cursorPos = signal(0)

  // Get/set value (handles both WritableSignal and Binding)
  const getValue = () => props.value.value
  const setValue = (v: string) => { props.value.value = v }

  // Password mask character
  const maskChar = props.maskChar ?? '•'

  // ==========================================================================
  // CORE
  // ==========================================================================

  core.componentType[index] = ComponentType.INPUT
  core.parentIndex.setSource(index, getCurrentParentIndex())

  if (props.visible !== undefined) {
    core.visible.setSource(index, props.visible)
  }

  // ==========================================================================
  // TEXT CONTENT - Display via slot array
  // Syncs reactive value, handles password masking and placeholder
  // ==========================================================================

  // Create getter that produces display text
  const getDisplayText = () => {
    const val = getValue()
    if (val.length === 0 && props.placeholder) {
      return props.placeholder
    }
    return props.password ? maskChar.repeat(val.length) : val
  }

  textArrays.textContent.setSource(index, getDisplayText)

  if (props.attrs !== undefined) textArrays.textAttrs.setSource(index, props.attrs)

  // ==========================================================================
  // CURSOR - Create cursor with full customization
  // Uses drawnCursor module for style, blink animation, colors
  // ==========================================================================

  // Build cursor config from props
  const cursorConfig = props.cursor ?? {}

  // Determine blink settings (default: ON at 2 FPS)
  let blinkEnabled = true
  let blinkFps = 2
  let altChar: string | undefined

  if (cursorConfig.blink === false) {
    blinkEnabled = false
  } else if (typeof cursorConfig.blink === 'object') {
    const blinkConfig = cursorConfig.blink as BlinkConfig
    blinkEnabled = blinkConfig.enabled !== false
    blinkFps = blinkConfig.fps ?? 2
    altChar = blinkConfig.altChar
  }

  // Create cursor (handles style, blink animation, visibility)
  const cursor = createCursor(index, {
    style: cursorConfig.style,
    char: cursorConfig.char,
    blink: blinkEnabled,
    fps: blinkFps,
    altChar,
  })

  // Sync cursor position from local signal (position is input-specific)
  // Clamped to value length - handles external value changes gracefully
  interaction.cursorPosition.setSource(index, () => Math.min(cursorPos.value, getValue().length))

  // ==========================================================================
  // DIMENSIONS
  // ==========================================================================

  if (props.width !== undefined) dimensions.width.setSource(index, props.width)
  if (props.height !== undefined) dimensions.height.setSource(index, props.height)
  if (props.minWidth !== undefined) dimensions.minWidth.setSource(index, props.minWidth)
  if (props.maxWidth !== undefined) dimensions.maxWidth.setSource(index, props.maxWidth)
  if (props.minHeight !== undefined) dimensions.minHeight.setSource(index, props.minHeight)
  if (props.maxHeight !== undefined) dimensions.maxHeight.setSource(index, props.maxHeight)

  // ==========================================================================
  // PADDING
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
  // MARGIN
  // ==========================================================================

  if (props.margin !== undefined) {
    spacing.marginTop.setSource(index, props.marginTop ?? props.margin)
    spacing.marginRight.setSource(index, props.marginRight ?? props.margin)
    spacing.marginBottom.setSource(index, props.marginBottom ?? props.margin)
    spacing.marginLeft.setSource(index, props.marginLeft ?? props.margin)
  } else {
    if (props.marginTop !== undefined) spacing.marginTop.setSource(index, props.marginTop)
    if (props.marginRight !== undefined) spacing.marginRight.setSource(index, props.marginRight)
    if (props.marginBottom !== undefined) spacing.marginBottom.setSource(index, props.marginBottom)
    if (props.marginLeft !== undefined) spacing.marginLeft.setSource(index, props.marginLeft)
  }

  // ==========================================================================
  // BORDER
  // ==========================================================================

  if (props.border !== undefined) visual.borderStyle.setSource(index, props.border)
  if (props.borderTop !== undefined) visual.borderTop.setSource(index, props.borderTop)
  if (props.borderRight !== undefined) visual.borderRight.setSource(index, props.borderRight)
  if (props.borderBottom !== undefined) visual.borderBottom.setSource(index, props.borderBottom)
  if (props.borderLeft !== undefined) visual.borderLeft.setSource(index, props.borderLeft)
  if (props.borderColor !== undefined) visual.borderColor.setSource(index, props.borderColor)

  // ==========================================================================
  // VISUAL - Colors with variant support
  // ==========================================================================

  if (props.variant && props.variant !== 'default') {
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
    // Border color from variant when not explicitly set
    if (props.borderColor === undefined) {
      visual.borderColor.setSource(index, () => getVariantStyle(variant).border)
    }
  } else {
    // Non-variant: use explicit props or default to theme textBright for cursor visibility
    visual.fgColor.setSource(index, props.fg !== undefined ? props.fg : t.textBright)
    if (props.bg !== undefined) visual.bgColor.setSource(index, props.bg)
  }
  if (props.opacity !== undefined) visual.opacity.setSource(index, props.opacity)

  // ==========================================================================
  // FOCUS - Inputs are always focusable
  // ==========================================================================

  interaction.focusable.setSource(index, 1)
  if (props.tabIndex !== undefined) {
    interaction.tabIndex.setSource(index, props.tabIndex)
  }

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  const handleKeyEvent = (event: KeyboardEvent): boolean => {
    const val = getValue()
    // Clamp cursor position to value length (handles external value changes)
    const pos = Math.min(cursorPos.value, val.length)
    const maxLen = props.maxLength ?? 0

    switch (event.key) {
      // Navigation
      case 'ArrowLeft':
        if (pos > 0) cursorPos.value = pos - 1
        return true

      case 'ArrowRight':
        if (pos < val.length) cursorPos.value = pos + 1
        return true

      case 'Home':
        cursorPos.value = 0
        return true

      case 'End':
        cursorPos.value = val.length
        return true

      // Deletion
      case 'Backspace':
        if (pos > 0) {
          const newVal = val.slice(0, pos - 1) + val.slice(pos)
          setValue(newVal)
          cursorPos.value = pos - 1
          props.onChange?.(newVal)
        }
        return true

      case 'Delete':
        if (pos < val.length) {
          const newVal = val.slice(0, pos) + val.slice(pos + 1)
          setValue(newVal)
          props.onChange?.(newVal)
        }
        return true

      // Submission
      case 'Enter':
        props.onSubmit?.(val)
        return true

      // Cancel
      case 'Escape':
        props.onCancel?.()
        return true

      // Regular character input
      default:
        // Only single printable characters
        if (event.key.length === 1 && !event.modifiers.ctrl && !event.modifiers.alt && !event.modifiers.meta) {
          // Check max length
          if (maxLen > 0 && val.length >= maxLen) {
            return true
          }
          const newVal = val.slice(0, pos) + event.key + val.slice(pos)
          setValue(newVal)
          cursorPos.value = pos + 1
          props.onChange?.(newVal)
          return true
        }
        return false
    }
  }

  // Register focused handler
  const unsubKeyboard = onFocused(index, handleKeyEvent)

  // Register focus callbacks with focus manager (fires at the source)
  const unsubFocusCallbacks = registerFocusCallbacks(index, {
    onFocus: props.onFocus,
    onBlur: props.onBlur,
  })

  // ==========================================================================
  // AUTO FOCUS
  // ==========================================================================

  if (props.autoFocus) {
    queueMicrotask(() => focusComponent(index))
  }

  // ==========================================================================
  // LIFECYCLE COMPLETE
  // ==========================================================================

  popCurrentComponent()
  runMountCallbacks(index)

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  const cleanup = () => {
    unsubFocusCallbacks()
    cursor.dispose()
    unsubKeyboard()
    cleanupKeyboardListeners(index)
    interaction.cursorPosition.clear(index)  // Clear cursor position array
    releaseIndex(index)
  }

  // Auto-register with active scope if one exists
  const scope = getActiveScope()
  if (scope) {
    scope.cleanups.push(cleanup)
  }

  return cleanup
}
