# focusManager

> Focus navigation and management

## Import

```typescript
import { focusManager } from '@rlabs-inc/tui'
// Or individual functions
import {
  focusedIndex, focus, blur, focusFirst, focusLast,
  pushFocusTrap, popFocusTrap,
  saveFocusToHistory, restoreFocusFromHistory
} from '@rlabs-inc/tui'
```

## Making Components Focusable

The simplest way to create focusable components:

```typescript
import { box, text } from '@rlabs-inc/tui'

box({
  focusable: true,           // Enables Tab navigation
  tabIndex: 1,               // Optional: explicit tab order
  onFocus: () => console.log('Got focus'),
  onBlur: () => console.log('Lost focus'),
  onKey: (event) => {
    if (event.key === 'Enter') handleAction()
    return true  // consume event
  },
  children: () => text({ content: 'Focusable box' })
})
```

## API Reference

### focusManager.focus()

Focus a specific component by index (advanced).

```typescript
focusManager.focus(index: number): void
```

### focusManager.blur()

Remove focus from all components.

```typescript
focusManager.blur(): void
```

### focusManager.focusFirst()

Focus the first focusable component.

```typescript
focusManager.focusFirst(): void
```

### focusManager.focusLast()

Focus the last focusable component.

```typescript
focusManager.focusLast(): void
```

### focusManager.focusNext()

Focus the next focusable component.

```typescript
focusManager.focusNext(): void
```

### focusManager.focusPrevious()

Focus the previous focusable component.

```typescript
focusManager.focusPrevious(): void
```

### focusManager.pushFocusTrap()

Trap focus within a container.

```typescript
focusManager.pushFocusTrap(containerIndices: number[]): void
```

Focus traps are typically used for modals - see the [Modals Guide](../../guides/patterns/modals-overlays.md) for complete examples.

### focusManager.popFocusTrap()

Remove the most recent focus trap.

```typescript
focusManager.popFocusTrap(): void
```

### focusManager.saveFocusToHistory()

Save current focus for later restoration.

```typescript
focusManager.saveFocusToHistory(): void
```

### focusManager.restoreFocusFromHistory()

Restore previously saved focus.

```typescript
focusManager.restoreFocusFromHistory(): void
```

## State Signals

### focusedIndex

Currently focused component index (-1 if none).

```typescript
import { focusedIndex } from '@rlabs-inc/tui'

effect(() => {
  console.log('Focused:', focusedIndex.value)
})
```

### focusableIndices

Array of all focusable component indices.

```typescript
import { focusableIndices } from '@rlabs-inc/tui'

effect(() => {
  console.log('Focusable count:', focusableIndices.value.length)
})
```

## Helper Functions

### isFocused()

Check if a component is focused (internal use - prefer `onFocus`/`onBlur` props).

```typescript
// Prefer using box props for focus state:
const isFocused = signal(false)

box({
  focusable: true,
  onFocus: () => { isFocused.value = true },
  onBlur: () => { isFocused.value = false },
  children: () => text({ content: 'Focusable' })
})
```

### hasFocus()

Check if any component is focused.

```typescript
import { hasFocus } from '@rlabs-inc/tui'

if (hasFocus()) {
  // Something is focused
}
```

### isFocusTrapped()

Check if focus is currently trapped.

```typescript
import { isFocusTrapped } from '@rlabs-inc/tui'

if (isFocusTrapped()) {
  // Focus is trapped in a container
}
```

### getFocusTrapContainer()

Get the index of the current focus trap container.

```typescript
import { getFocusTrapContainer } from '@rlabs-inc/tui'

const trapIndex = getFocusTrapContainer()  // -1 if no trap
```

### getFocusableIndices()

Get all focusable indices (respecting focus traps).

```typescript
import { getFocusableIndices } from '@rlabs-inc/tui'

const indices = getFocusableIndices()
```

## Examples

### Focusable Component

