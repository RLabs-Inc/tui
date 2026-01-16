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

## Using Reactive Values in Props

TUI primitives accept multiple input types. **The simple rule**:

> Pass signals and deriveds directly. Use `() =>` only for inline computations.

```typescript
const message = signal('Hello')
const formatted = derived(() => message.value.toUpperCase())

// Best: Pass signal directly
text({ content: message })

// Best: Pass derived directly
text({ content: formatted })

// Use getter for inline computation
text({ content: () => `Count: ${count.value}` })

// Static value
text({ content: 'Hello' })
```

**A getter `() =>` is an inline derived.** These are equivalent:

```typescript
// Named derived
const upper = derived(() => message.value.toUpperCase())
text({ content: upper })

// Inline derived (getter)
text({ content: () => message.value.toUpperCase() })
```

If you already have a signal or derived, just pass it directly - no wrapper needed.

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

### Derived Values

```typescript
const count = signal(0)

// Create a derived, pass it directly
const display = derived(() => `Count: ${count.value}`)
text({ content: display })

// Or use inline getter (equivalent)
text({ content: () => `Count: ${count.value}` })
```

### Conditional Content

```typescript
const useCustom = signal(false)
const custom = signal('Custom')
const defaultVal = 'Default'

// Inline getter for conditional logic
text({
  content: () => useCustom.value ? custom.value : defaultVal
})
```

### Object Properties

```typescript
const user = signal({ name: 'Alice', age: 30 })

// Getter to access property
text({ content: () => user.value.name })

// Update triggers re-render
user.value = { ...user.value, name: 'Bob' }
```

### Array Item Access

```typescript
const items = signal(['A', 'B', 'C'])
const selectedIndex = signal(0)

// Named derived for complex logic
const selectedItem = derived(() => items.value[selectedIndex.value])
text({ content: selectedItem })

// Or inline getter
text({ content: () => items.value[selectedIndex.value] })
```

## Debugging Bindings

If reactivity isn't working:

1. **Check if value is extracted** - Don't do `const x = signal.value; use(x)`
2. **Pass signal directly or use getter** - Not `signal.value`
3. **Verify signal exists** - `undefined` won't track

```typescript
// WRONG - extracted value, no tracking
const count = signal(0)
const val = count.value
text({ content: val })  // Never updates!

// RIGHT - pass signal directly (preferred)
text({ content: count })

// RIGHT - use getter for computation
text({ content: () => count.value * 2 })

// WRONG - unnecessary getter around signal
text({ content: () => count.value })  // Works, but just use: count
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
