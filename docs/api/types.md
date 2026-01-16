# Types Reference

> TypeScript type definitions

## Import

```typescript
import type {
  // Component types
  BoxProps, TextProps, Cleanup,
  // Reactive types
  Reactive, PropInput,
  // Color types
  RGBA, ThemeColor,
  // Dimension types
  Dimension,
  // Event types
  KeyboardEvent, MouseEvent, Modifiers,
  // Theme types
  Variant, VariantStyle
} from '@rlabs-inc/tui'
```

## Component Types

### BoxProps

Props for the `box()` primitive.

```typescript
interface BoxProps extends
  StyleProps,
  BorderProps,
  DimensionProps,
  SpacingProps,
  LayoutProps,
  InteractionProps
{
  id?: string
  visible?: Reactive<boolean>
  children?: () => void
  variant?: Variant
}
```

### TextProps

Props for the `text()` primitive.

```typescript
interface TextProps extends
  StyleProps,
  DimensionProps,
  SpacingProps,
  LayoutProps
{
  content: Reactive<string>
  align?: Reactive<'left' | 'center' | 'right'>
  attrs?: Reactive<CellAttrs>
  wrap?: Reactive<'wrap' | 'nowrap' | 'truncate'>
  visible?: Reactive<boolean>
  variant?: Variant
}
```

### Cleanup

Component cleanup function.

```typescript
type Cleanup = () => void
```

---

## Prop Group Types

### StyleProps

```typescript
interface StyleProps {
  fg?: Reactive<RGBA | null>
  bg?: Reactive<RGBA | null>
  opacity?: Reactive<number>
}
```

### BorderProps

```typescript
interface BorderProps {
  border?: Reactive<number>
  borderColor?: Reactive<RGBA | null>
  borderTop?: Reactive<number>
  borderRight?: Reactive<number>
  borderBottom?: Reactive<number>
  borderLeft?: Reactive<number>
}
```

### DimensionProps

```typescript
interface DimensionProps {
  width?: Reactive<Dimension>
  height?: Reactive<Dimension>
  minWidth?: Reactive<Dimension>
  maxWidth?: Reactive<Dimension>
  minHeight?: Reactive<Dimension>
  maxHeight?: Reactive<Dimension>
}
```

### SpacingProps

```typescript
interface SpacingProps {
  padding?: Reactive<number>
  paddingTop?: Reactive<number>
  paddingRight?: Reactive<number>
  paddingBottom?: Reactive<number>
  paddingLeft?: Reactive<number>
  margin?: Reactive<number>
  marginTop?: Reactive<number>
  marginRight?: Reactive<number>
  marginBottom?: Reactive<number>
  marginLeft?: Reactive<number>
  gap?: Reactive<number>
}
```

### LayoutProps

```typescript
interface LayoutProps {
  flexDirection?: Reactive<FlexDirection>
  flexWrap?: Reactive<FlexWrap>
  justifyContent?: Reactive<JustifyContent>
  alignItems?: Reactive<AlignItems>
  alignSelf?: Reactive<AlignSelf>
  grow?: Reactive<number>
  shrink?: Reactive<number>
  flexBasis?: Reactive<number>
  overflow?: Reactive<Overflow>
  zIndex?: Reactive<number>
}
```

### InteractionProps

```typescript
interface InteractionProps {
  focusable?: Reactive<boolean>
  tabIndex?: Reactive<number>
}
```

---

## Reactive Types

### Reactive<T>

Value that can be static or reactive. **All TUI component props accept this type.**

```typescript
type Reactive<T> =
  | T                    // Static value
  | WritableSignal<T>    // signal()
  | DerivedSignal<T>     // derived()
  | Binding<T>           // bind()
  | ReadonlyBinding<T>   // ReadonlyBinding
  | (() => T)            // Getter function (for inline computations)
```

**The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations.

```typescript
const width = signal(40)
const height = derived(() => width.value / 2)

box({
  width,                           // Signal directly - works!
  height,                          // Derived directly - works!
  padding: 2,                      // Static value - works!
  bg: () => isActive.value ? t.primary.value : null  // Inline computation
})
```

### PropInput<T>

Input type for component props (includes getter functions). Same as Reactive<T>.

```typescript
type PropInput<T> =
  | T                    // Static value
  | WritableSignal<T>    // signal()
  | DerivedSignal<T>     // derived()
  | (() => T)            // Getter function
  | Binding<T>           // bind()
```

### WithReactive<T, K>

Make specific props reactive.

```typescript
type WithReactive<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: Reactive<T[P]>
}
```

---

## Color Types

### RGBA

```typescript
interface RGBA {
  r: number  // 0-255, or -1 for terminal default
  g: number  // 0-255
  b: number  // 0-255
  a: number  // 0-255 (255 = opaque)
}
```

### ThemeColor