```typescript
function FocusableItem(index: number) {
  const focused = signal(false)

  return box({
    focusable: true,
    tabIndex: index + 1,
    border: BorderStyle.SINGLE,
    borderColor: derived(() =>
      focused.value ? t.primary : t.border
    ),
    onFocus: () => { focused.value = true },
    onBlur: () => { focused.value = false },
    children: () => text({ content: `Item ${index}` })
  })
}
```

### Tab Navigation

Tab navigation is built-in when using `focusable` and `tabIndex`:

```typescript
box({
  children: () => {
    box({ focusable: true, tabIndex: 1, children: () => text({ content: 'First' }) })
    box({ focusable: true, tabIndex: 2, children: () => text({ content: 'Second' }) })
    box({ focusable: true, tabIndex: 3, children: () => text({ content: 'Third' }) })
  }
})

// Tab and Shift+Tab automatically navigate
```

### Focus Trap for Modal

```typescript
import { box, text, focusManager, onMount, onDestroy } from '@rlabs-inc/tui'

function Modal({ onClose }: { onClose: () => void }) {
  // Save and restore focus automatically
  onMount(() => {
    focusManager.saveFocusToHistory()
    focusManager.focusFirst()
  })

  onDestroy(() => {
    focusManager.restoreFocusFromHistory()
  })

  return box({
    zIndex: 100,
    border: BorderStyle.DOUBLE,
    children: () => {
      text({ content: 'Modal Title' })
      box({
        focusable: true,
        tabIndex: 1,
        onKey: (e) => {
          if (e.key === 'Enter') { onClose(); return true }
        },
        children: () => text({ content: 'OK' })
      })
      box({
        focusable: true,
        tabIndex: 2,
        onKey: (e) => {
          if (e.key === 'Escape') { onClose(); return true }
        },
        children: () => text({ content: 'Cancel' })
      })
    }
  })
}
```

### Focus Ring

```typescript
function FocusRing() {
  const focused = signal(false)

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.ROUNDED,
    borderColor: derived(() =>
      focused.value ? t.primary : t.border
    ),
    bg: derived(() =>
      focused.value ? t.surface : null
    ),
    onFocus: () => { focused.value = true },
    onBlur: () => { focused.value = false },
    children: () => text({ content: 'Focus me!' })
  })
}
```

### Keyboard Focus Handler

```typescript
box({
  focusable: true,
  tabIndex: 1,
  onKey: (event) => {
    if (event.key === 'Enter') {
      activate()
      return true  // consume event
    }
  },
  children: () => text({ content: 'Press Enter when focused' })
})
```

### Focus on Mount

```typescript
import { box, text, focusManager, onMount, BorderStyle } from '@rlabs-inc/tui'

function AutoFocusComponent() {
  // Focus the first focusable element on mount
  onMount(() => {
    focusManager.focusFirst()
  })

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.SINGLE,
    children: () => text({ content: 'Auto-focused!' })
  })
}
```

### Focus Groups

```typescript
function FocusGroup(items: string[]) {
  return box({
    children: () => {
      items.forEach((item, i) => {
        box({
          focusable: true,
          tabIndex: i + 1,
          onKey: (e) => {
            if (e.key === 'Enter') {
              selectItem(item)
              return true
            }
          },
          children: () => text({ content: item })
        })
      })
    }
  })
}
```

## Focus Order

Focus order is determined by `tabIndex`:
- Positive values: Focus in ascending order
- Zero: Focus in DOM order (after positive tabIndices)
- Negative (-1): Not in tab sequence (focus programmatically only)

```typescript
box({ focusable: true, tabIndex: 2 })  // Focused second
box({ focusable: true, tabIndex: 1 })  // Focused first
box({ focusable: true, tabIndex: 3 })  // Focused third
box({ focusable: true, tabIndex: -1 }) // Not in tab sequence
```

## See Also

- [Focus Guide](../../guides/state/focus.md)
- [keyboard](./keyboard.md)
- [Modals Guide](../../guides/patterns/modals-overlays.md)
