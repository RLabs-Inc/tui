/**
 * TUI Framework - When Primitive
 *
 * Async rendering. Shows loading/error/success states based on promise state.
 * When the promise resolves or rejects, the appropriate components are shown.
 *
 * Usage:
 * ```ts
 * when(() => fetchData(), {
 *   pending: () => text({ content: 'Loading...' }),
 *   then: (data) => text({ content: `Got: ${data}` }),
 *   catch: (err) => text({ content: `Error: ${err.message}` })
 * })
 * ```
 */

import { effect, effectScope, onScopeDispose } from '@rlabs-inc/signals'
import { getCurrentParentIndex, pushParentContext, popParentContext } from '../engine/registry'
import type { Cleanup } from './types'

interface WhenOptions<T> {
  pending?: () => Cleanup
  then: (value: T) => Cleanup
  catch?: (error: Error) => Cleanup
}

/**
 * Render based on async promise state.
 *
 * @param promiseGetter - Getter that returns a promise (creates dependency)
 * @param options - Handlers for pending, then, and catch states
 */
export function when<T>(
  promiseGetter: () => Promise<T>,
  options: WhenOptions<T>
): Cleanup {
  let cleanup: Cleanup | null = null
  let currentPromise: Promise<T> | null = null
  const parentIndex = getCurrentParentIndex()
  const scope = effectScope()

  const render = (fn: () => Cleanup) => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    pushParentContext(parentIndex)
    try {
      cleanup = fn()
    } finally {
      popParentContext()
    }
  }

  const handlePromise = (promise: Promise<T>) => {
    if (promise !== currentPromise) return

    promise
      .then((value) => {
        if (promise !== currentPromise || currentPromise === null) return
        render(() => options.then(value))
      })
      .catch((error) => {
        if (promise !== currentPromise || currentPromise === null) return
        if (options.catch) {
          render(() => options.catch!(error))
        } else {
          // Don't silently swallow errors - log for debugging
          console.error('[when] Unhandled promise rejection:', error)
        }
      })
  }

  scope.run(() => {
    // Initial setup
    const initialPromise = promiseGetter()
    currentPromise = initialPromise
    if (options.pending) {
      render(options.pending)
    }
    handlePromise(initialPromise)

    // Effect for updates - skip first run
    let initialized = false
    effect(() => {
      const promise = promiseGetter()
      if (initialized) {
        if (promise === currentPromise) return
        currentPromise = promise
        if (options.pending) {
          render(options.pending)
        }
        handlePromise(promise)
      }
      initialized = true
    })

    onScopeDispose(() => {
      currentPromise = null
      if (cleanup) cleanup()
    })
  })

  return () => scope.stop()
}
