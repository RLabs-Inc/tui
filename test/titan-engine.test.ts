/**
 * TUI Framework - TITAN Layout Engine Tests
 *
 * Real tests for the layout engine. No sugar-coating.
 * Tests cover:
 * - Basic positioning
 * - Flex direction (row/column)
 * - Flex grow/shrink
 * - Justify content (all values)
 * - Align items (all values)
 * - Flex wrap
 * - Min/max constraints
 * - Percentage dimensions
 * - Visibility (invisible components should be skipped)
 * - Nested layouts
 * - Scroll bounds detection
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { bind } from '@rlabs-inc/signals'

import { computeLayoutTitan, resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { ComponentType } from '../src/types'
import * as core from '../src/engine/arrays/core'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as spacing from '../src/engine/arrays/spacing'
import * as layout from '../src/engine/arrays/layout'
import * as visual from '../src/engine/arrays/visual'
import * as text from '../src/engine/arrays/text'
import { FlexDirection, FlexWrap, JustifyContent, AlignItems, Position, Overflow } from '../src/pipeline/layout/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Set up a single box component in the parallel arrays.
 * Returns the index used.
 */
function setupBox(
  index: number,
  parentIndex: number,
  props: {
    width?: number | string
    height?: number | string
    minWidth?: number | string
    maxWidth?: number | string
    minHeight?: number | string
    maxHeight?: number | string
    flexGrow?: number
    flexShrink?: number
    flexBasis?: number | string
    flexDirection?: number
    flexWrap?: number
    justifyContent?: number
    alignItems?: number
    alignSelf?: number
    position?: number
    top?: number
    left?: number
    marginTop?: number
    marginRight?: number
    marginBottom?: number
    marginLeft?: number
    paddingTop?: number
    paddingRight?: number
    paddingBottom?: number
    paddingLeft?: number
    visible?: boolean | number
    overflow?: number
    gap?: number
  } = {}
): number {
  // Ensure capacity
  core.ensureCapacity(index)
  dimensions.ensureCapacity(index)
  spacing.ensureCapacity(index)
  layout.ensureCapacity(index)
  visual.ensureCapacity(index)
  text.ensureCapacity(index)

  // Core
  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(parentIndex)
  core.visible[index] = bind(props.visible ?? 1)
  core.componentId[index] = bind(`box-${index}`)

  // Dimensions
  dimensions.width[index] = bind(props.width ?? 0)
  dimensions.height[index] = bind(props.height ?? 0)
  dimensions.minWidth[index] = bind(props.minWidth ?? null)
  dimensions.maxWidth[index] = bind(props.maxWidth ?? null)
  dimensions.minHeight[index] = bind(props.minHeight ?? null)
  dimensions.maxHeight[index] = bind(props.maxHeight ?? null)

  // Spacing
  spacing.marginTop[index] = bind(props.marginTop ?? 0)
  spacing.marginRight[index] = bind(props.marginRight ?? 0)
  spacing.marginBottom[index] = bind(props.marginBottom ?? 0)
  spacing.marginLeft[index] = bind(props.marginLeft ?? 0)
  spacing.paddingTop[index] = bind(props.paddingTop ?? 0)
  spacing.paddingRight[index] = bind(props.paddingRight ?? 0)
  spacing.paddingBottom[index] = bind(props.paddingBottom ?? 0)
  spacing.paddingLeft[index] = bind(props.paddingLeft ?? 0)

  // Layout
  layout.flexDirection[index] = bind(props.flexDirection ?? FlexDirection.COLUMN)
  layout.flexWrap[index] = bind(props.flexWrap ?? FlexWrap.NO_WRAP)
  layout.justifyContent[index] = bind(props.justifyContent ?? JustifyContent.FLEX_START)
  layout.alignItems[index] = bind(props.alignItems ?? AlignItems.STRETCH)
  layout.alignSelf[index] = bind(props.alignSelf ?? 0) // 0 = auto
  layout.flexGrow[index] = bind(props.flexGrow ?? 0)
  layout.flexShrink[index] = bind(props.flexShrink ?? 1)
  layout.flexBasis[index] = bind(props.flexBasis ?? null)
  layout.position[index] = bind(props.position ?? Position.RELATIVE)
  layout.top[index] = bind(props.top ?? null)
  layout.left[index] = bind(props.left ?? null)
  layout.overflow[index] = bind(props.overflow ?? Overflow.VISIBLE)
  spacing.gap[index] = bind(props.gap ?? 0)

  // Visual (minimal for layout tests)
  visual.borderTop[index] = bind(0)
  visual.borderRight[index] = bind(0)
  visual.borderBottom[index] = bind(0)
  visual.borderLeft[index] = bind(0)
  visual.fgColor[index] = bind(null)
  visual.bgColor[index] = bind(null)

  // Text (not used for boxes, but needed for array capacity)
  text.textContent[index] = bind('')
  text.textAlign[index] = bind(0)
  text.textWrap[index] = bind(0)
  text.textAttrs[index] = bind(0)

  return index
}

