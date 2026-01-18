# each()

> Reactive list rendering primitive

## Import

```typescript
import { each } from '@rlabs-inc/tui'
```

## Signature

```typescript
function each<T>(
  items: () => T[],
  render: (getItem: () => T, key: string) => Cleanup,
  options: { key: (item: T) => string }
): Cleanup
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `items` | `() => T[]` | Getter returning array of items |
| `render` | `(getItem: () => T, key: string) => Cleanup` | Render function for each item |
| `options` | `EachOptions<T>` | Key configuration (required) |

### EachOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `(item: T) => string` | required | Function to extract stable key |

### Render Function Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `getItem` | `() => T` | Getter for current item value |
| `key` | `string` | Stable key for this item |

## Returns

```typescript
type Cleanup = () => void
```

## Examples

### Basic List

```typescript
import { each, text, signal } from '@rlabs-inc/tui'

const items = signal(['Apple', 'Banana', 'Cherry'])

each(
  () => items.value,
  (getItem, key) => text({ content: getItem }),
  { key: item => item }
)
```

### Object List with Stable Keys

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
  (getTask, key) => {
    const task = getTask()
    return box({
      children: () => {
        text({ content: task.done ? '[x]' : '[ ]' })
        text({ content: task.text })
      }
    })
  },
  { key: task => task.id }  // Use stable ID
)
```

### With Selection

```typescript
const selectedId = signal<string | null>('1')

each(
  () => items.value,
  (getItem, key) => {
    const isSelected = derived(() => selectedId.value === key)
    const bgColor = derived(() => isSelected.value ? t.surface : null)
    const prefix = derived(() => isSelected.value ? '> ' : '  ')
    const itemName = derived(() => getItem().name)

    return box({
      bg: bgColor,  // Derived directly
      children: () => {
        text({ content: prefix })      // Derived directly
        text({ content: itemName })    // Derived directly
      }
    })
  },
  { key: item => item.id }
)

// Selection uses stable key
keyboard.onKey('Enter', () => {
  selectItem(selectedId.value)
})
```

### Reactive Item Properties

```typescript
each(
  () => todos.value,
  (getTodo, key) => {
    // Create deriveds for reactive updates - pass directly to props
    const todoText = derived(() => getTodo().text)
    const isDone = derived(() => getTodo().done)
    const checkbox = derived(() => isDone.value ? '[x]' : '[ ]')
    const checkColor = derived(() => isDone.value ? t.success : t.text)

    return box({
      children: () => {
        text({
          content: checkbox,   // Derived directly
          fg: checkColor       // Derived directly
        })
        text({ content: todoText })  // Derived directly
      }
    })
  },
  { key: todo => todo.id }
)
```

### Nested Lists

```typescript
interface Category {
  name: string
  items: string[]
}

const categories = signal<Category[]>([...])

each(
  () => categories.value,
  (getCategory, categoryKey) => {
    const categoryName = derived(() => getCategory().name)

    return box({
      children: () => {
        // Category header
        text({
          content: categoryName,  // Derived directly
          fg: t.primary,          // Theme accessor (already reactive)
          attrs: Attr.BOLD
        })

        // Category items (nested each)
        each(
          () => getCategory().items,
          (getItem, itemKey) => text({ content: getItem }),
          { key: item => item }
        )
      }
    })
  },
  { key: cat => cat.name }
)
```

### With Numbered Display

```typescript
each(
  () => items.value,
  (getItem, key) => {
    // Use item properties or derive index from data
    return text({
      content: () => `${getItem().order}. ${getItem().name}`
    })
  },
  { key: item => item.id }
)
```

### Adding/Removing Items

```typescript
const items = signal(['A', 'B', 'C'])

// Add item
function addItem(text: string) {
  items.value = [...items.value, text]
}

// Remove item
function removeItem(index: number) {
  items.value = items.value.filter((_, i) => i !== index)
}

// Reorder items
function moveUp(index: number) {
  if (index === 0) return
  const arr = [...items.value]
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  items.value = arr
}
```

## Key Selection

### Why Keys Matter

Keys enable efficient updates:
- **Without keys**: All items re-render on any change
- **With stable keys**: Only changed items update

### Key Strategies

```typescript
// Value-based for unique strings
{ key: item => item }

// ID-based (stable, recommended for objects)
{ key: item => item.id }

// Value-based (for unique primitives)
{ key: item => item }

// Composite key
{ key: item => `${item.type}-${item.id}` }
```

## Common Patterns

### Filtered List

```typescript
const filter = signal('')

const filteredItems = derived(() =>
  allItems.value.filter(item =>
    item.name.toLowerCase().includes(filter.value.toLowerCase())
  )
)

each(
  () => filteredItems.value,
  (getItem, key) => ItemComponent({ item: getItem }),
  { key: item => item.id }
)
```

### Sorted List

```typescript
const sortOrder = signal<'asc' | 'desc'>('asc')

const sortedItems = derived(() =>
  [...items.value].sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name)
  )
)

each(
  () => sortedItems.value,
  (getItem, key) => ItemComponent({ item: getItem }),
  { key: item => item.id }
)
```

### Virtual List

```typescript
const scrollOffset = signal(0)
const viewportHeight = 20

const visibleItems = derived(() => {
  const start = scrollOffset.value
  const end = start + viewportHeight
  return items.value.slice(start, end).map((item, i) => ({
    item,
    index: start + i
  }))
})

each(
  () => visibleItems.value,
  (getVisible, key) => {
    return text({ content: () => getVisible().item.name })
  },
  { key: v => String(v.index) }
)
```

## See Also

- [Lists & Selection Guide](../../guides/patterns/lists-and-selection.md)
- [Template Primitives Guide](../../guides/primitives/template-primitives.md)
- [show()](./show.md)
- [when()](./when.md)
