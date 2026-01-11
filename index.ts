/**
 * TUI Framework
 *
 * The definitive TypeScript/Bun terminal UI framework.
 * Fine-grained reactivity, parallel arrays, zero fixed-FPS rendering.
 */

// API - User-facing
export { mount } from './src/api'

// Primitives - UI building blocks
export { box, text, each, show, when } from './src/primitives'
export type { BoxProps, TextProps, Cleanup } from './src/primitives'

// State modules - Input handling
export { keyboard, lastKey, lastEvent } from './src/state/keyboard'
export { mouse, hitGrid, lastMouseEvent, mouseX, mouseY, isMouseDown } from './src/state/mouse'
export { focusManager, focusedIndex } from './src/state/focus'
export { scroll } from './src/state/scroll'
export { globalKeys } from './src/state/global-keys'
export { cursor } from './src/state/cursor'

// Types
export * from './src/types'
export * from './src/types/color'

// Signals re-export for convenience
export { signal, state, derived, effect, bind, signals, batch } from '@rlabs-inc/signals'

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