/**
 * Set up a text component in the parallel arrays.
 */
function setupText(
  index: number,
  parentIndex: number,
  content: string,
  props: {
    width?: number | string
    height?: number | string
    visible?: boolean | number
  } = {}
): number {
  setupBox(index, parentIndex, { ...props, width: props.width ?? 0, height: props.height ?? 0 })
  core.componentType[index] = ComponentType.TEXT
  text.textContent[index] = bind(content)
  return index
}

/**
 * Clear all arrays between tests.
 */
function clearArrays(): void {
  // Reset array lengths
  core.componentType.length = 0
  core.parentIndex.length = 0
  core.visible.length = 0
  core.componentId.length = 0

  dimensions.width.length = 0
  dimensions.height.length = 0
  dimensions.minWidth.length = 0
  dimensions.maxWidth.length = 0
  dimensions.minHeight.length = 0
  dimensions.maxHeight.length = 0

  spacing.marginTop.length = 0
  spacing.marginRight.length = 0
  spacing.marginBottom.length = 0
  spacing.marginLeft.length = 0
  spacing.paddingTop.length = 0
  spacing.paddingRight.length = 0
  spacing.paddingBottom.length = 0
  spacing.paddingLeft.length = 0
  spacing.gap.length = 0

  layout.flexDirection.length = 0
  layout.flexWrap.length = 0
  layout.justifyContent.length = 0
  layout.alignItems.length = 0
  layout.alignSelf.length = 0
  layout.flexGrow.length = 0
  layout.flexShrink.length = 0
  layout.flexBasis.length = 0
  layout.position.length = 0
  layout.top.length = 0
  layout.left.length = 0
  layout.overflow.length = 0

  visual.borderTop.length = 0
  visual.borderRight.length = 0
  visual.borderBottom.length = 0
  visual.borderLeft.length = 0
  visual.fgColor.length = 0
  visual.bgColor.length = 0

  text.textContent.length = 0
  text.textAlign.length = 0
  text.textWrap.length = 0
  text.textAttrs.length = 0

  resetTitanArrays()
}

// =============================================================================
// BASIC POSITIONING TESTS
// =============================================================================

describe('TITAN Basic Positioning', () => {
  beforeEach(clearArrays)

  test('single root box fills terminal', () => {
    const indices = new Set([0])
    setupBox(0, -1, { width: 80, height: 24 })

    const result = computeLayoutTitan(80, 24, indices)

    expect(result.x[0]).toBe(0)
    expect(result.y[0]).toBe(0)
    expect(result.width[0]).toBe(80)
    expect(result.height[0]).toBe(24)
  })

  test('root box smaller than terminal', () => {
    const indices = new Set([0])
    setupBox(0, -1, { width: 40, height: 10 })

    const result = computeLayoutTitan(80, 24, indices)

    expect(result.x[0]).toBe(0)
    expect(result.y[0]).toBe(0)
    expect(result.width[0]).toBe(40)
    expect(result.height[0]).toBe(10)
  })

  test('child box inside parent', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 80, height: 24 })
    setupBox(1, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(80, 24, indices)

    expect(result.x[1]).toBe(0)
    expect(result.y[1]).toBe(0)
    expect(result.width[1]).toBe(20)
    expect(result.height[1]).toBe(10)
  })

  test('multiple children stack vertically by default', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 80, height: 24, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 5 })
    setupBox(2, 0, { width: 30, height: 5 })

    const result = computeLayoutTitan(80, 24, indices)

    // First child at y=0
    expect(result.y[1]).toBe(0)
    expect(result.height[1]).toBe(5)

    // Second child at y=5 (after first child)
    expect(result.y[2]).toBe(5)
    expect(result.height[2]).toBe(5)
  })
})

// =============================================================================
// FLEX DIRECTION TESTS
// =============================================================================

