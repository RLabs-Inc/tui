# Borders Guide

> Border styles and configuration

## Overview

TUI provides multiple border styles for terminal UI:

- **11 built-in styles** - From simple to decorative
- **Per-side control** - Different borders on each side
- **Color customization** - Match your theme

## Basic Usage

```typescript
import { box, BorderStyle, t } from '@rlabs-inc/tui'

box({
  border: BorderStyle.ROUNDED,
  borderColor: t.border,
  children: () => { /* ... */ }
})
```

## Border Styles

```typescript
import { BorderStyle } from '@rlabs-inc/tui'

BorderStyle.NONE        // No border
BorderStyle.SINGLE      // ─│┌┐└┘
BorderStyle.DOUBLE      // ═║╔╗╚╝
BorderStyle.ROUNDED     // ─│╭╮╰╯
BorderStyle.BOLD        // ━┃┏┓┗┛
BorderStyle.DASHED      // ┄┆┌┐└┘
BorderStyle.DOTTED      // ······
BorderStyle.ASCII       // -|++++ (ASCII-safe)
BorderStyle.BLOCK       // ██████
BorderStyle.DOUBLE_HORZ // ═│╒╕╘╛ (double horizontal, single vertical)
BorderStyle.DOUBLE_VERT // ─║╓╖╙╜ (single horizontal, double vertical)
```

### Visual Examples

```
SINGLE:           DOUBLE:           ROUNDED:
┌─────────┐       ╔═════════╗       ╭─────────╮
│ Content │       ║ Content ║       │ Content │
└─────────┘       ╚═════════╝       ╰─────────╯

BOLD:             DASHED:           DOTTED:
┏━━━━━━━━━┓       ┌┄┄┄┄┄┄┄┄┄┐       ···········
┃ Content ┃       ┆ Content ┆       · Content ·
┗━━━━━━━━━┛       └┄┄┄┄┄┄┄┄┄┘       ···········

ASCII:            BLOCK:
+---------+       ███████████
| Content |       █ Content █
+---------+       ███████████

DOUBLE_HORZ:      DOUBLE_VERT:
╒═════════╕       ╓─────────╖
│ Content │       ║ Content ║
╘═════════╛       ╙─────────╜
```

## Border Color

```typescript
import { t, Colors } from '@rlabs-inc/tui'

// Theme color (recommended)
box({
  border: BorderStyle.SINGLE,
  borderColor: t.border,
})

// Semantic color
box({
  border: BorderStyle.SINGLE,
  borderColor: t.error,  // Red border for errors
})

// Direct color
box({
  border: BorderStyle.SINGLE,
  borderColor: Colors.CYAN,
})

// Custom RGBA
box({
  border: BorderStyle.SINGLE,
  borderColor: { r: 255, g: 128, b: 0, a: 255 },
})
```

## Per-Side Borders

Control each side independently:

```typescript
box({
  borderTop: BorderStyle.DOUBLE,
  borderRight: BorderStyle.SINGLE,
  borderBottom: BorderStyle.DOUBLE,
  borderLeft: BorderStyle.SINGLE,
})
```

### Common Patterns

```typescript
// Underline only
box({
  borderTop: BorderStyle.NONE,
  borderRight: BorderStyle.NONE,
  borderBottom: BorderStyle.SINGLE,
  borderLeft: BorderStyle.NONE,
})

// Left accent
box({
  borderTop: BorderStyle.NONE,
  borderRight: BorderStyle.NONE,
  borderBottom: BorderStyle.NONE,
  borderLeft: BorderStyle.BOLD,
  borderColor: t.primary,
})
```

## Reactive Borders

Border properties can be reactive:

```typescript
const isFocused = signal(false)

box({
  border: BorderStyle.ROUNDED,
  borderColor: derived(() =>
    isFocused.value ? t.primary.value : t.border.value
  ),
  children: () => { /* ... */ }
})
```

### Focus Ring

```typescript
import { focusedIndex } from '@rlabs-inc/tui'

box({
  id: 'input',
  focusable: true,
  border: BorderStyle.ROUNDED,
  borderColor: derived(() => {
    const inputIndex = getIndex('input')
    return focusedIndex.value === inputIndex
      ? t.borderFocus.value
      : t.border.value
  }),
})
```

## Borders and Layout

Borders take space **inside** the component's dimensions:

```typescript
box({
  width: 20,
  border: BorderStyle.SINGLE,  // Takes 2 chars (left + right)
  padding: 1,                  // Takes 2 chars (left + right)
  // Content area: 20 - 2 - 2 = 16 chars
})
```

## Common Patterns

### Card Component

```typescript
function Card({ title, children }: { title: string, children: () => void }) {
  return box({
    border: BorderStyle.ROUNDED,
    borderColor: t.border,
    padding: 1,
    gap: 1,
    children: () => {
      text({ content: title, fg: t.primary, attrs: Attr.BOLD })
      children()
    }
  })
}
```

### Input Field

```typescript
const isFocused = signal(false)
const value = signal('')

box({
  border: BorderStyle.ROUNDED,
  borderColor: derived(() => isFocused.value ? t.primary.value : t.border.value),
  padding: 0,
  paddingLeft: 1,
  paddingRight: 1,
  children: () => {
    text({ content: derived(() => value.value || 'Enter text...') })
  }
})
```

### Panel with Header

```typescript
box({
  border: BorderStyle.DOUBLE,
  borderColor: t.border,
  children: () => {
    // Header (inside border)
    box({
      bg: t.surface,
      paddingLeft: 1,
      paddingRight: 1,
      children: () => text({ content: 'Panel Title', fg: t.primary })
    })

    // Content
    box({
      padding: 1,
      children: () => { /* content */ }
    })
  }
})
```

### Status Box

```typescript
function StatusBox({ status, message }: { status: 'ok' | 'error', message: string }) {
  const colors = {
    ok: t.success,
    error: t.error,
  }

  return box({
    border: BorderStyle.ROUNDED,
    borderColor: colors[status],
    padding: 1,
    children: () => text({ content: message })
  })
}
```

### Separator Line

```typescript
// Horizontal separator
box({
  height: 1,
  borderTop: BorderStyle.SINGLE,
  borderColor: t.border,
})

// Vertical separator
box({
  width: 1,
  borderLeft: BorderStyle.SINGLE,
  borderColor: t.border,
})
```

### Window Frame

```typescript
box({
  border: BorderStyle.DOUBLE,
  borderColor: t.primary,
  width: 50,
  height: 20,
  children: () => {
    // Title bar
    box({
      flexDirection: 'row',
      justifyContent: 'space-between',
      bg: t.primary,
      paddingLeft: 1,
      paddingRight: 1,
      children: () => {
        text({ content: 'Window Title', fg: t.background })
        text({ content: '[X]', fg: t.background })
      }
    })

    // Content area
    box({
      grow: 1,
      padding: 1,
      children: () => { /* content */ }
    })
  }
})
```

## Accessibility

When using borders for visual distinction:

- **Don't rely on borders alone** - Combine with color or text
- **Maintain contrast** - Border should be visible against background
- **Focus indicators** - Use borderColor change for focus

## See Also

- [Box Guide](../primitives/box.md)
- [Colors Guide](./colors.md)
- [Themes Guide](./themes.md)
