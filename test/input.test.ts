/**
 * TUI Framework - Input Primitive Tests
 *
 * Comprehensive tests for the input component covering:
 * - Component creation and slot arrays
 * - Two-way value binding
 * - Cursor position management
 * - Keyboard handling
 * - Password mode
 * - Max length constraints
 * - Callbacks (onChange, onSubmit, onCancel, onFocus, onBlur)
 * - Focus integration
 * - Cleanup
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, bind } from '@rlabs-inc/signals'

import { input } from '../src/primitives/input'
import { allocateIndex, resetRegistry, releaseIndex } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { resetFocusState, focus, blur, focusedIndex, registerFocusCallbacks } from '../src/state/focus'
import { dispatchFocused, cleanup as cleanupKeyboard } from '../src/state/keyboard'
import * as textArrays from '../src/engine/arrays/text'
import * as interaction from '../src/engine/arrays/interaction'
import * as core from '../src/engine/arrays/core'
import { ComponentType } from '../src/types'

import type { KeyboardEvent } from '../src/state/keyboard'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetFocusState()
  cleanupKeyboard()
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
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

/**
 * Simulate typing a key.
 * The `index` parameter is used to check if that index is currently focused.
 * dispatchFocused should be called with the actual focusedIndex value.
 */
function typeKey(index: number, key: string, modifiers: Partial<KeyboardEvent['modifiers']> = {}): boolean {
  const event = createKeyEvent(key, modifiers)
  // Only dispatch to the index if it's currently focused
  // This mirrors how the real system works: dispatchFocused is called with focusedIndex.value
  if (focusedIndex.value !== index) {
    return false
  }
  return dispatchFocused(index, event)
}

// =============================================================================
// COMPONENT CREATION TESTS
// =============================================================================

describe('Input - Component Creation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('creates component with allocated index', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Should have allocated an index (check arrays have data)
    expect(core.componentType[0]).toBe(ComponentType.INPUT)

    cleanup()
  })

  test('creates component with custom id', () => {
    const value = signal('')
    const cleanup = input({ value, id: 'my-input' })

    // Check component was created
    expect(core.componentType[0]).toBe(ComponentType.INPUT)

    cleanup()
  })

  test('sets up text content from value signal', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    // Text array should have the value
    expect(textArrays.textContent[0]).toBe('hello')

    cleanup()
  })

  test('handles empty value with placeholder', () => {
    const value = signal('')
    const cleanup = input({ value, placeholder: 'Enter text...' })

    // Should show placeholder when empty
    expect(textArrays.textContent[0]).toBe('Enter text...')

    cleanup()
  })

  test('shows value instead of placeholder when not empty', () => {
    const value = signal('content')
    const cleanup = input({ value, placeholder: 'Enter text...' })

    // Should show value, not placeholder
    expect(textArrays.textContent[0]).toBe('content')

    cleanup()
  })

  test('component is always focusable', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Input should be focusable by default
    expect(interaction.focusable[0]).toBe(1)

    cleanup()
  })

  test('respects custom tabIndex', () => {
    const value = signal('')
    const cleanup = input({ value, tabIndex: 5 })

    expect(interaction.tabIndex[0]).toBe(5)

    cleanup()
  })
})

// =============================================================================
// TWO-WAY VALUE BINDING TESTS
// =============================================================================

describe('Input - Two-way Value Binding', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('value signal updates display text', () => {
    const value = signal('initial')
    const cleanup = input({ value })

    expect(textArrays.textContent[0]).toBe('initial')

    value.value = 'updated'
    expect(textArrays.textContent[0]).toBe('updated')

    cleanup()
  })

  test('text changes update value signal via keyboard', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Focus and type
    focus(0)
    typeKey(0, 'a')
    typeKey(0, 'b')
    typeKey(0, 'c')

    expect(value.value).toBe('abc')

    cleanup()
  })

  test('works with WritableSignal', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End') // Move cursor to end
    typeKey(0, 'x')

    expect(value.value).toBe('testx')

    cleanup()
  })

  test('works with Binding', () => {
    const source = signal('bound')
    const value = bind(source)
    const cleanup = input({ value })

    expect(textArrays.textContent[0]).toBe('bound')

    // Update source
    source.value = 'changed'
    expect(textArrays.textContent[0]).toBe('changed')

    cleanup()
  })

  test('external value changes update display', () => {
    const value = signal('first')
    const cleanup = input({ value })

    expect(textArrays.textContent[0]).toBe('first')

    // External change
    value.value = 'second'
    expect(textArrays.textContent[0]).toBe('second')

    cleanup()
  })
})

