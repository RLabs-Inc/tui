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

## API Reference

### focusManager.focus()

Focus a specific component.

```typescript
focusManager.focus(index: number): void
```

```typescript
const myComponentIndex = allocateIndex()
focusManager.focus(myComponentIndex)
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
focusManager.pushFocusTrap(containerIndex: number): void
```

```typescript
// Trap focus in modal
const modalIndex = allocateIndex()
focusManager.pushFocusTrap(modalIndex)
```

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

Check if a component is focused.

```typescript
import { isFocused } from '@rlabs-inc/tui'

const myIndex = allocateIndex()
const focused = isFocused(myIndex)  // Returns DerivedSignal<boolean>
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
  const itemIndex = allocateIndex()
  const focused = isFocused(itemIndex)

  return box({
    focusable: true,
    tabIndex: index + 1,
    border: BorderStyle.SINGLE,
    borderColor: derived(() =>
      focused.value ? t.primary.value : t.border.value
    ),
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
function Modal() {
  const modalIndex = allocateIndex()

  // On mount: trap focus
  focusManager.saveFocusToHistory()
  focusManager.pushFocusTrap(modalIndex)
  focusManager.focusFirst()

  // On unmount: release trap
  onCleanup(() => {
    focusManager.popFocusTrap()
    focusManager.restoreFocusFromHistory()
  })

  return box({
    id: modalIndex.toString(),
    zIndex: 100,
    children: () => {
      box({ focusable: true, tabIndex: 1, children: () => text({ content: 'OK' }) })
      box({ focusable: true, tabIndex: 2, children: () => text({ content: 'Cancel' }) })
    }
  })
}
```

### Focus Ring

```typescript
function FocusRing() {
  const myIndex = allocateIndex()
  const focused = isFocused(myIndex)

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.ROUNDED,
    borderColor: derived(() =>
      focused.value ? t.primary.value : null
    ),
    bg: derived(() =>
      focused.value ? t.surface.value : null
    ),
    children: () => text({ content: 'Focus me!' })
  })
}
```

### Keyboard Focus Handler

```typescript
const myIndex = allocateIndex()

keyboard.onFocused(myIndex, (event) => {
  if (event.key === 'Enter') {
    activate()
    return true
  }
})

box({
  focusable: true,
  tabIndex: 1,
  children: () => text({ content: 'Press Enter when focused' })
})
```

### Focus on Mount

```typescript
function AutoFocusInput() {
  const inputIndex = allocateIndex()

  // Focus on mount
  effect(() => {
    focusManager.focus(inputIndex)
  })

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.SINGLE,
    children: () => text({ content: 'Auto-focused input' })
  })
}
```

### Focus Groups

```typescript
function FocusGroup(items: string[]) {
  const groupIndex = allocateIndex()

  return box({
    id: groupIndex.toString(),
    children: () => {
      items.forEach((item, i) => {
        box({
          focusable: true,
          tabIndex: i + 1,
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
