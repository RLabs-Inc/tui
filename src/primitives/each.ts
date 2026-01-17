/**
 * TUI Framework - Each Primitive
 *
 * Reactive list rendering. Creates components for each item in an array.
 * When the array changes, components are automatically added/removed.
 * Props inside components remain reactive through normal slot binding.
 *
 * Usage:
 * ```ts
 * each(() => items.value, (getItem, key) => {
 *   // key is STABLE (use for selection!)
 *   // getItem() returns current item value (reactive!)
 *   text({ content: () => getItem().name, id: `item-${key}` })
 * }, { key: item => item.id })
 * ```
 */

import { signal, effect, effectScope, onScopeDispose, type WritableSignal } from '@rlabs-inc/signals'
import { getCurrentParentIndex, pushParentContext, popParentContext } from '../engine/registry'
import type { Cleanup } from './types'

/**
 * Render a list of components reactively.
 *
 * Uses fine-grained reactivity: each item is stored in a signal.
 * When items change, signals are updated (not recreated).
 * Components read from signals via getter - truly reactive!
 *
 * @param itemsGetter - Getter that returns the items array
 * @param renderFn - Receives: getItem() for reactive item access, key (stable ID)
 * @param options.key - Function to get unique key for each item
 */
export function each<T>(
  itemsGetter: () => T[],
  renderFn: (getItem: () => T, key: string) => Cleanup,
  options: { key: (item: T) => string }
): Cleanup {
  const cleanups = new Map<string, Cleanup>()
  const itemSignals = new Map<string, WritableSignal<T>>()
  const parentIndex = getCurrentParentIndex()
  const scope = effectScope()

  scope.run(() => {
    effect(() => {
      const items = itemsGetter()
      const currentKeys = new Set<string>()

      pushParentContext(parentIndex)
      try {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]!
          const key = options.key(item)

          // Warn about duplicate keys in the same render pass
          if (currentKeys.has(key)) {
            console.warn(
              `[TUI each()] Duplicate key detected: "${key}". ` +
                `Keys must be unique. This may cause unexpected behavior.`
            )
          }
          currentKeys.add(key)

          if (!itemSignals.has(key)) {
            // NEW item - create signal and component
            const itemSignal = signal(item)
            itemSignals.set(key, itemSignal)
            cleanups.set(key, renderFn(() => itemSignal.value, key))
          } else {
            // EXISTING item - just update the signal (fine-grained!)
            itemSignals.get(key)!.value = item
          }
        }
      } finally {
        popParentContext()
      }

      // Cleanup removed items
      for (const [key, cleanup] of cleanups) {
        if (!currentKeys.has(key)) {
          cleanup()
          cleanups.delete(key)
          itemSignals.delete(key)
        }
      }
    })

    onScopeDispose(() => {
      for (const cleanup of cleanups.values()) cleanup()
      cleanups.clear()
      itemSignals.clear()
    })
  })

  return () => scope.stop()
}
