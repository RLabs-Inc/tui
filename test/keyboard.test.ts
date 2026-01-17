/**
 * TUI Framework - Keyboard Module Tests
 *
 * Tests for keyboard state and handler registry:
 * - Global handlers (on)
 * - Key-specific handlers (onKey)
 * - Focused handlers (onFocused)
 * - Event dispatch
 * - KeyboardEvent structure
 * - Key name normalization
 * - Cleanup functions
 * - keyboard object API
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'

import {
  lastEvent,
  lastKey,
  dispatch,
  dispatchFocused,
  on,
  onKey,
  onFocused,
  cleanupIndex,
  cleanup,
  keyboard,
  type KeyboardEvent,
  type KeyHandler,
} from '../src/state/keyboard'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  cleanup()
}

/** Create a basic key press event */
function createKeyEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    modifiers: {
      ctrl: options.modifiers?.ctrl ?? false,
      alt: options.modifiers?.alt ?? false,
      shift: options.modifiers?.shift ?? false,
      meta: options.modifiers?.meta ?? false,
    },
    state: options.state ?? 'press',
    raw: options.raw,
  }
}

/** Create a key event with modifiers */
function createModifiedKeyEvent(
  key: string,
  mods: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }
): KeyboardEvent {
  return createKeyEvent(key, {
    modifiers: {
      ctrl: mods.ctrl ?? false,
      alt: mods.alt ?? false,
      shift: mods.shift ?? false,
      meta: mods.meta ?? false,
    },
  })
}

// =============================================================================
// GLOBAL HANDLERS (on) TESTS
// =============================================================================

describe('Keyboard - Global Handlers (on)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('registers handler that receives all key events', () => {
    const events: KeyboardEvent[] = []
    on((event) => {
      events.push(event)
    })

    dispatch(createKeyEvent('a'))
    dispatch(createKeyEvent('b'))
    dispatch(createKeyEvent('Enter'))

    expect(events.length).toBe(3)
    expect(events[0].key).toBe('a')
    expect(events[1].key).toBe('b')
    expect(events[2].key).toBe('Enter')
  })

  test('returns unsubscribe function', () => {
    const events: string[] = []
    const unsubscribe = on((event) => {
      events.push(event.key)
    })

    dispatch(createKeyEvent('a'))
    expect(events).toContain('a')

    unsubscribe()

    dispatch(createKeyEvent('b'))
    expect(events).not.toContain('b')
    expect(events.length).toBe(1)
  })

  test('multiple handlers all called', () => {
    const handler1Calls: string[] = []
    const handler2Calls: string[] = []
    const handler3Calls: string[] = []

    on((event) => {
      handler1Calls.push(event.key)
    })
    on((event) => {
      handler2Calls.push(event.key)
    })
    on((event) => {
      handler3Calls.push(event.key)
    })

    dispatch(createKeyEvent('x'))

    expect(handler1Calls).toContain('x')
    expect(handler2Calls).toContain('x')
    expect(handler3Calls).toContain('x')
  })

  test('unsubscribe removes only that handler', () => {
    const handler1Calls: string[] = []
    const handler2Calls: string[] = []

    const unsub1 = on((event) => {
      handler1Calls.push(event.key)
    })
    on((event) => {
      handler2Calls.push(event.key)
    })

    dispatch(createKeyEvent('a'))
    expect(handler1Calls.length).toBe(1)
    expect(handler2Calls.length).toBe(1)

    unsub1()

    dispatch(createKeyEvent('b'))
    expect(handler1Calls.length).toBe(1) // Not called again
    expect(handler2Calls.length).toBe(2) // Still called
  })
})

// =============================================================================
// KEY-SPECIFIC HANDLERS (onKey) TESTS
// =============================================================================

