# Template Primitives Guide

> Dynamic rendering with `each`, `show`, and `when`

## Overview

Template primitives handle dynamic UI patterns:

- **`each()`** - Render lists reactively
- **`show()`** - Conditional rendering
- **`when()`** - Async/suspense patterns

These are functions, not components. They manage component lifecycles automatically.

## each() - Reactive Lists

Render a component for each item in an array. When items change, only the affected components update.

### Basic Usage

```typescript
import { signal, each, text } from '@rlabs-inc/tui'

const items = signal(['Apple', 'Banana', 'Cherry'])

each(
  () => items.value,           // Data source (getter)
  (getItem, key) => {          // Render function
    return text({
      content: getItem,        // getItem() returns current value
      id: `item-${key}`
    })
  },
  { key: item => item }        // Key function for identity
)
```

### Understanding each() Parameters

```typescript
each(
  itemsGetter,    // () => T[] - Returns the array
  renderFn,       // (getItem, key) => Cleanup - Creates components
  options         // { key: (item) => string } - Unique identifier
)
```

**`itemsGetter`**: A getter function that returns your array. TUI tracks this for changes.

**`renderFn`**: Called once per item. Receives:
- `getItem()` - A getter for the current item value (reactive!)
- `key` - The stable string key (use for selection state)

**`options.key`**: A function that returns a unique string for each item. Critical for:
- Efficient updates (reuse components instead of recreating)
- Stable identity (animations, focus, selection)

### Keys Are Stable

The `key` parameter in renderFn is **stable** - it doesn't change when items reorder:

```typescript
const selectedKey = signal<string | null>(null)

each(
  () => items.value,
  (getItem, key) => {
    return box({
      // key is stable - use it for selection!
      bg: derived(() => selectedKey.value === key ? t.surface : null),
      children: () => {
        text({ content: getItem })
      }
    })
  },
  { key: item => item.id }
)
```

### Fine-Grained Updates

When you update an item, only that item's component updates:

```typescript
interface Task {
  id: string
  text: string
  done: boolean
}

const tasks = signal<Task[]>([
  { id: '1', text: 'Learn TUI', done: false },
  { id: '2', text: 'Build app', done: false },
])

each(
  () => tasks.value,
  (getItem, key) => {
    return box({
      children: () => {
        // These deriveds only re-run when THIS task changes
        text({
          content: derived(() => getItem().done ? '[x]' : '[ ]'),
          fg: derived(() => getItem().done ? t.success : t.textDim)
        })
        text({
          content: derived(() => getItem().text)
        })
      }
    })
  },
  { key: task => task.id }
)

// Toggle one task - only its component updates
keyboard.onKey('Space', () => {
  tasks.value = tasks.value.map(t =>
    t.id === selectedKey.value
      ? { ...t, done: !t.done }
      : t
  )
})
```

### Adding and Removing Items

```typescript
// Add item - new component created
tasks.value = [...tasks.value, { id: '3', text: 'New task', done: false }]

// Remove item - component cleaned up automatically
tasks.value = tasks.value.filter(t => t.id !== '2')

// Reorder - components move, no recreation
tasks.value = [...tasks.value].reverse()
```

### Complex Objects

For objects, always use a stable identifier:

```typescript
interface User {
  id: string
  name: string
  email: string
}

const users = signal<User[]>([])

each(
  () => users.value,
  (getUser, key) => {
    return box({
      id: `user-${key}`,
      children: () => {
        // Access nested properties reactively
        text({ content: derived(() => getUser().name) })
        text({ content: derived(() => getUser().email), fg: t.textDim })
      }
    })
  },
  { key: user => user.id }  // Use the stable ID
)
```

## show() - Conditional Rendering

Render different content based on a condition.

### Basic Usage

```typescript
import { signal, show, text } from '@rlabs-inc/tui'

const isLoggedIn = signal(false)

show(
  () => isLoggedIn.value,                    // Condition
  () => text({ content: 'Welcome back!' }),  // True branch
  () => text({ content: 'Please log in' })   // False branch (optional)
)
```

### Without Else Branch

```typescript
show(
  () => showMessage.value,
  () => text({ content: 'Message!' })
  // No else - nothing rendered when false
)
```

### Complex Conditions

```typescript
const user = signal<User | null>(null)
const isLoading = signal(true)

show(
  () => isLoading.value,
  () => text({ content: 'Loading...' }),
  () => show(
    () => user.value !== null,
    () => text({ content: () => `Hello, ${user.value!.name}` }),
    () => text({ content: 'No user found' })
  )
)
```

### Component Cleanup

When the condition changes, the old branch is **cleaned up** (removed from layout, handlers unregistered):

