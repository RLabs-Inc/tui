# Append Mode - Two-Region Rendering

Append mode implements a hybrid static/reactive rendering strategy optimized for chat-like interfaces and rich CLIs.

## Overview

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
  mouse: false // Disable mouse for native terminal scroll
})
```

By default, append mode keeps **all content reactive** (staticHeight = 0). This gives you inline-mode behavior but positions you for region splitting.

### With Region Splitting

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
    return messagesToFreeze * 10 // Assuming ~10 lines per message
  }
})
```

## Advanced: Layout-Based Splitting

For precise control, track line counts per message and calculate staticHeight based on layout:

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

Then use it:

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

## Implementation Details

### AppendRegionRenderer

The `AppendRegionRenderer` class handles two-region rendering:

```typescript
export class AppendRegionRenderer {
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

### Bun FileSink for Static Region

The static region uses Bun's `FileSink` API for efficient buffered writes:

```typescript
const stdoutFile = Bun.file(1) // stdout is file descriptor 1
const writer = stdoutFile.writer({ highWaterMark: 1024 * 1024 })

writer.write("Content that becomes terminal history\n")
writer.flush()
```

### Boundary Management

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

## Migration from Inline Mode

Migrating from inline to append mode is trivial:

```diff
  const cleanup = await mount(() => {
    App()
  }, {
-   mode: 'inline',
+   mode: 'append',
    mouse: false
  })
```

Start with no region splitting (default staticHeight = 0), then add splitting when ready:

```diff
  const cleanup = await mount(() => {
    App()
  }, {
    mode: 'append',
    mouse: false,
+   getStaticHeight: () => calculateStaticHeight()
  })
```

## Comparison with Other Modes

| Feature | Fullscreen | Inline | Append |
|---------|-----------|--------|--------|
| Render Cost | O(changes) | O(content) | O(active) |
| Terminal Scroll | ✗ (viewport only) | ✓ | ✓ |
| Mouse Input | ✓ | ✓ | ✗ (native scroll) |
| Max Content | Viewport size | Unlimited | Unlimited |
| History Persistence | ✗ | ✗ | ✓ |
| Ideal For | Dashboards, Editors | Short content | Chat, Logs, CLIs |

## Examples

See the `claude-tui` project for a complete implementation:

- `/claude-tui/src/state/append-mode.ts` - Region tracking
- `/claude-tui/index.ts` - Mount configuration
- `/tui/src/renderer/append-region.ts` - Implementation

## Future Enhancements

Potential improvements for append mode:

1. **Automatic height tracking**: Framework tracks message line counts
2. **Smooth scrolling**: Animate boundary movement
3. **Lazy unfreezing**: Expand frozen messages on demand
4. **Compression**: Summarize very old content
5. **Search integration**: Full-text search across regions

## Summary

Append mode enables:
- ✅ **Infinite content** with constant performance
- ✅ **Native terminal UX** (scroll, copy, search)
- ✅ **Rich interactivity** for active content
- ✅ **CLI-like feel** with TUI enhancements

It's the perfect rendering mode for chat interfaces, log viewers, and any application where content grows over time but only recent content needs interactivity.
