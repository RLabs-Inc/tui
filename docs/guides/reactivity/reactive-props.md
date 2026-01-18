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
import { reactiveProps, derived, type PropInput } from '@rlabs-inc/tui'

interface MyComponentProps {
  title: PropInput<string>
  count: PropInput<number>
}

function MyComponent(rawProps: MyComponentProps) {
  // Normalize all props - everything becomes a DerivedSignal
  // TypeScript infers the types automatically from the input object
  const props = reactiveProps(rawProps)

  // props.title and props.count are now DerivedSignals
  // TypeScript infers { title: DerivedSignal<string>; count: DerivedSignal<number> }
  // Pass them directly to primitives - no wrapper needed!
  return box({
    children: () => {
      // Pass the derived directly (cleanest)
      text({ content: props.title })

      // Use getter only for inline computation
      text({ content: () => `Count: ${props.count.value}` })
    }
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

## Type Inference

TypeScript automatically infers the types from the object you pass to `reactiveProps()`. You do **not** need to provide explicit generic type parameters:

```typescript
// Good - TypeScript infers types automatically
const props = reactiveProps({
  label: rawProps.label,
  count: rawProps.count
})

// Bad - explicit generics are unnecessary and verbose
const props = reactiveProps<{ label: string; count: number }>({...})
```

The return type is automatically inferred as `{ label: DerivedSignal<string>; count: DerivedSignal<number> }` based on the input object's property types.

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
  const props = reactiveProps({
    label: rawProps.label,
    disabled: rawProps.disabled ?? false,
    variant: rawProps.variant ?? 'primary'
  })

  // Now use props.label.value, props.disabled.value, etc.
}
```

### 3. Use in Primitives

After `reactiveProps()`, each prop is a `DerivedSignal`. **Pass them directly** - no wrapper needed:

```typescript
function Button(rawProps: ButtonProps) {
  const props = reactiveProps({
    label: rawProps.label,
    disabled: rawProps.disabled ?? false
  })

  // props.disabled is a DerivedSignal - use getter only for computation
  const opacity = derived(() => props.disabled.value ? 0.5 : 1)

  return box({
    border: BorderStyle.ROUNDED,
    opacity,  // Pass derived directly
    children: () => {
      text({ content: props.label })  // Pass derived directly - cleanest!
    }
  })
}
```

## Calling Your Component

Callers can pass any reactive form - `reactiveProps()` normalizes them all:

```typescript
// Static values
Button({ label: 'Click Me' })

// Signals - pass directly (cleanest)
const label = signal('Click Me')
Button({ label })

// Deriveds - pass directly
const formatted = derived(() => label.value.toUpperCase())
Button({ label: formatted })

// Getters - only for inline computation
Button({ label: () => `Count: ${count.value}` })

// Mixed
const disabled = signal(false)
Button({
  label: 'Submit',  // static
  disabled,         // signal directly
  variant: () => isImportant.value ? 'primary' : 'secondary'  // inline computation
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
  const props = reactiveProps({
    title: rawProps.title,
    content: rawProps.content,
    highlighted: rawProps.highlighted ?? false
  })

  // Create derived for computed borderColor
  const borderColor = derived(() =>
    props.highlighted.value ? t.primary.value : t.border.value
  )

  return box({
    border: BorderStyle.ROUNDED,
    borderColor,  // Pass derived directly
    padding: 1,
    gap: 1,
    children: () => {
      // Pass props directly - they're DerivedSignals
      text({
        content: props.title,
        fg: t.primary,
        attrs: Attr.BOLD
      })
      text({ content: props.content })
    }
  })
}

// Usage - callers pass signals/deriveds directly, or use getters for computation
Card({
  title: 'Welcome',
  content: 'This is a card component',
  highlighted: true
})

Card({
  title: () => `User: ${user.value.name}`,  // Getter for inline computation
  content: userBio,       // Signal directly
  highlighted: isSelected // Signal directly
})
```

## Default Values

Handle defaults when normalizing:

```typescript
function Button(rawProps: ButtonProps) {
  const props = reactiveProps({
    label: rawProps.label,
    size: rawProps.size ?? 'medium',      // Default: 'medium'
    disabled: rawProps.disabled ?? false  // Default: false
  })

  // ...
}
```

## Derived from Props

Create named deriveds for complex logic, then pass them directly:

```typescript
function Progress(rawProps: { value: PropInput<number> }) {
  const props = reactiveProps({ value: rawProps.value })

  // Create deriveds for complex computations
  const percent = derived(() => Math.round(props.value.value * 100))
  const barWidth = derived(() => Math.floor(props.value.value * 20))
  const bar = derived(() => '█'.repeat(barWidth.value))
  const label = derived(() => `${percent.value}%`)

  return box({
    flexDirection: 'row',
    children: () => {
      // Pass deriveds directly - cleanest syntax
      text({ content: bar, fg: t.primary })
      text({ content: label, fg: t.textDim })
    }
  })
}
```

## Best Practices

1. **Pass signals/deriveds directly** - After `reactiveProps()`, props are deriveds - pass them directly to primitives
2. **Use `() =>` only for inline computation** - A getter is an inline derived
3. **Always use PropInput** for props that might be reactive
4. **Provide defaults** when normalizing optional props
5. **Create named deriveds** for complex computed logic
6. **Return Cleanup** from component functions

```typescript
// Good pattern
interface MyProps {
  required: PropInput<string>      // Required, reactive
  optional?: PropInput<boolean>    // Optional, reactive
  static?: string                  // Optional, never reactive
}

function MyComponent(rawProps: MyProps): Cleanup {
  const props = reactiveProps({
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
