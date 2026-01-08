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

import { bind, type Binding } from '@rlabs-inc/signals'

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

export function ensureCapacity(index: number): void {
  while (flexDirection.length <= index) {
    flexDirection.push(bind(0))
    flexWrap.push(bind(0))
    justifyContent.push(bind(0))
    alignItems.push(bind(0))
    alignContent.push(bind(0))
    flexGrow.push(bind(0))
    flexShrink.push(bind(1)) // Default shrink is 1
    flexBasis.push(bind(0))
    alignSelf.push(bind(0))
    order.push(bind(0))
    position.push(bind(0))
    top.push(bind(0))
    right.push(bind(0))
    bottom.push(bind(0))
    left.push(bind(0))
    borderTop.push(bind(0))
    borderRight.push(bind(0))
    borderBottom.push(bind(0))
    borderLeft.push(bind(0))
    zIndex.push(bind(0))
    overflow.push(bind(0))
  }
}

export function clearAtIndex(index: number): void {
  if (index < flexDirection.length) {
    flexDirection[index] = bind(0)
    flexWrap[index] = bind(0)
    justifyContent[index] = bind(0)
    alignItems[index] = bind(0)
    alignContent[index] = bind(0)
    flexGrow[index] = bind(0)
    flexShrink[index] = bind(1)
    flexBasis[index] = bind(0)
    alignSelf[index] = bind(0)
    order[index] = bind(0)
    position[index] = bind(0)
    top[index] = bind(0)
    right[index] = bind(0)
    bottom[index] = bind(0)
    left[index] = bind(0)
    borderTop[index] = bind(0)
    borderRight[index] = bind(0)
    borderBottom[index] = bind(0)
    borderLeft[index] = bind(0)
    zIndex[index] = bind(0)
    overflow[index] = bind(0)
  }
}
