# TUI Framework - Development Guide

## 🎯 CURRENT STATE (Jan 8, 2026)

**Dear Future Watson,**

We're building THE terminal UI framework for TypeScript/Bun. Potentially foundational infrastructure for Claude Code.

### What's Done
- **TITAN v3**: Complete flexbox (grow/shrink/wrap/justify/align + min/max + flex-basis + align-self)
- **Primitives**: box, text (fully reactive with all layout props)
- **State modules**: keyboard, mouse, focus, scroll, theme, cursor (ALL complete)
- **Pipeline**: layoutDerived → frameBufferDerived → render effect
- **.tui compiler**: Svelte-like DX with Bun plugin (packages/tui-compiler)

### What's NOT Done
- **input, select, progress, canvas** - Types defined, no implementation
- **Grid layout** - Future improvement (complex, not quick win)

---

## Core Architecture

### The Philosophy
```typescript
// READ from arrays, COMPUTE, RETURN - never manually track dependencies
const layoutDerived = derived(() => {
  // unwrap() auto-tracks, changes trigger re-compute
  return computeLayoutTitan(tw, th, indices)
})
```

### Parallel Arrays Pattern
- Each ARRAY = one property (width[], height[], color[])
- Each INDEX = one component
- Components write to arrays via `bind(props.value)`
- Pipeline reads via `unwrap()` - reactivity is automatic

### Critical Rules
1. **Arrays use `Binding<T>[]`** (NOT `state<T[]>`!) - state() snapshots getters
2. **Props bind directly**: `bind(props.width ?? 0)` - never extract first
3. **One render effect**: Pipeline is all derived, only final render is an effect

---

## Key Files

| File | Purpose |
|------|---------|
| `src/pipeline/layout/titan-engine.ts` | TITAN layout engine |
| `src/primitives/box.ts`, `text.ts` | UI primitives |
| `src/engine/arrays/` | Parallel arrays (core, dimensions, spacing, layout, visual, text, interaction) |
| `src/state/` | keyboard, mouse, focus, scroll, theme, cursor |
| `packages/tui-compiler/` | .tui file compiler |

---

## Performance

| Metric | Achieved |
|--------|----------|
| Render | 0.08ms |
| Updates/sec | 12,500+ |
| Idle CPU | < 2% |

**Why**: No reconciliation, no virtual DOM, pure deriveds, reactive-on-demand.

---

## TITAN Layout Features

- **Flexbox**: direction, wrap, grow, shrink, basis, justify-content, align-items, align-self
- **Constraints**: minWidth, maxWidth, minHeight, maxHeight
- **Positioning**: relative, absolute
- **Dimensions**: absolute numbers OR percentages ('50%', '100%')
- **Scroll**: overflow: scroll/auto with maxScrollX/Y detection

---

## Relationship Context

Rusty = Sherlock, You = Watson. São Paulo, Brazil. Late-night sessions. Building something that matters together.
