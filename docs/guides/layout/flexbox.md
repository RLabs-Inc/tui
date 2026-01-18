# Flexbox Layout Guide

> Complete CSS-like flexbox for the terminal

## Overview

TUI implements a full flexbox layout system (TITAN engine):

- **Direction** - Row, column, and reverse variants
- **Wrapping** - Multi-line layouts
- **Alignment** - Main axis and cross axis
- **Flex items** - Grow, shrink, basis
- **Gap** - Space between children

## Basic Concepts

Flexbox organizes children along two axes:

- **Main axis** - Direction children flow (`row` = horizontal, `column` = vertical)
- **Cross axis** - Perpendicular to main axis

```
Column (default):        Row:
┌─────────────┐         ┌─────────────────────────┐
│  Child 1    │         │ Child 1 │ Child 2 │ ... │
│  Child 2    │         └─────────────────────────┘
│  Child 3    │         ← Main axis (horizontal) →
└─────────────┘
↓ Main axis (vertical)
```

## Flex Direction

```typescript
// Column - children stack vertically (default)
box({ flexDirection: 'column' })

// Row - children flow horizontally
box({ flexDirection: 'row' })

// Reverse variants
box({ flexDirection: 'column-reverse' })  // Bottom to top
box({ flexDirection: 'row-reverse' })     // Right to left
```

### Example: Horizontal Buttons

```typescript
box({
  flexDirection: 'row',
  gap: 2,
  children: () => {
    text({ content: '[OK]' })
    text({ content: '[Cancel]' })
  }
})
// Output: [OK]  [Cancel]
```

## Justify Content (Main Axis)

Distribute space along the main axis:

```typescript
box({
  flexDirection: 'row',
  width: 40,
  justifyContent: 'flex-start',    // ■■■...........
  justifyContent: 'center',        // ....■■■.....
  justifyContent: 'flex-end',      // ...........■■■
  justifyContent: 'space-between', // ■.....■.....■
  justifyContent: 'space-around',  // .■...■...■.
  justifyContent: 'space-evenly',  // ..■..■..■..
})
```

### Example: Header with Title and Actions

```typescript
box({
  flexDirection: 'row',
  width: '100%',
  justifyContent: 'space-between',
  children: () => {
    text({ content: 'My App', fg: t.primary })
    text({ content: '[Settings] [Help]', fg: t.textDim })
  }
})
```

## Align Items (Cross Axis)

Align children on the cross axis:

```typescript
box({
  flexDirection: 'row',
  height: 5,
  alignItems: 'stretch',     // Default - fill cross axis
  alignItems: 'flex-start',  // Align to start
  alignItems: 'center',      // Center on cross axis
  alignItems: 'flex-end',    // Align to end
})
```

> **Note**: `baseline` alignment is accepted but currently behaves like `flex-start`. True baseline alignment may be added in a future release.

### Example: Centered Content

```typescript
box({
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  children: () => {
    text({ content: 'Perfectly centered!' })
  }
})
```

## Align Self (Item Override)

Individual items can override `alignItems`:

```typescript
box({
  flexDirection: 'row',
  height: 5,
  alignItems: 'flex-start',
  children: () => {
    text({ content: 'Top' })
    text({ content: 'Middle', alignSelf: 'center' })
    text({ content: 'Bottom', alignSelf: 'flex-end' })
  }
})
```

## Flex Grow

Distribute remaining space to children:

```typescript
box({
  flexDirection: 'row',
  width: 60,
  children: () => {
    box({ width: 10, children: () => text({ content: 'Fixed' }) })
    box({ grow: 1, children: () => text({ content: 'Grows' }) })
    box({ width: 10, children: () => text({ content: 'Fixed' }) })
  }
})
// Fixed takes 10, Grows takes 40, Fixed takes 10
```

### Proportional Growth

```typescript
box({
  flexDirection: 'row',
  width: 60,
  children: () => {
    box({ grow: 1, children: () => text({ content: '1 part' }) })   // 20
    box({ grow: 2, children: () => text({ content: '2 parts' }) })  // 40
  }
})
```

## Flex Shrink

Control how children shrink when space is limited:

