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

// Keyboard - explicit exports to avoid conflicts
export {
  keyboard,
  lastKey,
  lastEvent,
  on,
  onKey,
  onFocused,
  cleanupIndex,
  dispatch as dispatchKeyboard,
  dispatchFocused,
  cleanup as cleanupKeyboard,
} from './keyboard'
export type { Modifiers, KeyState, KeyboardEvent, KeyHandler } from './keyboard'

// Mouse - explicit exports to avoid conflicts
export {
  mouse,
  hitGrid,
  lastMouseEvent,
  mouseX,
  mouseY,
  isMouseDown,
  HitGrid,
  MouseButton,
  onMouseDown,
  onMouseUp,
  onClick,
  onScroll,
  onComponent,
  resize,
  clearHitGrid,
  enableTracking,
  disableTracking,
  isTrackingEnabled,
  dispatch as dispatchMouse,
  cleanup as cleanupMouse,
} from './mouse'
export type { MouseAction, ScrollInfo, MouseEvent, MouseHandlers, MouseHandler } from './mouse'
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

// Drawn cursor - for input components (style, blink, colors)
export {
  createCursor,
  disposeCursor,
  getCursorCharCode,
  hasCursor,
} from './drawnCursor'
export type { DrawnCursorStyle, DrawnCursorConfig, DrawnCursor } from './drawnCursor'

// Global keys - all shortcuts wired together
export { globalKeys } from './global-keys'

// Input - stdin ownership
export { input } from './input'
