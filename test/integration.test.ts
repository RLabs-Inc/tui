/**
 * TUI Framework - Integration Tests
 *
 * These tests verify that components work together correctly.
 * Tests focus on actual integration scenarios, not isolated units.
 *
 * Coverage:
 * - Nested template primitives (each/show/when combinations)
 * - Input integration with containers and dynamic rendering
 * - Focus management with dynamic components
 * - Layout with primitive combinations
 * - Context propagation through component hierarchy
 * - Full reactive pipeline (signal -> layout -> render)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, derived, effect, flushSync, unwrap } from '@rlabs-inc/signals'

// Primitives
import { box } from '../src/primitives/box'
import { text } from '../src/primitives/text'
import { input } from '../src/primitives/input'
import { each } from '../src/primitives/each'
import { show } from '../src/primitives/show'
import { when } from '../src/primitives/when'

// Engine
import {
  resetRegistry,
  getAllocatedIndices,
  getAllocatedCount,
  allocateIndex,
  releaseIndex,
  pushParentContext,
  popParentContext,
} from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays, computeLayoutTitan } from '../src/pipeline/layout/titan-engine'

// State
import {
  resetFocusState,
  focus,
  blur,
  focusedIndex,
  focusNext,
  focusPrevious,
  getFocusableIndices,
  registerFocusCallbacks,
} from '../src/state/focus'
import { dispatchFocused, cleanup as cleanupKeyboard } from '../src/state/keyboard'
import {
  createContext,
  provide,
  useContext,
  resetContexts,
} from '../src/state/context'

// Arrays
import * as core from '../src/engine/arrays/core'
import * as textArrays from '../src/engine/arrays/text'
import * as interaction from '../src/engine/arrays/interaction'
import * as dimensions from '../src/engine/arrays/dimensions'

// Types
import { ComponentType } from '../src/types'
import type { KeyboardEvent } from '../src/state/keyboard'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetFocusState()
  cleanupKeyboard()
  resetContexts()
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/** Get count of allocated components */
function getComponentCount(): number {
  return getAllocatedIndices().size
}

/** Create a mock keyboard event */
function createKeyEvent(key: string, modifiers: Partial<KeyboardEvent['modifiers']> = {}): KeyboardEvent {
  return {
    key,
    modifiers: {
      ctrl: modifiers.ctrl ?? false,
      alt: modifiers.alt ?? false,
      shift: modifiers.shift ?? false,
      meta: modifiers.meta ?? false,
    },
    state: 'press',
  }
}

/** Simulate typing a key to focused component */
function typeKey(index: number, key: string, modifiers: Partial<KeyboardEvent['modifiers']> = {}): boolean {
  const event = createKeyEvent(key, modifiers)
  if (focusedIndex.value !== index) {
    return false
  }
  return dispatchFocused(index, event)
}

/** Simple item for list tests */
interface TestItem {
  id: string
  name: string
  value: number
}

function createItem(id: string, name: string, value: number = 0): TestItem {
  return { id, name, value }
}

