/**
 * TUI Framework - Animation Primitives
 *
 * Reusable animation utilities for spinners, progress indicators, etc.
 * Handles frame cycling with proper lifecycle management.
 *
 * Usage:
 * ```ts
 * const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
 *
 * function LoadingSpinner(props): Cleanup {
 *   return scoped(() => {
 *     const frame = useAnimation(SPINNER, {
 *       fps: 12,
 *       active: () => props.loading.value,
 *     })
 *
 *     text({ content: frame, fg: t.warning })
 *   })
 * }
 * ```
 */

import { signal, derived, effect } from '@rlabs-inc/signals'
import type { DerivedSignal } from '@rlabs-inc/signals'
import { onCleanup, getActiveScope } from './scope'

export interface AnimationOptions {
  /** Frames per second (default: 12) */
  fps?: number
  /** Whether animation is active - can be reactive */
  active?: boolean | (() => boolean) | { readonly value: boolean }
  /** Start at a specific frame index (default: 0) */
  startFrame?: number
}

// Global animation registry - shared intervals for same FPS
interface AnimationRegistry {
  frameIndex: ReturnType<typeof signal<number>>
  interval: ReturnType<typeof setInterval> | null
  subscribers: number
}

const animationRegistry = new Map<number, AnimationRegistry>()

/**
 * Get or create a shared animation clock for the given FPS.
 */
function getAnimationClock(fps: number): AnimationRegistry {
  let registry = animationRegistry.get(fps)

  if (!registry) {
    registry = {
      frameIndex: signal(0),
      interval: null,
      subscribers: 0,
    }
    animationRegistry.set(fps, registry)
  }

  return registry
}

/**
 * Subscribe to an animation clock.
 */
function subscribeToAnimation(fps: number): () => void {
  const registry = getAnimationClock(fps)
  registry.subscribers++

  // Start interval if this is the first subscriber
  if (registry.subscribers === 1 && !registry.interval) {
    const ms = Math.floor(1000 / fps)
    registry.interval = setInterval(() => {
      registry.frameIndex.value++
    }, ms)
  }

  // Return unsubscribe function
  return () => {
    registry.subscribers = Math.max(0, registry.subscribers - 1)

    // Stop interval if no more subscribers
    if (registry.subscribers === 0 && registry.interval) {
      clearInterval(registry.interval)
      registry.interval = null
    }
  }
}

/**
 * Create an animated signal that cycles through frames.
 *
 * @example Basic spinner
 * ```ts
 * const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
 * const frame = useAnimation(SPINNER)
 * text({ content: frame }) // Animates automatically
 * ```
 *
 * @example Conditional animation
 * ```ts
 * const frame = useAnimation(SPINNER, {
 *   fps: 12,
 *   active: () => isLoading.value,
 * })
 * // Animation only runs when isLoading is true
 * ```
 *
 * @example With scope (auto-cleanup)
 * ```ts
 * function Spinner(): Cleanup {
 *   return scoped(() => {
 *     const frame = useAnimation(SPINNER, { active: () => loading.value })
 *     text({ content: frame, fg: t.warning })
 *   })
 * }
 * ```
 */
export function useAnimation<T>(
  frames: readonly T[],
  options: AnimationOptions = {}
): DerivedSignal<T> {
  const { fps = 12, active = true, startFrame = 0 } = options

  // Get shared animation clock
  const clock = getAnimationClock(fps)

  // Track whether we're subscribed
  let unsubscribe: (() => void) | null = null

  // Unwrap active prop
  const isActive = (): boolean => {
    if (typeof active === 'function') return active()
    if (typeof active === 'object' && 'value' in active) return active.value
    return active
  }

  // Effect to manage subscription based on active state
  const stopEffect = effect(() => {
    const shouldBeActive = isActive()

    if (shouldBeActive && !unsubscribe) {
      unsubscribe = subscribeToAnimation(fps)
    } else if (!shouldBeActive && unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  // Auto-register cleanup with active scope
  const scope = getActiveScope()
  if (scope) {
    scope.cleanups.push(() => {
      stopEffect()
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    })
  }

  // Return derived that computes current frame
  return derived(() => {
    const index = (clock.frameIndex.value + startFrame) % frames.length
    return frames[index]!
  })
}

/**
 * Common animation frame sets.
 */
export const AnimationFrames = {
  /** Braille spinner (smooth) */
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const,

  /** Braille dots (vertical) */
  dots: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'] as const,

  /** Simple line spinner */
  line: ['|', '/', '-', '\\'] as const,

  /** Growing bar */
  bar: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'] as const,

  /** Bouncing ball */
  bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'] as const,

  /** Clock */
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'] as const,

  /** Pulse */
  pulse: ['◯', '◔', '◑', '◕', '●', '◕', '◑', '◔'] as const,
} as const
