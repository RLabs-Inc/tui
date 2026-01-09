/**
 * TUI Framework - Text Arrays
 *
 * Text content and styling for text/input components.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 *
 * Flow: user signal → bind() → Binding stored → unwrap() reads .value → dependency!
 */

import { bind, type Binding } from '@rlabs-inc/signals'
import type { CellAttrs } from '../../types'
import { Attr } from '../../types'

// Text content - Regular array to preserve binding getters
export const textContent: Binding<string>[] = []

// Text styling (CellAttrs bitfield)
export const textAttrs: Binding<CellAttrs>[] = []

// Text alignment: 0=left, 1=center, 2=right
export const textAlign: Binding<number>[] = []

// Text wrapping: 0=nowrap, 1=wrap, 2=truncate
export const textWrap: Binding<number>[] = []

// Ellipsis for truncated text
export const ellipsis: Binding<string>[] = []

/** LAZY BINDING: Push undefined, primitives create bindings for used props only */
export function ensureCapacity(index: number): void {
  while (textContent.length <= index) {
    textContent.push(undefined as any)
    textAttrs.push(undefined as any)
    textAlign.push(undefined as any)
    textWrap.push(undefined as any)
    ellipsis.push(undefined as any)
  }
}

export function clearAtIndex(index: number): void {
  if (index < textContent.length) {
    textContent[index] = undefined as any
    textAttrs[index] = undefined as any
    textAlign[index] = undefined as any
    textWrap[index] = undefined as any
    ellipsis[index] = undefined as any
  }
}
