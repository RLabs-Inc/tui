/**
 * TUI Framework - Focus Manager Tests
 *
 * Tests for focus state and navigation:
 * - Focus state management
 * - Tab navigation (next/previous)
 * - Focus first/last
 * - Focus history and restoration
 * - Focus trapping for modals
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { bind, unwrap } from '@rlabs-inc/signals'

import {
  focusedIndex,
  focusNext,
  focusPrevious,
  focus,
  blur,
  focusFirst,
  focusLast,
  getFocusableIndices,
  hasFocus,
  isFocused,
  pushFocusTrap,
  popFocusTrap,
  isFocusTrapped,
  getFocusTrapContainer,
  saveFocusToHistory,
  restoreFocusFromHistory,
  resetFocusState,
} from '../src/state/focus'

import { allocateIndex, resetRegistry, releaseIndex } from '../src/engine/registry'
import * as core from '../src/engine/arrays/core'
import * as interaction from '../src/engine/arrays/interaction'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { ComponentType } from '../src/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  // Reset all focus state (including trap stack and history)
  resetFocusState()
  // Reset registry
  resetRegistry()
  // Reset arrays
  resetAllArrays()
  resetTitanArrays()
}

/** Create a focusable component */
function createFocusable(tabIndexValue: number = 0): number {
  const idx = allocateIndex()
  core.ensureCapacity(idx)
  interaction.ensureCapacity(idx)

  core.componentType[idx] = ComponentType.BOX
  core.visible[idx] = bind(true)
  interaction.focusable[idx] = bind(true)
  interaction.tabIndex[idx] = bind(tabIndexValue)

  return idx
}

/** Create a non-focusable component */
function createNonFocusable(): number {
  const idx = allocateIndex()
  core.ensureCapacity(idx)
  interaction.ensureCapacity(idx)

  core.componentType[idx] = ComponentType.BOX
  core.visible[idx] = bind(true)
  interaction.focusable[idx] = bind(false)
  interaction.tabIndex[idx] = bind(0)

  return idx
}

// =============================================================================
// FOCUS STATE TESTS
// =============================================================================

describe('Focus Manager - State', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('focusedIndex starts at -1', () => {
    expect(focusedIndex.value).toBe(-1)
  })

  test('hasFocus reflects focusedIndex', () => {
    expect(hasFocus.value).toBe(false)

    const idx = createFocusable()
    focus(idx)

    expect(hasFocus.value).toBe(true)
  })

  test('isFocused returns true for focused component', () => {
    const idx = createFocusable()
    focus(idx)

    expect(isFocused(idx)).toBe(true)
  })

  test('isFocused returns false for unfocused component', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()
    focus(idx1)

    expect(isFocused(idx2)).toBe(false)
  })
})

// =============================================================================
// FOCUS NAVIGATION TESTS
// =============================================================================

describe('Focus Manager - Navigation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('focus() sets focusedIndex for focusable component', () => {
    const idx = createFocusable()
    const result = focus(idx)

    expect(result).toBe(true)
    expect(focusedIndex.value).toBe(idx)
  })

  test('focus() returns false for non-focusable component', () => {
    const idx = createNonFocusable()
    const result = focus(idx)

    expect(result).toBe(false)
    expect(focusedIndex.value).toBe(-1)
  })

  test('blur() clears focus', () => {
    const idx = createFocusable()
    focus(idx)
    expect(focusedIndex.value).toBe(idx)

    blur()
    expect(focusedIndex.value).toBe(-1)
  })

  test('focusNext() moves to next focusable', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()
    const idx3 = createFocusable()

    focus(idx1)
    focusNext()

    expect(focusedIndex.value).toBe(idx2)

    focusNext()
    expect(focusedIndex.value).toBe(idx3)
  })

  test('focusNext() wraps around', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    focus(idx2) // Start at last
    focusNext()

    expect(focusedIndex.value).toBe(idx1) // Wrapped to first
  })

  test('focusPrevious() moves to previous focusable', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()
    const idx3 = createFocusable()

    focus(idx3)
    focusPrevious()

    expect(focusedIndex.value).toBe(idx2)

    focusPrevious()
    expect(focusedIndex.value).toBe(idx1)
  })

  test('focusPrevious() wraps around', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    focus(idx1) // Start at first
    focusPrevious()

    expect(focusedIndex.value).toBe(idx2) // Wrapped to last
  })

  test('focusFirst() focuses first focusable', () => {
    const idx1 = createFocusable()
    createFocusable()
    createFocusable()

    const result = focusFirst()

    expect(result).toBe(true)
    expect(focusedIndex.value).toBe(idx1)
  })

  test('focusLast() focuses last focusable', () => {
    createFocusable()
    createFocusable()
    const idx3 = createFocusable()

    const result = focusLast()

    expect(result).toBe(true)
    expect(focusedIndex.value).toBe(idx3)
  })

  test('focusFirst() returns false when no focusables', () => {
    createNonFocusable()
    createNonFocusable()

    const result = focusFirst()

    expect(result).toBe(false)
    expect(focusedIndex.value).toBe(-1)
  })
})