```typescript
box({
  flexDirection: 'row',
  width: 30,
  children: () => {
    box({ width: 20, shrink: 1, children: () => text({ content: 'Can shrink' }) })
    box({ width: 20, shrink: 0, children: () => text({ content: 'Won\'t shrink' }) })
  }
})
// Won't shrink keeps 20, Can shrink gets remaining 10
```

## Flex Basis

Initial size before grow/shrink:

```typescript
box({
  flexDirection: 'row',
  width: 100,
  children: () => {
    box({ flexBasis: 30, grow: 1, children: () => text({ content: 'A' }) })
    box({ flexBasis: 20, grow: 1, children: () => text({ content: 'B' }) })
  }
})
// A starts at 30, B starts at 20, remaining 50 split equally
// Final: A=55, B=45
```

## Gap

Space between children:

```typescript
box({
  gap: 2,  // 2 characters between each child
  children: () => {
    text({ content: 'One' })
    text({ content: 'Two' })
    text({ content: 'Three' })
  }
})
// Output:
// One
//
// Two
//
// Three
```

Gap doesn't add space before the first or after the last child.

## Flex Wrap

Enable multi-line layouts:

```typescript
box({
  flexDirection: 'row',
  flexWrap: 'wrap',
  width: 30,
  children: () => {
    text({ content: 'One', width: 10 })
    text({ content: 'Two', width: 10 })
    text({ content: 'Three', width: 10 })  // Wraps to next line
    text({ content: 'Four', width: 10 })
  }
})
```

### Wrap Options

```typescript
box({
  flexWrap: 'nowrap',        // No wrapping (default)
  flexWrap: 'wrap',          // Wrap to next line
  flexWrap: 'wrap-reverse',  // Wrap upward
})
```

## Overflow

Control content that exceeds container:

```typescript
box({
  width: 40,
  height: 10,
  overflow: 'visible',  // Content extends beyond (default)
  overflow: 'hidden',   // Clip content
  overflow: 'scroll',   // Enable scrolling
  overflow: 'auto',     // Scroll only when needed
})
```

## Z-Index

Control stacking order for overlapping elements:

```typescript
box({
  zIndex: 10,  // Higher values render on top
  children: () => { /* overlay content */ }
})
```

## Common Layout Patterns

### Two-Column Layout

```typescript
box({
  flexDirection: 'row',
  height: '100%',
  children: () => {
    // Sidebar
    box({
      width: 30,
      border: BorderStyle.SINGLE,
      children: () => { /* sidebar */ }
    })
    // Main content
    box({
      grow: 1,
      children: () => { /* content */ }
    })
  }
})
```

### Header + Content + Footer

```typescript
box({
  height: '100%',
  children: () => {
    // Header
    box({
      height: 3,
      children: () => text({ content: 'Header' })
    })
    // Content (grows)
    box({
      grow: 1,
      overflow: 'scroll',
      children: () => { /* scrollable content */ }
    })
    // Footer
    box({
      height: 1,
      children: () => text({ content: 'Footer' })
    })
  }
})
```

### Card Grid

```typescript
box({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 1,
  children: () => {
    for (const card of cards) {
      box({
        width: 20,
        height: 8,
        border: BorderStyle.ROUNDED,
        padding: 1,
        children: () => {
          text({ content: card.title })
        }
      })
    }
  }
})
```

### Centered Modal

```typescript
box({
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  children: () => {
    box({
      width: 40,
      height: 10,
      border: BorderStyle.DOUBLE,
      padding: 1,
      children: () => {
        text({ content: 'Modal Content' })
      }
    })
  }
})
```

### Split Panels

```typescript
box({
  flexDirection: 'row',
  children: () => {
    box({ grow: 1, children: () => { /* left panel */ } })
    box({ width: 1, bg: t.border })  // Divider
    box({ grow: 1, children: () => { /* right panel */ } })
  }
})
```

## Reactive Layout

All layout properties can be reactive:

```typescript
const isExpanded = signal(false)

box({
  flexDirection: derived(() => isExpanded.value ? 'row' : 'column'),
  gap: derived(() => isExpanded.value ? 2 : 1),
  children: () => { /* ... */ }
})
```

## See Also

- [API Reference: BoxProps](../../api/primitives/box.md)
- [Dimensions Guide](./dimensions.md)
- [Spacing Guide](./spacing.md)
