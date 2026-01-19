# Primitives

TUI has three core primitives: **box**, **text**, and **input**. Everything you build uses these.

## The Core Concept: Reactive Props

**All props are reactive.** Pass a static value, a signal, a derived, or a getter function - they all work. The UI updates automatically when values change.

```typescript
import { signal, derived, box, text, t, BorderStyle } from '@rlabs-inc/tui'

const count = signal(0)
const boxWidth = derived(() => 30 + count.value * 2)  // Grows with count

box({
  padding: 1,                    // Static value
  width: boxWidth,               // Derived - updates automatically
  borderColor: () => count.value >= 5 ? t.success.value : t.border.value,  // Getter
  children: () => {
    text({ content: () => `Count: ${count.value}` })
  }
})
```

No special syntax. No wrapper functions. Just pass values however you want.

## Four Ways to Pass Props

### 1. Static Values

For layout properties that don't change:

```typescript
box({
  padding: 2,
  gap: 1,
  border: BorderStyle.SINGLE,
  flexDirection: 'column',
})
```

### 2. Signals

Pass signals directly - the UI updates when the signal changes:

```typescript
const width = signal(40)

box({ width })  // Updates when width.value changes

width.value = 60  // UI updates automatically
```

### 3. Derived Values

Pre-computed reactive values:

```typescript
const count = signal(0)
const doubled = derived(() => count.value * 2)

text({ content: doubled })  // Shows "0", "2", "4", etc.
```

### 4. Getter Functions

Inline reactive expressions:

```typescript
text({
  content: () => `Count: ${count.value}, tripled: ${count.value * 3}`,
  fg: () => count.value >= 5 ? t.success.value : t.textMuted.value,
})
```

## The Primitives

### box

Container with flexbox layout. Use for structure, borders, backgrounds, and scrolling.

```typescript
box({
  width: '100%',           // Supports percentages
  height: 10,
  padding: 1,
  border: BorderStyle.ROUNDED,
  borderColor: t.border,
  flexDirection: 'column',
  gap: 1,
  overflow: 'scroll',      // Scrollable content
  focusable: true,         // Keyboard + mouse focus
  onKey: (e) => { ... },   // Handle keys when focused
  children: () => { ... }
})
```

### text

Display text with styling and alignment.

```typescript
text({
  content: 'Hello',         // Static, signal, derived, or getter
  fg: t.primary,
  align: 'center',
  wrap: 'wrap',             // 'wrap' | 'nowrap' | 'truncate'
  attrs: Attr.BOLD,
})
```

### input

Single-line text input with two-way binding.

```typescript
const value = signal('')

input({
  value,                    // Two-way bound
  placeholder: 'Type here...',
  password: true,           // Mask input
  onSubmit: (v) => { ... }, // Enter key
})
```

## Theme Colors

Use `t` for reactive theme colors:

```typescript
text({ fg: t.primary })
box({ bg: t.surface, borderColor: t.border })
```

When using in getters, access `.value`:

```typescript
fg: () => isActive.value ? t.success.value : t.textMuted.value
```

## Next Steps

- [Box Reference](./box.md) - Complete box props and examples
- [Text Reference](./text.md) - Text styling and attributes
- [Input Reference](./input.md) - Input configuration and callbacks
- [Keyboard Handling](./keyboard.md) - Focus, shortcuts, component-level handlers
- [Template Primitives](./templates.md) - `each()`, `show()`, `when()` for dynamic UIs
