# TUI Documentation

> A reactive terminal UI framework for building beautiful command-line interfaces

Welcome to the TUI documentation. Whether you're building your first terminal app or diving deep into the architecture, you'll find everything you need here.

## Quick Links

- [Quick Start](./getting-started/quick-start.md) - Build your first TUI app in 5 minutes
- [API Reference](./api/README.md) - Complete API documentation
- [Examples](./examples/README.md) - Learn by example

---

## Getting Started

New to TUI? Start here.

| Guide | Description |
|-------|-------------|
| [Installation](./getting-started/installation.md) | Requirements and setup |
| [Quick Start](./getting-started/quick-start.md) | Hello world in 5 minutes |
| [Core Concepts](./getting-started/concepts.md) | Understand reactivity, primitives, and the pipeline |
| [First App](./getting-started/first-app.md) | Build a complete counter application |

---

## Guides

In-depth guides for every aspect of the framework.

### Primitives

| Guide | Description |
|-------|-------------|
| [Box](./guides/primitives/box.md) | Container component with flexbox layout |
| [Text](./guides/primitives/text.md) | Text display with formatting |
| [Template Primitives](./guides/primitives/template-primitives.md) | Dynamic rendering with `each`, `show`, `when` |

### State Management

| Guide | Description |
|-------|-------------|
| [Keyboard](./guides/state/keyboard.md) | Handle keyboard input and shortcuts |
| [Mouse](./guides/state/mouse.md) | Click, hover, and scroll events |
| [Focus](./guides/state/focus.md) | Tab navigation and focus management |
| [Scroll](./guides/state/scroll.md) | Scrollable content areas |

### Layout

| Guide | Description |
|-------|-------------|
| [Flexbox](./guides/layout/flexbox.md) | Complete flexbox layout system |
| [Dimensions](./guides/layout/dimensions.md) | Width, height, percentages, auto-sizing |
| [Spacing](./guides/layout/spacing.md) | Padding, margin, and gap |

### Styling

| Guide | Description |
|-------|-------------|
| [Colors](./guides/styling/colors.md) | RGBA, ANSI, and OKLCH color systems |
| [Themes](./guides/styling/themes.md) | Built-in themes and customization |
| [Borders](./guides/styling/borders.md) | Border styles and configuration |

### Reactivity

| Guide | Description |
|-------|-------------|
| [Signals](./guides/reactivity/signals.md) | Reactive state with signals |
| [Bind Pattern](./guides/reactivity/bind-pattern.md) | Fine-grained reactivity with `bind()` |
| [Reactive Props](./guides/reactivity/reactive-props.md) | Build reactive custom components |

### Patterns

| Guide | Description |
|-------|-------------|
| [Component Patterns](./guides/patterns/component-patterns.md) | Build reusable components |
| [Lists & Selection](./guides/patterns/lists-and-selection.md) | Interactive lists with `each()` |
| [Modals & Overlays](./guides/patterns/modals-overlays.md) | Modal dialogs and focus trapping |

### Rendering

| Guide | Description |
|-------|-------------|
| [Render Modes](./guides/rendering/render-modes.md) | Fullscreen, inline, and append modes |
| [Append Mode](./guides/rendering/append-mode.md) | Chat-style interfaces with history |

---

## API Reference

Complete reference documentation for every export.

| Section | Description |
|---------|-------------|
| [mount()](./api/mount.md) | Application entry point |
| [Primitives](./api/primitives/) | `box`, `text`, `each`, `show`, `when`, lifecycle |
| [State](./api/state/) | `keyboard`, `mouse`, `focus`, `scroll`, `cursor` |
| [Signals](./api/signals.md) | `signal`, `state`, `derived`, `effect`, `bind`, `batch` |
| [Theme](./api/theme.md) | Theme system and variants |
| [Types](./api/types.md) | TypeScript type definitions |

---

## Contributing

Want to contribute or understand the internals?

| Guide | Description |
|-------|-------------|
| [Contributing](./contributing/README.md) | How to contribute |
| [Architecture](./contributing/architecture.md) | System architecture overview |
| [Development](./contributing/development.md) | Development setup and workflow |
| [Internals](./contributing/internals/) | Deep-dive into implementation |

---

## Examples

Learn by example with real, runnable code.

| Example | Description |
|---------|-------------|
| [Hello Counter](../examples/showcase/01-hello-counter.ts) | Basic reactivity and input handling |
| [Live Clock](../examples/showcase/02-live-clock.ts) | Real-time updates |
| [Todo List](../examples/showcase/03-todo-list.ts) | Lists with `each()` and selection |
| [Dashboard](../examples/showcase/05-system-dashboard.ts) | Multi-panel layouts |
| [All Examples](./examples/README.md) | Complete examples index |

---

## Version

Current: **v0.2.4** | [Changelog](./contributing/changelog.md)

## License

MIT License - see [LICENSE](../LICENSE) for details.
