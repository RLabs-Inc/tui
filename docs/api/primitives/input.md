# input()

> Single-line text input primitive with full reactivity

## Import

```typescript
import { input } from '@rlabs-inc/tui'
```

## Signature

```typescript
function input(props: InputProps): Cleanup
```

## Parameters

### InputProps

All props accept **static values, signals, deriveds, or getter functions**.

> **The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations.

#### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `WritableSignal<string> \| Binding<string>` | required | Two-way bound input value |
| `placeholder` | `string` | - | Placeholder text when empty |
| `visible` | `Reactive<boolean>` | `true` | Whether input is rendered |
| `autoFocus` | `boolean` | `false` | Focus on mount |

#### Input-Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `password` | `boolean` | `false` | Mask characters |
| `maskChar` | `string` | `'•'` | Character for password masking |
| `maxLength` | `number` | `0` (unlimited) | Maximum input length |
| `placeholderColor` | `Reactive<RGBA \| null>` | `null` | Placeholder text color |

#### Dimension Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `Reactive<Dimension>` | `0` (auto) | Width (number or '%') |
| `height` | `Reactive<Dimension>` | `0` (auto) | Height |
| `minWidth/maxWidth` | `Reactive<Dimension>` | `0` | Width constraints |
| `minHeight/maxHeight` | `Reactive<Dimension>` | `0` | Height constraints |

#### Spacing Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `Reactive<number>` | `0` | All sides padding |
| `paddingTop/Right/Bottom/Left` | `Reactive<number>` | `0` | Per-side padding |
| `margin` | `Reactive<number>` | `0` | All sides margin |
| `marginTop/Right/Bottom/Left` | `Reactive<number>` | `0` | Per-side margin |

#### Style Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fg` | `Reactive<RGBA \| null>` | theme `textBright` | Text color |
| `bg` | `Reactive<RGBA \| null>` | `null` | Background color |
| `opacity` | `Reactive<number>` | `1` | Opacity (0-1) |
| `attrs` | `Reactive<CellAttrs>` | `0` | Text attributes (bold, italic, etc.) |

#### Border Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `border` | `Reactive<number>` | `0` | Border style (see BorderStyle) |
| `borderColor` | `Reactive<RGBA \| null>` | `null` | Border color |
| `borderTop/Right/Bottom/Left` | `Reactive<number>` | - | Per-side border overrides |

#### Cursor Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cursor` | `CursorConfig` | - | Cursor appearance configuration |

#### Variant Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `Variant` | - | Style variant preset |

#### Interaction Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `focusable` | `Reactive<boolean>` | `true` | Always focusable for inputs |
| `tabIndex` | `Reactive<number>` | `-1` | Tab order (-1 = not in tab order) |

#### Callback Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onChange` | `(value: string) => void` | - | Called when value changes |
| `onSubmit` | `(value: string) => void` | - | Called on Enter key |
| `onCancel` | `() => void` | - | Called on Escape key |
| `onFocus` | `() => void` | - | Called when input gains focus |
| `onBlur` | `() => void` | - | Called when input loses focus |

#### Mouse Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClick` | `(event: MouseEvent) => boolean \| void` | - | Called when input is clicked. Return true to consume event |
| `onMouseDown` | `(event: MouseEvent) => boolean \| void` | - | Called when mouse button is pressed |
| `onMouseUp` | `(event: MouseEvent) => boolean \| void` | - | Called when mouse button is released |
| `onMouseEnter` | `(event: MouseEvent) => void` | - | Called when mouse enters input bounds |
| `onMouseLeave` | `(event: MouseEvent) => void` | - | Called when mouse leaves input bounds |
| `onScroll` | `(event: MouseEvent) => boolean \| void` | - | Called on scroll wheel events |

> **Click-to-Focus**: Inputs automatically focus when clicked. Your `onClick` handler fires after focus is applied.

## Returns

```typescript
type Cleanup = () => void
```

Call the returned function to unmount the input and release its resources.

## Examples

### Basic Text Input

```typescript
const name = signal('')

input({
  value: name,
  placeholder: 'Enter your name...'
})
```

### Password Field

```typescript
input({
  value: password,
  password: true,
  maskChar: '●'
})
```

### With Max Length

```typescript
input({
  value: username,
  placeholder: 'Username (max 20)',
  maxLength: 20
})
```

### With Variants

```typescript
input({ value: email, variant: 'primary' })
input({ value: invalid, variant: 'error' })
```

### Cursor Customization

```typescript
// Block cursor with fast blink
input({
  value: text,
  cursor: { style: 'block', blink: { fps: 4 } }
})

// Underline cursor, no blink
input({
  value: text,
  cursor: { style: 'underline', blink: false }
})
```

### With Event Handlers

```typescript
input({
  value: query,
  onChange: (val) => console.log('Typing:', val),
  onSubmit: (val) => performSearch(val),
  onCancel: () => query.value = ''
})
```

### Two-Way Binding

```typescript
const formData = signal('')
const display = derived(() => `You typed: ${formData.value}`)

box({
  children: () => {
    input({ value: formData })
    text({ content: display })
  }
})
```

### In a Form Layout

```typescript
box({
  flexDirection: 'column',
  gap: 1,
  border: BorderStyle.ROUNDED,
  children: () => {
    text({ content: 'Login', attrs: Attr.BOLD })
    input({ value: username, placeholder: 'Username', autoFocus: true })
    input({ value: password, placeholder: 'Password', password: true })
  }
})
```

### Styled with Borders

```typescript
const focused = signal(false)

input({
  value: text,
  border: BorderStyle.ROUNDED,
  borderColor: () => focused.value ? t.primary : t.border,
  width: 40,
  onFocus: () => focused.value = true,
  onBlur: () => focused.value = false
})
```

## Type Definitions

### CursorStyle

```typescript
type CursorStyle = 'block' | 'bar' | 'underline'
```

### BlinkConfig

```typescript
interface BlinkConfig {
  enabled?: boolean      // Enable blink (default: true)
  altChar?: string       // Character on "off" phase
  fps?: number           // Blink rate (default: 2 = 500ms)
}
```

### CursorConfig

```typescript
interface CursorConfig {
  style?: CursorStyle    // Cursor shape
  char?: string          // Custom character (overrides style)
  blink?: boolean | BlinkConfig
  fg?: Reactive<RGBA>    // Cursor foreground color
  bg?: Reactive<RGBA>    // Cursor background color
}
```

### Variant

```typescript
type Variant =
  | 'default' | 'primary' | 'secondary' | 'tertiary' | 'accent'
  | 'success' | 'warning' | 'error' | 'info'
  | 'muted' | 'surface' | 'elevated' | 'ghost' | 'outline'
```

## Keyboard Behavior

When focused, the input handles these keys:

| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Move cursor |
| `Home/End` | Jump to start/end |
| `Backspace` | Delete before cursor |
| `Delete` | Delete after cursor |
| `Enter` | Triggers `onSubmit` |
| `Escape` | Triggers `onCancel` |
| Printable chars | Insert at cursor |

## See Also

- [Input Guide](../../guides/primitives/input.md)
- [Focus Management](../../guides/state/focus.md)
- [box()](./box.md)
- [text()](./text.md)
