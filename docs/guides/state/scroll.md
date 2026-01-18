# Scroll Guide

> Handle scrollable content areas and scroll events

## Overview

TUI provides scroll management for content that exceeds its container:

- **Automatic detection** - Layout engine identifies scrollable containers
- **Keyboard scrolling** - Arrow keys, Page Up/Down, Home/End
- **Mouse wheel** - Natural scroll wheel support
- **Programmatic control** - Scroll to position, scroll into view

## Basic Usage

```typescript
import { box, text } from '@rlabs-inc/tui'

box({
  height: 10,           // Fixed height
  overflow: 'scroll',   // Enable scrolling
  children: () => {
    // Content taller than 10 rows can be scrolled
    for (let i = 0; i < 50; i++) {
      text({ content: `Line ${i + 1}` })
    }
  }
})
```

## Overflow Modes

```typescript
box({
  overflow: 'visible',  // Content extends beyond container (default)
  overflow: 'hidden',   // Content clipped, no scrolling
  overflow: 'scroll',   // Always show scrollable area
  overflow: 'auto',     // Scroll only when content exceeds container
})
```

## Scroll API

```typescript
import { scroll } from '@rlabs-inc/tui'

// Check if component is scrollable
scroll.isScrollable(index)  // boolean

// Get current scroll position
scroll.getScrollOffset(index)  // { x: number, y: number }

// Get maximum scroll values
scroll.getMaxScroll(index)  // { x: number, y: number }

// Set scroll position
scroll.setScrollOffset(index, x, y)

// Scroll relative to current position
scroll.scrollBy(index, deltaX, deltaY)

// Jump to positions
scroll.scrollToTop(index)
scroll.scrollToBottom(index)
scroll.scrollToStart(index)
scroll.scrollToEnd(index)

// Ensure element is visible within a scrollable container
// Parameters: childIndex, scrollableContainerIndex, childY position, childHeight, viewportHeight
scroll.scrollIntoView(childIndex, scrollableIndex, childY, childHeight, viewportHeight)
```

## Built-in Keyboard Scrolling

When a scrollable component has focus, these keys work automatically:

| Key | Action |
|-----|--------|
| `ArrowUp` | Scroll up 1 line |
| `ArrowDown` | Scroll down 1 line |
| `ArrowLeft` | Scroll left 1 column |
| `ArrowRight` | Scroll right 1 column |
| `PageUp` | Scroll up ~90% of viewport |
| `PageDown` | Scroll down ~90% of viewport |
| `Home` | Scroll to top |
| `End` | Scroll to bottom |

## Mouse Wheel Scrolling

Mouse wheel events are automatically handled for scrollable components under the cursor.

```typescript
import { mouse, scroll } from '@rlabs-inc/tui'

// Custom scroll handling
mouse.onScroll((event) => {
  const scrollableIndex = findScrollableAt(event.x, event.y)

  if (scrollableIndex >= 0 && event.scroll) {
    const delta = event.scroll.direction === 'up' ? -3 : 3
    scroll.scrollBy(scrollableIndex, 0, delta)
  }
})
```

## Scroll Constants

```typescript
import { scroll } from '@rlabs-inc/tui'

scroll.LINE_SCROLL        // 1 - Arrow key scroll amount
scroll.WHEEL_SCROLL       // 3 - Mouse wheel scroll amount
scroll.PAGE_SCROLL_FACTOR // 0.9 - Page Up/Down as % of viewport
```

## Common Patterns

### Scrollable List with Selection

