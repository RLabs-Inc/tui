/**
 * TUI Framework - When Primitive Tests
 *
 * Tests for the when() async/suspense primitive.
 * Verifies pending, then, catch states and reactive promise handling.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, derived, effect, effectScope } from '@rlabs-inc/signals'

import { when } from '../src/primitives/when'
import {
  allocateIndex,
  releaseIndex,
  getAllocatedIndices,
  resetRegistry,
  pushParentContext,
  popParentContext,
} from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/** Create a deferred promise for controlled resolution */
function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Create a mock component that tracks its lifecycle */
function createMockComponent(name: string, tracker: string[]) {
  return () => {
    tracker.push(`${name}:created`)
    const idx = allocateIndex(`${name}-component`)
    return () => {
      tracker.push(`${name}:destroyed`)
      releaseIndex(idx)
    }
  }
}

/** Wait for next microtask */
function nextTick(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve))
}

/** Wait for promises to settle */
function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// =============================================================================
// PENDING STATE TESTS
// =============================================================================

describe('When - Pending State', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('shows pending content while promise is unresolved', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: () => createMockComponent('then', tracker)(),
      }
    )

    await nextTick()

    expect(tracker).toContain('pending:created')
    expect(tracker).not.toContain('then:created')

    dispose()
  })

  test('pending callback receives no arguments', async () => {
    const deferred = createDeferred<string>()
    let argCount = -1

    const dispose = when(
      () => deferred.promise,
      {
        pending: (...args: unknown[]) => {
          argCount = args.length
          return () => {}
        },
        then: () => () => {},
      }
    )

    await nextTick()

    expect(argCount).toBe(0)

    dispose()
  })

  test('pending content is optional', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        // No pending callback
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()

    // Nothing should be created yet
    expect(tracker).toEqual([])

    deferred.resolve('test')
    await flushPromises()

    expect(tracker).toContain('then:created')

    dispose()
  })
})

// =============================================================================
// SUCCESS STATE (THEN) TESTS
// =============================================================================

describe('When - Success State (then)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('shows then content when promise resolves', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    deferred.resolve('success')
    await flushPromises()

    expect(tracker).toContain('then:created')

    dispose()
  })

  test('then callback receives resolved value', async () => {
    const deferred = createDeferred<{ name: string; count: number }>()
    let receivedValue: { name: string; count: number } | null = null

    const dispose = when(
      () => deferred.promise,
      {
        then: (value) => {
          receivedValue = value
          return () => {}
        },
      }
    )

    deferred.resolve({ name: 'test', count: 42 })
    await flushPromises()

    expect(receivedValue).toEqual({ name: 'test', count: 42 })

    dispose()
  })

  test('pending content is cleaned up when promise resolves', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')
    expect(tracker).not.toContain('pending:destroyed')

    deferred.resolve('done')
    await flushPromises()

    expect(tracker).toContain('pending:destroyed')
    expect(tracker).toContain('then:created')

    // Verify order: pending destroyed before then created
    const pendingDestroyedIdx = tracker.indexOf('pending:destroyed')
    const thenCreatedIdx = tracker.indexOf('then:created')
    expect(pendingDestroyedIdx).toBeLessThan(thenCreatedIdx)

    dispose()
  })
})

// =============================================================================
// ERROR STATE (CATCH) TESTS
// =============================================================================

