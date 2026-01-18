# First App: Building a Counter

Let's build a complete, interactive counter application. This tutorial covers:

- Application structure
- Reactive state management
- Keyboard input handling
- Styled components
- Layout composition

## The Final Result

We'll build a counter that:
- Displays a count with color-coded formatting
- Shows a visual bar representing the value
- Responds to keyboard shortcuts
- Has a polished, themed appearance

## Step 1: Project Setup

Create a new project:

```bash
mkdir tui-counter
cd tui-counter
bun init -y
bun add @rlabs-inc/tui
```

Create `src/index.ts`:

```typescript
import { signal, derived, box, text, mount, keyboard, t, BorderStyle } from '@rlabs-inc/tui'

async function main() {
  // We'll build the app here
}

main().catch(console.error)
```

## Step 2: Application State

Define our reactive state outside the component tree:

```typescript
// Application state - reactive!
const counter = signal(0)

// Derived value for formatted display
const counterDisplay = derived(() => {
  const value = counter.value
  if (value === 0) return '0'
  if (value > 0) return `+${value}`
  return `${value}`
})
```

Signals live outside components. This keeps state management separate from UI.

## Step 3: Basic Structure

Start with the mount function and a root container:

```typescript
async function main() {
  const cleanup = await mount(() => {
    box({
      padding: 2,
      gap: 1,
      children: () => {
        text({ content: 'Counter App' })
      }
    })
  }, { mode: 'fullscreen' })
}
```

## Step 4: Header Section

Add a styled header:

```typescript
children: () => {
  // Header
  box({
    border: BorderStyle.DOUBLE,
    borderColor: t.primary,
    padding: 1,
    alignItems: 'center',
    gap: 1,
    children: () => {
      text({
        content: 'TUI Counter',
        fg: t.primary,
      })
      text({
        content: 'A reactive counter application',
        fg: t.textDim,
      })
    }
  })
}
```

## Step 5: Counter Display

Add the main counter section with dynamic colors:

```typescript
// Counter display
box({
  border: BorderStyle.ROUNDED,
  borderColor: t.border,
  padding: 1,
  gap: 1,
  children: () => {
    text({
      content: 'Counter Value',
      fg: t.textDim,
    })

    // Dynamic color based on value
    const counterColor = derived(() => {
      const val = counter.value
      if (val > 0) return t.success
      if (val < 0) return t.error
      return t.text
    })

    text({
      content: counterDisplay,
      fg: counterColor,
    })

    // Visual bar
    const barContent = derived(() => {
      const char = counter.value >= 0 ? '+' : '-'
      return char.repeat(Math.max(1, Math.min(Math.abs(counter.value), 20)))
    })

    const barColor = derived(() =>
      counter.value >= 0 ? t.success : t.error
    )

    text({
      content: barContent,
      fg: barColor,
    })
  }
})
```

## Step 6: Help Section

Add keybinding help:

```typescript
// Key bindings help
box({
  border: BorderStyle.SINGLE,
  borderColor: t.textDim,
  padding: 1,
  gap: 0,
  children: () => {
    text({
      content: 'Key Bindings',
      fg: t.textDim,
    })

    // Help rows
    box({
      flexDirection: 'row',
      gap: 2,
      children: () => {
        text({ content: '[+] [Up]', fg: t.success, width: 12 })
        text({ content: 'Increment', fg: t.text })
      }
    })

    box({
      flexDirection: 'row',
      gap: 2,
      children: () => {
        text({ content: '[-] [Down]', fg: t.error, width: 12 })
        text({ content: 'Decrement', fg: t.text })
      }
    })

    box({
      flexDirection: 'row',
      gap: 2,
      children: () => {
        text({ content: '[r]', fg: t.warning, width: 12 })
        text({ content: 'Reset', fg: t.text })
      }
    })

    box({
      flexDirection: 'row',
      gap: 2,
      children: () => {
        text({ content: '[q]', fg: t.textDim, width: 12 })
        text({ content: 'Quit', fg: t.text })
      }
    })
  }
})
```

## Step 7: Keyboard Handlers

