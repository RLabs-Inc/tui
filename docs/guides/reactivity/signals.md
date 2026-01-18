# Signals Guide

> Reactive state management with signals

## Overview

TUI uses **fine-grained reactivity** powered by signals:

- **Signals** - Reactive containers for values
- **Derived** - Computed values that auto-update
- **Effects** - Side effects that react to changes
- **Batch** - Group updates for performance

## Signals Basics

### Creating Signals

```typescript
import { signal } from '@rlabs-inc/tui'

// Create a signal with initial value
const count = signal(0)
const name = signal('Alice')
const items = signal<string[]>([])

// Read the value
console.log(count.value)  // 0

// Update the value
count.value = 5
count.value++

// Arrays/objects - replace the reference
items.value = [...items.value, 'new item']
```

### Signal Types

```typescript
import { signal, type WritableSignal } from '@rlabs-inc/tui'

// Explicit typing
const count: WritableSignal<number> = signal(0)

// Type inference works
const name = signal('Alice')  // WritableSignal<string>

// Complex types
interface User {
  id: string
  name: string
}
const user = signal<User | null>(null)
```

## Derived Values

Derived signals compute values from other signals:

```typescript
import { signal, derived } from '@rlabs-inc/tui'

const count = signal(0)

// Automatically updates when count changes
const doubled = derived(() => count.value * 2)
const isPositive = derived(() => count.value > 0)

console.log(doubled.value)     // 0
console.log(isPositive.value)  // false

count.value = 5
console.log(doubled.value)     // 10
console.log(isPositive.value)  // true
```

### Derived Dependencies

Dependencies are tracked automatically:

```typescript
const firstName = signal('Alice')
const lastName = signal('Smith')

// Depends on both signals
const fullName = derived(() => `${firstName.value} ${lastName.value}`)

firstName.value = 'Bob'  // fullName updates to "Bob Smith"
lastName.value = 'Jones' // fullName updates to "Bob Jones"
```

### Conditional Dependencies

Only accessed signals become dependencies:

```typescript
const showDetails = signal(false)
const details = signal('Hidden info')

const display = derived(() => {
  if (showDetails.value) {
    return details.value  // Only tracked when showDetails is true
  }
  return 'Click to show'
})
```

## Effects

Effects run side effects when dependencies change:

```typescript
import { signal, effect } from '@rlabs-inc/tui'

const count = signal(0)

// Runs immediately, then on each change
effect(() => {
  console.log(`Count is now: ${count.value}`)
})

count.value = 1  // Logs: "Count is now: 1"
count.value = 2  // Logs: "Count is now: 2"
```

### Stopping Effects

```typescript
const stop = effect(() => {
  console.log(count.value)
})

// Later, stop the effect
stop()

count.value = 100  // Effect doesn't run
```

### Effect Cleanup

Return a cleanup function for resources:

```typescript
effect(() => {
  const timer = setInterval(() => {
    console.log(count.value)
  }, 1000)

  // Cleanup when effect re-runs or stops
  return () => clearInterval(timer)
})
```

## Batching Updates

Group multiple updates to prevent intermediate renders:

```typescript
import { signal, batch } from '@rlabs-inc/tui'

const firstName = signal('Alice')
const lastName = signal('Smith')

// Without batch - two updates, two renders
firstName.value = 'Bob'
lastName.value = 'Jones'

// With batch - one render at the end
batch(() => {
  firstName.value = 'Bob'
  lastName.value = 'Jones'
})
```

## Using Signals in TUI

TUI primitives accept signals, deriveds, getters, and static values directly. **The rule is simple**:

> Pass signals and deriveds directly. Use `() =>` only for inline computations.

### The Cleaner Pattern

```typescript
const count = signal(0)
const doubled = derived(() => count.value * 2)

// Pass signal directly - cleanest syntax
text({ content: count })

// Pass derived directly - also clean
text({ content: doubled })

// Use getter only for inline computation
text({ content: () => `Count: ${count.value}` })
```

### Why This Works