describe('TITAN Flex Direction', () => {
  beforeEach(clearArrays)

  test('flexDirection: row arranges children horizontally', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 80, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 30, height: 10 })

    const result = computeLayoutTitan(80, 24, indices)

    // Both at y=0
    expect(result.y[1]).toBe(0)
    expect(result.y[2]).toBe(0)

    // First at x=0, second at x=20
    expect(result.x[1]).toBe(0)
    expect(result.x[2]).toBe(20)
  })

  test('flexDirection: column arranges children vertically', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 80, height: 24, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 5 })
    setupBox(2, 0, { width: 30, height: 7 })

    const result = computeLayoutTitan(80, 24, indices)

    // Both at x=0
    expect(result.x[1]).toBe(0)
    expect(result.x[2]).toBe(0)

    // First at y=0, second at y=5
    expect(result.y[1]).toBe(0)
    expect(result.y[2]).toBe(5)
  })

  test('flexDirection: row-reverse reverses horizontal order', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 80, height: 24, flexDirection: FlexDirection.ROW_REVERSE })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 30, height: 10 })

    const result = computeLayoutTitan(80, 24, indices)

    // Items arranged from right edge
    // Child 1 (width 20) should be at x=60 (80-20)
    // Child 2 (width 30) should be at x=30 (60-30)
    expect(result.x[1]).toBe(60)
    expect(result.x[2]).toBe(30)
  })
})

// =============================================================================
// FLEX GROW/SHRINK TESTS
// =============================================================================

describe('TITAN Flex Grow/Shrink', () => {
  beforeEach(clearArrays)

  test('flexGrow distributes remaining space', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 20, height: 10, flexGrow: 1 })
    setupBox(2, 0, { width: 20, height: 10, flexGrow: 1 })

    const result = computeLayoutTitan(100, 24, indices)

    // 100 - 40 = 60 remaining, split 50/50
    // Each grows by 30, so 20 + 30 = 50 each
    expect(result.width[1]).toBe(50)
    expect(result.width[2]).toBe(50)
  })

  test('flexGrow with different ratios', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 10, height: 10, flexGrow: 1 })
    setupBox(2, 0, { width: 10, height: 10, flexGrow: 3 })

    const result = computeLayoutTitan(100, 24, indices)

    // 100 - 20 = 80 remaining
    // Child 1 gets 80 * (1/4) = 20 -> total 30
    // Child 2 gets 80 * (3/4) = 60 -> total 70
    expect(result.width[1]).toBe(30)
    expect(result.width[2]).toBe(70)
  })

  test('flexShrink reduces items when overflow', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 50, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 40, height: 10, flexShrink: 1 })
    setupBox(2, 0, { width: 40, height: 10, flexShrink: 1 })

    const result = computeLayoutTitan(50, 24, indices)

    // 80 needs to shrink to 50, overflow = 30
    // Each shrinks by 15, so 40 - 15 = 25 each
    expect(result.width[1]).toBe(25)
    expect(result.width[2]).toBe(25)
  })

  test('flexGrow: 0 means no growth', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 20, height: 10, flexGrow: 0 })
    setupBox(2, 0, { width: 20, height: 10, flexGrow: 1 })

    const result = computeLayoutTitan(100, 24, indices)

    // Child 1 stays at 20
    // Child 2 gets all 60 remaining
    expect(result.width[1]).toBe(20)
    expect(result.width[2]).toBe(80)
  })
})

// =============================================================================
// JUSTIFY CONTENT TESTS
// =============================================================================

describe('TITAN Justify Content', () => {
  beforeEach(clearArrays)

  test('justifyContent: flex-start (default)', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.FLEX_START })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    expect(result.x[1]).toBe(0)
    expect(result.x[2]).toBe(20)
  })

  test('justifyContent: flex-end', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.FLEX_END })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // 100 - 40 = 60 offset
    expect(result.x[1]).toBe(60)
    expect(result.x[2]).toBe(80)
  })

  test('justifyContent: center', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.CENTER })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // (100 - 40) / 2 = 30 offset
    expect(result.x[1]).toBe(30)
    expect(result.x[2]).toBe(50)
  })

  test('justifyContent: space-between', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.SPACE_BETWEEN })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // First at start, second at end
    expect(result.x[1]).toBe(0)
    expect(result.x[2]).toBe(80) // 100 - 20
  })

  test('justifyContent: space-around', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.SPACE_AROUND })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // 60 remaining space, divided into 4 parts (2 * 2 items)
    // Each item gets 15 on each side
    expect(result.x[1]).toBe(15)
    expect(result.x[2]).toBe(65) // 15 + 20 + 30 (middle gap)
  })

  test('justifyContent: space-evenly', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, justifyContent: JustifyContent.SPACE_EVENLY })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // 60 remaining space, divided into 3 gaps
    // Each gap = 20
    expect(result.x[1]).toBe(20)
    expect(result.x[2]).toBe(60) // 20 + 20 + 20
  })
})

