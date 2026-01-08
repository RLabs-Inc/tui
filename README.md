# TUI Framework

**The Terminal UI Framework for TypeScript/Bun**

A blazing-fast, fine-grained reactive terminal UI framework with complete flexbox layout and zero CPU when idle.

## Performance

| Metric | Value |
|--------|-------|
| Single update latency | 0.028ms |
| Updates per second | 41,000+ |
| Layout (10K components) | 0.66ms |
| Memory per component | ~500 bytes |
| Maximum components tested | 1,000,000 |

## Quick Start

```bash
bun add tui @rlabs-inc/signals
```

```typescript
import { mount, box, text } from 'tui'
import { signal } from '@rlabs-inc/signals'

// Create reactive state
const count = signal(0)

// Build your UI
box({ width: 40, height: 10, children: () => {
  text({ content: `Count: ${count.value}` })
}})

// Mount to terminal
mount()

// Update anywhere - UI reacts automatically
setInterval(() => count.value++, 1000)
```

## Features

### Complete Flexbox Layout (TITAN Engine)
- Direction: row, column, row-reverse, column-reverse
- Wrap: nowrap, wrap, wrap-reverse
- Justify: flex-start, center, flex-end, space-between, space-around, space-evenly
- Align: stretch, flex-start, center, flex-end
- Grow, shrink, basis, gap
- Min/max constraints
- Percentage dimensions

### Fine-Grained Reactivity
- Signals for primitive values
- Derived for computed values
- Effects for side effects
- Bindings for prop connections
- Zero reconciliation - reactivity IS the update mechanism

### Svelte-like .tui Files (Compiler)
```html
<script>
  const name = signal('World')
</script>

<box width={40} height={3}>
  <text content={`Hello, ${name.value}!`} />
</box>
```

### State Modules
- **keyboard** - Key events, shortcuts, input buffering
- **mouse** - Click, hover, drag, wheel events
- **focus** - Tab navigation, focus trapping
- **scroll** - Scroll state and navigation
- **theme** - 14 color variants, theming

## Architecture

```
User Signals → bind() → Parallel Arrays → layoutDerived → frameBufferDerived → render
```

### Why So Fast?

1. **Parallel Arrays** - ECS-like data layout for cache efficiency
2. **No Reconciliation** - Fine-grained reactivity replaces diffing
3. **Single Effect** - One render effect for entire app
4. **TITAN Layout** - O(n) flexbox in pure TypeScript
5. **Zero CPU Idle** - Only updates when signals change

## Examples

```bash
# Run examples
bun run examples/hello.ts
bun run examples/showcase.ts

# Run tests
bun run examples/tests/01-box-basics.ts
bun run examples/tests/03-layout-flex.ts
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guide and philosophy
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Deep dive into the architecture
- [docs/API.md](./docs/API.md) - Complete API reference
- [docs/BIND_PRIMITIVE.md](./docs/BIND_PRIMITIVE.md) - Understanding reactivity

## Primitives

| Primitive | Status | Description |
|-----------|--------|-------------|
| `box` | Complete | Container with flexbox layout |
| `text` | Complete | Text display with styling |
| `input` | Planned | Text input field |
| `select` | Planned | Dropdown selection |
| `progress` | Planned | Progress bar |

## Test Coverage

- **130 tests** passing
- TITAN layout engine: 48 tests
- Parallel arrays: 17 tests
- Focus manager: 29 tests
- Compiler: 36 tests (unit + integration)

## Requirements

- Bun 1.0+ (for runtime and build)
- Node.js 18+ (for compatibility)
- Terminal with ANSI support

## License

MIT

---

Built with love by Rusty & Watson in São Paulo, Brazil.
