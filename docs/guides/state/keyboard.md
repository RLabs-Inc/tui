# Keyboard Guide

> Handle keyboard input, shortcuts, and key combinations

## Overview

TUI provides a comprehensive keyboard handling system:

- **Key subscriptions** - Listen for specific keys
- **Modifier support** - Ctrl, Alt, Shift, Meta
- **Focus-aware handlers** - Only fire when component has focus
- **Kitty protocol** - Advanced keyboard support with key release events

## Basic Usage

```typescript
import { keyboard } from '@rlabs-inc/tui'

// Listen for a specific key
keyboard.onKey('Enter', () => {
  console.log('Enter pressed!')
})

// Listen for multiple keys
keyboard.onKey(['q', 'Q', 'Escape'], () => {
  process.exit(0)
})
```

## API Overview

```typescript
import { keyboard, lastKey, lastEvent } from '@rlabs-inc/tui'

// Reactive state
lastKey           // Signal<string> - Last key pressed
lastEvent         // Signal<KeyboardEvent | null> - Full event details

// Handler registration
keyboard.on(handler)              // All keyboard events
keyboard.onKey(key, handler)      // Specific key(s)
keyboard.onFocused(index, handler) // When component has focus
```

## onKey() - Key-Specific Handlers

### Single Key

```typescript
keyboard.onKey('Enter', () => {
  submit()
})
```

### Multiple Keys

```typescript
keyboard.onKey(['ArrowUp', 'k'], () => {
  moveUp()
})

keyboard.onKey(['ArrowDown', 'j'], () => {
  moveDown()
})
```

### Key Names

Common key names:

| Category | Keys |
|----------|------|
| **Letters** | `a`-`z`, `A`-`Z` |
| **Numbers** | `0`-`9` |
| **Arrows** | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
| **Navigation** | `Home`, `End`, `PageUp`, `PageDown` |
| **Editing** | `Backspace`, `Delete`, `Insert` |
| **Whitespace** | `Enter`, `Tab`, `Space` |
| **Function** | `F1`-`F12` |
| **Special** | `Escape`, `Ctrl`, `Alt`, `Shift`, `Meta` |

## on() - All Keyboard Events

```typescript
keyboard.on((event) => {
  console.log(`Key: ${event.key}`)
  console.log(`Modifiers:`, event.modifiers)
  console.log(`State: ${event.state}`)
})
```

### KeyboardEvent Structure

```typescript
interface KeyboardEvent {
  key: string           // The key pressed ('a', 'Enter', 'ArrowUp', etc.)
  modifiers: {
    ctrl: boolean       // Ctrl/Control key
    alt: boolean        // Alt/Option key
    shift: boolean      // Shift key
    meta: boolean       // Cmd (Mac) / Win (Windows) key
  }
  state: 'press' | 'repeat' | 'release'  // Key state (with Kitty protocol)
  raw?: string          // Raw escape sequence (debugging)
}
```

## Modifiers

### Checking Modifiers

```typescript
keyboard.on((event) => {
  if (event.key === 's' && event.modifiers.ctrl) {
    save()
    return true  // Consumed - don't propagate
  }
})
```

### Common Modifier Patterns

```typescript
// Ctrl+C (usually handled globally, but as example)
keyboard.on((event) => {
  if (event.key === 'c' && event.modifiers.ctrl) {
    // Handle Ctrl+C
  }
})

// Ctrl+Shift+S
keyboard.on((event) => {
  if (event.key === 'S' && event.modifiers.ctrl && event.modifiers.shift) {
    saveAs()
  }
})

// Alt+Number for tab switching
keyboard.on((event) => {
  if (event.modifiers.alt && /^[1-9]$/.test(event.key)) {
    switchToTab(parseInt(event.key) - 1)
  }
})
```

## Focus-Aware Handlers

Register handlers that only fire when a specific component has focus:

```typescript
import { keyboard } from '@rlabs-inc/tui'

// Inside a component
box({
  id: 'my-input',
  focusable: true,
  children: () => {
    // Get the component index after creation
    const index = getComponentIndex('my-input')

    // This handler only fires when this component is focused
    keyboard.onFocused(index, (event) => {
      if (event.key === 'Enter') {
        submitInput()
        return true
      }
    })
  }
})
```

## Handler Return Values

Handlers can return `true` to indicate they consumed the event:

