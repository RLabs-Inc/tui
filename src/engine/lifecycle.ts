/**
 * TUI Framework - Component Lifecycle Hooks
 *
 * Provides onMount and onDestroy hooks for components.
 * Zero overhead when not used - callbacks only stored for components that opt-in.
 *
 * Usage:
 * ```ts
 * function Timer() {
 *   const interval = setInterval(() => tick(), 1000)
 *   onDestroy(() => clearInterval(interval))
 *   return text({ content: 'Timer running...' })
 * }
 * ```
 */

// =============================================================================
// Current Component Tracking
// =============================================================================

/**
 * Stack of component indices currently being created.
 * Needed because children are created synchronously inside parent's children() callback.
 */
const componentStack: number[] = []

/**
 * Push a component index onto the creation stack.
 * Called by primitives (box, text) at the start of creation.
 */
export function pushCurrentComponent(index: number): void {
  componentStack.push(index)
}

/**
 * Pop a component index from the creation stack.
 * Called by primitives (box, text) after setup is complete.
 */
export function popCurrentComponent(): void {
  componentStack.pop()
}

/**
 * Get the current component index (the one being created).
 * Returns -1 if not inside a component creation.
 */
export function getCurrentComponentIndex(): number {
  return componentStack.length > 0 ? componentStack[componentStack.length - 1]! : -1
}

// =============================================================================
// Lifecycle Callbacks Storage
// =============================================================================

/**
 * Mount callbacks by component index.
 * Called after component is fully set up in arrays.
 */
const mountCallbacks = new Map<number, Array<() => void>>()

/**
 * Destroy callbacks by component index.
 * Called when component is released.
 */
const destroyCallbacks = new Map<number, Array<() => void>>()

// =============================================================================
// Lifecycle Hook APIs
// =============================================================================

/**
 * Register a callback to run after the current component is mounted.
 * The callback runs synchronously after the component setup is complete.
 *
 * @param fn - Callback to run on mount
 *
 * @example
 * ```ts
 * function MyComponent() {
 *   onMount(() => {
 *     console.log('Component mounted!')
 *     fetchInitialData()
 *   })
 *   return box({ ... })
 * }
 * ```
 */
export function onMount(fn: () => void): void {
  const index = getCurrentComponentIndex()
  if (index === -1) {
    console.warn('onMount called outside of component creation')
    return
  }

  let callbacks = mountCallbacks.get(index)
  if (!callbacks) {
    callbacks = []
    mountCallbacks.set(index, callbacks)
  }
  callbacks.push(fn)
}

/**
 * Register a callback to run when the current component is destroyed.
 * Use for cleanup: clearing intervals, removing event listeners, etc.
 *
 * @param fn - Cleanup callback
 *
 * @example
 * ```ts
 * function Timer() {
 *   const interval = setInterval(() => tick(), 1000)
 *   onDestroy(() => clearInterval(interval))
 *   return text({ content: 'Timer' })
 * }
 * ```
 */
export function onDestroy(fn: () => void): void {
  const index = getCurrentComponentIndex()
  if (index === -1) {
    console.warn('onDestroy called outside of component creation')
    return
  }

  let callbacks = destroyCallbacks.get(index)
  if (!callbacks) {
    callbacks = []
    destroyCallbacks.set(index, callbacks)
  }
  callbacks.push(fn)
}

// =============================================================================
// Internal: Run Lifecycle Callbacks
// =============================================================================

/**
 * Run all mount callbacks for a component.
 * Called by primitives after setup is complete.
 */
export function runMountCallbacks(index: number): void {
  const callbacks = mountCallbacks.get(index)
  if (callbacks) {
    for (const fn of callbacks) {
      try {
        fn()
      } catch (err) {
        console.error(`Error in onMount callback for component ${index}:`, err)
      }
    }
    // Don't delete - keep for potential re-mount scenarios
  }
}

/**
 * Run all destroy callbacks for a component.
 * Called by releaseIndex before cleanup.
 */
export function runDestroyCallbacks(index: number): void {
  const callbacks = destroyCallbacks.get(index)
  if (callbacks) {
    for (const fn of callbacks) {
      try {
        fn()
      } catch (err) {
        console.error(`Error in onDestroy callback for component ${index}:`, err)
      }
    }
    // Clean up storage
    destroyCallbacks.delete(index)
    mountCallbacks.delete(index)
  }
}

// =============================================================================
// Reset (for testing)
// =============================================================================

/**
 * Reset all lifecycle state (for testing)
 */
export function resetLifecycle(): void {
  componentStack.length = 0
  mountCallbacks.clear()
  destroyCallbacks.clear()
}
