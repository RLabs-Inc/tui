# Lifecycle APIs

> Component lifecycle hooks and scope management

## Import

```typescript
import { onMount, onDestroy, scoped, onCleanup, useAnimation } from '@rlabs-inc/tui'
```

## onMount()

Register a callback to run after the component is fully set up.

### Signature

```typescript
function onMount(fn: () => void): void
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `fn` | `() => void` | Function to run after mount |

### Example

```typescript
import { onMount, box, text } from '@rlabs-inc/tui'

function MyComponent() {
  onMount(() => {
    console.log('Component mounted!')
    // Initialize external resources, start animations, etc.
  })

  return box({
    children: () => text({ content: 'Hello' })
  })
}
```

### Use Cases

- Logging mount events
- Starting animations or timers after setup
- Focusing an input after render
- Fetching initial data

---

## onDestroy()

Register a cleanup callback to run when the component is destroyed.

### Signature

```typescript
function onDestroy(fn: () => void): void
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `fn` | `() => void` | Cleanup function to run on destroy |

### Example

```typescript
import { onDestroy, signal, text } from '@rlabs-inc/tui'

function Timer() {
  const count = signal(0)

  const interval = setInterval(() => {
    count.value++
  }, 1000)

  // Cleanup when component is destroyed
  onDestroy(() => clearInterval(interval))

  return text({ content: () => `Count: ${count.value}` })
}
```

### Multiple Cleanups

```typescript
function ComplexComponent() {
  const sub1 = eventBus.subscribe('event1', handler1)
  onDestroy(() => sub1.unsubscribe())

  const sub2 = eventBus.subscribe('event2', handler2)
  onDestroy(() => sub2.unsubscribe())

  const socket = new WebSocket(url)
  onDestroy(() => socket.close())

  // All cleanups run when component is destroyed
  return box({ ... })
}
```

### Zero Overhead

`onDestroy` has zero overhead when not used - only components that call these hooks pay the cost.

---

## scoped()

Create an isolated component scope for cleanup tracking.

### Signature

```typescript
function scoped(fn: () => void): Cleanup
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `fn` | `() => void` | Function to execute in scope |

### Returns

```typescript
type Cleanup = () => void  // Function to cleanup all registered cleanups
```

### Example

```typescript
import { scoped, onCleanup, box, text, signal } from '@rlabs-inc/tui'

function Counter(): Cleanup {
  return scoped(() => {
    const count = signal(0)

    // Manual cleanup for timers
    const interval = setInterval(() => count.value++, 1000)
    onCleanup(() => clearInterval(interval))

    // box/text automatically register their cleanups with scope
    box({
      children: () => text({ content: () => `Count: ${count.value}` })
    })
  })
}
```

### Use Cases

- Grouping related cleanup operations
- Creating reusable components with proper cleanup
- Managing subscriptions and timers

---

## onCleanup()

Register a cleanup callback with the current scope. Used inside `scoped()` for manual cleanup of timers, subscriptions, etc.

### Signature

```typescript
function onCleanup(cleanup: Cleanup): void
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `cleanup` | `Cleanup` | Function to run when scope is disposed |

### Example

```typescript
import { scoped, onCleanup, signal, text } from '@rlabs-inc/tui'

function Timer(): Cleanup {
  return scoped(() => {
    const elapsed = signal(0)

    // Register manual cleanup for the timer
    const interval = setInterval(() => elapsed.value++, 1000)
    onCleanup(() => clearInterval(interval))

    text({ content: () => `${elapsed.value}s` })
  })
}
```

### Notes

- Only works inside `scoped()` - does nothing outside a scope
- `box()` and `text()` automatically register with active scope
- Use for timers, event listeners, and other resources that need cleanup

---

## useAnimation()

Create an animated signal that cycles through frames automatically.

### Signature

```typescript
function useAnimation<T>(
  frames: readonly T[],
  options?: AnimationOptions
): DerivedSignal<T>
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `frames` | `readonly T[]` | Array of frame values to cycle through |
| `options` | `AnimationOptions` | Animation configuration |

### Returns

```typescript
DerivedSignal<T>  // Reactive signal containing current frame value
```

### AnimationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fps` | `number` | `12` | Frames per second |
| `active` | `boolean \| (() => boolean) \| { value: boolean }` | `true` | Whether animation is active (can be reactive) |
| `startFrame` | `number` | `0` | Starting frame index |

### Example

```typescript
import { useAnimation, scoped, text } from '@rlabs-inc/tui'

function Spinner() {
  return scoped(() => {
    const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const frame = useAnimation(SPINNER)

    text({ content: frame })  // Animates automatically
  })
}
```

### Conditional Animation

```typescript
function LoadingSpinner(props: { loading: Signal<boolean> }) {
  return scoped(() => {
    const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const frame = useAnimation(SPINNER, {
      fps: 12,
      active: () => props.loading.value,  // Only animate when loading
    })

    text({ content: frame, fg: t.warning })
  })
}
```

### Built-in Animation Frames

```typescript
import { AnimationFrames } from '@rlabs-inc/tui'

// Available presets:
AnimationFrames.spinner  // ['⠋', '⠙', '⠹', ...] - Braille spinner
AnimationFrames.dots     // ['⣾', '⣽', '⣻', ...] - Braille dots
AnimationFrames.line     // ['|', '/', '-', '\\'] - Simple line
AnimationFrames.bar      // ['▏', '▎', '▍', ...] - Growing bar
AnimationFrames.bounce   // ['⠁', '⠂', '⠄', ...] - Bouncing ball
AnimationFrames.clock    // ['🕐', '🕑', ...] - Clock emoji
AnimationFrames.pulse    // ['◯', '◔', '◑', ...] - Pulse circle
```

### Custom FPS

```typescript
function SlowSpinner() {
  return scoped(() => {
    const frame = useAnimation(AnimationFrames.line, { fps: 4 })
    text({ content: frame })
  })
}
```

### With Scope Auto-Cleanup

```typescript
function Timer() {
  return scoped(() => {
    // Animation automatically cleans up when scope is disposed
    const frame = useAnimation(AnimationFrames.spinner)
    text({ content: frame, fg: t.primary })
  })
}
```

## See Also

- [Component Patterns Guide](../../guides/patterns/component-patterns.md)
- [Signals Guide](../../guides/reactivity/signals.md)
- [box()](./box.md)
