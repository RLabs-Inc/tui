/**
 * TUI Framework - Layout Arrays
 *
 * Flexbox properties, positioning, and stacking.
 * Uses numeric enums for compact storage.
 *
 * Uses slotArray for stable reactive cells that NEVER get replaced.
 *
 * Flex direction: 0=column, 1=row, 2=column-reverse, 3=row-reverse
 * Flex wrap: 0=nowrap, 1=wrap, 2=wrap-reverse
 * Justify: 0=flex-start, 1=center, 2=flex-end, 3=space-between, 4=space-around, 5=space-evenly
 * Align: 0=stretch, 1=flex-start, 2=center, 3=flex-end, 4=baseline
 * Position: 0=relative, 1=absolute
 * Overflow: 0=visible, 1=hidden, 2=scroll
 */

import { slotArray, type SlotArray } from '@rlabs-inc/signals'

// =============================================================================
// FLEX CONTAINER PROPERTIES
// =============================================================================

/** Main axis direction: 0=column, 1=row, 2=column-reverse, 3=row-reverse */
export const flexDirection: SlotArray<number> = slotArray<number>(0)

/** Wrap behavior: 0=nowrap, 1=wrap, 2=wrap-reverse */
export const flexWrap: SlotArray<number> = slotArray<number>(0)

/** Main axis alignment: 0=flex-start, 1=center, 2=flex-end, 3=space-between, 4=space-around, 5=space-evenly */
export const justifyContent: SlotArray<number> = slotArray<number>(0)

/** Cross axis alignment for items: 0=stretch, 1=flex-start, 2=center, 3=flex-end, 4=baseline */
export const alignItems: SlotArray<number> = slotArray<number>(0)

/** Cross axis alignment for wrapped lines: 0=stretch, 1=flex-start, 2=center, 3=flex-end */
export const alignContent: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// FLEX ITEM PROPERTIES
// =============================================================================

/** Grow factor - how much item grows to fill space (0 = don't grow) */
export const flexGrow: SlotArray<number> = slotArray<number>(0)

/** Shrink factor - how much item shrinks when overflow (1 = default, 0 = don't shrink) */
export const flexShrink: SlotArray<number> = slotArray<number>(1)

/** Initial size before growing/shrinking (0 = use width/height) */
export const flexBasis: SlotArray<number> = slotArray<number>(0)

/** Override alignItems for this item: 0=auto, 1=stretch, 2=flex-start, 3=center, 4=flex-end */
export const alignSelf: SlotArray<number> = slotArray<number>(0)

/** Visual order override (not used yet) */
export const order: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// POSITIONING
// =============================================================================

/** Position mode: 0=relative (in flow), 1=absolute (out of flow) */
export const position: SlotArray<number> = slotArray<number>(0)

/** Offset from top of positioned ancestor (for absolute) or normal position (for relative) */
export const top: SlotArray<number> = slotArray<number>(0)

/** Offset from right of positioned ancestor */
export const right: SlotArray<number> = slotArray<number>(0)

/** Offset from bottom of positioned ancestor */
export const bottom: SlotArray<number> = slotArray<number>(0)

/** Offset from left of positioned ancestor */
export const left: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// BORDER (for layout calculations)
// =============================================================================

/** Has top border? 0=no, 1+=yes (takes 1 cell) */
export const borderTop: SlotArray<number> = slotArray<number>(0)

/** Has right border? 0=no, 1+=yes (takes 1 cell) */
export const borderRight: SlotArray<number> = slotArray<number>(0)

/** Has bottom border? 0=no, 1+=yes (takes 1 cell) */
export const borderBottom: SlotArray<number> = slotArray<number>(0)

/** Has left border? 0=no, 1+=yes (takes 1 cell) */
export const borderLeft: SlotArray<number> = slotArray<number>(0)

// =============================================================================
// STACKING & OVERFLOW
// =============================================================================

/** Z-index for overlapping components (higher = on top) */
export const zIndex: SlotArray<number> = slotArray<number>(0)

/** Overflow handling: 0=visible, 1=hidden, 2=scroll, 3=auto */
export const overflow: SlotArray<number> = slotArray<number>(0)

/** Ensure capacity for all layout arrays */
export function ensureCapacity(index: number): void {
  flexDirection.ensureCapacity(index)
  flexWrap.ensureCapacity(index)
  justifyContent.ensureCapacity(index)
  alignItems.ensureCapacity(index)
  alignContent.ensureCapacity(index)
  flexGrow.ensureCapacity(index)
  flexShrink.ensureCapacity(index)
  flexBasis.ensureCapacity(index)
  alignSelf.ensureCapacity(index)
  order.ensureCapacity(index)
  position.ensureCapacity(index)
  top.ensureCapacity(index)
  right.ensureCapacity(index)
  bottom.ensureCapacity(index)
  left.ensureCapacity(index)
  borderTop.ensureCapacity(index)
  borderRight.ensureCapacity(index)
  borderBottom.ensureCapacity(index)
  borderLeft.ensureCapacity(index)
  zIndex.ensureCapacity(index)
  overflow.ensureCapacity(index)
}

/** Clear slot at index (reset to default) */
export function clearAtIndex(index: number): void {
  flexDirection.clear(index)
  flexWrap.clear(index)
  justifyContent.clear(index)
  alignItems.clear(index)
  alignContent.clear(index)
  flexGrow.clear(index)
  flexShrink.clear(index)
  flexBasis.clear(index)
  alignSelf.clear(index)
  order.clear(index)
  position.clear(index)
  top.clear(index)
  right.clear(index)
  bottom.clear(index)
  left.clear(index)
  borderTop.clear(index)
  borderRight.clear(index)
  borderBottom.clear(index)
  borderLeft.clear(index)
  zIndex.clear(index)
  overflow.clear(index)
}