describe('Keyboard - Key-Specific Handlers (onKey)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('single key string registers for that key', () => {
    let called = false
    onKey('Enter', () => {
      called = true
    })

    dispatch(createKeyEvent('Enter'))

    expect(called).toBe(true)
  })

  test('array of keys registers for all', () => {
    let callCount = 0
    onKey(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], () => {
      callCount++
    })

    dispatch(createKeyEvent('ArrowUp'))
    dispatch(createKeyEvent('ArrowDown'))
    dispatch(createKeyEvent('ArrowLeft'))
    dispatch(createKeyEvent('ArrowRight'))

    expect(callCount).toBe(4)
  })

  test('handler only called for matching key', () => {
    let enterCalls = 0
    let escapeCalls = 0

    onKey('Enter', () => {
      enterCalls++
    })
    onKey('Escape', () => {
      escapeCalls++
    })

    dispatch(createKeyEvent('Enter'))
    dispatch(createKeyEvent('Enter'))
    dispatch(createKeyEvent('Escape'))
    dispatch(createKeyEvent('a')) // Should not trigger either

    expect(enterCalls).toBe(2)
    expect(escapeCalls).toBe(1)
  })

  test('returns unsubscribe function', () => {
    let callCount = 0
    const unsubscribe = onKey('Tab', () => {
      callCount++
    })

    dispatch(createKeyEvent('Tab'))
    expect(callCount).toBe(1)

    unsubscribe()

    dispatch(createKeyEvent('Tab'))
    expect(callCount).toBe(1) // Not incremented
  })

  test('unsubscribe removes handler from all registered keys', () => {
    let callCount = 0
    const unsubscribe = onKey(['a', 'b', 'c'], () => {
      callCount++
    })

    dispatch(createKeyEvent('a'))
    dispatch(createKeyEvent('b'))
    expect(callCount).toBe(2)

    unsubscribe()

    dispatch(createKeyEvent('a'))
    dispatch(createKeyEvent('b'))
    dispatch(createKeyEvent('c'))
    expect(callCount).toBe(2) // Not incremented
  })

  test('multiple handlers for same key all called', () => {
    let handler1Called = false
    let handler2Called = false

    onKey('Space', () => {
      handler1Called = true
    })
    onKey('Space', () => {
      handler2Called = true
    })

    dispatch(createKeyEvent('Space'))

    expect(handler1Called).toBe(true)
    expect(handler2Called).toBe(true)
  })
})

// =============================================================================
// FOCUSED HANDLERS (onFocused) TESTS
// =============================================================================

describe('Keyboard - Focused Handlers (onFocused)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('handler fires when component is focused', () => {
    const events: string[] = []
    onFocused(5, (event) => {
      events.push(event.key)
    })

    dispatchFocused(5, createKeyEvent('Enter'))

    expect(events).toContain('Enter')
  })

  test('handler not called when different component focused', () => {
    let called = false
    onFocused(5, () => {
      called = true
    })

    dispatchFocused(10, createKeyEvent('Enter')) // Different index

    expect(called).toBe(false)
  })

  test('returns unsubscribe function', () => {
    let callCount = 0
    const unsubscribe = onFocused(3, () => {
      callCount++
    })

    dispatchFocused(3, createKeyEvent('a'))
    expect(callCount).toBe(1)

    unsubscribe()

    dispatchFocused(3, createKeyEvent('b'))
    expect(callCount).toBe(1) // Not incremented
  })

  test('cleanupIndex removes all handlers for index', () => {
    let handler1Calls = 0
    let handler2Calls = 0

    onFocused(7, () => {
      handler1Calls++
    })
    onFocused(7, () => {
      handler2Calls++
    })

    dispatchFocused(7, createKeyEvent('x'))
    expect(handler1Calls).toBe(1)
    expect(handler2Calls).toBe(1)

    cleanupIndex(7)

    dispatchFocused(7, createKeyEvent('y'))
    expect(handler1Calls).toBe(1) // Not incremented
    expect(handler2Calls).toBe(1) // Not incremented
  })

  test('multiple handlers for same index all called', () => {
    const calls: number[] = []

    onFocused(2, () => {
      calls.push(1)
    })
    onFocused(2, () => {
      calls.push(2)
    })
    onFocused(2, () => {
      calls.push(3)
    })

    dispatchFocused(2, createKeyEvent('Enter'))

    expect(calls).toEqual([1, 2, 3])
  })

  test('handlers for different indices are independent', () => {
    let index1Calls = 0
    let index2Calls = 0

    onFocused(1, () => {
      index1Calls++
    })
    onFocused(2, () => {
      index2Calls++
    })

    dispatchFocused(1, createKeyEvent('a'))
    dispatchFocused(2, createKeyEvent('b'))
    dispatchFocused(1, createKeyEvent('c'))

    expect(index1Calls).toBe(2)
    expect(index2Calls).toBe(1)
  })
})

// =============================================================================
// EVENT DISPATCH TESTS
// =============================================================================

