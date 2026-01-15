# Focus Guide

> Tab navigation, focus management, and focus trapping

## Overview

TUI provides a complete focus management system:

- **Tab navigation** - Cycle through focusable components
- **Focus tracking** - Know which component has focus
- **Focus trapping** - Contain focus within modals
- **Focus history** - Restore previous focus states

## Basic Usage

```typescript
import { box, text, focusManager } from '@rlabs-inc/tui'

// Make a component focusable
box({
  focusable: true,
  tabIndex: 1,
  children: () => {
    text({ content: 'Focusable box' })
  }
})

// Navigate focus
focusManager.focusNext()
focusManager.focusPrevious()
```

## Making Components Focusable

```typescript
box({
  focusable: true,    // Can receive focus
  tabIndex: 1,        // Order in tab cycle (lower = earlier)

  children: () => { /* ... */ }
})
```

### Tab Index

- `tabIndex: 1` - First in tab order
- `tabIndex: 2` - Second in tab order
- `tabIndex: -1` - Focusable but not in tab order (only programmatic focus)
- Components with same `tabIndex` are ordered by creation

```typescript
// Tab order: Input → Checkbox → Submit → Cancel
box({
  children: () => {
    box({ focusable: true, tabIndex: 1, children: () => text({ content: 'Input' }) })
    box({ focusable: true, tabIndex: 2, children: () => text({ content: 'Checkbox' }) })
    box({ focusable: true, tabIndex: 3, children: () => text({ content: 'Submit' }) })
    box({ focusable: true, tabIndex: 3, children: () => text({ content: 'Cancel' }) }) // Same as Submit
  }
})
```

## Focus API

```typescript
import { focusManager, focusedIndex } from '@rlabs-inc/tui'

// Current focus (reactive signal)
focusedIndex.value  // Index of focused component, or -1

// Navigation
focusManager.focusNext()       // Focus next in tab order
focusManager.focusPrevious()   // Focus previous in tab order
focusManager.focusFirst()      // Focus first focusable
focusManager.focusLast()       // Focus last focusable

// Direct focus
focusManager.focus(index)      // Focus specific component
focusManager.blur()            // Remove focus

// Queries
focusManager.isFocused(index)  // Check if specific component has focus
focusManager.hasFocus()        // Check if anything has focus
```

## Tab Navigation

Tab navigation is built-in. By default:
- `Tab` - Focus next component
- `Shift+Tab` - Focus previous component

This wraps around - after the last component, it goes to the first.

## Visual Focus Indicators

Show which component has focus:

```typescript
const isFocused = (index: number) =>
  derived(() => focusedIndex.value === index)

box({
  id: 'my-component',
  focusable: true,
  tabIndex: 1,
  border: BorderStyle.ROUNDED,
  borderColor: derived(() =>
    focusedIndex.value === getComponentIndex('my-component')
      ? t.primary.value
      : t.border.value
  ),
  children: () => { /* ... */ }
})
```

### Using Variants for Focus

```typescript
box({
  focusable: true,
  variant: 'outline',  // Shows focus ring automatically
  children: () => { /* ... */ }
})
```

## Focus-Aware Keyboard Handlers

Register handlers that only fire when a component has focus:

```typescript
import { keyboard } from '@rlabs-inc/tui'

const componentIndex = allocateIndex('my-input')

// Only fires when this component is focused
keyboard.onFocused(componentIndex, (event) => {
  if (event.key === 'Enter') {
    submit()
    return true
  }
})
```

## Focus Trapping (Modals)

Keep focus contained within a modal:

```typescript
import { focusManager } from '@rlabs-inc/tui'

const modalIndex = allocateIndex('modal')

function openModal() {
  showModal.value = true

  // Save current focus and trap within modal
  focusManager.saveFocusToHistory()
  focusManager.pushFocusTrap(modalIndex)
  focusManager.focusFirst()  // Focus first element in modal
}

function closeModal() {
  showModal.value = false

  // Release trap and restore previous focus
  focusManager.popFocusTrap()
  focusManager.restoreFocusFromHistory()
}

show(
  () => showModal.value,
  () => box({
    id: 'modal',
    zIndex: 100,
    children: () => {
      text({ content: 'Modal Title' })

      box({ focusable: true, tabIndex: 1, children: () => text({ content: 'OK' }) })
      box({ focusable: true, tabIndex: 2, children: () => text({ content: 'Cancel' }) })
    }
  })
)
```

### Focus Trap API

```typescript
// Enter trap - focus contained within container's children
focusManager.pushFocusTrap(containerIndex)

// Exit trap - focus returns to normal navigation
focusManager.popFocusTrap()

// Check if trapped
focusManager.isFocusTrapped()  // boolean

// Get current trap container
focusManager.getFocusTrapContainer()  // index or undefined
```

## Focus History

Save and restore focus positions:

```typescript
// Save current focus (before opening modal, navigating away, etc.)
focusManager.saveFocusToHistory()

// ... user does something ...

// Restore previous focus (up to 10 history items)
focusManager.restoreFocusFromHistory()
```

History automatically skips components that are no longer focusable or visible.

## Common Patterns

### Form Navigation

```typescript
const fields = ['name', 'email', 'message', 'submit']

fields.forEach((field, i) => {
  box({
    id: field,
    focusable: true,
    tabIndex: i + 1,
    children: () => {
      text({ content: field.charAt(0).toUpperCase() + field.slice(1) })
    }
  })
})

// Enter moves to next field
keyboard.on((event) => {
  if (event.key === 'Enter' && focusedIndex.value >= 0) {
    const currentTab = getTabIndex(focusedIndex.value)
    if (currentTab < fields.length) {
      focusManager.focusNext()
    }
    return true
  }
})
```

### List Selection with Focus

```typescript
const selectedIndex = signal(0)

each(
  () => items.value,
  (getItem, key) => box({
    id: `item-${key}`,
    focusable: true,
    tabIndex: parseInt(key),
    bg: derived(() => selectedIndex.value === parseInt(key) ? t.surface.value : null),
    children: () => {
      text({ content: getItem })
    }
  }),
  { key: (_, i) => String(i) }
)

// Sync selection with focus
effect(() => {
  if (focusedIndex.value >= 0) {
    const itemIndex = /* get item index from component index */
    selectedIndex.value = itemIndex
  }
})
```

### Skip Disabled Items

```typescript
const items = signal([
  { id: '1', text: 'Active', disabled: false },
  { id: '2', text: 'Disabled', disabled: true },
  { id: '3', text: 'Active', disabled: false },
])

each(
  () => items.value,
  (getItem, key) => box({
    focusable: derived(() => !getItem().disabled),  // Not focusable when disabled
    tabIndex: 1,
    opacity: derived(() => getItem().disabled ? 0.5 : 1),
    children: () => {
      text({ content: derived(() => getItem().text) })
    }
  }),
  { key: item => item.id }
)
```

### Auto-Focus on Mount

```typescript
const inputIndex = allocateIndex('input')

box({
  id: 'input',
  focusable: true,
  tabIndex: 1,
  children: () => { /* ... */ }
})

// Focus after mount
setTimeout(() => {
  focusManager.focus(inputIndex)
}, 0)
```

## Visibility and Focus

Hidden components (`visible: false`) are automatically excluded from focus navigation. If the focused component becomes hidden, focus moves to the next available component.

```typescript
const isAdvancedMode = signal(false)

box({
  focusable: true,
  visible: isAdvancedMode,  // Hidden in basic mode
  children: () => {
    text({ content: 'Advanced Option' })
  }
})

// When isAdvancedMode becomes false, this component
// is skipped in tab navigation
```

## See Also

- [API Reference: focusManager](../../api/state/focus.md)
- [Keyboard Guide](./keyboard.md)
- [Modals Pattern](../patterns/modals-overlays.md)
