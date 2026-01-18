# Box Guide

> The container primitive with complete flexbox layout

## Overview

`box` is the foundational container component in TUI. It provides:

- **Flexbox layout** - Direction, wrapping, alignment, grow/shrink
- **Spacing** - Padding, margin, gap
- **Borders** - Multiple styles with custom colors
- **Style** - Foreground, background, opacity
- **Interaction** - Focus management

## Basic Usage

```typescript
import { box, text } from '@rlabs-inc/tui'

box({
  padding: 1,
  children: () => {
    text({ content: 'Hello!' })
  }
})
```

## Children

The `children` prop is a function that renders nested components:

```typescript
box({
  children: () => {
    // These become children of the box
    text({ content: 'First' })
    text({ content: 'Second' })

    // Nesting works naturally
    box({
      children: () => {
        text({ content: 'Nested' })
      }
    })
  }
})
```

The children function runs **once** during mount. Reactivity comes from signals, not re-running children.

## Flexbox Layout

TUI implements a complete flexbox specification.

### Direction

```typescript
// Column (default) - children stack vertically
box({ flexDirection: 'column', children: () => { /* ... */ } })

// Row - children flow horizontally
box({ flexDirection: 'row', children: () => { /* ... */ } })

// Reverse directions
box({ flexDirection: 'column-reverse' })
box({ flexDirection: 'row-reverse' })
```

### Alignment

```typescript
box({
  // Main axis alignment (row=horizontal, column=vertical)
  justifyContent: 'center',     // 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'

  // Cross axis alignment
  alignItems: 'center',         // 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'

  children: () => { /* ... */ }
})
```

### Grow and Shrink

```typescript
box({
  flexDirection: 'row',
  children: () => {
    // Takes remaining space
    box({ grow: 1, children: () => text({ content: 'Flexible' }) })

    // Fixed width
    box({ width: 20, children: () => text({ content: 'Fixed' }) })

    // Also grows, sharing space equally
    box({ grow: 1, children: () => text({ content: 'Also flexible' }) })
  }
})
```

### Wrapping

```typescript
box({
  flexWrap: 'wrap',             // 'nowrap' | 'wrap' | 'wrap-reverse'
  width: 40,
  children: () => {
    // Children wrap to next line when they exceed width
    text({ content: 'Item 1', width: 15 })
    text({ content: 'Item 2', width: 15 })
    text({ content: 'Item 3', width: 15 })  // Wraps to next row
  }
})
```

### Gap

```typescript
box({
  gap: 1,                       // Space between children
  children: () => {
    text({ content: 'First' })
    // 1 character gap here
    text({ content: 'Second' })
    // 1 character gap here
    text({ content: 'Third' })
  }
})
```

## Dimensions

```typescript
box({
  // Absolute dimensions
  width: 40,
  height: 10,

  // Percentage of parent
  width: '50%',
  height: '100%',

  // Constraints
  minWidth: 20,
  maxWidth: 80,
  minHeight: 5,
  maxHeight: 20,
})
```

Zero means auto-size based on content:

```typescript
box({
  width: 0,   // Width = content width
  height: 0,  // Height = content height (default)
})
```

## Spacing

### Padding (inside)

```typescript
box({
  // All sides
  padding: 2,

  // Per-side
  paddingTop: 1,
  paddingRight: 2,
  paddingBottom: 1,
  paddingLeft: 2,

  children: () => { /* ... */ }
})
```

### Margin (outside)

```typescript
box({
  // All sides
  margin: 1,

  // Per-side
  marginTop: 0,
  marginRight: 2,
  marginBottom: 0,
  marginLeft: 2,

  children: () => { /* ... */ }
})
```

## Borders

```typescript
import { BorderStyle, t } from '@rlabs-inc/tui'

box({
  // Border style
  border: BorderStyle.ROUNDED,   // NONE | SINGLE | DOUBLE | ROUNDED | BOLD | DOUBLE_SINGLE | SINGLE_DOUBLE | CLASSIC

  // Border color
  borderColor: t.primary,

  children: () => { /* ... */ }
})
```

### Per-side Borders

