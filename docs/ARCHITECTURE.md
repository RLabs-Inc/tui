# TUI Framework - Architecture

> Reactive parallel arrays → Derived pipeline → Single render effect

---

## Core Philosophy

1. **Parallel Arrays** are the single source of truth (components WRITE here)
2. **state()** provides fine-grained per-element reactivity (no `.value` needed)
3. **Derived** values compute and RETURN results (pure functions, no mutation)
4. **One Effect** outputs to terminal (the ONLY side effect)
5. **No reconciliation** — components write directly to arrays

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER CODE                                       │
│                                                                             │
│   const count = signal(0)                                                   │
│   mount(() => box({ width: 40 }, [ text({ content: count.value }) ]))      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT PRIMITIVES                                │
│                                                                             │
│   box() / text() / input() / etc.                                          │
│   - Allocate index in registry                                              │
│   - Write properties to parallel arrays (direct mutation, no .value)       │
│   - Set up parent-child relationships                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PARALLEL ARRAYS (State)                            │
│                                                                             │
│   componentType[]:  [box]   [text]  [box]   [input]                        │
│   parentIndex[]:    [-1]    [0]     [0]     [2]                            │
│   width[]:          [40]    [auto]  [20]    [15]                           │
│   height[]:         [10]    [1]     [8]     [1]                            │
│   bgColor[]:        [...]   [...]   [...]   [...]                          │
│   textContent[]:    [null]  ["Hi"]  [null]  [""]                           │
│   ... (65+ arrays)                                                          │
│                                                                             │
│   Created with state() - per-element fine-grained reactivity               │
│   Components write directly: width[i] = 100 (no .value)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Deriveds READ arrays
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: LAYOUT                                     │
│                                                                             │
│   Uses Yoga layout engine                                                   │
│   READS: dimensions, margin, padding, flex*, position, hierarchy           │
│   RETURNS: { positions[], wrappedLines[], scrollBounds[] }                 │
│                                                                             │
│   PURE FUNCTION: Only recalculates when dependencies change                │
│   CANNOT mutate state - deriveds are read-only computations                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Next derived READS returned value
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: FRAME BUFFER                              │
│                                                                             │
│   READS: layout.value (positions), visual arrays (colors, borders, text)   │
│   RETURNS: FrameBuffer (2D array of Cells)                                 │
│                                                                             │
│   For each visible component (sorted by zIndex, back to front):            │
│     1. Fill background (with alpha blending)                                │
│     2. Draw borders                                                         │
│     3. Draw content (text, progress bar, etc.)                             │
│     4. Apply clipping                                                       │
│                                                                             │
│   Cell = { char: number, fg: RGBA, bg: RGBA, attrs: CellAttrs }            │
│   FrameBuffer.cells[y][x] for cache-friendly row access                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Effect READS frameBuffer.value
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EFFECT: RENDER (THE SINGLE EFFECT)                 │
│                                                                             │
│   effect(() => {                                                            │
│     const buffer = frameBuffer.value  // Creates dependency                 │
│                                                                             │
│     // Differential rendering - only changed cells                          │
│     const diff = diffBuffers(previousBuffer, buffer)                       │
│     if (diff.length > 0) {                                                 │
│       renderer.render(buffer, previousBuffer)                              │
│     }                                                                       │
│     previousBuffer = buffer                                                 │
│   })                                                                        │
│                                                                             │
│   This is the ONLY effect in the render pipeline                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BLIND RENDERER                                      │
│                                                                             │
│   The "Terminal GPU" - knows ONLY about cells, not components              │
│                                                                             │
│   DiffRenderer with stateful cell renderer:                                │
│   - Tracks last fg, bg, attrs - only emits when changed                    │
│   - Tracks last cursor position - skips redundant moves                    │
│   - Wraps output in synchronized block (CSI?2026h/l) - no flicker          │
│   - Batches all output into single write                                   │
│                                                                             │
│   OutputBuffer → Bun.write(stdout) for performance                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                               [ TERMINAL ]
```

---

## The Key Insight: Deriveds RETURN Values

**WRONG** (what we must NOT do):
```typescript
// DON'T: Deriveds cannot mutate state!
const layoutDerived = derived(() => {
  computedX[i] = calculatedX  // ERROR: Cannot write in derived
  computedY[i] = calculatedY  // Throws immediately
})
```

**RIGHT** (what we MUST do):
```typescript
// DO: Deriveds return computed values
const layoutDerived = derived(() => {
  const positionX: number[] = []
  const positionY: number[] = []
  const width: number[] = []
  const height: number[] = []

  for (const i of allocatedIndices) {
    // Calculate using Yoga
    
      positionsX[i] = yogaNode.getComputedLeft(),
      positionsY[i] = yogaNode.getComputedTop(),
      width[i] = yogaNode.getComputedWidth(),
      height[i] = yogaNode.getComputedHeight(),
    
  }

  return {
    positionX,
    positionY,
    widht,
    height
  }  // RETURN the computed values
})

