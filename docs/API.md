# TUI Framework - API Specification

> This document defines the user-facing API. Every property here maps to parallel arrays in the engine.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Primitives](#primitives)
   - [box](#box)
   - [text](#text)
   - [input](#input)
   - [select](#select)
   - [progress](#progress)
   - [canvas](#canvas)
3. [Input APIs](#input-apis)
   - [keyboard](#keyboard)
   - [mouse](#mouse)
   - [focus](#focus)
4. [Theme API](#theme-api)
5. [Mount & Lifecycle](#mount--lifecycle)
6. [Extracted Parallel Arrays](#extracted-parallel-arrays)

---

## Design Principles

1. **Every prop = parallel array(s)** — No hidden state
2. **Signals for user state** — Users bring their own reactivity
3. **Components write to arrays** — Direct mutation, no reconciliation
4. **Derived computes layout/cells** — Pure calculations
5. **One effect renders** — Single output point

---

## Primitives

### box

Container element with optional border, background, and layout capabilities.

```typescript
box(props: BoxProps, children?: Component[]): Component

interface BoxProps {
  // Identity
  id?: string

  // Dimensions
  width?: number | 'auto' | `${number}%`
  height?: number | 'auto' | `${number}%`
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number

  // Position (when position: 'absolute')
  x?: number
  y?: number

  // Margin (outer spacing)
  margin?: number                    // All sides
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number
  marginX?: number                   // Left + Right
  marginY?: number                   // Top + Bottom

  // Padding (inner spacing)
  padding?: number                   // All sides
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  paddingX?: number                  // Left + Right
  paddingY?: number                  // Top + Bottom

  // Border
  border?: 'none' | 'single' | 'double' | 'rounded' | 'heavy' | 'dashed' | 'ascii'
  borderLeft?: boolean
  borderRight?: boolean
  borderTop?: boolean
  borderBottom?: boolean
  borderColor?: Color

  // Colors
  backgroundColor?: Color

  // Layout (Flexbox)
  flexDirection?: 'row' | 'column'
  flexWrap?: 'nowrap' | 'wrap'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  alignContent?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'space-between' | 'space-around'
  gap?: number
  rowGap?: number
  columnGap?: number

  // Flex item properties
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | 'auto'
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch'

  // Positioning
  position?: 'relative' | 'absolute'
  zIndex?: number

  // Overflow / Scrolling
  overflow?: 'visible' | 'hidden' | 'scroll'
  scrollX?: number                   // Current scroll offset
  scrollY?: number

  // Visibility
  visible?: boolean
  opacity?: number                   // 0-1, for alpha blending

  // Interaction
  focusable?: boolean
  tabIndex?: number

  // Events
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (event: KeyEvent) => void
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
  onMouseMove?: (event: MouseEvent) => void
  onScroll?: (offset: { x: number, y: number }) => void
}
```

---

### text

Text rendering with styling support.

```typescript
text(props: TextProps): Component

interface TextProps {
  // Content
  content: string

  // Identity
  id?: string

  // Colors
  color?: Color
  backgroundColor?: Color

  // Text styling
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  inverse?: boolean

  // Text alignment (within parent)
  align?: 'left' | 'center' | 'right'

  // Text wrapping
  wrap?: 'none' | 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle'

  // Dimensions (usually auto-sized)
  width?: number | 'auto'
  height?: number | 'auto'

  // Spacing
  margin?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number

  // Visibility
  visible?: boolean
  opacity?: number

  // Flex item
  flexGrow?: number
  flexShrink?: number
}
```

---

### input

Single-line text input field.

```typescript
input(props: InputProps): Component

interface InputProps {
  // Value
  value: string
  onChange: (value: string) => void

  // Identity
  id?: string

  // Placeholder
  placeholder?: string
  placeholderColor?: Color

  // Input behavior
  type?: 'text' | 'password' | 'number'
  maxLength?: number
  disabled?: boolean
  readOnly?: boolean

  // Dimensions
  width?: number | 'auto' | `${number}%`

  // Colors
  color?: Color
  backgroundColor?: Color
  cursorColor?: Color
  selectionColor?: Color

  // Border
  border?: 'none' | 'single' | 'double' | 'rounded'
  borderColor?: Color
  focusBorderColor?: Color           // Border color when focused

  // Spacing
  padding?: number
  paddingX?: number
  margin?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number

  // Focus
  focusable?: boolean                // Default: true
  tabIndex?: number
  autoFocus?: boolean

  // Text styling
  bold?: boolean

  // Visibility
  visible?: boolean

  // Flex item
  flexGrow?: number
  flexShrink?: number

  // Events
  onFocus?: () => void
  onBlur?: () => void
  onSubmit?: (value: string) => void  // Enter pressed
  onKeyDown?: (event: KeyEvent) => void
}
```

---

### select

Dropdown/list selection component.

```typescript
select(props: SelectProps): Component

interface SelectProps {
  // Options
  options: SelectOption[]
  value: string | string[]           // Selected value(s)
  onChange: (value: string | string[]) => void

  // Identity
  id?: string

  // Selection mode
  multiple?: boolean

  // Display
  maxVisible?: number                // Max items visible (scroll for more)

  // Dimensions
  width?: number | 'auto' | `${number}%`
  height?: number | 'auto'

  // Colors
  color?: Color
  backgroundColor?: Color
  selectedColor?: Color
  selectedBackgroundColor?: Color
  highlightColor?: Color             // Currently highlighted option
  highlightBackgroundColor?: Color

  // Border
  border?: 'none' | 'single' | 'double' | 'rounded'
  borderColor?: Color
  focusBorderColor?: Color

  // Spacing
  padding?: number
  margin?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number

  // Indicators
  indicator?: string                 // Selection indicator (default: '●')
  indicatorColor?: Color

  // Focus
  focusable?: boolean                // Default: true
  tabIndex?: number

  // Visibility
  visible?: boolean

  // Flex item
  flexGrow?: number
  flexShrink?: number

  // Events
  onFocus?: () => void
  onBlur?: () => void
  onHighlight?: (option: SelectOption) => void
}

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}
```

---

### progress

Progress bar component.

```typescript
progress(props: ProgressProps): Component

interface ProgressProps {
  // Value
  value: number                      // 0-100 or 0-max
  max?: number                       // Default: 100

  // Identity
  id?: string

  // Dimensions
  width?: number | `${number}%`
  height?: number                    // Default: 1

  // Colors
  color?: Color                      // Filled portion
  backgroundColor?: Color            // Unfilled portion

  // Style
  style?: 'bar' | 'blocks' | 'braille' | 'ascii'

  // Characters (for custom styling)
  filledChar?: string
  emptyChar?: string

  // Label
  showLabel?: boolean
  labelPosition?: 'left' | 'right' | 'center' | 'inside'
  labelFormat?: (value: number, max: number) => string
  labelColor?: Color

  // Border
  border?: 'none' | 'single' | 'rounded'
  borderColor?: Color

  // Spacing
  margin?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number

  // Visibility
  visible?: boolean

  // Flex item
  flexGrow?: number
  flexShrink?: number
}
```

---

### canvas

Low-level pixel/cell drawing surface for custom graphics.

```typescript
canvas(props: CanvasProps): Component

interface CanvasProps {
  // Dimensions
  width: number
  height: number

  // Identity
  id?: string

  // Resolution mode
  mode?: 'cell' | 'pixel'            // 'pixel' uses quadrant characters for 2x resolution

  // Drawing callback (called when canvas needs to render)
  draw: (ctx: CanvasContext) => void

  // Background
  backgroundColor?: Color

  // Spacing
  margin?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number

  // Visibility
  visible?: boolean
  opacity?: number

  // Flex item
  flexGrow?: number
  flexShrink?: number

  // Events (for interactive canvases)
  onMouseDown?: (x: number, y: number, event: MouseEvent) => void
  onMouseUp?: (x: number, y: number, event: MouseEvent) => void
  onMouseMove?: (x: number, y: number, event: MouseEvent) => void
}

interface CanvasContext {
  width: number
  height: number

  // Drawing
  setCell(x: number, y: number, char: string, fg?: Color, bg?: Color): void
  setPixel(x: number, y: number, color: Color): void  // Only in 'pixel' mode

  // Shapes
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color): void
  drawRect(x: number, y: number, w: number, h: number, color: Color, fill?: boolean): void
  drawCircle(cx: number, cy: number, r: number, color: Color, fill?: boolean): void

  // Text
  drawText(x: number, y: number, text: string, color?: Color): void

  // Clearing
  clear(color?: Color): void
  clearRect(x: number, y: number, w: number, h: number): void
}
```

---

## Input APIs

### keyboard

Global keyboard state and event handling.

```typescript
import { keyboard } from 'tui'

// Reactive state (signals)
keyboard.lastKey         // Signal<string | null> - Last key pressed
keyboard.lastEvent       // Signal<KeyEvent | null> - Full event
keyboard.modifiers       // Signal<Modifiers> - Current modifier state

// Event handlers
keyboard.on(handler: (event: KeyEvent) => void): () => void
keyboard.onKey(key: string, handler: (event: KeyEvent) => void): () => void
keyboard.onKey(['a', 'b', 'c'], handler): () => void  // Multiple keys

// Shortcut registration
keyboard.shortcut('ctrl+s', handler: () => void): () => void
keyboard.shortcut('ctrl+shift+p', handler): () => void

// Types
interface KeyEvent {
  key: string                        // 'a', 'Enter', 'ArrowUp', etc.
  char?: string                      // Printable character if any
  modifiers: Modifiers
  state: 'press' | 'release' | 'repeat'
  preventDefault: () => void
}

interface Modifiers {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}
```

---

### mouse

Global mouse state and event handling.

```typescript
import { mouse } from 'tui'

// Reactive state (signals)
mouse.x                  // Signal<number> - Current X position (cell)
mouse.y                  // Signal<number> - Current Y position (cell)
mouse.buttons            // Signal<MouseButtons> - Currently pressed buttons
mouse.isDown             // Signal<boolean> - Any button down

// Event handlers
mouse.on(handler: (event: MouseEvent) => void): () => void
mouse.onClick(handler: (event: MouseEvent) => void): () => void
mouse.onDoubleClick(handler): () => void
mouse.onDrag(handler: (event: DragEvent) => void): () => void
mouse.onScroll(handler: (event: ScrollEvent) => void): () => void

// Types
interface MouseEvent {
  x: number
  y: number
  button: 'left' | 'middle' | 'right' | 'none'
  state: 'down' | 'up' | 'move'
  modifiers: Modifiers
  target?: string                    // Component ID under cursor
}

interface DragEvent extends MouseEvent {
  startX: number
  startY: number
  deltaX: number
  deltaY: number
}

interface ScrollEvent {
  x: number
  y: number
  deltaX: number
  deltaY: number
  modifiers: Modifiers
}

interface MouseButtons {
  left: boolean
  middle: boolean
  right: boolean
}
```

---

### focus

Focus management system.

```typescript
import { focus } from 'tui'

// Reactive state
focus.current            // Signal<string | null> - Currently focused component ID
focus.hasFocus           // Signal<boolean> - Is anything focused

// Methods
focus.set(id: string): void
focus.clear(): void
focus.next(): void                   // Focus next focusable (Tab)
focus.previous(): void               // Focus previous (Shift+Tab)

// Query
focus.isFocused(id: string): boolean

// Events
focus.onFocusChange(handler: (current: string | null, previous: string | null) => void): () => void
```

---

## Theme API

```typescript
import { theme } from 'tui'

// Reactive colors (signals) - all support OKLCH
theme.colors.primary     // Signal<Color>
theme.colors.secondary   // Signal<Color>
theme.colors.accent      // Signal<Color>
theme.colors.success     // Signal<Color>
theme.colors.warning     // Signal<Color>
theme.colors.error       // Signal<Color>
theme.colors.info        // Signal<Color>
theme.colors.text        // Signal<Color>
theme.colors.textMuted   // Signal<Color>
theme.colors.textBright  // Signal<Color>
theme.colors.background  // Signal<Color>
theme.colors.surface     // Signal<Color>
theme.colors.border      // Signal<Color>

// Theme metadata
theme.name               // Signal<string>
theme.isDark             // Signal<boolean>

// Methods
theme.set(themeName: string): void           // 'default', 'dracula', 'nord', etc.
theme.set(customTheme: ThemeDefinition): void
theme.extend(overrides: Partial<ThemeColors>): void

// Color utilities (OKLCH support)
theme.color(input: ColorInput): Color        // Parse any color format
theme.oklch(l: number, c: number, h: number, a?: number): Color
theme.lighten(color: Color, amount: number): Color
theme.darken(color: Color, amount: number): Color
theme.alpha(color: Color, alpha: number): Color

// Available themes
theme.availableThemes    // string[]

// Types
type Color = number                          // Internal: 0xRRGGBBAA

type ColorInput =
  | string                                   // '#ff0000', 'red', 'oklch(70% 0.15 200)'
  | number                                   // 0xff0000
  | { r: number, g: number, b: number, a?: number }
  | { l: number, c: number, h: number, a?: number }  // OKLCH

interface ThemeDefinition {
  name: string
  isDark: boolean
  colors: ThemeColors
}

interface ThemeColors {
  primary: ColorInput
  secondary: ColorInput
  accent: ColorInput
  success: ColorInput
  warning: ColorInput
  error: ColorInput
  info: ColorInput
  text: ColorInput
  textMuted: ColorInput
  textBright: ColorInput
  background: ColorInput
  surface: ColorInput
  border: ColorInput
}
```

---

## Mount & Lifecycle

```typescript
import { mount, terminal } from 'tui'

// Mount application
const app = mount(rootComponent: () => Component, options?: MountOptions): App

interface MountOptions {
  // Render mode (choose one)
  mode?: 'fullscreen' | 'inline' | 'append'  // Default: 'fullscreen'
  // - 'fullscreen': Alternate screen buffer, full terminal control
  // - 'inline': Renders inline, save/restore cursor, updates in place
  // - 'append': Content flows down, still reactive (can update previous content)

  // Mouse support
  mouse?: boolean                    // Enable mouse (default: true)

  // Initial theme
  theme?: string | ThemeDefinition

  // Debug
  debug?: boolean                    // Show debug overlay
  showFPS?: boolean                  // Show FPS counter
}

interface App {
  // Lifecycle
  unmount(): void

  // State access (for debugging/testing)
  getStats(): RenderStats
}

interface RenderStats {
  components: number                 // Total components
  visibleComponents: number
  lastRenderTime: number             // ms
  lastLayoutTime: number             // ms
  cellsRendered: number
  cellsChanged: number
}

// Terminal info (reactive)
terminal.width           // Signal<number>
terminal.height          // Signal<number>
terminal.size            // Signal<{ width: number, height: number }>
terminal.isRaw           // Signal<boolean>
terminal.supportsColor   // Signal<boolean>
terminal.supportsMouse   // Signal<boolean>

// Terminal events
terminal.onResize(handler: (width: number, height: number) => void): () => void
```

---

## Extracted Parallel Arrays

Based on the APIs above, here are all the parallel arrays we need:

### Component Registry
```typescript
componentType[]          // Uint8Array - box=0, text=1, input=2, select=3, progress=4, canvas=5
componentId[]            // string[] - User-provided IDs (sparse, only if provided)
```

### Hierarchy
```typescript
parentIndex[]            // Int32Array - Parent component index (-1 for root)
firstChildIndex[]        // Int32Array - First child index (-1 if none)
nextSiblingIndex[]       // Int32Array - Next sibling index (-1 if none)
childCount[]             // Uint16Array - Number of children
depth[]                  // Uint8Array - Tree depth (for z-ordering)
```

### Dimensions & Position
```typescript
x[]                      // Float32Array - Computed X position
y[]                      // Float32Array - Computed Y position
width[]                  // Float32Array - Computed width
height[]                 // Float32Array - Computed height
minWidth[]               // Float32Array
minHeight[]              // Float32Array
maxWidth[]               // Float32Array
maxHeight[]              // Float32Array
```

### Margin
```typescript
marginLeft[]             // Float32Array
marginRight[]            // Float32Array
marginTop[]              // Float32Array
marginBottom[]           // Float32Array
```

### Padding
```typescript
paddingLeft[]            // Float32Array
paddingRight[]           // Float32Array
paddingTop[]             // Float32Array
paddingBottom[]          // Float32Array
```

### Border
```typescript
borderStyle[]            // Uint8Array - none=0, single=1, double=2, rounded=3, etc.
borderLeft[]             // Uint8Array - boolean (0/1)
borderRight[]            // Uint8Array
borderTop[]              // Uint8Array
borderBottom[]           // Uint8Array
borderColor[]            // Uint32Array - RGBA
```

### Colors
```typescript
fgColor[]                // Uint32Array - RGBA
bgColor[]                // Uint32Array - RGBA
```

### Layout (Flexbox)
```typescript
flexDirection[]          // Uint8Array - row=0, column=1
flexWrap[]               // Uint8Array - nowrap=0, wrap=1
justifyContent[]         // Uint8Array - flex-start=0, center=1, flex-end=2, etc.
alignItems[]             // Uint8Array
alignContent[]           // Uint8Array
gap[]                    // Float32Array
rowGap[]                 // Float32Array
columnGap[]              // Float32Array
flexGrow[]               // Float32Array
flexShrink[]             // Float32Array
flexBasis[]              // Float32Array (-1 for auto)
alignSelf[]              // Uint8Array
position[]               // Uint8Array - relative=0, absolute=1
zIndex[]                 // Int16Array
```

### Overflow & Scroll
```typescript
overflow[]               // Uint8Array - visible=0, hidden=1, scroll=2
scrollX[]                // Float32Array
scrollY[]                // Float32Array
scrollMaxX[]             // Float32Array - Computed max scroll
scrollMaxY[]             // Float32Array
```

### Visibility & Opacity
```typescript
visible[]                // Uint8Array - boolean
opacity[]                // Float32Array - 0-1
```

### Focus & Interaction
```typescript
focusable[]              // Uint8Array - boolean
tabIndex[]               // Int16Array
disabled[]               // Uint8Array - boolean
```

### Text Content (for text, input components)
```typescript
textContent[]            // string[] - The actual text
textColor[]              // Uint32Array - Override fg color
textAlign[]              // Uint8Array - left=0, center=1, right=2
textWrap[]               // Uint8Array - none=0, wrap=1, truncate=2, etc.
textBold[]               // Uint8Array - boolean
textDim[]                // Uint8Array - boolean
textItalic[]             // Uint8Array - boolean
textUnderline[]          // Uint8Array - boolean
textStrikethrough[]      // Uint8Array - boolean
```

### Input-specific
```typescript
inputValue[]             // string[] - Current input value
inputPlaceholder[]       // string[]
inputType[]              // Uint8Array - text=0, password=1, number=2
inputCursorPos[]         // Uint16Array - Cursor position
inputSelectionStart[]    // Int16Array - Selection start (-1 if none)
inputSelectionEnd[]      // Int16Array
inputMaxLength[]         // Uint16Array - 0 = unlimited
```

### Select-specific
```typescript
selectOptions[]          // SelectOption[][] - Options array per component
selectValue[]            // string[] | string[][] - Selected value(s)
selectHighlight[]        // Uint16Array - Currently highlighted index
selectMultiple[]         // Uint8Array - boolean
selectMaxVisible[]       // Uint8Array
```

### Progress-specific
```typescript
progressValue[]          // Float32Array - Current value
progressMax[]            // Float32Array - Max value
progressStyle[]          // Uint8Array - bar=0, blocks=1, braille=2
```

### Canvas-specific
```typescript
canvasBuffer[]           // Cell[][] - Canvas cell buffers (sparse, only for canvas components)
canvasMode[]             // Uint8Array - cell=0, pixel=1
```

### Events (sparse - only components with handlers)
```typescript
eventHandlers: Map<number, ComponentEventHandlers>

interface ComponentEventHandlers {
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (event: KeyEvent) => void
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
  onMouseMove?: (event: MouseEvent) => void
  onScroll?: (offset: { x: number, y: number }) => void
  onChange?: (value: any) => void
  onSubmit?: (value: any) => void
}
```

---

## Summary

**Total Arrays: ~65+**

Categories:
- Registry: 2
- Hierarchy: 5
- Dimensions: 8
- Margin: 4
- Padding: 4
- Border: 6
- Colors: 2
- Layout: 14
- Scroll: 5
- Visibility: 2
- Focus: 3
- Text: 9
- Input: 7
- Select: 5
- Progress: 3
- Canvas: 2

All arrays share the same indexing:
- Index 0 = Component 0
- Index N = Component N
- Same index across ALL arrays = one component's complete state