```typescript
box({
  borderTop: BorderStyle.DOUBLE,
  borderRight: BorderStyle.SINGLE,
  borderBottom: BorderStyle.DOUBLE,
  borderLeft: BorderStyle.SINGLE,
})
```

### Border Styles

| Style | Appearance |
|-------|------------|
| `NONE` | No border |
| `SINGLE` | `─│┌┐└┘` |
| `DOUBLE` | `═║╔╗╚╝` |
| `ROUNDED` | `─│╭╮╰╯` |
| `BOLD` | `━┃┏┓┗┛` |
| `DOUBLE_SINGLE` | Mixed double/single |
| `SINGLE_DOUBLE` | Mixed single/double |
| `CLASSIC` | `+-\|` ASCII style |

## Colors and Style

```typescript
import { t, Colors } from '@rlabs-inc/tui'

box({
  // Theme colors (reactive to theme changes)
  fg: t.text,
  bg: t.surface,

  // Direct colors
  fg: Colors.WHITE,
  bg: { r: 30, g: 30, b: 46, a: 255 },

  // Opacity (0-1)
  opacity: 0.8,

  children: () => { /* ... */ }
})
```

## Variants

Apply themed styles automatically:

```typescript
box({
  variant: 'primary',     // Uses theme primary colors
  padding: 1,
  children: () => {
    text({ content: 'Primary styled box' })
  }
})
```

Available variants:
- `default` - No special styling
- `primary` - Primary theme color
- `secondary` - Secondary theme color
- `success` - Green/success color
- `warning` - Yellow/warning color
- `error` - Red/error color
- `info` - Blue/info color
- `ghost` - Transparent with hover effect
- `outline` - Border only, no fill

## Visibility

```typescript
const isVisible = signal(true)

box({
  visible: isVisible,    // Reactive - toggles visibility
  children: () => { /* ... */ }
})

// Hide the box
isVisible.value = false
```

Hidden boxes take **no space** in layout (not just invisible).

## Focus

Boxes can receive keyboard focus and handle input events. This enables building fully self-contained interactive components without external keyboard subscriptions.

### Basic Focus Setup

```typescript
box({
  focusable: true,       // Can receive focus
  tabIndex: 1,           // Order in tab navigation (lower = earlier)

  children: () => { /* ... */ }
})
```

### Focus and Blur Callbacks

Track when a box gains or loses focus:

```typescript
const isFocused = signal(false)

box({
  focusable: true,
  border: BorderStyle.ROUNDED,

  // Style reactively based on focus state
  borderColor: () => isFocused.value ? t.primary : t.border,

  // Track focus state
  onFocus: () => {
    isFocused.value = true
    console.log('Box focused!')
  },
  onBlur: () => {
    isFocused.value = false
    console.log('Box blurred!')
  },

  children: () => {
    text({ content: () => isFocused.value ? 'Focused' : 'Not focused' })
  }
})
```

### Keyboard Handling with onKey

Handle keyboard input when the box has focus:

```typescript
const selectedIndex = signal(0)
const items = ['Apple', 'Banana', 'Cherry']

box({
  focusable: true,
  border: BorderStyle.SINGLE,

  // Handle keys only when this box is focused
  onKey: (event) => {
    if (event.key === 'ArrowDown') {
      selectedIndex.value = Math.min(selectedIndex.value + 1, items.length - 1)
      return true  // Consume the event
    }
    if (event.key === 'ArrowUp') {
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      return true
    }
    if (event.key === 'Enter') {
      console.log('Selected:', items[selectedIndex.value])
      return true
    }
    // Return nothing or false to let event propagate
  },

  children: () => {
    items.forEach((item, i) => {
      text({
        content: () => selectedIndex.value === i ? `> ${item}` : `  ${item}`
      })
    })
  }
})
```

The `onKey` handler receives a `KeyboardEvent` with:
- `key` - The key name (`'Enter'`, `'ArrowUp'`, `'a'`, `'Escape'`, etc.)
- `modifiers` - Object with `ctrl`, `alt`, `shift`, `meta` booleans
- `state` - `'press'`, `'repeat'`, or `'release'`