// Next derived reads the returned value
const frameBuffer = derived(() => {
  const positions = layoutDerived.value  // Read from previous derived
  const buffer = createBuffer(width, height)

  for (const i of visibleIndices) {
    const posX = positionX[i]
    const posY = positionY[i]
    const widthI = width[i]
    const heightI = height[i]
    renderComponent(buffer, i, posX, posY, widthI, heighI)
  }

  return buffer  // RETURN the frame buffer
})
```

---

## Three Render Modes

The framework supports three rendering modes:

### 1. Fullscreen Mode
- Enters alternate screen buffer (`CSI?1049h`)
- Full control of terminal
- Absolute cursor positioning
- On exit, terminal returns to previous state

### 2. Inline Mode
- No alternate screen buffer
- Uses save/restore cursor (`CSI s` / `CSI u`)
- Content renders inline with existing terminal output
- Updates in place via differential rendering

### 3. Append Mode
- Content flows down naturally (like `tail -f`)
- Relative cursor movement (`moveUp`)
- **Still reactive** - can update previously rendered content
- Tracks previous render height for repositioning
- Differential rendering makes updates efficient

```typescript
mount(App, {
  mode: 'fullscreen' | 'inline' | 'append'
})
```

---

## Input Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TERMINAL                                        │
│                         (stdin raw mode)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Raw bytes / escape sequences
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INPUT BUFFER                                        │
│                                                                             │
│   Buffering strategy for split escape sequences:                           │
│   - Accumulate data, timeout (50ms) flushes incomplete as raw              │
│                                                                             │
│   Parse escape sequences into structured events:                           │
│   - CSI sequences (arrows, function keys)                                  │
│   - SS3 sequences (F1-F4)                                                  │
│   - SGR mouse protocol (button, x, y, modifiers)                          │
│   - Kitty keyboard protocol (codepoint, modifiers, state)                 │
│   - Bracketed paste                                                        │
│                                                                             │
│   Modifier parsing: Shift(1), Alt(2), Ctrl(4), Meta(8)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│      KEYBOARD STATE            │  │        MOUSE STATE             │
│                                │  │                                │
│  lastKey, lastEvent, modifiers │  │  x, y, button, scrollDelta    │
│  state: press | release | rep  │  │  state: down | up | move | scr │
│                                │  │                                │
│  Handlers:                     │  │  HitGrid: Int16Array           │
│  on(handler)                   │  │  - Maps (x,y) → component index│
│  onKey(key, handler)           │  │  - fillRect for each component │
│  onFocused(index, handler)     │  │  - Enables O(1) hit testing    │
│                                │  │                                │
└────────────────────────────────┘  └────────────────────────────────┘
                          │                       │
                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FOCUS ROUTING                                       │
│                                                                             │
│   Keyboard:                                                                 │
│   - Route to focused component's handler                                   │
│   - Tab/Shift+Tab navigation                                               │
│                                                                             │
│   Mouse:                                                                    │
│   - hitTest(x, y) → find topmost component                                 │
│   - Respects overflow:hidden clipping                                      │
│   - Route to component's onClick/onMouseDown/etc                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Handler updates state arrays
                                      ▼
                          [ BACK TO PARALLEL ARRAYS ]
                                      │
                                      │ Reactivity propagates...
                                      ▼
                               [ RENDER EFFECT ]
```

