# Lifecycle APIs

> Component lifecycle hooks and scope management

## Import

```typescript
import { onMount, onDestroy, scoped, useAnimation } from '@rlabs-inc/tui'
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
import { scoped, onDestroy, box, text } from '@rlabs-inc/tui'

function MyComponent() {
  const cleanup = scoped(() => {
    // Anything registered with onDestroy() in here
    // will be cleaned up when cleanup() is called

    const interval = setInterval(() => {
      // Update something
    }, 1000)

    onDestroy(() => clearInterval(interval))

    box({
      children: () => text({ content: 'Hello' })
    })
  })

  return cleanup  // Return to allow parent to cleanup
}
```

### Use Cases

- Grouping related cleanup operations
- Creating reusable components with proper cleanup
- Managing subscriptions and timers

---

## useAnimation()

Create an animation frame loop.

### Signature

```typescript
function useAnimation(
  callback: (frame: AnimationFrames) => void,
  options?: AnimationOptions
): Cleanup
```

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `callback` | `(frame: AnimationFrames) => void` | Called each frame |
| `options` | `AnimationOptions` | Animation configuration |

### AnimationFrames

```typescript
interface AnimationFrames {
  deltaTime: number  // Time since last frame (ms)
  totalTime: number  // Total time since start (ms)
  frameCount: number // Number of frames since start
}
```

### AnimationOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fps` | `number` | `60` | Target frames per second |
| `autoStart` | `boolean` | `true` | Start immediately |

### Example

```typescript
import { useAnimation, signal, text } from '@rlabs-inc/tui'

function Spinner() {
  const frame = signal(0)
  const frames = ['|', '/', '-', '\\']

  useAnimation(({ frameCount }) => {
    frame.value = frameCount % frames.length
  }, { fps: 10 })

  return text({
    content: () => frames[frame.value]
  })
}
```

### Progress Animation

```typescript
function AnimatedProgress() {
  const progress = signal(0)

  useAnimation(({ deltaTime }) => {
    progress.value = Math.min(1, progress.value + deltaTime / 3000)
  })

  return box({
    children: () => {
      const width = Math.floor(progress.value * 20)
      text({ content: () => '█'.repeat(width) + '░'.repeat(20 - width) })
      text({ content: () => `${Math.floor(progress.value * 100)}%` })
    }
  })
}
```

### Controlled Animation

```typescript
function PausableAnimation() {
  const position = signal(0)
  const isPaused = signal(false)

  useAnimation(({ deltaTime }) => {
    if (!isPaused.value) {
      position.value = (position.value + deltaTime * 0.01) % 40
    }
  })

  keyboard.onKey('space', () => {
    isPaused.value = !isPaused.value
  })

  return box({
    flexDirection: 'row',
    children: () => {
      text({ content: ' '.repeat(Math.floor(position.value)) })
      text({ content: '*' })
    }
  })
}
```

### Low FPS for Status Updates

```typescript
function StatusBar() {
  const time = signal(new Date())

  // Only update once per second
  useAnimation(() => {
    time.value = new Date()
  }, { fps: 1 })

  return text({
    content: () => time.value.toLocaleTimeString()
  })
}
```

### Easing

```typescript
function EasedTransition() {
  const value = signal(0)
  const target = signal(100)

  useAnimation(({ deltaTime }) => {
    // Ease towards target
    const diff = target.value - value.value
    value.value += diff * Math.min(1, deltaTime / 200)
  })

  keyboard.onKey('space', () => {
    target.value = target.value === 100 ? 0 : 100
  })

  return text({ content: () => value.value.toFixed(1) })
}
```

## componentScope

Low-level scope access (advanced).

### Signature

```typescript
const componentScope: {
  current: Scope | null
  push(scope: Scope): void
  pop(): void
}
```

### Example

```typescript
// Advanced: manual scope management
const scope = new Scope()
componentScope.push(scope)

try {
  // Code here can use onCleanup()
  const cleanup = myComponent()
} finally {
  componentScope.pop()
}
```

## cleanupCollector

Collect cleanups without a scope (advanced).

### Signature

```typescript
function cleanupCollector<T>(fn: () => T): { result: T, cleanups: Cleanup[] }
```

### Example

```typescript
const { result, cleanups } = cleanupCollector(() => {
  const c1 = box({ ... })
  const c2 = text({ ... })
  return [c1, c2]
})

// Later, cleanup all
cleanups.forEach(c => c())
```

## See Also

- [Component Patterns Guide](../../guides/patterns/component-patterns.md)
- [Signals Guide](../../guides/reactivity/signals.md)
- [box()](./box.md)