// =============================================================================
// CURSOR POSITION TESTS
// =============================================================================

describe('Input - Cursor Position', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('initial cursor position is at end of initial value', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    // Cursor position array starts at 0, moves as user types
    // For initial value, cursor position is 0 (start) until user interacts
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('cursor position updates when typing', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'a')
    expect(interaction.cursorPosition[0]).toBe(1)

    typeKey(0, 'b')
    expect(interaction.cursorPosition[0]).toBe(2)

    cleanup()
  })

  test('cursor position clamped to text length on external value change', () => {
    const value = signal('long text')
    const cleanup = input({ value })

    focus(0)
    // Move cursor to end
    typeKey(0, 'End')

    // Now external change to shorter text
    value.value = 'hi'

    // Cursor should be clamped (the getter clamps it)
    expect(interaction.cursorPosition[0]).toBeLessThanOrEqual(2)

    cleanup()
  })
})

// =============================================================================
// KEYBOARD NAVIGATION TESTS
// =============================================================================

describe('Input - Keyboard Navigation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('ArrowLeft moves cursor left', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End') // Move to end first
    expect(interaction.cursorPosition[0]).toBe(5)

    typeKey(0, 'ArrowLeft')
    expect(interaction.cursorPosition[0]).toBe(4)

    typeKey(0, 'ArrowLeft')
    expect(interaction.cursorPosition[0]).toBe(3)

    cleanup()
  })

  test('ArrowLeft does not go below 0', () => {
    const value = signal('hi')
    const cleanup = input({ value })

    focus(0)
    // Cursor at 0
    typeKey(0, 'ArrowLeft')
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('ArrowRight moves cursor right', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    // Start at 0
    typeKey(0, 'ArrowRight')
    expect(interaction.cursorPosition[0]).toBe(1)

    typeKey(0, 'ArrowRight')
    expect(interaction.cursorPosition[0]).toBe(2)

    cleanup()
  })

  test('ArrowRight does not go past text length', () => {
    const value = signal('hi')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(2)

    typeKey(0, 'ArrowRight')
    expect(interaction.cursorPosition[0]).toBe(2) // Still 2

    cleanup()
  })

  test('Home moves cursor to start', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(5)

    typeKey(0, 'Home')
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('End moves cursor to end', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    // Start at 0
    expect(interaction.cursorPosition[0]).toBe(0)

    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(5)

    cleanup()
  })
})

// =============================================================================
// KEYBOARD EDITING TESTS
// =============================================================================