---

## File Structure

```
src/
├── index.ts                      # Main exports
│
├── types/                        # Shared type definitions
│   ├── index.ts                 # Re-exports
│   ├── cell.ts                  # Cell, RGBA, CellAttrs
│   ├── color.ts                 # Color, ColorInput, OKLCH
│   ├── events.ts                # KeyEvent, MouseEvent, Modifiers
│   ├── layout.ts                # LayoutProps, FlexProps
│   └── component.ts             # ComponentType enum, ComponentProps
│
├── renderer/                     # Blind renderer (low-level terminal)
│   ├── index.ts                 # Re-exports
│   ├── cell.ts                  # Cell utilities, color parsing, alpha blending
│   ├── buffer.ts                # FrameBuffer creation and manipulation
│   ├── ansi.ts                  # ANSI escape code generation
│   ├── output.ts                # OutputBuffer, DiffRenderer, batched writing
│   ├── input.ts                 # InputBuffer (escape sequence parsing)
│   └── terminal.ts              # Terminal setup, raw mode, capabilities
│
├── state/                        # Father state modules
│   ├── index.ts                 # Re-exports
│   ├── keyboard.ts              # Keyboard state + handlers
│   ├── mouse.ts                 # Mouse state + HitGrid + handlers
│   ├── focus.ts                 # Focus management + tab navigation
│   ├── terminal.ts              # Terminal size, render mode
│   └── theme.ts                 # Theme colors (semantic palette)
│
├── engine/                       # Component engine (parallel arrays)
│   ├── index.ts                 # Re-exports + getEngine()
│   ├── registry.ts              # allocateIndex, releaseIndex, ID↔index maps
│   ├── arrays/                  # Parallel arrays by category
│   │   ├── index.ts            # Re-exports all arrays
│   │   ├── core.ts             # componentType, parentIndex, visible, etc.
│   │   ├── hierarchy.ts        # childIndices, depth
│   │   ├── dimensions.ts       # width, height, min/max (INPUT only)
│   │   ├── spacing.ts          # margin*, padding*
│   │   ├── layout.ts           # flex*, position, zIndex, overflow
│   │   ├── visual.ts           # fgColor, bgColor, border*, opacity
│   │   ├── text.ts             # textContent, textStyle flags
│   │   ├── input.ts            # input-specific arrays
│   │   ├── select.ts           # select-specific arrays
│   │   └── progress.ts         # progress-specific arrays
│   └── yoga.ts                  # Yoga node management per component
│
├── pipeline/                     # Derived pipeline (PURE - no mutations)
│   ├── index.ts                 # Pipeline initialization
│   ├── layout.ts                # RETURNS computed positions
│   ├── frameBuffer.ts           # RETURNS cell buffer
│   └── render.ts                # THE single render effect
│
├── primitives/                   # User-facing components
│   ├── index.ts                 # Re-exports
│   ├── box.ts                   # Box component
│   ├── text.ts                  # Text component
│   ├── input.ts                 # Input component
│   ├── select.ts                # Select component
│   ├── progress.ts              # Progress component
│   └── canvas.ts                # Canvas component (PixelBuffer)
│
├── api/                          # User-facing API surface
│   ├── index.ts                 # Re-exports
│   └── mount.ts                 # Application mounting (3 modes)
│
└── utils/                        # Utilities
    ├── index.ts                 # Re-exports
    ├── color.ts                 # OKLCH, parsing via Bun.color()
    └── text.ts                  # stringWidth via Bun.stringWidth(), wrapping
```

---

## Engine Arrays Pattern

