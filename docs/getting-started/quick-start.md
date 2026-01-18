# Quick Start

Build your first TUI application in 5 minutes.

## Hello World

Create `src/index.ts`:

```typescript
import { box, text, mount } from '@rlabs-inc/tui'

mount(() => {
  box({
    padding: 2,
    children: () => {
      text({ content: 'Hello, TUI!' })
    }
  })
})
```

Run it:

```bash
bun run src/index.ts
```

Press `Ctrl+C` to exit.

## Adding Reactivity

Let's make it interactive. The magic of TUI is **signals** - reactive values that automatically update the UI when they change.

```typescript
import { signal, derived, box, text, mount, keyboard } from '@rlabs-inc/tui'

// Create reactive state
const count = signal(0)
const label = derived(() => `Count: ${count.value}`)

mount(() => {
  box({
    padding: 2,
    gap: 1,
    children: () => {
      text({ content: 'Press Enter to increment' })

      // Pass a derived directly - clean and simple!
      text({ content: label })
    }
  })
})

// Handle keyboard input
keyboard.onKey('Enter', () => {
  count.value++  // UI updates automatically
})
```

Run it and press Enter repeatedly. The count updates without any manual DOM manipulation or re-rendering logic.

### Three Ways to Pass Reactive Props

TUI accepts signals, deriveds, or inline getters for any reactive prop:

```typescript
const count = signal(0)
const formatted = derived(() => `Count: ${count.value}`)

// 1. Signal directly - simplest when no transformation needed
text({ content: count })        // displays: 0
box({ width: widthSignal })     // any prop works

// 2. Derived directly - for pre-computed values
text({ content: formatted })    // displays: "Count: 0"

// 3. Inline getter - for one-off computations
text({ content: () => count.value * 2 })           // inline math
text({ content: () => `Value: ${count.value}` })   // inline template
```

**The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations that don't warrant a named derived.

## Adding Style

TUI includes a complete theme system:

```typescript
import { signal, box, text, mount, keyboard, t, BorderStyle } from '@rlabs-inc/tui'

const count = signal(0)

mount(() => {
  box({
    padding: 2,
    gap: 1,
    border: BorderStyle.ROUNDED,
    borderColor: t.primary,
    children: () => {
      text({
        content: 'TUI Counter',
        fg: t.primary
      })

      text({
        content: () => `Count: ${count.value}`,
        fg: t.success
      })

      text({
        content: 'Press Enter to increment, Q to quit',
        fg: t.textDim
      })
    }
  })
})

keyboard.onKey('Enter', () => count.value++)
keyboard.onKey(['q', 'Q'], () => process.exit(0))
```

## Layout with Flexbox

TUI uses a complete flexbox implementation:

```typescript
import { box, text, mount, t, BorderStyle } from '@rlabs-inc/tui'

mount(() => {
  box({
    padding: 2,
    gap: 1,
    children: () => {
      // Header
      text({ content: 'Dashboard', fg: t.primary })

      // Two columns side by side
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          // Left panel
          box({
            border: BorderStyle.SINGLE,
            padding: 1,
            grow: 1,
            children: () => {
              text({ content: 'Left Panel', fg: t.success })
              text({ content: 'Some content here' })
            }
          })

          // Right panel
          box({
            border: BorderStyle.SINGLE,
            padding: 1,
            grow: 1,
            children: () => {
              text({ content: 'Right Panel', fg: t.warning })
              text({ content: 'More content here' })
            }
          })
        }
      })
    }
  })
})
```

## Render Modes

TUI supports three render modes:

```typescript
// Fullscreen - takes over the terminal (default)
mount(() => { /* ... */ }, { mode: 'fullscreen' })

// Inline - renders in place, clears on exit
mount(() => { /* ... */ }, { mode: 'inline' })

// Append - chat-style, preserves history
mount(() => { /* ... */ }, { mode: 'append' })
```

## What's Next?

- [Core Concepts](./concepts.md) - Understand how TUI works
- [First App](./first-app.md) - Build a complete application
- [Box Guide](../guides/primitives/box.md) - Master the box primitive
- [Keyboard Guide](../guides/state/keyboard.md) - Handle all input types
