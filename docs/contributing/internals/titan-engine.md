# TITAN Layout Engine

> Pure TypeScript flexbox implementation

## Overview

TITAN is TUI's layout engine - a complete flexbox implementation in pure TypeScript. No Yoga or other native dependencies.

## Features

- Complete flexbox: direction, wrap, justify, align
- Flex grow/shrink/basis
- Min/max constraints
- Percentage dimensions
- Gap support
- Scroll bounds calculation
- Pure functions (no mutation)

## Algorithm Overview

```
1. Build Tree        → Convert flat arrays to tree structure
2. Measure Content   → Calculate intrinsic sizes
3. Apply Constraints → Min/max, percentages
4. Flex Pass         → Distribute grow/shrink
5. Position Pass     → Calculate final positions
6. Scroll Pass       → Determine scroll bounds
```

## Entry Point

```typescript
// pipeline/layout/titan-engine.ts

export function computeLayoutTitan(
  terminalWidth: number,
  terminalHeight: number,
  indices: Set<number>
): LayoutResult {
  // Build tree from flat arrays
  const roots = buildLayoutTree(indices)

  // Process each root
  for (const root of roots) {
    measureNode(root, terminalWidth, terminalHeight)
    layoutNode(root, 0, 0, terminalWidth, terminalHeight)
  }

  // Extract results
  return extractResults(indices)
}
```

## Phase 1: Build Tree

Convert parallel arrays to tree nodes:

```typescript
interface LayoutNode {
  index: number
  children: LayoutNode[]

  // Input (from arrays)
  width: Dimension
  height: Dimension
  minWidth: Dimension
  maxWidth: Dimension
  flexDirection: FlexDirection
  flexWrap: FlexWrap
  justifyContent: JustifyContent
  alignItems: AlignItems
  grow: number
  shrink: number
  flexBasis: number
  padding: number[]  // [top, right, bottom, left]
  margin: number[]
  gap: number

  // Computed
  computedWidth: number
  computedHeight: number
  x: number
  y: number
  scrollWidth: number
  scrollHeight: number
}

function buildLayoutTree(indices: Set<number>): LayoutNode[] {
  const nodes = new Map<number, LayoutNode>()
  const roots: LayoutNode[] = []

  // Create nodes
  for (const i of indices) {
    if (!core.visible[i]) continue

    nodes.set(i, {
      index: i,
      children: [],
      // Read from arrays...
      width: dimensions.width[i],
      height: dimensions.height[i],
      flexDirection: layout.flexDirection[i],
      // ...
    })
  }

  // Link children
  for (const [i, node] of nodes) {
    const parent = core.parentIndex[i]
    if (parent === -1 || !nodes.has(parent)) {
      roots.push(node)
    } else {
      nodes.get(parent)!.children.push(node)
    }
  }

  return roots
}
```

## Phase 2: Measure Content

Calculate intrinsic sizes:

```typescript
function measureNode(node: LayoutNode, availW: number, availH: number) {
  // Measure children first (post-order)
  for (const child of node.children) {
    measureNode(child, availW, availH)
  }

  // Calculate intrinsic width
  let intrinsicWidth = 0
  let intrinsicHeight = 0

  if (node.children.length > 0) {
    if (node.flexDirection === 'row') {
      // Row: sum widths, max height
      for (const child of node.children) {
        intrinsicWidth += child.computedWidth + getMarginH(child)
      }
      intrinsicWidth += (node.children.length - 1) * node.gap
      intrinsicHeight = Math.max(...node.children.map(c => c.computedHeight + getMarginV(c)))
    } else {
      // Column: max width, sum heights
      intrinsicWidth = Math.max(...node.children.map(c => c.computedWidth + getMarginH(c)))
      for (const child of node.children) {
        intrinsicHeight += child.computedHeight + getMarginV(child)
      }
      intrinsicHeight += (node.children.length - 1) * node.gap
    }
  } else if (isText(node.index)) {
    // Text content determines size
    const content = text.textContent[node.index]
    intrinsicWidth = stringWidth(content)
    intrinsicHeight = 1
  }

  // Apply padding
  intrinsicWidth += node.padding[1] + node.padding[3]  // left + right
  intrinsicHeight += node.padding[0] + node.padding[2] // top + bottom

  // Resolve dimensions
  node.computedWidth = resolveDimension(node.width, availW, intrinsicWidth)
  node.computedHeight = resolveDimension(node.height, availH, intrinsicHeight)

  // Apply constraints
  node.computedWidth = clamp(node.computedWidth, node.minWidth, node.maxWidth, availW)
  node.computedHeight = clamp(node.computedHeight, node.minHeight, node.maxHeight, availH)
}
```

