# Render Modes Guide

> Choose the right rendering strategy for your app

## Overview

TUI supports three rendering modes, each optimized for different use cases:

| Mode | Best For | Terminal Scroll | Mouse | Performance |
|------|----------|----------------|-------|-------------|
| **fullscreen** | Dashboards, editors, games | No (viewport only) | Yes | O(changes) |
| **inline** | Short-lived prompts, wizards | Yes | Yes | O(content) |
| **append** | Chat interfaces, logs, CLIs | Yes | No | O(active) |

## Fullscreen Mode (Default)

Takes over the terminal's alternate screen buffer. Content is constrained to the viewport.

```typescript
import { mount, box, text } from '@rlabs-inc/tui'

const cleanup = await mount(() => {
  box({
    width: '100%',
    height: '100%',
    children: () => {
      text({ content: 'Full terminal control!' })
    }
  })
}, {
  mode: 'fullscreen'  // default
})
```

### Characteristics

- **Alternate screen**: Uses terminal's alternate buffer (preserved scrollback)
- **Viewport-bound**: Content limited to terminal dimensions
- **Differential rendering**: Only changed cells re-render (fast!)
- **Full mouse support**: Clicks, drags, scroll wheel
- **Clean exit**: Returns to previous terminal state on cleanup

### Use Cases

- Interactive dashboards
- Text editors
- File managers
- Games
- Full-screen menus

### Example: Dashboard

```typescript
import { mount, box, text, t, signal } from '@rlabs-inc/tui'

const cpuUsage = signal(45)
const memUsage = signal(62)

await mount(() => {
  box({
    width: '100%',
    height: '100%',
    padding: 2,
    gap: 1,
    children: () => {
      text({ content: 'System Dashboard', fg: t.primary, attrs: Attr.BOLD })

      box({
        flexDirection: 'row',
        gap: 4,
        children: () => {
          text({ content: () => `CPU: ${cpuUsage.value}%` })
          text({ content: () => `Memory: ${memUsage.value}%` })
        }
      })
    }
  })
}, { mode: 'fullscreen' })
```

## Inline Mode

Renders content inline with existing terminal output. Good for interactive prompts that preserve context.

```typescript
const cleanup = await mount(() => {
  box({
    border: BorderStyle.ROUNDED,
    padding: 1,
    children: () => {
      text({ content: 'Continue? [Y/n]' })
    }
  })
}, {
  mode: 'inline'
})
```

### Characteristics

- **No alternate screen**: Content appears in main scrollback
- **Dynamic height**: Grows with content
- **Full re-render**: Erases and redraws all content each frame
- **Mouse support**: Full mouse tracking available
- **Preserves context**: Previous terminal output visible above

### Use Cases

- Installation wizards
- Interactive prompts
- Short-lived selections
- CLI confirmations

### Example: Interactive Prompt

```typescript
import { mount, box, text, keyboard, signal } from '@rlabs-inc/tui'

const selected = signal(0)
const options = ['Option A', 'Option B', 'Option C']

const cleanup = await mount(() => {
  box({
    border: BorderStyle.SINGLE,
    padding: 1,
    children: () => {
      text({ content: 'Select an option:', fg: t.primary })

      options.forEach((opt, i) => {
        text({
          content: () => `${selected.value === i ? '>' : ' '} ${opt}`,
          fg: () => selected.value === i ? t.primary.value : t.text.value
        })
      })
    }
  })
}, { mode: 'inline' })

keyboard.onKey('ArrowDown', () => {
  selected.value = Math.min(selected.value + 1, options.length - 1)
})

keyboard.onKey('ArrowUp', () => {
  selected.value = Math.max(selected.value - 1, 0)
})
```

### Performance Consideration

Inline mode re-renders all content each frame. For large content, consider fullscreen or append mode.

## Append Mode

Hybrid mode optimized for growing content. Combines static history with reactive active region.

```typescript
const { cleanup, renderToHistory } = await mount(() => {
  ChatUI()
}, {
  mode: 'append',
  mouse: false  // Enable native terminal scroll
})
```

### Characteristics

- **Two regions**: Static (frozen) + Reactive (active)
- **Native scroll**: Terminal scrollback works (mouse disabled)
- **Constant performance**: Only active region re-renders
- **Infinite content**: History can grow unbounded
- **Persistent**: Content remains in scrollback after exit

