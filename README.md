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

### Getting Started
- [Installation](./docs/getting-started/installation.md) - Requirements and setup
- [Quick Start](./docs/getting-started/quick-start.md) - Hello world in 5 minutes
- [Core Concepts](./docs/getting-started/concepts.md) - Understand the fundamentals
- [First App Tutorial](./docs/getting-started/first-app.md) - Build a complete app

### User Guides
- [Primitives](./docs/guides/primitives/) - box, text, each, show, when
- [Layout](./docs/guides/layout/flexbox.md) - Flexbox layout system
- [Styling](./docs/guides/styling/colors.md) - Colors, themes, borders
- [Reactivity](./docs/guides/reactivity/signals.md) - Signals and reactivity
- [Patterns](./docs/guides/patterns/component-patterns.md) - Building components

### Reference
- [API Reference](./docs/api/README.md) - Complete API documentation
- [Architecture](./docs/contributing/architecture.md) - Deep dive into internals
- [Examples](./docs/examples/README.md) - 100+ working examples

### Contributing
- [Development Setup](./docs/contributing/development.md) - Get started contributing
- [Internals](./docs/contributing/internals/) - Engine deep-dives

## Primitives

### UI Primitives

| Primitive | Status | Description |
|-----------|--------|-------------|
| `box` | Complete | Container with flexbox layout |
| `text` | Complete | Text display with styling |
| `input` | Planned | Text input field |
| `select` | Planned | Dropdown selection |
| `progress` | Planned | Progress bar |

### Template Primitives

Reactive control flow for dynamic UIs - no manual effects needed!

| Primitive | Purpose | Description |
|-----------|---------|-------------|
| `each()` | Lists | Reactive list rendering with keyed reconciliation |
| `show()` | Conditionals | Show/hide components based on condition |
| `when()` | Async | Suspense-like pending/success/error states |

#### `each()` - Reactive Lists

Renders a list of components that automatically updates when the array changes.

```typescript
import { each, box, text, signal } from '@rlabs-inc/tui'

const todos = signal([
  { id: '1', text: 'Learn TUI', done: false },
  { id: '2', text: 'Build app', done: false },
])

box({
  children: () => {
    each(
      () => todos.value,                    // Reactive array getter
      (todo) => box({                       // Render function per item
        id: `todo-${todo.id}`,              // Stable ID for reconciliation
        children: () => {
          text({ content: () => todo.text })  // Props can be reactive too!
        }
      }),
      { key: (todo) => todo.id }            // Key function for efficient updates
    )
  }
})

// Add item - UI updates automatically
todos.value = [...todos.value, { id: '3', text: 'Deploy', done: false }]

// Remove item - component is cleaned up automatically
todos.value = todos.value.filter(t => t.id !== '1')
```

#### `show()` - Conditional Rendering

Shows or hides components based on a reactive condition.

```typescript
import { show, box, text, signal } from '@rlabs-inc/tui'

const isLoggedIn = signal(false)

box({
  children: () => {
    show(
      () => isLoggedIn.value,               // Condition getter
      () => box({                           // Render when true
        children: () => {
          text({ content: 'Welcome back!' })
        }
      }),
      () => text({ content: 'Please log in' })  // Optional: render when false
    )
  }
})

// Toggle - UI switches automatically
isLoggedIn.value = true
```

#### `when()` - Async/Suspense

Handles async operations with loading, success, and error states.

```typescript
import { when, box, text, signal } from '@rlabs-inc/tui'

const userId = signal('123')

// Fetch function that returns a promise
const fetchUser = (id: string) =>
  fetch(`/api/users/${id}`).then(r => r.json())

box({
  children: () => {
    when(
      () => fetchUser(userId.value),        // Promise getter (re-runs on userId change)
      {
        pending: () => text({ content: 'Loading...' }),
        then: (user) => box({
          children: () => {
            text({ content: `Name: ${user.name}` })
            text({ content: `Email: ${user.email}` })
          }
        }),
        catch: (error) => text({
          content: `Error: ${error.message}`,
          fg: 'red'
        })
      }
    )
  }
})

// Change userId - triggers new fetch, shows loading, then result
userId.value = '456'
```

### How Template Primitives Work

All template primitives follow the same elegant pattern:

1. **Capture parent context** at creation time
2. **Initial render synchronously** (correct parent hierarchy)
3. **Internal effect** tracks reactive dependencies
4. **Reconcile on change** (create new, cleanup removed)

This means:
- User code stays clean - no manual effects
- Props inside templates are fully reactive
- Cleanup is automatic
- Performance is optimal (only affected components update)

## Test Coverage

- TITAN layout engine: 48 tests
- Parallel arrays: 17 tests
- Focus manager: 29 tests

## Requirements

- Bun 1.0+ (for runtime and build)
- Node.js 18+ (for compatibility)
- Terminal with ANSI support

## License

MIT

---

Built with love by Rusty & Watson in São Paulo, Brazil.
