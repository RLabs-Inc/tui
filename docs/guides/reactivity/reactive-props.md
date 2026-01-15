# Reactive Props Guide

> Build reactive custom components with reactiveProps()

## Overview

When building reusable components, you need to handle props that might be:
- Static values
- Signals
- Getter functions
- Bindings

The `reactiveProps()` utility normalizes all input types to a consistent interface.

## The Problem

Without normalization, handling different prop types is verbose:

```typescript
function MyComponent(props: { count: number | Signal<number> | (() => number) }) {
  // Complex type checking for every prop...
  const getCount = typeof props.count === 'function'
    ? props.count
    : typeof props.count === 'object' && 'value' in props.count
      ? () => props.count.value
      : () => props.count
}
```

## The Solution: reactiveProps()

```typescript
import { reactiveProps, type PropInput } from '@rlabs-inc/tui'

interface MyComponentProps {
  title: PropInput<string>
  count: PropInput<number>
}

function MyComponent(rawProps: MyComponentProps) {
  // Normalize all props
  const props = reactiveProps<{ title: string; count: number }>(rawProps)

  // Now everything has consistent .value access
  const display = derived(() => `${props.title.value}: ${props.count.value}`)

  return box({
    children: () => text({ content: display })
  })
}
```

## PropInput Type

```typescript
// Accepts any reactive form
type PropInput<T> = T | Signal<T> | (() => T) | Binding<T>

// After reactiveProps(), everything becomes a DerivedSignal
interface ReactiveProps<T> {
  [K in keyof T]: DerivedSignal<T[K]>
}
```

## Usage Pattern

### 1. Define Props Interface

```typescript
import type { PropInput } from '@rlabs-inc/tui'

interface ButtonProps {
  label: PropInput<string>
  disabled?: PropInput<boolean>
  variant?: PropInput<'primary' | 'secondary'>
}
```

### 2. Normalize in Component

```typescript
import { reactiveProps } from '@rlabs-inc/tui'

function Button(rawProps: ButtonProps) {
  const props = reactiveProps<{
    label: string
    disabled: boolean
    variant: 'primary' | 'secondary'
  }>({
    label: rawProps.label,
    disabled: rawProps.disabled ?? false,
    variant: rawProps.variant ?? 'primary'
  })

  // Now use props.label.value, props.disabled.value, etc.
}
```

### 3. Use in Primitives

```typescript
function Button(rawProps: ButtonProps) {
  const props = reactiveProps<{ label: string; disabled: boolean }>({
    label: rawProps.label,
    disabled: rawProps.disabled ?? false
  })

  return box({
    border: BorderStyle.ROUNDED,
    opacity: derived(() => props.disabled.value ? 0.5 : 1),
    children: () => {
      text({ content: props.label })  // Already a signal-like
    }
  })
}
```

## Calling Your Component

All these work:

```typescript
// Static values
Button({ label: 'Click Me' })

// Signals
const label = signal('Click Me')
Button({ label })

// Getters
Button({ label: () => `Count: ${count.value}` })

// Mixed
const disabled = signal(false)
Button({
  label: 'Submit',
  disabled,
  variant: () => isImportant.value ? 'primary' : 'secondary'
})
```

## Complete Example

```typescript
import {
  box, text, reactiveProps, derived,
  type PropInput, type Cleanup
} from '@rlabs-inc/tui'

// Props interface
interface CardProps {
  title: PropInput<string>
  content: PropInput<string>
  highlighted?: PropInput<boolean>
}

// Component function
function Card(rawProps: CardProps): Cleanup {
  const props = reactiveProps<{
    title: string
    content: string
    highlighted: boolean
  }>({
    title: rawProps.title,
    content: rawProps.content,
    highlighted: rawProps.highlighted ?? false
  })

  return box({
    border: BorderStyle.ROUNDED,
    borderColor: derived(() =>
      props.highlighted.value ? t.primary.value : t.border.value
    ),
    padding: 1,
    gap: 1,
    children: () => {
      text({
        content: props.title,
        fg: t.primary,
        attrs: Attr.BOLD
      })
      text({ content: props.content })
    }
  })
}

// Usage
Card({
  title: 'Welcome',
  content: 'This is a card component',
  highlighted: true
})

Card({
  title: () => `User: ${user.value.name}`,
  content: userBio,
  highlighted: isSelected
})
```

## Default Values

Handle defaults when normalizing:

```typescript
function Button(rawProps: ButtonProps) {
  const props = reactiveProps<{
    label: string
    size: 'small' | 'medium' | 'large'
    disabled: boolean
  }>({
    label: rawProps.label,
    size: rawProps.size ?? 'medium',      // Default: 'medium'
    disabled: rawProps.disabled ?? false  // Default: false
  })

  // ...
}
```

## Derived from Props

Create derived values from normalized props:

```typescript
function Progress(rawProps: { value: PropInput<number> }) {
  const props = reactiveProps<{ value: number }>({ value: rawProps.value })

  const percent = derived(() => Math.round(props.value.value * 100))
  const barWidth = derived(() => Math.floor(props.value.value * 20))

  return box({
    flexDirection: 'row',
    children: () => {
      text({
        content: derived(() => '█'.repeat(barWidth.value)),
        fg: t.primary
      })
      text({
        content: derived(() => `${percent.value}%`),
        fg: t.textDim
      })
    }
  })
}
```

## Best Practices

1. **Always use PropInput** for props that might be reactive
2. **Provide defaults** when normalizing optional props
3. **Create derived values** for computed display logic
4. **Return Cleanup** from component functions

```typescript
// Good pattern
interface MyProps {
  required: PropInput<string>      // Required, reactive
  optional?: PropInput<boolean>    // Optional, reactive
  static?: string                  // Optional, never reactive
}

function MyComponent(rawProps: MyProps): Cleanup {
  const props = reactiveProps<{
    required: string
    optional: boolean
  }>({
    required: rawProps.required,
    optional: rawProps.optional ?? false
  })

  // Use rawProps.static directly (it's never reactive)
  const staticValue = rawProps.static ?? 'default'

  return box({
    // ...
  })
}
```

## See Also

- [Signals Guide](./signals.md)
- [Bind Pattern](./bind-pattern.md)
- [Component Patterns](../patterns/component-patterns.md)
