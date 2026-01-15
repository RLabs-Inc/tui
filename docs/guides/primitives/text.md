# Text Guide

> Display text with formatting, alignment, and wrapping

## Overview

`text` is the primitive for displaying text content. It supports:

- **Reactive content** - Content updates automatically with signals
- **Formatting** - Bold, italic, underline, strikethrough
- **Alignment** - Left, center, right
- **Wrapping** - Automatic line wrapping or truncation
- **Colors** - Foreground and background

## Basic Usage

```typescript
import { text } from '@rlabs-inc/tui'

text({ content: 'Hello, World!' })
```

## Reactive Content

The `content` prop can be static, a signal, or a getter:

```typescript
import { signal, derived } from '@rlabs-inc/signals'

const count = signal(0)

// Static
text({ content: 'Static text' })

// Signal
const message = signal('Hello')
text({ content: message })

// Getter (most common pattern)
text({ content: () => `Count: ${count.value}` })

// Derived
const formatted = derived(() => count.value.toFixed(2))
text({ content: formatted })
```

When the signal changes, only that text updates - not the whole UI.

## Colors

```typescript
import { t, Colors } from '@rlabs-inc/tui'

text({
  content: 'Colored text',

  // Theme colors (recommended)
  fg: t.primary,
  bg: t.surface,

  // Direct colors
  fg: Colors.GREEN,
  bg: { r: 0, g: 0, b: 0, a: 255 },
})
```

### Dynamic Colors

```typescript
const isError = signal(false)

text({
  content: 'Status',
  fg: derived(() => isError.value ? t.error.value : t.success.value)
})
```

## Text Attributes

```typescript
import { Attr } from '@rlabs-inc/tui'

// Single attribute
text({
  content: 'Bold text',
  attrs: Attr.BOLD
})

// Multiple attributes (bitwise OR)
text({
  content: 'Bold and italic',
  attrs: Attr.BOLD | Attr.ITALIC
})
```

### Available Attributes

| Attribute | Effect |
|-----------|--------|
| `Attr.BOLD` | Bold text |
| `Attr.DIM` | Dimmed/faint text |
| `Attr.ITALIC` | Italic text |
| `Attr.UNDERLINE` | Underlined text |
| `Attr.BLINK` | Blinking text (terminal support varies) |
| `Attr.INVERSE` | Swap foreground/background |
| `Attr.HIDDEN` | Hidden text |
| `Attr.STRIKETHROUGH` | Strikethrough text |

### Reactive Attributes

```typescript
const isBold = signal(false)

text({
  content: 'Dynamic styling',
  attrs: derived(() => isBold.value ? Attr.BOLD : 0)
})
```

## Alignment

```typescript
text({
  content: 'Centered',
  align: 'center',    // 'left' | 'center' | 'right'
  width: 40           // Alignment within this width
})
```

Alignment works best with an explicit width:

```typescript
box({
  width: 50,
  children: () => {
    text({ content: 'Left aligned', align: 'left' })
    text({ content: 'Center aligned', align: 'center' })
    text({ content: 'Right aligned', align: 'right' })
  }
})
```

## Wrapping

Control how text handles overflow:

```typescript
// Wrap (default) - break to new lines
text({
  content: 'This is a very long piece of text that will wrap to multiple lines when it exceeds the available width',
  wrap: 'wrap',
  width: 30
})

// No wrap - extends beyond container
text({
  content: 'This text will not wrap',
  wrap: 'nowrap'
})

// Truncate - cut with ellipsis
text({
  content: 'This text will be truncated with an ellipsis if too long',
  wrap: 'truncate',
  width: 30
})
```

## Dimensions

```typescript
text({
  content: 'Sized text',

  // Fixed dimensions
  width: 40,
  height: 3,

  // Constraints
  minWidth: 10,
  maxWidth: 80,
})
```

## Variants

Apply themed styles automatically:

```typescript
text({
  content: 'Success message',
  variant: 'success'
})

text({
  content: 'Error occurred',
  variant: 'error'
})
```

Available variants:
- `default`, `primary`, `secondary`
- `success`, `warning`, `error`, `info`
- `ghost`, `outline`

## Visibility

```typescript
const showMessage = signal(true)

text({
  content: 'Conditional text',
  visible: showMessage
})

// Toggle visibility
showMessage.value = false
```

## Spacing

Text supports margin for positioning:

```typescript
text({
  content: 'Spaced text',
  margin: 1,
  marginTop: 2,
  marginBottom: 2
})
```

Note: Text doesn't have padding (use a box wrapper for that).

## Common Patterns

### Label + Value

```typescript
box({
  flexDirection: 'row',
  gap: 1,
  children: () => {
    text({ content: 'Name:', fg: t.textDim })
    text({ content: () => user.name.value, fg: t.text })
  }
})
```

### Status Indicator

```typescript
const status = signal<'loading' | 'success' | 'error'>('loading')

text({
  content: derived(() => {
    switch (status.value) {
      case 'loading': return 'Loading...'
      case 'success': return 'Complete!'
      case 'error': return 'Failed!'
    }
  }),
  fg: derived(() => {
    switch (status.value) {
      case 'loading': return t.textDim.value
      case 'success': return t.success.value
      case 'error': return t.error.value
    }
  })
})
```

### Formatted Numbers

```typescript
const count = signal(1234567)

text({
  content: derived(() => count.value.toLocaleString()),
  align: 'right',
  width: 15
})
```

### Multi-line Text

```typescript
text({
  content: `Line 1
Line 2
Line 3`,
  wrap: 'wrap'
})
```

### Key Bindings Display

```typescript
box({
  flexDirection: 'row',
  gap: 2,
  children: () => {
    text({
      content: '[Enter]',
      fg: t.primary,
      attrs: Attr.BOLD,
      width: 10
    })
    text({
      content: 'Submit form',
      fg: t.textDim
    })
  }
})
```

## Performance Tips

1. **Prefer getters over derived for simple expressions**:
   ```typescript
   // Good - simple getter
   text({ content: () => `Count: ${count.value}` })

   // Overkill for simple formatting
   const formatted = derived(() => `Count: ${count.value}`)
   text({ content: formatted })
   ```

2. **Use derived for expensive computations**:
   ```typescript
   // Good - computed once, cached
   const stats = derived(() => calculateStats(data.value))
   text({ content: () => `Stats: ${stats.value}` })
   ```

3. **Batch updates when changing multiple signals**:
   ```typescript
   import { batch } from '@rlabs-inc/signals'

   batch(() => {
     name.value = 'New name'
     count.value = 0
   })
   ```

## See Also

- [API Reference: text](../../api/primitives/text.md)
- [Box Guide](./box.md)
- [Colors Guide](../styling/colors.md)
- [Themes Guide](../styling/themes.md)
