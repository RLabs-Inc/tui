# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests (uses bun test)
bun test                                    # All tests
bun test test/titan-engine.test.ts          # Single test file
bun test --watch                            # Watch mode

# Run examples
bun run dev                                 # Hello counter showcase
bun run examples/showcase/showcase.ts       # Full showcase

# Type checking
bun run typecheck                           # Root package

```

## Architecture

### Package Structure
- **Root (`@rlabs-inc/tui`)**: Core framework - primitives, state, layout engine
- **`@rlabs-inc/signals`**: Fine-grained reactivity (separate repo)

### Core Pipeline
```
User Signals → Slot Parallel Arrays → layoutDerived → frameBufferDerived → render effect
```

The framework uses **parallel arrays** (ECS-style) instead of component objects:
- Each ARRAY stores one property type: `width[]`, `height[]`, `color[]`
- Each INDEX represents one component

### Critical Rules
3. **One render effect**: Pipeline is all derived, only final render is an effect

### Key Files
| File | Purpose |
|------|---------|
| `src/pipeline/layout/titan-engine.ts` | TITAN flexbox layout engine |
| `src/primitives/box.ts`, `text.ts`, `input.ts` | UI primitives |
| `src/primitives/each.ts`, `show.ts`, `when.ts` | Template primitives (reactive control flow) |
| `src/engine/arrays/` | Parallel arrays (core, dimensions, spacing, layout, visual, text, interaction) |
| `src/state/keyboard.ts` | Keyboard handling with escape sequence parsing |
| `src/state/focus.ts` | Focus management and tab navigation |
| `src/state/context.ts` | Reactive context system (createContext/provide/useContext) |
| `src/engine/lifecycle.ts` | Component lifecycle hooks (onMount/onDestroy) |

### Keyboard API
```typescript
// Subscribe to specific key
keyboard.onKey('Enter', (event) => { ... })
keyboard.onKey('ArrowUp', handler)

// Subscribe to all keys
keyboard.on((event) => { ... })

// Focus-aware handlers (only fires when component has focus)
keyboard.onFocused(componentIndex, handler)
```

### Box Primitive (Focusable)

Boxes can be made focusable for keyboard interaction:

```typescript
box({
  focusable: true,
  onKey: (e) => {
    // Only fires when this box has focus
    if (e.key === 'Enter') handleAction()
    return true  // consume event
  },
  onFocus: () => console.log('Focused'),
  onBlur: () => console.log('Blurred'),
  children: () => text({ content: 'Press Enter' })
})
```

**Features:**
- `focusable: true` - Enables Tab navigation
- `onKey` - Keyboard handler (fires only when focused)
- `onFocus`/`onBlur` - Focus state callbacks
- Self-contained - no external keyboard handler registration needed

This makes custom focusable components fully self-contained.

### TITAN Layout Engine
Complete flexbox: direction, wrap, grow, shrink, basis, justify-content, align-items, align-self, gap, min/max constraints, percentage dimensions. Skips `visible=false` components (takes no space).

### Template Primitives

Reactive control flow primitives for dynamic UIs:

```typescript
// each() - Reactive lists (key is stable, use for selection!)
each(() => items.value, (getItem, key) => {
  text({ content: () => getItem().name, id: `item-${key}` })
}, { key: item => item.id })

// show() - Conditional rendering
show(() => isVisible.value,
  () => text({ content: 'Visible!' }),
  () => text({ content: 'Hidden!' })  // optional else
)

// when() - Async/Suspense
when(() => fetchData(), {
  pending: () => text({ content: 'Loading...' }),
  then: (data) => text({ content: data }),
  catch: (err) => text({ content: err.message })
})
```

**Pattern**: All template primitives capture parent context, render synchronously, then use an internal effect for reactive updates. Components inside use normal props (signals/getters work!).

### Input Primitive

Single-line text input with full reactivity and focus management:

```typescript
import { signal, input, mount, focusManager } from '@rlabs-inc/tui'

const username = signal('')
const password = signal('')

// Basic input with placeholder
input({
  value: username,
  placeholder: 'Enter username...',
  onSubmit: (val) => console.log('Submitted:', val),
  onChange: (val) => console.log('Changed:', val),
})