```typescript
const showPanel = signal(true)

show(
  () => showPanel.value,
  () => {
    // This box is fully removed when showPanel becomes false
    // Any keyboard handlers inside are cleaned up
    return box({
      children: () => {
        text({ content: 'Panel content' })
      }
    })
  }
)
```

## when() - Async Rendering

Handle promises with loading, success, and error states.

### Basic Usage

```typescript
import { when, text } from '@rlabs-inc/tui'

when(
  () => fetchData(),                           // Promise getter
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => text({ content: data }),
    catch: (err) => text({ content: err.message })
  }
)
```

### With Signal-Triggered Fetches

```typescript
const userId = signal(1)

when(
  () => fetchUser(userId.value),  // Re-fetches when userId changes!
  {
    pending: () => text({ content: 'Loading user...' }),
    then: (user) => text({ content: () => user.name }),
    catch: () => text({ content: 'Failed to load user' })
  }
)
```

### Complex Data

```typescript
interface UserData {
  name: string
  posts: Post[]
}

when(
  () => fetchUserWithPosts(userId.value),
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => box({
      children: () => {
        text({ content: () => data.name, fg: t.primary })

        each(
          () => data.posts,
          (getPost, key) => text({
            content: derived(() => getPost().title)
          }),
          { key: post => post.id }
        )
      }
    }),
    catch: (error) => box({
      children: () => {
        text({ content: 'Error loading data', fg: t.error })
        text({ content: () => error.message, fg: t.textDim })
      }
    })
  }
)
```

### Race Condition Protection

`when()` handles race conditions automatically. If a new promise starts before the previous one resolves, the old result is ignored:

```typescript
const searchQuery = signal('')

when(
  () => search(searchQuery.value),  // User types fast...
  {
    pending: () => text({ content: 'Searching...' }),
    then: (results) => {
      // Only the latest search results are shown
      // Earlier requests that resolve later are ignored
    }
  }
)
```

## Combining Template Primitives

### Filtered List

```typescript
const filter = signal('')
const items = signal([...])

const filteredItems = derived(() =>
  items.value.filter(item =>
    item.name.toLowerCase().includes(filter.value.toLowerCase())
  )
)

box({
  children: () => {
    // Show count
    text({
      content: derived(() => `${filteredItems.value.length} items`)
    })

    // Render filtered list
    each(
      () => filteredItems.value,
      (getItem, key) => text({ content: derived(() => getItem().name) }),
      { key: item => item.id }
    )

    // Show empty state
    show(
      () => filteredItems.value.length === 0,
      () => text({ content: 'No items match filter', fg: t.textDim })
    )
  }
})
```

### Paginated Data

```typescript
const page = signal(1)

when(
  () => fetchPage(page.value),
  {
    pending: () => text({ content: 'Loading page...' }),
    then: (data) => box({
      children: () => {
        each(
          () => data.items,
          (getItem, key) => text({ content: getItem }),
          { key: item => item.id }
        )

        // Pagination controls
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            show(
              () => page.value > 1,
              () => text({ content: '< Previous' })
            )
            text({ content: () => `Page ${page.value}` })
            show(
              () => data.hasMore,
              () => text({ content: 'Next >' })
            )
          }
        })
      }
    })
  }
)
```

## Best Practices

### 1. Always Use Stable Keys

```typescript
// Bad - index changes on reorder
each(
  () => items.value,
  (getItem, key) => text({ content: getItem }),
  { key: (_, i) => String(i) }  // Index-based keys cause recreation on reorder
)

// Good - stable ID
each(
  () => items.value,
  (getItem, key) => text({ content: getItem }),
  { key: item => item.id }  // Stable keys enable efficient updates
)
```

### 2. Keep Render Functions Pure

```typescript
// Bad - side effect in render
each(
  () => items.value,
  (getItem, key) => {
    console.log('Rendering', key)  // Don't do this
    return text({ content: getItem })
  },
  { key: item => item.id }
)

// Good - pure render
each(
  () => items.value,
  (getItem, key) => {
    return text({ content: getItem })
  },
  { key: item => item.id }
)
```

### 3. Use Derived for Computed Values

```typescript
// Good - derived caches computation
each(
  () => items.value,
  (getItem, key) => {
    const displayName = derived(() => formatName(getItem()))
    return text({ content: displayName })
  },
  { key: item => item.id }
)
```

### 4. Handle Empty States

```typescript
box({
  children: () => {
    each(
      () => items.value,
      (getItem, key) => text({ content: getItem }),
      { key: item => item.id }
    )

    show(
      () => items.value.length === 0,
      () => text({ content: 'No items yet', fg: t.textDim })
    )
  }
})
```

## See Also

- [API Reference: each](../../api/primitives/each.md)
- [API Reference: show](../../api/primitives/show.md)
- [API Reference: when](../../api/primitives/when.md)
- [Lists & Selection Pattern](../patterns/lists-and-selection.md)
