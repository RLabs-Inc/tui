/**
 * TUI Framework - TITAN Layout Engine v3
 *
 * Complete terminal layout system using parallel arrays.
 * Module-level arrays for speed, reset function for cleanup.
 *
 * Features:
 * - Block layout (vertical stacking)
 * - Flexbox (grow/shrink/wrap/justify/align)
 * - Absolute/Fixed positioning
 *
 * Memory model:
 * - Arrays are module-level (reused for speed)
 * - Call resetTitanArrays() after destroying all components
 *   (in benchmarks, tests, or major UI transitions)
 */

import { unwrap } from '@rlabs-inc/signals'
import { ComponentType } from '../../types'
import * as core from '../../engine/arrays/core'
import * as dimensions from '../../engine/arrays/dimensions'
import * as spacing from '../../engine/arrays/spacing'
import * as layout from '../../engine/arrays/layout'
import * as visual from '../../engine/arrays/visual'
import * as text from '../../engine/arrays/text'
import { stringWidth } from '../../utils/text'
import { measureTextHeight } from './utils/text-measure'
import { getAllocatedIndices } from '../../engine/registry'

import type { ComputedLayout } from './types'
import { Overflow } from './types'

// =============================================================================
// ENUMS (match layout.ts)
// =============================================================================
const FLEX_ROW = 1
const FLEX_ROW_REVERSE = 3
const FLEX_COLUMN = 0
const FLEX_COLUMN_REVERSE = 2

const WRAP_NOWRAP = 0
const WRAP_WRAP = 1
const WRAP_REVERSE = 2

const JUSTIFY_START = 0
const JUSTIFY_CENTER = 1
const JUSTIFY_END = 2
const JUSTIFY_BETWEEN = 3
const JUSTIFY_AROUND = 4
const JUSTIFY_EVENLY = 5

const ALIGN_STRETCH = 0
const ALIGN_START = 1
const ALIGN_CENTER = 2
const ALIGN_END = 3

const POS_RELATIVE = 0
const POS_ABSOLUTE = 1

// =============================================================================
// MODULE-LEVEL ARRAYS (reused for speed)
// =============================================================================
const outX: number[] = []
const outY: number[] = []
const outW: number[] = []
const outH: number[] = []
const outScrollable: number[] = []
const outMaxScrollX: number[] = []
const outMaxScrollY: number[] = []

const firstChild: number[] = []
const nextSibling: number[] = []
const lastChild: number[] = []

const intrinsicW: number[] = []
const intrinsicH: number[] = []

const itemMain: number[] = []
const itemCross: number[] = []

// Working arrays for layoutChildren (reused to avoid per-call allocation)
const flowKids: number[] = []
const lineStarts: number[] = []
const lineEnds: number[] = []
const lineMainUsed: number[] = []

// =============================================================================
// RESET FUNCTION - Call after destroying all components
// =============================================================================

/**
 * Reset all TITAN working arrays to release memory.
 * Call this after destroying all components:
 * - In benchmarks between test runs
 * - In tests during cleanup
 * - In runtime after major UI transitions (e.g., switching screens)
 */
export function resetTitanArrays(): void {
  outX.length = 0
  outY.length = 0
  outW.length = 0
  outH.length = 0
  outScrollable.length = 0
  outMaxScrollX.length = 0
  outMaxScrollY.length = 0
  firstChild.length = 0
  nextSibling.length = 0
  lastChild.length = 0
  intrinsicW.length = 0
  intrinsicH.length = 0
  itemMain.length = 0
  itemCross.length = 0
  flowKids.length = 0
  lineStarts.length = 0
  lineEnds.length = 0
  lineMainUsed.length = 0
}

// =============================================================================
// MAIN ENTRY
// =============================================================================

