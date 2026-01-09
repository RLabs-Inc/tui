/**
 * TUI Framework - Layout Arrays
 *
 * Flexbox properties, positioning, and stacking.
 * Uses numeric enums for compact storage.
 *
 * CRITICAL: Use regular arrays (NOT state!) to preserve binding getters.
 * state() proxies snapshot getter values, breaking reactivity.
 *
 * Flex direction: 0=column, 1=row, 2=column-reverse, 3=row-reverse
 * Flex wrap: 0=nowrap, 1=wrap, 2=wrap-reverse
 * Justify: 0=flex-start, 1=center, 2=flex-end, 3=space-between, 4=space-around, 5=space-evenly
 * Align: 0=stretch, 1=flex-start, 2=center, 3=flex-end, 4=baseline
 * Position: 0=relative, 1=absolute
 * Overflow: 0=visible, 1=hidden, 2=scroll
 */

import { bind, disconnectBinding, type Binding } from '@rlabs-inc/signals'

// =============================================================================
// FLEX CONTAINER PROPERTIES
// =============================================================================

/** Main axis direction: 0=column, 1=row, 2=column-reverse, 3=row-reverse */
export const flexDirection: Binding<number>[] = []

/** Wrap behavior: 0=nowrap, 1=wrap, 2=wrap-reverse */
export const flexWrap: Binding<number>[] = []

/** Main axis alignment: 0=flex-start, 1=center, 2=flex-end, 3=space-between, 4=space-around, 5=space-evenly */
export const justifyContent: Binding<number>[] = []

/** Cross axis alignment for items: 0=stretch, 1=flex-start, 2=center, 3=flex-end, 4=baseline */
export const alignItems: Binding<number>[] = []

/** Cross axis alignment for wrapped lines: 0=stretch, 1=flex-start, 2=center, 3=flex-end */
export const alignContent: Binding<number>[] = []

// =============================================================================
// FLEX ITEM PROPERTIES
// =============================================================================

/** Grow factor - how much item grows to fill space (0 = don't grow) */
export const flexGrow: Binding<number>[] = []

/** Shrink factor - how much item shrinks when overflow (1 = default, 0 = don't shrink) */
export const flexShrink: Binding<number>[] = []

/** Initial size before growing/shrinking (0 = use width/height) */
export const flexBasis: Binding<number>[] = []

/** Override alignItems for this item: 0=auto, 1=stretch, 2=flex-start, 3=center, 4=flex-end */
export const alignSelf: Binding<number>[] = []

/** Visual order override (not used yet) */
export const order: Binding<number>[] = []

// =============================================================================
// POSITIONING
// =============================================================================

/** Position mode: 0=relative (in flow), 1=absolute (out of flow) */
export const position: Binding<number>[] = []

/** Offset from top of positioned ancestor (for absolute) or normal position (for relative) */
export const top: Binding<number>[] = []

/** Offset from right of positioned ancestor */
export const right: Binding<number>[] = []

/** Offset from bottom of positioned ancestor */
export const bottom: Binding<number>[] = []

/** Offset from left of positioned ancestor */
export const left: Binding<number>[] = []

// =============================================================================
// BORDER (for layout calculations)
// =============================================================================

/** Has top border? 0=no, 1+=yes (takes 1 cell) */
export const borderTop: Binding<number>[] = []

/** Has right border? 0=no, 1+=yes (takes 1 cell) */
export const borderRight: Binding<number>[] = []

/** Has bottom border? 0=no, 1+=yes (takes 1 cell) */
export const borderBottom: Binding<number>[] = []

/** Has left border? 0=no, 1+=yes (takes 1 cell) */
export const borderLeft: Binding<number>[] = []

// =============================================================================
// STACKING & OVERFLOW
// =============================================================================

/** Z-index for overlapping components (higher = on top) */
export const zIndex: Binding<number>[] = []

/** Overflow handling: 0=visible, 1=hidden, 2=scroll, 3=auto */
export const overflow: Binding<number>[] = []

/** LAZY BINDING: Push undefined, primitives create bindings for used props only */
export function ensureCapacity(index: number): void {
  while (flexDirection.length <= index) {
    flexDirection.push(undefined as any)
    flexWrap.push(undefined as any)
    justifyContent.push(undefined as any)
    alignItems.push(undefined as any)
    alignContent.push(undefined as any)
    flexGrow.push(undefined as any)
    flexShrink.push(undefined as any)
    flexBasis.push(undefined as any)
    alignSelf.push(undefined as any)
    order.push(undefined as any)
    position.push(undefined as any)
    top.push(undefined as any)
    right.push(undefined as any)
    bottom.push(undefined as any)
    left.push(undefined as any)
    borderTop.push(undefined as any)
    borderRight.push(undefined as any)
    borderBottom.push(undefined as any)
    borderLeft.push(undefined as any)
    zIndex.push(undefined as any)
    overflow.push(undefined as any)
  }
}

export function clearAtIndex(index: number): void {
  if (index < flexDirection.length) {
    disconnectBinding(flexDirection[index])
    disconnectBinding(flexWrap[index])
    disconnectBinding(justifyContent[index])
    disconnectBinding(alignItems[index])
    disconnectBinding(alignContent[index])
    disconnectBinding(flexGrow[index])
    disconnectBinding(flexShrink[index])
    disconnectBinding(flexBasis[index])
    disconnectBinding(alignSelf[index])
    disconnectBinding(order[index])
    disconnectBinding(position[index])
    disconnectBinding(top[index])
    disconnectBinding(right[index])
    disconnectBinding(bottom[index])
    disconnectBinding(left[index])
    disconnectBinding(borderTop[index])
    disconnectBinding(borderRight[index])
    disconnectBinding(borderBottom[index])
    disconnectBinding(borderLeft[index])
    disconnectBinding(zIndex[index])
    disconnectBinding(overflow[index])
    flexDirection[index] = undefined as any
    flexWrap[index] = undefined as any
    justifyContent[index] = undefined as any
    alignItems[index] = undefined as any
    alignContent[index] = undefined as any
    flexGrow[index] = undefined as any
    flexShrink[index] = undefined as any
    flexBasis[index] = undefined as any
    alignSelf[index] = undefined as any
    order[index] = undefined as any
    position[index] = undefined as any
    top[index] = undefined as any
    right[index] = undefined as any
    bottom[index] = undefined as any
    left[index] = undefined as any
    borderTop[index] = undefined as any
    borderRight[index] = undefined as any
    borderBottom[index] = undefined as any
    borderLeft[index] = undefined as any
    zIndex[index] = undefined as any
    overflow[index] = undefined as any
  }
}