```typescript
// engine/arrays/dimensions.ts

import { state, bind, type Binding } from '@rlabs-inc/signals'

const INITIAL_CAPACITY = 256

// INPUT arrays - components WRITE to these directly
// Use state() for per-element fine-grained reactivity (proxy-based)
// NO .value needed - direct mutation: width[i] = 100

export const width = state(new Array<number>(INITIAL_CAPACITY).fill(0))
export const height = state(new Array<number>(INITIAL_CAPACITY).fill(0))
export const minWidth = state(new Array<number>(INITIAL_CAPACITY).fill(0))
export const minHeight = state(new Array<number>(INITIAL_CAPACITY).fill(0))
export const maxWidth = state(new Array<number>(INITIAL_CAPACITY).fill(0))
export const maxHeight = state(new Array<number>(INITIAL_CAPACITY).fill(0))

// NOTE: There are NO computed arrays here!
// Computed positions are RETURNED from the layout derived.
// Deriveds are pure - they cannot mutate state.

// Resize when needed
export function ensureCapacity(minCapacity: number): void {
  while (width.length < minCapacity) {
    width.push(bind(0))
    height.push(bind(0))
    minWidth.push(bind(0))
    minHeight.push(bind(0))
    maxWidth.push(bind(0))
    maxHeight.push(bind(0))
  }
}
```

**CRITICAL**:
- Use `state()` not `signal()` for arrays → per-element reactivity
- No `.value` needed → direct mutation: `width[i] = 100`
- TypedArrays don't work → mutations not tracked, use regular arrays
- NO computed arrays in state → deriveds RETURN computed values

---

## Registry Pattern

```typescript
// engine/registry.ts

import { state, bind, type Binding } from '@rlabs-inc/signals'

// ID ↔ Index bidirectional mapping
const idToIndex = new Map<string, number>()
const indexToId = new Map<number, string>()

// Index management
const allocatedIndices = new Set<number>()
const freeIndices: number[] = []  // Pool for reuse
let nextIndex = 0

export function allocateIndex(id?: string): number {
  // Generate ID if not provided
  const componentId = id ?? `component-${Math.random().toString(36).slice(2, 9)}`

  // Check if already allocated
  const existing = idToIndex.get(componentId)
  if (existing !== undefined) return existing

  // Reuse free index or allocate new
  const index = freeIndices.length > 0
    ? freeIndices.pop()!
    : nextIndex++

  // Register mappings
  idToIndex.set(componentId, index)
  indexToId.set(index, componentId)
  allocatedIndices.add(index)

  // Ensure arrays have capacity
  ensureAllArraysCapacity(index + 1)

  return index
}

export function releaseIndex(index: number): void {
  const id = indexToId.get(index)
  if (id === undefined) return

  // Clean up mappings
  idToIndex.delete(id)
  indexToId.delete(index)
  allocatedIndices.delete(index)

  // Return to pool for reuse
  freeIndices.push(index)

  // Clear all array values at this index
  clearArraysAtIndex(index)
}

export function getAllocatedIndices(): Set<number> {
  return allocatedIndices
}
```

---

## Primitive Pattern

```typescript
// primitives/box.ts

import { allocateIndex, releaseIndex } from '../engine/registry'
import { ComponentType } from '../types'
import * as core from '../engine/arrays/core'
import * as dims from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as visual from '../engine/arrays/visual'

export interface BoxProps {
  width?: number | 'auto'
  height?: number | 'auto'
  // ... all other props from API spec
}

export function box(props: BoxProps, children?: (() => void)[]): () => void {
  // 1. Allocate index
  const index = allocateIndex()

  // 2. Set component type - DIRECT MUTATION, no .value!
  core.componentType[index] = ComponentType.BOX
  core.visible[index] = props.visible !== false ? 1 : 0

  // 3. Set all properties - direct array writes
  if (props.width !== undefined && props.width !== 'auto') {
    dims.width[index] = props.width
  }
  if (props.height !== undefined && props.height !== 'auto') {
    dims.height[index] = props.height
  }
  if (props.marginLeft !== undefined) {
    spacing.marginLeft[index] = props.marginLeft
  }
  if (props.backgroundColor !== undefined) {
    visual.bgColor[index] = parseColor(props.backgroundColor)
  }
  // ... etc for all props

  // 4. Set parent-child relationship
  const parentIndex = getCurrentParentIndex()
  core.parentIndex[index] = parentIndex
  if (parentIndex >= 0) {
    addChildToParent(parentIndex, index)
  }

  // 5. Process children (if any)
  if (children) {
    pushParentContext(index)
    for (const child of children) {
      child()
    }
    popParentContext()
  }

  // 6. Return cleanup function
  return () => {
    if (parentIndex >= 0) {
      removeChildFromParent(parentIndex, index)
    }
    releaseIndex(index)
  }
}
```