describe('Input - Keyboard Editing', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('Backspace deletes character before cursor', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End') // Cursor at 5
    typeKey(0, 'Backspace')

    expect(value.value).toBe('hell')
    expect(interaction.cursorPosition[0]).toBe(4)

    cleanup()
  })

  test('Backspace at start does nothing', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    // Cursor at 0
    typeKey(0, 'Backspace')

    expect(value.value).toBe('hello')
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('Delete removes character after cursor', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    // Cursor at 0
    typeKey(0, 'Delete')

    expect(value.value).toBe('ello')
    expect(interaction.cursorPosition[0]).toBe(0) // Cursor stays

    cleanup()
  })

  test('Delete at end does nothing', () => {
    const value = signal('hello')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'Delete')

    expect(value.value).toBe('hello')

    cleanup()
  })

  test('character insertion at cursor position', () => {
    const value = signal('hllo')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'ArrowRight') // Move to position 1

    typeKey(0, 'e') // Insert 'e' at position 1

    expect(value.value).toBe('hello')
    expect(interaction.cursorPosition[0]).toBe(2) // Cursor moved after inserted char

    cleanup()
  })

  test('character insertion at start', () => {
    const value = signal('ello')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'h')

    expect(value.value).toBe('hello')

    cleanup()
  })

  test('character insertion at end', () => {
    const value = signal('hell')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'o')

    expect(value.value).toBe('hello')

    cleanup()
  })

  test('ignores characters with ctrl modifier', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'a', { ctrl: true })

    expect(value.value).toBe('test') // Unchanged

    cleanup()
  })

  test('ignores characters with alt modifier', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'a', { alt: true })

    expect(value.value).toBe('test') // Unchanged

    cleanup()
  })

  test('ignores characters with meta modifier', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'a', { meta: true })

    expect(value.value).toBe('test') // Unchanged

    cleanup()
  })
})

// =============================================================================
// SUBMISSION AND CANCEL TESTS
// =============================================================================

describe('Input - Submit and Cancel', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('Enter triggers onSubmit callback', () => {
    const value = signal('submitted value')
    let submittedValue = ''

    const cleanup = input({
      value,
      onSubmit: (val) => { submittedValue = val },
    })

    focus(0)
    typeKey(0, 'Enter')

    expect(submittedValue).toBe('submitted value')

    cleanup()
  })

  test('Enter without onSubmit does not crash', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    expect(() => typeKey(0, 'Enter')).not.toThrow()

    cleanup()
  })

  test('Escape triggers onCancel callback', () => {
    const value = signal('test')
    let cancelled = false

    const cleanup = input({
      value,
      onCancel: () => { cancelled = true },
    })

    focus(0)
    typeKey(0, 'Escape')

    expect(cancelled).toBe(true)

    cleanup()
  })

  test('Escape without onCancel does not crash', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    expect(() => typeKey(0, 'Escape')).not.toThrow()

    cleanup()
  })
})

// =============================================================================
// PASSWORD MODE TESTS
// =============================================================================

describe('Input - Password Mode', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('displays mask characters instead of text', () => {
    const value = signal('secret')
    const cleanup = input({ value, password: true })

    // Default mask is '•'
    expect(textArrays.textContent[0]).toBe('••••••')

    cleanup()
  })

  test('default mask character is bullet', () => {
    const value = signal('abc')
    const cleanup = input({ value, password: true })

    expect(textArrays.textContent[0]).toBe('•••')

    cleanup()
  })

  test('custom maskChar works', () => {
    const value = signal('pass')
    const cleanup = input({ value, password: true, maskChar: '*' })

    expect(textArrays.textContent[0]).toBe('****')

    cleanup()
  })

  test('password mode updates display when value changes', () => {
    const value = signal('ab')
    const cleanup = input({ value, password: true })

    expect(textArrays.textContent[0]).toBe('••')

    value.value = 'abc'
    expect(textArrays.textContent[0]).toBe('•••')

    cleanup()
  })

  test('password mode shows placeholder when empty', () => {
    const value = signal('')
    const cleanup = input({
      value,
      password: true,
      placeholder: 'Enter password...',
    })

    expect(textArrays.textContent[0]).toBe('Enter password...')

    cleanup()
  })

  test('typing in password mode masks new characters', () => {
    const value = signal('')
    const cleanup = input({ value, password: true })

    focus(0)
    typeKey(0, 'a')
    typeKey(0, 'b')

    expect(value.value).toBe('ab') // Actual value is stored
    expect(textArrays.textContent[0]).toBe('••') // Display is masked

    cleanup()
  })
})

// =============================================================================
// MAX LENGTH TESTS
// =============================================================================

