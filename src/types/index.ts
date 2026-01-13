/**
 * TUI Framework - Core Type Definitions
 *
 * The foundation everything builds on. These types define
 * what the blind renderer understands and what flows through
 * the reactive pipeline.
 */

// =============================================================================
// Color
// =============================================================================

/**
 * RGBA color with 8-bit channels (0-255)
 *
 * Using integers for exact comparison - no floating point epsilon needed.
 * Alpha 255 = fully opaque, 0 = fully transparent.
 */
export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

// =============================================================================
// Dimension - Supports absolute and percentage values
// =============================================================================

/**
 * A dimension value that can be absolute (number) or percentage (string).
 *
 * - number: Absolute value in terminal cells (e.g., 50 = 50 chars)
 * - string: Percentage of parent (e.g., '50%' = half of parent)
 * - 0 or '0': Auto-size based on content
 *
 * Examples:
 *   width: 50        // 50 characters
 *   width: '100%'    // Full parent width
 *   width: '50%'     // Half of parent width
 *   height: 0        // Auto-height based on content
 */
export type Dimension = number | `${number}%`

/**
 * Parsed dimension for internal use.
 * TITAN resolves these against parent computed sizes.
 */
export interface ParsedDimension {
  value: number
  isPercent: boolean
}

/**
 * Parse a Dimension into value and percent flag.
 * Used by primitives when binding dimensions.
 */
export function parseDimension(dim: Dimension | undefined | null): ParsedDimension {
  if (dim === undefined || dim === null) {
    return { value: 0, isPercent: false }
  }
  if (typeof dim === 'number') {
    return { value: dim, isPercent: false }
  }
  // String like '50%'
  const num = parseFloat(dim)
  return { value: isNaN(num) ? 0 : num, isPercent: true }
}

// =============================================================================
// Cell Attributes (bitfield)
// =============================================================================

/**
 * Text attributes as a bitfield for efficient storage and comparison.
 * Combine with bitwise OR: Attr.BOLD | Attr.ITALIC
 */
export const Attr = {
  NONE: 0,
  BOLD: 1 << 0,
  DIM: 1 << 1,
  ITALIC: 1 << 2,
  UNDERLINE: 1 << 3,
  BLINK: 1 << 4,
  INVERSE: 1 << 5,
  HIDDEN: 1 << 6,
  STRIKETHROUGH: 1 << 7,
} as const

export type CellAttrs = number

// =============================================================================
// Cell - The atomic unit of terminal rendering
// =============================================================================

/**
 * A single terminal cell.
 *
 * This is what the renderer deals with. Nothing more complex.
 * The entire pipeline computes these, the renderer outputs them.
 */
export interface Cell {
  /** Unicode codepoint (32 for space) */
  char: number
  /** Foreground color */
  fg: RGBA
  /** Background color */
  bg: RGBA
  /** Attribute flags (bold, italic, etc.) */
  attrs: CellAttrs
}

// =============================================================================
// Cursor
// =============================================================================

export type CursorShape = 'block' | 'underline' | 'bar'

export interface Cursor {
  x: number
  y: number
  shape: CursorShape
  visible: boolean
  blinking: boolean
}

// =============================================================================
// FrameBuffer - What the renderer receives
// =============================================================================

/**
 * A 2D buffer of cells representing one frame.
 *
 * Stored as [y][x] for cache-friendly row access during rendering.
 * This is what layoutDerived and frameBufferDerived ultimately produce.
 */
export interface FrameBuffer {
  readonly width: number
  readonly height: number
  readonly cells: Cell[][]
}

// =============================================================================
// Input Events - What the terminal reports
// =============================================================================

export interface Modifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type KeyState = 'press' | 'release' | 'repeat'

export interface KeyEvent {
  /** The key character or name (e.g., 'a', 'Enter', 'ArrowUp') */
  key: string
  /** Modifier keys held during the event */
  modifiers: Modifiers
  /** Key state (press/release/repeat) */
  state: KeyState
}

export type MouseButton = 'left' | 'middle' | 'right' | 'none'
export type MouseAction = 'down' | 'up' | 'move' | 'scroll'

export interface MouseEvent {
  /** Cell X position (0-indexed) */
  x: number
  /** Cell Y position (0-indexed) */
  y: number
  /** Which button */
  button: MouseButton
  /** Event type */
  action: MouseAction
  /** Scroll direction (-1 up, 1 down) when action is 'scroll' */
  scrollDelta?: number
  /** Modifier keys */
  modifiers: Modifiers
}

export interface ResizeEvent {
  width: number
  height: number
}

export interface FocusEvent {
  focused: boolean
}

// =============================================================================
// Component Types - For parallel arrays
// =============================================================================

/**
 * Component types for the parallel arrays pattern.
 * Each component at index i has componentType[i] set to one of these.
 */
export const ComponentType = {
  NONE: 0,
  BOX: 1,
  TEXT: 2,
  INPUT: 3,
  SELECT: 4,
  PROGRESS: 5,
  CANVAS: 6,
} as const

