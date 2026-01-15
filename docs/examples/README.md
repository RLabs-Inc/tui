# Examples

> Learn by example with 100+ working demos

## Overview

The `examples/` directory contains working examples demonstrating TUI features. All examples can be run directly with Bun.

```bash
bun run examples/showcase/01-hello-counter.ts
```

## Showcase Examples

Complete, polished applications demonstrating real-world usage patterns.

### Beginner

| Example | Description | Concepts |
|---------|-------------|----------|
| [01-hello-counter](../../examples/showcase/01-hello-counter.ts) | Interactive counter with keyboard controls | Signals, keyboard, basic layout |
| [02-live-clock](../../examples/showcase/02-live-clock.ts) | Real-time clock with styling | Effects, intervals, text styling |
| [03-theme-gallery](../../examples/showcase/03-theme-gallery.ts) | Browse all 14 theme variants | Theme system, colors |

### Intermediate

| Example | Description | Concepts |
|---------|-------------|----------|
| [04-dashboard](../../examples/showcase/04-dashboard.ts) | Multi-panel dashboard layout | Flexbox, nested containers |
| [05-scrollable-list](../../examples/showcase/05-scrollable-list.ts) | Scrollable list with selection | Scroll, focus, each() |
| [06-system-monitor](../../examples/showcase/06-system-monitor.ts) | Live system stats display | Derived values, updates |
| [07-nested-layouts](../../examples/showcase/07-nested-layouts.ts) | Complex nested flexbox | Advanced layout |

### Advanced

| Example | Description | Concepts |
|---------|-------------|----------|
| [08-todo-app](../../examples/showcase/08-todo-app.ts) | Full todo application | State management, CRUD |
| [09-split-panes](../../examples/showcase/09-split-panes.ts) | Resizable split panes | Mouse drag, dynamic sizing |
| [10-color-picker](../../examples/showcase/10-color-picker.ts) | Interactive color picker | OKLCH colors, mouse |
| [11-snake-game](../../examples/showcase/11-snake-game.ts) | Classic snake game | Game loop, keyboard |
| [12-markdown-viewer](../../examples/showcase/12-markdown-viewer.ts) | Markdown renderer | Text parsing, styling |
| [13-logs-viewer](../../examples/showcase/13-logs-viewer.ts) | Log file viewer | Append mode, streaming |
| [14-keybindings-help](../../examples/showcase/14-keybindings-help.ts) | Keybindings reference panel | Keyboard mapping |

### Template Primitives

| Example | Description | Concepts |
|---------|-------------|----------|
| [template-primitives-demo](../../examples/showcase/template-primitives-demo.ts) | each(), show(), when() demos | Reactive control flow |

## Test Examples

Focused examples testing specific features. Great for understanding individual APIs.

### Layout & Flexbox

| Example | Description |
|---------|-------------|
| [01-box-basics](../../examples/tests/01-box-basics.ts) | Box sizing and positioning |
| [03-layout-flex](../../examples/tests/03-layout-flex.ts) | Flexbox direction and alignment |
| [05-flex-complete](../../examples/tests/05-flex-complete.ts) | Complete flexbox features |
| [10-percentage-dimensions](../../examples/tests/10-percentage-dimensions.ts) | Percentage-based sizing |
| [11-layout-features](../../examples/tests/11-layout-features.ts) | Advanced layout features |

### Styling

| Example | Description |
|---------|-------------|
| [02-text-basics](../../examples/tests/02-text-basics.ts) | Text content and styling |
| [04-borders-complete](../../examples/tests/04-borders-complete.ts) | Border styles and colors |
| [06-colors-themes](../../examples/tests/06-colors-themes.ts) | Color system and themes |
| [07-spacing](../../examples/tests/07-spacing.ts) | Padding, margin, gap |
| [09-text-variants](../../examples/tests/09-text-variants.ts) | Text attributes and variants |

### Reactivity

| Example | Description |
|---------|-------------|
| [08-reactivity](../../examples/tests/08-reactivity.ts) | Signal and derived basics |
| [each-test](../../examples/tests/each-test.ts) | each() list rendering |
| [show-test](../../examples/tests/show-test.ts) | show() conditional rendering |

## Running Examples

### Single Example

```bash
bun run examples/showcase/01-hello-counter.ts
```

### With Watch Mode

```bash
bun --watch run examples/showcase/01-hello-counter.ts
```

### All Tests

```bash
# Run test suite (not examples)
bun test
```

## Creating Your Own

Use the examples as templates for your own applications:

```typescript
import { mount, box, text, keyboard } from '@rlabs-inc/tui'
import { signal } from '@rlabs-inc/signals'

// Your app here
box({
  width: '100%',
  height: '100%',
  children: () => {
    text({ content: 'Hello, TUI!' })
  }
})

// Exit on 'q'
keyboard.onKey('q', () => process.exit(0))

// Mount and run
mount()
```

## Example Patterns

### Counter Pattern

```typescript
const count = signal(0)

box({
  children: () => {
    text({ content: () => `Count: ${count.value}` })
  }
})

keyboard.onKey('ArrowUp', () => count.value++)
keyboard.onKey('ArrowDown', () => count.value--)
```

### List Pattern

```typescript
const items = signal(['Apple', 'Banana', 'Cherry'])
const selected = signal(0)

box({
  children: () => {
    each(
      () => items.value,
      (item, index) => {
        text({
          content: () => `${index === selected.value ? '>' : ' '} ${item}`,
          fg: () => index === selected.value ? 'cyan' : undefined
        })
      }
    )
  }
})

keyboard.onKey('ArrowDown', () => {
  selected.value = Math.min(selected.value + 1, items.value.length - 1)
})
```

### Modal Pattern

```typescript
const showModal = signal(false)

box({
  children: () => {
    // Main content
    text({ content: 'Press M for modal' })

    // Modal overlay
    show(
      () => showModal.value,
      () => box({
        zIndex: 100,
        bg: 'black',
        children: () => {
          text({ content: 'Modal Content' })
          text({ content: 'Press Escape to close' })
        }
      })
    )
  }
})

keyboard.onKey('m', () => showModal.value = true)
keyboard.onKey('Escape', () => showModal.value = false)
```

## See Also

- [Quick Start](../getting-started/quick-start.md)
- [Component Patterns](../guides/patterns/component-patterns.md)
- [API Reference](../api/README.md)
