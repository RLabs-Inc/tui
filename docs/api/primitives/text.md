# text()

> Text content primitive with styling

## Import

```typescript
import { text } from '@rlabs-inc/tui'
```

## Signature

```typescript
function text(props: TextProps): Cleanup
```

## Parameters

### TextProps

All props accept **static values, signals, deriveds, or getter functions**.

> **The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations.

#### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `Reactive<string>` | required | Text content to display |
| `visible` | `Reactive<boolean>` | `true` | Whether text is rendered |
| `variant` | `Variant` | - | Style variant preset |

#### Style Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fg` | `Reactive<RGBA \| null>` | `null` | Text color |
| `bg` | `Reactive<RGBA \| null>` | `null` | Background color |
| `opacity` | `Reactive<number>` | `1` | Opacity (0-1) |
| `attrs` | `Reactive<CellAttrs>` | `0` | Text attributes (bold, italic, etc.) |

#### Layout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `Reactive<TextAlign>` | `'left'` | Text alignment |
| `wrap` | `Reactive<TextWrap>` | `'wrap'` | Text wrapping mode |
| `width` | `Reactive<Dimension>` | `0` (auto) | Width constraint |
| `height` | `Reactive<Dimension>` | `0` (auto) | Height constraint |

#### Spacing Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `Reactive<number>` | `0` | All sides padding |
| `paddingTop` | `Reactive<number>` | `0` | Top padding |
| `paddingRight` | `Reactive<number>` | `0` | Right padding |
| `paddingBottom` | `Reactive<number>` | `0` | Bottom padding |
| `paddingLeft` | `Reactive<number>` | `0` | Left padding |
| `margin` | `Reactive<number>` | `0` | All sides margin |
| `marginTop` | `Reactive<number>` | `0` | Top margin |
| `marginRight` | `Reactive<number>` | `0` | Right margin |
| `marginBottom` | `Reactive<number>` | `0` | Bottom margin |
| `marginLeft` | `Reactive<number>` | `0` | Left margin |

## Returns

```typescript
type Cleanup = () => void
```

## Examples

### Basic Text

```typescript
text({ content: 'Hello, World!' })
```

### Styled Text

```typescript
import { text, t, Attr } from '@rlabs-inc/tui'

text({
  content: 'Important message',
  fg: t.error,
  attrs: Attr.BOLD
})
```

### Combined Attributes

```typescript
text({
  content: 'Bold and italic',
  attrs: Attr.BOLD | Attr.ITALIC
})
```

### Reactive Content

Props accept signals and deriveds directly:

```typescript
const count = signal(0)
const display = derived(() => `Count: ${count.value}`)
const textColor = derived(() => count.value > 10 ? t.error.value : t.text.value)

text({
  content: display,    // Derived directly
  fg: textColor        // Derived directly
})
```

Use `() =>` only for inline computations:

```typescript
text({
  content: () => `Count: ${count.value}`,  // Inline computation
  fg: () => count.value > 10 ? t.error.value : t.text.value
})
```

### Text Alignment

```typescript
text({
  content: 'Centered',
  align: 'center',
  width: 40
})
```

### Text Wrapping

```typescript
// Wrap long text
text({
  content: 'This is a very long piece of text...',
  wrap: 'wrap',
  width: 30
})

// Truncate with ellipsis
text({
  content: 'Very long text that will be cut off',
  wrap: 'truncate',
  width: 20
})

// No wrapping
text({
  content: 'No wrap',
  wrap: 'nowrap'
})
```

### With Background

```typescript
text({
  content: ' Highlighted ',
  fg: t.background,
  bg: t.primary
})
```

### Dimmed Text

```typescript
text({
  content: 'Secondary info',
  fg: t.textDim
})
```

### Using Variant

```typescript
text({
  content: 'Error occurred!',
  variant: 'error'
})
```

### In a Box

```typescript
box({
  padding: 1,
  children: () => {
    text({ content: 'Title', fg: t.primary, attrs: Attr.BOLD })
    text({ content: 'Description here', fg: t.textMuted })
  }
})
```

## Type Definitions

### TextAlign

```typescript
type TextAlign = 'left' | 'center' | 'right'
```

### TextWrap

```typescript
type TextWrap = 'wrap' | 'nowrap' | 'truncate'
```

### CellAttrs (Attr)

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
  STRIKETHROUGH: 128,
}

// Combine with bitwise OR
const boldItalic = Attr.BOLD | Attr.ITALIC
```

## Unicode Support

Text handles Unicode correctly:

```typescript
text({ content: 'Hello, 世界!' })  // CJK characters
text({ content: '🎉 Emoji work!' })  // Emoji (width handled)
text({ content: 'RTL: مرحبا' })  // Right-to-left text
```

## ANSI Codes

ANSI escape codes in content are processed:

```typescript
// Not recommended, but supported
text({ content: '\x1b[31mRed text\x1b[0m' })

// Preferred: use fg prop
text({ content: 'Red text', fg: { r: 255, g: 0, b: 0, a: 255 } })
```

## Performance

Text rendering is optimized:
- Content is measured once per change
- Unicode width calculation is cached
- Only changed cells are updated

## See Also

- [Text Guide](../../guides/primitives/text.md)
- [Colors Guide](../../guides/styling/colors.md)
- [box()](./box.md)
