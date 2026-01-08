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

// Flex container
export const flexDirection: Binding<number>[] = []
export const flexWrap: Binding<number>[] = []
export const justifyContent: Binding<number>[] = []
export const alignItems: Binding<number>[] = []
export const alignContent: Binding<number>[] = []

// Flex item
export const flexGrow: Binding<number>[] = []
export const flexShrink: Binding<number>[] = []
export const flexBasis: Binding<number>[] = []
export const alignSelf: Binding<number>[] = []
export const order: Binding<number>[] = []

// Position
export const position: Binding<number>[] = []
export const top: Binding<number>[] = []
export const right: Binding<number>[] = []
export const bottom: Binding<number>[] = []
export const left: Binding<number>[] = []

// Border (for layout calculations - 0 = no border, 1+ = has border)
export const borderTop: Binding<number>[] = []
export const borderRight: Binding<number>[] = []
export const borderBottom: Binding<number>[] = []
export const borderLeft: Binding<number>[] = []

// Stacking & overflow
export const zIndex: Binding<number>[] = []
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
