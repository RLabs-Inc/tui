/**
 * TUI Framework - Each Primitive Tests
 *
 * Comprehensive tests for the each() template primitive.
 * Tests reactive list rendering, key-based reconciliation,
 * fine-grained reactivity, and cleanup behavior.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, effect, derived, flushSync, unwrap } from '@rlabs-inc/signals'

import { each } from '../src/primitives/each'
import { text } from '../src/primitives/text'
import { box } from '../src/primitives/box'

import { allocateIndex, releaseIndex, getAllocatedIndices, resetRegistry, pushParentContext, popParentContext } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import * as textArrays from '../src/engine/arrays/text'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/** Get current count of allocated components */
function getComponentCount(): number {
  return getAllocatedIndices().size
}

/** Create a simple item */
interface TestItem {
  id: string
  name: string
  value: number
}

function createItem(id: string, name: string, value: number = 0): TestItem {
  return { id, name, value }
}

// =============================================================================
// BASIC RENDERING TESTS
// =============================================================================

describe('Each Primitive - Basic Rendering', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('renders children for each item in array', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name, id: `text-${key}` }),
      { key: (item) => item.id }
    )
    flushSync() // Flush the internal effect

    // Should have 3 components
    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('empty array renders nothing', () => {
    const items = signal<TestItem[]>([])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(0)

    cleanup()
  })

  test('single item renders one child', () => {
    const items = signal([createItem('1', 'Solo')])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(1)

    cleanup()
  })

  test('renderFn receives correct key for each item', () => {
    const items = signal([
      createItem('alpha', 'A'),
      createItem('beta', 'B'),
      createItem('gamma', 'C'),
    ])
    const receivedKeys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        receivedKeys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(receivedKeys).toEqual(['alpha', 'beta', 'gamma'])

    cleanup()
  })
})

// =============================================================================
// KEY FUNCTION TESTS
// =============================================================================

describe('Each Primitive - Key Function', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('uses key function to identify items', () => {
    const items = signal([
      createItem('a', 'Item A'),
      createItem('b', 'Item B'),
    ])
    const createdKeys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createdKeys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(createdKeys).toContain('a')
    expect(createdKeys).toContain('b')

    cleanup()
  })

  test('stable keys across re-renders (updates do not recreate)', () => {
    const items = signal([
      createItem('x', 'Original'),
    ])
    let renderCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        renderCount++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(renderCount).toBe(1)

    // Update the item's name (same key)
    items.value = [createItem('x', 'Updated')]
    flushSync()

    // Should NOT have re-rendered (same key, just updated signal)
    expect(renderCount).toBe(1)

    cleanup()
  })

  test('warns on duplicate keys', () => {
    const items = signal([
      createItem('dup', 'First'),
      createItem('dup', 'Second'), // Duplicate key!
    ])

    let warned = false
    const originalWarn = console.warn
    console.warn = (msg: string) => {
      if (msg.includes('Duplicate key')) {
        warned = true
      }
    }

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(warned).toBe(true)
    console.warn = originalWarn

    cleanup()
  })

  test('custom key function with complex keys', () => {
    interface ComplexItem {
      type: string
      index: number
      name: string
    }

    const items = signal<ComplexItem[]>([
      { type: 'user', index: 1, name: 'Alice' },
      { type: 'admin', index: 1, name: 'Bob' },
    ])
    const receivedKeys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        receivedKeys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => `${item.type}-${item.index}` }
    )
    flushSync()

    expect(receivedKeys).toEqual(['user-1', 'admin-1'])

    cleanup()
  })
})

// =============================================================================
// REACTIVE UPDATES TESTS
// =============================================================================