// Password input with custom mask
input({
  value: password,
  placeholder: 'Enter password...',
  password: true,
  maskChar: '●',  // default: '•'
})

// Styled input with variant and cursor config
input({
  value: username,
  variant: 'primary',  // Uses theme colors
  cursor: {
    style: 'bar',      // 'bar' | 'block' | 'underline'
    blink: true,
  },
  maxLength: 50,
  autoFocus: true,
})
```

**Features:**
- Two-way value binding via `WritableSignal` or `Binding`
- Password mode with configurable mask character
- Theme variants (`primary`, `success`, `error`, `warning`, `info`, etc.)
- Cursor configuration (style, blink)
- Max length constraint
- Full keyboard handling: arrows, home/end, backspace/delete, enter/escape
- Focus management integration (Tab/Shift+Tab navigation)
- Callbacks: `onChange`, `onSubmit`, `onCancel`, `onFocus`, `onBlur`

**Keyboard behavior when focused:**
- `ArrowLeft/Right` - Move cursor
- `Home/End` - Jump to start/end
- `Backspace/Delete` - Delete characters
- `Enter` - Triggers `onSubmit` callback
- `Escape` - Triggers `onCancel` callback

### Lifecycle Hooks

Clean up resources when components are destroyed:

```typescript
import { onMount, onDestroy } from '@rlabs-inc/tui'

function Timer() {
  const interval = setInterval(() => tick(), 1000)
  onDestroy(() => clearInterval(interval))  // Cleanup on destroy

  onMount(() => console.log('Timer started'))  // Run after mount

  return text({ content: 'Timer running...' })
}
```

- **onMount(fn)** - Runs after component is fully set up
- **onDestroy(fn)** - Runs when component is released (cleanup timers, subscriptions, etc.)
- Zero overhead when not used - only components that call these hooks pay the cost

### Context System

Pass data deep without prop drilling - automatically reactive via ReactiveMap:

```typescript
import { createContext, provide, useContext } from '@rlabs-inc/tui'

// Create context with default value
const ThemeContext = createContext<Theme>(defaultTheme)

// Provide value (can be called anywhere)
provide(ThemeContext, darkTheme)

// Use in component - AUTOMATICALLY REACTIVE
function ThemedBox() {
  const theme = useContext(ThemeContext)
  return box({ bg: theme.background })
}

// Update context - all consumers re-render automatically
provide(ThemeContext, lightTheme)
```

The magic: ReactiveMap gives automatic subscriptions. Read = subscribed. Write = notify readers.

### User Components with reactiveProps

For building reusable components, use `reactiveProps` to normalize any input type (static, getter, signal) to a consistent reactive interface:

```typescript
import { box, text, reactiveProps, derived } from '@rlabs-inc/tui'
import type { PropInput, Cleanup } from '@rlabs-inc/tui'

interface MyComponentProps {
  title: PropInput<string>
  count: PropInput<number>
}

function MyComponent(rawProps: MyComponentProps): Cleanup {
  // TypeScript infers the output type automatically - no generic needed!
  const props = reactiveProps(rawProps)

  // Everything is now a DerivedSignal - consistent .value access
  const display = derived(() => `${props.title.value}: ${props.count.value}`)

  return box({
    children: () => text({ content: display })
  })
}

// All of these work:
MyComponent({ title: 'Score', count: 42 })
MyComponent({ title: () => getTitle(), count: countSignal })
```

**Architecture layers**:
- **Primitives** (box, text): Use `slotArray` internally for parallel arrays
- **User components**: Use `reactiveProps` for ergonomic prop handling

## Current State (Jan 2026)

**Done**: TITAN v3 flexbox, box/text/input primitives, template primitives (each/show/when), all state modules (keyboard, mouse, focus, scroll, theme, cursor), lifecycle hooks (onMount/onDestroy), reactive context system

**Not Done**: textarea, select, progress, canvas primitives; modal/overlay component; grid layout; CLI scaffolding tool

**Deprecated**: .tui compiler moved to `.backup/` - focusing on bulletproof raw TypeScript API instead
