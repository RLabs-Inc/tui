/**
 * TUI Framework - Primitive Types
 *
 * Type definitions for all component primitives.
 * Props can be static values OR reactive (signals/bindings).
 */

import type { RGBA, CellAttrs, Dimension } from '../types'
import type { WritableSignal, Binding, ReadonlyBinding } from '@rlabs-inc/signals'
import type { Variant } from '../state/theme'
import type { KeyHandler } from '../state/keyboard'
import type { MouseEvent, MouseHandler } from '../state/mouse'

// =============================================================================
// REACTIVE PROP TYPES
// =============================================================================

/**
 * A prop value that can be static or reactive.
 * Components will sync reactive values automatically.
 *
 * Accepts:
 * - Static value: `42`, `'hello'`
 * - Signal: `mySignal`
 * - Derived: `myDerived`
 * - Binding: `bind(source)`
 * - Getter (inline derived): `() => count.value * 2`
 */
export type Reactive<T> = T | WritableSignal<T> | Binding<T> | ReadonlyBinding<T> | (() => T)

/**
 * Make specific props reactive while keeping others static.
 */
export type WithReactive<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: Reactive<T[P]>
}

// =============================================================================
// COMMON PROPS
// =============================================================================

export interface StyleProps {
  /** Foreground color (text) */
  fg?: Reactive<RGBA | null>
  /** Background color */
  bg?: Reactive<RGBA | null>
  /** Opacity 0-1 */
  opacity?: Reactive<number>
}

export interface BorderProps {
  /** Border style (0=none, 1=single, 2=double, 3=rounded, etc.) */
  border?: Reactive<number>
  /** Border color */
  borderColor?: Reactive<RGBA | null>
  /** Per-side border styles */
  borderTop?: Reactive<number>
  borderRight?: Reactive<number>
  borderBottom?: Reactive<number>
  borderLeft?: Reactive<number>
}

export interface DimensionProps {
  /** Width (0 = auto, '100%' = full parent, '50%' = half parent) */
  width?: Reactive<Dimension>
  /** Height (0 = auto, '100%' = full parent, '50%' = half parent) */
  height?: Reactive<Dimension>
  /** Minimum width */
  minWidth?: Reactive<Dimension>
  /** Maximum width (0 = no max) */
  maxWidth?: Reactive<Dimension>
  /** Minimum height */
  minHeight?: Reactive<Dimension>
  /** Maximum height (0 = no max) */
  maxHeight?: Reactive<Dimension>
}

export interface SpacingProps {
  /** Padding all sides */
  padding?: Reactive<number>
  /** Padding per side */
  paddingTop?: Reactive<number>
  paddingRight?: Reactive<number>
  paddingBottom?: Reactive<number>
  paddingLeft?: Reactive<number>
  /** Margin all sides */
  margin?: Reactive<number>
  /** Margin per side */
  marginTop?: Reactive<number>
  marginRight?: Reactive<number>
  marginBottom?: Reactive<number>
  marginLeft?: Reactive<number>
  /** Gap between children */
  gap?: Reactive<number>
}

export interface LayoutProps {
  /** Flex direction: 'column' | 'row' | 'column-reverse' | 'row-reverse' */
  flexDirection?: Reactive<'column' | 'row' | 'column-reverse' | 'row-reverse'>
  /** Flex wrap: 'nowrap' | 'wrap' | 'wrap-reverse' */
  flexWrap?: Reactive<'nowrap' | 'wrap' | 'wrap-reverse'>
  /** Justify content */
  justifyContent?: Reactive<'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'>
  /** Align items (container) */
  alignItems?: Reactive<'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'>
  /** Align self (item override) */
  alignSelf?: Reactive<'auto' | 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'>
  /** Flex grow */
  grow?: Reactive<number>
  /** Flex shrink */
  shrink?: Reactive<number>
  /** Flex basis (initial size before grow/shrink) */
  flexBasis?: Reactive<number>
  /** Overflow: 'visible' | 'hidden' | 'scroll' | 'auto' */
  overflow?: Reactive<'visible' | 'hidden' | 'scroll' | 'auto'>
  /** Z-index for stacking */
  zIndex?: Reactive<number>
}

export interface InteractionProps {
  /** Can this component receive focus */
  focusable?: Reactive<boolean>
  /** Tab order for focus navigation (-1 = not in tab order) */
  tabIndex?: Reactive<number>
}