## Phase 3: Flex Distribution

Distribute space via grow/shrink:

```typescript
function distributeFlexSpace(
  children: LayoutNode[],
  availableSpace: number,
  direction: FlexDirection,
  gap: number
) {
  const isRow = direction === 'row' || direction === 'row-reverse'

  // Calculate used space
  let usedSpace = (children.length - 1) * gap
  for (const child of children) {
    usedSpace += isRow ? child.computedWidth : child.computedHeight
    usedSpace += isRow ? getMarginH(child) : getMarginV(child)
  }

  const freeSpace = availableSpace - usedSpace

  if (freeSpace > 0) {
    // Distribute via grow
    const totalGrow = children.reduce((sum, c) => sum + c.grow, 0)

    if (totalGrow > 0) {
      for (const child of children) {
        const growAmount = (child.grow / totalGrow) * freeSpace
        if (isRow) {
          child.computedWidth += growAmount
        } else {
          child.computedHeight += growAmount
        }
      }
    }
  } else if (freeSpace < 0) {
    // Shrink via shrink factor
    const totalShrink = children.reduce((sum, c) => sum + c.shrink, 0)

    if (totalShrink > 0) {
      for (const child of children) {
        const shrinkAmount = (child.shrink / totalShrink) * Math.abs(freeSpace)
        if (isRow) {
          child.computedWidth = Math.max(0, child.computedWidth - shrinkAmount)
        } else {
          child.computedHeight = Math.max(0, child.computedHeight - shrinkAmount)
        }
      }
    }
  }
}
```

## Phase 4: Positioning

Calculate final positions:

```typescript
function layoutNode(
  node: LayoutNode,
  x: number,
  y: number,
  containerW: number,
  containerH: number
) {
  node.x = x
  node.y = y

  if (node.children.length === 0) return

  // Content area (inside padding)
  const contentX = x + node.padding[3]
  const contentY = y + node.padding[0]
  const contentW = node.computedWidth - node.padding[1] - node.padding[3]
  const contentH = node.computedHeight - node.padding[0] - node.padding[2]

  // Distribute flex space
  distributeFlexSpace(node.children, contentW, node.flexDirection, node.gap)

  // Position children
  const isRow = node.flexDirection === 'row' || node.flexDirection === 'row-reverse'
  const isReverse = node.flexDirection.includes('reverse')

  let mainPos = isReverse ? (isRow ? contentW : contentH) : 0
  mainPos = applyJustifyContent(mainPos, node, contentW, contentH)

  const orderedChildren = isReverse ? [...node.children].reverse() : node.children

  for (const child of orderedChildren) {
    const marginBefore = isRow ? child.margin[3] : child.margin[0]
    const marginAfter = isRow ? child.margin[1] : child.margin[2]

    if (isReverse) {
      mainPos -= (isRow ? child.computedWidth : child.computedHeight) + marginBefore
    } else {
      mainPos += marginBefore
    }

    // Cross axis alignment
    const crossPos = applyCrossAlignment(child, node, contentW, contentH, isRow)

    // Set position
    const childX = contentX + (isRow ? mainPos : crossPos)
    const childY = contentY + (isRow ? crossPos : mainPos)

    // Recurse
    layoutNode(child, childX, childY, child.computedWidth, child.computedHeight)

    if (!isReverse) {
      mainPos += (isRow ? child.computedWidth : child.computedHeight) + marginAfter + node.gap
    } else {
      mainPos -= marginAfter + node.gap
    }
  }
}
```

## Phase 5: Justify Content

