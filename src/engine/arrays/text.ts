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

export function ensureCapacity(index: number): void {
  while (textContent.length <= index) {
    textContent.push(bind(''))
    textAttrs.push(bind(Attr.NONE))
    textAlign.push(bind(0))
    textWrap.push(bind(1)) // Default wrap
    ellipsis.push(bind('…'))
  }
}

export function clearAtIndex(index: number): void {
  if (index < textContent.length) {
    textContent[index] = bind('')
    textAttrs[index] = bind(Attr.NONE)
    textAlign[index] = bind(0)
    textWrap[index] = bind(1)
    ellipsis[index] = bind('…')
  }
}