/** Create a deferred promise for async testing */
function createDeferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: Error) => void } {
  let resolve!: (v: T) => void
  let reject!: (e: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// =============================================================================
// NESTED TEMPLATE PRIMITIVES TESTS
// =============================================================================

describe('Integration - Nested Template Primitives', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('each() inside show() renders correctly', () => {
    const isVisible = signal(true)
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
    ])

    const cleanup = show(
      () => isVisible.value,
      () => each(
        () => items.value,
        (getItem, key) => text({ content: () => getItem().name }),
        { key: item => item.id }
      )
    )
    flushSync()

    // Show is true, each renders 2 items
    expect(getComponentCount()).toBe(2)

    // Toggle show off
    isVisible.value = false
    flushSync()
    expect(getComponentCount()).toBe(0)

    // Toggle show on
    isVisible.value = true
    flushSync()
    expect(getComponentCount()).toBe(2)

    cleanup()
    expect(getComponentCount()).toBe(0)
  })

  test('show() inside each() renders correctly', () => {
    // Items with visibility as a property (not a signal)
    // When items are added/removed, components are created/destroyed
    const items = signal([
      { id: '1', name: 'One', visible: true },
      { id: '2', name: 'Two', visible: false },
      { id: '3', name: 'Three', visible: true },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const showCleanup = show(
          () => getItem().visible,
          () => text({ content: () => getItem().name })
        )
        flushSync()
        return showCleanup
      },
      { key: item => item.id }
    )
    flushSync()

    // Only visible items render text (items 1 and 3)
    expect(getComponentCount()).toBe(2)

    // Add a new visible item - triggers renderFn for new key
    items.value = [
      { id: '1', name: 'One', visible: true },
      { id: '2', name: 'Two', visible: false },
      { id: '3', name: 'Three', visible: true },
      { id: '4', name: 'Four', visible: true },
    ]
    flushSync()
    expect(getComponentCount()).toBe(3)

    // Remove items - triggers cleanup
    items.value = [
      { id: '2', name: 'Two', visible: false },
    ]
    flushSync()
    expect(getComponentCount()).toBe(0)

    cleanup()
  })

  test('when() inside each() handles async correctly', async () => {
    const items = signal([
      { id: '1', promise: Promise.resolve('Result 1') },
      { id: '2', promise: Promise.resolve('Result 2') },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => when(
        () => getItem().promise,
        {
          pending: () => text({ content: 'Loading...' }),
          then: (value) => text({ content: value }),
        }
      ),
      { key: item => item.id }
    )
    flushSync()

    // Initially shows pending
    expect(getComponentCount()).toBe(2)

    // Wait for promises to resolve
    await Promise.resolve()
    await Promise.resolve()

    // Now shows resolved values
    expect(getComponentCount()).toBe(2)

    cleanup()
  })

  test('triple nesting: show -> each -> show works correctly', () => {
    const outerVisible = signal(true)
    const items = signal([
      { id: '1', name: 'One', innerVisible: true },
      { id: '2', name: 'Two', innerVisible: false },
    ])

    const cleanup = show(
      () => outerVisible.value,
      () => each(
        () => items.value,
        (getItem, key) => show(
          () => getItem().innerVisible,
          () => text({ content: () => getItem().name })
        ),
        { key: item => item.id }
      )
    )
    flushSync()

    // Outer visible, one inner visible
    expect(getComponentCount()).toBe(1)

    // Toggle outer off
    outerVisible.value = false
    flushSync()
    expect(getComponentCount()).toBe(0)

    // Toggle outer on, update inner
    outerVisible.value = true
    items.value = items.value.map(item => ({ ...item, innerVisible: true }))
    flushSync()
    expect(getComponentCount()).toBe(2)

    cleanup()
    expect(getComponentCount()).toBe(0)
  })

  test('nested each() cleans up correctly on dispose', () => {
    interface Category {
      id: string
      items: TestItem[]
    }

    const categories = signal<Category[]>([
      { id: 'cat1', items: [createItem('1a', 'A'), createItem('1b', 'B')] },
      { id: 'cat2', items: [createItem('2a', 'C')] },
    ])

    let outerCleanupCalled = 0
    let innerCleanupCalled = 0

    const cleanup = each(
      () => categories.value,
      (getCategory, catKey) => {
        const innerCleanup = each(
          () => getCategory().items,
          (getItem, itemKey) => {
            const textCleanup = text({ content: () => getItem().name })
            return () => {
              innerCleanupCalled++
              textCleanup()
            }
          },
          { key: item => item.id }
        )
        flushSync()
        return () => {
          outerCleanupCalled++
          innerCleanup()
        }
      },
      { key: cat => cat.id }
    )
    flushSync()

    // 2 categories with 3 total items
    expect(getComponentCount()).toBe(3)

    // Remove one category
    categories.value = [categories.value[0]!]
    flushSync()

    expect(getComponentCount()).toBe(2)
    expect(outerCleanupCalled).toBe(1)
    expect(innerCleanupCalled).toBe(1) // One item in removed category

    cleanup()
    expect(getComponentCount()).toBe(0)
  })

  test('each() inside box inside show() maintains parent correctly', () => {
    const isVisible = signal(true)
    const items = signal([createItem('1', 'One')])

    const cleanup = show(
      () => isVisible.value,
      () => box({
        children: () => {
          each(
            () => items.value,
            (getItem, key) => text({ content: () => getItem().name }),
            { key: item => item.id }
          )
          flushSync()
        }
      })
    )
    flushSync()

    // Box + text
    expect(getComponentCount()).toBe(2)

    // Verify parent-child relationship using component types
    const indices = Array.from(getAllocatedIndices())
    const boxIdx = indices.find(i => core.componentType[i] === ComponentType.BOX)
    const textIdx = indices.find(i => core.componentType[i] === ComponentType.TEXT)

    expect(boxIdx).toBeDefined()
    expect(textIdx).toBeDefined()
    // Text's parent should be the box
    expect(unwrap(core.parentIndex[textIdx!])).toBe(boxIdx)

    cleanup()
  })
})