```typescript
type ThemeColor = null | number | string
// null: Terminal default
// 0-255: ANSI color index
// > 255: RGB (0xRRGGBB)
// string: CSS color
```

### TERMINAL_DEFAULT

```typescript
const TERMINAL_DEFAULT: RGBA = { r: -1, g: -1, b: -1, a: 255 }
```

---

## Dimension Types

### Dimension

```typescript
type Dimension = number | `${number}%`
// 0: auto
// 40: 40 columns/rows
// '50%': 50% of parent
```

---

## Layout Types

### FlexDirection

```typescript
type FlexDirection =
  | 'column'
  | 'row'
  | 'column-reverse'
  | 'row-reverse'
```

### FlexWrap

```typescript
type FlexWrap =
  | 'nowrap'
  | 'wrap'
  | 'wrap-reverse'
```

### JustifyContent

```typescript
type JustifyContent =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
```

### AlignItems

```typescript
type AlignItems =
  | 'stretch'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'baseline'
```

### AlignSelf

```typescript
type AlignSelf =
  | 'auto'
  | 'stretch'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'baseline'
```

### Overflow

```typescript
type Overflow =
  | 'visible'
  | 'hidden'
  | 'scroll'
  | 'auto'
```

---

## Text Types

### TextAlign

```typescript
type TextAlign = 'left' | 'center' | 'right'
```

### TextWrap

```typescript
type TextWrap = 'wrap' | 'nowrap' | 'truncate'
```

### CellAttrs

```typescript
type CellAttrs = number
// Bit flags for text attributes
```

---

## Event Types

### KeyboardEvent

```typescript
interface KeyboardEvent {
  key: string
  char: string
  modifiers: Modifiers
  state: KeyState
  raw: string
}
```

### MouseEvent

```typescript
interface MouseEvent {
  action: MouseAction
  button: MouseButton
  x: number
  y: number
  modifiers: {
    shift: boolean
    ctrl: boolean
    alt: boolean
  }
}
```

### Modifiers

```typescript
interface Modifiers {
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean
}
```

### KeyState

```typescript
type KeyState = 'press' | 'repeat' | 'release'
```

### MouseAction

```typescript
type MouseAction = 'press' | 'release' | 'move' | 'scroll'
```

### MouseButton

```typescript
enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  SCROLL_UP = 64,
  SCROLL_DOWN = 65,
  SCROLL_LEFT = 66,
  SCROLL_RIGHT = 67
}
```

### ScrollInfo

```typescript
interface ScrollInfo {
  direction: 'up' | 'down' | 'left' | 'right'
  x: number
  y: number
}
```

---

## Handler Types

### KeyHandler

```typescript
type KeyHandler = (event: KeyboardEvent) => boolean | void
```

### MouseHandler

```typescript
type MouseHandler = (event: MouseEvent) => boolean | void
```

### MouseHandlers

```typescript
interface MouseHandlers {
  onClick?: () => void
  onMouseDown?: () => void
  onMouseUp?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMouseMove?: () => void
}
```

---

## Theme Types

### Variant

```typescript
type Variant =
  | 'default'
  | 'primary' | 'secondary' | 'tertiary' | 'accent'
  | 'success' | 'warning' | 'error' | 'info'
  | 'muted' | 'surface' | 'elevated'
  | 'ghost' | 'outline'
```

### VariantStyle

```typescript
interface VariantStyle {
  fg: RGBA
  bg: RGBA
  border: RGBA
  borderFocus: RGBA
}
```

---

## Mount Types

### MountOptions

```typescript
interface MountOptions {
  mode?: 'fullscreen' | 'inline' | 'append'
  mouse?: boolean
  kittyKeyboard?: boolean
  getStaticHeight?: () => number  // append mode only
}
```

### AppendMountResult

```typescript
interface AppendMountResult {
  cleanup: () => Promise<void>
  renderToHistory: (componentFn: () => void) => void
}
```

### ResizeEvent

```typescript
interface ResizeEvent {
  width: number
  height: number
}
```

---

## Cursor Types

### CursorShape

```typescript
type CursorShape = 'block' | 'underline' | 'bar'
```

---

## Constants

### BorderStyle

```typescript
const BorderStyle = {
  NONE: 0,
  SINGLE: 1,
  DOUBLE: 2,
  ROUNDED: 3,
  THICK: 4,
  DASHED: 5,
  DOTTED: 6
}
```

### Attr (Text Attributes)

```typescript
const Attr = {
  NORMAL: 0,
  BOLD: 1,
  DIM: 2,
  ITALIC: 4,
  UNDERLINE: 8,
  BLINK: 16,
  INVERSE: 32,
  HIDDEN: 64,
  STRIKETHROUGH: 128
}
```

## See Also

- [API Reference](./README.md)
- [box()](./primitives/box.md)
- [text()](./primitives/text.md)
