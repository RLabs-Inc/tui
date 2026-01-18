# Lists & Selection Guide

> Interactive lists with each()

## Overview

Building interactive lists with selection is a common pattern. This guide covers:

- Rendering lists with `each()`
- Tracking selection state
- Keyboard navigation
- Visual feedback

## Basic Selectable List

Use a focusable box with `onKey` for self-contained keyboard navigation:

```typescript
import { signal, derived, box, text, each, t } from '@rlabs-inc/tui'

const items = signal(['Apple', 'Banana', 'Cherry', 'Date'])
const selectedIndex = signal(0)

box({
  focusable: true,
  tabIndex: 1,
  onKey: (event) => {
    if (event.key === 'ArrowUp' || event.key === 'k') {
      if (selectedIndex.value > 0) selectedIndex.value--
      return true
    }
    if (event.key === 'ArrowDown' || event.key === 'j') {
      if (selectedIndex.value < items.value.length - 1) selectedIndex.value++
      return true
    }
  },
  children: () => {
    each(
      () => items.value,
      (getItem, key) => {
        const index = parseInt(key)
        const isSelected = derived(() => selectedIndex.value === index)

        return box({
          bg: derived(() => isSelected.value ? t.surface.value : null),
          paddingLeft: 1,
          children: () => {
            text({
              content: derived(() => isSelected.value ? '> ' : '  '),
              fg: t.primary
            })
            text({ content: getItem })
          }
        })
      },
      { key: (_, i) => String(i) }
    )
  }
})
```

## Using Stable Keys

For object lists, use a stable identifier as key:

```typescript
import { signal, derived, box, text, each, t } from '@rlabs-inc/tui'

interface Task {
  id: string
  text: string
  done: boolean
}

const tasks = signal<Task[]>([
  { id: '1', text: 'Learn TUI', done: false },
  { id: '2', text: 'Build app', done: false },
])

const selectedId = signal<string | null>('1')

box({
  focusable: true,
  tabIndex: 1,
  onKey: (event) => {
    // Enter toggles done state for selected item
    if (event.key === 'Enter') {
      const id = selectedId.value
      if (id) {
        tasks.value = tasks.value.map(t =>
          t.id === id ? { ...t, done: !t.done } : t
        )
      }
      return true
    }
  },
  children: () => {
    each(
      () => tasks.value,
      (getTask, key) => {
        // key is the task.id - stable across reorders!
        const isSelected = derived(() => selectedId.value === key)

        return box({
          bg: derived(() => isSelected.value ? t.surface.value : null),
          children: () => {
            text({
              content: derived(() => getTask().done ? '[x]' : '[ ]')
            })
            text({ content: derived(() => getTask().text) })
          }
        })
      },
      { key: task => task.id }  // Use stable ID
    )
  }
})
```

## Multi-Selection

```typescript
import { signal, derived, box, text, each, t } from '@rlabs-inc/tui'

interface Item { id: string, name: string }

const items = signal<Item[]>([
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Banana' },
  { id: '3', name: 'Cherry' },
])

const selectedIds = signal(new Set<string>())
const focusedIndex = signal(0)

function toggleSelection(id: string) {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selectedIds.value = newSet
}

box({
  focusable: true,
  tabIndex: 1,
  onKey: (event) => {
    // Space toggles selection on focused item
    if (event.key === ' ') {
      const item = items.value[focusedIndex.value]
      if (item) toggleSelection(item.id)
      return true
    }
    // Ctrl+A selects all
    if (event.key === 'a' && event.ctrlKey) {
      selectedIds.value = new Set(items.value.map(i => i.id))
      return true
    }
    // Arrow navigation
    if (event.key === 'ArrowDown' && focusedIndex.value < items.value.length - 1) {
      focusedIndex.value++
      return true
    }
    if (event.key === 'ArrowUp' && focusedIndex.value > 0) {
      focusedIndex.value--
      return true
    }
  },
  children: () => {
    each(
      () => items.value,
      (getItem, key) => {
        const isSelected = derived(() => selectedIds.value.has(key))

        return box({
          bg: derived(() => isSelected.value ? t.surface.value : null),
          children: () => {
            text({
              content: derived(() => isSelected.value ? '[x]' : '[ ]')
            })
            text({ content: () => getItem().name })
          }
        })
      },
      { key: item => item.id }
    )
  }
})
```

## Scrollable List