describe('Keyboard - Event Dispatch', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('dispatch() calls global handlers', () => {
    const events: KeyboardEvent[] = []
    on((event) => {
      events.push(event)
    })

    const event = createKeyEvent('Enter')
    dispatch(event)

    expect(events.length).toBe(1)
    expect(events[0].key).toBe('Enter')
  })

  test('dispatchFocused() calls focused handlers', () => {
    const events: KeyboardEvent[] = []
    onFocused(5, (event) => {
      events.push(event)
    })

    dispatchFocused(5, createKeyEvent('Tab'))

    expect(events.length).toBe(1)
    expect(events[0].key).toBe('Tab')
  })

  test('handler return true stops propagation for global handlers', () => {
    const calls: number[] = []

    on(() => {
      calls.push(1)
      return true // Consume event
    })
    on(() => {
      calls.push(2) // Should not be called
    })

    dispatch(createKeyEvent('a'))

    expect(calls).toEqual([1])
  })

  test('handler return true stops propagation for key handlers', () => {
    const calls: number[] = []

    onKey('Enter', () => {
      calls.push(1)
      return true // Consume event
    })
    onKey('Enter', () => {
      calls.push(2) // Should not be called
    })
    on(() => {
      calls.push(3) // Should not be called
    })

    dispatch(createKeyEvent('Enter'))

    expect(calls).toEqual([1])
  })

  test('handler return true stops propagation for focused handlers', () => {
    const calls: number[] = []

    onFocused(1, () => {
      calls.push(1)
      return true // Consume event
    })
    onFocused(1, () => {
      calls.push(2) // Should not be called
    })

    dispatchFocused(1, createKeyEvent('x'))

    expect(calls).toEqual([1])
  })

  test('dispatch returns true when event consumed', () => {
    on(() => true)

    const result = dispatch(createKeyEvent('a'))

    expect(result).toBe(true)
  })

  test('dispatch returns false when event not consumed', () => {
    on(() => {
      // Does not return true
    })

    const result = dispatch(createKeyEvent('a'))

    expect(result).toBe(false)
  })

  test('dispatchFocused returns false for negative index', () => {
    onFocused(0, () => true)

    const result = dispatchFocused(-1, createKeyEvent('a'))

    expect(result).toBe(false)
  })

  test('dispatchFocused returns false when no handlers', () => {
    const result = dispatchFocused(99, createKeyEvent('a'))

    expect(result).toBe(false)
  })
})

// =============================================================================
// KEYBOARD EVENT STRUCTURE TESTS
// =============================================================================

describe('Keyboard - KeyboardEvent Structure', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('key property set correctly', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createKeyEvent('ArrowUp'))

    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent!.key).toBe('ArrowUp')
  })

  test('ctrl modifier', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createModifiedKeyEvent('c', { ctrl: true }))

    expect(receivedEvent!.modifiers.ctrl).toBe(true)
    expect(receivedEvent!.modifiers.alt).toBe(false)
    expect(receivedEvent!.modifiers.shift).toBe(false)
    expect(receivedEvent!.modifiers.meta).toBe(false)
  })

  test('alt modifier', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createModifiedKeyEvent('x', { alt: true }))

    expect(receivedEvent!.modifiers.alt).toBe(true)
    expect(receivedEvent!.modifiers.ctrl).toBe(false)
  })

  test('shift modifier', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createModifiedKeyEvent('A', { shift: true }))

    expect(receivedEvent!.modifiers.shift).toBe(true)
  })

  test('meta modifier', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createModifiedKeyEvent('v', { meta: true }))

    expect(receivedEvent!.modifiers.meta).toBe(true)
  })

  test('multiple modifiers', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createModifiedKeyEvent('z', { ctrl: true, shift: true }))

    expect(receivedEvent!.modifiers.ctrl).toBe(true)
    expect(receivedEvent!.modifiers.shift).toBe(true)
    expect(receivedEvent!.modifiers.alt).toBe(false)
    expect(receivedEvent!.modifiers.meta).toBe(false)
  })

  test('state press', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createKeyEvent('a', { state: 'press' }))

    expect(receivedEvent!.state).toBe('press')
  })

  test('state repeat does not call handlers', () => {
    let called = false
    on(() => {
      called = true
    })

    dispatch(createKeyEvent('a', { state: 'repeat' }))

    expect(called).toBe(false)
  })

  test('state release does not call handlers', () => {
    let called = false
    on(() => {
      called = true
    })

    dispatch(createKeyEvent('a', { state: 'release' }))

    expect(called).toBe(false)
  })

  test('raw property preserved', () => {
    let receivedEvent: KeyboardEvent | null = null
    on((event) => {
      receivedEvent = event
    })

    dispatch(createKeyEvent('Enter', { raw: '\x1b[13u' }))

    expect(receivedEvent!.raw).toBe('\x1b[13u')
  })
})