```typescript
keyboard.on((event) => {
  if (event.key === 'Enter') {
    handleEnter()
    return true  // Event consumed - stop propagation
  }
  // Return nothing or false - event continues to other handlers
})
```

### Handler Priority

Events are dispatched in this order:

1. **Global shortcuts** (Ctrl+C, Tab) - handled by framework
2. **Focused component handlers** - `onFocused()`
3. **User handlers** - `on()` and `onKey()`
4. **Framework defaults** - Arrow key scrolling, etc.

If any handler returns `true`, subsequent handlers don't receive the event.

## Reactive State

### lastKey

```typescript
import { lastKey } from '@rlabs-inc/tui'

// In a component - shows last pressed key
text({
  content: derived(() => `Last key: ${lastKey.value || 'none'}`)
})
```

### lastEvent

```typescript
import { lastEvent } from '@rlabs-inc/tui'

// Access full event details
effect(() => {
  const event = lastEvent.value
  if (event) {
    console.log(`${event.key} with ${JSON.stringify(event.modifiers)}`)
  }
})
```

## Common Patterns

### Vim-Style Navigation

```typescript
keyboard.onKey(['k', 'ArrowUp'], () => moveUp())
keyboard.onKey(['j', 'ArrowDown'], () => moveDown())
keyboard.onKey(['h', 'ArrowLeft'], () => moveLeft())
keyboard.onKey(['l', 'ArrowRight'], () => moveRight())
keyboard.onKey('g', () => goToStart())  // First item
keyboard.onKey('G', () => goToEnd())    // Last item
```

### Text Input Mode

```typescript
const isTyping = signal(false)
const input = signal('')

keyboard.on((event) => {
  if (!isTyping.value) return

  if (event.key === 'Escape') {
    isTyping.value = false
    return true
  }

  if (event.key === 'Backspace') {
    input.value = input.value.slice(0, -1)
    return true
  }

  if (event.key.length === 1 && !event.modifiers.ctrl) {
    input.value += event.key
    return true
  }
})
```

### Key Bindings Display

```typescript
const bindings = [
  { key: '[Enter]', action: 'Submit', color: t.success },
  { key: '[Esc]', action: 'Cancel', color: t.error },
  { key: '[Tab]', action: 'Next field', color: t.primary },
]

box({
  children: () => {
    each(
      () => bindings,
      (getBinding, key) => box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({
            content: derived(() => getBinding().key),
            fg: derived(() => getBinding().color.value),
            width: 10
          })
          text({
            content: derived(() => getBinding().action)
          })
        }
      }),
      { key: b => b.key }
    )
  }
})
```

### Keyboard Shortcuts Modal

```typescript
keyboard.onKey('?', () => {
  showHelp.value = !showHelp.value
})

show(
  () => showHelp.value,
  () => box({
    // Modal overlay
    zIndex: 100,
    border: BorderStyle.DOUBLE,
    padding: 2,
    children: () => {
      text({ content: 'Keyboard Shortcuts', fg: t.primary })
      // ... shortcut list
    }
  })
)
```

## Kitty Keyboard Protocol

TUI supports the Kitty keyboard protocol for advanced features:

- **Key release events** - Know when keys are released
- **Repeat detection** - Distinguish held keys from multiple presses
- **Full modifier support** - All modifier combinations

Enable it in mount options:

```typescript
mount(() => { /* ... */ }, {
  mode: 'fullscreen',
  kittyKeyboard: true  // Enable Kitty protocol
})
```

### Using Key State

```typescript
keyboard.on((event) => {
  switch (event.state) {
    case 'press':
      // Key was just pressed
      break
    case 'repeat':
      // Key is being held
      break
    case 'release':
      // Key was released (Kitty only)
      break
  }
})
```

## Cleanup

Handlers are automatically cleaned up when components unmount (if using `onFocused`). Global handlers persist for the application lifetime.

```typescript
// Global handlers - persist until app exits
keyboard.onKey('q', () => process.exit(0))

// Focused handlers - cleaned up with component
const index = allocateIndex()
keyboard.onFocused(index, handler)
// Handler removed when component is released
```

## See Also

- [API Reference: keyboard](../../api/state/keyboard.md)
- [Focus Guide](./focus.md)
- [Component Patterns](../patterns/component-patterns.md)