A getter `() =>` is essentially an **inline derived**. These are equivalent:

```typescript
// Named derived
const doubled = derived(() => count.value * 2)
text({ content: doubled })

// Inline derived (using getter)
text({ content: () => count.value * 2 })
```

If you already have a signal or derived, just pass it directly - no wrapper needed.

### When to Use Getters

Use `() =>` when you need inline computation:

```typescript
// String templates
text({ content: () => `Count: ${count.value}` })

// Conditional logic
text({ content: () => isActive.value ? 'ON' : 'OFF' })

// Combining multiple signals
text({ content: () => `${firstName.value} ${lastName.value}` })
```

### Static Values

Static values work too - no reactivity needed:

```typescript
text({ content: 'Hello World' })  // Never changes
box({ width: 40 })                // Fixed width
```

### In Children

```typescript
const items = signal(['A', 'B', 'C'])

box({
  children: () => {
    // each() tracks items signal
    each(
      () => items.value,
      (getItem, key) => text({ content: getItem }),
      { key: item => item }
    )
  }
})

// Adding item updates UI
items.value = [...items.value, 'D']
```

### For Visibility

```typescript
const isVisible = signal(true)

box({
  visible: isVisible,  // Reactive visibility
  children: () => { /* ... */ }
})

// Toggle visibility
keyboard.onKey('v', () => {
  isVisible.value = !isVisible.value
})
```

## State vs Signal

TUI re-exports `state()` for object proxies:

```typescript
import { state, signal } from '@rlabs-inc/tui'

// signal() - for primitives and any value
const count = signal(0)
const user = signal({ name: 'Alice' })

// state() - object proxy with direct mutation
const appState = state({
  count: 0,
  user: { name: 'Alice' }
})

// Direct property access (no .value needed)
appState.count++
appState.user.name = 'Bob'
```

**Important**: `state()` only works with objects. For primitives, use `signal()`.

## Common Patterns

### Toggle State

```typescript
const isOpen = signal(false)

const toggle = () => {
  isOpen.value = !isOpen.value
}

keyboard.onKey('Space', toggle)
```

### List Selection

```typescript
const items = signal(['A', 'B', 'C'])
const selectedIndex = signal(0)

const selectedItem = derived(() => items.value[selectedIndex.value])

keyboard.onKey('ArrowDown', () => {
  if (selectedIndex.value < items.value.length - 1) {
    selectedIndex.value++
  }
})
```

### Loading State

```typescript
const isLoading = signal(false)
const data = signal<Data | null>(null)
const error = signal<Error | null>(null)

async function fetchData() {
  isLoading.value = true
  error.value = null

  try {
    data.value = await api.getData()
  } catch (e) {
    error.value = e as Error
  } finally {
    isLoading.value = false
  }
}
```

### Form State

```typescript
const form = state({
  name: '',
  email: '',
  submitted: false
})

const isValid = derived(() =>
  form.name.length > 0 && form.email.includes('@')
)

function submit() {
  if (isValid.value) {
    form.submitted = true
  }
}
```

### Undo/Redo

```typescript
const current = signal(0)
const history = signal<number[]>([0])
const historyIndex = signal(0)

function setValue(value: number) {
  const newHistory = history.value.slice(0, historyIndex.value + 1)
  newHistory.push(value)
  history.value = newHistory
  historyIndex.value = newHistory.length - 1
  current.value = value
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    current.value = history.value[historyIndex.value]
  }
}

function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    current.value = history.value[historyIndex.value]
  }
}
```

## Best Practices

1. **Pass signals/deriveds directly** - Cleanest syntax: `text({ content: mySignal })`
2. **Use `() =>` for inline computations** - It's an inline derived
3. **Keep state at top level** - Define signals outside components
4. **Use derived for expensive computation** - Cache complex calculations
5. **Batch related updates** - Prevent unnecessary renders

## See Also

- [Bind Pattern](./bind-pattern.md)
- [Reactive Props](./reactive-props.md)
- [API Reference: Signals](../../api/signals.md)
