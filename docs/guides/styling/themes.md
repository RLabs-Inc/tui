# Themes Guide

> Built-in themes and customization

## Overview

TUI includes a complete theming system:

- **14 built-in themes** - Terminal, Dracula, Nord, Monokai, Solarized, Catppuccin, Gruvbox, Tokyo Night, One Dark, Rose Pine, Kanagawa, Everforest, Night Owl
- **Semantic colors** - Colors with meaning, not just values
- **Variants** - Pre-styled component states
- **Reactive** - Theme changes update UI automatically

## Using Theme Colors

```typescript
import { t } from '@rlabs-inc/tui'

text({ content: 'Primary text', fg: t.primary })
text({ content: 'Muted text', fg: t.textMuted })

box({
  bg: t.surface,
  borderColor: t.border,
  children: () => { /* ... */ }
})
```

## Available Theme Colors

### Brand Colors

```typescript
t.primary      // Primary brand color
t.secondary    // Secondary brand color
t.tertiary     // Tertiary brand color
t.accent       // Accent/highlight color
```

### Semantic Colors

```typescript
t.success      // Positive/success (green)
t.warning      // Warning/caution (yellow)
t.error        // Error/danger (red)
t.info         // Information (blue)
```

### Text Colors

```typescript
t.text         // Primary text
t.textMuted    // Secondary/muted text
t.textDim      // Tertiary/dim text
t.textDisabled // Disabled text
t.textBright   // Emphasized text
```

### Background Colors

```typescript
t.background       // Main background
t.backgroundMuted  // Muted background
t.surface          // Raised surface (cards, panels)
t.overlay          // Modal/overlay background
```

### Border Colors

```typescript
t.border       // Default border
t.borderFocus  // Focused element border
```

## Switching Themes

```typescript
import { setTheme, themes } from '@rlabs-inc/tui'

// Set a built-in theme
setTheme('dracula')
setTheme('nord')
setTheme('monokai')
setTheme('solarized')
setTheme('terminal')  // Respects user's terminal colors

// List available themes
console.log(Object.keys(themes))
```

### Theme Names

| Theme | Description |
|-------|-------------|
| `terminal` | Uses ANSI colors, respects user's terminal theme |
| `dracula` | Dark theme with vibrant colors |
| `nord` | Arctic, bluish theme |
| `monokai` | Classic syntax-highlighting inspired |
| `solarized` | Precision colors for readability |
| `catppuccin` | Catppuccin Mocha - soothing pastel theme |
| `gruvbox` | Gruvbox Dark - retro groove color scheme |
| `tokyoNight` | Tokyo Night - clean dark theme inspired by Tokyo city lights |
| `oneDark` | One Dark - Atom's iconic dark theme |
| `rosePine` | Rose Pine - natural pine with soho vibes |
| `kanagawa` | Kanagawa - inspired by Hokusai's wave painting |
| `everforest` | Everforest - comfortable green-tinted theme |
| `nightOwl` | Night Owl - designed with accessibility in mind |

## Variants

Apply semantic styling to components:

```typescript
box({
  variant: 'primary',
  children: () => text({ content: 'Primary styled box' })
})

text({
  content: 'Success message',
  variant: 'success'
})
```

### Available Variants

| Variant | Use Case |
|---------|----------|
| `default` | No special styling |
| `primary` | Primary actions, emphasis |
| `secondary` | Secondary actions |
| `tertiary` | Tertiary brand color |
| `accent` | Highlight, attention-grabbing |
| `success` | Positive outcomes |
| `warning` | Caution, warnings |
| `error` | Errors, destructive actions |
| `info` | Informational content |
| `muted` | Subdued, secondary content |
| `surface` | Raised surface styling |
| `elevated` | Elevated surface with border emphasis |
| `ghost` | Minimal styling, subtle |
| `outline` | Border only, no fill |

### Variant Styles

```typescript
import { getVariantStyle } from '@rlabs-inc/tui'

const style = getVariantStyle('primary')
// Returns: { fg, bg, border, borderFocus }

// Use in custom component
box({
  fg: style.fg,
  bg: style.bg,
  borderColor: style.border,
})
```

## Reactive Theming

