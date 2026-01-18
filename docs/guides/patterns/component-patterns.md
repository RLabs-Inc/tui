# Component Patterns Guide

> Build reusable components

## Overview

TUI components are just functions that compose primitives. There's no special component system - just TypeScript functions returning cleanup functions.

## Basic Component

```typescript
import { box, text, type Cleanup } from '@rlabs-inc/tui'

function HelloWorld(): Cleanup {
  return box({
    padding: 1,
    children: () => {
      text({ content: 'Hello, World!' })
    }
  })
}

// Usage
HelloWorld()
```

## Components with Props

Use `reactiveProps` to normalize any input (static values, getters, signals) to a consistent reactive interface. TypeScript infers the output type automatically - no generic needed!

```typescript
import { box, text, type Cleanup, type PropInput, reactiveProps } from '@rlabs-inc/tui'

interface GreetingProps {
  name: PropInput<string>
}

function Greeting(rawProps: GreetingProps): Cleanup {
  // TypeScript infers: { name: DerivedSignal<string> }
  // No generic required - just pass your props object!
  const props = reactiveProps(rawProps)

  return box({
    padding: 1,
    children: () => {
      text({
        content: () => `Hello, ${props.name.value}!`
      })
    }
  })
}

// Usage
Greeting({ name: 'Alice' })
Greeting({ name: nameSignal })
Greeting({ name: () => user.value.name })
```

## Component with Children

```typescript
import { box, text, reactiveProps, BorderStyle, Attr, t, type Cleanup, type PropInput } from '@rlabs-inc/tui'

interface CardProps {
  title: PropInput<string>
  children: () => void
}

function Card(rawProps: CardProps): Cleanup {
  const props = reactiveProps({ title: rawProps.title })

  return box({
    border: BorderStyle.ROUNDED,
    borderColor: t.border,
    padding: 1,
    gap: 1,
    children: () => {
      text({
        content: props.title,
        fg: t.primary,
        attrs: Attr.BOLD
      })
      rawProps.children()  // Render user's children
    }
  })
}

// Usage
Card({
  title: 'My Card',
  children: () => {
    text({ content: 'Card content here' })
    text({ content: 'More content' })
  }
})
```

## Component with Events

Use `onFocus`, `onBlur`, and `onKey` props for self-contained event handling:

```typescript
import { signal, derived, box, text, reactiveProps, BorderStyle, t, type Cleanup, type PropInput } from '@rlabs-inc/tui'

interface ButtonProps {
  label: PropInput<string>
  onPress?: () => void
}

function Button(rawProps: ButtonProps): Cleanup {
  const props = reactiveProps({ label: rawProps.label })
  const isFocused = signal(false)

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.ROUNDED,
    paddingLeft: 2,
    paddingRight: 2,
    bg: derived(() => isFocused.value ? t.surface.value : null),
    borderColor: derived(() => isFocused.value ? t.primary.value : t.border.value),
    onFocus: () => { isFocused.value = true },
    onBlur: () => { isFocused.value = false },
    onKey: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        rawProps.onPress?.()
        return true  // Event consumed - stops propagation
      }
      // Return nothing (undefined) to let event bubble up
    },
    children: () => {
      text({ content: props.label })
    }
  })
}

// Usage
Button({
  label: 'Click Me',
  onPress: () => console.log('Pressed!')
})
```

## Component with Internal State

```typescript
import { signal, box, text, reactiveProps, BorderStyle, t, type Cleanup, type PropInput } from '@rlabs-inc/tui'

interface CounterProps {
  initial?: PropInput<number>
}

function Counter(rawProps: CounterProps): Cleanup {
  const props = reactiveProps({
    initial: rawProps.initial ?? 0
  })

  // Internal state
  const count = signal(props.initial.value)

  // Self-contained component with keyboard handling via onKey prop
  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.SINGLE,
    padding: 1,
    onKey: (event) => {
      if (event.key === 'ArrowUp') {
        count.value++
        return true  // Event consumed - stops propagation
      }
      if (event.key === 'ArrowDown') {
        count.value--
        return true  // Event consumed
      }
      // Unhandled keys bubble up (return undefined)
    },
    children: () => {
      text({ content: () => `Count: ${count.value}` })
      text({ content: '[Up/Down to change]', fg: t.textDim })
    }
  })
}
```

