/**
 * TUI Framework - Show Primitive Tests
 *
 * Tests for the show() conditional rendering primitive.
 * Verifies reactive condition toggling, branch cleanup, and parent context inheritance.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, derived, effect, flushSync, unwrap } from '@rlabs-inc/signals'

import { show } from '../src/primitives/show'
import { box } from '../src/primitives/box'
import { text } from '../src/primitives/text'

import {
  resetRegistry,
  getAllocatedIndices,
  getAllocatedCount,
  pushParentContext,
  popParentContext,
  allocateIndex,
} from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import * as core from '../src/engine/arrays/core'
import * as textArrays from '../src/engine/arrays/text'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

// =============================================================================
// BASIC CONDITIONAL RENDERING TESTS
// =============================================================================

describe('Show - Basic Conditional Rendering', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('true condition renders then branch', () => {
    const cleanup = show(
      () => true,
      () => text({ content: 'visible' })
    )
    flushSync() // Flush internal effect to establish dependency

    // Should have one component rendered
    expect(getAllocatedCount()).toBe(1)

    cleanup()
  })

  test('false condition renders else branch when provided', () => {
    const cleanup = show(
      () => false,
      () => text({ content: 'then' }),
      () => text({ content: 'else' })
    )
    flushSync()

    // Should have one component (the else branch)
    expect(getAllocatedCount()).toBe(1)

    // Find the text content
    const indices = Array.from(getAllocatedIndices())
    const textContent = unwrap(textArrays.textContent[indices[0]!])
    expect(textContent).toBe('else')

    cleanup()
  })

  test('false condition with no else renders nothing', () => {
    const cleanup = show(
      () => false,
      () => text({ content: 'visible' })
    )
    flushSync()

    // Should have no components rendered
    expect(getAllocatedCount()).toBe(0)

    cleanup()
  })

  test('then branch returns cleanup function', () => {
    let thenCleanupCalled = false

    const cleanup = show(
      () => true,
      () => {
        text({ content: 'visible' })
        return () => { thenCleanupCalled = true }
      }
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    expect(thenCleanupCalled).toBe(false)

    // Disposing show should trigger branch cleanup
    cleanup()

    expect(thenCleanupCalled).toBe(true)
  })
})

// =============================================================================
// REACTIVE CONDITION TESTS
// =============================================================================

describe('Show - Reactive Condition', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('toggling condition swaps branches', () => {
    const isVisible = signal(true)

    const cleanup = show(
      () => isVisible.value,
      () => text({ content: 'shown' }),
      () => text({ content: 'hidden' })
    )
    flushSync() // Initial effect run

    // Initial: then branch
    expect(getAllocatedCount()).toBe(1)
    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('shown')

    // Toggle to false
    isVisible.value = false
    flushSync()

    // Now else branch
    expect(getAllocatedCount()).toBe(1)
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('hidden')

    // Toggle back to true
    isVisible.value = true
    flushSync()

    // Back to then branch
    expect(getAllocatedCount()).toBe(1)
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('shown')

    cleanup()
  })

  test('multiple toggles work correctly', () => {
    const condition = signal(false)

    const cleanup = show(
      () => condition.value,
      () => text({ content: 'on' }),
      () => text({ content: 'off' })
    )
    flushSync()

    // Toggle multiple times
    for (let i = 0; i < 5; i++) {
      condition.value = true
      flushSync()
      expect(getAllocatedCount()).toBe(1)
      let indices = Array.from(getAllocatedIndices())
      expect(unwrap(textArrays.textContent[indices[0]!])).toBe('on')

      condition.value = false
      flushSync()
      expect(getAllocatedCount()).toBe(1)
      indices = Array.from(getAllocatedIndices())
      expect(unwrap(textArrays.textContent[indices[0]!])).toBe('off')
    }

    cleanup()
  })

  test('condition as signal works', () => {
    const condition = signal(true)

    const cleanup = show(
      () => condition.value,
      () => text({ content: 'true' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)

    condition.value = false
    flushSync()
    expect(getAllocatedCount()).toBe(0)

    condition.value = true
    flushSync()
    expect(getAllocatedCount()).toBe(1)

    cleanup()
  })

  test('condition as derived works', () => {
    const count = signal(5)
    const isPositive = derived(() => count.value > 0)

    const cleanup = show(
      () => isPositive.value,
      () => text({ content: 'positive' }),
      () => text({ content: 'non-positive' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('positive')

    count.value = -1
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('non-positive')

    count.value = 10
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('positive')

    cleanup()
  })

  test('condition getter with external dependency works', () => {
    let externalValue = true

    const trigger = signal(0)

    const cleanup = show(
      () => {
        trigger.value // Create dependency
        return externalValue
      },
      () => text({ content: 'yes' }),
      () => text({ content: 'no' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('yes')

    externalValue = false
    trigger.value = 1 // Trigger re-evaluation
    flushSync()

    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('no')

    cleanup()
  })
})

// =============================================================================
// BRANCH CLEANUP TESTS
// =============================================================================

describe('Show - Branch Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('old branch cleaned up when condition changes', () => {
    const condition = signal(true)
    let thenCleanupCalled = false
    let elseCleanupCalled = false

    const cleanup = show(
      () => condition.value,
      () => {
        text({ content: 'then' })
        return () => { thenCleanupCalled = true }
      },
      () => {
        text({ content: 'else' })
        return () => { elseCleanupCalled = true }
      }
    )
    flushSync()

    // Initially then branch is rendered
    expect(thenCleanupCalled).toBe(false)
    expect(elseCleanupCalled).toBe(false)

    // Switch to else branch
    condition.value = false
    flushSync()

    // Then branch should be cleaned up
    expect(thenCleanupCalled).toBe(true)
    expect(elseCleanupCalled).toBe(false)

    // Reset for next test
    thenCleanupCalled = false

    // Switch back to then branch
    condition.value = true
    flushSync()

    // Else branch should be cleaned up
    expect(thenCleanupCalled).toBe(false)
    expect(elseCleanupCalled).toBe(true)

    cleanup()
  })

  test('resources released properly on dispose', () => {
    const condition = signal(true)

    const cleanup = show(
      () => condition.value,
      () => box({
        children: () => {
          text({ content: 'nested' })
        }
      })
    )
    flushSync()

    // Should have 2 components (box + text)
    expect(getAllocatedCount()).toBe(2)

    // Dispose
    cleanup()

    // All components should be released
    expect(getAllocatedCount()).toBe(0)
  })

  test('no memory leaks from repeated toggles', () => {
    const condition = signal(true)

    const cleanup = show(
      () => condition.value,
      () => text({ content: 'a' }),
      () => text({ content: 'b' })
    )
    flushSync()

    // Initial state
    expect(getAllocatedCount()).toBe(1)

    // Toggle many times
    for (let i = 0; i < 20; i++) {
      condition.value = !condition.value
      flushSync()
    }

    // Should still only have 1 component
    expect(getAllocatedCount()).toBe(1)

    cleanup()

    // Everything cleaned up
    expect(getAllocatedCount()).toBe(0)
  })

  test('nested components cleaned up properly', () => {
    const condition = signal(true)

    const cleanup = show(
      () => condition.value,
      () => box({
        children: () => {
          box({
            children: () => {
              text({ content: 'deep nested' })
            }
          })
        }
      })
    )
    flushSync()

    // Should have 3 components (box > box > text)
    expect(getAllocatedCount()).toBe(3)

    // Toggle off
    condition.value = false
    flushSync()

    // All components should be cleaned up
    expect(getAllocatedCount()).toBe(0)

    cleanup()
  })
})

// =============================================================================
// PARENT CONTEXT TESTS
// =============================================================================

describe('Show - Parent Context', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('children inherit correct parent index', () => {
    // Create a parent box first
    const parentCleanup = box({
      id: 'parent',
      children: () => {
        // show() inside box should maintain parent context
        show(
          () => true,
          () => text({ content: 'child', id: 'child' })
        )
      }
    })
    flushSync()

    // Should have parent box and child text
    expect(getAllocatedCount()).toBe(2)

    // Find indices
    const indices = Array.from(getAllocatedIndices())
    const parentIdx = indices.find(i => unwrap(core.componentId[i]) === 'parent')
    const childIdx = indices.find(i => unwrap(core.componentId[i]) === 'child')

    // Child should have parent as its parent
    expect(unwrap(core.parentIndex[childIdx!])).toBe(parentIdx)

    parentCleanup()
  })

  test('nested show() works correctly', () => {
    const outer = signal(true)
    const inner = signal(true)

    const cleanup = show(
      () => outer.value,
      () => {
        return show(
          () => inner.value,
          () => text({ content: 'inner visible' }),
          () => text({ content: 'inner hidden' })
        )
      },
      () => text({ content: 'outer hidden' })
    )
    flushSync()

    // Both true: inner visible
    expect(getAllocatedCount()).toBe(1)
    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('inner visible')

    // Outer true, inner false
    inner.value = false
    flushSync()
    expect(getAllocatedCount()).toBe(1)
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('inner hidden')

    // Outer false (inner doesn't matter)
    outer.value = false
    flushSync()
    expect(getAllocatedCount()).toBe(1)
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('outer hidden')

    cleanup()
  })

  test('show inside box inherits box parent correctly on toggle', () => {
    const condition = signal(false)

    const cleanup = box({
      id: 'container',
      children: () => {
        show(
          () => condition.value,
          () => text({ content: 'shown', id: 'shown-text' })
        )
      }
    })
    flushSync()

    // Just the box initially
    expect(getAllocatedCount()).toBe(1)

    // Toggle on
    condition.value = true
    flushSync()

    // Now box + text
    expect(getAllocatedCount()).toBe(2)

    // Verify parent relationship
    const indices = Array.from(getAllocatedIndices())
    const containerIdx = indices.find(i => unwrap(core.componentId[i]) === 'container')
    const textIdx = indices.find(i => unwrap(core.componentId[i]) === 'shown-text')

    expect(unwrap(core.parentIndex[textIdx!])).toBe(containerIdx)

    cleanup()
  })
})

// =============================================================================
// INITIAL STATE TESTS
// =============================================================================

describe('Show - Initial State', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('correct branch rendered on initial mount - true', () => {
    const cleanup = show(
      () => true,
      () => text({ content: 'initial-true' }),
      () => text({ content: 'initial-false' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    const indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('initial-true')

    cleanup()
  })

  test('correct branch rendered on initial mount - false', () => {
    const cleanup = show(
      () => false,
      () => text({ content: 'initial-true' }),
      () => text({ content: 'initial-false' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    const indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('initial-false')

    cleanup()
  })

  test('no double rendering on initial mount', () => {
    let thenRenderCount = 0
    let elseRenderCount = 0

    const cleanup = show(
      () => true,
      () => {
        thenRenderCount++
        return text({ content: 'then' })
      },
      () => {
        elseRenderCount++
        return text({ content: 'else' })
      }
    )
    flushSync()

    // Then branch should render exactly once
    expect(thenRenderCount).toBe(1)
    // Else branch should never render
    expect(elseRenderCount).toBe(0)

    cleanup()
  })
})

// =============================================================================
// EDGE CASES TESTS
// =============================================================================

describe('Show - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('rapid condition toggling', () => {
    const condition = signal(true)
    let renderCount = 0

    const cleanup = show(
      () => condition.value,
      () => {
        renderCount++
        return text({ content: 'on' })
      },
      () => {
        renderCount++
        return text({ content: 'off' })
      }
    )
    flushSync()

    const initialRenderCount = renderCount

    // Rapidly toggle
    for (let i = 0; i < 100; i++) {
      condition.value = !condition.value
      flushSync()
    }

    // Should have rendered 101 times total (1 initial + 100 toggles)
    expect(renderCount).toBe(initialRenderCount + 100)

    // Should still only have 1 component
    expect(getAllocatedCount()).toBe(1)

    cleanup()
  })

  test('truthy value 0 is treated as false', () => {
    const value = signal<number | boolean>(0)

    const cleanup = show(
      () => Boolean(value.value),
      () => text({ content: 'truthy' }),
      () => text({ content: 'falsy' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('falsy')

    value.value = 1
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('truthy')

    cleanup()
  })

  test('empty string is treated as falsy', () => {
    const value = signal('')

    const cleanup = show(
      () => Boolean(value.value),
      () => text({ content: 'truthy' }),
      () => text({ content: 'falsy' })
    )
    flushSync()

    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('falsy')

    value.value = 'hello'
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('truthy')

    cleanup()
  })

  test('null and undefined are treated as falsy', () => {
    const value = signal<string | null | undefined>(null)

    const cleanup = show(
      () => Boolean(value.value),
      () => text({ content: 'truthy' }),
      () => text({ content: 'falsy' })
    )
    flushSync()

    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('falsy')

    value.value = undefined
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('falsy')

    value.value = 'defined'
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('truthy')

    cleanup()
  })

  test('same condition value does not re-render', () => {
    const condition = signal(true)
    let renderCount = 0

    const cleanup = show(
      () => condition.value,
      () => {
        renderCount++
        return text({ content: 'shown' })
      }
    )
    flushSync()

    expect(renderCount).toBe(1)

    // Set to same value multiple times
    condition.value = true
    flushSync()
    condition.value = true
    flushSync()
    condition.value = true
    flushSync()

    // Should not re-render
    expect(renderCount).toBe(1)

    cleanup()
  })
})

// =============================================================================
// SCOPE MANAGEMENT TESTS
// =============================================================================

describe('Show - Scope Management', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('effectScope properly stopped on dispose', () => {
    const condition = signal(true)
    let effectRunCount = 0

    const cleanup = show(
      () => condition.value,
      () => {
        effectRunCount++
        return text({ content: 'test' })
      }
    )
    flushSync()

    expect(effectRunCount).toBe(1)

    // Dispose the show
    cleanup()

    // Toggle condition - should not trigger effect
    condition.value = false
    flushSync()
    condition.value = true
    flushSync()

    // Effect should not have run again (scope stopped)
    expect(effectRunCount).toBe(1)
  })

  test('cleanup function returned works', () => {
    const cleanup = show(
      () => true,
      () => text({ content: 'test' })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(1)
    expect(typeof cleanup).toBe('function')

    cleanup()

    expect(getAllocatedCount()).toBe(0)
  })

  test('multiple show() instances are independent', () => {
    const conditionA = signal(true)
    const conditionB = signal(false)

    const cleanupA = show(
      () => conditionA.value,
      () => text({ content: 'A-shown' }),
      () => text({ content: 'A-hidden' })
    )

    const cleanupB = show(
      () => conditionB.value,
      () => text({ content: 'B-shown' }),
      () => text({ content: 'B-hidden' })
    )
    flushSync()

    // A is shown, B is hidden
    expect(getAllocatedCount()).toBe(2)
    let indices = Array.from(getAllocatedIndices())
    const contents = indices.map(i => unwrap(textArrays.textContent[i]))
    expect(contents).toContain('A-shown')
    expect(contents).toContain('B-hidden')

    // Toggle A
    conditionA.value = false
    flushSync()
    indices = Array.from(getAllocatedIndices())
    const contentsAfterA = indices.map(i => unwrap(textArrays.textContent[i]))
    expect(contentsAfterA).toContain('A-hidden')
    expect(contentsAfterA).toContain('B-hidden')

    // Toggle B (A should stay)
    conditionB.value = true
    flushSync()
    indices = Array.from(getAllocatedIndices())
    const contentsAfterB = indices.map(i => unwrap(textArrays.textContent[i]))
    expect(contentsAfterB).toContain('A-hidden')
    expect(contentsAfterB).toContain('B-shown')

    cleanupA()
    cleanupB()
  })

  test('cleanup disposes all nested components', () => {
    const cleanup = show(
      () => true,
      () => box({
        children: () => {
          box({
            children: () => {
              text({ content: 'level 3' })
            }
          })
          text({ content: 'level 2' })
        }
      })
    )
    flushSync()

    // 1 outer box + 1 inner box + 2 texts = 4 components
    expect(getAllocatedCount()).toBe(4)

    cleanup()

    expect(getAllocatedCount()).toBe(0)
  })
})

// =============================================================================
// PRACTICAL USE CASES
// =============================================================================

describe('Show - Practical Use Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('loading state pattern', () => {
    const isLoading = signal(true)

    const cleanup = show(
      () => isLoading.value,
      () => text({ content: 'Loading...' }),
      () => text({ content: 'Content loaded!' })
    )
    flushSync()

    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('Loading...')

    isLoading.value = false
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('Content loaded!')

    cleanup()
  })

  test('auth state pattern', () => {
    const user = signal<{ name: string } | null>(null)

    const cleanup = show(
      () => user.value !== null,
      () => text({ content: `Welcome, ${user.value?.name}!` }),
      () => text({ content: 'Please log in' })
    )
    flushSync()

    let indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('Please log in')

    user.value = { name: 'Alice' }
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('Welcome, Alice!')

    user.value = null
    flushSync()
    indices = Array.from(getAllocatedIndices())
    expect(unwrap(textArrays.textContent[indices[0]!])).toBe('Please log in')

    cleanup()
  })

  test('feature flag pattern', () => {
    const features = signal({ darkMode: false, betaFeatures: true })

    const cleanup = show(
      () => features.value.betaFeatures,
      () => box({
        children: () => {
          text({ content: 'Beta Feature Panel' })
        }
      })
    )
    flushSync()

    expect(getAllocatedCount()).toBe(2) // box + text

    features.value = { ...features.value, betaFeatures: false }
    flushSync()
    expect(getAllocatedCount()).toBe(0)

    cleanup()
  })
})