---

## Pipeline: Layout Derived

```typescript
// pipeline/layout.ts

import { derived } from '@rlabs-inc/signals'
import { Yoga } from '../engine/yoga'
import { getAllocatedIndices } from '../engine/registry'
import * as dims from '../engine/arrays/dimensions'
import * as spacing from '../engine/arrays/spacing'
import * as layout from '../engine/arrays/layout'
import * as core from '../engine/arrays/core'
import * as text from '../engine/arrays/text'
import { terminal } from '../state/terminal'

export interface ComputedLayout {
  positions: Map<number, { x: number, y: number, width: number, height: number }>
  wrappedLines: Map<number, string[]>
  scrollBounds: Map<number, { maxX: number, maxY: number }>
}

// Layout derived - RETURNS computed values, does NOT mutate state
export const layoutDerived = derived<ComputedLayout>(() => {
  const allocatedIndices = getAllocatedIndices()
  const positions = new Map<number, { x: number, y: number, width: number, height: number }>()
  const wrappedLines = new Map<number, string[]>()
  const scrollBounds = new Map<number, { maxX: number, maxY: number }>()

  // Apply props to Yoga nodes and calculate layout
  for (const i of allocatedIndices) {
    const node = getYogaNode(i)

    // Apply dimensions
    if (dims.width[i] > 0) node.setWidth(dims.width[i])
    if (dims.height[i] > 0) node.setHeight(dims.height[i])

    // Apply spacing
    node.setMargin(Yoga.EDGE_LEFT, spacing.marginLeft[i])
    node.setMargin(Yoga.EDGE_RIGHT, spacing.marginRight[i])
    node.setMargin(Yoga.EDGE_TOP, spacing.marginTop[i])
    node.setMargin(Yoga.EDGE_BOTTOM, spacing.marginBottom[i])

    // Apply flex properties
    node.setFlexDirection(layout.flexDirection[i])
    node.setFlexGrow(layout.flexGrow[i])
    // ... etc
  }

  // Calculate layout from root
  const rootNode = getYogaNode(0)
  rootNode.calculateLayout(terminal.width, terminal.height, Yoga.DIRECTION_LTR)

  // Read computed values
  for (const i of allocatedIndices) {
    const node = getYogaNode(i)

    // Accumulate parent offsets for absolute position
    let x = node.getComputedLeft()
    let y = node.getComputedTop()
    let parent = node.getParent()
    while (parent) {
      x += parent.getComputedLeft()
      y += parent.getComputedTop()
      parent = parent.getParent()
    }

    positions.set(i, {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(node.getComputedWidth()),
      height: Math.round(node.getComputedHeight()),
    })

    // Wrap text if TEXT component
    if (core.componentType[i] === ComponentType.TEXT) {
      const content = text.textContent[i] || ''
      const w = positions.get(i)!.width
      wrappedLines.set(i, wrapText(content, w))
    }
  }

  // RETURN computed values - do NOT write to state arrays!
  return { positions, wrappedLines, scrollBounds }
})
```

---

## Pipeline: Frame Buffer Derived