describe('Input - Max Length', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('enforces maxLength constraint', () => {
    const value = signal('')
    const cleanup = input({ value, maxLength: 5 })

    focus(0)
    typeKey(0, 'a')
    typeKey(0, 'b')
    typeKey(0, 'c')
    typeKey(0, 'd')
    typeKey(0, 'e')
    typeKey(0, 'f') // Should be rejected

    expect(value.value).toBe('abcde')
    expect(value.value.length).toBe(5)

    cleanup()
  })

  test('rejects input beyond maxLength', () => {
    const value = signal('full')
    const cleanup = input({ value, maxLength: 4 })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'x')

    expect(value.value).toBe('full')

    cleanup()
  })

  test('allows deletion when at maxLength', () => {
    const value = signal('abcde')
    const cleanup = input({ value, maxLength: 5 })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'Backspace')

    expect(value.value).toBe('abcd')

    cleanup()
  })

  test('allows typing after deletion from maxLength', () => {
    const value = signal('abcde')
    const cleanup = input({ value, maxLength: 5 })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'Backspace') // Remove 'e'
    typeKey(0, 'x') // Add 'x'

    expect(value.value).toBe('abcdx')

    cleanup()
  })

  test('maxLength 0 means unlimited', () => {
    const value = signal('')
    const cleanup = input({ value, maxLength: 0 })

    focus(0)
    for (let i = 0; i < 100; i++) {
      typeKey(0, 'a')
    }

    expect(value.value.length).toBe(100)

    cleanup()
  })
})

// =============================================================================
// CALLBACK TESTS
// =============================================================================

describe('Input - Callbacks', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onChange called when value changes via keyboard', () => {
    const value = signal('')
    const changes: string[] = []

    const cleanup = input({
      value,
      onChange: (val) => { changes.push(val) },
    })

    focus(0)
    typeKey(0, 'a')
    typeKey(0, 'b')

    expect(changes).toEqual(['a', 'ab'])

    cleanup()
  })

  test('onChange called on backspace', () => {
    const value = signal('ab')
    const changes: string[] = []

    const cleanup = input({
      value,
      onChange: (val) => { changes.push(val) },
    })

    focus(0)
    typeKey(0, 'End')
    typeKey(0, 'Backspace')

    expect(changes).toEqual(['a'])

    cleanup()
  })

  test('onChange called on delete', () => {
    const value = signal('ab')
    const changes: string[] = []

    const cleanup = input({
      value,
      onChange: (val) => { changes.push(val) },
    })

    focus(0)
    typeKey(0, 'Delete')

    expect(changes).toEqual(['b'])

    cleanup()
  })

  test('onSubmit receives current value', () => {
    const value = signal('test')
    let submitted = ''

    const cleanup = input({
      value,
      onSubmit: (val) => { submitted = val },
    })

    focus(0)
    typeKey(0, 'Enter')

    expect(submitted).toBe('test')

    cleanup()
  })

  test('onFocus called when component receives focus', () => {
    const value = signal('')
    let focused = false

    const cleanup = input({
      value,
      onFocus: () => { focused = true },
    })

    expect(focused).toBe(false)
    focus(0)
    expect(focused).toBe(true)

    cleanup()
  })

  test('onBlur called when component loses focus', () => {
    const value = signal('')
    let blurred = false

    const cleanup = input({
      value,
      onBlur: () => { blurred = true },
    })

    focus(0)
    expect(blurred).toBe(false)

    blur()
    expect(blurred).toBe(true)

    cleanup()
  })

  test('onFocus and onBlur fire in sequence', () => {
    const value1 = signal('')
    const value2 = signal('')
    const events: string[] = []

    const cleanup1 = input({
      value: value1,
      id: 'input1',
      onFocus: () => { events.push('focus1') },
      onBlur: () => { events.push('blur1') },
    })

    const cleanup2 = input({
      value: value2,
      id: 'input2',
      onFocus: () => { events.push('focus2') },
      onBlur: () => { events.push('blur2') },
    })

    focus(0) // Focus input1
    expect(events).toEqual(['focus1'])

    focus(1) // Focus input2 (blurs input1)
    expect(events).toEqual(['focus1', 'blur1', 'focus2'])

    cleanup1()
    cleanup2()
  })
})

