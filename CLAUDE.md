# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests (uses bun test)
bun test                                    # All tests
bun test test/titan-engine.test.ts          # Single test file
bun test --watch                            # Watch mode

# Run examples
bun run examples/hello.ts                   # Basic example

# Type checking
bun run typecheck                           # Root package

```

## Architecture

### Package Structure
- **Root (`@rlabs-inc/tui`)**: Core framework - primitives, state, layout engine
- **`@rlabs-inc/signals`**: Fine-grained reactivity (separate repo)

### Core Pipeline
```
User Signals → Slot Parallel Arrays → layoutDerived → frameBufferDerived → render effect
```

The framework uses **parallel arrays** (ECS-style) instead of component objects:
- Each ARRAY stores one property type: `width[]`, `height[]`, `color[]`
- Each INDEX represents one component

### Critical Rules
3. **One render effect**: Pipeline is all derived, only final render is an effect

### Key Files
| File | Purpose |
|------|---------|
| `src/pipeline/layout/titan-engine.ts` | TITAN flexbox layout engine |
| `src/primitives/box.ts`, `text.ts` | UI primitives |
| `src/primitives/each.ts`, `show.ts`, `when.ts` | Template primitives (reactive control flow) |
| `src/engine/arrays/` | Parallel arrays (core, dimensions, spacing, layout, visual, text, interaction) |
| `src/state/keyboard.ts` | Keyboard handling with escape sequence parsing |
| `src/state/focus.ts` | Focus management and tab navigation |

### Keyboard API
```typescript
// Subscribe to specific key
keyboard.onKey('Enter', (event) => { ... })
keyboard.onKey('ArrowUp', handler)

// Subscribe to all keys
keyboard.on((event) => { ... })

// Focus-aware handlers (only fires when component has focus)
keyboard.onFocused(componentIndex, handler)
```

### TITAN Layout Engine
Complete flexbox: direction, wrap, grow, shrink, basis, justify-content, align-items, align-self, gap, min/max constraints, percentage dimensions. Skips `visible=false` components (takes no space).

### Template Primitives

Reactive control flow primitives for dynamic UIs:

```typescript
// each() - Reactive lists (key is stable, use for selection!)
each(() => items.value, (getItem, key) => {
  text({ content: () => getItem().name, id: `item-${key}` })
}, { key: item => item.id })

// show() - Conditional rendering
show(() => isVisible.value,
  () => text({ content: 'Visible!' }),
  () => text({ content: 'Hidden!' })  // optional else
)

// when() - Async/Suspense
when(() => fetchData(), {
  pending: () => text({ content: 'Loading...' }),
  then: (data) => text({ content: data }),
  catch: (err) => text({ content: err.message })
})
```

**Pattern**: All template primitives capture parent context, render synchronously, then use an internal effect for reactive updates. Components inside use normal props (signals/getters work!).

### User Components with reactiveProps

For building reusable components, use `reactiveProps` to normalize any input type (static, getter, signal) to a consistent reactive interface:

```typescript
import { box, text, reactiveProps, derived } from '@rlabs-inc/tui'
import type { PropInput, Cleanup } from '@rlabs-inc/tui'

interface MyComponentProps {
  title: PropInput<string>
  count: PropInput<number>
}

function MyComponent(rawProps: MyComponentProps): Cleanup {
  const props = reactiveProps<{ title: string; count: number }>(rawProps)

  // Everything is now a DerivedSignal - consistent .value access
  const display = derived(() => `${props.title.value}: ${props.count.value}`)

  return box({
    children: () => text({ content: display })
  })
}

// All of these work:
MyComponent({ title: 'Score', count: 42 })
MyComponent({ title: () => getTitle(), count: countSignal })
```

**Architecture layers**:
- **Primitives** (box, text): Use `slotArray` internally for parallel arrays
- **User components**: Use `reactiveProps` for ergonomic prop handling

## Current State (Jan 2026)

**Done**: TITAN v3 flexbox, box/text primitives, template primitives (each/show/when), all state modules (keyboard, mouse, focus, scroll, theme, cursor)

**Not Done**: input, select, progress, canvas primitives; grid layout; CLI scaffolding tool

**Deprecated**: .tui compiler moved to `.backup/` - focusing on bulletproof raw TypeScript API instead