export interface MouseProps {
  /** Called on mouse down over this component. Return true to consume event. */
  onMouseDown?: (event: MouseEvent) => void | boolean
  /** Called on mouse up over this component. Return true to consume event. */
  onMouseUp?: (event: MouseEvent) => void | boolean
  /** Called on click (down + up on same component). Return true to consume event. */
  onClick?: (event: MouseEvent) => void | boolean
  /** Called when mouse enters this component */
  onMouseEnter?: (event: MouseEvent) => void
  /** Called when mouse leaves this component */
  onMouseLeave?: (event: MouseEvent) => void
  /** Called on scroll over this component. Return true to consume event. */
  onScroll?: (event: MouseEvent) => void | boolean
}

// =============================================================================
// BOX PROPS
// =============================================================================

export interface BoxProps extends StyleProps, BorderProps, DimensionProps, SpacingProps, LayoutProps, InteractionProps, MouseProps {
  /** Component ID (optional, auto-generated if not provided) */
  id?: string
  /** Is visible */
  visible?: Reactive<boolean>
  /** Children renderer */
  children?: () => void
  /**
   * Style variant - applies theme colors automatically.
   * Variants: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost' | 'outline'
   */
  variant?: Variant
  /**
   * Keyboard handler - fires only when this box has focus.
   * Return true to consume the event (prevent propagation).
   * Requires focusable: true or overflow: 'scroll'.
   */
  onKey?: KeyHandler
  /** Called when this box receives focus */
  onFocus?: () => void
  /** Called when this box loses focus */
  onBlur?: () => void
}

// =============================================================================
// TEXT PROPS
// =============================================================================

export interface TextProps extends StyleProps, DimensionProps, SpacingProps, LayoutProps, MouseProps {
  /** Component ID (optional, auto-generated if not provided) */
  id?: string
  /** Text content (strings and numbers auto-converted) */
  content: Reactive<string | number>
  /** Text alignment: 'left' | 'center' | 'right' */
  align?: Reactive<'left' | 'center' | 'right'>
  /** Text attributes (bold, italic, etc.) */
  attrs?: Reactive<CellAttrs>
  /** Text wrapping: 'wrap' | 'nowrap' | 'truncate' */
  wrap?: Reactive<'wrap' | 'nowrap' | 'truncate'>
  /** Is visible */
  visible?: Reactive<boolean>
  /**
   * Style variant - applies theme colors automatically.
   * Variants: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost' | 'outline'
   */
  variant?: Variant
}

// =============================================================================
// INPUT PROPS
// =============================================================================

export type CursorStyle = 'block' | 'bar' | 'underline'

export interface BlinkConfig {
  /** Enable blink (default: true when BlinkConfig is used) */
  enabled?: boolean
  /** Character to show on "off" phase (default: space/invisible) */
  altChar?: string
  /** Blink rate in FPS (default: 2 = 500ms cycle) */
  fps?: number
}

export interface CursorConfig {
  /** Cursor shape preset: 'block' | 'bar' | 'underline' */
  style?: CursorStyle
  /** Custom cursor character (overrides style preset) */
  char?: string
  /** Blink configuration - boolean for simple on/off, or BlinkConfig for customization */
  blink?: boolean | BlinkConfig
  /** Custom cursor foreground color (defaults to inverted bg) */
  fg?: Reactive<RGBA>
  /** Custom cursor background color (defaults to component fg) */
  bg?: Reactive<RGBA>
}

export interface InputProps extends StyleProps, BorderProps, DimensionProps, SpacingProps, InteractionProps, MouseProps {
  /** Component ID (optional, auto-generated if not provided) */
  id?: string
  /** Current value (two-way bound) */
  value: WritableSignal<string> | Binding<string>
  /** Placeholder text */
  placeholder?: string
  /** Placeholder color */
  placeholderColor?: Reactive<RGBA | null>
  /** Text attributes */
  attrs?: Reactive<CellAttrs>
  /** Is visible */
  visible?: Reactive<boolean>
  /** Is focused by default */
  autoFocus?: boolean
  /** Maximum input length (0 = unlimited) */
  maxLength?: number
  /** Password mode - mask characters */
  password?: boolean
  /** Password mask character (default: '•') */
  maskChar?: string
  /** Cursor configuration */
  cursor?: CursorConfig
  /**
   * Style variant - applies theme colors automatically.
   * Variants: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost' | 'outline'
   */
  variant?: Variant
  /** Called when value changes */
  onChange?: (value: string) => void
  /** Called on Enter key */
  onSubmit?: (value: string) => void
  /** Called on Escape key */
  onCancel?: () => void
  /** Called on focus */
  onFocus?: () => void
  /** Called on blur */
  onBlur?: () => void
}

// =============================================================================
// COMPONENT RETURN TYPE
// =============================================================================

/**
 * Components return a cleanup function.
 * Call it to unmount the component and release its index.
 */
export type Cleanup = () => void