```typescript
// pipeline/frameBuffer.ts

import { derived } from '@rlabs-inc/signals'
import { layoutDerived } from './layout'
import { getAllocatedIndices } from '../engine/registry'
import * as core from '../engine/arrays/core'
import * as visual from '../engine/arrays/visual'
import * as text from '../engine/arrays/text'
import { terminal } from '../state/terminal'
import { createBuffer, fillRect, drawText, drawBorder } from '../renderer/buffer'
import type { FrameBuffer } from '../renderer/types'

// Frame buffer derived - READS layout, RETURNS cell buffer
export const frameBufferDerived = derived<FrameBuffer>(() => {
  // Read from layout derived (creates dependency)
  const layout = layoutDerived.value

  // Create new buffer
  const buffer = createBuffer(terminal.width, terminal.height)

  // Get visible components sorted by zIndex
  const visibleIndices = getVisibleIndicesSorted()

  // Render each component (back to front)
  for (const i of visibleIndices) {
    const pos = layout.positions.get(i)
    if (!pos) continue

    const { x, y, width, height } = pos
    const type = core.componentType[i]

    // Fill background with alpha blending
    const bg = visual.bgColor[i]
    if (bg) {
      fillRect(buffer, x, y, width, height, bg)
    }

    // Draw border
    const borderStyle = visual.borderStyle[i]
    if (borderStyle > 0) {
      drawBorder(buffer, x, y, width, height, borderStyle, visual.borderColor[i])
    }

    // Draw content based on type
    switch (type) {
      case ComponentType.TEXT:
        const lines = layout.wrappedLines.get(i) || []
        const fg = visual.fgColor[i]
        const attrs = text.textAttrs[i]
        for (let line = 0; line < lines.length; line++) {
          drawText(buffer, x, y + line, lines[line], fg, bg, attrs)
        }
        break

      case ComponentType.PROGRESS:
        renderProgress(buffer, i, x, y, width)
        break

      case ComponentType.CANVAS:
        renderCanvas(buffer, i, x, y)
        break
    }
  }

  // RETURN the frame buffer
  return buffer
})

function getVisibleIndicesSorted(): number[] {
  const result: number[] = []

  for (const i of getAllocatedIndices()) {
    if (core.visible[i]) {
      result.push(i)
    }
  }

  // Sort by zIndex (ascending = back to front)
  result.sort((a, b) => (visual.zIndex[a] || 0) - (visual.zIndex[b] || 0))

  return result
}
```

---

## Pipeline: The Single Render Effect

```typescript
// pipeline/render.ts

import { effect } from '@rlabs-inc/signals'
import { frameBufferDerived } from './frameBuffer'
import { DiffRenderer } from '../renderer/output'
import { terminal } from '../state/terminal'
import type { FrameBuffer } from '../renderer/types'

let previousBuffer: FrameBuffer | null = null
const diffRenderer = new DiffRenderer()

// THE SINGLE EFFECT - the only side effect in the render pipeline
export function initializeRenderEffect(): () => void {
  return effect(() => {
    // Read frame buffer (creates dependency on entire derived chain)
    const buffer = frameBufferDerived.value

    // Handle render mode positioning
    if (terminal.mode === 'append') {
      // Move cursor up to overwrite previous render
      if (previousBuffer) {
        process.stdout.write(ansi.moveUp(previousBuffer.height))
        process.stdout.write('\r')
      }
    } else if (terminal.mode === 'inline') {
      // Restore saved cursor position
      process.stdout.write(ansi.restoreCursor)
    }

    // Differential render - only changed cells
    diffRenderer.render(buffer, previousBuffer)

    // Track for next diff
    previousBuffer = buffer

    // For append mode, position cursor at end
    if (terminal.mode === 'append') {
      process.stdout.write(ansi.moveTo(1, buffer.height + 1))
    }
  })
}
```

---

## Double Function Pattern

For exporting reactive derived values across module boundaries:

