/**
 * TUI Framework - Layout Module
 *
 * RE-EXPORTS from the new terminal-native layout engine.
 *
 * The Yoga-based implementation has been replaced with our custom engine:
 * - O(n) flat array iteration (no recursion)
 * - 1000+ nested levels without breaking a sweat
 * - Integer-only math for terminal cells
 * - Full Flexbox + positioning support
 *
 * See src/pipeline/layout/ for the implementation.
 */

// Re-export everything from the new layout module
export {
  layoutDerived,
  terminalWidth,
  terminalHeight,
  updateTerminalSize,
  renderMode,
  type ComputedLayout,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
  Position,
  Display,
  Overflow,
} from './layout/index'
