# Mouse Guide

> Handle clicks, hover, and scroll events

## Overview

TUI provides complete mouse support:

- **Click detection** - Left, middle, right buttons
- **Hover tracking** - Enter, leave, move events
- **Scroll events** - Wheel scrolling
- **Component targeting** - Know which component was clicked

## Basic Usage

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

## Per-Component Handlers

Register handlers for specific components:

```typescript
import { mouse, allocateIndex } from '@rlabs-inc/tui'

const buttonIndex = allocateIndex('my-button')

mouse.onComponent(buttonIndex, {
  onClick: (event) => {
    console.log('Button clicked!')
  },
  onMouseEnter: (event) => {
    // Mouse entered component area
    setHovered(true)
  },
  onMouseLeave: (event) => {
    // Mouse left component area
    setHovered(false)
  },
  onMouseDown: (event) => {
    setPressed(true)
  },
  onMouseUp: (event) => {
    setPressed(false)
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

```typescript
const isHovered = signal(false)
const isPressed = signal(false)

box({
  id: 'button',
  border: BorderStyle.ROUNDED,
  padding: 1,
  bg: derived(() => {
    if (isPressed.value) return t.primary.value
    if (isHovered.value) return t.surface.value
    return null
  }),
  children: () => {
    text({ content: 'Click Me' })
  }
})

// After mount, register handlers
const index = getIndex('button')

mouse.onComponent(index, {
  onClick: () => {
    handleClick()
  },
  onMouseEnter: () => {
    isHovered.value = true
  },
  onMouseLeave: () => {
    isHovered.value = false
    isPressed.value = false
  },
  onMouseDown: () => {
    isPressed.value = true
  },
  onMouseUp: () => {
    isPressed.value = false
  }
})
```

### Hover Highlight in List

```typescript
const hoveredIndex = signal(-1)

each(
  () => items.value,
  (getItem, key) => {
    const index = allocateIndex(`item-${key}`)

    mouse.onComponent(index, {
      onMouseEnter: () => {
        hoveredIndex.value = index
      },
      onMouseLeave: () => {
        if (hoveredIndex.value === index) {
          hoveredIndex.value = -1
        }
      },
      onClick: () => {
        selectItem(key)
      }
    })

    return box({
      id: `item-${key}`,
      bg: derived(() => hoveredIndex.value === index ? t.surface.value : null),
      children: () => {
        text({ content: getItem })
      }
    })
  },
  { key: item => item.id }
)
```

### Drag and Drop

```typescript
const isDragging = signal(false)
const dragStart = signal({ x: 0, y: 0 })
const dragOffset = signal({ x: 0, y: 0 })

mouse.onMouseDown((event) => {
  if (event.componentIndex === draggableIndex) {
    isDragging.value = true
    dragStart.value = { x: event.x, y: event.y }
  }
})

mouse.on((event) => {
  if (isDragging.value && event.action === 'drag') {
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
