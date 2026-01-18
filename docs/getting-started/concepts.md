# Core Concepts

Understanding these concepts will help you build effective TUI applications.

## The Reactive Model

TUI is built on **fine-grained reactivity**. Instead of re-rendering entire component trees, only the exact values that changed update.

### Signals

Signals are reactive containers for values:

```typescript
import { signal } from '@rlabs-inc/tui'

const count = signal(0)

// Read the current value
console.log(count.value)  // 0

// Update the value - triggers reactive updates
count.value = 5
```

### Derived Values

Derived signals compute values from other signals:

```typescript
import { signal, derived } from '@rlabs-inc/tui'

const count = signal(0)
const doubled = derived(() => count.value * 2)

console.log(doubled.value)  // 0

count.value = 5
console.log(doubled.value)  // 10 (automatically updated!)
```

### Reactive Props

Components accept static values, signals, deriveds, or inline getters:

```typescript
const count = signal(0)
const formatted = derived(() => `Count: ${count.value}`)

// Static value - for unchanging content
text({ content: 'Hello' })

// Signal directly - clean and simple
text({ content: count })           // displays: 0
box({ width: widthSignal })        // works for any prop

// Derived directly - for pre-computed values
text({ content: formatted })       // displays: "Count: 0"

// Inline getter - for one-off computations
text({ content: () => count.value * 2 })
text({ content: () => `Value: ${count.value}` })
```

**The rule**: Pass signals and deriveds directly. Use `() =>` only for inline computations that don't warrant a named derived.

TUI automatically tracks dependencies regardless of which pattern you use.

## The Rendering Pipeline

TUI uses a unidirectional data flow:

```
Signals → Components → Layout → Frame Buffer → Terminal
         (box/text)   (TITAN)   (cells)       (ANSI)
```

1. **Signals** hold your application state
2. **Components** (`box`, `text`) read signals and define structure
3. **Layout engine** (TITAN) computes positions using flexbox
4. **Frame buffer** converts to a 2D grid of terminal cells
5. **Renderer** outputs ANSI escape codes to the terminal

Only **one render effect** runs per frame. All computation is derived/pure until the final output.

## Primitives

TUI provides two core primitives:

### Box

Container with flexbox layout:

```typescript
box({
  // Dimensions
  width: 40,
  height: 10,

  // Layout
  flexDirection: 'row',     // 'row' | 'column'
  justifyContent: 'center', // 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems: 'center',     // 'flex-start' | 'center' | 'flex-end' | 'stretch'
  gap: 1,

  // Spacing
  padding: 1,
  margin: 1,

  // Style
  border: BorderStyle.ROUNDED,
  borderColor: t.primary,
  bg: t.surface,

  // Children
  children: () => {
    // Nested components
  }
})
```

### Text

Text display with formatting:

```typescript
text({
  content: 'Hello',        // String, signal, or getter
  fg: t.text,              // Foreground color
  bg: t.surface,           // Background color
  align: 'center',         // 'left' | 'center' | 'right'
  wrap: 'wrap',            // 'wrap' | 'nowrap' | 'truncate'
  attrs: Attr.BOLD,        // Text attributes (bold, italic, etc.)
})
```

## Template Primitives

For dynamic UIs, TUI provides control flow primitives:

### each() - Lists

```typescript
import { each } from '@rlabs-inc/tui'

const items = signal(['Apple', 'Banana', 'Cherry'])

each(
  () => items.value,           // Data source
  (getItem, key) => {          // Render function
    text({ content: getItem }) // getItem() returns current value
  },
  { key: item => item }        // Key function for identity
)
```

### show() - Conditionals

```typescript
import { show } from '@rlabs-inc/tui'

const isVisible = signal(true)

show(
  () => isVisible.value,       // Condition
  () => text({ content: 'Visible!' }),   // True branch
  () => text({ content: 'Hidden' })      // False branch (optional)
)
```

### when() - Async

```typescript
import { when } from '@rlabs-inc/tui'

when(
  () => fetchData(),           // Promise
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => text({ content: data }),
    catch: (err) => text({ content: err.message })
  }
)
```

## State Modules

TUI provides state management for user interaction:

### Keyboard

```typescript
import { keyboard } from '@rlabs-inc/tui'

// Single key
keyboard.onKey('Enter', () => submit())

// Multiple keys
keyboard.onKey(['q', 'Q', 'Escape'], () => quit())

// With modifiers
keyboard.onKey('s', (event) => {
  if (event.modifiers.ctrl) save()
})
```

### Focus

```typescript
import { focusManager } from '@rlabs-inc/tui'

// Make component focusable
box({ focusable: true, tabIndex: 1 })

// Navigate focus
keyboard.onKey('Tab', () => focusManager.focusNext())
keyboard.onKey('Tab', (e) => {
  if (e.modifiers.shift) focusManager.focusPrevious()
  else focusManager.focusNext()
})
```

### Mouse

```typescript
import { mouse } from '@rlabs-inc/tui'

mouse.onClick((event) => {
  console.log(`Clicked at ${event.x}, ${event.y}`)
})
```

## The Children Pattern

Components use a **children function** for nesting:

```typescript
box({
  children: () => {
    // This function runs synchronously during mount
    // All components here become children of the box
    text({ content: 'Child 1' })
    text({ content: 'Child 2' })

    // Nesting works naturally
    box({
      children: () => {
        text({ content: 'Nested child' })
      }
    })
  }
})
```

The children function is called once during mount. Reactivity comes from signals, not re-running children.

## Cleanup

All components return a cleanup function:

```typescript
const cleanup = mount(() => {
  box({ /* ... */ })
})

// Later, to unmount:
cleanup()
```

For conditional rendering, cleanup happens automatically:

```typescript
show(
  () => isVisible.value,
  () => {
    // This component is cleaned up when isVisible becomes false
    box({ /* ... */ })
  }
)
```

## Next Steps

- [First App](./first-app.md) - Apply these concepts
- [Signals Guide](../guides/reactivity/signals.md) - Deep dive into reactivity
- [API Reference](../api/README.md) - Complete API documentation