```typescript
import { signal, derived, effect, box, text, each, t } from '@rlabs-inc/tui'

const items = signal([...Array(100)].map((_, i) => `Item ${i + 1}`))
const selectedIndex = signal(0)

box({
  height: 10,
  overflow: 'scroll',
  focusable: true,
  children: () => {
    each(
      () => items.value,
      (getItem, key) => {
        const index = parseInt(key)
        const isSelected = derived(() => selectedIndex.value === index)

        return text({
          content: derived(() => `${isSelected.value ? '>' : ' '} ${getItem()}`),
          bg: derived(() => isSelected.value ? t.surface.value : null)
        })
      },
      { key: (_, i) => String(i) }
    )
  }
})

// Keep selection in view
effect(() => {
  const selected = selectedIndex.value
  // scroll.scrollIntoView(...)
})
```

## Filtered List

```typescript
import { signal, derived, effect, box, text, each, show, t } from '@rlabs-inc/tui'

const allItems = signal(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'])
const filter = signal('')
const selectedIndex = signal(0)

const filteredItems = derived(() =>
  allItems.value.filter(item =>
    item.toLowerCase().includes(filter.value.toLowerCase())
  )
)

// Reset selection when filtered items change
effect(() => {
  filteredItems.value  // Subscribe to filtered results
  selectedIndex.value = 0
})

box({
  children: () => {
    // Search input
    box({
      flexDirection: 'row',
      children: () => {
        text({ content: 'Search: ', fg: t.textDim })
        text({ content: filter })
      }
    })

    // Results
    each(
      () => filteredItems.value,
      (getItem, key) => {
        const index = parseInt(key)
        const isSelected = derived(() => selectedIndex.value === index)

        return text({
          content: getItem,
          bg: derived(() => isSelected.value ? t.surface.value : null)
        })
      },
      { key: (_, i) => String(i) }
    )

    // Empty state
    show(
      () => filteredItems.value.length === 0,
      () => text({ content: 'No matches', fg: t.textDim })
    )
  }
})
```

## Grouped List

```typescript
import { signal, derived, box, text, each, Attr, t } from '@rlabs-inc/tui'

interface GroupedItem {
  category: string
  items: string[]
}

const groups = signal<GroupedItem[]>([
  { category: 'Fruits', items: ['Apple', 'Banana'] },
  { category: 'Vegetables', items: ['Carrot', 'Broccoli'] },
])

box({
  children: () => {
    each(
      () => groups.value,
      (getGroup, groupKey) => {
        return box({
          marginBottom: 1,
          children: () => {
            // Group header
            text({
              content: derived(() => getGroup().category),
              fg: t.primary,
              attrs: Attr.BOLD
            })

            // Group items
            each(
              () => getGroup().items,
              (getItem, itemKey) => text({
                content: derived(() => `  ${getItem()}`),
              }),
              { key: item => item }
            )
          }
        })
      },
      { key: group => group.category }
    )
  }
})
```

## List with Actions

```typescript
import { signal, derived, box, text, each, t } from '@rlabs-inc/tui'

const items = signal([{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }])

// each() must be inside a parent box's children callback
box({
  children: () => {
    each(
      () => items.value,
      (getItem, key) => {
        return box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: derived(() => getItem().name) })

            // Action buttons
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({
                  content: '[Edit]',
                  fg: t.primary
                })
                text({
                  content: '[Delete]',
                  fg: t.error
                })
              }
            })
          }
        })
      },
      { key: item => item.id }
    )
  }
})
```

## Virtual List (Large Data)

For very large lists, render only visible items:

```typescript
import { signal, derived, box, text, each } from '@rlabs-inc/tui'

const allItems = signal([...Array(10000)].map((_, i) => `Item ${i}`))
const scrollOffset = signal(0)
const viewportHeight = 20

const visibleItems = derived(() => {
  const start = scrollOffset.value
  const end = start + viewportHeight
  return allItems.value.slice(start, end).map((item, i) => ({
    item,
    index: start + i
  }))
})

box({
  focusable: true,
  tabIndex: 1,
  height: viewportHeight,
  onKey: (event) => {
    if (event.key === 'ArrowDown') {
      scrollOffset.value = Math.min(
        scrollOffset.value + 1,
        allItems.value.length - viewportHeight
      )
      return true
    }
    if (event.key === 'ArrowUp') {
      scrollOffset.value = Math.max(scrollOffset.value - 1, 0)
      return true
    }
  },
  children: () => {
    each(
      () => visibleItems.value,
      (getVisible, key) => text({
        content: derived(() => getVisible().item)
      }),
      { key: v => String(v.index) }
    )
  }
})
```

## See Also

- [Template Primitives](../primitives/template-primitives.md)
- [Keyboard Guide](../state/keyboard.md)
- [Scroll Guide](../state/scroll.md)
