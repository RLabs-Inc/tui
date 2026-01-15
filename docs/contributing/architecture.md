# Architecture Overview

> Reactive parallel arrays -> Derived pipeline -> Single render effect

## Core Philosophy

1. **Parallel Arrays** with `Binding<T>[]` - components write via `bind()`
2. **Deriveds** compute and RETURN results (pure functions, no mutation)
3. **One Effect** outputs to terminal (the ONLY side effect)
4. **No reconciliation** - components write directly to arrays
5. **TITAN** - Pure TypeScript flexbox engine (no Yoga dependency)

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

## Key Insight: Deriveds RETURN Values

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
│  modifiers: ctrl/alt/shift     │  │  - Maps (x,y) → component idx │
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
│       └── interaction.ts       # focusable, tabIndex, hovered
│
├── pipeline/                     # Derived pipeline
│   ├── layout/
│   │   └── titan-engine.ts      # TITAN flexbox engine
│   ├── frameBuffer.ts           # Cell buffer generation
│   └── render.ts                # THE single render effect
│
├── primitives/                   # Components
│   ├── box.ts                   # Container with flexbox
│   ├── text.ts                  # Text display
│   ├── each.ts                  # List iteration
│   ├── show.ts                  # Conditional rendering
│   ├── when.ts                  # Async rendering
│   └── types.ts                 # Prop interfaces
│
├── api/
│   └── mount.ts                 # Application mounting
│
└── utils/
    └── text.ts                  # stringWidth, wrapping
```

## Summary

| Aspect | Count/Details |
|--------|---------------|
| Parallel array groups | 7 (core, dimensions, spacing, layout, visual, text, interaction) |
| State modules | 6 (keyboard, mouse, focus, scroll, theme, cursor) |
| Derived stages | 2 (layout → frameBuffer) |
| Effects | 1 (render only) |
| Primitives | 5 (box, text, each, show, when) |
| Layout engine | TITAN (pure TypeScript flexbox) |
| Render modes | 3 (fullscreen, inline, append) |

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

## See Also

- [Parallel Arrays](./internals/parallel-arrays.md)
- [TITAN Engine](./internals/titan-engine.md)
- [Pipeline](./internals/pipeline.md)
- [Renderers](./internals/renderers.md)
