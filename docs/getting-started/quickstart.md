# Quick Start

Build a feature-rich counter app that showcases TUI's core features in ~100 lines of clean code.

## What You'll Learn

- **Signals** - Reactive state management
- **Derived** - Computed values that update automatically
- **Box & Text** - Layout primitives with flexbox
- **each()** - Reactive lists
- **Focusable boxes** - Component-level keyboard handling
- **Auto-scroll** - Overflow handling with zero code
- **Themes** - Reactive color system

## Setup

```bash
mkdir my-tui-app && cd my-tui-app
bun init -y
bun add @rlabs-inc/tui
```

Create `index.ts`:

```typescript
import { mount } from '@rlabs-inc/tui'

const cleanup = await mount(() => {
  // Your app goes here
})
```

## Building the App

### 1. State

```typescript
import {
  signal,
  derived,
  box,
  text,
  each,
  keyboard,
  t,
  themes,
  setTheme,
  BorderStyle,
} from "@rlabs-inc/tui"

// Reactive counter
const count = signal(0)

// Log entries with unique IDs for each() keys
interface LogEntry {
  id: number
  text: string
}
let logId = 0
const logs = signal<LogEntry[]>([])

// Theme cycling
const themeNames = Object.keys(themes) as (keyof typeof themes)[]
const currentThemeIndex = signal(0)
const currentThemeName = derived(() => themeNames[currentThemeIndex.value])

// Counter color - changes based on value
// Note: use .value to get actual RGBA from theme colors in derived
const counterColor = derived(() =>
  count.value >= 0 ? t.success.value : t.error.value
)
```

### 2. Helpers

```typescript
function addLog(action: string) {
  logs.value = [
    ...logs.value,
    { id: logId++, text: `${action} → ${count.value}` },
  ]
}

function cycleTheme() {
  currentThemeIndex.value = (currentThemeIndex.value + 1) % themeNames.length
  setTheme(themeNames[currentThemeIndex.value])
}
```

### 3. Root Layout

```typescript
const cleanup = await mount(() => {
  box({
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 1,
    gap: 1,
    justifyContent: "space-between",
    children: () => {
      // Title
      text({ content: "TUI Quick Start", fg: t.primary })

      // Counter box (we'll build this next)
      // Logs box (we'll build this next)
      // Status bar (we'll build this next)
    },
  })
})
```

### 4. Counter Box with Local Keyboard

The counter box is **focusable** and handles its own keyboard events:

```typescript
box({
  focusable: true,
  border: BorderStyle.ROUNDED,
  borderColor: t.primary,
  padding: 1,
  flexDirection: "column",
  gap: 1,
  alignItems: "center",
  onKey: (e) => {
    if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") {
      count.value++
      addLog("+1")
      return true  // Event consumed
    }
    if (e.key === "ArrowDown" || e.key === "-" || e.key === "_") {
      count.value--
      addLog("-1")
      return true
    }
    if (e.key === "r" || e.key === "R") {
      const old = count.value
      count.value = 0
      addLog(`reset from ${old}`)
      return true
    }
    return false  // Let other handlers process
  },
  children: () => {
    // Counter display
    box({
      flexDirection: "row",
      alignItems: "center",
      children: () => {
        text({ content: "Count: ", fg: t.textMuted })
        text({
          content: () => count.value.toString(),
          fg: counterColor,
        })
      },
    })

    text({
      content: "↑/↓ or +/-  r Reset",
      fg: t.textMuted,
    })
  },
})
```

**Key pattern**: `focusable: true` + `onKey` = self-contained keyboard handling. When this box has focus, it receives keyboard events. Return `true` to consume the event.

### 5. Scrollable Logs with each()

The logs box demonstrates two powerful features:
1. **each()** for reactive lists
2. **Auto-scroll** - just set `overflow: "scroll"` and it works!

```typescript
box({
  flexDirection: "column",
  gap: 1,
  border: BorderStyle.SINGLE,
  borderColor: t.border,
  padding: 1,
  width: "50%",
  alignSelf: "center",
  children: () => {
    text({
      content: () => `History (${logs.value.length})`,
      fg: t.textDim,
    })

    // Scrollable area - NO onKey needed!
    box({
      focusable: true,
      height: 8,
      overflow: "scroll",
      borderTop: BorderStyle.SINGLE,
      borderBottom: BorderStyle.SINGLE,
      borderColor: t.border,
      children: () => {
        // Reactive list
        each(
          () => logs.value,
          (getItem) => text({ content: () => getItem().text, fg: t.text }),
          { key: (item) => String(item.id) }
        )
      },
    })

    text({
      align: "center",
      content: "↑/↓ to scroll",
      fg: t.textMuted,
    })
  },
})
```

**Key patterns**:
- `each(items, renderFn, { key })` - The key function must return a unique string for each item
- `overflow: "scroll"` + `focusable: true` = arrow keys scroll automatically when focused
- `getItem()` is a getter function - call it to get the current item value

### 6. Status Bar

```typescript
box({
  flexDirection: "row",
  justifyContent: "space-evenly",
  children: () => {
    text({
      content: () => `Theme: ${currentThemeName.value}`,
      fg: t.textMuted,
    })
    text({ content: "t switch theme", fg: t.textMuted })
    text({ content: "Tab to switch focus", fg: t.textMuted })
    text({ content: "q Quit", fg: t.textMuted })
  },
})
```