export function computeLayoutTitan(
  terminalWidth: number,
  terminalHeight: number,
  providedIndices?: Set<number>,
  constrainHeight: boolean = true  // false for inline/append modes
): ComputedLayout {
  const indices = providedIndices ?? getAllocatedIndices()

  if (indices.size === 0) {
    return { x: [], y: [], width: [], height: [], scrollable: [], maxScrollY: [], maxScrollX: [], contentWidth: 0, contentHeight: 0 }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 1: Build linked-list tree structure (O(n))
  // ─────────────────────────────────────────────────────────────────────────
  for (const i of indices) {
    firstChild[i] = -1
    nextSibling[i] = -1
    lastChild[i] = -1
    intrinsicW[i] = 0
    intrinsicH[i] = 0
    outScrollable[i] = 0
    outMaxScrollX[i] = 0
    outMaxScrollY[i] = 0
  }

  const bfsQueue: number[] = []
  let rootCount = 0

  for (const i of indices) {
    const parent = unwrap(core.parentIndex[i]) ?? -1

    if (parent >= 0 && indices.has(parent)) {
      if (firstChild[parent] === -1) {
        firstChild[parent] = i
      } else {
        nextSibling[lastChild[parent]!] = i
      }
      lastChild[parent] = i
    } else {
      bfsQueue[rootCount++] = i
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 2: BFS traversal - parents before children order
  // ─────────────────────────────────────────────────────────────────────────
  let head = 0
  while (head < bfsQueue.length) {
    const parent = bfsQueue[head++]!
    let child = firstChild[parent]!
    while (child !== -1) {
      bfsQueue.push(child)
      child = nextSibling[child]!
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 3: Measure intrinsic sizes (bottom-up)
  // ─────────────────────────────────────────────────────────────────────────
  for (let si = bfsQueue.length - 1; si >= 0; si--) {
    const i = bfsQueue[si]!
    const type = core.componentType[i]

    if (type === ComponentType.TEXT) {
      const content = unwrap(text.textContent[i])
      // Check for null/undefined, NOT truthiness (0 and '' are valid content!)
      if (content != null) {
        const str = String(content)
        intrinsicW[i] = str.length > 0 ? stringWidth(str) : 0

        // TEXT WRAPPING: Estimate wrapped height using parent's width
        // This allows parent containers to size correctly for wrapped text
        if (str.length > 0) {
          const parentIdx = unwrap(core.parentIndex[i]) ?? -1
          let availableW = terminalWidth

          if (parentIdx >= 0) {
            // Use parent's explicit width if set
            const parentExplicitW = unwrap(dimensions.width[parentIdx]) ?? 0
            if (parentExplicitW > 0) {
              // Subtract parent's padding and borders (rough estimate)
              const pPadL = unwrap(spacing.paddingLeft[parentIdx]) ?? 0
              const pPadR = unwrap(spacing.paddingRight[parentIdx]) ?? 0
              const pBorderStyle = unwrap(visual.borderStyle[parentIdx]) ?? 0
              const pBorderL = pBorderStyle > 0 || (unwrap(visual.borderLeft[parentIdx]) ?? 0) > 0 ? 1 : 0
              const pBorderR = pBorderStyle > 0 || (unwrap(visual.borderRight[parentIdx]) ?? 0) > 0 ? 1 : 0
              availableW = Math.max(1, parentExplicitW - pPadL - pPadR - pBorderL - pBorderR)
            }
          }

          intrinsicH[i] = measureTextHeight(str, availableW)
        } else {
          intrinsicH[i] = 0
        }
      }
    } else {
      // BOX/Container - calculate intrinsic from children + padding + borders
      let kid = firstChild[i]!
      if (kid !== -1) {
        const dir = unwrap(layout.flexDirection[i]) ?? FLEX_COLUMN
        const isRow = dir === FLEX_ROW || dir === FLEX_ROW_REVERSE
        const gap = unwrap(spacing.gap[i]) ?? 0

        let sumMain = 0
        let maxCross = 0
        let childCount = 0

        while (kid !== -1) {
          childCount++
          // Use max of explicit dimension and intrinsic size
          // This ensures children with explicit sizes contribute correctly
          const kidExplicitW = unwrap(dimensions.width[kid]) ?? 0
          const kidExplicitH = unwrap(dimensions.height[kid]) ?? 0
          const kidW = kidExplicitW > 0 ? kidExplicitW : intrinsicW[kid]!
          const kidH = kidExplicitH > 0 ? kidExplicitH : intrinsicH[kid]!

          // FIX: Don't add child borders - intrinsicW/H already includes them,
          // and explicit dimensions are total dimensions (including borders).
          // Adding borders here was DOUBLE-COUNTING and inflating contentHeight.
          //
          // OLD CODE (double-counted borders):
          // const kidBs = unwrap(visual.borderStyle[kid]) ?? 0
          // const kidBordT = kidBs > 0 || (unwrap(visual.borderTop[kid]) ?? 0) > 0 ? 1 : 0
          // const kidBordB = kidBs > 0 || (unwrap(visual.borderBottom[kid]) ?? 0) > 0 ? 1 : 0
          // const kidBordL = kidBs > 0 || (unwrap(visual.borderLeft[kid]) ?? 0) > 0 ? 1 : 0
          // const kidBordR = kidBs > 0 || (unwrap(visual.borderRight[kid]) ?? 0) > 0 ? 1 : 0
          // const kidTotalW = kidW + kidBordL + kidBordR
          // const kidTotalH = kidH + kidBordT + kidBordB

          if (isRow) {
            sumMain += kidW + gap
            maxCross = Math.max(maxCross, kidH)
          } else {
            sumMain += kidH + gap
            maxCross = Math.max(maxCross, kidW)
          }
          kid = nextSibling[kid]!
        }

        if (childCount > 0) sumMain -= gap

        // Add padding and borders to intrinsic size
        const padTop = unwrap(spacing.paddingTop[i]) ?? 0
        const padRight = unwrap(spacing.paddingRight[i]) ?? 0
        const padBottom = unwrap(spacing.paddingBottom[i]) ?? 0
        const padLeft = unwrap(spacing.paddingLeft[i]) ?? 0
        const borderStyle = unwrap(visual.borderStyle[i]) ?? 0
        const borderT = borderStyle > 0 || (unwrap(visual.borderTop[i]) ?? 0) > 0 ? 1 : 0
        const borderR = borderStyle > 0 || (unwrap(visual.borderRight[i]) ?? 0) > 0 ? 1 : 0
        const borderB = borderStyle > 0 || (unwrap(visual.borderBottom[i]) ?? 0) > 0 ? 1 : 0
        const borderL = borderStyle > 0 || (unwrap(visual.borderLeft[i]) ?? 0) > 0 ? 1 : 0

        const extraWidth = padLeft + padRight + borderL + borderR
        const extraHeight = padTop + padBottom + borderT + borderB

        if (isRow) {
          intrinsicW[i] = sumMain + extraWidth
          intrinsicH[i] = maxCross + extraHeight
        } else {
          intrinsicW[i] = maxCross + extraWidth
          intrinsicH[i] = sumMain + extraHeight
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Layout children of a single parent (NON-RECURSIVE)
  // Uses module-level arrays to avoid per-call allocation
  // ─────────────────────────────────────────────────────────────────────────
  function layoutChildrenOf(parent: number): void {
    // Reset working arrays (reuse module-level arrays)
    flowKids.length = 0
    lineStarts.length = 0
    lineEnds.length = 0
    lineMainUsed.length = 0

    // Track children max extent for scroll detection (zero overhead - updated inline)
    let childrenMaxMain = 0
    let childrenMaxCross = 0

    // Collect flow children
    let kid = firstChild[parent]!
    while (kid !== -1) {
      if ((unwrap(layout.position[kid]) ?? POS_RELATIVE) !== POS_ABSOLUTE) {
        flowKids.push(kid)
      }
      kid = nextSibling[kid]!
    }

    if (flowKids.length === 0) return

    // Parent's content area
    const pPadT = unwrap(spacing.paddingTop[parent]) ?? 0
    const pPadR = unwrap(spacing.paddingRight[parent]) ?? 0
    const pPadB = unwrap(spacing.paddingBottom[parent]) ?? 0
    const pPadL = unwrap(spacing.paddingLeft[parent]) ?? 0

    const pBs = unwrap(visual.borderStyle[parent]) ?? 0
    const pBordT = pBs > 0 || (unwrap(visual.borderTop[parent]) ?? 0) > 0 ? 1 : 0
    const pBordR = pBs > 0 || (unwrap(visual.borderRight[parent]) ?? 0) > 0 ? 1 : 0
    const pBordB = pBs > 0 || (unwrap(visual.borderBottom[parent]) ?? 0) > 0 ? 1 : 0
    const pBordL = pBs > 0 || (unwrap(visual.borderLeft[parent]) ?? 0) > 0 ? 1 : 0

    const contentX = outX[parent]! + pPadL + pBordL
    const contentY = outY[parent]! + pPadT + pBordT
    const contentW = Math.max(0, outW[parent]! - pPadL - pPadR - pBordL - pBordR)
    const contentH = Math.max(0, outH[parent]! - pPadT - pPadB - pBordT - pBordB)

    // Flex properties
    const dir = unwrap(layout.flexDirection[parent]) ?? FLEX_COLUMN
    const wrap = unwrap(layout.flexWrap[parent]) ?? WRAP_NOWRAP
    const justify = unwrap(layout.justifyContent[parent]) ?? JUSTIFY_START
    const alignItems = unwrap(layout.alignItems[parent]) ?? ALIGN_STRETCH
    const gap = unwrap(spacing.gap[parent]) ?? 0

    const isRow = dir === FLEX_ROW || dir === FLEX_ROW_REVERSE
    const isReverse = dir === FLEX_ROW_REVERSE || dir === FLEX_COLUMN_REVERSE

    const mainSize = isRow ? contentW : contentH
    const crossSize = isRow ? contentH : contentW

    // STEP 1: Collect items into flex lines
    let lineStart = 0
    let currentMain = 0

    for (let fi = 0; fi < flowKids.length; fi++) {
      const fkid = flowKids[fi]!
      const ew = unwrap(dimensions.width[fkid]) ?? 0
      const eh = unwrap(dimensions.height[fkid]) ?? 0
      const kidMain = isRow
        ? (ew > 0 ? ew : intrinsicW[fkid]!)
        : (eh > 0 ? eh : intrinsicH[fkid]!)

      if (wrap !== WRAP_NOWRAP && fi > lineStart && currentMain + kidMain + gap > mainSize) {
        lineStarts.push(lineStart)
        lineEnds.push(fi - 1)
        lineMainUsed.push(currentMain - gap)
        lineStart = fi
        currentMain = 0
      }
      currentMain += kidMain + gap
    }

    if (flowKids.length > 0) {
      lineStarts.push(lineStart)
      lineEnds.push(flowKids.length - 1)
      lineMainUsed.push(currentMain - gap)
    }

    const lineCount = lineStarts.length

    // STEP 2: Resolve flex grow/shrink per line
    for (let li = 0; li < lineCount; li++) {
      const lStart = lineStarts[li]!
      const lEnd = lineEnds[li]!
      const freeSpace = mainSize - lineMainUsed[li]!

      let totalGrow = 0
      let totalShrink = 0

      for (let fi = lStart; fi <= lEnd; fi++) {
        const fkid = flowKids[fi]!
        totalGrow += unwrap(layout.flexGrow[fkid]) ?? 0
        totalShrink += unwrap(layout.flexShrink[fkid]) ?? 1
      }

      for (let fi = lStart; fi <= lEnd; fi++) {
        const fkid = flowKids[fi]!
        const ew = unwrap(dimensions.width[fkid]) ?? 0
        const eh = unwrap(dimensions.height[fkid]) ?? 0
        let kidMain = isRow
          ? (ew > 0 ? ew : intrinsicW[fkid]!)
          : (eh > 0 ? eh : intrinsicH[fkid]!)

        if (freeSpace > 0 && totalGrow > 0) {
          kidMain += ((unwrap(layout.flexGrow[fkid]) ?? 0) / totalGrow) * freeSpace
        } else if (freeSpace < 0 && totalShrink > 0) {
          kidMain += ((unwrap(layout.flexShrink[fkid]) ?? 1) / totalShrink) * freeSpace
        }
        kidMain = Math.max(0, Math.floor(kidMain))

        const kidCross = isRow
          ? (eh > 0 ? eh : (alignItems === ALIGN_STRETCH ? crossSize / lineCount : intrinsicH[fkid]!))
          : (ew > 0 ? ew : (alignItems === ALIGN_STRETCH ? crossSize / lineCount : intrinsicW[fkid]!))

        itemMain[fkid] = kidMain
        itemCross[fkid] = Math.max(0, Math.floor(kidCross))
      }
    }

    // STEP 3: Position items
    let crossOffset = 0
    const lineHeight = lineCount > 0 ? Math.floor(crossSize / lineCount) : crossSize

    for (let li = 0; li < lineCount; li++) {
      const lineIdx = isReverse ? lineCount - 1 - li : li
      const lStart = lineStarts[lineIdx]!
      const lEnd = lineEnds[lineIdx]!

      let lineMain = 0
      for (let fi = lStart; fi <= lEnd; fi++) {
        lineMain += itemMain[flowKids[fi]!]! + gap
      }
      lineMain -= gap

      let mainOffset = 0
      let itemGap = gap
      const remainingSpace = mainSize - lineMain
      const itemCount = lEnd - lStart + 1

      switch (justify) {
        case JUSTIFY_CENTER:
          mainOffset = Math.floor(remainingSpace / 2)
          break
        case JUSTIFY_END:
          mainOffset = remainingSpace
          break
        case JUSTIFY_BETWEEN:
          itemGap = itemCount > 1 ? Math.floor(remainingSpace / (itemCount - 1)) + gap : gap
          break
        case JUSTIFY_AROUND: {
          const around = Math.floor(remainingSpace / itemCount)
          mainOffset = Math.floor(around / 2)
          itemGap = around + gap
          break
        }
        case JUSTIFY_EVENLY: {
          const even = Math.floor(remainingSpace / (itemCount + 1))
          mainOffset = even
          itemGap = even + gap
          break
        }
      }

      const start = isReverse ? lEnd : lStart
      const end = isReverse ? lStart : lEnd
      const step = isReverse ? -1 : 1

      for (let fi = start; isReverse ? fi >= end : fi <= end; fi += step) {
        const fkid = flowKids[fi]!
        const sizeMain = itemMain[fkid]!
        const sizeCross = itemCross[fkid]!

        let crossPos = crossOffset
        switch (alignItems) {
          case ALIGN_CENTER:
            crossPos += Math.floor((lineHeight - sizeCross) / 2)
            break
          case ALIGN_END:
            crossPos += lineHeight - sizeCross
            break
        }

        if (isRow) {
          outX[fkid] = contentX + mainOffset
          outY[fkid] = contentY + crossPos
          outW[fkid] = sizeMain
          outH[fkid] = sizeCross
        } else {
          outX[fkid] = contentX + crossPos
          outY[fkid] = contentY + mainOffset
          outW[fkid] = sizeCross
          outH[fkid] = sizeMain
        }

        // TEXT WRAPPING: Now that we know the width, recalculate height for TEXT
        // This fixes the intrinsicH=1 assumption - text wraps to actual width
        if (core.componentType[fkid] === ComponentType.TEXT) {
          const content = unwrap(text.textContent[fkid])
          if (content != null) {
            const str = String(content)
            if (str.length > 0) {
              const wrappedHeight = measureTextHeight(str, outW[fkid]!)
              outH[fkid] = Math.max(1, wrappedHeight)
            }
          }
        }

        // Track max extent inline (zero overhead)
        if (isRow) {
          childrenMaxMain = Math.max(childrenMaxMain, mainOffset + outW[fkid]!)
          childrenMaxCross = Math.max(childrenMaxCross, crossPos + outH[fkid]!)
        } else {
          childrenMaxMain = Math.max(childrenMaxMain, mainOffset + outH[fkid]!)
          childrenMaxCross = Math.max(childrenMaxCross, crossPos + outW[fkid]!)
        }

        mainOffset += (isRow ? outW[fkid]! : outH[fkid]!) + itemGap
      }

      crossOffset += lineHeight
    }

    // Scroll detection - uses values tracked inline above (no extra loop!)
    const overflow = unwrap(layout.overflow[parent]) ?? Overflow.VISIBLE
    if (overflow === Overflow.SCROLL || overflow === Overflow.AUTO) {
      const childrenMaxX = isRow ? childrenMaxMain : childrenMaxCross
      const childrenMaxY = isRow ? childrenMaxCross : childrenMaxMain
      const scrollRangeX = Math.max(0, childrenMaxX - contentW)
      const scrollRangeY = Math.max(0, childrenMaxY - contentH)

      if (overflow === Overflow.SCROLL || scrollRangeX > 0 || scrollRangeY > 0) {
        outScrollable[parent] = 1
        outMaxScrollX[parent] = scrollRangeX
        outMaxScrollY[parent] = scrollRangeY
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Absolute positioning
  // ─────────────────────────────────────────────────────────────────────────
  function layoutAbsolute(i: number): void {
    let container = unwrap(core.parentIndex[i]) ?? -1
    while (container >= 0 && indices.has(container)) {
      if ((unwrap(layout.position[container]) ?? POS_RELATIVE) !== POS_RELATIVE) break
      container = unwrap(core.parentIndex[container]) ?? -1
    }

    let containerX = 0, containerY = 0, containerW = outW[0] ?? 80, containerH = outH[0] ?? 24
    if (container >= 0 && indices.has(container)) {
      containerX = outX[container]!
      containerY = outY[container]!
      containerW = outW[container]!
      containerH = outH[container]!
    }

    const ew = unwrap(dimensions.width[i]) ?? 0
    const eh = unwrap(dimensions.height[i]) ?? 0
    outW[i] = ew > 0 ? ew : intrinsicW[i]!
    outH[i] = eh > 0 ? eh : intrinsicH[i]!

    const t = unwrap(layout.top[i])
    const r = unwrap(layout.right[i])
    const b = unwrap(layout.bottom[i])
    const l = unwrap(layout.left[i])

    if (l !== undefined && l !== 0) {
      outX[i] = containerX + l
    } else if (r !== undefined && r !== 0) {
      outX[i] = containerX + containerW - outW[i]! - r
    } else {
      outX[i] = containerX
    }

    if (t !== undefined && t !== 0) {
      outY[i] = containerY + t
    } else if (b !== undefined && b !== 0) {
      outY[i] = containerY + containerH - outH[i]! - b
    } else {
      outY[i] = containerY
    }

    // Position the absolute element's own children (non-recursive)
    layoutChildrenOf(i)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 4: Layout (top-down, ITERATIVE via BFS order)
  // ─────────────────────────────────────────────────────────────────────────

  // First, position all roots
  for (let ri = 0; ri < rootCount; ri++) {
    const root = bfsQueue[ri]!
    const ew = unwrap(dimensions.width[root]) ?? 0
    const eh = unwrap(dimensions.height[root]) ?? 0

    outX[root] = 0
    outY[root] = 0
    outW[root] = ew > 0 ? ew : terminalWidth

    // Height handling:
    // - If explicit height set, use it
    // - If constrainHeight (fullscreen), use terminal height
    // - If unconstrained (inline/append), use intrinsic height (content determines size)
    if (eh > 0) {
      outH[root] = eh
    } else if (constrainHeight) {
      outH[root] = terminalHeight
    } else {
      // Inline/append: content determines height
      outH[root] = intrinsicH[root] ?? 1
    }
  }

  // Then iterate through BFS order - each node positions its children
  // BFS guarantees parents are processed before children, so child positions
  // are always set before we need to process them as parents themselves.
  for (let qi = 0; qi < bfsQueue.length; qi++) {
    layoutChildrenOf(bfsQueue[qi]!)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 5: Absolute positioning
  // ─────────────────────────────────────────────────────────────────────────
  for (const i of indices) {
    if ((unwrap(layout.position[i]) ?? POS_RELATIVE) === POS_ABSOLUTE) {
      layoutAbsolute(i)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Content bounds: Just use root dimensions (root is at 0,0 and contains all)
  // No need for separate pass - we already have the root's size from PASS 4
  // ─────────────────────────────────────────────────────────────────────────
  // OLD PASS 6 (iterated all components - unnecessary):
  // let contentWidth = 0
  // let contentHeight = 0
  // for (const i of indices) {
  //   const right = (outX[i] ?? 0) + (outW[i] ?? 0)
  //   const bottom = (outY[i] ?? 0) + (outH[i] ?? 0)
  //   if (right > contentWidth) contentWidth = right
  //   if (bottom > contentHeight) contentHeight = bottom
  // }

  // Simple: root is at (0,0), so content bounds = root dimensions
  const contentWidth = rootCount > 0 ? (outW[bfsQueue[0]!] ?? 0) : 0
  const contentHeight = rootCount > 0 ? (outH[bfsQueue[0]!] ?? 0) : 0

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────
  return {
    x: outX,
    y: outY,
    width: outW,
    height: outH,
    scrollable: outScrollable,
    maxScrollY: outMaxScrollY,
    maxScrollX: outMaxScrollX,
    contentWidth,
    contentHeight
  }
}
