/**
 * TUI Framework - State Modules
 *
 * Input handling and interaction state management.
 *
 * Modules:
 * - keyboard: Key events, focus navigation, Kitty protocol
 * - mouse: Mouse events, HitGrid, SGR protocol
 * - focus: Focus management, trapping, history
 * - scroll: Scroll state, wheel/keyboard handling
 * - cursor: Cursor visibility, shape, position
 */

// Keyboard is primary for focus navigation
export * from './keyboard'
export * from './mouse'
// Focus exports - exclude duplicates that are in keyboard
export {
  focusedIndex,
  pushFocusTrap,
  popFocusTrap,
  isFocusTrapped,
  getFocusTrapContainer,
  saveFocusToHistory,
  restoreFocusFromHistory,
  getFocusableIndices,
  focusableIndices,
  hasFocus,
  isFocused,
  focus,
  blur,
  focusFirst,
  focusLast,
  focusManager,
} from './focus'
export * from './scroll'
export * from './cursor'

// Convenient namespace exports
export { keyboard } from './keyboard'
export { mouse } from './mouse'
export { scroll } from './scroll'
export { cursor } from './cursor'