**Key points about `onKey`:**
- Handler only fires when the component has focus (unlike global `keyboard.on()`)
- Return `true` to mark event as consumed (stops propagation)
- Return nothing (`undefined`) to let event bubble to other handlers
- Cleanup is automatic when the component is destroyed

## Composition Pattern

Build complex components from simpler ones:

```typescript
import { box, text, t, type Cleanup, type PropInput } from '@rlabs-inc/tui'

// Simple building blocks
function Label({ text: labelText }: { text: PropInput<string> }): Cleanup {
  return text({
    content: labelText,
    fg: t.textDim
  })
}

function Value({ text: valueText }: { text: PropInput<string> }): Cleanup {
  return text({ content: valueText })
}

// Composed component
interface LabeledValueProps {
  label: PropInput<string>
  value: PropInput<string>
}

function LabeledValue(props: LabeledValueProps): Cleanup {
  return box({
    flexDirection: 'row',
    gap: 1,
    children: () => {
      Label({ text: props.label })
      Value({ text: props.value })
    }
  })
}

// Usage
LabeledValue({ label: 'Name:', value: user.name })
```

## Factory Pattern

Create component factories for variations:

```typescript
import { box, text, reactiveProps, BorderStyle, t, type Cleanup, type PropInput } from '@rlabs-inc/tui'

function createButton(variant: 'primary' | 'secondary' | 'danger') {
  const variantStyles = {
    primary: { bg: t.primary, fg: t.background },
    secondary: { bg: t.surface, fg: t.text },
    danger: { bg: t.error, fg: t.background }
  }

  return function Button(props: { label: PropInput<string>, onPress?: () => void }): Cleanup {
    const normalized = reactiveProps({ label: props.label })
    const style = variantStyles[variant]

    return box({
      border: BorderStyle.ROUNDED,
      bg: style.bg,
      paddingLeft: 2,
      paddingRight: 2,
      children: () => {
        text({ content: normalized.label, fg: style.fg })
      }
    })
  }
}

const PrimaryButton = createButton('primary')
const SecondaryButton = createButton('secondary')
const DangerButton = createButton('danger')

// Usage
PrimaryButton({ label: 'Submit' })
DangerButton({ label: 'Delete', onPress: handleDelete })
```

## Higher-Order Component Pattern

Wrap components with additional behavior:

```typescript
import { box, BorderStyle, t, type Cleanup } from '@rlabs-inc/tui'

function withBorder<P extends object>(
  Component: (props: P) => Cleanup,
  borderStyle: number = BorderStyle.SINGLE
) {
  return function WrappedComponent(props: P): Cleanup {
    return box({
      border: borderStyle,
      borderColor: t.border,
      children: () => {
        Component(props)
      }
    })
  }
}

// Usage
const BorderedGreeting = withBorder(Greeting)
BorderedGreeting({ name: 'Alice' })
```

## Cleanup Best Practices

The `onKey`, `onFocus`, and `onBlur` props on box handle cleanup automatically - no manual unsubscribe needed:

```typescript
import { signal, box, text, type Cleanup } from '@rlabs-inc/tui'

function MyComponent(): Cleanup {
  const count = signal(0)

  // onKey cleanup is automatic when box is cleaned up!
  return box({
    focusable: true,
    tabIndex: 1,
    onKey: (event) => {
      if (event.key === 'Enter') {
        count.value++
        return true
      }
    },
    children: () => {
      text({ content: () => `Count: ${count.value}` })
    }
  })
}
```

For external resources (timers, subscriptions), use `onDestroy`:

```typescript
import { signal, box, text, onDestroy, type Cleanup } from '@rlabs-inc/tui'

function Timer(): Cleanup {
  const seconds = signal(0)
  const interval = setInterval(() => { seconds.value++ }, 1000)

  onDestroy(() => clearInterval(interval))  // Cleanup on component destroy

  return box({
    children: () => {
      text({ content: () => `Elapsed: ${seconds.value}s` })
    }
  })
}
```

## Component Organization

Organize related components:

```typescript
// components/form/index.ts
export { Input } from './Input'
export { Select } from './Select'
export { Button } from './Button'
export { Form } from './Form'

// components/layout/index.ts
export { Card } from './Card'
export { Panel } from './Panel'
export { Modal } from './Modal'
```

## See Also

- [Reactive Props Guide](../reactivity/reactive-props.md)
- [Lists & Selection](./lists-and-selection.md)
- [Modals & Overlays](./modals-overlays.md)