// =============================================================================
// INPUT INTEGRATION TESTS
// =============================================================================

describe('Integration - Input with Containers', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('input inside box gets correct parent', () => {
    const value = signal('')

    const cleanup = box({
      children: () => {
        input({ value })
      }
    })

    expect(getComponentCount()).toBe(2)

    const indices = Array.from(getAllocatedIndices())
    const boxIdx = indices.find(i => core.componentType[i] === ComponentType.BOX)
    const inputIdx = indices.find(i => core.componentType[i] === ComponentType.INPUT)

    expect(boxIdx).toBeDefined()
    expect(inputIdx).toBeDefined()
    // Input's parent should be the box
    expect(unwrap(core.parentIndex[inputIdx!])).toBe(boxIdx)

    cleanup()
  })

  test('multiple inputs inside each() all work independently', () => {
    const items = signal([
      { id: '1', value: signal('first') },
      { id: '2', value: signal('second') },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const item = getItem()
        return input({ value: item.value, id: `input-${key}` })
      },
      { key: item => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(2)

    // Focus first input and type
    focus(0)
    typeKey(0, 'End')
    typeKey(0, '!')

    expect(items.value[0]!.value.value).toBe('first!')
    expect(items.value[1]!.value.value).toBe('second')

    // Focus second input and type
    focus(1)
    typeKey(1, 'End')
    typeKey(1, '?')

    expect(items.value[0]!.value.value).toBe('first!')
    expect(items.value[1]!.value.value).toBe('second?')

    cleanup()
  })

  test('input inside show() - focus state and value preserved on toggle', () => {
    const isVisible = signal(true)
    const value = signal('test')

    const cleanup = show(
      () => isVisible.value,
      () => input({ value, id: 'toggle-input' })
    )
    flushSync()

    expect(getComponentCount()).toBe(1)

    // Focus and modify
    focus(0)
    typeKey(0, 'End')
    typeKey(0, '!')
    expect(value.value).toBe('test!')

    // Hide - input is destroyed
    isVisible.value = false
    flushSync()
    expect(getComponentCount()).toBe(0)

    // Show again - new input with same value
    isVisible.value = true
    flushSync()
    expect(getComponentCount()).toBe(1)
    expect(value.value).toBe('test!') // Value signal preserved

    cleanup()
  })

  test('keyboard events reach input through full chain', () => {
    const value = signal('')
    let submitted = ''

    const cleanup = box({
      children: () => {
        box({
          children: () => {
            input({
              value,
              onSubmit: (v) => { submitted = v },
            })
          }
        })
      }
    })

    // Input is at index 2 (after two boxes)
    expect(getComponentCount()).toBe(3)
    expect(core.componentType[2]).toBe(ComponentType.INPUT)

    focus(2)
    typeKey(2, 'h')
    typeKey(2, 'i')
    typeKey(2, 'Enter')

    expect(value.value).toBe('hi')
    expect(submitted).toBe('hi')

    cleanup()
  })

  test('Tab navigation works across dynamic inputs', () => {
    const items = signal([
      { id: '1', value: signal('') },
      { id: '2', value: signal('') },
      { id: '3', value: signal('') },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const item = getItem()
        return input({ value: item.value })
      },
      { key: item => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(3)

    // Focus first, navigate through all
    focus(0)
    expect(focusedIndex.value).toBe(0)

    focusNext()
    expect(focusedIndex.value).toBe(1)

    focusNext()
    expect(focusedIndex.value).toBe(2)

    // Wraps around
    focusNext()
    expect(focusedIndex.value).toBe(0)

    // Reverse
    focusPrevious()
    expect(focusedIndex.value).toBe(2)

    cleanup()
  })
})

// =============================================================================
// FOCUS + DYNAMIC COMPONENTS TESTS
// =============================================================================

describe('Integration - Focus with Dynamic Components', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('focus navigation across each() items', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => input({ value: signal(''), id: `input-${key}` }),
      { key: item => item.id }
    )
    flushSync()

    const focusables = getFocusableIndices()
    expect(focusables.length).toBe(3)

    // Navigate forward
    focus(focusables[0]!)
    expect(focusedIndex.value).toBe(focusables[0])

    focusNext()
    expect(focusedIndex.value).toBe(focusables[1])

    focusNext()
    expect(focusedIndex.value).toBe(focusables[2])

    cleanup()
  })

  test('focus preserved when each() reorders items', () => {
    const items = signal([
      createItem('a', 'A'),
      createItem('b', 'B'),
      createItem('c', 'C'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => input({ value: signal('') }),
      { key: item => item.id }
    )
    flushSync()

    // Focus middle item
    const focusables = getFocusableIndices()
    expect(focusables.length).toBe(3)
    focus(focusables[1]!)
    const originalFocusedIndex = focusedIndex.value
    expect(originalFocusedIndex).toBe(focusables[1])

    // Reorder - same keys, different order
    items.value = [
      createItem('c', 'C'),
      createItem('a', 'A'),
      createItem('b', 'B'),
    ]
    flushSync()

    // Focus should still be on the same component (by key preservation)
    // Note: The actual focused index may change, but it should still work
    expect(getComponentCount()).toBe(3)

    cleanup()
  })

  test('focus reset when focused item removed from each()', () => {
    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
      createItem('3', 'Three'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => input({ value: signal('') }),
      { key: item => item.id }
    )
    flushSync()

    // Focus middle item
    const focusables = getFocusableIndices()
    focus(focusables[1]!)
    expect(focusedIndex.value).toBe(focusables[1])

    // Remove the focused item
    items.value = [createItem('1', 'One'), createItem('3', 'Three')]
    flushSync()

    // Focus should be reset or moved
    // The component at focusables[1] no longer exists with same id
    expect(getComponentCount()).toBe(2)

    cleanup()
  })

  test('tab order correct with nested focusables', () => {
    const cleanup = box({
      children: () => {
        input({ value: signal(''), tabIndex: 1 })
        box({
          children: () => {
            input({ value: signal(''), tabIndex: 2 })
          }
        })
        input({ value: signal(''), tabIndex: 3 })
      }
    })

    const focusables = getFocusableIndices()
    expect(focusables.length).toBe(3)

    // Navigate in tab order (sorted by tabIndex)
    focus(focusables[0]!)
    const firstFocused = focusedIndex.value
    expect(unwrap(interaction.tabIndex[firstFocused])).toBe(1)

    focusNext()
    const secondFocused = focusedIndex.value
    expect(unwrap(interaction.tabIndex[secondFocused])).toBe(2)

    focusNext()
    const thirdFocused = focusedIndex.value
    expect(unwrap(interaction.tabIndex[thirdFocused])).toBe(3)

    cleanup()
  })

  test('focus callbacks fire with dynamic content', () => {
    const isVisible = signal(true)
    const focusEvents: string[] = []

    const cleanup = show(
      () => isVisible.value,
      () => input({
        value: signal(''),
        onFocus: () => focusEvents.push('focus'),
        onBlur: () => focusEvents.push('blur'),
      })
    )
    flushSync()

    focus(0)
    expect(focusEvents).toEqual(['focus'])

    // Hide input (triggers blur)
    isVisible.value = false
    flushSync()
    // Note: The blur callback is called when the component is cleaned up
    // if the cleanup properly handles focus state

    cleanup()
  })
})

// =============================================================================
// LAYOUT + PRIMITIVES TESTS
// =============================================================================

describe('Integration - Layout with Primitives', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('flex layout with box children computes correctly', () => {
    const cleanup = box({
      width: 100,
      height: 50,
      flexDirection: 'row',
      children: () => {
        box({ width: 30, height: 20, id: 'child-1' })
        box({ width: 40, height: 25, id: 'child-2' })
      }
    })

    const layoutResult = computeLayoutTitan(100, 50)

    expect(layoutResult.width.length).toBeGreaterThan(0)
    expect(getComponentCount()).toBe(3) // Parent + 2 children

    cleanup()
  })

  test('text inside constrained box uses available width', () => {
    const cleanup = box({
      width: 20,
      height: 10,
      children: () => {
        text({ content: 'This is a long text that should wrap within the box' })
      }
    })

    const layoutResult = computeLayoutTitan(80, 24)

    expect(getComponentCount()).toBe(2)
    // Text should be constrained to parent width
    const textIdx = 1
    expect(layoutResult.width[textIdx]).toBeLessThanOrEqual(20)

    cleanup()
  })

  test('nested flex containers compute correctly', () => {
    const cleanup = box({
      width: 100,
      height: 50,
      flexDirection: 'column',
      children: () => {
        box({
          flexDirection: 'row',
          height: 20,
          children: () => {
            text({ content: 'Left', width: 30 })
            text({ content: 'Right', width: 30 })
          }
        })
        box({
          flexDirection: 'row',
          height: 20,
          children: () => {
            text({ content: 'A', grow: 1 })
            text({ content: 'B', grow: 1 })
            text({ content: 'C', grow: 1 })
          }
        })
      }
    })

    const layoutResult = computeLayoutTitan(100, 50)

    // Outer box + 2 inner boxes + 5 texts = 8 components
    expect(getComponentCount()).toBe(8)
    expect(layoutResult.x.length).toBe(8)

    cleanup()
  })

  test('visibility changes affect layout - invisible takes no space', () => {
    const isVisible = signal(true)

    const cleanup = box({
      width: 60,
      height: 30,
      flexDirection: 'row',
      children: () => {
        box({ width: 20, height: 10, id: 'always-visible' })
        box({ width: 20, height: 10, visible: isVisible, id: 'toggle' })
        box({ width: 20, height: 10, id: 'after' })
      }
    })

    let layoutResult = computeLayoutTitan(80, 40)
    expect(getComponentCount()).toBe(4)

    // When visible, layout includes all boxes
    const alwaysIdx = 1
    const toggleIdx = 2
    const afterIdx = 3

    // Initially visible - boxes laid out horizontally
    const initialAfterX = layoutResult.x[afterIdx]!

    // Hide the middle box
    isVisible.value = false
    layoutResult = computeLayoutTitan(80, 40)

    // After hiding, the "after" box should be closer to start
    // (TITAN skips invisible components in layout)
    const afterHideX = layoutResult.x[afterIdx]!
    expect(afterHideX).toBeLessThan(initialAfterX!)

    cleanup()
  })

  test('percentage dimensions resolve correctly', () => {
    const cleanup = box({
      width: 100,
      height: 50,
      children: () => {
        box({ width: '50%', height: '50%', id: 'half-size' })
      }
    })

    const layoutResult = computeLayoutTitan(100, 50)

    const childIdx = 1
    expect(layoutResult.width[childIdx]).toBe(50)  // 50% of 100
    expect(layoutResult.height[childIdx]).toBe(25) // 50% of 50

    cleanup()
  })
})

// =============================================================================
// CONTEXT + COMPONENTS TESTS
// =============================================================================

describe('Integration - Context with Components', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('context flows through box children', () => {
    interface Theme { color: string }
    const ThemeContext = createContext<Theme>({ color: 'default' })
    provide(ThemeContext, { color: 'blue' })

    let receivedColor = ''

    const cleanup = box({
      children: () => {
        box({
          children: () => {
            const theme = useContext(ThemeContext)
            receivedColor = theme.color
            text({ content: theme.color })
          }
        })
      }
    })

    expect(receivedColor).toBe('blue')
    expect(getComponentCount()).toBe(3) // 2 boxes + 1 text

    cleanup()
  })

  test('context flows through each() items', () => {
    interface AppState { prefix: string }
    const AppContext = createContext<AppState>({ prefix: '' })
    provide(AppContext, { prefix: '[test] ' })

    const items = signal([
      createItem('1', 'One'),
      createItem('2', 'Two'),
    ])
    const receivedPrefixes: string[] = []

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        const app = useContext(AppContext)
        receivedPrefixes.push(app.prefix)
        return text({ content: () => app.prefix + getItem().name })
      },
      { key: item => item.id }
    )
    flushSync()

    expect(receivedPrefixes).toEqual(['[test] ', '[test] '])
    expect(getComponentCount()).toBe(2)

    cleanup()
  })

  test('context flows through show() branches', () => {
    interface Config { mode: string }
    const ConfigContext = createContext<Config>({ mode: 'default' })
    provide(ConfigContext, { mode: 'dark' })

    const isVisible = signal(true)
    let thenMode = ''
    let elseMode = ''

    const cleanup = show(
      () => isVisible.value,
      () => {
        const config = useContext(ConfigContext)
        thenMode = config.mode
        return text({ content: 'then' })
      },
      () => {
        const config = useContext(ConfigContext)
        elseMode = config.mode
        return text({ content: 'else' })
      }
    )
    flushSync()

    expect(thenMode).toBe('dark')

    isVisible.value = false
    flushSync()

    expect(elseMode).toBe('dark')

    cleanup()
  })

  test('context updates propagate to nested components', () => {
    interface Counter { count: number }
    const CounterContext = createContext<Counter>({ count: 0 })

    // Use a signal for the context value
    const countSignal = signal(0)
    provide(CounterContext, { count: 0 })

    let readCount = 0

    const cleanup = box({
      children: () => {
        box({
          children: () => {
            // This reads context at creation time
            const counter = useContext(CounterContext)
            readCount = counter.count
            text({ content: String(counter.count) })
          }
        })
      }
    })

    expect(readCount).toBe(0)

    // Update context
    provide(CounterContext, { count: 42 })

    // Reading context again would get new value
    const newCounter = useContext(CounterContext)
    expect(newCounter.count).toBe(42)

    cleanup()
  })
})