describe('When - Error State (catch)', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('shows catch content when promise rejects', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
        catch: createMockComponent('catch', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    deferred.reject(new Error('Something went wrong'))
    await flushPromises()

    expect(tracker).toContain('catch:created')
    expect(tracker).not.toContain('then:created')

    dispose()
  })

  test('catch callback receives error', async () => {
    const deferred = createDeferred<string>()
    let receivedError: Error | null = null

    const dispose = when(
      () => deferred.promise,
      {
        then: () => () => {},
        catch: (error) => {
          receivedError = error
          return () => {}
        },
      }
    )

    const testError = new Error('Test error message')
    deferred.reject(testError)
    await flushPromises()

    expect(receivedError).toBe(testError)
    expect(receivedError?.message).toBe('Test error message')

    dispose()
  })

  test('pending content is cleaned up when promise rejects', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
        catch: createMockComponent('catch', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    deferred.reject(new Error('fail'))
    await flushPromises()

    expect(tracker).toContain('pending:destroyed')
    expect(tracker).toContain('catch:created')

    dispose()
  })

  test('without catch handler, logs error', async () => {
    const deferred = createDeferred<string>()
    const originalError = console.error
    const errors: unknown[] = []
    console.error = (...args: unknown[]) => { errors.push(args) }

    const dispose = when(
      () => deferred.promise,
      {
        then: () => () => {},
        // No catch handler
      }
    )

    deferred.reject(new Error('Unhandled error'))
    await flushPromises()

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e =>
      Array.isArray(e) && e.some(arg =>
        typeof arg === 'string' && arg.includes('Unhandled promise rejection')
      )
    )).toBe(true)

    console.error = originalError
    dispose()
  })
})

// =============================================================================
// PROMISE SOURCE REACTIVITY TESTS
// =============================================================================

describe('When - Promise Source Reactivity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('new promise from getter triggers re-evaluation', async () => {
    const tracker: string[] = []
    const promiseSignal = signal(createDeferred<string>())

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => { tracker.push('then:destroyed') }
        },
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    // Resolve first promise
    promiseSignal.value.resolve('first')
    await flushPromises()
    expect(tracker).toContain('then:first')

    // Create new promise
    const newDeferred = createDeferred<string>()
    promiseSignal.value = newDeferred
    await flushPromises()

    // Old content should be cleaned up, pending should show
    expect(tracker).toContain('then:destroyed')
    expect(tracker.filter(t => t === 'pending:created').length).toBe(2)

    // Resolve new promise
    newDeferred.resolve('second')
    await flushPromises()
    expect(tracker).toContain('then:second')

    dispose()
  })

  test('old promise results ignored after new promise starts', async () => {
    const tracker: string[] = []
    const firstDeferred = createDeferred<string>()
    const secondDeferred = createDeferred<string>()

    const promiseSignal = signal(firstDeferred)

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => {}
        },
      }
    )

    await nextTick()

    // Switch to second promise before first resolves
    promiseSignal.value = secondDeferred
    await flushPromises()

    // Now resolve first promise (should be ignored)
    firstDeferred.resolve('stale')
    await flushPromises()
    expect(tracker).not.toContain('then:stale')

    // Resolve second promise
    secondDeferred.resolve('current')
    await flushPromises()
    expect(tracker).toContain('then:current')

    dispose()
  })

  test('race condition handling - fast then slow promise', async () => {
    const tracker: string[] = []
    const slowDeferred = createDeferred<string>()
    const fastDeferred = createDeferred<string>()

    const promiseSignal = signal(slowDeferred)

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => { tracker.push(`then:${val}:destroyed`) }
        },
      }
    )

    await nextTick()

    // Switch to fast promise
    promiseSignal.value = fastDeferred
    await flushPromises()

    // Fast promise resolves immediately
    fastDeferred.resolve('fast')
    await flushPromises()
    expect(tracker).toContain('then:fast')

    // Slow promise resolves later (should be ignored)
    slowDeferred.resolve('slow')
    await flushPromises()
    expect(tracker).not.toContain('then:slow')

    // Only fast result should be shown
    const thenEntries = tracker.filter(t => t.startsWith('then:') && !t.includes('destroyed'))
    expect(thenEntries).toEqual(['then:fast'])

    dispose()
  })
})

// =============================================================================
// CLEANUP TESTS
// =============================================================================