// =============================================================================
// ALIGN ITEMS TESTS
// =============================================================================

describe('TITAN Align Items', () => {
  beforeEach(clearArrays)

  test('alignItems: stretch (default)', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.ROW, alignItems: AlignItems.STRETCH })
    setupBox(1, 0, { width: 20, height: 0 }) // height: 0 means stretch

    const result = computeLayoutTitan(100, 50, indices)

    // Child should stretch to parent height
    expect(result.height[1]).toBe(50)
  })

  test('alignItems: flex-start', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.ROW, alignItems: AlignItems.FLEX_START })
    setupBox(1, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.y[1]).toBe(0)
    expect(result.height[1]).toBe(10)
  })

  test('alignItems: flex-end', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.ROW, alignItems: AlignItems.FLEX_END })
    setupBox(1, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.y[1]).toBe(40) // 50 - 10
    expect(result.height[1]).toBe(10)
  })

  test('alignItems: center', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.ROW, alignItems: AlignItems.CENTER })
    setupBox(1, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.y[1]).toBe(20) // (50 - 10) / 2
    expect(result.height[1]).toBe(10)
  })
})

// =============================================================================
// VISIBILITY TESTS
// =============================================================================

describe('TITAN Visibility', () => {
  beforeEach(clearArrays)

  test('invisible components are skipped in layout', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10, visible: false }) // Invisible
    setupBox(3, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    // Child 1 at y=0
    expect(result.y[1]).toBe(0)

    // Child 3 at y=10 (invisible child 2 takes no space)
    expect(result.y[3]).toBe(10)
  })

  test('visible: 0 also hides components', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 30, height: 10 })
    setupBox(2, 0, { width: 30, height: 10, visible: 0 })

    const result = computeLayoutTitan(100, 24, indices)

    // Only visible child
    expect(result.width[1]).toBe(30)
  })
})

// =============================================================================
// PERCENTAGE DIMENSIONS TESTS
// =============================================================================

describe('TITAN Percentage Dimensions', () => {
  beforeEach(clearArrays)

  test('width: 50% of parent', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 24 })
    setupBox(1, 0, { width: '50%', height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    expect(result.width[1]).toBe(50)
  })

  test('height: 100% of parent', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50 })
    setupBox(1, 0, { width: 20, height: '100%' })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.height[1]).toBe(50)
  })

  test('width: 25% of terminal', () => {
    const indices = new Set([0])
    setupBox(0, -1, { width: '25%', height: 10 })

    const result = computeLayoutTitan(200, 50, indices)

    expect(result.width[0]).toBe(50) // 200 * 0.25
  })
})

// =============================================================================
// MIN/MAX CONSTRAINT TESTS
// =============================================================================

describe('TITAN Min/Max Constraints', () => {
  beforeEach(clearArrays)

  test('minWidth prevents shrinking below', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 50, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 40, height: 10, minWidth: 30, flexShrink: 1 })
    setupBox(2, 0, { width: 40, height: 10, flexShrink: 1 })

    const result = computeLayoutTitan(50, 24, indices)

    // Child 1 cannot shrink below 30
    expect(result.width[1]).toBeGreaterThanOrEqual(30)
  })

  test('maxWidth prevents growing beyond', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW })
    setupBox(1, 0, { width: 20, height: 10, flexGrow: 1, maxWidth: 50 })

    const result = computeLayoutTitan(100, 24, indices)

    expect(result.width[1]).toBe(50) // Capped at maxWidth
  })

  test('minHeight prevents shrinking', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 10, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 30, minHeight: 20 })

    const result = computeLayoutTitan(100, 10, indices)

    expect(result.height[1]).toBeGreaterThanOrEqual(20)
  })

  test('maxHeight as percentage', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 100 })
    setupBox(1, 0, { width: 20, height: 200, maxHeight: '50%' })

    const result = computeLayoutTitan(100, 100, indices)

    expect(result.height[1]).toBe(50) // 100 * 0.5
  })
})

// =============================================================================
// MARGIN/PADDING TESTS
// =============================================================================