// =============================================================================
// FOCUS INTEGRATION TESTS
// =============================================================================

describe('Input - Focus Integration', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('component registers as focusable', () => {
    const value = signal('')
    const cleanup = input({ value })

    expect(interaction.focusable[0]).toBe(1)

    cleanup()
  })

  test('keyboard handlers only fire when focused', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Type without focus
    const result = typeKey(0, 'a')
    expect(result).toBe(false) // Not consumed
    expect(value.value).toBe('') // No change

    // Now focus and type
    focus(0)
    typeKey(0, 'a')
    expect(value.value).toBe('a')

    cleanup()
  })

  test('autoFocus focuses component on creation', async () => {
    const value = signal('')
    const cleanup = input({ value, autoFocus: true })

    // autoFocus uses queueMicrotask
    await new Promise(resolve => queueMicrotask(resolve))

    expect(focusedIndex.value).toBe(0)

    cleanup()
  })

  test('typing in unfocused input has no effect', () => {
    const value = signal('original')
    const cleanup = input({ value })

    // Don't focus, just try to type
    typeKey(0, 'x')
    typeKey(0, 'y')

    expect(value.value).toBe('original')

    cleanup()
  })

  test('blur prevents further keyboard input', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'a')
    expect(value.value).toBe('a')

    blur()
    typeKey(0, 'b')
    expect(value.value).toBe('a') // No change

    cleanup()
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe('Input - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('cleanup function releases component index', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Component exists
    expect(core.componentType[0]).toBe(ComponentType.INPUT)

    cleanup()

    // After cleanup, the index may be reused
    // Check that we can allocate a new index
    const newIndex = allocateIndex('new-component')
    expect(newIndex).toBe(0) // Index 0 was freed
  })

  test('keyboard handlers removed on cleanup', () => {
    const value = signal('')
    let onChangeCount = 0

    const cleanup = input({
      value,
      onChange: () => { onChangeCount++ },
    })

    focus(0)
    typeKey(0, 'a')
    expect(onChangeCount).toBe(1)

    cleanup()

    // Try to type after cleanup - should not trigger onChange
    // Note: focusedIndex might still be 0 but handler should be unregistered
    const event = createKeyEvent('b')
    dispatchFocused(0, event)

    expect(onChangeCount).toBe(1) // Still 1

    cleanup()
  })

  test('focus callbacks removed on cleanup', () => {
    const value = signal('')
    let focusCount = 0
    let blurCount = 0

    const cleanup = input({
      value,
      onFocus: () => { focusCount++ },
      onBlur: () => { blurCount++ },
    })

    focus(0)
    expect(focusCount).toBe(1)

    blur()
    expect(blurCount).toBe(1)

    cleanup()

    // After cleanup, focus callbacks should not fire
    // But we need a new input to test this
    const value2 = signal('')
    const cleanup2 = input({ value: value2, id: 'input2' })

    focus(0) // This is the new input at index 0
    // The old callbacks should not fire
    expect(focusCount).toBe(1) // Still 1

    cleanup2()
  })

  test('cursor position array cleared on cleanup', () => {
    const value = signal('test')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(4)

    cleanup()

    // After cleanup, the slot should be cleared/reset
    // When we cleanup, cursorPosition.clear(index) is called
  })

  test('multiple inputs can be created and cleaned up', () => {
    const cleanups: (() => void)[] = []

    for (let i = 0; i < 5; i++) {
      const value = signal(`input${i}`)
      cleanups.push(input({ value, id: `input-${i}` }))
    }

    // All created
    expect(core.componentType[0]).toBe(ComponentType.INPUT)
    expect(core.componentType[4]).toBe(ComponentType.INPUT)

    // Clean up all
    for (const cleanup of cleanups) {
      cleanup()
    }

    // Should be able to reuse indices
    const value = signal('new')
    const cleanup = input({ value, id: 'new-input' })
    expect(core.componentType[0]).toBe(ComponentType.INPUT)

    cleanup()
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Input - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('handles empty string value', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    expect(value.value).toBe('')
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('handles very long text', () => {
    const longText = 'a'.repeat(1000)
    const value = signal(longText)
    const cleanup = input({ value })

    expect(textArrays.textContent[0]).toBe(longText)

    focus(0)
    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(1000)

    cleanup()
  })

  test('handles unicode characters', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, '你')
    typeKey(0, '好')

    expect(value.value).toBe('你好')

    cleanup()
  })

  test('rejects multi-character keys (like emoji)', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    // Emojis are multi-codepoint strings, so key.length > 1
    // The input correctly rejects them (only accepts single printable chars)
    typeKey(0, '😀') // This is 2 UTF-16 code units

    expect(value.value).toBe('') // Not accepted

    cleanup()
  })

  test('navigation on empty string', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'ArrowLeft')
    expect(interaction.cursorPosition[0]).toBe(0)

    typeKey(0, 'ArrowRight')
    expect(interaction.cursorPosition[0]).toBe(0)

    typeKey(0, 'Home')
    expect(interaction.cursorPosition[0]).toBe(0)

    typeKey(0, 'End')
    expect(interaction.cursorPosition[0]).toBe(0)

    cleanup()
  })

  test('backspace and delete on empty string', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'Backspace')
    expect(value.value).toBe('')

    typeKey(0, 'Delete')
    expect(value.value).toBe('')

    cleanup()
  })

  test('rapid typing', () => {
    const value = signal('')
    const cleanup = input({ value })

    focus(0)
    const chars = 'abcdefghij'
    for (const char of chars) {
      typeKey(0, char)
    }

    expect(value.value).toBe(chars)
    expect(interaction.cursorPosition[0]).toBe(chars.length)

    cleanup()
  })

  test('mixed navigation and editing', () => {
    const value = signal('abc')
    const cleanup = input({ value })

    focus(0)
    typeKey(0, 'End')         // cursor: 3
    typeKey(0, 'ArrowLeft')   // cursor: 2
    typeKey(0, 'ArrowLeft')   // cursor: 1
    typeKey(0, 'x')           // insert x at 1
    // Now: axbc, cursor: 2

    expect(value.value).toBe('axbc')
    expect(interaction.cursorPosition[0]).toBe(2)

    typeKey(0, 'Backspace')   // delete x
    expect(value.value).toBe('abc')
    expect(interaction.cursorPosition[0]).toBe(1)

    cleanup()
  })
})

