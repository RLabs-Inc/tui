/**
 * TUI Framework - Reactive Context System
 *
 * Provides React-like context for passing data deep without prop drilling.
 * Uses ReactiveMap for automatic reactive subscriptions - no explicit
 * subscribe/unsubscribe needed!
 *
 * How it works:
 * - ReactiveMap has per-key fine-grained reactivity
 * - Reading from the map inside a derived/effect auto-subscribes
 * - Writing to the map auto-notifies all readers of that key
 *
 * Usage:
 * ```ts
 * // Create a context
 * const ThemeContext = createContext<Theme>(defaultTheme)
 *
 * // Provider sets it
 * provide(ThemeContext, darkTheme)
 *
 * // Consumer reads it - automatically reactive!
 * function ThemedBox() {
 *   const theme = useContext(ThemeContext)
 *   return box({ bg: theme.background })
 * }
 *
 * // Update context - all consumers re-render
 * provide(ThemeContext, lightTheme)
 * ```
 */

import { ReactiveMap, signal, type WritableSignal } from '@rlabs-inc/signals'

// =============================================================================
// Context Types
// =============================================================================

/**
 * A context identifier with type information.
 * The symbol ensures uniqueness, the type parameter ensures type safety.
 */
export interface Context<T> {
  /** Unique identifier for this context */
  readonly id: symbol
  /** Default value if no provider exists */
  readonly defaultValue: T
  /** Display name for debugging */
  readonly displayName?: string
}

// =============================================================================
// Context Storage
// =============================================================================

/**
 * Global reactive storage for all context values.
 *
 * Using ReactiveMap means:
 * - get(key) inside derived/effect = auto-subscribe to that key
 * - set(key, value) = auto-notify all subscribers of that key
 *
 * This is the magic that makes context automatically reactive!
 */
const contextValues = new ReactiveMap<symbol, unknown>()

/**
 * Signal wrappers for contexts that need .value access pattern.
 * When a user provides a signal, we store it directly.
 * When they provide a static value, we wrap it in a signal.
 */
const contextSignals = new ReactiveMap<symbol, WritableSignal<unknown>>()

// =============================================================================
// Context API
// =============================================================================

/**
 * Create a new context with a default value.
 *
 * @param defaultValue - Value used when no provider exists
 * @param displayName - Optional name for debugging
 * @returns A Context object to use with provide() and useContext()
 *
 * @example
 * ```ts
 * const UserContext = createContext<User | null>(null)
 * const ThemeContext = createContext(defaultTheme, 'Theme')
 * ```
 */
export function createContext<T>(defaultValue: T, displayName?: string): Context<T> {
  return {
    id: Symbol(displayName ?? 'Context'),
    defaultValue,
    displayName,
  }
}

/**
 * Provide a value for a context.
 *
 * Can be called multiple times to update the context value.
 * All consumers using useContext() will automatically update.
 *
 * @param context - The context to provide
 * @param value - The value to provide (static or signal)
 *
 * @example
 * ```ts
 * // Static value
 * provide(ThemeContext, darkTheme)
 *
 * // Signal - consumers react to signal changes too!
 * const theme = signal(darkTheme)
 * provide(ThemeContext, theme)
 * theme.value = lightTheme  // All consumers update!
 * ```
 */
export function provide<T>(context: Context<T>, value: T | WritableSignal<T>): void {
  // Check if value is a signal from @rlabs-inc/signals
  // Signals have a Symbol('signal.source') property that plain objects don't have
  // This is more reliable than just checking for 'value' since regular objects
  // might have a 'value' property but won't have the internal signal symbol
  if (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    Object.getOwnPropertySymbols(value).some((sym) => sym.description === 'signal.source')
  ) {
    // It's a signal - store it directly for reactive access
    contextSignals.set(context.id, value as WritableSignal<unknown>)
    contextValues.set(context.id, value)
  } else {
    // Static value - wrap in a signal for consistent access
    const existing = contextSignals.get(context.id)
    if (existing) {
      // Update existing signal
      existing.value = value
    } else {
      // Create new signal
      const sig = signal(value)
      contextSignals.set(context.id, sig as WritableSignal<unknown>)
    }
    contextValues.set(context.id, value)
  }
}

/**
 * Get the current value of a context.
 *
 * This is automatically reactive when used inside:
 * - derived(() => ...)
 * - effect(() => ...)
 * - Component prop getters: () => useContext(...)
 *
 * @param context - The context to read
 * @returns The current context value, or defaultValue if no provider
 *
 * @example
 * ```ts
 * function MyComponent() {
 *   const theme = useContext(ThemeContext)
 *   return box({ bg: theme.background })
 * }
 * ```
 */
export function useContext<T>(context: Context<T>): T {
  // Check for signal wrapper first (for .value reactivity)
  const sig = contextSignals.get(context.id)
  if (sig !== undefined) {
    return sig.value as T
  }

  // Fall back to direct value lookup (still reactive via ReactiveMap!)
  const value = contextValues.get(context.id)
  if (value !== undefined) {
    return value as T
  }

  return context.defaultValue
}

/**
 * Check if a context has been provided.
 *
 * @param context - The context to check
 * @returns true if provide() has been called for this context
 */
export function hasContext<T>(context: Context<T>): boolean {
  return contextValues.has(context.id)
}

/**
 * Clear a context, returning to default value.
 *
 * @param context - The context to clear
 */
export function clearContext<T>(context: Context<T>): void {
  contextValues.delete(context.id)
  contextSignals.delete(context.id)
}

// =============================================================================
// Reset (for testing)
// =============================================================================

/**
 * Reset all context state (for testing)
 */
export function resetContexts(): void {
  contextValues.clear()
  contextSignals.clear()
}