```typescript
import { box, text, each, signal, derived, scroll } from '@rlabs-inc/tui'

const items = signal([...])
const selectedIndex = signal(0)

box({
  id: 'list',
  height: 10,
  overflow: 'scroll',
  focusable: true,
  // Keyboard navigation using box.onKey (recommended)
  onKey: (event) => {
    if (event.key === 'ArrowUp' && selectedIndex.value > 0) {
      selectedIndex.value--
      return true
    }
    if (event.key === 'ArrowDown' && selectedIndex.value < items.value.length - 1) {
      selectedIndex.value++
      return true
    }
  },
  children: () => {
    each(
      () => items.value,
      (getItem, key) => {
        const itemIndex = parseInt(key)
        return box({
          bg: derived(() =>
            selectedIndex.value === itemIndex ? t.surface : null
          ),
          children: () => {
            text({ content: getItem })
          }
        })
      },
      { key: (_, i) => String(i) }
    )
  }
})
```

### Scroll Indicator

```typescript
import { allocateIndex, box, text, scroll, derived } from '@rlabs-inc/tui'

const scrollableIndex = allocateIndex('content')

box({
  flexDirection: 'row',
  children: () => {
    // Content
    box({
      id: 'content',
      grow: 1,
      height: 20,
      overflow: 'scroll',
      children: () => {
        // Lots of content...
      }
    })

    // Scroll bar indicator
    box({
      width: 1,
      height: 20,
      children: () => {
        const scrollPercent = derived(() => {
          const offset = scroll.getScrollOffset(scrollableIndex)
          const max = scroll.getMaxScroll(scrollableIndex)
          return max.y > 0 ? offset.y / max.y : 0
        })

        text({
          content: derived(() => {
            const pos = Math.floor(scrollPercent.value * 19)
            return '\n'.repeat(pos) + '█'
          }),
          fg: t.primary
        })
      }
    })
  }
})
```

### Scroll Chaining

When a scroll container can't scroll further, pass the scroll to its parent:

```typescript
import { scroll, parentIndex } from '@rlabs-inc/tui'

// Scroll with chaining - if at boundary, scroll parent
scroll.scrollByWithChaining(index, 0, deltaY, (idx) => parentIndex[idx])
```

### Infinite Scroll / Load More

```typescript
import { signal, effect, scroll } from '@rlabs-inc/tui'

const items = signal([...])
const isLoading = signal(false)

// Check if near bottom when scrolling
effect(() => {
  const offset = scroll.getScrollOffset(listIndex)
  const max = scroll.getMaxScroll(listIndex)

  // Near bottom (within 5 lines)
  if (max.y - offset.y < 5 && !isLoading.value) {
    loadMoreItems()
  }
})

async function loadMoreItems() {
  isLoading.value = true
  const newItems = await fetchMore()
  items.value = [...items.value, ...newItems]
  isLoading.value = false
}
```

### Synchronized Scrolling

Keep two containers in sync:

```typescript
import { allocateIndex, scroll, effect } from '@rlabs-inc/tui'

const leftIndex = allocateIndex('left')
const rightIndex = allocateIndex('right')

// Sync right to left
effect(() => {
  const leftOffset = scroll.getScrollOffset(leftIndex)
  scroll.setScrollOffset(rightIndex, leftOffset.x, leftOffset.y)
})
```

### Scroll to New Content

```typescript
import { signal, effect, scroll } from '@rlabs-inc/tui'

const messages = signal([...])

// When new message added, scroll to bottom
effect(() => {
  const count = messages.value.length
  // Only auto-scroll if already near bottom
  const offset = scroll.getScrollOffset(chatIndex)
  const max = scroll.getMaxScroll(chatIndex)

  if (max.y - offset.y < 5) {
    scroll.scrollToBottom(chatIndex)
  }
})
```

## Visibility During Scroll

Components outside the visible scroll area are still rendered but clipped. The layout engine handles visibility automatically.

## Performance

Scroll rendering is optimized:
- Only visible cells are drawn
- Layout is cached until content changes
- Scroll position changes trigger minimal re-renders

## See Also

- [API Reference: scroll](../../api/state/scroll.md)
- [Focus Guide](./focus.md)
- [Layout: Overflow](../layout/flexbox.md#overflow)