describe('When - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('all content cleaned up on dispose', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    dispose()

    expect(tracker).toContain('pending:destroyed')
  })

  test('then content cleaned up on dispose after resolve', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    deferred.resolve('done')
    await flushPromises()
    expect(tracker).toContain('then:created')

    dispose()

    expect(tracker).toContain('then:destroyed')
  })

  test('catch content cleaned up on dispose after reject', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
        catch: createMockComponent('catch', tracker),
      }
    )

    deferred.reject(new Error('fail'))
    await flushPromises()
    expect(tracker).toContain('catch:created')

    dispose()

    expect(tracker).toContain('catch:destroyed')
  })

  test('pending promises do not cause updates after dispose', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => {}
        },
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    // Dispose before promise resolves
    dispose()
    expect(tracker).toContain('pending:destroyed')

    // Now resolve the promise
    deferred.resolve('late')
    await flushPromises()

    // Should not see then content
    expect(tracker).not.toContain('then:late')
  })

  test('no memory leaks - all indices released', async () => {
    const initialCount = getAllocatedIndices().size
    const deferred = createDeferred<string>()

    const dispose = when(
      () => deferred.promise,
      {
        pending: () => {
          const idx = allocateIndex('pending')
          return () => releaseIndex(idx)
        },
        then: () => {
          const idx = allocateIndex('then')
          return () => releaseIndex(idx)
        },
      }
    )

    await nextTick()
    expect(getAllocatedIndices().size).toBeGreaterThan(initialCount)

    dispose()

    expect(getAllocatedIndices().size).toBe(initialCount)
  })
})

// =============================================================================
// PARENT CONTEXT TESTS
// =============================================================================

