/**
 * TUI Framework - Component Scope
 *
 * Automatic cleanup collection for component functions.
 * box/text/effect automatically register with the active scope.
 *
 * Usage:
 * ```ts
 * function MyComponent(props): Cleanup {
 *   return scoped(() => {
 *     // Everything inside auto-registers cleanup
 *     box({ children: () => text({ content: 'Hello' }) })
 *     effect(() => console.log(count.value))
 *
 *     // Manual cleanup for timers etc
 *     const timer = setInterval(() => tick(), 1000)
 *     onCleanup(() => clearInterval(timer))
 *   })
 * }
 * ```
 */

import { effectScope, onScopeDispose } from '@rlabs-inc/signals'
import type { EffectScope } from '@rlabs-inc/signals'
import type { Cleanup } from './types'

// =============================================================================
// ACTIVE SCOPE TRACKING
// =============================================================================

interface ScopeContext {
  cleanups: Cleanup[]
  scope: EffectScope
}

let activeContext: ScopeContext | null = null

/**
 * Get the currently active scope context.
 * Used by box/text to auto-register cleanups.
 */
export function getActiveScope(): ScopeContext | null {
  return activeContext
}

/**
 * Register a cleanup with the active scope.
 * Called automatically by box/text when a scope is active.
 * Can also be called manually for timers/subscriptions.
 */
export function onCleanup(cleanup: Cleanup): void {
  if (activeContext) {
    activeContext.cleanups.push(cleanup)
  }
}

/**
 * Register a cleanup and return it (for chaining).
 * Useful when you need the cleanup function reference.
 */
export function trackCleanup<T extends Cleanup>(cleanup: T): T {
  if (activeContext) {
    activeContext.cleanups.push(cleanup)
  }
  return cleanup
}

// =============================================================================
// SCOPED EXECUTION
// =============================================================================

/**
 * Execute a function with automatic cleanup collection.
 * box/text/effect calls inside automatically register their cleanups.
 *
 * @example Basic component
 * ```ts
 * function Counter(): Cleanup {
 *   return scoped(() => {
 *     const count = signal(0)
 *
 *     box({
 *       children: () => {
 *         text({ content: () => `Count: ${count.value}` })
 *       }
 *     })
 *
 *     effect(() => console.log('Count:', count.value))
 *   })
 * }
 * ```
 *
 * @example With manual cleanups
 * ```ts
 * function Timer(): Cleanup {
 *   return scoped(() => {
 *     const elapsed = signal(0)
 *
 *     const interval = setInterval(() => elapsed.value++, 1000)
 *     onCleanup(() => clearInterval(interval))
 *
 *     box({ children: () => text({ content: () => `${elapsed.value}s` }) })
 *   })
 * }
 * ```
 *
 * @example Nested components work too
 * ```ts
 * function Parent(): Cleanup {
 *   return scoped(() => {
 *     box({
 *       children: () => {
 *         Child() // Child's cleanup is tracked by parent
 *       }
 *     })
 *   })
 * }
 * ```
 */
export function scoped(fn: () => void): Cleanup {
  const scope = effectScope()
  const cleanups: Cleanup[] = []

  const prevContext = activeContext
  activeContext = { cleanups, scope }

  try {
    // Run the function within effect scope
    // Effects created inside are tracked by the scope
    scope.run(fn)
  } finally {
    activeContext = prevContext
  }

  // Return master cleanup
  return () => {
    // Stop effect scope (disposes effects)
    scope.stop()

    // Run all registered cleanups
    for (const cleanup of cleanups) {
      try {
        cleanup()
      } catch (e) {
        // Cleanup errors logged but don't stop other cleanups
        console.error('Cleanup error:', e)
      }
    }
  }
}

// =============================================================================
// LEGACY API (for backwards compatibility)
// =============================================================================

export interface ComponentScopeResult {
  onCleanup: <T extends Cleanup>(cleanup: T) => T
  cleanup: Cleanup
  scope: EffectScope
}

/**
 * Create a component scope for manual cleanup collection.
 * @deprecated Use scoped() for automatic cleanup instead
 */
export function componentScope(): ComponentScopeResult {
  const cleanups: Cleanup[] = []
  const scope = effectScope()

  return {
    onCleanup: <T extends Cleanup>(cleanup: T): T => {
      cleanups.push(cleanup)
      return cleanup
    },
    cleanup: () => {
      scope.stop()
      for (const cleanup of cleanups) {
        try {
          cleanup()
        } catch (e) {
          console.error('Cleanup error:', e)
        }
      }
    },
    scope,
  }
}

/**
 * Create a simple cleanup collector.
 * @deprecated Use scoped() for automatic cleanup instead
 */
export function cleanupCollector(): {
  add: <T extends Cleanup>(cleanup: T) => T
  cleanup: Cleanup
} {
  const cleanups: Cleanup[] = []

  return {
    add: <T extends Cleanup>(cleanup: T): T => {
      cleanups.push(cleanup)
      return cleanup
    },
    cleanup: () => {
      for (const cleanup of cleanups) {
        try {
          cleanup()
        } catch (e) {
          console.error('Cleanup error:', e)
        }
      }
    },
  }
}