### Use Cases

- Chat interfaces (Claude Code, ChatGPT CLI)
- Log viewers and tailers
- Build output (showing completed steps)
- Package managers
- Deploy scripts

### Basic Usage

```typescript
import { mount, box, text, each, signal } from '@rlabs-inc/tui'

const messages = signal([
  { id: '1', text: 'Hello!' },
  { id: '2', text: 'How are you?' }
])

const { cleanup } = await mount(() => {
  box({
    children: () => {
      each(
        () => messages.value,
        (getMessage, key) => text({ content: () => getMessage().text }),
        { key: msg => msg.id }
      )
    }
  })
}, {
  mode: 'append',
  mouse: false
})
```

For detailed append mode usage, see the [Append Mode Guide](./append-mode.md).

## Choosing a Mode

```
                     ┌─────────────────────────┐
                     │  Does content grow      │
                     │  over time?             │
                     └───────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                   YES                        NO
                    │                         │
         ┌──────────┴──────────┐    ┌────────┴────────┐
         │  Need mouse         │    │  Fill entire    │
         │  interaction?       │    │  terminal?      │
         └──────────┬──────────┘    └────────┬────────┘
                    │                        │
           ┌────────┴────────┐      ┌────────┴────────┐
           │                 │      │                 │
          YES               NO     YES               NO
           │                 │      │                 │
    ┌──────┴──────┐   ┌─────┴─────┐  ┌──────┴─────┐  ┌──────┴──────┐
    │   INLINE    │   │  APPEND   │  │ FULLSCREEN │  │   INLINE    │
    │  (slower)   │   │           │  │            │  │             │
    └─────────────┘   └───────────┘  └────────────┘  └─────────────┘
```

### Decision Matrix

| Requirement | Fullscreen | Inline | Append |
|-------------|------------|--------|--------|
| Native terminal scroll | No | Yes | Yes |
| Mouse interactions | Yes | Yes | No |
| Growing content | Limited | Slow | Fast |
| Preserved scrollback | Yes | Yes | Yes |
| Clean exit | Yes | Yes | Yes |
| Interactive widgets | Best | Good | Limited |

## Mount Options

```typescript
interface MountOptions {
  mode?: 'fullscreen' | 'inline' | 'append'
  mouse?: boolean           // Enable mouse tracking (default: true)
  kittyKeyboard?: boolean   // Use Kitty protocol (default: true)
  getStaticHeight?: () => number  // Append mode: lines to freeze in history
}
```

### getStaticHeight (Append Mode)

For append mode, `getStaticHeight` controls the boundary between frozen history and the reactive active region:

```typescript
mount(App, {
  mode: 'append',
  mouse: false,
  getStaticHeight: () => {
    // Return number of lines to freeze in terminal history
    // Active content = total height - static height
    return completedMessageLines
  }
})
```

See the [Append Mode Guide](./append-mode.md) for detailed usage.

### Mouse Option

```typescript
// Fullscreen: mouse usually desired
mount(App, { mode: 'fullscreen', mouse: true })

// Inline: mouse optional
mount(App, { mode: 'inline', mouse: true })

// Append: disable mouse for native scroll
mount(App, { mode: 'append', mouse: false })
```

### Kitty Keyboard

Modern terminals support enhanced keyboard protocol. Enabled by default.

```typescript
// Most terminals
mount(App, { kittyKeyboard: true })

// Older terminals (fallback to legacy)
mount(App, { kittyKeyboard: false })
```

## Switching Modes

You can't switch modes during runtime. To change modes:

```typescript
// Current app
const cleanup = await mount(App, { mode: 'inline' })

// ... later, switch to fullscreen
await cleanup()
const cleanup2 = await mount(App, { mode: 'fullscreen' })
```

## Performance Comparison

| Operation | Fullscreen | Inline | Append |
|-----------|-----------|--------|--------|
| Initial render | Fast | Fast | Fast |
| Small update | Very fast | Medium | Very fast |
| Large content | Viewport-limited | Slow | Fast (active only) |
| Scroll | Fast (viewport) | N/A (native) | N/A (native) |

## See Also

- [Append Mode Guide](./append-mode.md) - Detailed append mode documentation
- [mount() API](../../api/mount.md) - Complete mount API reference
- [Architecture](../../contributing/architecture.md) - How renderers work internally