Add input handling after mount:

```typescript
async function main() {
  const cleanup = await mount(() => {
    // ... all the UI code ...
  }, { mode: 'fullscreen' })

  // Keyboard handlers
  keyboard.onKey(['+', '=', 'ArrowUp'], () => {
    counter.value++
  })

  keyboard.onKey(['-', '_', 'ArrowDown'], () => {
    counter.value--
  })

  keyboard.onKey(['r', 'R'], () => {
    counter.value = 0
  })

  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}
```

## Complete Code

Here's the full application:

```typescript
import { signal, derived, box, text, mount, keyboard, t, BorderStyle } from '@rlabs-inc/tui'

// State
const counter = signal(0)
const counterDisplay = derived(() => {
  const value = counter.value
  if (value === 0) return '0'
  if (value > 0) return `+${value}`
  return `${value}`
})

async function main() {
  const cleanup = await mount(() => {
    box({
      padding: 2,
      gap: 1,
      children: () => {
        // Header
        box({
          border: BorderStyle.DOUBLE,
          borderColor: t.primary,
          padding: 1,
          alignItems: 'center',
          gap: 1,
          children: () => {
            text({ content: 'TUI Counter', fg: t.primary })
            text({ content: 'A reactive counter application', fg: t.textDim })
          }
        })

        // Counter
        box({
          border: BorderStyle.ROUNDED,
          borderColor: t.border,
          padding: 1,
          gap: 1,
          children: () => {
            text({ content: 'Counter Value', fg: t.textDim })

            const counterColor = derived(() => {
              const val = counter.value
              if (val > 0) return t.success
              if (val < 0) return t.error
              return t.text
            })

            text({ content: counterDisplay, fg: counterColor })

            const barContent = derived(() => {
              const char = counter.value >= 0 ? '+' : '-'
              return char.repeat(Math.max(1, Math.min(Math.abs(counter.value), 20)))
            })
            const barColor = derived(() =>
              counter.value >= 0 ? t.success : t.error
            )

            text({ content: barContent, fg: barColor })
          }
        })

        // Help
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.textDim,
          padding: 1,
          children: () => {
            text({ content: 'Key Bindings', fg: t.textDim })

            const helpRow = (key: string, desc: string, color: any) => {
              box({
                flexDirection: 'row',
                gap: 2,
                children: () => {
                  text({ content: key, fg: color, width: 12 })
                  text({ content: desc, fg: t.text })
                }
              })
            }

            helpRow('[+] [Up]', 'Increment', t.success)
            helpRow('[-] [Down]', 'Decrement', t.error)
            helpRow('[r]', 'Reset', t.warning)
            helpRow('[q]', 'Quit', t.textDim)
          }
        })

        // Footer
        text({
          content: 'Built with TUI',
          fg: t.textDim
        })
      }
    })
  }, { mode: 'fullscreen' })

  // Input handlers
  keyboard.onKey(['+', '=', 'ArrowUp'], () => counter.value++)
  keyboard.onKey(['-', '_', 'ArrowDown'], () => counter.value--)
  keyboard.onKey(['r', 'R'], () => counter.value = 0)
  keyboard.onKey(['q', 'Q', 'Escape'], () => cleanup())
}

main().catch(console.error)
```

## Run It

```bash
bun run src/index.ts
```

## Key Takeaways

1. **State outside components** - Signals live outside the component tree
2. **Derived for computed values** - Use `derived()` for values based on other signals
3. **Pass signals and deriveds directly** - `text({ content: counterDisplay })` is cleaner than `text({ content: () => counterDisplay.value })`. Use inline getters `() =>` only for one-off computations.
4. **Keyboard after mount** - Register handlers after mount returns
5. **Cleanup function** - Mount returns a cleanup function for graceful exit

## Next Steps

- [Box Guide](../guides/primitives/box.md) - Master flexbox layout
- [Each Guide](../guides/primitives/template-primitives.md) - Build dynamic lists
- [Theme Guide](../guides/styling/themes.md) - Customize colors
- [Examples](../examples/README.md) - See more complete applications