export type ComponentTypeValue = (typeof ComponentType)[keyof typeof ComponentType]

// =============================================================================
// Border Styles
// =============================================================================

/**
 * Border style constants - use numbers in arrays, consistent with ComponentType.
 * All 10 standard terminal border styles.
 */
export const BorderStyle = {
  NONE: 0,
  SINGLE: 1,        // ─ │ ┌ ┐ └ ┘
  DOUBLE: 2,        // ═ ║ ╔ ╗ ╚ ╝
  ROUNDED: 3,       // ─ │ ╭ ╮ ╰ ╯
  BOLD: 4,          // ━ ┃ ┏ ┓ ┗ ┛
  DASHED: 5,        // ┄ ┆ ┌ ┐ └ ┘
  DOTTED: 6,        // · · · · · ·
  ASCII: 7,         // - | + + + +
  BLOCK: 8,         // █ █ █ █ █ █
  DOUBLE_HORZ: 9,   // ═ │ ╒ ╕ ╘ ╛ (double horizontal, single vertical)
  DOUBLE_VERT: 10,  // ─ ║ ╓ ╖ ╙ ╜ (single horizontal, double vertical)
} as const

export type BorderStyleValue = (typeof BorderStyle)[keyof typeof BorderStyle]

/**
 * Border characters for each style.
 * Order: [0]=horizontal, [1]=vertical, [2]=topLeft, [3]=topRight, [4]=bottomRight, [5]=bottomLeft
 * Access as BorderChars[BorderStyle.SINGLE][0] for horizontal char
 */
export const BorderChars: Record<number, readonly [string, string, string, string, string, string]> = {
  [BorderStyle.SINGLE]:      ['─', '│', '┌', '┐', '┘', '└'],
  [BorderStyle.DOUBLE]:      ['═', '║', '╔', '╗', '╝', '╚'],
  [BorderStyle.ROUNDED]:     ['─', '│', '╭', '╮', '╯', '╰'],
  [BorderStyle.BOLD]:        ['━', '┃', '┏', '┓', '┛', '┗'],
  [BorderStyle.DASHED]:      ['┄', '┆', '┌', '┐', '┘', '└'],
  [BorderStyle.DOTTED]:      ['·', '·', '·', '·', '·', '·'],
  [BorderStyle.ASCII]:       ['-', '|', '+', '+', '+', '+'],
  [BorderStyle.BLOCK]:       ['█', '█', '█', '█', '█', '█'],
  [BorderStyle.DOUBLE_HORZ]: ['═', '│', '╒', '╕', '╛', '╘'],
  [BorderStyle.DOUBLE_VERT]: ['─', '║', '╓', '╖', '╜', '╙'],
}

// =============================================================================
// Scroll State
// =============================================================================

export interface ScrollState {
  x: number
  y: number
  maxX: number
  maxY: number
}

// =============================================================================
// Mount Options
// =============================================================================

export type RenderMode = 'fullscreen' | 'inline' | 'append'

export interface MountOptions {
  /**
   * Render mode:
   * - 'fullscreen': Alternate screen buffer, full terminal control
   * - 'inline': Renders inline, updates in place
   * - 'append': Active content at bottom, history via renderToHistory()
   */
  mode?: RenderMode
  /** Enable mouse tracking (default: true) */
  mouse?: boolean
  /** Enable Kitty keyboard protocol if available (default: true) */
  kittyKeyboard?: boolean
  /** Initial cursor configuration */
  cursor?: Partial<Cursor>
}

/**
 * Result of mount() for append mode.
 * Includes renderToHistory for writing content to terminal history.
 */
export interface AppendMountResult {
  /** Cleanup function to unmount */
  cleanup: () => Promise<void>
  /**
   * Render components to terminal history (frozen scrollback).
   * Use the same component API - components are rendered once and forgotten.
   *
   * @example
   * ```ts
   * renderToHistory(() => {
   *   Message({ content: 'Frozen message' })
   * })
   * ```
   */
  renderToHistory: (componentFn: () => void) => void
}

// =============================================================================
// Renderer Interface
// =============================================================================

/**
 * The blind renderer interface.
 * Knows only about cells, not components.
 */
export interface Renderer {
  readonly width: number
  readonly height: number

  /** Render a frame buffer to the terminal */
  render(buffer: FrameBuffer): void

  /** Cursor control */
  setCursor(x: number, y: number): void
  setCursorVisible(visible: boolean): void
  setCursorShape(shape: CursorShape): void

  /** Event handlers - return unsubscribe function */
  onKey(handler: (event: KeyEvent) => void): () => void
  onMouse(handler: (event: MouseEvent) => void): () => void
  onResize(handler: (event: ResizeEvent) => void): () => void
  onFocus(handler: (event: FocusEvent) => void): () => void

  /** Lifecycle */
  start(options?: MountOptions): Promise<void>
  stop(): Promise<void>
}