```typescript
function applyJustifyContent(
  startPos: number,
  node: LayoutNode,
  contentW: number,
  contentH: number
): number {
  const isRow = node.flexDirection === 'row' || node.flexDirection === 'row-reverse'
  const mainSize = isRow ? contentW : contentH

  const childrenSize = node.children.reduce((sum, c) =>
    sum + (isRow ? c.computedWidth : c.computedHeight) +
    (isRow ? getMarginH(c) : getMarginV(c)),
    0
  ) + (node.children.length - 1) * node.gap

  const freeSpace = mainSize - childrenSize

  switch (node.justifyContent) {
    case 'flex-start':
      return 0
    case 'flex-end':
      return freeSpace
    case 'center':
      return freeSpace / 2
    case 'space-between':
      // Handled separately
      return 0
    case 'space-around':
      return freeSpace / (node.children.length * 2)
    case 'space-evenly':
      return freeSpace / (node.children.length + 1)
    default:
      return 0
  }
}
```

## Phase 6: Align Items

```typescript
function applyCrossAlignment(
  child: LayoutNode,
  parent: LayoutNode,
  contentW: number,
  contentH: number,
  isRow: boolean
): number {
  const crossSize = isRow ? contentH : contentW
  const childCrossSize = isRow ? child.computedHeight : child.computedWidth
  const alignSelf = child.alignSelf === 'auto' ? parent.alignItems : child.alignSelf

  switch (alignSelf) {
    case 'flex-start':
      return 0
    case 'flex-end':
      return crossSize - childCrossSize
    case 'center':
      return (crossSize - childCrossSize) / 2
    case 'stretch':
      if (isRow && child.height === 0) {
        child.computedHeight = crossSize
      } else if (!isRow && child.width === 0) {
        child.computedWidth = crossSize
      }
      return 0
    default:
      return 0
  }
}
```

## Flex Wrap

```typescript
function layoutWithWrap(node: LayoutNode, ...) {
  const isRow = node.flexDirection === 'row'
  const mainSize = isRow ? node.computedWidth : node.computedHeight
  const crossSize = isRow ? node.computedHeight : node.computedWidth

  const lines: LayoutNode[][] = []
  let currentLine: LayoutNode[] = []
  let lineMainSize = 0

  for (const child of node.children) {
    const childMainSize = isRow ? child.computedWidth : child.computedHeight

    if (lineMainSize + childMainSize > mainSize && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = []
      lineMainSize = 0
    }

    currentLine.push(child)
    lineMainSize += childMainSize + node.gap
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  // Layout each line
  let crossPos = 0
  for (const line of lines) {
    layoutLine(line, crossPos, ...)
    crossPos += getLineHeight(line) + node.gap
  }
}
```

## Scroll Bounds

```typescript
function calculateScrollBounds(node: LayoutNode) {
  if (node.overflow !== 'scroll' && node.overflow !== 'auto') {
    return { maxScrollX: 0, maxScrollY: 0 }
  }

  // Calculate content bounds
  let contentRight = 0
  let contentBottom = 0

  for (const child of node.children) {
    contentRight = Math.max(contentRight, child.x + child.computedWidth - node.x)
    contentBottom = Math.max(contentBottom, child.y + child.computedHeight - node.y)
  }

  const viewportW = node.computedWidth - node.padding[1] - node.padding[3]
  const viewportH = node.computedHeight - node.padding[0] - node.padding[2]

  return {
    maxScrollX: Math.max(0, contentRight - viewportW),
    maxScrollY: Math.max(0, contentBottom - viewportH)
  }
}
```

## Results Extraction

```typescript
function extractResults(indices: Set<number>): LayoutResult {
  const result: LayoutResult = {
    x: [],
    y: [],
    w: [],
    h: [],
    scrollable: [],
    maxScrollX: [],
    maxScrollY: [],
    contentHeight: 0
  }

  for (const i of indices) {
    const node = nodeMap.get(i)
    if (!node) continue

    result.x[i] = node.x
    result.y[i] = node.y
    result.w[i] = node.computedWidth
    result.h[i] = node.computedHeight
    result.scrollable[i] = node.overflow === 'scroll' || node.overflow === 'auto' ? 1 : 0
    result.maxScrollX[i] = node.scrollWidth
    result.maxScrollY[i] = node.scrollHeight
    result.contentHeight = Math.max(result.contentHeight, node.y + node.computedHeight)
  }

  return result
}
```

## Performance

| Operation | Complexity |
|-----------|------------|
| Tree building | O(n) |
| Measuring | O(n) |
| Positioning | O(n) |
| Total | O(n) |

Typical: ~0.02-0.05ms for 100 components.

## See Also

- [Architecture](../architecture.md)
- [Pipeline](./pipeline.md)
- [Flexbox Guide](../../guides/layout/flexbox.md)
