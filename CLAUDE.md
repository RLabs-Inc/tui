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
bun run examples/showcase/showcase.ts       # Full showcase

# Type checking
bun run typecheck                           # Root package
cd packages/tui-compiler && bun run typecheck

# Run compiler tests
cd packages/tui-compiler && bun test

# Benchmarks
bun run test/realistic-benchmark.ts
bun run test/stress-benchmark.ts

# Publishing (npm)
npm publish --access public                 # Root @rlabs-inc/tui
cd packages/tui-compiler && npm publish --access public
cd packages/tui-cli && npm publish --access public
```

## Architecture

### Monorepo Structure
- **Root (`@rlabs-inc/tui`)**: Core framework - primitives, state, layout engine
- **`packages/tui-compiler`**: `.tui` file compiler (Svelte-like syntax)
- **`packages/tui-cli` (`@rlabs-inc/create-tui`)**: CLI scaffolding tool

### Core Pipeline
```
User Signals → bind() → Parallel Arrays → layoutDerived → frameBufferDerived → render effect
```

The framework uses **parallel arrays** (ECS-style) instead of component objects:
- Each ARRAY stores one property type: `width[]`, `height[]`, `color[]`
- Each INDEX represents one component
- Components write via `bind(props.value)`, pipeline reads via `unwrap()`

### Critical Rules
1. **Arrays use `Binding<T>[]`** - NOT `state<T[]>`. `state()` snapshots getters.
2. **Props bind directly**: `bind(props.width ?? 0)` - never extract first
3. **One render effect**: Pipeline is all derived, only final render is an effect

### Key Files
| File | Purpose |
|------|---------|
| `src/pipeline/layout/titan-engine.ts` | TITAN flexbox layout engine |
| `src/primitives/box.ts`, `text.ts` | UI primitives |
| `src/engine/arrays/` | Parallel arrays (core, dimensions, spacing, layout, visual, text, interaction) |
| `src/state/keyboard.ts` | Keyboard handling with escape sequence parsing |
| `src/state/focus.ts` | Focus management and tab navigation |
| `packages/tui-compiler/src/plugin.ts` | Bun plugin for .tui files |

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

### .tui Compiler
Svelte-like files compile to TypeScript:
- `{#if}` injects `visible` prop into children (no wrapper boxes)
- `{#each}` compiles to plain for loops
- `{signal}` auto-unwraps in text content (no `.value` needed)

### TITAN Layout Engine
Complete flexbox: direction, wrap, grow, shrink, basis, justify-content, align-items, align-self, gap, min/max constraints, percentage dimensions. Skips `visible=false` components (takes no space).

## Current State (Jan 2026)

**Done**: TITAN v3 flexbox, box/text primitives, all state modules (keyboard, mouse, focus, scroll, theme, cursor), .tui compiler with Bun plugin

**Not Done**: input, select, progress, canvas primitives; grid layout

**Known Issues**: Documentation/examples may be outdated compared to actual API - always verify against source code
