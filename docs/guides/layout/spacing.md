# Spacing Guide

> Padding, margin, and gap

## Overview

TUI provides CSS-like spacing:

- **Padding** - Space inside the component, around content
- **Margin** - Space outside the component
- **Gap** - Space between children

## Padding

Space between the component's border/edge and its content:

```typescript
box({
  padding: 2,
  border: BorderStyle.SINGLE,
  children: () => text({ content: 'Padded content' })
})
```

```
┌────────────────────┐
│                    │ ← padding
│  Padded content    │
│                    │ ← padding
└────────────────────┘
```

### Per-Side Padding

```typescript
box({
  paddingTop: 1,
  paddingRight: 4,
  paddingBottom: 1,
  paddingLeft: 4,
})
```

### Shorthand vs Per-Side

```typescript
// All sides
box({ padding: 2 })

// Override specific sides
box({
  padding: 1,
  paddingLeft: 3,  // Override left only
})
```

## Margin

Space outside the component:

```typescript
box({
  margin: 2,
  border: BorderStyle.SINGLE,
  children: () => text({ content: 'Content' })
})
```

```
  ← margin
  ┌──────────┐
  │ Content  │
  └──────────┘
  ← margin
```

### Per-Side Margin

```typescript
box({
  marginTop: 1,
  marginRight: 0,
  marginBottom: 1,
  marginLeft: 0,
})
```

### Centering with Margin

In some layouts, margin can help position:

```typescript
box({
  marginLeft: 10,  // Indent from left
  children: () => text({ content: 'Indented' })
})
```

## Gap

Space between children (not before first or after last):

```typescript
box({
  gap: 1,
  children: () => {
    text({ content: 'First' })
    // 1 row gap
    text({ content: 'Second' })
    // 1 row gap
    text({ content: 'Third' })
  }
})
```

### Gap in Row Layout

```typescript
box({
  flexDirection: 'row',
  gap: 2,
  children: () => {
    text({ content: 'A' })
    // 2 char gap
    text({ content: 'B' })
    // 2 char gap
    text({ content: 'C' })
  }
})
// Output: A  B  C
```

### Gap vs Margin

| | Gap | Margin |
|---|---|---|
| Applied | Between children | Around individual component |
| First/Last | No extra space | Space on all sides |
| Use case | Consistent spacing | Individual positioning |

```typescript
// Gap - uniform spacing
box({
  gap: 2,
  children: () => {
    text({ content: 'A' })  // No margin
    text({ content: 'B' })  // No margin
  }
})
// A
//
// B

// Margin - individual spacing
box({
  children: () => {
    text({ content: 'A', marginBottom: 3 })
    text({ content: 'B', marginBottom: 1 })
  }
})
// A
//
//
// B
//
```

## Combining Spacing

```typescript
box({
  margin: 1,        // Outside space
  padding: 2,       // Inside space
  gap: 1,           // Between children
  border: BorderStyle.SINGLE,
  children: () => {
    text({ content: 'Child 1' })
    text({ content: 'Child 2' })
  }
})
```

```
 ← margin
 ┌─────────────────┐ ← border
 │                 │ ← padding
 │  Child 1        │
 │                 │ ← gap
 │  Child 2        │
 │                 │ ← padding
 └─────────────────┘
 ← margin
```

## Spacing with Borders

Borders take space inside the dimensions:

```typescript
box({
  width: 20,
  border: BorderStyle.SINGLE,  // 2 chars (left + right)
  padding: 1,                  // 2 chars (left + right)
  // Content area: 20 - 2 - 2 = 16 chars
})
```

## Reactive Spacing

All spacing props can be reactive:

```typescript
const isCompact = signal(false)

box({
  padding: derived(() => isCompact.value ? 0 : 2),
  gap: derived(() => isCompact.value ? 0 : 1),
  children: () => { /* ... */ }
})
```

## Common Patterns

### Consistent List Spacing

```typescript
box({
  gap: 1,
  children: () => {
    each(
      () => items.value,
      (getItem, key) => text({ content: getItem }),
      { key: item => item.id }
    )
  }
})
```

### Card with Comfortable Padding

```typescript
box({
  border: BorderStyle.ROUNDED,
  padding: 1,
  paddingLeft: 2,
  paddingRight: 2,
  children: () => {
    text({ content: 'Card content with breathing room' })
  }
})
```

### Separated Sections

```typescript
box({
  children: () => {
    // Header
    box({
      marginBottom: 1,
      children: () => text({ content: 'Header', fg: t.primary })
    })

    // Content
    box({
      marginBottom: 1,
      children: () => { /* content */ }
    })

    // Footer
    box({
      children: () => text({ content: 'Footer', fg: t.textDim })
    })
  }
})
```

### Horizontal Button Group

```typescript
box({
  flexDirection: 'row',
  gap: 2,
  children: () => {
    box({
      border: BorderStyle.ROUNDED,
      padding: 0,
      paddingLeft: 2,
      paddingRight: 2,
      children: () => text({ content: 'OK' })
    })
    box({
      border: BorderStyle.ROUNDED,
      padding: 0,
      paddingLeft: 2,
      paddingRight: 2,
      children: () => text({ content: 'Cancel' })
    })
  }
})
```

### Nested Padding

```typescript
box({
  padding: 2,  // Outer padding
  children: () => {
    box({
      padding: 1,  // Inner padding
      border: BorderStyle.SINGLE,
      children: () => text({ content: 'Nested' })
    })
  }
})
```

## Best Practices

1. **Use gap for lists** - Cleaner than margin on each item
2. **Consistent padding** - Use same padding for similar elements
3. **Margin for separation** - Between distinct sections
4. **Avoid double spacing** - Don't combine gap + margin unless intentional

## See Also

- [Flexbox Guide](./flexbox.md)
- [Dimensions Guide](./dimensions.md)
- [Box Guide](../primitives/box.md)
