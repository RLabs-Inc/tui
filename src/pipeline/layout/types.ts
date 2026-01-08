/**
 * TUI Framework - Layout Engine Types
 *
 * THE terminal layout system. Not just Flexbox - everything.
 *
 * Features:
 * - Full Flexbox (6-phase algorithm with freeze loop)
 * - Grid layout (coming soon)
 * - Fixed/Absolute/Relative positioning
 * - Animation & transitions support (built into the architecture)
 *
 * Pure parallel arrays - NO objects for working data.
 * Every array is indexed by component index.
 */

// =============================================================================
// OUTPUT TYPES (same interface as current Yoga integration)
// =============================================================================

export interface ComputedLayout {
  x: number[]
  y: number[]
  width: number[]
  height: number[]
  scrollable: number[]
  maxScrollY: number[]
  maxScrollX: number[]
  // Content bounds (max extent of all components)
  contentWidth: number   // Max x + width across all components
  contentHeight: number  // Max y + height across all components
}

// =============================================================================
// FLEX DIRECTION AND WRAP ENUMS
// =============================================================================

export const FlexDirection = {
  COLUMN: 0,
  ROW: 1,
  COLUMN_REVERSE: 2,
  ROW_REVERSE: 3,
} as const

export const FlexWrap = {
  NO_WRAP: 0,
  WRAP: 1,
  WRAP_REVERSE: 2,
} as const

export const JustifyContent = {
  FLEX_START: 0,
  CENTER: 1,
  FLEX_END: 2,
  SPACE_BETWEEN: 3,
  SPACE_AROUND: 4,
  SPACE_EVENLY: 5,
} as const

export const AlignItems = {
  STRETCH: 0,
  FLEX_START: 1,
  CENTER: 2,
  FLEX_END: 3,
  BASELINE: 4,
} as const

// =============================================================================
// POSITIONING
// =============================================================================

export const Position = {
  RELATIVE: 0,    // Normal flow, offsets relative to normal position
  ABSOLUTE: 1,    // Out of flow, positioned relative to nearest positioned ancestor
  FIXED: 2,       // Out of flow, positioned relative to terminal viewport
  STICKY: 3,      // Hybrid - relative until scroll threshold, then fixed
} as const

// =============================================================================
// DISPLAY MODE (for future Grid support)
// =============================================================================

export const Display = {
  FLEX: 0,        // Flexbox layout
  GRID: 1,        // Grid layout (future)
  NONE: 2,        // Hidden, not in layout
} as const

// =============================================================================
// OVERFLOW (for scroll containers)
// =============================================================================

export const Overflow = {
  VISIBLE: 0,     // Content can overflow
  HIDDEN: 1,      // Content clipped
  SCROLL: 2,      // Scrollable
  AUTO: 3,        // Scroll only if needed
} as const

// =============================================================================
// WORKING DATA - Pure Parallel Arrays
// =============================================================================

/**
 * All working data for layout computation.
 * Every array is indexed by component index.
 * Pre-allocated for performance, reset each layout pass.
 */
export interface WorkingData {
  // Hierarchy (computed once per layout)
  depth: number[]              // Nesting depth (root = 0)
  childStart: number[]         // Index into childrenOrdered
  childCount: number[]         // Number of direct children

  // Flex working data
  flexBaseSize: number[]       // Initial size before flex
  hypotheticalMainSize: number[] // Clamped by min/max
  targetMainSize: number[]     // Size after flex distribution
  targetCrossSize: number[]    // Cross axis size
  frozen: Uint8Array           // 0 = unfrozen, 1 = frozen

  // Final computed values
  computedX: number[]
  computedY: number[]
  computedWidth: number[]
  computedHeight: number[]

  // Scroll detection
  contentWidth: number[]       // Total content width
  contentHeight: number[]      // Total content height
}

/**
 * Line data for flex wrap.
 * Stored separately since number of lines varies per container.
 */
export interface LineData {
  // Per-container line info
  lineStart: number[]          // Index into items array where lines begin
  lineCount: number[]          // Number of lines in this container

  // Flattened line items (all lines concatenated)
  items: number[][]            // items[lineIndex] = array of component indices

  // Per-line computed data
  lineCrossSize: number[]      // Cross size of each line
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type FlexDirectionValue = typeof FlexDirection[keyof typeof FlexDirection]
export type FlexWrapValue = typeof FlexWrap[keyof typeof FlexWrap]
export type JustifyContentValue = typeof JustifyContent[keyof typeof JustifyContent]
export type AlignItemsValue = typeof AlignItems[keyof typeof AlignItems]
export type PositionValue = typeof Position[keyof typeof Position]
export type DisplayValue = typeof Display[keyof typeof Display]
export type OverflowValue = typeof Overflow[keyof typeof Overflow]

// =============================================================================
// ANIMATION TYPES (built into architecture from day 1)
// =============================================================================

export interface TransitionConfig {
  property: string           // Which property to animate
  duration: number           // Duration in ms
  easing: EasingFunction     // Easing function
  delay: number              // Delay before start
}

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'step-start'
  | 'step-end'
  | ((t: number) => number)  // Custom easing function

// Animation state per component (for future use)
export interface AnimationState {
  startValue: number
  endValue: number
  startTime: number
  duration: number
  easing: EasingFunction
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const INFINITY = 999999  // Terminal has finite size, use large number