Theme colors are reactive signals. UI updates automatically when theme changes:

```typescript
// Component defined once
text({ content: 'Hello', fg: t.primary })

// Later...
setTheme('dracula')
// Text color changes automatically!
```

### Theme-Aware Logic

```typescript
import { theme } from '@rlabs-inc/tui'

// Access current theme
const currentTheme = theme.value

// React to theme changes
effect(() => {
  console.log('Theme changed:', theme.value.name)
})
```

## Custom Themes

Create your own theme using `setTheme()`:

```typescript
import { setTheme } from '@rlabs-inc/tui'

// Use a preset
setTheme('dracula')

// Or define a custom theme
setTheme({
  name: 'my-theme',

  // Brand
  primary: { r: 129, g: 140, b: 248, a: 255 },
  secondary: { r: 180, g: 190, b: 254, a: 255 },
  tertiary: { r: 203, g: 166, b: 247, a: 255 },
  accent: { r: 249, g: 226, b: 175, a: 255 },

  // Semantic
  success: { r: 166, g: 227, b: 161, a: 255 },
  warning: { r: 249, g: 226, b: 175, a: 255 },
  error: { r: 243, g: 139, b: 168, a: 255 },
  info: { r: 137, g: 180, b: 250, a: 255 },

  // Text
  text: { r: 205, g: 214, b: 244, a: 255 },
  textMuted: { r: 166, g: 173, b: 200, a: 255 },
  textDim: { r: 108, g: 112, b: 134, a: 255 },
  textDisabled: { r: 69, g: 71, b: 90, a: 255 },
  textBright: { r: 255, g: 255, b: 255, a: 255 },

  // Backgrounds
  background: { r: 30, g: 30, b: 46, a: 255 },
  backgroundMuted: { r: 24, g: 24, b: 37, a: 255 },
  surface: { r: 49, g: 50, b: 68, a: 255 },
  overlay: { r: 17, g: 17, b: 27, a: 255 },

  // Borders
  border: { r: 69, g: 71, b: 90, a: 255 },
  borderFocus: { r: 129, g: 140, b: 248, a: 255 },
})
```

## Terminal Theme

The `terminal` theme uses ANSI color codes instead of RGB values:

```typescript
setTheme('terminal')
```

This respects the user's terminal color scheme - if they have a light terminal, colors adapt automatically.

## Common Patterns

### Theme Toggle

```typescript
const isDark = signal(true)

keyboard.onKey('t', () => {
  isDark.value = !isDark.value
  setTheme(isDark.value ? 'dracula' : 'solarized')
})

text({
  content: derived(() => `Theme: ${isDark.value ? 'Dark' : 'Light'}`)
})
```

### Theme Selector

```typescript
const themeNames = ['terminal', 'dracula', 'nord', 'monokai', 'solarized']
const selectedIndex = signal(0)

each(
  () => themeNames,
  (getName, key) => {
    const i = parseInt(key)
    return text({
      content: getName,
      fg: derived(() => selectedIndex.value === i ? t.primary : t.textDim)
    })
  },
  { key: (_, i) => String(i) }
)

keyboard.onKey('Enter', () => {
  setTheme(themeNames[selectedIndex.value])
})
```

### Consistent Card Styling

```typescript
function Card({ title, children }: { title: string, children: () => void }) {
  return box({
    border: BorderStyle.ROUNDED,
    borderColor: t.border,
    bg: t.surface,
    padding: 1,
    gap: 1,
    children: () => {
      text({ content: title, fg: t.primary, attrs: Attr.BOLD })
      children()
    }
  })
}
```

### Status Badge

```typescript
function Badge({ status }: { status: 'success' | 'warning' | 'error' }) {
  const colors = {
    success: { fg: t.success, label: 'OK' },
    warning: { fg: t.warning, label: 'WARN' },
    error: { fg: t.error, label: 'ERR' },
  }

  return text({
    content: colors[status].label,
    fg: colors[status].fg,
    attrs: Attr.BOLD,
  })
}
```

## See Also

- [Colors Guide](./colors.md)
- [API Reference: Theme](../../api/theme.md)
- [Borders Guide](./borders.md)
