/**
 * TUI Framework - Show Primitive
 *
 * Conditional rendering. Shows or hides components based on a condition.
 * When the condition changes, components are automatically created/destroyed.
 *
 * Usage:
 * ```ts
 * show(() => isVisible.value, () => {
 *   text({ content: 'I am visible!' })
 * })
 * ```
 */

import { effect, effectScope, onScopeDispose } from '@rlabs-inc/signals'
import { getCurrentParentIndex, pushParentContext, popParentContext } from '../engine/registry'
import type { Cleanup } from './types'

/**
 * Conditionally render components.
 *
 * @param conditionGetter - Getter that returns boolean (creates dependency)
 * @param renderFn - Function to render when condition is true (returns cleanup)
 * @param elseFn - Optional function to render when condition is false
 */
export function show(
  conditionGetter: () => boolean,
  renderFn: () => Cleanup,
  elseFn?: () => Cleanup
): Cleanup {
  let cleanup: Cleanup | null = null
  let wasTrue: boolean | null = null
  const parentIndex = getCurrentParentIndex()
  const scope = effectScope()

  const update = (condition: boolean) => {
    if (condition === wasTrue) return
    wasTrue = condition

    if (cleanup) {
      cleanup()
      cleanup = null
    }

    pushParentContext(parentIndex)
    try {
      if (condition) {
        cleanup = renderFn()
      } else if (elseFn) {
        cleanup = elseFn()
      }
    } finally {
      popParentContext()
    }
  }

  scope.run(() => {
    // Initial render
    update(conditionGetter())

    // Effect for updates - reads condition to establish dependency
    // but skips the update on first run since we already rendered above
    let initialized = false
    effect(() => {
      const condition = conditionGetter() // Must read to track dependency!
      if (!initialized) {
        initialized = true
        return
      }
      update(condition)
    })

    onScopeDispose(() => {
      if (cleanup) cleanup()
    })
  })

  return () => scope.stop()
}
