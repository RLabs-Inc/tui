/**
 * TUI Framework
 *
 * The definitive TypeScript/Bun terminal UI framework.
 * Fine-grained reactivity, parallel arrays, zero fixed-FPS rendering.
 */

// API - User-facing
export { mount } from './src/api'

// Primitives - UI building blocks
export { box, text, input, each, show, when, scoped, onCleanup, useAnimation, AnimationFrames } from './src/primitives'
export type { BoxProps, TextProps, InputProps, CursorConfig, CursorStyle, Cleanup, AnimationOptions } from './src/primitives'

// Lifecycle hooks - Component mount/destroy callbacks
export { onMount, onDestroy } from './src/engine/lifecycle'

// Context - Reactive dependency injection
export { createContext, provide, useContext, hasContext, clearContext } from './src/state/context'
export type { Context } from './src/state/context'

// State modules - Input handling
export { keyboard, lastKey, lastEvent } from './src/state/keyboard'
export {
  mouse,
  hitGrid,
  lastMouseEvent,
  mouseX,
  mouseY,
  isMouseDown,
  onMouseDown,
  onMouseUp,
  onClick,
  onScroll,
  onComponent,
} from './src/state/mouse'
export { focusManager, focusedIndex, pushFocusTrap, popFocusTrap, isFocusTrapped, getFocusTrapContainer } from './src/state/focus'
export { scroll } from './src/state/scroll'
export { globalKeys } from './src/state/global-keys'
export { cursor } from './src/state/cursor'

// Types
export * from './src/types'
export * from './src/types/color'

// Signals re-export for convenience
export { signal, state, derived, effect, bind, signals, batch, reactiveProps } from '@rlabs-inc/signals'
export type { PropInput, PropsInput, ReactiveProps } from '@rlabs-inc/signals'

// Theme
export {
  theme,
  themes,
  setTheme,
  resolveColor,
  resolvedTheme,
  t,
  getVariantStyle,
  variantStyle,
} from './src/state/theme'
export type { Variant, VariantStyle, ThemeColor } from './src/state/theme'

// Renderer (advanced)
export * from './src/renderer'

// Engine (advanced)
export * from './src/engine'

// Layout (advanced - for debugging)
export { layoutDerived } from './src/pipeline/layout'