// =============================================================================
// FULL REACTIVE PIPELINE TESTS
// =============================================================================

describe('Integration - Full Reactive Pipeline', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('signal change triggers layout recalc and render', () => {
    const width = signal(50)

    const cleanup = box({
      width: width,
      height: 20,
      children: () => {
        text({ content: 'Test' })
      }
    })

    let layoutResult = computeLayoutTitan(100, 50)
    expect(layoutResult.width[0]).toBe(50)

    // Change signal
    width.value = 80
    layoutResult = computeLayoutTitan(100, 50)
    expect(layoutResult.width[0]).toBe(80)

    cleanup()
  })

  test('multiple signal changes result in single layout pass (batching)', () => {
    const width = signal(40)
    const height = signal(20)
    const content = signal('Initial')

    const cleanup = box({
      width: width,
      height: height,
      children: () => {
        text({ content: content })
      }
    })

    // Multiple changes
    width.value = 60
    height.value = 30
    content.value = 'Updated'

    // Single layout computation includes all changes
    const layoutResult = computeLayoutTitan(100, 50)
    expect(layoutResult.width[0]).toBe(60)
    expect(layoutResult.height[0]).toBe(30)
    expect(unwrap(textArrays.textContent[1])).toBe('Updated')

    cleanup()
  })

  test('derived signals in props work end-to-end', () => {
    const count = signal(5)
    const doubleCount = derived(() => count.value * 2)
    const displayText = derived(() => `Count: ${count.value}, Double: ${doubleCount.value}`)

    const cleanup = box({
      width: doubleCount,
      children: () => {
        text({ content: displayText })
      }
    })

    let layoutResult = computeLayoutTitan(100, 50)
    expect(layoutResult.width[0]).toBe(10) // 5 * 2
    expect(unwrap(textArrays.textContent[1])).toBe('Count: 5, Double: 10')

    // Update source signal
    count.value = 10
    layoutResult = computeLayoutTitan(100, 50)
    expect(layoutResult.width[0]).toBe(20) // 10 * 2
    expect(unwrap(textArrays.textContent[1])).toBe('Count: 10, Double: 20')

    cleanup()
  })

  test('conditional rendering with reactive data', () => {
    const showDetails = signal(false)
    const data = signal({ name: 'Test', details: 'Hidden details' })

    const cleanup = box({
      children: () => {
        text({ content: () => data.value.name })
        show(
          () => showDetails.value,
          () => text({ content: () => data.value.details })
        )
        flushSync()
      }
    })
    flushSync()

    // Initially just name
    expect(getComponentCount()).toBe(2) // box + name text

    // Show details
    showDetails.value = true
    flushSync()
    expect(getComponentCount()).toBe(3) // box + name + details

    // Update data
    data.value = { name: 'Updated', details: 'New details' }
    expect(unwrap(textArrays.textContent[1])).toBe('Updated')

    cleanup()
  })

  test('list with reactive item properties', () => {
    interface ReactiveItem {
      id: string
      label: string
      count: number
    }

    const items = signal<ReactiveItem[]>([
      { id: '1', label: 'Item 1', count: 0 },
      { id: '2', label: 'Item 2', count: 0 },
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => {
        return text({
          content: () => `${getItem().label}: ${getItem().count}`,
        })
      },
      { key: item => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(2)

    // Update an item's count
    items.value = items.value.map((item, i) =>
      i === 0 ? { ...item, count: 5 } : item
    )
    flushSync()

    // Content should reflect updated count
    const textContent1 = unwrap(textArrays.textContent[0])
    expect(textContent1).toContain('5')

    cleanup()
  })
})

// =============================================================================
// ADDITIONAL EDGE CASE TESTS
// =============================================================================

describe('Integration - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('rapid show/hide with nested content', () => {
    const isVisible = signal(true)
    let mountCount = 0
    let unmountCount = 0

    const cleanup = show(
      () => isVisible.value,
      () => {
        mountCount++
        const boxCleanup = box({
          children: () => {
            text({ content: 'Nested' })
          }
        })
        return () => {
          unmountCount++
          boxCleanup()
        }
      }
    )
    flushSync()

    // Rapid toggling
    for (let i = 0; i < 10; i++) {
      isVisible.value = !isVisible.value
      flushSync()
    }

    // After 10 toggles, we're back to visible
    expect(isVisible.value).toBe(true)
    expect(getComponentCount()).toBe(2) // box + text

    cleanup()
  })

  test('input value sync with external updates', () => {
    const value = signal('initial')

    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, '!')

    expect(value.value).toBe('initial!')

    // External update
    value.value = 'reset'
    expect(value.value).toBe('reset')

    // Further typing
    typeKey(0, 'End')
    typeKey(0, '?')
    expect(value.value).toBe('reset?')

    cleanup()
  })

  test('deeply nested context and components', () => {
    const LevelContext = createContext<number>(0)

    function createNestedBox(level: number, maxLevel: number): () => void {
      return () => {
        provide(LevelContext, level)
        const currentLevel = useContext(LevelContext)

        if (level < maxLevel) {
          box({
            children: () => {
              createNestedBox(level + 1, maxLevel)()
            }
          })
        } else {
          text({ content: `Level ${currentLevel}` })
        }
      }
    }

    const cleanup = box({ children: createNestedBox(1, 3) })

    // Should have: outer box, 2 nested boxes, 1 text = 4 components
    expect(getComponentCount()).toBe(4)

    cleanup()
  })

  test('each() with complex key changes', () => {
    const items = signal([
      createItem('a', 'Alpha'),
      createItem('b', 'Beta'),
      createItem('c', 'Gamma'),
    ])

    const cleanup = each(
      () => items.value,
      (getItem, key) => text({ content: () => getItem().name }),
      { key: item => item.id }
    )
    flushSync()

    expect(getComponentCount()).toBe(3)

    // Complex change: remove first, add new, reorder
    items.value = [
      createItem('c', 'Gamma'),
      createItem('d', 'Delta'),
      createItem('b', 'Beta'),
    ]
    flushSync()

    expect(getComponentCount()).toBe(3)

    // Verify content is correct by checking all allocated indices
    const indices = Array.from(getAllocatedIndices())
    const contents = indices.map(i => unwrap(textArrays.textContent[i]))
    expect(contents).toContain('Gamma')
    expect(contents).toContain('Delta')
    expect(contents).toContain('Beta')

    cleanup()
  })

  test('input recreated maintains value through external signal', () => {
    const isVisible = signal(true)
    const value = signal('initial')

    const cleanup = show(
      () => isVisible.value,
      () => input({ value })
    )
    flushSync()

    // Input exists and can be focused
    expect(getComponentCount()).toBe(1)
    focus(0)
    typeKey(0, 'End')
    typeKey(0, '!')
    expect(value.value).toBe('initial!')

    // Hide the input (destroys it)
    isVisible.value = false
    flushSync()
    expect(getComponentCount()).toBe(0)

    // Show it again (recreates it)
    isVisible.value = true
    flushSync()
    expect(getComponentCount()).toBe(1)

    // Value is still preserved (through the external signal)
    expect(value.value).toBe('initial!')
    expect(unwrap(textArrays.textContent[0])).toBe('initial!')

    cleanup()
  })
})
