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

```typescript
import { box, text, type Cleanup, type PropInput, reactiveProps } from '@rlabs-inc/tui'

interface GreetingProps {
  name: PropInput<string>
}

function Greeting(rawProps: GreetingProps): Cleanup {
  const props = reactiveProps<{ name: string }>(rawProps)

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
interface CardProps {
  title: PropInput<string>
  children: () => void
}

function Card(rawProps: CardProps): Cleanup {
  const props = reactiveProps<{ title: string }>({ title: rawProps.title })

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

```typescript
interface ButtonProps {
  label: PropInput<string>
  onPress?: () => void
}

function Button(rawProps: ButtonProps): Cleanup {
  const props = reactiveProps<{ label: string }>({ label: rawProps.label })
  const isPressed = signal(false)

  const buttonIndex = allocateIndex()

  mouse.onComponent(buttonIndex, {
    onClick: () => rawProps.onPress?.(),
    onMouseDown: () => { isPressed.value = true },
    onMouseUp: () => { isPressed.value = false },
    onMouseLeave: () => { isPressed.value = false }
  })

  return box({
    id: buttonIndex.toString(),
    border: BorderStyle.ROUNDED,
    padding: 0,
    paddingLeft: 2,
    paddingRight: 2,
    bg: derived(() => isPressed.value ? t.primary.value : t.surface.value),
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
interface CounterProps {
  initial?: PropInput<number>
}

function Counter(rawProps: CounterProps): Cleanup {
  const props = reactiveProps<{ initial: number }>({
    initial: rawProps.initial ?? 0
  })

  // Internal state
  const count = signal(props.initial.value)

  const counterIndex = allocateIndex()

  // Internal keyboard handler
  keyboard.onFocused(counterIndex, (event) => {
    if (event.key === 'ArrowUp') {
      count.value++
      return true
    }
    if (event.key === 'ArrowDown') {
      count.value--
      return true
    }
  })

  return box({
    focusable: true,
    tabIndex: 1,
    border: BorderStyle.SINGLE,
    padding: 1,
    children: () => {
      text({ content: () => `Count: ${count.value}` })
      text({ content: '[Up/Down to change]', fg: t.textDim })
    }
  })
}
```

## Composition Pattern

Build complex components from simpler ones:

```typescript
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
function createButton(variant: 'primary' | 'secondary' | 'danger') {
  const variantStyles = {
    primary: { bg: t.primary, fg: t.background },
    secondary: { bg: t.surface, fg: t.text },
    danger: { bg: t.error, fg: t.background }
  }

  return function Button(props: { label: PropInput<string>, onPress?: () => void }): Cleanup {
    const normalized = reactiveProps<{ label: string }>({ label: props.label })
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

Always return cleanup functions:

```typescript
function MyComponent(): Cleanup {
  const index = allocateIndex()

  // Register handlers
  const unsubscribe = keyboard.onFocused(index, handler)

  // Return cleanup
  const boxCleanup = box({
    children: () => { /* ... */ }
  })

  return () => {
    unsubscribe()
    boxCleanup()
  }
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
