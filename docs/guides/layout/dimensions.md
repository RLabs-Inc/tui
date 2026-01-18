# Dimensions Guide

> Width, height, percentages, and auto-sizing

## Overview

TUI supports flexible dimension specifications:

- **Fixed** - Exact character counts
- **Percentage** - Relative to parent
- **Auto** - Size to content
- **Constraints** - Min/max limits

## Import

```typescript
import { box, text, BorderStyle } from '@rlabs-inc/tui'
```

## Fixed Dimensions

Specify exact character sizes:

```typescript
box({
  width: 40,   // 40 characters wide
  height: 10,  // 10 rows tall
})
```

## Auto Sizing

Use `0` or omit for auto-sizing:

```typescript
// Auto width - fits content
box({
  width: 0,  // Or just omit
  children: () => text({ content: 'Hello' })  // Box is 5 chars wide
})

// Auto height - fits content
box({
  height: 0,  // Or just omit
  children: () => {
    text({ content: 'Line 1' })
    text({ content: 'Line 2' })
  }
})
// Box is 2 rows tall
```

## Percentage Dimensions

Size relative to parent:

```typescript
box({
  width: '100%',   // Full parent width
  height: '50%',   // Half parent height
})
```

### Common Percentages

```typescript
box({ width: '100%' })  // Full width
box({ width: '50%' })   // Half width
box({ width: '33%' })   // Third width
box({ width: '25%' })   // Quarter width
```

### Percentage Example

```typescript
box({
  width: 80,  // Parent is 80 chars
  flexDirection: 'row',
  children: () => {
    box({ width: '30%', children: () => text({ content: 'Sidebar' }) })  // 24 chars
    box({ width: '70%', children: () => text({ content: 'Content' }) })  // 56 chars
  }
})
```

## Constraints

Set minimum and maximum sizes:

```typescript
box({
  // Flexible but bounded
  grow: 1,
  minWidth: 20,   // At least 20 chars
  maxWidth: 60,   // At most 60 chars

  minHeight: 5,   // At least 5 rows
  maxHeight: 20,  // At most 20 rows
})
```

### Use Cases

```typescript
// Input that grows but has reasonable limits
box({
  grow: 1,
  minWidth: 10,   // Always readable
  maxWidth: 50,   // Doesn't sprawl
})

// Modal that adapts to terminal size
box({
  width: '80%',
  maxWidth: 100,  // Cap for large terminals
  minWidth: 40,   // Minimum for readability
})
```

## Full Terminal Size

Use percentage dimensions for full terminal coverage:

```typescript
// Full terminal width and height
box({
  width: '100%',
  height: '100%',
  children: () => text({ content: 'Full screen!' })
})
```

## Dimension Interactions

### With Flexbox

```typescript
box({
  flexDirection: 'row',
  width: 100,
  children: () => {
    // Fixed + grow
    box({ width: 20 })            // Takes 20
    box({ grow: 1 })              // Takes remaining 80

    // Percentage + fixed
    box({ width: '50%' })         // Takes 50
    box({ width: 50 })            // Takes 50

    // Grow with constraints
    box({ grow: 1, maxWidth: 30 })  // Grows up to 30
    box({ grow: 1 })                // Takes the rest
  }
})
```

### With Padding/Border

Padding and borders are **inside** the dimensions:

```typescript
box({
  width: 20,
  padding: 2,
  border: BorderStyle.SINGLE,
  // Total: 20 chars
  // Border: 2 chars (left + right)
  // Padding: 4 chars (2 left + 2 right)
  // Content: 14 chars
})
```

### With Margin

Margin is **outside** the dimensions:

```typescript
box({
  width: 20,
  margin: 2,
  // Box is 20 chars
  // Total space used: 24 chars (20 + 2 left + 2 right)
})
```

## Text Dimensions

Text has implicit dimensions based on content:

```typescript
// Single line - width = content length, height = 1
text({ content: 'Hello' })  // 5x1

// Multi-line - width = longest line, height = line count
text({ content: 'Hello\nWorld!' })  // 6x2

// With explicit width - may wrap
text({
  content: 'This is a long text that will wrap',
  width: 15
})
```

## Reactive Dimensions

All dimension props can be reactive:

```typescript
const panelWidth = signal(30)
const isExpanded = signal(false)

box({
  width: panelWidth,
  height: derived(() => isExpanded.value ? 20 : 5),
})

// Update triggers re-layout
panelWidth.value = 50
isExpanded.value = true
```

## Common Patterns

### Sidebar with Fixed Width

```typescript
box({
  flexDirection: 'row',
  width: '100%',
  children: () => {
    // Fixed sidebar
    box({
      width: 30,
      children: () => { /* sidebar */ }
    })
    // Flexible content area
    box({
      grow: 1,
      children: () => { /* content */ }
    })
  }
})
```

### Centered Fixed-Width Modal

```typescript
box({
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  children: () => {
    box({
      width: 50,
      minHeight: 10,
      maxHeight: '80%',  // Don't exceed terminal
      children: () => { /* modal content */ }
    })
  }
})
```

### Aspect Ratio (Manual)

Terminal characters are typically taller than wide (roughly 2:1 height:width ratio). Adjust dimensions accordingly:

```typescript
// Approximate square in visual appearance
box({
  width: 40,
  height: 20,  // Half the width to appear square
})
```

> **Note**: The exact character aspect ratio varies by terminal and font. Test visually in your target terminal.

## See Also

- [Flexbox Guide](./flexbox.md)
- [Spacing Guide](./spacing.md)
- [API Reference: DimensionProps](../../api/types.md)