// =============================================================================
// KEY NAME TESTS
// =============================================================================

describe('Keyboard - Key Names', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('arrow keys', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('ArrowUp'))
    dispatch(createKeyEvent('ArrowDown'))
    dispatch(createKeyEvent('ArrowLeft'))
    dispatch(createKeyEvent('ArrowRight'))

    expect(keys).toEqual(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
  })

  test('special keys - Enter, Escape, Tab', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('Enter'))
    dispatch(createKeyEvent('Escape'))
    dispatch(createKeyEvent('Tab'))

    expect(keys).toEqual(['Enter', 'Escape', 'Tab'])
  })

  test('special keys - Backspace, Delete', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('Backspace'))
    dispatch(createKeyEvent('Delete'))

    expect(keys).toEqual(['Backspace', 'Delete'])
  })

  test('navigation keys - Home, End, PageUp, PageDown', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('Home'))
    dispatch(createKeyEvent('End'))
    dispatch(createKeyEvent('PageUp'))
    dispatch(createKeyEvent('PageDown'))

    expect(keys).toEqual(['Home', 'End', 'PageUp', 'PageDown'])
  })

  test('function keys', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('F1'))
    dispatch(createKeyEvent('F5'))
    dispatch(createKeyEvent('F12'))

    expect(keys).toEqual(['F1', 'F5', 'F12'])
  })

  test('regular character keys', () => {
    const keys: string[] = []
    on((event) => {
      keys.push(event.key)
    })

    dispatch(createKeyEvent('a'))
    dispatch(createKeyEvent('Z'))
    dispatch(createKeyEvent('5'))
    dispatch(createKeyEvent(' '))

    expect(keys).toEqual(['a', 'Z', '5', ' '])
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe('Keyboard - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('cleanup() clears all handlers', () => {
    let globalCalled = false
    let keyCalled = false
    let focusedCalled = false

    on(() => {
      globalCalled = true
    })
    onKey('a', () => {
      keyCalled = true
    })
    onFocused(1, () => {
      focusedCalled = true
    })

    cleanup()

    dispatch(createKeyEvent('a'))
    dispatchFocused(1, createKeyEvent('b'))

    expect(globalCalled).toBe(false)
    expect(keyCalled).toBe(false)
    expect(focusedCalled).toBe(false)
  })

  test('cleanup() resets lastEvent to null', () => {
    dispatch(createKeyEvent('x'))
    expect(lastEvent.value).not.toBeNull()

    cleanup()

    expect(lastEvent.value).toBeNull()
  })

  test('cleanupIndex() clears specific component handlers', () => {
    let index5Called = false
    let index10Called = false

    onFocused(5, () => {
      index5Called = true
    })
    onFocused(10, () => {
      index10Called = true
    })

    cleanupIndex(5)

    dispatchFocused(5, createKeyEvent('a'))
    dispatchFocused(10, createKeyEvent('b'))

    expect(index5Called).toBe(false)
    expect(index10Called).toBe(true)
  })

  test('cleanupIndex() does not affect other indices', () => {
    let index1Called = false
    let index2Called = false
    let index3Called = false

    onFocused(1, () => {
      index1Called = true
    })
    onFocused(2, () => {
      index2Called = true
    })
    onFocused(3, () => {
      index3Called = true
    })

    cleanupIndex(2)

    dispatchFocused(1, createKeyEvent('a'))
    dispatchFocused(2, createKeyEvent('b'))
    dispatchFocused(3, createKeyEvent('c'))

    expect(index1Called).toBe(true)
    expect(index2Called).toBe(false)
    expect(index3Called).toBe(true)
  })
})

// =============================================================================
// KEYBOARD OBJECT API TESTS
// =============================================================================

