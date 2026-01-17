# TUI Framework - Future Work
**Created:** January 17, 2026

---

## createSubscriber for Signals Package

Research from Svelte 5 codebase exploration. This feature would integrate external event systems (DOM events, WebSocket, timers) into our reactive graph.

### How it works
```typescript
createSubscriber((update) => {
  // Subscribe to external events
  const off = addEventListener('change', update)
  return () => off()  // Cleanup
})
```

When `update()` is called, any reactive context that called `subscribe()` re-runs.

### Key implementation details
1. **Version signal** - internal signal that increments on `update()`
2. **Subscriber counting** - tracks how many effects use it
3. **Lazy start** - only subscribes when first effect reads
4. **Shared subscription** - multiple effects share one external subscription
5. **Microtask cleanup** - prevents thrashing during reactive updates

### Potential adaptation for @rlabs-inc/signals
```typescript
export function createSubscriber<T>(
  start: (update: () => void) => (() => void) | void
): () => void {
  let subscribers = 0
  const version = signal(0)
  let stop: (() => void) | void

  return () => {
    if (isInEffect()) {
      version.value  // Subscribe to version

      effect(() => {
        if (subscribers === 0) {
          stop = untracked(() => start(() => version.value++))
        }
        subscribers++

        onCleanup(() => {
          queueMicrotask(() => {
            subscribers--
            if (subscribers === 0) {
              stop?.()
              stop = undefined
              version.value++
            }
          })
        })
      })
    }
  }
}
```

### Requirements for implementation
- `isInEffect()` - detect if running in reactive context
- `onCleanup()` - register cleanup for current effect
- `untracked()` - run code without tracking dependencies

### Use cases for TUI
- Terminal resize events
- External data sources
- WebSocket messages
- Any push-based event integration

### Svelte source files for reference
Located in: `/Users/rusty/Documents/Projects/AI/Tools/ClaudeTools/memory-ts/packages/signals/docs/references/svelte/`
- `packages/svelte/src/reactivity/create-subscriber.js` - Core implementation
- `packages/svelte/src/reactivity/reactive-value.js` - Wrapper pattern
- `packages/svelte/src/reactivity/media-query.js` - Real-world usage example

---

## Test Coverage Gaps

Missing unit tests for:
- **Primitives** (box, text, input) - examples exist, need formal tests
- **Mouse module** - HitGrid, handlers
- **Scroll module** - Complex logic
- **Theme system** - Straightforward but untested
- **Color utilities** (OKLCH, contrast) - Math-heavy, needs tests
- **Animation module** - Shared clocks

---

## Framework Completion Status

| Category | Status |
|----------|--------|
| Core primitives (box/text/input) | COMPLETE |
| Template primitives (each/show/when) | COMPLETE |
| State modules (all 8) | COMPLETE |
| TITAN layout engine | COMPLETE |
| Color system (OKLCH) | COMPLETE |
| Missing: select, progress, canvas | Types only |

**Overall: 95% complete**

---

## Missing Primitives (Low Priority)

### select
- Type defined in `src/primitives/types.ts`
- Dropdown/list selection component
- Effort: ~200 lines

### progress
- Type defined in `src/primitives/types.ts`
- Progress bar component
- Can be built with box+text as workaround
- Effort: ~100 lines

### canvas
- Type declared in `src/types/index.ts`
- Custom rendering component
- Requires design work
- Effort: Significant