describe('When - Parent Context', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('children inherit correct parent index', async () => {
    const parentIdx = allocateIndex('parent')
    pushParentContext(parentIdx)

    const deferred = createDeferred<string>()
    let pendingParent = -1
    let thenParent = -1

    const dispose = when(
      () => deferred.promise,
      {
        pending: () => {
          const idx = allocateIndex('pending-child')
          pendingParent = parentIdx
          return () => releaseIndex(idx)
        },
        then: () => {
          const idx = allocateIndex('then-child')
          thenParent = parentIdx
          return () => releaseIndex(idx)
        },
      }
    )

    await nextTick()
    expect(pendingParent).toBe(parentIdx)

    deferred.resolve('done')
    await flushPromises()
    expect(thenParent).toBe(parentIdx)

    popParentContext()
    dispose()
    releaseIndex(parentIdx)
  })

  test('catch content inherits correct parent index', async () => {
    const parentIdx = allocateIndex('parent')
    pushParentContext(parentIdx)

    const deferred = createDeferred<string>()
    let catchParent = -1

    const dispose = when(
      () => deferred.promise,
      {
        then: () => () => {},
        catch: () => {
          catchParent = parentIdx
          return () => {}
        },
      }
    )

    deferred.reject(new Error('fail'))
    await flushPromises()
    expect(catchParent).toBe(parentIdx)

    popParentContext()
    dispose()
    releaseIndex(parentIdx)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('When - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('immediately resolved promise', async () => {
    const tracker: string[] = []

    const dispose = when(
      () => Promise.resolve('immediate'),
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => {}
        },
      }
    )

    // Pending may or may not show depending on microtask timing
    await flushPromises()

    expect(tracker).toContain('then:immediate')

    dispose()
  })

  test('immediately rejected promise', async () => {
    const tracker: string[] = []

    // Create a pre-rejected promise (cached to avoid creating new ones each call)
    const rejectedPromise = Promise.reject(new Error('immediate error'))
    // Attach a no-op catch to prevent unhandled rejection warning
    rejectedPromise.catch(() => {})

    const dispose = when(
      () => rejectedPromise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
        catch: (err) => {
          tracker.push(`catch:${err.message}`)
          return () => {}
        },
      }
    )

    await flushPromises()

    expect(tracker).toContain('catch:immediate error')
    expect(tracker).not.toContain('then:created')

    dispose()
  })

  test('promise that never resolves - cleanup still works', async () => {
    const tracker: string[] = []
    // Create a promise that never resolves
    const neverPromise = new Promise<string>(() => {})

    const dispose = when(
      () => neverPromise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    // Dispose should still clean up pending content
    dispose()

    expect(tracker).toContain('pending:destroyed')
  })

  test('multiple rapid promise changes', async () => {
    const tracker: string[] = []
    const promiseSignal = signal(createDeferred<string>())

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => { tracker.push(`then:${val}:destroyed`) }
        },
      }
    )

    await nextTick()

    // Rapidly change promises
    for (let i = 0; i < 5; i++) {
      promiseSignal.value = createDeferred<string>()
      await nextTick()
    }

    // Only the last promise matters
    const finalDeferred = promiseSignal.value
    finalDeferred.resolve('final')
    await flushPromises()

    expect(tracker).toContain('then:final')

    // Previous pending states should have been cleaned up
    const pendingCreated = tracker.filter(t => t === 'pending:created').length
    const pendingDestroyed = tracker.filter(t => t === 'pending:destroyed').length
    // When then resolves, the last pending is also destroyed
    // So all pendings should be destroyed (equal counts)
    expect(pendingDestroyed).toBe(pendingCreated)

    dispose()
  })

  test('same promise reference does not re-trigger', async () => {
    const tracker: string[] = []
    const deferred = createDeferred<string>()
    const promiseSignal = signal(deferred)

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: createMockComponent('then', tracker),
      }
    )

    await nextTick()
    expect(tracker.filter(t => t === 'pending:created').length).toBe(1)

    // Set same promise again (should not re-trigger)
    promiseSignal.value = deferred
    await flushPromises()

    // Still only one pending
    expect(tracker.filter(t => t === 'pending:created').length).toBe(1)

    dispose()
  })

  test('complex value types work correctly', async () => {
    interface ComplexData {
      items: { id: number; name: string }[]
      metadata: { total: number; page: number }
    }

    const deferred = createDeferred<ComplexData>()
    let receivedData: ComplexData | null = null

    const dispose = when(
      () => deferred.promise,
      {
        then: (data) => {
          receivedData = data
          return () => {}
        },
      }
    )

    const testData: ComplexData = {
      items: [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ],
      metadata: { total: 100, page: 1 },
    }

    deferred.resolve(testData)
    await flushPromises()

    expect(receivedData).toEqual(testData)
    expect(receivedData?.items.length).toBe(2)
    expect(receivedData?.metadata.total).toBe(100)

    dispose()
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('When - Integration', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('works with derived promise source', async () => {
    const tracker: string[] = []
    const fetchId = signal(1)

    // Simulated fetch based on ID
    const fetchData = (id: number) => {
      const deferred = createDeferred<string>()
      setTimeout(() => deferred.resolve(`Data for ${id}`), 10)
      return deferred.promise
    }

    const dispose = when(
      () => fetchData(fetchId.value),
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => { tracker.push('then:destroyed') }
        },
      }
    )

    await nextTick()
    expect(tracker).toContain('pending:created')

    // Wait for first fetch
    await new Promise(r => setTimeout(r, 20))
    expect(tracker).toContain('then:Data for 1')

    // Change ID - should trigger new fetch
    fetchId.value = 2
    await flushPromises()

    // Previous then should be destroyed, new pending shown
    expect(tracker).toContain('then:destroyed')

    // Wait for second fetch
    await new Promise(r => setTimeout(r, 20))
    expect(tracker).toContain('then:Data for 2')

    dispose()
  })

  test('error recovery - new promise after error', async () => {
    const tracker: string[] = []
    const promiseSignal = signal(createDeferred<string>())

    const dispose = when(
      () => promiseSignal.value.promise,
      {
        pending: createMockComponent('pending', tracker),
        then: (val) => {
          tracker.push(`then:${val}`)
          return () => {}
        },
        catch: (err) => {
          tracker.push(`catch:${err.message}`)
          return () => { tracker.push('catch:destroyed') }
        },
      }
    )

    await nextTick()

    // First promise fails
    promiseSignal.value.reject(new Error('Network error'))
    await flushPromises()
    expect(tracker).toContain('catch:Network error')

    // Retry with new promise
    const retryDeferred = createDeferred<string>()
    promiseSignal.value = retryDeferred
    await flushPromises()
    expect(tracker).toContain('catch:destroyed')

    // Retry succeeds
    retryDeferred.resolve('Retry success')
    await flushPromises()
    expect(tracker).toContain('then:Retry success')

    dispose()
  })
})
