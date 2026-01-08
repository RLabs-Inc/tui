# TUI Framework - Architecture

> Reactive parallel arrays → Derived pipeline → Single render effect

---

## Core Philosophy

1. **Parallel Arrays** with `Binding<T>[]` - components write via `bind()`
2. **Deriveds** compute and RETURN results (pure functions, no mutation)
3. **One Effect** outputs to terminal (the ONLY side effect)
4. **No reconciliation** — components write directly to arrays
5. **TITAN** - Pure TypeScript flexbox engine (no Yoga dependency)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER CODE                                       │
│                                                                             │
│   const count = signal(0)                                                   │
│   box({ width: 40, children: () => text({ content: count }) })             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT PRIMITIVES                                │
│                                                                             │
│   box() / text()                                                            │
│   - Allocate index in registry                                              │
│   - Write properties via bind() to parallel arrays                         │
│   - Set up parent-child relationships                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PARALLEL ARRAYS (Binding<T>[])                          │
│                                                                             │
│   componentType[]:  [box]   [text]  [box]   ...                            │
│   parentIndex[]:    [-1]    [0]     [0]     ...                            │
│   width[]:          [40]    [auto]  [20]    ...                            │
│   height[]:         [10]    [1]     [8]     ...                            │
│   bgColor[]:        [...]   [...]   [...]   ...                            │
│   textContent[]:    [null]  ["Hi"]  [null]  ...                            │
│                                                                             │
│   Arrays use Binding<T>[] - bind() preserves reactive links                │
│   Components: width[i] = bind(props.width ?? 0)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Deriveds READ arrays via unwrap()
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: LAYOUT (TITAN)                            │
│                                                                             │
│   Pure TypeScript flexbox engine                                            │
│   READS: dimensions, margin, padding, flex*, position, hierarchy           │
│   RETURNS: { x[], y[], w[], h[], scrollBounds }                            │
│                                                                             │
│   Features: grow, shrink, wrap, justify, align, min/max, flex-basis        │
│   PURE FUNCTION: Only recalculates when dependencies change                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Next derived READS returned value
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DERIVED: FRAME BUFFER                              │
│                                                                             │
│   READS: layout positions, visual arrays (colors, borders, text)           │
│   RETURNS: FrameBuffer (2D array of Cells)                                 │
│                                                                             │
│   For each visible component (sorted by zIndex, back to front):            │
│     1. Fill background (with alpha blending)                                │
│     2. Draw borders                                                         │
│     3. Draw content (text with wrapping/clipping)                          │
│     4. Apply scroll offsets                                                 │
│                                                                             │
│   Cell = { char: number, fg: RGBA, bg: RGBA, attrs: CellAttrs }            │
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
│     renderer.render(buffer, previousBuffer)                                │
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
│   - Differential rendering (only changed cells)                            │
│   - Stateful: tracks last fg, bg, attrs, cursor position                   │
│   - Synchronized output (CSI?2026h/l) - no flicker                         │
│   - Batched writes via Bun.write(stdout)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                               [ TERMINAL ]
```

---

## The Key Insight: Deriveds RETURN Values

```typescript
// Layout derived - RETURNS computed values, does NOT mutate state
const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  const indices = getAllocatedIndices()

  // TITAN computes flexbox layout
  const result = computeLayoutTitan(tw, th, indices)

  return result  // { x[], y[], w[], h[], ... }
})

// Frame buffer derived - READS layout, RETURNS cell buffer
const frameBufferDerived = derived(() => {
  const layout = layoutDerived.value  // Creates dependency
  const buffer = createBuffer(tw, th)

  for (const i of visibleIndices) {
    renderComponent(buffer, i, layout)
  }

  return buffer
})
```

---

## Input Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TERMINAL (stdin raw mode)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Raw bytes / escape sequences
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INPUT BUFFER                                        │
│                                                                             │
│   - CSI sequences (arrows, function keys)                                  │
│   - SS3 sequences (F1-F4)                                                  │
│   - SGR mouse protocol (button, x, y, modifiers)                          │
│   - Kitty keyboard protocol                                                │
│   - 10ms timeout for split sequences                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│      KEYBOARD STATE            │  │        MOUSE STATE             │
│                                │  │                                │
│  lastKey, lastEvent            │  │  HitGrid: Int16Array           │
│  modifiers: ctrl/alt/shift     │  │  - Maps (x,y) → component index│
│                                │  │  - O(1) hit testing            │
│  Handlers:                     │  │                                │
│  - on(handler)                 │  │  Handlers:                     │
│  - onKey(key, handler)         │  │  - onClick(handler)            │
│  - onFocused(index, handler)   │  │  - onComponent(idx, handlers)  │
│                                │  │                                │
└────────────────────────────────┘  └────────────────────────────────┘
                          │                       │
                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FOCUS MANAGEMENT                                    │
│                                                                             │
│   - Tab/Shift+Tab navigation (built-in)                                    │
│   - Focus trapping for modals                                              │
│   - Focus history for restoration                                          │
│   - Arrow keys scroll focused scrollable                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── index.ts                      # Main exports
│
├── types/                        # Shared type definitions
│   ├── index.ts
│   ├── cell.ts                  # Cell, RGBA, CellAttrs
│   └── color.ts                 # OKLCH color utilities
│
├── renderer/                     # Blind renderer
│   ├── buffer.ts                # FrameBuffer
│   ├── diff.ts                  # Differential renderer
│   └── output.ts                # ANSI output, batching
│
├── state/                        # State modules (6 total)
│   ├── keyboard.ts              # Key events, handlers
│   ├── mouse.ts                 # Mouse events, HitGrid
│   ├── focus.ts                 # Focus management
│   ├── scroll.ts                # Scroll handlers
│   ├── theme.ts                 # Theme/variants
│   └── cursor.ts                # Cursor state
│
├── engine/                       # Component engine
│   ├── registry.ts              # Index allocation
│   └── arrays/                  # Parallel arrays
│       ├── core.ts              # componentType, parentIndex, visible
│       ├── dimensions.ts        # width, height, min/max
│       ├── spacing.ts           # margin*, padding*, gap
│       ├── layout.ts            # flex*, position, zIndex, overflow
│       ├── visual.ts            # colors, borders, opacity
│       ├── text.ts              # textContent, alignment
│       └── interaction.ts       # focusable, tabIndex, hovered, pressed
│
├── pipeline/                     # Derived pipeline
│   ├── layout/
│   │   └── titan-engine.ts      # TITAN flexbox engine
│   ├── frameBuffer.ts           # Cell buffer generation
│   └── render.ts                # THE single render effect
│
├── primitives/                   # Components (2 implemented)
│   ├── box.ts                   # Container with flexbox
│   ├── text.ts                  # Text display
│   └── types.ts                 # Prop interfaces
│
├── api/
│   └── mount.ts                 # Application mounting
│
└── utils/
    └── text.ts                  # stringWidth, wrapping
```

