# mouse

> Mouse input handling module

## Import

```typescript
import { mouse, hitGrid } from '@rlabs-inc/tui'
// Or individual functions
import {
  onClick, onMouseDown, onMouseUp, onScroll, onComponent
} from '@rlabs-inc/tui'
```

## API Reference

### mouse.onClick()

Subscribe to click events.

```typescript
mouse.onClick(handler: MouseHandler): Cleanup
```

```typescript
onClick((event) => {
  console.log(`Clicked at ${event.x}, ${event.y}`)
})
```

### mouse.onMouseDown()

Subscribe to mouse button press.

```typescript
mouse.onMouseDown(handler: MouseHandler): Cleanup
```

### mouse.onMouseUp()

Subscribe to mouse button release.

```typescript
mouse.onMouseUp(handler: MouseHandler): Cleanup
```

### mouse.onScroll()

Subscribe to scroll wheel events.

```typescript
mouse.onScroll(handler: MouseHandler): Cleanup
```

```typescript
onScroll((event) => {
  if (event.scroll) {
    console.log(`Scroll ${event.scroll.direction} at ${event.x}, ${event.y}`)
  }
})
```

### mouse.onComponent()

Register mouse handlers for a specific component.

```typescript
mouse.onComponent(
  componentIndex: number,
  handlers: MouseHandlers
): Cleanup
```

```typescript
const myIndex = allocateIndex()

onComponent(myIndex, {
  onClick: () => console.log('Clicked!'),
  onMouseDown: () => console.log('Mouse down'),
  onMouseUp: () => console.log('Mouse up'),
  onMouseEnter: () => console.log('Mouse entered'),
  onMouseLeave: () => console.log('Mouse left')
})
```

### mouse.enableTracking()

Enable mouse tracking (automatically called by mount).

```typescript
mouse.enableTracking(): void
```

### mouse.disableTracking()

Disable mouse tracking.

```typescript
mouse.disableTracking(): void
```

## HitGrid

The hit testing grid for mapping coordinates to components.

### hitGrid.get()

Get component index at coordinates.

```typescript
hitGrid.get(x: number, y: number): number
// Returns -1 if no component at position
```

### hitGrid.resize()

Resize the hit grid (called automatically on terminal resize).

```typescript
hitGrid.resize(width: number, height: number): void
```

### hitGrid.fillRect()

Register a component's hit area.

```typescript
hitGrid.fillRect(
  x: number,
  y: number,
  width: number,
  height: number,
  componentIndex: number
): void
```

## Types

### MouseEvent

```typescript
interface MouseEvent {
  action: MouseAction
  button: MouseButton | number
  x: number
  y: number
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  scroll?: ScrollInfo
  componentIndex: number
}
```

### MouseAction

```typescript
type MouseAction = 'down' | 'up' | 'move' | 'drag' | 'scroll'
```

### MouseButton

```typescript
enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  NONE = 3,
}
```

### ScrollInfo

```typescript
interface ScrollInfo {
  direction: 'up' | 'down' | 'left' | 'right'
  delta: number
}
```

### MouseHandlers

```typescript
interface MouseHandlers {
  onMouseDown?: (event: MouseEvent) => void | boolean
  onMouseUp?: (event: MouseEvent) => void | boolean
  onClick?: (event: MouseEvent) => void | boolean
  onMouseEnter?: (event: MouseEvent) => void
  onMouseLeave?: (event: MouseEvent) => void
  onScroll?: (event: MouseEvent) => void | boolean
}
```

### MouseHandler

```typescript
type MouseHandler = (event: MouseEvent) => boolean | void
// Return true to consume event
```

## State Signals

### mouseX / mouseY

Current mouse position.

```typescript
import { mouseX, mouseY } from '@rlabs-inc/tui'

effect(() => {
  console.log(`Mouse at ${mouseX.value}, ${mouseY.value}`)
})
```

### isMouseDown

Whether any mouse button is currently pressed.

```typescript
import { isMouseDown } from '@rlabs-inc/tui'

effect(() => {
  if (isMouseDown.value) {
    console.log('Mouse button is pressed')
  }
})
```

### lastMouseEvent

Last mouse event.

```typescript
import { lastMouseEvent } from '@rlabs-inc/tui'

effect(() => {
  const event = lastMouseEvent.value
  if (event) {
    console.log('Last mouse action:', event.action)
  }
})
```

## Examples

### Click Handler

```typescript
onClick((event) => {
  const componentIndex = hitGrid.get(event.x, event.y)
  if (componentIndex >= 0) {
    handleComponentClick(componentIndex)
  }
})
```

### Button Component

```typescript
function Button(label: string, onPress: () => void) {
  const buttonIndex = allocateIndex()
  const isHovered = signal(false)
  const isPressed = signal(false)

  onComponent(buttonIndex, {
    onClick: onPress,
    onMouseDown: () => { isPressed.value = true },
    onMouseUp: () => { isPressed.value = false },
    onMouseEnter: () => { isHovered.value = true },
    onMouseLeave: () => {
      isHovered.value = false
      isPressed.value = false
    }
  })

  return box({
    id: buttonIndex.toString(),
    border: BorderStyle.ROUNDED,
    bg: derived(() => {
      if (isPressed.value) return t.primary
      if (isHovered.value) return t.surface
      return null
    }),
    children: () => text({ content: label })
  })
}
```

### Drag and Drop

```typescript
const isDragging = signal(false)
const dragStart = signal({ x: 0, y: 0 })
const position = signal({ x: 10, y: 5 })

onMouseDown((event) => {
  const idx = hitGrid.get(event.x, event.y)
  if (idx === draggableIndex) {
    isDragging.value = true
    dragStart.value = { x: event.x, y: event.y }
  }
})

onMouseUp(() => {
  isDragging.value = false
})

// Track movement (would need mouse move handler)
effect(() => {
  if (isDragging.value) {
    const dx = mouseX.value - dragStart.value.x
    const dy = mouseY.value - dragStart.value.y
    position.value = {
      x: Math.max(0, position.value.x + dx),
      y: Math.max(0, position.value.y + dy)
    }
    dragStart.value = { x: mouseX.value, y: mouseY.value }
  }
})
```

### Scroll Handling

```typescript
onScroll((event) => {
  if (event.componentIndex >= 0 && scroll.isScrollable(event.componentIndex) && event.scroll) {
    if (event.scroll.direction === 'up') {
      scroll.scrollBy(event.componentIndex, 0, -3)
    } else if (event.scroll.direction === 'down') {
      scroll.scrollBy(event.componentIndex, 0, 3)
    }
  }
})
```

### Context Menu

```typescript
const contextMenu = signal<{ x: number, y: number } | null>(null)

onClick((event) => {
  if (event.button === MouseButton.RIGHT) {
    contextMenu.value = { x: event.x, y: event.y }
    return true
  }

  // Close menu on any other click
  if (contextMenu.value) {
    contextMenu.value = null
  }
})
```

## Notes

### Append Mode

Mouse is typically disabled in append mode to allow native terminal scroll:

```typescript
mount(App, { mode: 'append', mouse: false })
```

### Hit Testing

The HitGrid is automatically updated by the render pipeline. Components with higher z-index take precedence in hit testing.

## See Also

- [Mouse Guide](../../guides/state/mouse.md)
- [keyboard](./keyboard.md)
- [scroll](./scroll.md)