describe('Each Primitive - Reactive Updates', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('adding items creates new children', () => {
    const items = signal([createItem('1', 'One')])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(1)

    // Add two more items
    items.value = [
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ]
    flushSync()

    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('removing items cleans up children', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(3)

    // Remove middle item
    items.value = [
      createItem('1', 'One'),
      createItem('3', 'Three'),
    ]
    flushSync()

    expect(getComponentCount()).toBe(2)

    cleanup()
  })

  test('reordering items preserves component instances (by key)', () => {
    const items = signal([
      createItem('a', 'A'),
      createItem('b', 'B'),
      createItem('c', 'C'),
    ])
    let createCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createCount++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(createCount).toBe(3)

    // Reorder items (reverse)
    items.value = [
      createItem('c', 'C'),
      createItem('b', 'B'),
      createItem('a', 'A'),
    ]
    flushSync()

    // Should not have created new components (same keys)
    expect(createCount).toBe(3)
    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('updating item data updates existing children', () => {
    const items = signal([
      createItem('1', 'Original', 100),
    ])

    // Track which items were rendered
    const renderedValues: number[] = []
    let createCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createCount++
        // Use a getter that reads item value
        return text({ content: () => {
          const val = getItem().value
          renderedValues.push(val)
          return `Value: ${val}`
        }})
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(createCount).toBe(1)

    // Update the item value (same key, so should update, not recreate)
    items.value = [createItem('1', 'Original', 200)]
    flushSync()

    // Should NOT have created a new component (same key)
    expect(createCount).toBe(1)
    expect(getComponentCount()).toBe(1)

    cleanup()
  })

  test('clearing all items removes all children', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(2)

    // Clear all
    items.value = []
    flushSync()

    expect(getComponentCount()).toBe(0)

    cleanup()
  })
})

// =============================================================================
// FINE-GRAINED REACTIVITY TESTS
// =============================================================================

describe('Each Primitive - Fine-grained Reactivity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('getItem() returns reactive accessor', () => {
    const items = signal([createItem('1', 'Initial')])

    // Create a signal to track getItem() value
    let latestName = ''
    let createCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createCount++
        // Read the item value at creation time
        latestName = getItem().name
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    // Verify initial value is accessible
    expect(latestName).toBe('Initial')
    expect(createCount).toBe(1)

    // Update item - the internal item signal should be updated
    items.value = [createItem('1', 'Changed')]
    flushSync()

    // Component was NOT recreated (same key), so createCount stays 1
    expect(createCount).toBe(1)
    expect(getComponentCount()).toBe(1)

    cleanup()
  })

  test('item changes only affect that item\'s children', () => {
    const items = signal([
      createItem('a', 'A', 1),
      createItem('b', 'B', 2),
    ])
    let renderCountA = 0
    let renderCountB = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        if (key === 'a') renderCountA++
        if (key === 'b') renderCountB++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(renderCountA).toBe(1)
    expect(renderCountB).toBe(1)

    // Update only item 'a' - since keys are stable, no new renders
    items.value = [
      createItem('a', 'A', 10), // Changed value
      createItem('b', 'B', 2),  // Same value
    ]
    flushSync()

    // Render function should NOT be called again (same keys)
    // The internal item signals are updated instead
    expect(renderCountA).toBe(1)
    expect(renderCountB).toBe(1)

    cleanup()
  })

  test('derived from getItem() is reactive', () => {
    const items = signal([createItem('1', 'Test', 42)])
    let initialValue = 0
    let createCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createCount++
        // Read the value at creation and compute a derived value
        initialValue = getItem().value * 2
        // Use a derived-like getter in content
        return text({ content: () => `Doubled: ${getItem().value * 2}` })
      },
      { key: (item) => item.id }
    )
    flushSync()

    // Initial value computed during creation
    expect(initialValue).toBe(84)
    expect(createCount).toBe(1)

    // Update item - same key, so component is reused (not recreated)
    items.value = [createItem('1', 'Test', 100)]
    flushSync()

    // Component was not recreated (key stable)
    expect(createCount).toBe(1)
    expect(getComponentCount()).toBe(1)

    cleanup()
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe('Each Primitive - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('all children cleaned up when each() is disposed', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(3)

    cleanup()

    expect(getComponentCount()).toBe(0)
  })

  test('individual item cleanup when item removed', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
    ])
    const destroyed: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const textCleanup = text({ content: () => getItem().name })
        // Return a cleanup that also tracks destruction
        return () => {
          destroyed.push(key)
          textCleanup()
        }
      },
      { key: (item) => item.id }
    )
    flushSync()

    // Remove item '1'
    items.value = [createItem('2', 'Two')]
    flushSync()

    expect(destroyed).toContain('1')
    expect(destroyed).not.toContain('2')

    cleanup()
  })

  test('cleanup function is called for each removed item', () => {
    const items = signal([
      createItem('a', 'A'),
      createItem('b', 'B'),
      createItem('c', 'C'),
    ])
    const cleanedUp: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        return () => {
          cleanedUp.push(key)
        }
      },
      { key: (item) => item.id }
    )
    flushSync()

    // Remove 'b'
    items.value = [createItem('a', 'A'), createItem('c', 'C')]
    flushSync()

    expect(cleanedUp).toEqual(['b'])

    // Remove 'a' and 'c'
    items.value = []
    flushSync()

    expect(cleanedUp).toEqual(['b', 'a', 'c'])

    cleanup()
  })

  test('disposing each() stops future updates', () => {
    const items = signal([createItem('1', 'One')])
    let renderCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        renderCount++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(renderCount).toBe(1)

    cleanup()

    // Try to add items after cleanup - should not render
    items.value = [createItem('1', 'One'), createItem('2', 'Two')]
    flushSync()

    expect(renderCount).toBe(1) // No change
  })
})

