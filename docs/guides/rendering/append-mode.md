# Append Mode Guide

> Two-region rendering for chat interfaces and growing content

## Overview

Append mode implements a hybrid static/reactive rendering strategy optimized for chat-like interfaces and rich CLIs.

Traditional TUI rendering has two modes:
- **Fullscreen**: Fast differential updates, but limited to terminal viewport
- **Inline**: Can grow infinitely, but re-renders all content (O(n) cost)

**Append mode** combines the best of both:
- **Static Region**: Completed content frozen in terminal history (O(1) cost)
- **Reactive Region**: Active content with full TUI interactivity (O(1) cost)

```
┌─────────────────────────────────────┐
│  STATIC REGION (Terminal History)   │
│  ─────────────────────────────────  │
│  Written once via Bun FileSink      │
│  Native scroll, copy/paste          │
│  Zero re-render cost                │
│                                     │
│  Message 1: "Hello" ✓               │
│  Tool: [✓] Success                  │
│  Message 2: "Complete" ✓            │
│  ...                                │
├─────────────────────────────────────┤ ← Boundary (moves as content completes)
│  REACTIVE REGION (Active TUI)       │
│  ─────────────────────────────────  │
│  Full reactive rendering pipeline   │
│  Interactive (focus, scroll)        │
│  Fixed size = O(1) render time      │
│                                     │
│  Message N: "Streaming tex..."      │
│  Tool: [spinner] Running...         │
│  > User input: _                    │
└─────────────────────────────────────┘
```

## Benefits

### Performance

- **Constant-time rendering**: Always renders same number of lines (reactive region only)
- **Infinite conversations**: Chat history can grow to millions of messages with zero performance impact
- **Sub-millisecond updates**: Only active content re-renders

### User Experience

- **Native terminal features**: Scroll, search, copy/paste work on static content
- **Persistent history**: Content stays in scrollback after app exits
- **Familiar behavior**: Feels like a CLI, enhanced with TUI interactivity

### Use Cases

- **Chat interfaces**: Claude Code, ChatGPT CLI, customer support
- **Log viewers**: Tail logs with interactive filtering
- **Build tools**: Show completed steps in history, current step interactive
- **Package managers**: Static install log, interactive dependency resolution
- **Deploy scripts**: Static output, interactive confirmations

## Basic Usage

### Simple Append Mode

```typescript
import { mount } from '@rlabs-inc/tui'

const cleanup = await mount(() => {
  App()
}, {
  mode: 'append',
  mouse: false  // Disable mouse for native terminal scroll
})
```

By default, append mode keeps **all content reactive** (no static region). This gives you inline-mode behavior but positions you for region splitting.

### Return Value

In append mode, `mount()` returns an object instead of just a cleanup function:

```typescript
const { cleanup, renderToHistory } = await mount(() => {
  App()
}, {
  mode: 'append',
  mouse: false
})

// renderToHistory: Write static content to history
// cleanup: Function to unmount the app
```

## Region Splitting

The power of append mode comes from region splitting - moving completed content to the static region.

### Basic Splitting

Control where the static/reactive boundary is by providing a `getStaticHeight` function:

```typescript
import { mount } from '@rlabs-inc/tui'
import { messages, isStreaming } from './state/chat'

const cleanup = await mount(() => {
  App()
}, {
  mode: 'append',
  mouse: false,
  getStaticHeight: () => {
    // Keep last 5 messages reactive, freeze older ones
    const activeMessageCount = 5
    const totalMessages = messages.value.length

    // Don't freeze while streaming
    if (isStreaming.value) {
      return 0
    }

    // Calculate how many messages to freeze
    const messagesToFreeze = Math.max(0, totalMessages - activeMessageCount)

    // Convert to line count (you'll need to track this)
    return messagesToFreeze * 10  // Assuming ~10 lines per message
  }
})
```

### Layout-Based Splitting

For precise control, track line counts per message:

```typescript
// state/append-mode.ts
import { signal, derived } from '@rlabs-inc/signals'
import { messages } from './chat'

interface MessageLayout {
  id: string
  lineCount: number
}

const messageLayouts = signal<MessageLayout[]>([])

export const staticHeight = derived(() => {
  const layouts = messageLayouts.value
  const activeCount = 5

  if (layouts.length <= activeCount) {
    return 0
  }

  // Sum line counts of messages to freeze
  let height = 0
  for (let i = 0; i < layouts.length - activeCount; i++) {
    height += layouts[i].lineCount
  }

  return height
})

// Update after layout computation
export function updateMessageLayout(id: string, lineCount: number) {
  const layouts = [...messageLayouts.value]
  const idx = layouts.findIndex(m => m.id === id)

  if (idx >= 0) {
    layouts[idx].lineCount = lineCount
  } else {
    layouts.push({ id, lineCount })
  }

  messageLayouts.value = layouts
}
```

Use it in mount:

```typescript
import { staticHeight } from './state/append-mode'

const cleanup = await mount(() => {
  App()
}, {
  mode: 'append',
  mouse: false,
  getStaticHeight: () => staticHeight.value
})
```

## Using renderToHistory

The `renderToHistory` function lets you write pre-rendered content directly to the static region:

```typescript
const { cleanup, renderToHistory } = await mount(() => {
  ActiveMessages()
}, {
  mode: 'append',
  mouse: false
})

// Later, when a message is complete:
function onMessageComplete(message: Message) {
  // Render the message to history (static region)
  renderToHistory(() => {
    MessageComponent({ message })
  })

  // Remove from active messages
  removeFromActive(message.id)
}
```

This is useful when you want explicit control over what goes to history.

## Implementation Details

### How It Works

The `AppendRegionRenderer` handles two-region rendering:

1. **Render**: Compute the full frame buffer
2. **Split**: Divide at `staticHeight` boundary
3. **Static**: Write new static lines via Bun FileSink (once only)
4. **Reactive**: Clear and re-render active region

```typescript
class AppendRegionRenderer {
  render(buffer: FrameBuffer, options: { staticHeight: number }) {
    // Split buffer at staticHeight
    const staticBuffer = extractRegion(buffer, 0, staticHeight)
    const reactiveBuffer = extractRegion(buffer, staticHeight, ...)

    // Static region: Write once via Bun FileSink
    if (staticHeight > this.totalStaticLines) {
      this.staticWriter.write(buildStaticOutput(newLines))
      this.staticWriter.flush()
    }

    // Reactive region: Clear and re-render
    process.stdout.write(ansi.eraseDown)
    process.stdout.write(buildReactiveOutput(reactiveBuffer))
  }
}
```

### Bun FileSink

The static region uses Bun's `FileSink` API for efficient buffered writes:

```typescript
const stdoutFile = Bun.file(1)  // stdout is file descriptor 1
const writer = stdoutFile.writer({ highWaterMark: 1024 * 1024 })

writer.write("Content that becomes terminal history\n")
writer.flush()
```

### Boundary Tracking

The renderer tracks the boundary between regions:

```typescript
private totalStaticLines = 0

// When staticHeight increases
if (staticHeight > this.totalStaticLines) {
  const newLines = staticHeight - this.totalStaticLines
  // Write only the new static lines
  writeToStaticRegion(newLines)
  this.totalStaticLines = staticHeight
}
```

## Best Practices

### 1. Disable Mouse in Append Mode

Terminal scroll and selection require mouse events:

```typescript
mount(App, { mode: 'append', mouse: false })
```

### 2. Freeze Completed Content Only

Don't freeze content that might still update:

```typescript
getStaticHeight: () => {
  // Wait for streaming to complete
  if (isStreaming.value) return 0

  // Wait for tool executions to finish
  if (hasActiveTools()) return 0

  // Now safe to freeze
  return calculateStaticHeight()
}
```

### 3. Account for Layout Changes

If messages can change height (expand/collapse), recalculate:

```typescript
// When message expands
onExpand(messageId) {
  // Recalculate layouts
  updateMessageLayouts()

  // staticHeight will update via derived
}
```

### 4. Handle Edge Cases

```typescript
getStaticHeight: () => {
  // Don't freeze if very few messages
  if (messages.value.length < 3) return 0

  // Don't freeze the only message
  const height = calculateStaticHeight()
  return Math.max(0, height - minReactiveLines)
}
```

### 5. Consider Message Boundaries

