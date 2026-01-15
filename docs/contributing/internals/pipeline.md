# Reactive Pipeline

> From signals to terminal output

## Overview

The render pipeline is a chain of derived computations:

```
User Signals → Parallel Arrays → Layout Derived → FrameBuffer Derived → Render Effect
```

Each stage reads from the previous and returns a new value. Only the final render effect produces side effects.

## Pipeline Stages

### Stage 1: User Code

User creates signals and components:

```typescript
const count = signal(0)

box({
  width: 40,
  children: () => {
    text({ content: () => `Count: ${count.value}` })
  }
})
```

### Stage 2: Parallel Arrays

Primitives write to arrays:

```typescript
// box.ts (simplified)
function box(props: BoxProps) {
  const index = allocateIndex()

  // Write to arrays
  dimensions.width.setSource(index, props.width ?? 0)
  dimensions.height.setSource(index, props.height ?? 0)
  // ...

  // Render children with this as parent
  pushParent(index)
  props.children?.()
  popParent()

  return () => releaseIndex(index)
}
```

### Stage 3: Layout Derived

Computes positions and sizes:

```typescript
// pipeline/layout.ts
export const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  const indices = getAllocatedIndices()

  // TITAN computes flexbox
  return computeLayoutTitan(tw, th, indices)
})
```

Returns:
```typescript
interface LayoutResult {
  x: number[]            // X positions
  y: number[]            // Y positions
  w: number[]            // Computed widths
  h: number[]            // Computed heights
  scrollable: number[]   // Is scrollable?
  maxScrollX: number[]   // Max horizontal scroll
  maxScrollY: number[]   // Max vertical scroll
  contentHeight: number  // Total content height
}
```

### Stage 4: FrameBuffer Derived

Rasterizes components to cells:

```typescript
// pipeline/frameBuffer.ts
export const frameBufferDerived = derived(() => {
  const layout = layoutDerived.value  // Dependency!
  const tw = terminalWidth.value
  const th = renderMode.value === 'fullscreen' ? terminalHeight.value : layout.contentHeight

  const buffer = createBuffer(tw, th)
  const hitRegions: HitRegion[] = []

  // Sort by zIndex for proper layering
  const sortedIndices = sortByZIndex(getAllocatedIndices())

  for (const i of sortedIndices) {
    if (!core.visible[i]) continue

    renderComponent(buffer, i, layout)
    collectHitRegion(hitRegions, i, layout)
  }

  return { buffer, hitRegions, terminalSize: { width: tw, height: th } }
})
```

### Stage 5: Render Effect

The ONLY effect - writes to terminal:

```typescript
// api/mount.ts (simplified)
effect(() => {
  const { buffer, hitRegions, terminalSize } = frameBufferDerived.value

  // Update hit grid (for mouse)
  hitGrid.resize(terminalSize.width, terminalSize.height)
  for (const region of hitRegions) {
    hitGrid.fillRect(region.x, region.y, region.width, region.height, region.componentIndex)
  }

  // Render to terminal
  renderer.render(buffer)
})
```

## Dependency Graph

```
terminalWidth ─────┐
                   │
terminalHeight ────┼──► layoutDerived ───┐
                   │                     │
allocatedIndices ──┤                     │
                   │                     ├──► frameBufferDerived ──► renderEffect
dimensions.* ──────┤                     │
                   │                     │
spacing.* ─────────┤                     │
                   │                     │
layout.* ──────────┘                     │
                                         │
visual.* ────────────────────────────────┤
                                         │
text.* ──────────────────────────────────┘
```

## Reactivity Flow

### When a Signal Changes

1. **User updates signal**:
   ```typescript
   count.value = 5
   ```

2. **Array binding notifies**:
   ```typescript
   // If text content bound to () => count.value
   text.textContent[index]  // Now returns "Count: 5"
   ```

3. **Layout derived re-runs** (if dimensions affected)

4. **FrameBuffer derived re-runs** (if layout or visual arrays changed)

5. **Render effect re-runs** (always, when frameBuffer changes)

### Optimization: Unchanged Deriveds

If a derived's dependencies haven't changed, it returns the cached value:

```typescript
// Layout only re-runs if:
// - Terminal size changed
// - Dimension arrays changed
// - Spacing arrays changed
// - Layout arrays changed

// If only textContent changed:
// - Layout: returns cached (no recompute)
// - FrameBuffer: re-runs (text.textContent changed)
// - Render: re-runs (buffer changed)
```

## Component Rendering

Each component type renders differently:

### Box Rendering

```typescript
function renderBox(buffer: FrameBuffer, index: number, layout: LayoutResult) {
  const x = layout.x[index]
  const y = layout.y[index]
  const w = layout.w[index]
  const h = layout.h[index]

  // 1. Fill background
  const bg = visual.bg[index]
  if (bg) {
    fillRect(buffer, x, y, w, h, bg)
  }

  // 2. Draw border
  const borderStyle = visual.border[index]
  if (borderStyle) {
    drawBorder(buffer, x, y, w, h, borderStyle, visual.borderColor[index])
  }
}
```

### Text Rendering

```typescript
function renderText(buffer: FrameBuffer, index: number, layout: LayoutResult) {
  const x = layout.x[index]
  const y = layout.y[index]
  const w = layout.w[index]
  const content = text.textContent[index]
  const fg = visual.fg[index]
  const attrs = text.textAttrs[index]

  // Handle wrapping/truncation
  const lines = wrapText(content, w, text.textWrap[index])

  // Draw each line
  for (let line = 0; line < lines.length; line++) {
    drawText(buffer, x, y + line, lines[line], fg, attrs)
  }
}
```

## Hit Region Collection

For mouse interaction, we collect hit regions:

```typescript
interface HitRegion {
  x: number
  y: number
  width: number
  height: number
  componentIndex: number
}

function collectHitRegion(regions: HitRegion[], index: number, layout: LayoutResult) {
  regions.push({
    x: layout.x[index],
    y: layout.y[index],
    width: layout.w[index],
    height: layout.h[index],
    componentIndex: index
  })
}
```

## Scroll Handling

For scrollable containers:

```typescript
function renderWithScroll(buffer: FrameBuffer, index: number, layout: LayoutResult) {
  const scrollX = interaction.scrollOffsetX[index]
  const scrollY = interaction.scrollOffsetY[index]

  // Create clipped sub-buffer
  const clipX = layout.x[index]
  const clipY = layout.y[index]
  const clipW = layout.w[index]
  const clipH = layout.h[index]

  // Render children with offset
  for (const childIndex of getChildren(index)) {
    renderComponent(buffer, childIndex, layout, {
      offsetX: -scrollX,
      offsetY: -scrollY,
      clip: { x: clipX, y: clipY, w: clipW, h: clipH }
    })
  }
}
```

## Performance Characteristics

| Stage | Complexity | Typical Time |
|-------|------------|--------------|
| Layout | O(n) components | 0.02-0.05ms |
| FrameBuffer | O(n) components | 0.02-0.05ms |
| Render | O(changed cells) | 0.01-0.03ms |
| **Total** | | ~0.08ms |

## See Also

- [Architecture](../architecture.md)
- [Parallel Arrays](./parallel-arrays.md)
- [TITAN Engine](./titan-engine.md)
- [Renderers](./renderers.md)
