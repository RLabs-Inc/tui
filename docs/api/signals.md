# Signals API

> Reactivity primitives (re-exported from @rlabs-inc/signals)

## Import

```typescript
import {
  signal, derived, effect, state, bind,
  batch, untrack
} from '@rlabs-inc/tui'
```

## signal()

Create a writable signal.

### Signature

```typescript
function signal<T>(initialValue: T): WritableSignal<T>
```

### WritableSignal

```typescript
interface WritableSignal<T> {
  value: T              // Get/set value
  peek(): T             // Get without tracking
  subscribe(fn): Cleanup // Subscribe to changes
}
```

### Example

```typescript
const count = signal(0)

// Read (creates dependency)
console.log(count.value)

// Write (triggers updates)
count.value = 1

// Read without tracking
const current = count.peek()
```

---

## derived()

Create a computed value.

### Signature

```typescript
function derived<T>(getter: () => T): DerivedSignal<T>
```

### DerivedSignal

```typescript
interface DerivedSignal<T> {
  readonly value: T    // Get computed value
  peek(): T            // Get without tracking
}
```

### Example

```typescript
const firstName = signal('John')
const lastName = signal('Doe')

const fullName = derived(() =>
  `${firstName.value} ${lastName.value}`
)

console.log(fullName.value)  // "John Doe"

firstName.value = 'Jane'
console.log(fullName.value)  // "Jane Doe"
```

### Caching

Derived values are cached and only recompute when dependencies change:

```typescript
const expensive = derived(() => {
  console.log('Computing...')  // Only runs when deps change
  return heavyComputation(data.value)
})

expensive.value  // Computes
expensive.value  // Returns cached
data.value = newData
expensive.value  // Recomputes
```

---

## effect()

Create a side effect.

### Signature

```typescript
function effect(fn: () => void | (() => void)): Cleanup
```

### Example

```typescript
const count = signal(0)

// Basic effect
const stop = effect(() => {
  console.log('Count is:', count.value)
})

// With cleanup
effect(() => {
  const interval = setInterval(() => {
    count.value++
  }, 1000)

  // Return cleanup function
  return () => clearInterval(interval)
})
```

### Effect Cleanup

```typescript
// Cleanup runs before each re-run and when stopped
effect(() => {
  const handler = () => doSomething()
  window.addEventListener('event', handler)

  return () => {
    window.removeEventListener('event', handler)
  }
})
```

---

## state()

Create a reactive object.

### Signature

```typescript
function state<T extends object>(initial: T): T
```

### Example

```typescript
const user = state({
  name: 'John',
  age: 30,
  email: 'john@example.com'
})

// Access properties reactively
effect(() => {
  console.log(user.name)  // Tracks 'name' property
})

// Modify properties
user.name = 'Jane'  // Triggers effect
user.age = 31       // No effect trigger (not tracked)
```

### Nested Objects

```typescript
const app = state({
  user: {
    name: 'John',
    settings: {
      theme: 'dark'
    }
  }
})

effect(() => {
  console.log(app.user.settings.theme)
})

app.user.settings.theme = 'light'  // Triggers effect
```

---

## bind()

Create a binding to a reactive source.

### Signature

```typescript
function bind<T>(source: T | Signal<T> | (() => T)): Binding<T>
```

### Binding

```typescript
interface Binding<T> {
  value: T             // Get value (tracked)
  peek(): T            // Get without tracking
  setSource(s): void   // Change source
}
```

### Example

```typescript
const count = signal(0)

// Bind to signal
const bound = bind(count)
console.log(bound.value)  // 0

// Bind to getter
const computed = bind(() => count.value * 2)
console.log(computed.value)  // 0

count.value = 5
console.log(computed.value)  // 10
```

### Use in Components

TUI primitives accept signals and deriveds directly - `bind()` is used internally:

```typescript
const width = signal(40)
const height = derived(() => width.value / 2)
const bgColor = derived(() => isActive.value ? t.primary.value : null)

box({
  width,      // Signal directly - TUI binds it internally
  height,     // Derived directly - TUI binds it internally
  padding: 2, // Static value - works too
  bg: bgColor // Derived directly
})
```

**The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations:

```typescript
box({
  width,
  bg: () => isHovered.value ? t.surface.value : null  // Inline computation
})
```

---

## batch()

Batch multiple updates.

### Signature

```typescript
function batch<T>(fn: () => T): T
```

### Example

```typescript
const a = signal(1)
const b = signal(2)

// Without batch: effect runs twice
effect(() => console.log(a.value + b.value))
a.value = 10  // Effect runs
b.value = 20  // Effect runs again

// With batch: effect runs once
batch(() => {
  a.value = 100
  b.value = 200
})  // Effect runs once with final values
```

---

## untrack()

Read signals without creating dependencies.

### Signature

```typescript
function untrack<T>(fn: () => T): T
```

### Example

```typescript
const a = signal(1)
const b = signal(2)

effect(() => {
  // Tracks 'a', doesn't track 'b'
  console.log(a.value + untrack(() => b.value))
})

a.value = 10  // Effect runs
b.value = 20  // Effect does NOT run
```

---

## Types

### WritableSignal<T>

```typescript
interface WritableSignal<T> {
  value: T
  peek(): T
  subscribe(callback: (value: T) => void): () => void
}
```

### DerivedSignal<T>

```typescript
interface DerivedSignal<T> {
  readonly value: T
  peek(): T
}
```

### Binding<T>

```typescript
interface Binding<T> {
  value: T
  peek(): T
  setSource(source: T | Signal<T> | (() => T)): void
}
```

### ReadonlyBinding<T>

```typescript
interface ReadonlyBinding<T> {
  readonly value: T
  peek(): T
}
```

## Common Patterns

### Derived from Multiple Sources

```typescript
const items = signal<Item[]>([])
const filter = signal('')
const sortBy = signal<'name' | 'date'>('name')

const filteredSorted = derived(() => {
  const f = filter.value.toLowerCase()
  return items.value
    .filter(item => item.name.toLowerCase().includes(f))
    .sort((a, b) => {
      if (sortBy.value === 'name') {
        return a.name.localeCompare(b.name)
      }
      return a.date.getTime() - b.date.getTime()
    })
})
```

### Previous Value

```typescript
function usePrevious<T>(signal: WritableSignal<T>): DerivedSignal<T | undefined> {
  let prev: T | undefined
  return derived(() => {
    const current = signal.peek()
    const result = prev
    prev = current
    return result
  })
}
```

### Debounced Signal

```typescript
function debounced<T>(source: WritableSignal<T>, delay: number): DerivedSignal<T> {
  const debounced = signal(source.value)
  let timeout: Timer | null = null

  effect(() => {
    const value = source.value
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  return derived(() => debounced.value)
}
```

## See Also

- [Signals Guide](../guides/reactivity/signals.md)
- [Bind Pattern](../guides/reactivity/bind-pattern.md)
- [@rlabs-inc/signals package](https://www.npmjs.com/package/@rlabs-inc/signals)