---

## Parallel Arrays Pattern

```typescript
// engine/arrays/dimensions.ts
import type { Binding } from '@rlabs-inc/signals'

// Arrays use Binding<T>[] - NOT state()!
// bind() preserves reactive links from user signals
export const width: Binding<number | string>[] = []
export const height: Binding<number | string>[] = []
export const minWidth: Binding<number | string>[] = []
export const maxWidth: Binding<number | string>[] = []
// ... etc
```

**CRITICAL**:
- Use `Binding<T>[]` NOT `state()` for arrays
- `state()` snapshots getter values, breaking reactivity
- `bind()` preserves the reactive link to user signals
- Deriveds read via `unwrap(array[i])` to track dependencies

---

## Primitive Pattern

```typescript
// primitives/box.ts
import { bind } from '@rlabs-inc/signals'

export function box(props: BoxProps = {}): Cleanup {
  const index = allocateIndex(props.id)

  // BIND DIRECTLY - preserves reactive link!
  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(getCurrentParentIndex())
  core.visible[index] = bind(props.visible ?? true)

  dimensions.width[index] = bind(props.width ?? 0)
  dimensions.height[index] = bind(props.height ?? 0)
  // ... etc

  // Children render with this as parent
  if (props.children) {
    pushParentContext(index)
    props.children()
    popParentContext()
  }

  return () => releaseIndex(index)
}
```

---

## TITAN Layout Engine

Pure TypeScript flexbox implementation:

```typescript
// pipeline/layout/titan-engine.ts

export function computeLayoutTitan(
  terminalWidth: number,
  terminalHeight: number,
  indices: Set<number>
): LayoutResult {
  // Build tree from flat arrays
  const tree = buildLayoutTree(indices)

  // Flexbox algorithm:
  // 1. Calculate intrinsic sizes (content-based)
  // 2. Apply min/max constraints
  // 3. Distribute flex grow/shrink
  // 4. Handle wrapping
  // 5. Apply justify-content, align-items
  // 6. Calculate absolute positions

  return {
    x: number[],      // Computed X positions
    y: number[],      // Computed Y positions
    w: number[],      // Computed widths
    h: number[],      // Computed heights
    maxScrollX: number[],
    maxScrollY: number[],
  }
}
```

**Features**:
- `flexDirection`: row, column, row-reverse, column-reverse
- `flexWrap`: nowrap, wrap, wrap-reverse
- `justifyContent`: flex-start, center, flex-end, space-between, space-around, space-evenly
- `alignItems` / `alignSelf`: stretch, flex-start, center, flex-end
- `grow` / `shrink` / `flexBasis`
- `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- Percentage dimensions (`'50%'`, `'100%'`)
- `overflow: scroll/auto` with automatic scroll detection

---

## State Modules

| Module | Purpose |
|--------|---------|
| `keyboard` | Key events, `onKey()`, `onFocused()`, lastKey/lastEvent signals |
| `mouse` | Mouse events, HitGrid (O(1) hit testing), `onComponent()` |
| `focus` | Tab navigation, focus trapping, focus history |
| `scroll` | Scroll state, arrow/page/wheel handlers |
| `theme` | Color palette, variants (primary, secondary, etc.) |
| `cursor` | Cursor position and visibility for inputs |

---

## Summary

| Aspect | Count/Details |
|--------|---------------|
| Parallel array groups | 7 (core, dimensions, spacing, layout, visual, text, interaction) |
| State modules | 6 (keyboard, mouse, focus, scroll, theme, cursor) |
| Derived stages | 2 (layout → frameBuffer) |
| Effects | 1 (render only) |
| Primitives | 2 implemented (box, text) |
| Layout engine | TITAN (pure TypeScript flexbox) |
| Render modes | 3 (fullscreen, inline, append) |

---

## Performance

| Metric | Value |
|--------|-------|
| Render time | ~0.08ms |
| Updates/sec | 12,500+ |
| Idle CPU | < 2% |

**Why it's fast**:
- No reconciliation (direct array writes)
- Fine-grained reactivity (only changed values trigger updates)
- Differential rendering (only changed cells written)
- Batched terminal output