describe('TITAN Margins and Padding', () => {
  beforeEach(clearArrays)

  test('margins offset child position', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50 })
    setupBox(1, 0, { width: 20, height: 10, marginTop: 5, marginLeft: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.x[1]).toBe(10)
    expect(result.y[1]).toBe(5)
  })

  test('padding creates space inside parent', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 100, height: 50, paddingTop: 10, paddingLeft: 15 })
    setupBox(1, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.x[1]).toBe(15) // Offset by parent padding
    expect(result.y[1]).toBe(10)
  })

  test('margins between siblings create gaps', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 10, marginBottom: 5 })
    setupBox(2, 0, { width: 20, height: 10, marginTop: 5 })

    const result = computeLayoutTitan(100, 50, indices)

    // Child 2 at y = 10 + 5 + 5 = 20 (or margin collapse)
    expect(result.y[2]).toBeGreaterThan(result.y[1] + result.height[1])
  })
})

// =============================================================================
// GAP TESTS
// =============================================================================

describe('TITAN Gap', () => {
  beforeEach(clearArrays)

  test('gap adds space between children in row', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 24, flexDirection: FlexDirection.ROW, gap: 10 })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 24, indices)

    expect(result.x[1]).toBe(0)
    expect(result.x[2]).toBe(30) // 20 + 10 gap
  })

  test('gap adds space between children in column', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.COLUMN, gap: 5 })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 50, indices)

    expect(result.y[1]).toBe(0)
    expect(result.y[2]).toBe(15) // 10 + 5 gap
  })
})

// =============================================================================
// NESTED LAYOUTS TESTS
// =============================================================================

describe('TITAN Nested Layouts', () => {
  beforeEach(clearArrays)

  test('nested row inside column', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 100, height: 50, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 100, height: 20, flexDirection: FlexDirection.ROW })
    setupBox(2, 1, { width: 30, height: 20 })
    setupBox(3, 1, { width: 40, height: 20 })

    const result = computeLayoutTitan(100, 50, indices)

    // Row container at y=0
    expect(result.y[1]).toBe(0)

    // Children arranged horizontally
    expect(result.x[2]).toBe(0)
    expect(result.x[3]).toBe(30)
    expect(result.y[2]).toBe(0)
    expect(result.y[3]).toBe(0)
  })

  test('deeply nested boxes', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 100, height: 100 })
    setupBox(1, 0, { width: 80, height: 80, marginLeft: 10, marginTop: 10 })
    setupBox(2, 1, { width: 60, height: 60, marginLeft: 5, marginTop: 5 })
    setupBox(3, 2, { width: 40, height: 40, marginLeft: 5, marginTop: 5 })

    const result = computeLayoutTitan(100, 100, indices)

    expect(result.x[1]).toBe(10)
    expect(result.y[1]).toBe(10)

    // x = 10 (parent margin) + 5 = 15
    expect(result.x[2]).toBe(15)
    expect(result.y[2]).toBe(15)

    // x = 15 + 5 = 20
    expect(result.x[3]).toBe(20)
    expect(result.y[3]).toBe(20)
  })
})

// =============================================================================
// SCROLL BOUNDS TESTS
// =============================================================================

describe('TITAN Scroll Bounds', () => {
  beforeEach(clearArrays)

  test('overflow: scroll marks container as scrollable', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 50, height: 20, overflow: Overflow.SCROLL })
    setupBox(1, 0, { width: 50, height: 100 }) // Child larger than parent

    const result = computeLayoutTitan(50, 20, indices)

    expect(result.scrollable[0]).toBe(1)
    expect(result.maxScrollY[0]).toBeGreaterThan(0)
  })

  test('overflow: auto only scrollable when content overflows', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 50, height: 50, overflow: Overflow.AUTO })
    setupBox(1, 0, { width: 40, height: 30 }) // Child fits

    const result = computeLayoutTitan(50, 50, indices)

    // Should not need scroll
    expect(result.maxScrollY[0]).toBe(0)
  })

  test('maxScrollY calculated correctly', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 50, height: 20, overflow: Overflow.SCROLL })
    setupBox(1, 0, { width: 50, height: 100 })

    const result = computeLayoutTitan(50, 20, indices)

    // maxScrollY = content height - container height = 100 - 20 = 80
    expect(result.maxScrollY[0]).toBe(80)
  })
})

// =============================================================================
// FLEX WRAP TESTS
// =============================================================================