```typescript
// engine/index.ts

import { derived } from '@rlabs-inc/signals'
import { getAllocatedIndices } from './registry'
import * as core from './arrays/core'
import * as visual from './arrays/visual'

export function getEngine() {
  // These derived values are computed reactively
  const visibleComponentsSorted = derived(() => {
    const result: number[] = []
    for (const i of getAllocatedIndices()) {
      if (core.visible[i]) {
        result.push(i)
      }
    }
    return result.sort((a, b) => (visual.zIndex[a] || 0) - (visual.zIndex[b] || 0))
  })

  const focusableIndices = derived(() => {
    const result: number[] = []
    for (const i of getAllocatedIndices()) {
      if (core.focusable[i] && core.visible[i]) {
        result.push(i)
      }
    }
    return result.sort((a, b) => (core.tabIndex[a] || 0) - (core.tabIndex[b] || 0))
  })

  // Return FUNCTION that returns current values
  // This maintains reactivity across module boundaries
  return () => ({
    visibleComponentsSorted: visibleComponentsSorted.value,
    focusableIndices: focusableIndices.value,
  })
}

// Usage in another module:
const engine = getEngine()

effect(() => {
  const { visibleComponentsSorted } = engine()  // Call function to get reactive values
  console.log('Visible:', visibleComponentsSorted)
})
```

---

## Blind Renderer Details

The renderer is a "Terminal GPU" - it knows only about cells:

```typescript
// renderer/types.ts

interface Cell {
  char: number       // Unicode codepoint (0 = continuation of wide char)
  fg: RGBA          // Foreground color
  bg: RGBA          // Background color
  attrs: CellAttrs  // Bitfield: BOLD|DIM|ITALIC|UNDERLINE|BLINK|INVERSE|HIDDEN|STRIKE
}

interface RGBA {
  r: number  // 0-255
  g: number  // 0-255
  b: number  // 0-255
  a: number  // 0-255 (for alpha blending)
}

interface FrameBuffer {
  readonly width: number
  readonly height: number
  readonly cells: Cell[][]  // [y][x] for cache-friendly row access
}
```

### DiffRenderer with Stateful Cell Renderer

```typescript
// Only emits ANSI codes when values change
class StatefulCellRenderer {
  lastFg: RGBA | null = null
  lastBg: RGBA | null = null
  lastAttrs: CellAttrs = 0
  lastX: number = -1
  lastY: number = -1

  render(x: number, y: number, cell: Cell): string {
    let output = ''

    // Only move cursor if not sequential
    if (y !== this.lastY || x !== this.lastX + 1) {
      output += ansi.moveTo(x + 1, y + 1)  // ANSI is 1-indexed
    }

    // Only emit color if changed
    if (!rgbaEqual(cell.fg, this.lastFg)) {
      output += ansi.fg(cell.fg)
      this.lastFg = cell.fg
    }
    if (!rgbaEqual(cell.bg, this.lastBg)) {
      output += ansi.bg(cell.bg)
      this.lastBg = cell.bg
    }

    // Only emit attrs if changed
    if (cell.attrs !== this.lastAttrs) {
      output += ansi.reset + ansi.attrs(cell.attrs)
      this.lastAttrs = cell.attrs
    }

    // Character
    output += String.fromCodePoint(cell.char)

    this.lastX = x
    this.lastY = y

    return output
  }
}
```

### Synchronized Output (No Flicker)

```typescript
// Wrap frame in sync block - terminal buffers until complete
const output = new OutputBuffer()
output.write(ansi.beginSync)  // CSI?2026h

for (let y = 0; y < buffer.height; y++) {
  for (let x = 0; x < buffer.width; x++) {
    const cell = buffer.cells[y][x]
    const prev = previousBuffer?.cells[y]?.[x]

    // Skip unchanged cells
    if (prev && cellEqual(cell, prev)) continue

    output.write(cellRenderer.render(x, y, cell))
  }
}

output.write(ansi.endSync)    // CSI?2026l
await output.flush()          // Single batched write
```

---

## Summary

- **65+ parallel arrays** (state() for per-element reactivity)
- **5 state modules** (keyboard, mouse, focus, terminal, theme)
- **2 derived stages** (layout → frameBuffer) - RETURN values, no mutation
- **1 render effect** (the ONLY side effect)
- **3 render modes** (fullscreen, inline, append)
- **6 primitives** (box, text, input, select, progress, canvas)
- **Blind renderer** with stateful differential output
- **HitGrid** for O(1) mouse hit testing