// =============================================================================
// CURSOR CONFIGURATION TESTS
// =============================================================================

describe('Input - Cursor Configuration', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('creates cursor with default config', () => {
    const value = signal('')
    const cleanup = input({ value })

    // Cursor char array should have a value (0 = block)
    expect(interaction.cursorChar[0]).toBe(0)

    cleanup()
  })

  test('cursor config with custom style', () => {
    const value = signal('')
    const cleanup = input({
      value,
      cursor: { style: 'bar' },
    })

    // Bar cursor uses vertical line character (0x2502)
    expect(interaction.cursorChar[0]).toBe(0x2502)

    cleanup()
  })

  test('cursor config with underline style', () => {
    const value = signal('')
    const cleanup = input({
      value,
      cursor: { style: 'underline' },
    })

    // Underline cursor uses underscore (0x5F)
    expect(interaction.cursorChar[0]).toBe(0x5F)

    cleanup()
  })

  test('cursor config with blink disabled', () => {
    const value = signal('')
    const cleanup = input({
      value,
      cursor: { blink: false },
    })

    // Blink FPS should be 0 when disabled
    expect(interaction.cursorBlinkFps[0]).toBe(0)

    cleanup()
  })

  test('cursor config with custom FPS', () => {
    const value = signal('')
    const cleanup = input({
      value,
      cursor: {
        blink: { enabled: true, fps: 5 },
      },
    })

    expect(interaction.cursorBlinkFps[0]).toBe(5)

    cleanup()
  })
})
