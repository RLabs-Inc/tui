/**
 * TUI Framework - Focus State Module
 *
 * Manages focus state and navigation:
 * - focusedIndex signal (currently focused component)
 * - Focus cycling (Tab/Shift+Tab)
 * - Focus trapping for modals
 * - Focus history for restoration
 */

import { signal, derived, unwrap } from '@rlabs-inc/signals'
import { focusable, tabIndex, focusedIndex as _focusedIndex } from '../engine/arrays/interaction'
import { visible } from '../engine/arrays/core'
import { getAllocatedIndices } from '../engine/registry'

// Re-export the focusedIndex from interaction arrays
export const focusedIndex = _focusedIndex

// =============================================================================
// FOCUS TRAP (for modals/dialogs)
// =============================================================================

const focusTrapStack: number[] = []

/** Push a focus trap - focus will be contained within this component's children */
export function pushFocusTrap(containerIndex: number): void {
  focusTrapStack.push(containerIndex)
}

/** Pop the current focus trap */
export function popFocusTrap(): number | undefined {
  return focusTrapStack.pop()
}

/** Check if focus is currently trapped */
export function isFocusTrapped(): boolean {
  return focusTrapStack.length > 0
}

/** Get the current focus trap container */
export function getFocusTrapContainer(): number | undefined {
  return focusTrapStack[focusTrapStack.length - 1]
}

// =============================================================================
// FOCUS HISTORY (for restoration)
// =============================================================================

const focusHistory: number[] = []
const MAX_HISTORY = 10

/** Save current focus to history */
export function saveFocusToHistory(): void {
  const current = focusedIndex.value
  if (current >= 0) {
    focusHistory.push(current)
    if (focusHistory.length > MAX_HISTORY) {
      focusHistory.shift()
    }
  }
}

/** Restore focus from history */
export function restoreFocusFromHistory(): boolean {
  while (focusHistory.length > 0) {
    const index = focusHistory.pop()!
    // Check if component is still valid and focusable
    if (unwrap(focusable[index]) && unwrap(visible[index])) {
      focusedIndex.value = index
      return true
    }
  }
  return false
}

// =============================================================================
// FOCUSABLE QUERIES
// =============================================================================

/** Get all focusable component indices, sorted by tabIndex */
export function getFocusableIndices(): number[] {
  const indices = getAllocatedIndices()
  const result: number[] = []

  for (const i of indices) {
    if (unwrap(focusable[i]) && unwrap(visible[i])) {
      result.push(i)
    }
  }

  // Sort by tabIndex (components with same tabIndex keep allocation order)
  result.sort((a, b) => {
    const tabA = unwrap(tabIndex[a]) ?? 0
    const tabB = unwrap(tabIndex[b]) ?? 0
    if (tabA !== tabB) return tabA - tabB
    return a - b // Stable sort by index
  })

  return result
}

/** Derived: all focusable indices */
export const focusableIndices = derived(getFocusableIndices)

/** Derived: is any component focused */
export const hasFocus = derived(() => focusedIndex.value >= 0)

/** Derived: is specific component focused */
export function isFocused(index: number): boolean {
  return focusedIndex.value === index
}

// =============================================================================
// FOCUS NAVIGATION
// =============================================================================

/** Find next focusable component */
function findNextFocusable(fromIndex: number, direction: 1 | -1): number {
  let focusables = getFocusableIndices()

  // Apply focus trap if active
  if (isFocusTrapped()) {
    const trapContainer = getFocusTrapContainer()
    // In a real implementation, we'd filter to children of trapContainer
    // For now, this is a placeholder
  }

  if (focusables.length === 0) return -1

  const currentPos = focusables.indexOf(fromIndex)

  if (currentPos === -1) {
    // Not currently focused on a focusable
    return direction === 1 ? focusables[0]! : focusables[focusables.length - 1]!
  }

  // Move in direction with wrap
  const nextPos = (currentPos + direction + focusables.length) % focusables.length
  return focusables[nextPos]!
}

/** Move focus to next focusable component */
export function focusNext(): boolean {
  const next = findNextFocusable(focusedIndex.value, 1)
  if (next !== -1 && next !== focusedIndex.value) {
    saveFocusToHistory()
    focusedIndex.value = next
    return true
  }
  return false
}

/** Move focus to previous focusable component */
export function focusPrevious(): boolean {
  const prev = findNextFocusable(focusedIndex.value, -1)
  if (prev !== -1 && prev !== focusedIndex.value) {
    saveFocusToHistory()
    focusedIndex.value = prev
    return true
  }
  return false
}

/** Focus a specific component by index */
export function focus(index: number): boolean {
  if (unwrap(focusable[index]) && unwrap(visible[index])) {
    if (focusedIndex.value !== index) {
      saveFocusToHistory()
      focusedIndex.value = index
    }
    return true
  }
  return false
}

/** Clear focus (no component focused) */
export function blur(): void {
  if (focusedIndex.value >= 0) {
    saveFocusToHistory()
    focusedIndex.value = -1
  }
}

/** Focus the first focusable component */
export function focusFirst(): boolean {
  const focusables = getFocusableIndices()
  if (focusables.length > 0) {
    return focus(focusables[0]!)
  }
  return false
}

/** Focus the last focusable component */
export function focusLast(): boolean {
  const focusables = getFocusableIndices()
  if (focusables.length > 0) {
    return focus(focusables[focusables.length - 1]!)
  }
  return false
}

// =============================================================================
// EXPORT
// =============================================================================

export const focusManager = {
  // State
  get focusedIndex() { return focusedIndex.value },
  get hasFocus() { return hasFocus.value },
  get focusableIndices() { return focusableIndices.value },
  isFocused,

  // Navigation
  focusNext,
  focusPrevious,
  focus,
  blur,
  focusFirst,
  focusLast,

  // Focus trap
  pushFocusTrap,
  popFocusTrap,
  isFocusTrapped,
  getFocusTrapContainer,

  // History
  saveFocusToHistory,
  restoreFocusFromHistory,
}
