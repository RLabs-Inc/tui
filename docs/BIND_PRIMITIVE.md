# The `bind()` Primitive - Reactive Binding for TUI Framework

> This document captures a critical design discovery for the TUI framework's reactive system.
> Read this COMPLETELY before implementing - it contains crucial context.

---

## The Problem We're Solving

The TUI framework uses **parallel reactive arrays** for component state:
```typescript
// Engine arrays (internal)
const textContent = state<...>([])
const fgColor = state<...>([])
const inputValue = state<...>([])
// ... 65+ arrays
```

Users create components with props:
```typescript
// User code
const count = state(0)
text({ content: count })
```

**The Challenge:** How do we connect the user's reactive state (`count`) to our internal reactive arrays (`textContent[index]`) so that:
1. When `count` changes, the component reflects the change
2. For inputs, when the user types, `count` updates
3. The reactive chain flows: state → derived pipeline → render effect
4. NO effects needed in components - pure reactive flow

---

## The Solution: `bind()` Primitive

A new reactive primitive for the `@rlabs-inc/signals` package that creates a **reactive binding/link** between two reactive values.

### What `bind()` Does

```typescript
const source = state(0)
const binding = bind(source)

// Reading through binding reads from source (creates dependency)
console.log(binding.value)  // → 0

// Writing through binding writes to source
binding.value = 42
console.log(source)  // → 42
```

It's a **reactive pointer** - not a copy, a link.

### Key Characteristics

1. **Read-through**: Reading `binding.value` reads from source, tracking dependency
2. **Write-through**: Writing `binding.value` writes to source, triggering reactivity
3. **Dependency chain**: Deriveds reading the binding depend on the source
4. **Zero overhead**: No intermediate storage, just forwarding

---

## How It Enables TUI Components

### Display Components (One-Way)

```typescript
// User code
const count = state(0)
text({ content: count })

// text() implementation
function text(props) {
  const index = allocateIndex()
  textContent[index] = bind(props.content)  // Binds to user's state
  return () => releaseIndex(index)
}
```

**Reactive chain:**
```
count (user's state)
    ↑ bound by
textContent[index] (bind)
    ↑ .value read by
frameBufferDerived
    ↑ .value read by
render effect → terminal updates
```

When `count` changes → `frameBufferDerived` sees change → re-render.

### Input Components (Two-Way)

```typescript
// User code
const username = state('')
input({ value: username })

// input() implementation
function input(props) {
  const index = allocateIndex()
  inputValue[index] = bind(props.value)  // Two-way binding!
  return () => releaseIndex(index)
}

// When user types (in keyboard handler):
inputValue[index].value = newText  // Writes through to username!
```

**Same primitive, bidirectional flow.**

---

## The Complete Reactive Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER CODE                                       │
│                                                                             │
│   const count = state(0)                                                    │
│   const name = state('')                                                    │
│   text({ content: count })                                                  │
│   input({ value: name })                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT PRIMITIVES                                │
│                                                                             │
│   function text(props) {                                                    │
│     const index = allocateIndex()                                           │
│     textContent[index] = bind(props.content)  ← BIND creates link          │
│     fgColor[index] = bind(props.color)                                      │
│   }                                                                         │
│                                                                             │
│   function input(props) {                                                   │
│     const index = allocateIndex()                                           │
│     inputValue[index] = bind(props.value)  ← Two-way binding               │
│   }                                                                         │
│                                                                             │
│   NO EFFECTS IN COMPONENTS - just bind() calls                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PARALLEL ARRAYS (Engine)                           │
│                                                                             │
│   textContent[]:   [bind→count]  [bind→title]  [bind→status]               │
│   inputValue[]:    [bind→name]   [bind→email]  [bind→search]               │
│   fgColor[]:       [bind→color]  [bind→...]    [bind→...]                  │
│                                                                             │
│   Arrays contain bind() instances that link to user's state                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Deriveds read binding.value
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: LAYOUT                                     │
│                                                                             │
│   const layoutDerived = derived(() => {                                     │
│     for (const i of allocatedIndices) {                                     │
│       const content = textContent[i]?.value  // Read through bind          │
│       // ... compute layout                                                 │
│     }                                                                       │
│     return { positions, wrappedLines, ... }                                 │
│   })                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: FRAME BUFFER                              │
│                                                                             │
│   const frameBufferDerived = derived(() => {                                │
│     const layout = layoutDerived.value                                      │
│     for (const i of allocatedIndices) {                                     │
│       const content = textContent[i]?.value  // Read through bind          │
│       drawText(buffer, x, y, content, ...)                                  │
│     }                                                                       │
│     return buffer                                                           │
│   })                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EFFECT: RENDER (THE SINGLE EFFECT)                 │
│                                                                             │
│   effect(() => {                                                            │
│     const buffer = frameBufferDerived.value                                 │
│     diffRenderer.render(buffer)                                             │
│   })                                                                        │
│                                                                             │
│   This is the ONLY effect in the entire render pipeline                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Requirements for `bind()`