describe('Keyboard - keyboard Object API', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('keyboard.on() works', () => {
    let called = false
    keyboard.on(() => {
      called = true
    })

    dispatch(createKeyEvent('a'))

    expect(called).toBe(true)
  })

  test('keyboard.onKey() works', () => {
    let called = false
    keyboard.onKey('Enter', () => {
      called = true
    })

    dispatch(createKeyEvent('Enter'))

    expect(called).toBe(true)
  })

  test('keyboard.onFocused() works', () => {
    let called = false
    keyboard.onFocused(5, () => {
      called = true
    })

    dispatchFocused(5, createKeyEvent('x'))

    expect(called).toBe(true)
  })

  test('keyboard.cleanup() works', () => {
    let called = false
    keyboard.on(() => {
      called = true
    })

    keyboard.cleanup()

    dispatch(createKeyEvent('a'))

    expect(called).toBe(false)
  })

  test('keyboard.cleanupIndex() works', () => {
    let called = false
    keyboard.onFocused(3, () => {
      called = true
    })

    keyboard.cleanupIndex(3)

    dispatchFocused(3, createKeyEvent('a'))

    expect(called).toBe(false)
  })
})

// =============================================================================
// REACTIVE STATE TESTS
// =============================================================================

describe('Keyboard - Reactive State', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('lastEvent updates on dispatch', () => {
    expect(lastEvent.value).toBeNull()

    dispatch(createKeyEvent('Enter'))

    expect(lastEvent.value).not.toBeNull()
    expect(lastEvent.value!.key).toBe('Enter')
  })

  test('lastEvent updates even for non-press events', () => {
    dispatch(createKeyEvent('a', { state: 'repeat' }))

    expect(lastEvent.value).not.toBeNull()
    expect(lastEvent.value!.key).toBe('a')
    expect(lastEvent.value!.state).toBe('repeat')
  })

  test('lastKey derived from lastEvent', () => {
    expect(lastKey.value).toBe('')

    dispatch(createKeyEvent('Tab'))

    expect(lastKey.value).toBe('Tab')
  })

  test('lastKey updates with each dispatch', () => {
    dispatch(createKeyEvent('a'))
    expect(lastKey.value).toBe('a')

    dispatch(createKeyEvent('b'))
    expect(lastKey.value).toBe('b')

    dispatch(createKeyEvent('Enter'))
    expect(lastKey.value).toBe('Enter')
  })

  test('lastEvent contains full event data', () => {
    const event = createModifiedKeyEvent('c', { ctrl: true, shift: true })
    event.raw = '\x03'

    dispatch(event)

    expect(lastEvent.value).not.toBeNull()
    expect(lastEvent.value!.key).toBe('c')
    expect(lastEvent.value!.modifiers.ctrl).toBe(true)
    expect(lastEvent.value!.modifiers.shift).toBe(true)
    expect(lastEvent.value!.modifiers.alt).toBe(false)
    expect(lastEvent.value!.modifiers.meta).toBe(false)
    expect(lastEvent.value!.raw).toBe('\x03')
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Keyboard - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('empty key string works', () => {
    let called = false
    onKey('', () => {
      called = true
    })

    dispatch(createKeyEvent(''))

    expect(called).toBe(true)
  })

  test('unsubscribe called multiple times is safe', () => {
    let callCount = 0
    const unsubscribe = on(() => {
      callCount++
    })

    dispatch(createKeyEvent('a'))
    expect(callCount).toBe(1)

    unsubscribe()
    unsubscribe() // Call again - should be safe
    unsubscribe()

    dispatch(createKeyEvent('b'))
    expect(callCount).toBe(1)
  })

  test('cleanupIndex on non-existent index is safe', () => {
    // Should not throw
    cleanupIndex(999)
    cleanupIndex(-1)
  })

  test('dispatch with no handlers returns false', () => {
    const result = dispatch(createKeyEvent('a'))
    expect(result).toBe(false)
  })

  test('key handlers process before global handlers', () => {
    const order: string[] = []

    onKey('a', () => {
      order.push('key')
    })
    on(() => {
      order.push('global')
    })

    dispatch(createKeyEvent('a'))

    expect(order).toEqual(['key', 'global'])
  })

  test('key handler consuming event prevents global handler', () => {
    let globalCalled = false

    onKey('a', () => {
      return true // Consume
    })
    on(() => {
      globalCalled = true
    })

    dispatch(createKeyEvent('a'))

    expect(globalCalled).toBe(false)
  })
})
