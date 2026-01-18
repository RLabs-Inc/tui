# Mouse Guide

> Handle clicks, hover, and scroll events

## Overview

TUI provides complete mouse support:

- **Click detection** - Left, middle, right buttons
- **Hover tracking** - Enter, leave, move events
- **Scroll events** - Wheel scrolling
- **Component targeting** - Know which component was clicked

## Prop-Based Handlers (Recommended)

The simplest way to handle mouse events is directly on primitives via props:

```typescript
import { box, text, signal } from '@rlabs-inc/tui'

const isHovered = signal(false)

box({
  border: BorderStyle.ROUNDED,
  bg: () => isHovered.value ? t.surface : null,
  onClick: (event) => {
    console.log(`Clicked at ${event.x}, ${event.y}`)
  },
  onMouseEnter: () => { isHovered.value = true },
  onMouseLeave: () => { isHovered.value = false },
  children: () => text({ content: 'Click me' })
})
```

All primitives (box, text, input) support these mouse props:

| Prop | Type | Description |
|------|------|-------------|
| `onClick` | `(event: MouseEvent) => boolean \| void` | Called when clicked. Return true to consume event |
| `onMouseDown` | `(event: MouseEvent) => boolean \| void` | Called when mouse button is pressed |
| `onMouseUp` | `(event: MouseEvent) => boolean \| void` | Called when mouse button is released |
| `onMouseEnter` | `(event: MouseEvent) => void` | Called when mouse enters component bounds |
| `onMouseLeave` | `(event: MouseEvent) => void` | Called when mouse leaves component bounds |
| `onScroll` | `(event: MouseEvent) => boolean \| void` | Called on scroll wheel events |

### Click-to-Focus

Focusable components (boxes with `focusable: true`, inputs) automatically focus when clicked:

```typescript
box({
  focusable: true,           // Enables Tab navigation
  border: BorderStyle.SINGLE,
  onClick: () => {
    // This fires AFTER the box is focused
    console.log('Clicked and focused!')
  },
  onKey: (e) => {
    if (e.key === 'Enter') handleAction()
  },
  children: () => text({ content: 'Click or Tab to focus' })
})
```

### Event Consumption

Return `true` from a handler to consume the event (prevent propagation to parent handlers):

```typescript
box({
  onClick: (event) => {
    handleInnerClick()
    return true  // Parent onClick won't fire
  }
})
```

## Global Handlers

For app-wide mouse handling, use the global `mouse` API:

```typescript
import { mouse } from '@rlabs-inc/tui'

// Global click handler
mouse.onClick((event) => {
  console.log(`Clicked at ${event.x}, ${event.y}`)
})
```

## Enabling Mouse

Mouse tracking is enabled by default. To disable:

```typescript
mount(() => { /* ... */ }, {
  mode: 'fullscreen',
  mouse: false  // Disable mouse tracking
})
```

## API Overview

```typescript
import {
  mouse,
  mouseX, mouseY,
  isMouseDown,
  lastMouseEvent
} from '@rlabs-inc/tui'

// Reactive state
mouseX            // Signal<number> - Current X position
mouseY            // Signal<number> - Current Y position
isMouseDown       // Signal<boolean> - Any button pressed
lastMouseEvent    // Signal<MouseEvent | null> - Full event details

// Global handlers
mouse.onClick(handler)      // Click anywhere
mouse.onMouseDown(handler)  // Button press
mouse.onMouseUp(handler)    // Button release
mouse.onScroll(handler)     // Scroll wheel

// Per-component handlers
mouse.onComponent(index, handlers)
```

## Mouse Events

### MouseEvent Structure

```typescript
interface MouseEvent {
  action: 'down' | 'up' | 'move' | 'drag' | 'scroll'
  button: MouseButton      // LEFT (0), MIDDLE (1), RIGHT (2), NONE (3)
  x: number                // Terminal column (0-indexed)
  y: number                // Terminal row (0-indexed)
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  scroll?: {
    direction: 'up' | 'down' | 'left' | 'right'
    delta: number
  }
  componentIndex: number   // Component under cursor (-1 if none)
}
```

## Global Handlers

### Click Handler

```typescript
mouse.onClick((event) => {
  console.log(`Clicked component: ${event.componentIndex}`)
  console.log(`Button: ${event.button}`)
  console.log(`Position: ${event.x}, ${event.y}`)
})
```

### Mouse Down/Up

```typescript
mouse.onMouseDown((event) => {
  if (event.button === MouseButton.LEFT) {
    startDrag(event.x, event.y)
  }
})

mouse.onMouseUp((event) => {
  endDrag()
})
```

### Scroll

```typescript
mouse.onScroll((event) => {
  if (event.scroll?.direction === 'up') {
    scrollUp()
  } else if (event.scroll?.direction === 'down') {
    scrollDown()
  }
})
```

## Per-Component Handlers (Advanced)

