# Colors Guide

> RGBA, ANSI, and OKLCH color systems

## Overview

TUI supports multiple color formats:

- **RGBA** - Full 24-bit true color
- **ANSI** - 16 and 256 color palettes
- **OKLCH** - Perceptually uniform color space
- **Terminal default** - Inherit from user's theme

## Basic Usage

```typescript
import { t, Colors } from '@rlabs-inc/tui'

// Theme colors (recommended)
text({ content: 'Hello', fg: t.primary })

// Preset colors
text({ content: 'Error', fg: Colors.RED })

// Custom RGBA
text({ content: 'Custom', fg: { r: 255, g: 128, b: 0, a: 255 } })
```

## Color Formats

### RGBA

Full 24-bit color with alpha:

```typescript
interface RGBA {
  r: number  // 0-255
  g: number  // 0-255
  b: number  // 0-255
  a: number  // 0-255 (255 = opaque)
}

// Example
box({ bg: { r: 30, g: 30, b: 46, a: 255 } })
```

### Color Presets

```typescript
import { Colors } from '@rlabs-inc/tui'

Colors.BLACK
Colors.WHITE
Colors.RED
Colors.GREEN
Colors.BLUE
Colors.YELLOW
Colors.CYAN
Colors.MAGENTA
Colors.GRAY
```

### Utility Functions

```typescript
import { rgba, parseColor, ansiColor } from '@rlabs-inc/tui'

// Create RGBA
const orange = rgba(255, 128, 0)      // r, g, b (a defaults to 255)
const transparent = rgba(0, 0, 0, 128) // With alpha

// Parse CSS-style colors
const red = parseColor('#ff0000')
const blue = parseColor('rgb(0, 0, 255)')
const oklch = parseColor('oklch(70% 0.15 200)')

// ANSI palette color
const ansiRed = ansiColor(1)     // ANSI color #1 (red)
const ansi256 = ansiColor(208)   // Extended 256-color
```

## Theme Colors

The theme system provides semantic colors:

```typescript
import { t } from '@rlabs-inc/tui'

// Primary/accent colors
t.primary
t.secondary
t.tertiary
t.accent

// Semantic colors
t.success    // Green
t.warning    // Yellow
t.error      // Red
t.info       // Blue

// Text colors
t.text       // Primary text
t.textMuted  // Secondary text
t.textDim    // Tertiary text
t.textDisabled
t.textBright

// Background colors
t.background
t.backgroundMuted
t.surface
t.overlay

// Border colors
t.border
t.borderFocus
```

### Theme Colors Are Reactive

```typescript
import { setTheme } from '@rlabs-inc/tui'

// Colors update automatically when theme changes
text({ content: 'Themed text', fg: t.primary })

// Later...
setTheme('dracula')  // Text color updates!
```

## Terminal Default

Use `null` for terminal's default color:

```typescript
text({
  content: 'Uses terminal default',
  fg: null,  // Uses terminal's foreground
  bg: null,  // Uses terminal's background (transparent)
})
```

This respects the user's terminal color scheme.

## OKLCH Colors

OKLCH is a perceptually uniform color space - great for generating color palettes:

```typescript
import { parseColor } from '@rlabs-inc/tui'

// oklch(lightness, chroma, hue)
// lightness: 0-100%
// chroma: 0-0.4 (saturation)
// hue: 0-360 (degrees)

const purple = parseColor('oklch(60% 0.25 280)')
const muted = parseColor('oklch(60% 0.08 280)')  // Same hue, less chroma
```

### Why OKLCH?

- **Perceptually uniform** - Equal changes in values = equal visual changes
- **Easy palettes** - Adjust hue while keeping lightness/chroma consistent
- **Better gradients** - Smoother transitions than RGB

## Color with Opacity

### RGBA Alpha

```typescript
box({
  bg: { r: 0, g: 0, b: 0, a: 128 }  // 50% transparent black
})
```

### Component Opacity

```typescript
box({
  bg: Colors.BLACK,
  opacity: 0.5,  // Affects entire component
})
```

## Dynamic Colors

Colors can be reactive:

```typescript
const isError = signal(false)

text({
  content: 'Status',
  fg: derived(() => isError.value ? t.error.value : t.success.value)
})
```

### Gradient-Like Effect

```typescript
const items = ['A', 'B', 'C', 'D', 'E']

each(
  () => items,
  (getItem, key) => {
    const i = parseInt(key)
    const lightness = 50 + i * 10  // 50%, 60%, 70%, ...

    return text({
      content: getItem,
      fg: parseColor(`oklch(${lightness}% 0.2 200)`)
    })
  },
  { key: (_, i) => String(i) }
)
```

## Color Inheritance

Colors inherit from parent to child:

```typescript
box({
  fg: t.primary,  // Set foreground
  children: () => {
    text({ content: 'Inherits primary color' })
    text({ content: 'Also inherits' })
    text({ content: 'Override', fg: t.error })  // Override
  }
})
```

## Common Patterns

### Status Colors

```typescript
function StatusText({ status }: { status: 'ok' | 'warn' | 'error' }) {
  const colorMap = {
    ok: t.success,
    warn: t.warning,
    error: t.error,
  }

  return text({
    content: status.toUpperCase(),
    fg: colorMap[status]
  })
}
```

### Highlighted Text

```typescript
text({
  content: 'IMPORTANT',
  fg: t.text,
  bg: t.primary,
})
```

### Muted Secondary Info

```typescript
box({
  children: () => {
    text({ content: 'Main content', fg: t.text })
    text({ content: 'Less important', fg: t.textMuted })
    text({ content: 'Even less important', fg: t.textDim })
  }
})
```

### Color-Coded List

```typescript
const severities = ['low', 'medium', 'high', 'critical']
const colors = [t.textDim, t.info, t.warning, t.error]

each(
  () => items.value,
  (getItem, key) => {
    const severity = getItem().severity
    const colorIndex = severities.indexOf(severity)

    return text({
      content: derived(() => getItem().text),
      fg: colors[colorIndex]
    })
  },
  { key: item => item.id }
)
```

## Terminal Compatibility

Not all terminals support all color features:

| Feature | Support |
|---------|---------|
| 16 colors | Universal |
| 256 colors | Most terminals |
| True color (24-bit) | Modern terminals |
| Opacity | Limited (some compositors) |

TUI uses true color by default. For maximum compatibility, use theme colors which can be configured for different color depths.

## See Also

- [Themes Guide](./themes.md)
- [API Reference: Colors](../../api/theme.md#colors)
- [Borders Guide](./borders.md)