Freeze at message boundaries, not arbitrary line counts:

```typescript
getStaticHeight: () => {
  // Find the last complete message boundary
  let height = 0
  const freezeCount = Math.max(0, messages.value.length - activeCount)

  for (let i = 0; i < freezeCount; i++) {
    height += messageLayouts[i].lineCount
  }

  return height
}
```

## Migration from Other Modes

### From Inline Mode

Trivial migration:

```diff
  const cleanup = await mount(() => {
    App()
  }, {
-   mode: 'inline',
+   mode: 'append',
    mouse: false
  })
```

Start with no region splitting (default), then add when ready:

```diff
  const cleanup = await mount(() => {
    App()
  }, {
    mode: 'append',
    mouse: false,
+   getStaticHeight: () => calculateStaticHeight()
  })
```

### From Fullscreen Mode

Larger change - app must handle unbounded content:

```typescript
// Before: Fullscreen (viewport-constrained)
mount(() => {
  box({
    height: '100%',  // Fills viewport
    overflow: 'scroll',
    children: () => Messages()
  })
}, { mode: 'fullscreen' })

// After: Append (unbounded)
mount(() => {
  // No height constraint needed
  box({
    children: () => Messages()
  })
}, { mode: 'append', mouse: false })
```

## Comparison with Other Modes

| Feature | Fullscreen | Inline | Append |
|---------|-----------|--------|--------|
| Render Cost | O(changes) | O(content) | O(active) |
| Terminal Scroll | No (viewport only) | Yes | Yes |
| Mouse Input | Yes | Yes | No (native scroll) |
| Max Content | Viewport size | Unlimited | Unlimited |
| History Persistence | Yes* | Yes | Yes |
| Ideal For | Dashboards, Editors | Short content | Chat, Logs, CLIs |

*Fullscreen uses alternate screen buffer, so history is preserved but not added to.

## Complete Example

```typescript
import { mount, box, text, each, signal, derived } from '@rlabs-inc/tui'
import type { Signal } from '@rlabs-inc/signals'

interface Message {
  id: string
  content: string
  complete: boolean
}

// State
const messages: Signal<Message[]> = signal([])
const isStreaming = signal(false)

// Track message heights for region splitting
const messageHeights = signal<Record<string, number>>({})

const staticHeight = derived(() => {
  if (isStreaming.value) return 0

  const msgs = messages.value
  const heights = messageHeights.value
  const activeCount = 3

  if (msgs.length <= activeCount) return 0

  let height = 0
  for (let i = 0; i < msgs.length - activeCount; i++) {
    const msg = msgs[i]
    if (msg.complete && heights[msg.id]) {
      height += heights[msg.id]
    } else {
      break  // Stop at first incomplete message
    }
  }

  return height
})

// Chat UI Component
function ChatUI() {
  return box({
    children: () => {
      each(
        () => messages.value,
        (getMessage, key) => {
          const msg = getMessage()
          return box({
            padding: 1,
            children: () => {
              text({ content: msg.content })
              if (!msg.complete) {
                text({ content: '...', fg: t.textDim })
              }
            }
          })
        },
        { key: msg => msg.id }
      )
    }
  })
}

// Mount
const { cleanup, renderToHistory } = await mount(() => {
  ChatUI()
}, {
  mode: 'append',
  mouse: false,
  getStaticHeight: () => staticHeight.value
})

// Cleanup on exit
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
```

## Future Enhancements

Potential improvements for append mode:

1. **Automatic height tracking**: Framework tracks component line counts
2. **Smooth scrolling**: Animate boundary movement
3. **Lazy unfreezing**: Expand frozen messages on demand
4. **Compression**: Summarize very old content
5. **Search integration**: Full-text search across regions

## Summary

Append mode enables:
- **Infinite content** with constant performance
- **Native terminal UX** (scroll, copy, search)
- **Rich interactivity** for active content
- **CLI-like feel** with TUI enhancements

It's the perfect rendering mode for chat interfaces, log viewers, and any application where content grows over time but only recent content needs interactivity.

## See Also

- [Render Modes Overview](./render-modes.md)
- [mount() API](../../api/mount.md)
- [Architecture](../../contributing/architecture.md)