describe('TITAN Flex Wrap', () => {
  beforeEach(clearArrays)

  test('flexWrap: nowrap keeps items on single line', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 50, height: 50, flexDirection: FlexDirection.ROW, flexWrap: FlexWrap.NO_WRAP })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 20, height: 10 })
    setupBox(3, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(50, 50, indices)

    // All on same line (y = 0), even though they overflow
    expect(result.y[1]).toBe(0)
    expect(result.y[2]).toBe(0)
    expect(result.y[3]).toBe(0)
  })

  test('flexWrap: wrap moves items to next line', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 50, height: 50, flexDirection: FlexDirection.ROW, flexWrap: FlexWrap.WRAP })
    setupBox(1, 0, { width: 30, height: 10 })
    setupBox(2, 0, { width: 30, height: 10 })
    setupBox(3, 0, { width: 30, height: 10 })

    const result = computeLayoutTitan(50, 50, indices)

    // First item on line 1
    expect(result.y[1]).toBe(0)

    // CSS default is align-content: stretch
    // 3 lines in 50 height = 16.67 per line (floored to 16)
    // Second item wraps to line 2 at y=16
    expect(result.y[2]).toBe(16)

    // Third item on line 3 at y=32
    expect(result.y[3]).toBe(32)
  })
})

// =============================================================================
// ABSOLUTE POSITIONING TESTS
// =============================================================================

describe('TITAN Absolute Positioning', () => {
  beforeEach(clearArrays)

  test('position: absolute positions relative to parent', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 100 })
    setupBox(1, 0, { width: 20, height: 10 }) // Normal flow
    setupBox(2, 0, { width: 30, height: 15, position: Position.ABSOLUTE, top: 50, left: 60 })

    const result = computeLayoutTitan(100, 100, indices)

    // Normal child at 0,0
    expect(result.x[1]).toBe(0)
    expect(result.y[1]).toBe(0)

    // Absolute child at specified position
    expect(result.x[2]).toBe(60)
    expect(result.y[2]).toBe(50)
  })

  test('absolute elements do not affect flow', () => {
    const indices = new Set([0, 1, 2, 3])
    setupBox(0, -1, { width: 100, height: 100, flexDirection: FlexDirection.COLUMN })
    setupBox(1, 0, { width: 20, height: 10 })
    setupBox(2, 0, { width: 50, height: 50, position: Position.ABSOLUTE, top: 0, left: 0 })
    setupBox(3, 0, { width: 20, height: 10 })

    const result = computeLayoutTitan(100, 100, indices)

    // Child 3 follows child 1, ignoring absolute child 2
    expect(result.y[1]).toBe(0)
    expect(result.y[3]).toBe(10) // Directly after child 1
  })
})

// =============================================================================
// CONTENT BOUNDS TESTS
// =============================================================================

describe('TITAN Content Bounds', () => {
  beforeEach(clearArrays)

  test('contentWidth and contentHeight computed correctly', () => {
    const indices = new Set([0, 1, 2])
    setupBox(0, -1, { width: 100, height: 100 })
    setupBox(1, 0, { width: 50, height: 30 })
    setupBox(2, 0, { width: 70, height: 40, marginLeft: 20 })

    const result = computeLayoutTitan(100, 100, indices)

    // Content width = max(50, 20+70) = 90
    expect(result.contentWidth).toBeGreaterThanOrEqual(90)

    // Content height includes both children stacked
    expect(result.contentHeight).toBeGreaterThanOrEqual(70) // 30 + 40
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('TITAN Edge Cases', () => {
  beforeEach(clearArrays)

  test('empty indices returns empty layout', () => {
    const result = computeLayoutTitan(80, 24, new Set())

    expect(result.x).toEqual([])
    expect(result.y).toEqual([])
    expect(result.contentWidth).toBe(0)
    expect(result.contentHeight).toBe(0)
  })

  test('single text component', () => {
    const indices = new Set([0])
    setupText(0, -1, 'Hello World', { width: 80, height: 1 })

    const result = computeLayoutTitan(80, 24, indices)

    expect(result.x[0]).toBe(0)
    expect(result.y[0]).toBe(0)
    expect(result.width[0]).toBeGreaterThan(0)
  })

  test('zero-size parent', () => {
    const indices = new Set([0, 1])
    setupBox(0, -1, { width: 0, height: 0 })
    setupBox(1, 0, { width: 10, height: 10 })

    const result = computeLayoutTitan(80, 24, indices)

    // Should handle gracefully
    expect(result.x[0]).toBe(0)
    expect(result.y[0]).toBe(0)
  })
})
