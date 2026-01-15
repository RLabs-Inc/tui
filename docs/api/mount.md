# mount()

> Entry point for TUI applications

## Import

```typescript
import { mount } from '@rlabs-inc/tui'
```

## Signature

```typescript
function mount(
  root: () => void,
  options?: MountOptions
): Promise<(() => Promise<void>) | AppendMountResult>
```

## Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `root` | `() => void` | required | Function that creates the component tree |
| `options` | `MountOptions` | `{}` | Mount configuration |

### MountOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'fullscreen' \| 'inline' \| 'append'` | `'fullscreen'` | Rendering mode |
| `mouse` | `boolean` | `true` | Enable mouse tracking |
| `kittyKeyboard` | `boolean` | `true` | Use Kitty keyboard protocol |

## Returns

### Fullscreen/Inline Mode

```typescript
cleanup: () => Promise<void>
```

Call to unmount the application and restore terminal state.

### Append Mode

```typescript
interface AppendMountResult {
  cleanup: () => Promise<void>
  renderToHistory: (componentFn: () => void) => void
}
```

| Property | Description |
|----------|-------------|
| `cleanup` | Unmount function |
| `renderToHistory` | Write component to static history region |

## Examples

### Basic Usage

```typescript
import { mount, box, text } from '@rlabs-inc/tui'

const cleanup = await mount(() => {
  box({
    width: 40,
    height: 10,
    border: BorderStyle.ROUNDED,
    children: () => {
      text({ content: 'Hello, TUI!' })
    }
  })
})

// Later: cleanup
process.on('SIGINT', async () => {
  await cleanup()
  process.exit(0)
})
```

### Fullscreen Mode (Default)

```typescript
const cleanup = await mount(() => {
  Dashboard()
}, {
  mode: 'fullscreen'  // Takes over terminal
})
```

### Inline Mode

```typescript
const cleanup = await mount(() => {
  SelectPrompt()
}, {
  mode: 'inline',  // Renders inline with terminal output
  mouse: true
})
```

### Append Mode

```typescript
const { cleanup, renderToHistory } = await mount(() => {
  ChatInterface()
}, {
  mode: 'append',
  mouse: false  // Enable native terminal scroll
})

// Write completed messages to history
function onMessageComplete(msg) {
  renderToHistory(() => {
    MessageComponent({ message: msg })
  })
}
```

### With Region Splitting

```typescript
const cleanup = await mount(() => {
  App()
}, {
  mode: 'append',
  mouse: false,
  getStaticHeight: () => {
    // Calculate lines to freeze in history
    return calculateStaticHeight()
  }
})
```

### Disabling Features

```typescript
// Minimal setup - no mouse, legacy keyboard
const cleanup = await mount(() => App(), {
  mouse: false,
  kittyKeyboard: false
})
```

## Behavior

### Terminal Setup

On mount, TUI:
1. Enters raw mode (if not already)
2. Hides cursor
3. Enables Kitty keyboard protocol (if `kittyKeyboard: true`)
4. Enables bracketed paste
5. Enables focus reporting
6. Enables mouse tracking (if `mouse: true`)
7. For fullscreen: enters alternate screen buffer

### Render Loop

The mount function creates a reactive render effect that:
1. Computes layout via TITAN engine
2. Generates frame buffer
3. Updates HitGrid for mouse hit testing
4. Renders to terminal via appropriate renderer

### Terminal Cleanup

On cleanup, TUI:
1. Stops render effect
2. Disables mouse tracking
3. Disables bracketed paste
4. Disables focus reporting
5. Disables Kitty keyboard (if enabled)
6. Shows cursor
7. For fullscreen: exits alternate screen
8. Exits raw mode

## Mode Comparison

| Mode | Alternate Screen | Native Scroll | Mouse Support | Performance |
|------|-----------------|---------------|---------------|-------------|
| `fullscreen` | Yes | No | Yes | O(changes) |
| `inline` | No | Yes | Yes | O(content) |
| `append` | No | Yes | No | O(active) |

## Error Handling

Mount handles uncaught exceptions and unhandled rejections:

```typescript
process.on('uncaughtException', (err) => {
  console.error('[TUI] Uncaught exception:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('[TUI] Unhandled rejection:', err)
})
```

## Resize Handling

TUI automatically handles terminal resize:

```typescript
// Internal resize handler
process.stdout.on('resize', () => {
  updateTerminalSize()
  // Triggers re-render via reactive system
})
```

## See Also

- [Render Modes Guide](../guides/rendering/render-modes.md)
- [Append Mode Guide](../guides/rendering/append-mode.md)
- [Quick Start](../getting-started/quick-start.md)