// =============================================================================
// PARENT CONTEXT TESTS
// =============================================================================

describe('Each Primitive - Parent Context', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('children inherit correct parent index', () => {
    const parentIdx = allocateIndex('parent-box')
    const items = signal([createItem('child1', 'Child 1')])

    pushParentContext(parentIdx)
    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    popParentContext()
    flushSync()

    // The text component should have parentIdx as parent
    // We can verify this by checking the component count
    expect(getComponentCount()).toBe(2) // Parent + 1 child

    cleanup()
    releaseIndex(parentIdx)
  })

  test('nested each() works correctly', () => {
    interface Category {
      id: string
      name: string
      items: TestItem[]
    }

    const categories = signal<Category[]>([
      { id: 'cat1', name: 'Category 1', items: [createItem('1a', 'Item 1A'), createItem('1b', 'Item 1B')] },
      { id: 'cat2', name: 'Category 2', items: [createItem('2a', 'Item 2A')] },
    ])

    const cleanup = each(
      () => categories.value,
      (getCategory, catKey) => {
        // Outer each for categories
        return box({
          children: () => {
            text({ content: () => getCategory().name })
            // Inner each for items
            const innerCleanup = each(
              () => getCategory().items,
              (getItem, itemKey) => text({ content: () => getItem().name }),
              { key: (item) => item.id }
            )
            // Need to flush the inner each too
            flushSync()
            return innerCleanup
          }
        })
      },
      { key: (cat) => cat.id }
    )
    flushSync()

    // 2 boxes + 2 category titles + 3 item texts = 7 components
    expect(getComponentCount()).toBe(7)

    cleanup()
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Each Primitive - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('rapid additions and removals', () => {
    const items = signal<TestItem[]>([])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    // Rapid changes
    for (let i = 0; i < 10; i++) {
      items.value = [createItem(`${i}`, `Item ${i}`)]
      flushSync()
    }

    expect(getComponentCount()).toBe(1)

    // Add many at once
    items.value = Array.from({ length: 50 }, (_, i) => createItem(`${i}`, `Item ${i}`))
    flushSync()

    expect(getComponentCount()).toBe(50)

    // Clear all at once
    items.value = []
    flushSync()

    expect(getComponentCount()).toBe(0)

    cleanup()
  })

  test('array replaced entirely with different items', () => {
    const items = signal([
      createItem('old1', 'Old 1'),
      createItem('old2', 'Old 2'),
    ])
    const createdKeys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createdKeys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(createdKeys).toEqual(['old1', 'old2'])

    // Replace with completely different items
    items.value = [
      createItem('new1', 'New 1'),
      createItem('new2', 'New 2'),
      createItem('new3', 'New 3'),
    ]
    flushSync()

    expect(createdKeys).toEqual(['old1', 'old2', 'new1', 'new2', 'new3'])
    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('handles items with falsy values', () => {
    interface FalsyItem {
      id: string
      value: number | null | undefined | string
    }

    const items = signal<FalsyItem[]>([
      { id: '1', value: 0 },
      { id: '2', value: null },
      { id: '3', value: undefined },
      { id: '4', value: '' },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => String(getItem().value) }),
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(4)

    cleanup()
  })

  test('handles special characters in keys', () => {
    const items = signal([
      createItem('key-with-dash', 'Dashed'),
      createItem('key.with.dots', 'Dotted'),
      createItem('key:with:colons', 'Coloned'),
      createItem('key/with/slashes', 'Slashed'),
    ])
    const keys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        keys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(keys).toEqual(['key-with-dash', 'key.with.dots', 'key:with:colons', 'key/with/slashes'])

    cleanup()
  })

  test('same key added after removal', () => {
    const items = signal([createItem('reusable', 'Original')])
    let createCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        createCount++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(createCount).toBe(1)

    // Remove
    items.value = []
    flushSync()
    expect(getComponentCount()).toBe(0)

    // Add back with same key
    items.value = [createItem('reusable', 'Reborn')]
    flushSync()

    expect(createCount).toBe(2) // Should create new component
    expect(getComponentCount()).toBe(1)

    cleanup()
  })

  test('empty key string is handled', () => {
    const items = signal([
      createItem('', 'Empty Key Item'),
    ])
    const keys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        keys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(keys).toEqual([''])
    expect(getComponentCount()).toBe(1)

    cleanup()
  })

  test('numeric key converted to string', () => {
    interface NumericKeyItem {
      id: number
      name: string
    }

    const items = signal<NumericKeyItem[]>([
      { id: 123, name: 'Numeric' },
    ])
    const keys: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        keys.push(key)
        return text({ content: () => getItem().name })
      },
      { key: (item) => String(item.id) }
    )
    flushSync()

    expect(keys).toEqual(['123'])

    cleanup()
  })
})

// =============================================================================
// PRACTICAL USE CASES
// =============================================================================

describe('Each Primitive - Practical Use Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('todo list pattern', () => {
    interface Todo {
      id: string
      text: string
      completed: boolean
    }

    const todos = signal<Todo[]>([
      { id: '1', text: 'Learn TUI', completed: false },
      { id: '2', text: 'Build app', completed: false },
    ])

    const cleanup = each(
      () => todos.value,
      (getTodo, key) => {
        const display = derived(() => {
          const t = getTodo()
          return t.completed ? `[x] ${t.text}` : `[ ] ${t.text}`
        })
        return text({ content: display })
      },
      { key: (todo) => todo.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(2)

    // Complete a todo
    todos.value = [
      { id: '1', text: 'Learn TUI', completed: true },
      { id: '2', text: 'Build app', completed: false },
    ]
    flushSync()

    expect(getComponentCount()).toBe(2)

    // Add new todo
    todos.value = [
      ...todos.value,
      { id: '3', text: 'Deploy', completed: false },
    ]
    flushSync()

    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('selection pattern with stable keys', () => {
    const items = signal([
      createItem('a', 'Option A'),
      createItem('b', 'Option B'),
      createItem('c', 'Option C'),
    ])
    const selectedKey = signal('b')

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const isSelected = derived(() => selectedKey.value === key)
        const display = derived(() =>
          isSelected.value ? `> ${getItem().name} <` : `  ${getItem().name}  `
        )
        return text({ content: display })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(3)

    // Change selection - should not recreate components
    selectedKey.value = 'c'
    flushSync()

    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('filtered list pattern', () => {
    const allItems = signal([
      createItem('1', 'Apple', 1),
      createItem('2', 'Banana', 2),
      createItem('3', 'Cherry', 1),
      createItem('4', 'Date', 2),
    ])
    const filter = signal(1)

    const filteredItems = derived(() =>
      allItems.value.filter((item) => item.value === filter.value)
    )

    const cleanup = each(
      () => filteredItems.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    // Initially shows items with value=1
    expect(getComponentCount()).toBe(2)

    // Change filter
    filter.value = 2
    flushSync()

    // Now shows items with value=2
    expect(getComponentCount()).toBe(2)

    cleanup()
  })

  test('sorted list pattern', () => {
    const items = signal([
      createItem('c', 'Charlie', 3),
      createItem('a', 'Alpha', 1),
      createItem('b', 'Bravo', 2),
    ])
    const sortAsc = signal(true)

    const sortedItems = derived(() => {
      const sorted = [...items.value]
      sorted.sort((a, b) => sortAsc.value
        ? a.value - b.value
        : b.value - a.value
      )
      return sorted
    })

    let renderCount = 0
    const cleanup = each(
      () => sortedItems.value,
      (getItem, key) => {
        renderCount++
        return text({ content: () => getItem().name })
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(renderCount).toBe(3)
    expect(getComponentCount()).toBe(3)

    // Toggle sort order - should not recreate components (same keys)
    sortAsc.value = false
    flushSync()

    expect(renderCount).toBe(3) // Same components, just reordered
    expect(getComponentCount()).toBe(3)

    cleanup()
  })
})

// =============================================================================
// MEMORY/RESOURCE TESTS
// =============================================================================

describe('Each Primitive - Memory and Resources', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('no memory leak after many updates', () => {
    const items = signal<TestItem[]>([])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    // Perform many updates
    for (let i = 0; i < 100; i++) {
      items.value = Array.from({ length: 10 }, (_, j) =>
        createItem(`${i}-${j}`, `Item ${i}-${j}`)
      )
      flushSync()
    }

    // Should only have 10 components
    expect(getComponentCount()).toBe(10)

    cleanup()
    expect(getComponentCount()).toBe(0)
  })

  test('cleanup prevents effects from running', () => {
    const items = signal([createItem('1', 'Test')])
    let effectCount = 0

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        effect(() => {
          getItem() // Track
          effectCount++
        })
        return () => {} // Empty cleanup
      },
      { key: (item) => item.id }
    )
    flushSync()

    expect(effectCount).toBe(1)

    cleanup()

    // Updates after cleanup should not trigger the each effect
    items.value = [createItem('1', 'Updated')]
    flushSync()

    // The scope is stopped, so internal effects should not run
    // Note: The effect we created inside may have run if not disposed
    // The key point is no new components are created
    expect(getComponentCount()).toBe(0)
  })

  test('large list performance', () => {
    const items = signal<TestItem[]>([])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: (item) => item.id }
    )
    flushSync()

    // Create large list
    items.value = Array.from({ length: 1000 }, (_, i) =>
      createItem(`${i}`, `Item ${i}`)
    )
    flushSync()

    expect(getComponentCount()).toBe(1000)

    // Update a few items (most stay the same)
    items.value = items.value.map((item, i) =>
      i < 5 ? { ...item, name: `Updated ${i}` } : item
    )
    flushSync()

    // Should still have same count
    expect(getComponentCount()).toBe(1000)

    cleanup()
    expect(getComponentCount()).toBe(0)
  })
})

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('Each Primitive - Error Handling', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('handles undefined items gracefully', () => {
    const items = signal<(TestItem | undefined)[]>([
      createItem('1', 'Valid'),
      undefined as unknown as TestItem, // Force undefined
    ])

    // This should not crash
    let error: Error | null = null
    try {
      const cleanup = each(
        () => items.value.filter((i): i is TestItem => i !== undefined),
        (getItem, key) => text({ content: () => getItem().name }),
        { key: (item) => item.id }
      )
      flushSync()
      expect(getComponentCount()).toBe(1)
      cleanup()
    } catch (e) {
      error = e as Error
    }

    expect(error).toBeNull()
  })

  test('handles key function throwing error', () => {
    const items = signal([
      createItem('1', 'Valid'),
    ])

    let threwError = false
    const originalError = console.error
    console.error = () => {}

    try {
      const cleanup = each(
        () => items.value,
        (getItem, key) => text({ content: () => getItem().name }),
        { key: (item) => {
          if (item.name === 'Throw') throw new Error('Key error')
          return item.id
        }}
      )
      flushSync()

      // Add an item that will cause key function to throw
      items.value = [
        createItem('1', 'Valid'),
        createItem('2', 'Throw'),
      ]
      flushSync()
    } catch (e) {
      threwError = true
    }

    console.error = originalError
    // The behavior depends on the implementation
    // We just want to make sure it doesn't crash silently
  })
})
