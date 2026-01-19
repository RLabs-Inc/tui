# TUI

A reactive terminal UI framework for TypeScript and Bun.

## Install

```bash
bun add @rlabs-inc/tui
```

## Quick Example

```typescript
import { signal, box, text, mount, keyboard } from '@rlabs-inc/tui'

const count = signal(0)

const cleanup = await mount(() => {
  box({
    padding: 1,
    children: () => {
      text({ content: () => `Count: ${count.value}` })
      text({ content: 'Press + to increment, q to quit' })
    }
  })
})

keyboard.onKey('+', () => { count.value++ })
keyboard.onKey('q', () => cleanup())
```

Run with `bun run your-file.ts`.

## Core Concepts

- **Signals** - Reactive state: `signal(0)` creates a value that triggers updates when changed
- **Primitives** - UI building blocks: `box`, `text`, `input`
- **Reactivity** - Use `() =>` functions for dynamic values that update automatically
- **Keyboard** - `keyboard.onKey('Enter', handler)` for input handling

## Next Steps

- [Quick Start Guide](./getting-started/quickstart.md) - Build your first app step by step