Return `true` to consume the event (prevent propagation to other handlers).

### Complete Self-Contained Component Example

Here is a complete focusable toggle component that handles its own keyboard input:

```typescript
import { signal, box, text, BorderStyle, t } from '@rlabs-inc/tui'
import type { Cleanup } from '@rlabs-inc/tui'

interface ToggleProps {
  label: string
  value: WritableSignal<boolean>
  tabIndex?: number
}

function Toggle({ label, value, tabIndex }: ToggleProps): Cleanup {
  const isFocused = signal(false)

  return box({
    focusable: true,
    tabIndex,
    flexDirection: 'row',
    gap: 1,
    padding: 1,
    border: BorderStyle.ROUNDED,

    // Reactive styling based on focus
    borderColor: () => isFocused.value ? t.primary : t.border,
    bg: () => isFocused.value ? t.surface : null,

    // Self-contained focus tracking
    onFocus: () => { isFocused.value = true },
    onBlur: () => { isFocused.value = false },

    // Self-contained keyboard handling
    onKey: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        value.value = !value.value
        return true
      }
    },

    children: () => {
      text({ content: () => value.value ? '[x]' : '[ ]' })
      text({ content: label })
    }
  })
}

// Usage - component is fully self-contained!
const darkMode = signal(false)
const notifications = signal(true)

Toggle({ label: 'Dark Mode', value: darkMode, tabIndex: 1 })
Toggle({ label: 'Notifications', value: notifications, tabIndex: 2 })
```

This pattern is powerful because:
- **No external wiring** - The component handles its own keyboard events
- **Clean API** - Users just pass a value signal and label
- **Proper focus** - Tab navigation works automatically
- **Visual feedback** - Focus state is tracked internally for styling

Compare this to the older approach that required external `keyboard.onFocused()` calls - the new props make components truly self-contained.

## Overflow

```typescript
box({
  overflow: 'scroll',    // 'visible' | 'hidden' | 'scroll' | 'auto'
  height: 10,

  children: () => {
    // Content taller than 10 rows can be scrolled
  }
})
```

## Z-Index

```typescript
box({
  zIndex: 10,            // Higher = on top
  children: () => { /* ... */ }
})
```

## Reactive Props

All props can be reactive. **Pass signals and deriveds directly** - only use `() =>` for inline computations:

```typescript
const width = signal(40)
const height = signal(20)
const isExpanded = signal(false)
const bgColor = derived(() => isExpanded.value ? t.surface.value : null)

box({
  // Pass signals directly (preferred)
  width,
  height,

  // Pass deriveds directly
  bg: bgColor,

  // Use getter only for inline computations
  padding: () => isExpanded.value ? 2 : 1,

  children: () => { /* ... */ }
})

// Updates trigger re-render
width.value = 60
isExpanded.value = true
```

> **Mental model**: Signals and deriveds are already reactive containers - TUI knows how to subscribe to them. Wrap in `() =>` only when you need to compute something inline.

## Cleanup

Box returns a cleanup function:

```typescript
const cleanup = box({
  children: () => { /* ... */ }
})

// Later, to remove the box:
cleanup()
```

## Common Patterns

### Centered Content

```typescript
box({
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  children: () => {
    text({ content: 'Centered!' })
  }
})
```

### Sidebar Layout

```typescript
box({
  flexDirection: 'row',
  height: '100%',
  children: () => {
    // Sidebar
    box({
      width: 30,
      border: BorderStyle.SINGLE,
      children: () => { /* sidebar content */ }
    })

    // Main content
    box({
      grow: 1,
      children: () => { /* main content */ }
    })
  }
})
```

### Card Component

```typescript
box({
  border: BorderStyle.ROUNDED,
  borderColor: t.border,
  padding: 1,
  gap: 1,
  children: () => {
    text({ content: 'Card Title', fg: t.primary })
    text({ content: 'Card content goes here.' })
  }
})
```

## See Also

- [API Reference: box](../../api/primitives/box.md)
- [Text Guide](./text.md)
- [Flexbox Guide](../layout/flexbox.md)
- [Themes Guide](../styling/themes.md)
