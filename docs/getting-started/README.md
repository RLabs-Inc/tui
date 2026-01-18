# Getting Started

Welcome to TUI! This guide will take you from zero to building reactive terminal applications.

## What You'll Learn

1. **[Installation](./installation.md)** - Set up your development environment
2. **[Quick Start](./quick-start.md)** - Build your first TUI app in 5 minutes
3. **[Core Concepts](./concepts.md)** - Understand the fundamentals
4. **[First App](./first-app.md)** - Build a complete interactive counter

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- Basic TypeScript knowledge
- A terminal that supports ANSI escape codes (most modern terminals)

## Why TUI?

TUI brings modern reactive programming to the terminal:

- **Fine-grained reactivity** - Only what changes re-renders
- **Complete flexbox** - Real CSS-style layout in the terminal
- **Type-safe** - Full TypeScript support with excellent inference
- **Fast** - Sub-millisecond render times, 60fps capable
- **Simple** - Just functions, no classes or decorators

```typescript
import { signal, derived, box, text, mount, keyboard } from '@rlabs-inc/tui'

const count = signal(0)
const label = derived(() => `Count: ${count.value}`)

await mount(() => {
  box({
    padding: 1,
    children: () => {
      // Pass deriveds directly - clean and reactive!
      text({ content: label })
    }
  })
})

keyboard.onKey('Enter', () => count.value++)
```

## Next Steps

Start with [Installation](./installation.md) to set up your environment, or jump straight to [Quick Start](./quick-start.md) if you already have Bun installed.
