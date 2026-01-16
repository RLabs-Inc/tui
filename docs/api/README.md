# API Reference

> Complete reference for all TUI exports

## Quick Links

| Category | APIs |
|----------|------|
| [Mount](#mount) | `mount()` |
| [Primitives](#primitives) | `box`, `text`, `each`, `show`, `when` |
| [Lifecycle](#lifecycle) | `scoped`, `onCleanup`, `useAnimation` |
| [State](#state) | `keyboard`, `mouse`, `focusManager`, `scroll`, `cursor` |
| [Reactivity](#reactivity) | `signal`, `derived`, `effect`, `state`, `bind` |
| [Theme](#theme) | `t`, `theme`, `setTheme`, `themes` |
| [Types](#types) | `BoxProps`, `TextProps`, `Cleanup`, etc. |

## Mount

The entry point for TUI applications.

| Function | Description |
|----------|-------------|
| [`mount()`](./mount.md) | Mount a TUI application to the terminal |

```typescript
import { mount } from '@rlabs-inc/tui'

const cleanup = await mount(() => App(), { mode: 'fullscreen' })
```

## Primitives

Building blocks for terminal UIs.

| Primitive | Description |
|-----------|-------------|
| [`box`](./primitives/box.md) | Container with layout, styling, borders |
| [`text`](./primitives/text.md) | Text content with styling |
| [`each`](./primitives/each.md) | Reactive list rendering |
| [`show`](./primitives/show.md) | Conditional rendering |
| [`when`](./primitives/when.md) | Async/promise rendering |

```typescript
import { box, text, each, show, when } from '@rlabs-inc/tui'
```

## Lifecycle

Component lifecycle utilities.

| Function | Description |
|----------|-------------|
| [`scoped`](./primitives/lifecycle.md#scoped) | Create isolated component scope |
| [`onCleanup`](./primitives/lifecycle.md#oncleanup) | Register cleanup callback |
| [`useAnimation`](./primitives/lifecycle.md#useanimation) | Animation frame loop |

```typescript
import { scoped, onCleanup, useAnimation } from '@rlabs-inc/tui'
```

## State

Input handling and interaction.

| Module | Description |
|--------|-------------|
| [`keyboard`](./state/keyboard.md) | Keyboard events, key handlers |
| [`mouse`](./state/mouse.md) | Mouse events, hit testing |
| [`focusManager`](./state/focus.md) | Focus navigation, trapping |
| [`scroll`](./state/scroll.md) | Scroll state and handlers |
| [`cursor`](./state/cursor.md) | Cursor visibility, shape |

```typescript
import { keyboard, mouse, focusManager, scroll, cursor } from '@rlabs-inc/tui'
```

## Reactivity

Fine-grained reactivity primitives (re-exported from `@rlabs-inc/signals`).

| Function | Description |
|----------|-------------|
| [`signal`](./signals.md#signal) | Create writable signal |
| [`derived`](./signals.md#derived) | Create computed value |
| [`effect`](./signals.md#effect) | Create side effect |
| [`state`](./signals.md#state) | Create reactive object |
| [`bind`](./signals.md#bind) | Create binding |

```typescript
import { signal, derived, effect, state, bind } from '@rlabs-inc/tui'
```

## Theme

Theming and color system.

| Export | Description |
|--------|-------------|
| [`t`](./theme.md#t) | Theme color accessors |
| [`theme`](./theme.md#theme) | Raw theme state |
| [`setTheme`](./theme.md#settheme) | Apply theme preset |
| [`themes`](./theme.md#themes) | Built-in theme presets |

```typescript
import { t, theme, setTheme, themes } from '@rlabs-inc/tui'

box({ borderColor: t.primary, bg: t.surface })
setTheme('dracula')
```

## Types

TypeScript type definitions.

| Type | Description |
|------|-------------|
| [`BoxProps`](./types.md#boxprops) | Box component props |
| [`TextProps`](./types.md#textprops) | Text component props |
| [`Cleanup`](./types.md#cleanup) | Component cleanup function |
| [`Reactive<T>`](./types.md#reactive) | Reactive value type (static, signal, derived, or getter) |
| [`PropInput<T>`](./types.md#propinput) | Component prop input type |
| [`RGBA`](./types.md#rgba) | Color type |

```typescript
import type { BoxProps, TextProps, Cleanup, RGBA } from '@rlabs-inc/tui'
```

**Prop type rule**: All component props accept `Reactive<T>` - pass signals and deriveds directly, use `() =>` only for inline computations.

## Common Imports

### Minimal App

```typescript
import { mount, box, text } from '@rlabs-inc/tui'

await mount(() => {
  box({
    padding: 1,
    children: () => text({ content: 'Hello!' })
  })
})
```

### Interactive App

```typescript
import {
  mount, box, text, each, show,
  signal, derived,
  keyboard, focusManager,
  t, BorderStyle
} from '@rlabs-inc/tui'

// Reactive props example - pass signals/deriveds directly
const width = signal(40)
const bgColor = derived(() => isActive.value ? t.primary.value : null)

box({
  width,      // Signal directly
  bg: bgColor // Derived directly
})
```

### Full Import

```typescript
// Core
import { mount } from '@rlabs-inc/tui'

// Primitives
import { box, text, each, show, when } from '@rlabs-inc/tui'

// Lifecycle
import { scoped, onCleanup, useAnimation } from '@rlabs-inc/tui'

// State
import { keyboard, mouse, focusManager, scroll, cursor } from '@rlabs-inc/tui'

// Reactivity (re-exported from @rlabs-inc/signals)
import { signal, derived, effect, state, bind } from '@rlabs-inc/tui'

// Theme
import { t, theme, setTheme, themes, resolveColor } from '@rlabs-inc/tui'

// Constants
import { BorderStyle, Attr } from '@rlabs-inc/tui'

// Types
import type {
  BoxProps, TextProps, Cleanup,
  Reactive, PropInput,
  RGBA, Dimension,
  KeyboardEvent, MouseEvent
} from '@rlabs-inc/tui'
```

## Module Organization

```
@rlabs-inc/tui
├── mount()                    # Entry point
├── Primitives
│   ├── box()                  # Container
│   ├── text()                 # Text display
│   ├── each()                 # List iteration
│   ├── show()                 # Conditionals
│   └── when()                 # Async
├── Lifecycle
│   ├── scoped()               # Scoping
│   ├── onCleanup()            # Cleanup registration
│   └── useAnimation()         # Animation
├── State
│   ├── keyboard               # Keyboard input
│   ├── mouse                  # Mouse input
│   ├── focusManager           # Focus
│   ├── scroll                 # Scrolling
│   └── cursor                 # Cursor control
├── Reactivity (from @rlabs-inc/signals)
│   ├── signal()               # Writable state
│   ├── derived()              # Computed
│   ├── effect()               # Side effects
│   ├── state()                # Reactive objects
│   └── bind()                 # Bindings
├── Theme
│   ├── t                      # Color accessors
│   ├── theme                  # Theme state
│   ├── setTheme()             # Theme switching
│   └── themes                 # Presets
├── Constants
│   ├── BorderStyle            # Border styles
│   └── Attr                   # Text attributes
└── Types
    ├── BoxProps               # Box props
    ├── TextProps              # Text props
    └── ...                    # Other types
```

## See Also

- [Quick Start](../getting-started/quick-start.md) - Get started quickly
- [Concepts](../getting-started/concepts.md) - Core framework concepts
- [User Guides](../guides/README.md) - In-depth guides