// =============================================================================
// TAB INDEX SORTING TESTS
// =============================================================================

describe('Focus Manager - Tab Index Sorting', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('getFocusableIndices returns focusable components', () => {
    const idx1 = createFocusable()
    createNonFocusable()
    const idx3 = createFocusable()

    const focusables = getFocusableIndices()

    expect(focusables).toContain(idx1)
    expect(focusables).toContain(idx3)
    expect(focusables.length).toBe(2)
  })

  test('getFocusableIndices sorts by tabIndex', () => {
    const idx1 = createFocusable(2) // tabIndex 2
    const idx2 = createFocusable(1) // tabIndex 1
    const idx3 = createFocusable(0) // tabIndex 0

    const focusables = getFocusableIndices()

    // Should be sorted: idx3 (0), idx2 (1), idx1 (2)
    expect(focusables[0]).toBe(idx3)
    expect(focusables[1]).toBe(idx2)
    expect(focusables[2]).toBe(idx1)
  })

  test('navigation follows tabIndex order', () => {
    const idx1 = createFocusable(2)
    const idx2 = createFocusable(1)
    const idx3 = createFocusable(0)

    focusFirst() // Should focus idx3 (tabIndex 0)
    expect(focusedIndex.value).toBe(idx3)

    focusNext() // Should move to idx2 (tabIndex 1)
    expect(focusedIndex.value).toBe(idx2)

    focusNext() // Should move to idx1 (tabIndex 2)
    expect(focusedIndex.value).toBe(idx1)
  })
})

// =============================================================================
// FOCUS HISTORY TESTS
// =============================================================================

describe('Focus Manager - History', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('saveFocusToHistory stores current focus', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    focus(idx1)
    saveFocusToHistory()
    focus(idx2)

    // Now restore should go back to idx1
    const result = restoreFocusFromHistory()
    expect(result).toBe(true)
    expect(focusedIndex.value).toBe(idx1)
  })

  test('focus() automatically saves to history', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    focus(idx1)
    focus(idx2) // This should save idx1 to history

    // Restore should go back to idx1
    restoreFocusFromHistory()
    expect(focusedIndex.value).toBe(idx1)
  })

  test('restoreFocusFromHistory returns false when history empty', () => {
    const result = restoreFocusFromHistory()
    expect(result).toBe(false)
  })

  test('restoreFocusFromHistory skips destroyed components', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    focus(idx1)
    focus(idx2)

    // Destroy idx1's focusability
    interaction.focusable.setSource(idx1, false)

    // Restore should skip idx1 (no longer focusable)
    restoreFocusFromHistory()
    // History exhausted, focus unchanged
  })
})

// =============================================================================
// FOCUS TRAP TESTS
// =============================================================================

describe('Focus Manager - Focus Trapping', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('pushFocusTrap sets trap', () => {
    expect(isFocusTrapped()).toBe(false)

    pushFocusTrap(5)

    expect(isFocusTrapped()).toBe(true)
    expect(getFocusTrapContainer()).toBe(5)
  })

  test('popFocusTrap removes trap', () => {
    pushFocusTrap(5)
    expect(isFocusTrapped()).toBe(true)

    const popped = popFocusTrap()

    expect(popped).toBe(5)
    expect(isFocusTrapped()).toBe(false)
  })

  test('focus traps stack', () => {
    pushFocusTrap(1)
    pushFocusTrap(2)
    pushFocusTrap(3)

    expect(getFocusTrapContainer()).toBe(3)

    popFocusTrap()
    expect(getFocusTrapContainer()).toBe(2)

    popFocusTrap()
    expect(getFocusTrapContainer()).toBe(1)

    popFocusTrap()
    expect(isFocusTrapped()).toBe(false)
  })
})

// =============================================================================
// VISIBILITY TESTS
// =============================================================================

describe('Focus Manager - Visibility', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('invisible components are not focusable', () => {
    const idx1 = createFocusable()
    const idx2 = createFocusable()

    // Make idx1 invisible
    core.visible.setSource(idx1, false)

    const focusables = getFocusableIndices()

    expect(focusables).not.toContain(idx1)
    expect(focusables).toContain(idx2)
  })

  test('focus() fails for invisible component', () => {
    const idx = createFocusable()
    core.visible.setSource(idx, false)

    const result = focus(idx)

    expect(result).toBe(false)
    expect(focusedIndex.value).toBe(-1)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Focus Manager - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('navigation with single focusable stays on same', () => {
    const idx = createFocusable()
    focus(idx)

    focusNext()
    expect(focusedIndex.value).toBe(idx)

    focusPrevious()
    expect(focusedIndex.value).toBe(idx)
  })

  test('navigation with no focusables does nothing', () => {
    createNonFocusable()

    focusNext()
    expect(focusedIndex.value).toBe(-1)

    focusPrevious()
    expect(focusedIndex.value).toBe(-1)
  })

  test('focus same component twice does not duplicate history', () => {
    const idx = createFocusable()

    focus(idx)
    focus(idx) // Same component again

    // History should not have duplicates
    const result = restoreFocusFromHistory()
    // No prior different focus, so nothing to restore
    expect(result).toBe(false)
  })
})