### 7. Global Keyboard Handlers

Some keys should work regardless of focus:

```typescript
keyboard.onKey("t", () => cycleTheme())
keyboard.onKey("q", () => cleanup())
```

## Run It

```bash
bun run index.ts
```

- **Tab** - Switch focus between counter and logs
- **↑/↓** or **+/-** - Increment/decrement (when counter focused)
- **r** - Reset counter
- **↑/↓** - Scroll logs (when logs focused)
- **t** - Cycle themes
- **q** - Quit

<details>
<summary><strong>Complete Code</strong> (click to expand)</summary>

```typescript
import {
  signal,
  derived,
  box,
  text,
  each,
  keyboard,
  mount,
  t,
  themes,
  setTheme,
  BorderStyle,
} from "@rlabs-inc/tui"

// =============================================================================
// STATE
// =============================================================================

const count = signal(0)

// Log entries with unique IDs for each() keys
interface LogEntry {
  id: number
  text: string
}
let logId = 0
const logs = signal<LogEntry[]>([])

// Available themes for cycling
const themeNames = Object.keys(themes) as (keyof typeof themes)[]
const currentThemeIndex = signal(0)
const currentThemeName = derived(() => themeNames[currentThemeIndex.value])

// Counter color - changes based on value
// Note: use .value to get actual RGBA from theme colors in derived
const counterColor = derived(() =>
  count.value >= 0 ? t.success.value : t.error.value
)

// =============================================================================
// HELPERS
// =============================================================================

function addLog(action: string) {
  logs.value = [
    ...logs.value,
    { id: logId++, text: `${action} → ${count.value}` },
  ]
}

function cycleTheme() {
  currentThemeIndex.value = (currentThemeIndex.value + 1) % themeNames.length
  setTheme(themeNames[currentThemeIndex.value])
}

// =============================================================================
// APP
// =============================================================================

const cleanup = await mount(() => {
  box({
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 1,
    gap: 1,
    justifyContent: "space-between",
    children: () => {
      // Title
      text({ content: "TUI Quick Start", fg: t.primary })

      // Counter box - focusable with local keyboard handling
      box({
        focusable: true,
        border: BorderStyle.ROUNDED,
        borderColor: t.primary,
        padding: 1,
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        onKey: (e) => {
          if (e.key === "ArrowUp" || e.key === "+" || e.key === "=") {
            count.value++
            addLog("+1")
            return true
          }
          if (e.key === "ArrowDown" || e.key === "-" || e.key === "_") {
            count.value--
            addLog("-1")
            return true
          }
          if (e.key === "r" || e.key === "R") {
            const old = count.value
            count.value = 0
            addLog(`reset from ${old}`)
            return true
          }
          return false
        },
        children: () => {
          box({
            flexDirection: "row",
            alignItems: "center",
            children: () => {
              text({ content: "Count: ", fg: t.textMuted })
              text({
                content: () => count.value.toString(),
                fg: counterColor,
              })
            },
          })
          text({ content: "↑/↓ or +/-  r Reset", fg: t.textMuted })
        },
      })

      // History box
      box({
        flexDirection: "column",
        gap: 1,
        border: BorderStyle.SINGLE,
        borderColor: t.border,
        padding: 1,
        width: "50%",
        alignSelf: "center",
        children: () => {
          text({
            content: () => `History (${logs.value.length})`,
            fg: t.textDim,
          })

          // Scrollable logs - focusable, auto-scrolls, NO onKey needed!
          box({
            focusable: true,
            height: 8,
            overflow: "scroll",
            borderTop: BorderStyle.SINGLE,
            borderBottom: BorderStyle.SINGLE,
            borderColor: t.border,
            children: () => {
              each(
                () => logs.value,
                (getItem) => text({ content: () => getItem().text, fg: t.text }),
                { key: (item) => String(item.id) }
              )
            },
          })

          text({ align: "center", content: "↑/↓ to scroll", fg: t.textMuted })
        },
      })

      // Status bar
      box({
        flexDirection: "row",
        justifyContent: "space-evenly",
        children: () => {
          text({
            content: () => `Theme: ${currentThemeName.value}`,
            fg: t.textMuted,
          })
          text({ content: "t switch theme", fg: t.textMuted })
          text({ content: "Tab to switch focus", fg: t.textMuted })
          text({ content: "q Quit", fg: t.textMuted })
        },
      })
    },
  })
})

// Global keyboard handlers
keyboard.onKey("t", () => cycleTheme())
keyboard.onKey("q", () => cleanup())
```

</details>

## What You Learned

| Feature | Pattern |
|---------|---------|
| Reactive state | `signal(initialValue)` |
| Computed values | `derived(() => computation)` |
| Reactive lists | `each(() => items, (getItem) => ..., { key })` |
| Local keyboard | `box({ focusable: true, onKey: (e) => ... })` |
| Auto-scroll | `box({ overflow: "scroll", focusable: true })` |
| Theme colors | `fg: t.primary`, `fg: t.success`, etc. |
| Theme switching | `setTheme(themeName)` |
| Flexbox layout | `flexDirection`, `gap`, `alignItems`, `justifyContent` |

## Next Steps

- [Primitives Guide](../guides/primitives.md) - Deep dive into box, text, input
- [Keyboard Handling](../guides/keyboard.md) - Focus management and shortcuts
- [Theming](../guides/theming.md) - Creating custom themes