### API Design

```typescript
// Create a binding to a reactive source
function bind<T>(source: State<T> | Signal<T> | Binding<T>): Binding<T>

// Binding interface
interface Binding<T> {
  // Read from source (tracks dependency)
  get value(): T

  // Write to source (triggers reactivity)
  set value(v: T)

  // Get the source (for nested bindings)
  readonly source: State<T> | Signal<T>
}
```

### Behavior

1. **Reading**: `binding.value` → reads from source, tracks dependency in current reactive context
2. **Writing**: `binding.value = x` → writes to source, triggers source's dependents
3. **Chaining**: `bind(bind(source))` → should work, points to ultimate source
4. **Static values**: `bind('hello')` → could return a constant binding or just the value

### Integration with Existing Primitives

- `signal(x)` - single value, `.value` accessor
- `state(obj)` - deep proxy, direct property access
- `derived(fn)` - computed, read-only `.value`
- **`bind(source)`** - reactive pointer, read/write `.value`

### In Deriveds

```typescript
const source = state(0)
const binding = bind(source)

const d = derived(() => {
  return binding.value * 2  // Tracks dependency on source!
})

source++  // d is now dirty
```

---

## TUI Framework Array Changes

Current (wrong - stores values):
```typescript
export const textContent = state<Binding<string>[]>([])
```

New (stores bindings):
```typescript
export const textContent = state<(Binding<string> | string)[]>([])
// Or maybe:
export const textContent = state<Binding<string>[]>([])
```

---

## Why Not Just `derived()`?

We considered using `derived()`:
```typescript
textContent[index] = derived(() => props.content)
```

Problems:
1. `derived()` is read-only - can't write through it for inputs
2. Semantically wrong - we're not computing, we're linking
3. `bind()` is clearer: "this is bound to that"

---

## Summary

| Primitive | Purpose | Read | Write |
|-----------|---------|------|-------|
| `signal()` | Single reactive value | `.value` | `.value =` |
| `state()` | Deep reactive proxy | direct | direct |
| `derived()` | Computed value | `.value` | ❌ read-only |
| **`bind()`** | Reactive link/pointer | `.value` → source | `.value =` → source |

`bind()` is the missing piece that enables:
- Clean component props API
- Automatic reactivity propagation
- Two-way binding for inputs
- Zero effects in component implementations
- Pure reactive data flow

---

## Next Steps

1. **Implement `bind()` in `@rlabs-inc/signals`**
   - Read the existing signal/state/derived implementations
   - Implement bind() following the same patterns
   - Add tests

2. **Update TUI engine arrays**
   - Arrays should store bindings
   - Update types

3. **Implement primitives (box, text, input)**
   - Use bind() for all props

4. **Implement pipeline**
   - layoutDerived reads through bindings
   - frameBufferDerived reads through bindings
   - Single render effect

5. **Test end-to-end**
   - User state → component → array → derived → effect → terminal
