# Bind Pattern Guide

> Fine-grained reactivity with bind()

## Overview

The `bind()` function creates fine-grained reactive bindings. It's used internally by TUI primitives but understanding it helps with advanced patterns.

## How Binding Works

### The Problem

When you pass a value to a component, the component needs to:
1. Track when the value changes
2. Update only the affected part of the UI

```typescript
// Simple approach - loses reactivity
const width = signal(40)
const widthValue = width.value  // 40 - static!

// When width.value changes, widthValue stays 40
```

### The Solution: Binding

`bind()` creates a tracked reference that stays connected:

```typescript
import { bind } from '@rlabs-inc/signals'

const width = signal(40)
const boundWidth = bind(width)  // Stays connected to signal

// When width.value changes, boundWidth reflects the change
```

## Using bind() with Props

TUI primitives accept multiple input types:

```typescript
// Static value
text({ content: 'Hello' })

// Signal (bind happens internally)
const message = signal('Hello')
text({ content: message })

// Getter function
text({ content: () => `Count: ${count.value}` })

// Explicit binding
text({ content: bind(message) })
```

**In most cases, you don't need explicit `bind()`** - TUI handles it automatically. But understanding it helps with debugging and advanced patterns.

## When TUI Uses bind()

Internally, TUI primitives use bind-like behavior with `setSource()`:

```typescript
// Inside box.ts (simplified)
if (props.width !== undefined) {
  dimensions.width.setSource(index, props.width)
}
```

This keeps the binding stable - the slot (array cell) stays the same, but its source can change.

## The Binding Types

```typescript
import type {
  Binding,
  ReadonlyBinding,
  WritableSignal
} from '@rlabs-inc/signals'

// Binding - can read and write
const bound: Binding<number> = bind(mySignal)
bound.value = 10  // Writes to mySignal

// ReadonlyBinding - can only read
const readonly: ReadonlyBinding<number> = bind(() => computed.value)

// WritableSignal - the underlying signal
const sig: WritableSignal<number> = signal(0)
```

## Reactive Prop Type

TUI uses a union type for props:

```typescript
type Reactive<T> = T | WritableSignal<T> | Binding<T> | ReadonlyBinding<T>

interface TextProps {
  content: Reactive<string>  // Accepts all forms
}
```

This means you can pass:
- `'Hello'` - Static string
- `signal('Hello')` - Writable signal
- `bind(signal('Hello'))` - Explicit binding
- `() => computed.value` - Getter function

## Two-Way Binding

For input-like components, two-way binding lets changes flow both ways:

```typescript
const inputValue = signal('')

// Two-way bound input
input({
  value: inputValue,  // Component writes back to signal
})

// When user types, inputValue.value updates
// When inputValue.value changes, input displays new value
```

## Common Patterns

### Derived Binding

```typescript
const count = signal(0)

// Bind to a derived value
const display = derived(() => `Count: ${count.value}`)

text({ content: display })  // Updates automatically
```

### Conditional Binding

```typescript
const useCustom = signal(false)
const custom = signal('Custom')
const defaultVal = 'Default'

// Switch source based on condition
text({
  content: () => useCustom.value ? custom.value : defaultVal
})
```

### Binding to Object Properties

```typescript
const user = signal({ name: 'Alice', age: 30 })

// Bind to specific property
text({
  content: () => user.value.name
})

// Update triggers re-render
user.value = { ...user.value, name: 'Bob' }
```

### Array Item Binding

```typescript
const items = signal(['A', 'B', 'C'])
const selectedIndex = signal(0)

// Bind to computed item
text({
  content: derived(() => items.value[selectedIndex.value])
})
```

## Debugging Bindings

If reactivity isn't working:

1. **Check if value is extracted** - Don't do `const x = signal.value; use(x)`
2. **Ensure getter wraps access** - `() => signal.value` not `signal.value`
3. **Verify signal exists** - `undefined` won't track

```typescript
// Wrong - extracted value, no tracking
const count = signal(0)
const val = count.value
text({ content: val })  // Never updates!

// Right - pass signal or getter
text({ content: count })
text({ content: () => count.value })
```

## Performance Considerations

Binding creates tracking overhead. For static values, TUI optimizes:

```typescript
// Efficient - static, no tracking needed
text({ content: 'Hello' })

// Has tracking overhead but necessary for reactivity
text({ content: () => message.value })
```

TUI's SlotArray system minimizes this overhead through:
- Stable slot references (slots aren't recreated)
- Lazy tracking (only when actually read)
- Efficient dependency collection

## See Also

- [Signals Guide](./signals.md)
- [Reactive Props Guide](./reactive-props.md)
- [Component Patterns](../patterns/component-patterns.md)
