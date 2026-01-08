/**
 * TUI Framework - Layout Module
 *
 * THE terminal-native layout system - TITAN ENGINE.
 *
 * Features:
 * - Block layout (vertical stacking)
 * - Complete Flexbox (grow/shrink/wrap/justify/align)
 * - Absolute/Fixed positioning
 * - Beats Yoga by trusting fine-grained reactivity
 *
 * Philosophy:
 * - Read from existing arrays (triggers reactivity)
 * - Compute in minimal passes
 * - Return plain output arrays
 */

import { derived, signal } from '@rlabs-inc/signals'
import { getAllocatedIndices } from '../../engine/registry'
import { computeLayoutTitan, resetTitanArrays } from './titan-engine'
import type { ComputedLayout } from './types'
import type { RenderMode } from '../../types'

// Re-export reset function for memory cleanup
export { resetTitanArrays }

// =============================================================================
// RENDER MODE
// =============================================================================

/**
 * Current render mode.
 * - fullscreen: Alt screen buffer, fixed terminal dimensions
 * - inline: Normal buffer, content-determined height, terminal scroll works
 * - append: Like inline, but for CLI-style appending output
 */
export const renderMode = signal<RenderMode>('fullscreen')

// =============================================================================
// TERMINAL SIZE
// =============================================================================

export const terminalWidth = signal(process.stdout.columns || 80)
export const terminalHeight = signal(process.stdout.rows || 24)

/**
 * Update terminal size from process.stdout.
 * Called on resize events.
 */
export function updateTerminalSize(): void {
  const w = process.stdout.columns || 80
  const h = process.stdout.rows || 24

  if (w !== terminalWidth.value || h !== terminalHeight.value) {
    terminalWidth.value = w
    terminalHeight.value = h
  }
}

// =============================================================================
// LAYOUT DERIVED
// =============================================================================

/**
 * The main layout derived.
 *
 * Reads from all component arrays and produces computed positions/sizes.
 * Automatically re-runs when any dependency changes.
 *
 * This is where the magic happens - reactive layout computation!
 */
export const layoutDerived = derived((): ComputedLayout => {
  // Read terminal size (creates dependency)
  const tw = terminalWidth.value
  const th = terminalHeight.value

  // Read render mode (creates dependency)
  const mode = renderMode.value

  // Get all allocated indices (creates dependency on component add/remove)
  const indices = getAllocatedIndices()

  // Constrain height only in fullscreen mode
  // Inline/append modes let content determine its own height
  const constrainHeight = mode === 'fullscreen'

  // TITAN ENGINE: Read arrays, compute, return.
  // Reactivity tracks dependencies as we read - no manual tracking needed.
  return computeLayoutTitan(tw, th, indices, constrainHeight)
})

// =============================================================================
// EXPORTS
// =============================================================================

export type { ComputedLayout } from './types'
export {
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
  Position,
  Display,
  Overflow,
} from './types'
