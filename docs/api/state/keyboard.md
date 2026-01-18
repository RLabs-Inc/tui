# keyboard

> Keyboard input handling module

## Import

```typescript
import { keyboard } from '@rlabs-inc/tui'
// Or individual functions
import { onKey, onFocused, on } from '@rlabs-inc/tui'
```

## API Reference

### keyboard.on()

Subscribe to all key events.

```typescript
keyboard.on(handler: KeyHandler): Cleanup
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `handler` | `KeyHandler` | Called for every key event |

**Returns**: Cleanup function

```typescript
const unsub = keyboard.on((event) => {
  console.log('Key:', event.key)
  if (event.key === 'q') {
    return true  // Consume event
  }
})
```

### keyboard.onKey()

Subscribe to specific key(s). Handler receives no arguments - check `lastEvent` if needed.

```typescript
keyboard.onKey(
  key: string | string[],
  handler: () => void | boolean | Promise<void>
): Cleanup
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string \| string[]` | Key or keys to listen for |
| `handler` | `() => void \| boolean \| Promise<void>` | Called when key is pressed (no arguments) |

**Returns**: Cleanup function

```typescript
// Single key
keyboard.onKey('Enter', () => {
  console.log('Enter pressed')
})

// Multiple keys
keyboard.onKey(['ArrowUp', 'k'], () => {
  moveUp()
})
```

### keyboard.onFocused()

Subscribe to keys only when a component is focused.

```typescript
keyboard.onFocused(
  componentIndex: number,
  handler: KeyHandler
): Cleanup
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `componentIndex` | `number` | Component index to check focus |
| `handler` | `KeyHandler` | Called when key pressed and focused |

**Returns**: Cleanup function

```typescript
const myIndex = allocateIndex()

keyboard.onFocused(myIndex, (event) => {
  if (event.key === 'Enter') {
    activate()
    return true
  }
})
```

### keyboard.cleanupIndex()

Remove all focused handlers for a component index. Called automatically when components are released.

```typescript
keyboard.cleanupIndex(index: number): void
```

### keyboard.cleanup()

Clear all state and handlers (internal, called on unmount).

```typescript
keyboard.cleanup(): void
```

## Types

### KeyboardEvent

```typescript
interface KeyboardEvent {
  key: string           // Key name ('a', 'Enter', 'ArrowUp', etc.)
  modifiers: Modifiers  // Modifier keys state
  state: KeyState       // 'press' | 'repeat' | 'release'
  raw?: string          // Raw escape sequence (optional)
}
```

### Modifiers

```typescript
interface Modifiers {
  shift: boolean
  ctrl: boolean
  alt: boolean
  meta: boolean  // Command on macOS
}
```

### KeyState

```typescript
type KeyState = 'press' | 'repeat' | 'release'
```

### KeyHandler

```typescript
// For keyboard.on() and keyboard.onFocused() - receives event
type KeyHandler = (event: KeyboardEvent) => boolean | void

// For keyboard.onKey() - no arguments
type KeyHandler = () => void | boolean | Promise<void>

// Return true to consume the event (prevent further handlers)
```

## Key Names

### Common Keys

| Key | Name |
|-----|------|
| Enter | `'Enter'` |
| Tab | `'Tab'` |
| Escape | `'Escape'` |
| Space | `'Space'` or `' '` |
| Backspace | `'Backspace'` |
| Delete | `'Delete'` |

### Arrow Keys

| Key | Name |
|-----|------|
| Up | `'ArrowUp'` |
| Down | `'ArrowDown'` |
| Left | `'ArrowLeft'` |
| Right | `'ArrowRight'` |

### Navigation Keys

| Key | Name |
|-----|------|
| Home | `'Home'` |
| End | `'End'` |
| Page Up | `'PageUp'` |
| Page Down | `'PageDown'` |
| Insert | `'Insert'` |

### Function Keys

`'F1'` through `'F12'`

### Letters and Numbers

Lowercase letters: `'a'` through `'z'`
Numbers: `'0'` through `'9'`

## Examples

### Basic Navigation

```typescript
const selectedIndex = signal(0)
const items = ['A', 'B', 'C']

keyboard.onKey('ArrowDown', () => {
  selectedIndex.value = Math.min(
    selectedIndex.value + 1,
    items.length - 1
  )
})

keyboard.onKey('ArrowUp', () => {
  selectedIndex.value = Math.max(
    selectedIndex.value - 1,
    0
  )
})
```

### With Modifiers

```typescript
keyboard.on((event) => {
  // Ctrl+S
  if (event.key === 's' && event.modifiers.ctrl) {
    save()
    return true
  }

  // Ctrl+Shift+Z (redo)
  if (event.key === 'z' && event.modifiers.ctrl && event.modifiers.shift) {
    redo()
    return true
  }
})
```

### Vim-style Bindings

```typescript
keyboard.onKey(['h', 'ArrowLeft'], () => moveLeft())
keyboard.onKey(['j', 'ArrowDown'], () => moveDown())
keyboard.onKey(['k', 'ArrowUp'], () => moveUp())
keyboard.onKey(['l', 'ArrowRight'], () => moveRight())
keyboard.onKey('gg', () => goToTop())  // Note: multi-key not built-in
```

### Modal Keyboard Handling

```typescript
const isModalOpen = signal(false)

// Close modal with Escape
keyboard.onKey('Escape', () => {
  if (isModalOpen.value) {
    isModalOpen.value = false
    return true  // Consume event
  }
})

// Open modal with 'm'
keyboard.onKey('m', () => {
  isModalOpen.value = true
})
```

### Text Input

```typescript
const inputText = signal('')

keyboard.on((event) => {
  // Single character keys are printable
  if (event.key.length === 1) {
    inputText.value += event.key
    return true
  }

  if (event.key === 'Backspace') {
    inputText.value = inputText.value.slice(0, -1)
    return true
  }
})
```

### Focus-Scoped Handlers

```typescript
function ListItem(index: number) {
  const itemIndex = allocateIndex()

  keyboard.onFocused(itemIndex, (event) => {
    if (event.key === 'Enter') {
      selectItem(index)
      return true
    }
    if (event.key === 'Delete') {
      deleteItem(index)
      return true
    }
  })

  return box({
    focusable: true,
    tabIndex: index + 1,
    children: () => text({ content: `Item ${index}` })
  })
}
```

## State Signals

### lastKey

Last key pressed (signal).

```typescript
import { lastKey } from '@rlabs-inc/tui'

effect(() => {
  console.log('Last key:', lastKey.value)
})
```

### lastEvent

Last full keyboard event (signal).

```typescript
import { lastEvent } from '@rlabs-inc/tui'

effect(() => {
  const event = lastEvent.value
  if (event) {
    console.log('Event:', event.key, event.modifiers)
  }
})
```

## See Also

- [Keyboard Guide](../../guides/state/keyboard.md)
- [Focus API](./focus.md)
- [mouse](./mouse.md)
