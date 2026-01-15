# scroll

> Scroll state and handling

## Import

```typescript
import { scroll } from '@rlabs-inc/tui'
// Or individual functions
import {
  isScrollable, getScrollOffset, setScrollOffset, scrollBy,
  scrollToTop, scrollToBottom, handleWheelScroll
} from '@rlabs-inc/tui'
```

## API Reference

### scroll.isScrollable()

Check if a component is scrollable.

```typescript
scroll.isScrollable(index: number): boolean
```

### scroll.getScrollOffset()

Get current scroll position.

```typescript
scroll.getScrollOffset(index: number): { x: number, y: number }
```

### scroll.getMaxScroll()

Get maximum scroll values.

```typescript
scroll.getMaxScroll(index: number): { x: number, y: number }
```

### scroll.setScrollOffset()

Set scroll position (clamped to valid range).

```typescript
scroll.setScrollOffset(index: number, x: number, y: number): void
```

### scroll.scrollBy()

Scroll by delta amount.

```typescript
scroll.scrollBy(
  index: number,
  deltaX: number,
  deltaY: number
): boolean  // Returns true if scrolled
```

### scroll.scrollToTop()

Scroll to top.

```typescript
scroll.scrollToTop(index: number): void
```

### scroll.scrollToBottom()

Scroll to bottom.

```typescript
scroll.scrollToBottom(index: number): void
```

### scroll.scrollToStart()

Scroll to start (horizontal).

```typescript
scroll.scrollToStart(index: number): void
```

### scroll.scrollToEnd()

Scroll to end (horizontal).

```typescript
scroll.scrollToEnd(index: number): void
```

### scroll.scrollIntoView()

Scroll to make a child visible.

```typescript
scroll.scrollIntoView(
  childIndex: number,
  scrollableIndex: number,
  childY: number,
  childHeight: number,
  viewportHeight: number
): void
```

## Handler Functions

### scroll.handleArrowScroll()

Handle arrow key scroll for focused scrollable.

```typescript
scroll.handleArrowScroll(
  direction: 'up' | 'down' | 'left' | 'right'
): boolean
```

### scroll.handlePageScroll()

Handle Page Up/Down.

```typescript
scroll.handlePageScroll(direction: 'up' | 'down'): boolean
```

### scroll.handleHomeEnd()

Handle Home/End keys.

```typescript
scroll.handleHomeEnd(key: 'home' | 'end'): boolean
```

### scroll.handleWheelScroll()

Handle mouse wheel scroll.

```typescript
scroll.handleWheelScroll(
  x: number,
  y: number,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean
```

## Finder Functions

### scroll.findScrollableAt()

Find scrollable component at coordinates.

```typescript
scroll.findScrollableAt(x: number, y: number): number
// Returns -1 if none found
```

### scroll.getFocusedScrollable()

Get the focused scrollable component.

```typescript
scroll.getFocusedScrollable(): number
// Returns -1 if none focused
```

## Constants

```typescript
scroll.LINE_SCROLL    // Lines per arrow key (1)
scroll.WHEEL_SCROLL   // Lines per wheel tick (3)
scroll.PAGE_SCROLL_FACTOR  // Page scroll factor (0.9)
```

## Examples

### Scrollable List

```typescript
function ScrollableList(items: string[]) {
  const listIndex = allocateIndex()

  return box({
    id: listIndex.toString(),
    height: 10,
    overflow: 'scroll',
    focusable: true,
    tabIndex: 1,
    children: () => {
      items.forEach(item => {
        text({ content: item })
      })
    }
  })
}
```

### Custom Scroll Handling

```typescript
const listIndex = allocateIndex()

keyboard.onFocused(listIndex, (event) => {
  if (event.key === 'ArrowUp') {
    scroll.scrollBy(listIndex, 0, -1)
    return true
  }
  if (event.key === 'ArrowDown') {
    scroll.scrollBy(listIndex, 0, 1)
    return true
  }
  if (event.key === 'PageUp') {
    scroll.scrollBy(listIndex, 0, -10)
    return true
  }
  if (event.key === 'PageDown') {
    scroll.scrollBy(listIndex, 0, 10)
    return true
  }
})
```

### Scroll Position Display

```typescript
function ScrollInfo(scrollableIndex: number) {
  return box({
    children: () => {
      const offset = scroll.getScrollOffset(scrollableIndex)
      const max = scroll.getMaxScroll(scrollableIndex)

      text({
        content: `Scroll: ${offset.y}/${max.y}`,
        fg: t.textMuted
      })
    }
  })
}
```

### Scroll to Selection

```typescript
const selectedIndex = signal(0)
const listIndex = allocateIndex()

effect(() => {
  const selected = selectedIndex.value
  const lineHeight = 1
  const viewportHeight = 10

  // Ensure selected item is visible
  const itemY = selected * lineHeight

  scroll.scrollIntoView(
    selected,
    listIndex,
    itemY,
    lineHeight,
    viewportHeight
  )
})
```

### Programmatic Scroll

```typescript
function ScrollControls(scrollableIndex: number) {
  keyboard.onKey('Home', () => {
    scroll.scrollToTop(scrollableIndex)
    return true
  })

  keyboard.onKey('End', () => {
    scroll.scrollToBottom(scrollableIndex)
    return true
  })

  return box({
    flexDirection: 'row',
    gap: 2,
    children: () => {
      text({ content: '[Home] Top' })
      text({ content: '[End] Bottom' })
    }
  })
}
```

### Virtual Scrolling

```typescript
const allItems = signal([...Array(10000)].map((_, i) => `Item ${i}`))
const scrollOffset = signal(0)
const viewportHeight = 20

const visibleItems = derived(() => {
  const start = scrollOffset.value
  return allItems.value.slice(start, start + viewportHeight)
})

box({
  height: viewportHeight,
  children: () => {
    each(
      () => visibleItems.value,
      (getItem, key) => text({ content: getItem }),
      { key: (_, i) => String(scrollOffset.value + i) }
    )
  }
})

keyboard.onKey('ArrowDown', () => {
  scrollOffset.value = Math.min(
    scrollOffset.value + 1,
    allItems.value.length - viewportHeight
  )
})

keyboard.onKey('ArrowUp', () => {
  scrollOffset.value = Math.max(scrollOffset.value - 1, 0)
})
```

## Scroll Chaining

Scroll with parent fallback:

```typescript
scroll.scrollByWithChaining(
  index: number,
  deltaX: number,
  deltaY: number,
  getParent?: (i: number) => number
): boolean
```

```typescript
// If component can't scroll further, try parent
const scrolled = scroll.scrollByWithChaining(
  childIndex,
  0,
  10,
  (i) => parentMap.get(i) ?? -1
)
```

## See Also

- [Scroll Guide](../../guides/state/scroll.md)
- [keyboard](./keyboard.md)
- [mouse](./mouse.md)
