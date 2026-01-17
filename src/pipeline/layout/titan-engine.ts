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

// Align-self: 0 = auto (use parent's alignItems), 1+ = same as ALIGN_* constants
const ALIGN_SELF_AUTO = 0

// =============================================================================
// DIMENSION RESOLVER - Handles both absolute and percentage values
// =============================================================================

/**
 * Resolve a dimension value against a parent size.
 * - number: Return as-is (absolute value)
 * - string like '50%': Return parentSize * percentage / 100
 *
 * Performance: Inline check, no function call overhead for common case.
 */
function resolveDim(dim: number | string | null | undefined, parentSize: number): number {
  if (dim == null) return 0
  if (typeof dim === 'number') return dim
  // String percentage like '50%' - parse and resolve
  return Math.floor(parentSize * parseFloat(dim) / 100)
}

/**
 * Apply min/max constraints to a dimension.
 * Resolves percentage constraints against parentSize.
 */
function clampDim(
  value: number,
  minVal: number | string | null | undefined,
  maxVal: number | string | null | undefined,
  parentSize: number
): number {
  const min = resolveDim(minVal, parentSize)
  const max = resolveDim(maxVal, parentSize)

  let result = value
  if (min > 0 && result < min) result = min
  if (max > 0 && result > max) result = max
  return result
}

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
// INTRINSIC CACHE - Skip recomputation when inputs unchanged
// =============================================================================
// For TEXT components: cache based on text content hash + available width + length
// For BOX components: cache based on children intrinsics + layout props
const cachedTextHash: bigint[] = []
const cachedTextLength: number[] = []  // Length check prevents hash collisions
const cachedAvailW: number[] = []
const cachedIntrinsicW: number[] = []
const cachedIntrinsicH: number[] = []

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
  // Intrinsic cache
  cachedTextHash.length = 0
  cachedTextLength.length = 0
  cachedAvailW.length = 0
  cachedIntrinsicW.length = 0
  cachedIntrinsicH.length = 0
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
    // Skip invisible components - they don't participate in layout
    const vis = core.visible[i]
    if (vis === 0 || vis === false) continue

    const parent = core.parentIndex[i] ?? -1

    if (parent >= 0 && indices.has(parent)) {
      if (firstChild[parent] === -1) {
        firstChild[parent] = i
      } else {
        const last = lastChild[parent] ?? -1
        if (last !== -1) nextSibling[last] = i
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
    let child = firstChild[parent] ?? -1
    while (child !== -1) {
      bfsQueue.push(child)
      child = nextSibling[child] ?? -1
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 3: Measure intrinsic sizes (bottom-up)
  // ─────────────────────────────────────────────────────────────────────────
  for (let si = bfsQueue.length - 1; si >= 0; si--) {
    const i = bfsQueue[si]!
    const type = core.componentType[i]

    if (type === ComponentType.TEXT) {
      const content = text.textContent[i]  // SlotArray auto-unwraps & tracks
      // Check for null/undefined, NOT truthiness (0 and '' are valid content!)
      if (content != null) {
        const str = String(content)

        if (str.length > 0) {
          // TEXT WRAPPING: Calculate available width for height measurement
          const parentIdx = core.parentIndex[i] ?? -1
          let availableW = terminalWidth

          if (parentIdx >= 0) {
            const rawParentW = dimensions.width[parentIdx]
            const parentExplicitW = typeof rawParentW === 'number' ? rawParentW : 0
            if (parentExplicitW > 0) {
              const pPadL = spacing.paddingLeft[parentIdx] ?? 0
              const pPadR = spacing.paddingRight[parentIdx] ?? 0
              const pBorderStyle = visual.borderStyle[parentIdx] ?? 0
              const pBorderL = pBorderStyle > 0 || (visual.borderLeft[parentIdx] ?? 0) > 0 ? 1 : 0
              const pBorderR = pBorderStyle > 0 || (visual.borderRight[parentIdx] ?? 0) > 0 ? 1 : 0
              availableW = Math.max(1, parentExplicitW - pPadL - pPadR - pBorderL - pBorderR)
            }
          }

          // CACHE CHECK: Hash text content, compare with cached
          // Only recompute stringWidth/measureTextHeight if content or availableW changed
          // Length check prevents hash collisions (two strings with same hash must also have same length)
          const textHash = BigInt(Bun.hash(str))
          if (textHash === cachedTextHash[i] && availableW === cachedAvailW[i] && str.length === cachedTextLength[i]) {
            // Cache hit - reuse cached intrinsics (skip expensive computation!)
            intrinsicW[i] = cachedIntrinsicW[i]!
            intrinsicH[i] = cachedIntrinsicH[i]!
          } else {
            // Cache miss - compute and store
            intrinsicW[i] = stringWidth(str)
            intrinsicH[i] = measureTextHeight(str, availableW)
            cachedTextHash[i] = textHash
            cachedTextLength[i] = str.length
            cachedAvailW[i] = availableW
            cachedIntrinsicW[i] = intrinsicW[i]
            cachedIntrinsicH[i] = intrinsicH[i]
          }
        } else {
          intrinsicW[i] = 0
          intrinsicH[i] = 0
        }
      }
    } else if (type === ComponentType.INPUT) {
      // INPUT: Single-line, intrinsic width from content, height always 1
      const content = text.textContent[i]  // SlotArray auto-unwraps & tracks
      const str = content != null ? String(content) : ''

      // Get borders and padding for this input
      const borderStyle = visual.borderStyle[i] ?? 0
      const borderT = borderStyle > 0 || (visual.borderTop[i] ?? 0) > 0 ? 1 : 0
      const borderR = borderStyle > 0 || (visual.borderRight[i] ?? 0) > 0 ? 1 : 0
      const borderB = borderStyle > 0 || (visual.borderBottom[i] ?? 0) > 0 ? 1 : 0
      const borderL = borderStyle > 0 || (visual.borderLeft[i] ?? 0) > 0 ? 1 : 0
      const padT = spacing.paddingTop[i] ?? 0
      const padR = spacing.paddingRight[i] ?? 0
      const padB = spacing.paddingBottom[i] ?? 0
      const padL = spacing.paddingLeft[i] ?? 0

      // Intrinsic width: text width + padding + borders
      intrinsicW[i] = stringWidth(str) + padL + padR + borderL + borderR
      // Intrinsic height: 1 line + padding + borders
      intrinsicH[i] = 1 + padT + padB + borderT + borderB
    } else {
      // BOX/Container - calculate intrinsic from children + padding + borders
      // EXCEPTION: Scrollable containers should have minimal intrinsic height
      // so they don't force parents to expand - content scrolls instead
      const overflow = layout.overflow[i] ?? Overflow.VISIBLE
      const isScrollable = overflow === Overflow.SCROLL || overflow === Overflow.AUTO

      let kid = firstChild[i] ?? -1
      if (kid !== -1 && !isScrollable) {
        // Normal containers: intrinsic size includes all children
        const dir = layout.flexDirection[i] ?? FLEX_COLUMN
        const isRow = dir === FLEX_ROW || dir === FLEX_ROW_REVERSE
        const gap = spacing.gap[i] ?? 0

        let sumMain = 0
        let maxCross = 0
        let childCount = 0

        while (kid !== -1) {
          childCount++
          // Use max of explicit dimension and intrinsic size
          // This ensures children with explicit sizes contribute correctly
          // Note: Percentage dimensions (strings) → 0 for intrinsic calculation
          // They'll be resolved against parent computed size in layout phase
          const rawKidW = dimensions.width[kid]
          const rawKidH = dimensions.height[kid]
          const kidExplicitW = typeof rawKidW === 'number' ? rawKidW : 0
          const kidExplicitH = typeof rawKidH === 'number' ? rawKidH : 0
          const kidW = kidExplicitW > 0 ? kidExplicitW : intrinsicW[kid]!
          const kidH = kidExplicitH > 0 ? kidExplicitH : intrinsicH[kid]!

          // FIX: Don't add child borders - intrinsicW/H already includes them,
          // and explicit dimensions are total dimensions (including borders).
          // Adding borders here was DOUBLE-COUNTING and inflating contentHeight.
          //
          // OLD CODE (double-counted borders):
          // const kidBs = visual.borderStyle[kid] ?? 0
          // const kidBordT = kidBs > 0 || (visual.borderTop[kid] ?? 0) > 0 ? 1 : 0
          // const kidBordB = kidBs > 0 || (visual.borderBottom[kid] ?? 0) > 0 ? 1 : 0
          // const kidBordL = kidBs > 0 || (visual.borderLeft[kid] ?? 0) > 0 ? 1 : 0
          // const kidBordR = kidBs > 0 || (visual.borderRight[kid] ?? 0) > 0 ? 1 : 0
          // const kidTotalW = kidW + kidBordL + kidBordR
          // const kidTotalH = kidH + kidBordT + kidBordB

          // Include child margins in intrinsic size (matches layout pass behavior)
          const kidMarginMain = isRow
            ? (spacing.marginLeft[kid] ?? 0) + (spacing.marginRight[kid] ?? 0)
            : (spacing.marginTop[kid] ?? 0) + (spacing.marginBottom[kid] ?? 0)

          if (isRow) {
            sumMain += kidW + kidMarginMain + gap
            maxCross = Math.max(maxCross, kidH)
          } else {
            sumMain += kidH + kidMarginMain + gap
            maxCross = Math.max(maxCross, kidW)
          }
          kid = nextSibling[kid] ?? -1
        }

        if (childCount > 0) sumMain -= gap

        // Add padding and borders to intrinsic size
        const padTop = spacing.paddingTop[i] ?? 0
        const padRight = spacing.paddingRight[i] ?? 0
        const padBottom = spacing.paddingBottom[i] ?? 0
        const padLeft = spacing.paddingLeft[i] ?? 0
        const borderStyle = visual.borderStyle[i] ?? 0
        const borderT = borderStyle > 0 || (visual.borderTop[i] ?? 0) > 0 ? 1 : 0
        const borderR = borderStyle > 0 || (visual.borderRight[i] ?? 0) > 0 ? 1 : 0
        const borderB = borderStyle > 0 || (visual.borderBottom[i] ?? 0) > 0 ? 1 : 0
        const borderL = borderStyle > 0 || (visual.borderLeft[i] ?? 0) > 0 ? 1 : 0

        const extraWidth = padLeft + padRight + borderL + borderR
        const extraHeight = padTop + padBottom + borderT + borderB

        if (isRow) {
          intrinsicW[i] = sumMain + extraWidth
          intrinsicH[i] = maxCross + extraHeight
        } else {
          intrinsicW[i] = maxCross + extraWidth
          intrinsicH[i] = sumMain + extraHeight
        }
      } else if (isScrollable) {
        // Scrollable containers: minimal intrinsic size (just padding + borders)
        // Children will overflow and be scrollable, not force container to expand
        const padTop = spacing.paddingTop[i] ?? 0
        const padRight = spacing.paddingRight[i] ?? 0
        const padBottom = spacing.paddingBottom[i] ?? 0
        const padLeft = spacing.paddingLeft[i] ?? 0
        const borderStyle = visual.borderStyle[i] ?? 0
        const borderT = borderStyle > 0 || (visual.borderTop[i] ?? 0) > 0 ? 1 : 0
        const borderR = borderStyle > 0 || (visual.borderRight[i] ?? 0) > 0 ? 1 : 0
        const borderB = borderStyle > 0 || (visual.borderBottom[i] ?? 0) > 0 ? 1 : 0
        const borderL = borderStyle > 0 || (visual.borderLeft[i] ?? 0) > 0 ? 1 : 0

        intrinsicW[i] = padLeft + padRight + borderL + borderR
        intrinsicH[i] = padTop + padBottom + borderT + borderB
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
    let kid = firstChild[parent] ?? -1
    while (kid !== -1) {
      if ((layout.position[kid] ?? POS_RELATIVE) !== POS_ABSOLUTE) {
        flowKids.push(kid)
      }
      kid = nextSibling[kid] ?? -1
    }

    if (flowKids.length === 0) return

    // Parent's content area
    const pPadT = spacing.paddingTop[parent] ?? 0
    const pPadR = spacing.paddingRight[parent] ?? 0
    const pPadB = spacing.paddingBottom[parent] ?? 0
    const pPadL = spacing.paddingLeft[parent] ?? 0

    const pBs = visual.borderStyle[parent] ?? 0
    const pBordT = pBs > 0 || (visual.borderTop[parent] ?? 0) > 0 ? 1 : 0
    const pBordR = pBs > 0 || (visual.borderRight[parent] ?? 0) > 0 ? 1 : 0
    const pBordB = pBs > 0 || (visual.borderBottom[parent] ?? 0) > 0 ? 1 : 0
    const pBordL = pBs > 0 || (visual.borderLeft[parent] ?? 0) > 0 ? 1 : 0

    const contentX = outX[parent]! + pPadL + pBordL
    const contentY = outY[parent]! + pPadT + pBordT
    const contentW = Math.max(0, outW[parent]! - pPadL - pPadR - pBordL - pBordR)
    const contentH = Math.max(0, outH[parent]! - pPadT - pPadB - pBordT - pBordB)

    // Flex properties
    const dir = layout.flexDirection[parent] ?? FLEX_COLUMN
    const wrap = layout.flexWrap[parent] ?? WRAP_NOWRAP
    const justify = layout.justifyContent[parent] ?? JUSTIFY_START
    const alignItems = layout.alignItems[parent] ?? ALIGN_STRETCH
    const gap = spacing.gap[parent] ?? 0
    const overflow = layout.overflow[parent] ?? Overflow.VISIBLE

    const isRow = dir === FLEX_ROW || dir === FLEX_ROW_REVERSE
    const isReverse = dir === FLEX_ROW_REVERSE || dir === FLEX_COLUMN_REVERSE
    // Scrollable containers should NOT shrink children - content scrolls instead
    // In fullscreen mode, root boxes (parentIndex === -1) are auto-scrollable
    const isRoot = (core.parentIndex[parent] ?? -1) < 0
    const isScrollableParent = overflow === Overflow.SCROLL || overflow === Overflow.AUTO || (isRoot && constrainHeight)

    const mainSize = isRow ? contentW : contentH
    const crossSize = isRow ? contentH : contentW

    // STEP 1: Collect items into flex lines
    // Child dimensions resolve percentages against parent's content area
    let lineStart = 0
    let currentMain = 0

    for (let fi = 0; fi < flowKids.length; fi++) {
      const fkid = flowKids[fi]!
      const ew = resolveDim(dimensions.width[fkid], contentW)
      const eh = resolveDim(dimensions.height[fkid], contentH)
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
        totalGrow += layout.flexGrow[fkid] ?? 0
        totalShrink += layout.flexShrink[fkid] ?? 1
      }

      for (let fi = lStart; fi <= lEnd; fi++) {
        const fkid = flowKids[fi]!
        const ew = resolveDim(dimensions.width[fkid], contentW)
        const eh = resolveDim(dimensions.height[fkid], contentH)

        // flex-basis takes priority over width/height for main axis size
        const basis = layout.flexBasis[fkid] ?? 0
        let kidMain = basis > 0
          ? basis
          : (isRow
              ? (ew > 0 ? ew : intrinsicW[fkid]!)
              : (eh > 0 ? eh : intrinsicH[fkid]!))

        if (freeSpace > 0 && totalGrow > 0) {
          kidMain += ((layout.flexGrow[fkid] ?? 0) / totalGrow) * freeSpace
        } else if (freeSpace < 0 && totalShrink > 0 && !isScrollableParent) {
          // Only shrink if parent is NOT scrollable
          // Scrollable containers let content overflow and scroll instead
          kidMain += ((layout.flexShrink[fkid] ?? 1) / totalShrink) * freeSpace
        }
        kidMain = Math.max(0, Math.floor(kidMain))

        // Apply min/max constraints for main axis
        const minMain = isRow ? dimensions.minWidth[fkid] : dimensions.minHeight[fkid]
        const maxMain = isRow ? dimensions.maxWidth[fkid] : dimensions.maxHeight[fkid]
        kidMain = clampDim(kidMain, minMain, maxMain, isRow ? contentW : contentH)

        let kidCross = isRow
          ? (eh > 0 ? eh : (alignItems === ALIGN_STRETCH ? crossSize / lineCount : intrinsicH[fkid]!))
          : (ew > 0 ? ew : (alignItems === ALIGN_STRETCH ? crossSize / lineCount : intrinsicW[fkid]!))

        // Apply min/max constraints for cross axis
        const minCross = isRow ? dimensions.minHeight[fkid] : dimensions.minWidth[fkid]
        const maxCross = isRow ? dimensions.maxHeight[fkid] : dimensions.maxWidth[fkid]
        kidCross = clampDim(Math.max(0, Math.floor(kidCross)), minCross, maxCross, isRow ? contentH : contentW)

        itemMain[fkid] = kidMain
        itemCross[fkid] = kidCross
      }
    }

    // STEP 3: Position items
    let crossOffset = 0
    // Ensure minimum lineHeight of 1 to prevent all lines stacking at same position
    // when there are more lines than vertical space
    const lineHeight = lineCount > 0 ? Math.max(1, Math.floor(crossSize / lineCount)) : crossSize

    for (let li = 0; li < lineCount; li++) {
      const lineIdx = isReverse ? lineCount - 1 - li : li
      const lStart = lineStarts[lineIdx]!
      const lEnd = lineEnds[lineIdx]!

      let lineMain = 0
      for (let fi = lStart; fi <= lEnd; fi++) {
        const kid = flowKids[fi]!
        // Include margins in line size calculation (CSS box model)
        const mMain = isRow
          ? (spacing.marginLeft[kid] ?? 0) + (spacing.marginRight[kid] ?? 0)
          : (spacing.marginTop[kid] ?? 0) + (spacing.marginBottom[kid] ?? 0)
        lineMain += itemMain[kid]! + mMain + gap
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

      // Always iterate in DOM order - the reversed position calculation
      // handles the visual reversal for row-reverse/column-reverse
      for (let fi = lStart; fi <= lEnd; fi++) {
        const fkid = flowKids[fi]!
        const sizeMain = itemMain[fkid]!
        const sizeCross = itemCross[fkid]!

        // Read margins for CSS-compliant positioning
        const mTop = spacing.marginTop[fkid] ?? 0
        const mRight = spacing.marginRight[fkid] ?? 0
        const mBottom = spacing.marginBottom[fkid] ?? 0
        const mLeft = spacing.marginLeft[fkid] ?? 0

        // align-self overrides parent's align-items for individual items
        // alignSelf: 0=auto, 1=stretch, 2=flex-start, 3=center, 4=flex-end, 5=baseline
        // alignItems: 0=stretch, 1=flex-start, 2=center, 3=flex-end
        // When alignSelf != 0, we subtract 1 to map to alignItems values
        const selfAlign = layout.alignSelf[fkid] ?? ALIGN_SELF_AUTO
        const effectiveAlign = selfAlign !== ALIGN_SELF_AUTO ? (selfAlign - 1) : alignItems

        let crossPos = crossOffset
        switch (effectiveAlign) {
          case ALIGN_CENTER:
            crossPos += Math.floor((lineHeight - sizeCross) / 2)
            break
          case ALIGN_END:
            crossPos += lineHeight - sizeCross
            break
        }

        // CSS Flexbox: margins offset item position and add space between items
        // For row-reverse/column-reverse, position from the end of the axis
        if (isRow) {
          if (dir === FLEX_ROW_REVERSE) {
            // row-reverse: position from right edge
            outX[fkid] = contentX + contentW - mainOffset - sizeMain - mRight
          } else {
            outX[fkid] = contentX + mainOffset + mLeft
          }
          outY[fkid] = contentY + crossPos + mTop
          outW[fkid] = sizeMain
          outH[fkid] = sizeCross
        } else {
          outX[fkid] = contentX + crossPos + mLeft
          if (dir === FLEX_COLUMN_REVERSE) {
            // column-reverse: position from bottom edge
            outY[fkid] = contentY + contentH - mainOffset - sizeMain - mBottom
          } else {
            outY[fkid] = contentY + mainOffset + mTop
          }
          outW[fkid] = sizeCross
          outH[fkid] = sizeMain
        }

        // TEXT WRAPPING: Now that we know the width, recalculate height for TEXT
        // This fixes the intrinsicH=1 assumption - text wraps to actual width
        if (core.componentType[fkid] === ComponentType.TEXT) {
          const content = text.textContent[fkid]  // SlotArray auto-unwraps & tracks
          if (content != null) {
            const str = String(content)
            if (str.length > 0) {
              const wrappedHeight = measureTextHeight(str, outW[fkid]!)
              outH[fkid] = Math.max(1, wrappedHeight)
            }
          }
        }

        // INPUT: Single-line, always height 1 (content scrolls horizontally)
        if (core.componentType[fkid] === ComponentType.INPUT) {
          // Add border height if borders are present
          const borderStyle = visual.borderStyle[fkid] ?? 0
          const borderT = borderStyle > 0 || (visual.borderTop[fkid] ?? 0) > 0 ? 1 : 0
          const borderB = borderStyle > 0 || (visual.borderBottom[fkid] ?? 0) > 0 ? 1 : 0
          const padT = spacing.paddingTop[fkid] ?? 0
          const padB = spacing.paddingBottom[fkid] ?? 0
          outH[fkid] = 1 + borderT + borderB + padT + padB
        }

        // Track max extent inline (zero overhead) - include margins
        if (isRow) {
          childrenMaxMain = Math.max(childrenMaxMain, mainOffset + mLeft + outW[fkid]! + mRight)
          childrenMaxCross = Math.max(childrenMaxCross, crossPos + mTop + outH[fkid]! + mBottom)
        } else {
          childrenMaxMain = Math.max(childrenMaxMain, mainOffset + mTop + outH[fkid]! + mBottom)
          childrenMaxCross = Math.max(childrenMaxCross, crossPos + mLeft + outW[fkid]! + mRight)
        }

        // Advance mainOffset including margins (CSS box model)
        const mainMargin = isRow ? (mLeft + mRight) : (mTop + mBottom)
        mainOffset += (isRow ? outW[fkid]! : outH[fkid]!) + mainMargin + itemGap
      }

      crossOffset += lineHeight
    }

    // Scroll detection - uses values tracked inline above (no extra loop!)
    // Note: overflow already read above for isScrollableParent check
    if (isScrollableParent) {
      const childrenMaxX = isRow ? childrenMaxMain : childrenMaxCross
      const childrenMaxY = isRow ? childrenMaxCross : childrenMaxMain
      const scrollRangeX = Math.max(0, childrenMaxX - contentW)
      const scrollRangeY = Math.max(0, childrenMaxY - contentH)

      if (overflow === Overflow.SCROLL || scrollRangeX > 0 || scrollRangeY > 0) {
        // overflow === SCROLL always scrollable; AUTO only if content overflows
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
    let container = core.parentIndex[i] ?? -1
    while (container >= 0 && indices.has(container)) {
      if ((layout.position[container] ?? POS_RELATIVE) !== POS_RELATIVE) break
      container = core.parentIndex[container] ?? -1
    }

    let containerX = 0, containerY = 0, containerW = outW[0] ?? 80, containerH = outH[0] ?? 24
    if (container >= 0 && indices.has(container)) {
      containerX = outX[container]!
      containerY = outY[container]!
      containerW = outW[container]!
      containerH = outH[container]!
    }

    // Resolve dimensions against containing block
    const ew = resolveDim(dimensions.width[i], containerW)
    const eh = resolveDim(dimensions.height[i], containerH)
    let absW = ew > 0 ? ew : intrinsicW[i]!
    let absH = eh > 0 ? eh : intrinsicH[i]!

    // Apply min/max constraints
    absW = clampDim(absW, dimensions.minWidth[i], dimensions.maxWidth[i], containerW)
    absH = clampDim(absH, dimensions.minHeight[i], dimensions.maxHeight[i], containerH)
    outW[i] = absW
    outH[i] = absH

    const t = layout.top[i]
    const r = layout.right[i]
    const b = layout.bottom[i]
    const l = layout.left[i]

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
  // Root elements resolve percentage dimensions against terminal size
  for (let ri = 0; ri < rootCount; ri++) {
    const root = bfsQueue[ri]!
    const rawW = dimensions.width[root]
    const rawH = dimensions.height[root]
    const ew = resolveDim(rawW, terminalWidth)
    const eh = resolveDim(rawH, terminalHeight)

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
    if ((layout.position[i] ?? POS_RELATIVE) === POS_ABSOLUTE) {
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