> **Note**: For most use cases, [prop-based handlers](#prop-based-handlers-recommended) are simpler and recommended. Use per-component handlers only when you need to register handlers dynamically or from outside the component.

Register handlers for specific components. The component index must be allocated before creating the box, or retrieved after creation using `getIndex()`:

```typescript
import { mouse, allocateIndex, box, text, signal } from '@rlabs-inc/tui'

const isHovered = signal(false)
const isPressed = signal(false)

// Allocate index BEFORE creating the component
const buttonIndex = allocateIndex('my-button')

// Create the component with matching id
box({
  id: 'my-button',
  children: () => text({ content: 'Click me' })
})

// Register handlers AFTER the component exists
mouse.onComponent(buttonIndex, {
  onClick: (event) => {
    console.log('Button clicked!')
  },
  onMouseEnter: (event) => {
    // Mouse entered component area
    isHovered.value = true
  },
  onMouseLeave: (event) => {
    // Mouse left component area
    isHovered.value = false
  },
  onMouseDown: (event) => {
    isPressed.value = true
  },
  onMouseUp: (event) => {
    isPressed.value = false
  },
  onScroll: (event) => {
    // Scroll while over this component
  }
})
```

## HitGrid - Component Detection

TUI uses a HitGrid for O(1) coordinate-to-component lookup:

```typescript
import { hitGrid } from '@rlabs-inc/tui'

// Get component at coordinates
const componentIndex = hitGrid.get(x, y)

if (componentIndex >= 0) {
  console.log(`Component ${componentIndex} at ${x}, ${y}`)
}
```

## Reactive State

### Mouse Position

```typescript
import { mouseX, mouseY } from '@rlabs-inc/tui'

text({
  content: derived(() => `Mouse: ${mouseX.value}, ${mouseY.value}`)
})
```

### Mouse Button State

```typescript
import { isMouseDown } from '@rlabs-inc/tui'

text({
  content: derived(() => isMouseDown.value ? 'Dragging...' : 'Ready')
})
```

## Common Patterns

### Clickable Button

Using prop-based handlers (recommended):

```typescript
const isHovered = signal(false)
const isPressed = signal(false)

box({
  border: BorderStyle.ROUNDED,
  padding: 1,
  bg: () => {
    if (isPressed.value) return t.primary
    if (isHovered.value) return t.surface
    return null
  },
  onClick: () => handleClick(),
  onMouseEnter: () => { isHovered.value = true },
  onMouseLeave: () => {
    isHovered.value = false
    isPressed.value = false
  },
  onMouseDown: () => { isPressed.value = true },
  onMouseUp: () => { isPressed.value = false },
  children: () => text({ content: 'Click Me' })
})
```

### Hover Highlight in List

Using prop-based handlers (recommended):

```typescript
import { each, box, text, signal } from '@rlabs-inc/tui'

const hoveredKey = signal<string | null>(null)

each(
  () => items.value,
  (getItem, key) => {
    return box({
      bg: () => hoveredKey.value === key ? t.surface : null,
      onMouseEnter: () => { hoveredKey.value = key },
      onMouseLeave: () => {
        if (hoveredKey.value === key) hoveredKey.value = null
      },
      onClick: () => selectItem(key),
      children: () => text({ content: getItem })
    })
  },
  { key: item => item.id }
)
```

### Drag and Drop

```typescript
import { mouse, allocateIndex, signal, effect, lastMouseEvent } from '@rlabs-inc/tui'

const draggableIndex = allocateIndex('draggable')
const isDragging = signal(false)
const dragStart = signal({ x: 0, y: 0 })
const dragOffset = signal({ x: 0, y: 0 })

mouse.onMouseDown((event) => {
  if (event.componentIndex === draggableIndex) {
    isDragging.value = true
    dragStart.value = { x: event.x, y: event.y }
  }
})

// Track drag movement using the reactive lastMouseEvent signal
effect(() => {
  const event = lastMouseEvent.value
  if (isDragging.value && event && event.action === 'drag') {
    dragOffset.value = {
      x: event.x - dragStart.value.x,
      y: event.y - dragStart.value.y
    }
  }
})

mouse.onMouseUp(() => {
  if (isDragging.value) {
    isDragging.value = false
    // Apply final position
  }
})
```

### Right-Click Context Menu

```typescript
const contextMenu = signal<{ x: number; y: number } | null>(null)

mouse.onClick((event) => {
  if (event.button === MouseButton.RIGHT) {
    contextMenu.value = { x: event.x, y: event.y }
  } else if (contextMenu.value) {
    // Click elsewhere closes menu
    contextMenu.value = null
  }
})

show(
  () => contextMenu.value !== null,
  () => box({
    zIndex: 100,
    border: BorderStyle.SINGLE,
    // Position at click location
    marginLeft: derived(() => contextMenu.value?.x ?? 0),
    marginTop: derived(() => contextMenu.value?.y ?? 0),
    children: () => {
      text({ content: 'Copy' })
      text({ content: 'Paste' })
      text({ content: 'Delete' })
    }
  })
)
```

## Mouse Button Constants

```typescript
import { MouseButton } from '@rlabs-inc/tui'

MouseButton.LEFT    // 0
MouseButton.MIDDLE  // 1
MouseButton.RIGHT   // 2
MouseButton.NONE    // 3
```

## See Also

- [API Reference: mouse](../../api/state/mouse.md)
- [Focus Guide](./focus.md)
- [Scroll Guide](./scroll.md)
