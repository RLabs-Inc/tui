# Input Guide

> Single-line text input with full reactivity and keyboard handling

## Overview

`input` is the primitive for capturing user text. It provides:

- **Two-way binding** - Value syncs automatically via signals or bindings
- **Password mode** - Mask characters for sensitive input
- **Cursor control** - Style, blink animation, and positioning
- **Full keyboard** - Arrow navigation, editing, submit/cancel
- **Focus management** - Tab navigation, auto-focus, callbacks

## Basic Usage

```typescript
import { signal, input } from '@rlabs-inc/tui'

const name = signal('')

input({
  value: name,
  placeholder: 'Enter your name...'
})
```

When the user types, `name.value` updates automatically. When you set `name.value` programmatically, the input display updates.

## Two-Way Value Binding

The `value` prop requires a `WritableSignal` or `Binding` for two-way synchronization.

### Using a Signal

```typescript
import { signal, input } from '@rlabs-inc/tui'

const username = signal('')

input({ value: username })

// Read the current value
console.log(username.value)

// Set programmatically (input updates)
username.value = 'default-user'
```

### Using a Binding

```typescript
import { signal, bind, input } from '@rlabs-inc/tui'

const formData = signal({ name: '', email: '' })

// Bind to a nested property
input({
  value: bind(
    () => formData.value.name,
    (v) => { formData.value = { ...formData.value, name: v } }
  )
})
```

## Placeholder Text

Show hint text when the input is empty:

```typescript
input({
  value: username,
  placeholder: 'Enter username...'
})
```

The placeholder disappears when the user starts typing and reappears when the value is cleared.

### Placeholder Color

Customize the placeholder appearance:

```typescript
import { t } from '@rlabs-inc/tui'

input({
  value: username,
  placeholder: 'Search...',
  placeholderColor: t.textDim
})
```

## Password Mode

Mask input for sensitive data:

```typescript
const password = signal('')

input({
  value: password,
  password: true,
  placeholder: 'Enter password...'
})
```

Characters display as bullet points by default.

### Custom Mask Character

```typescript
input({
  value: password,
  password: true,
  maskChar: '*'    // Use asterisks instead of default '•'
})
```

## Keyboard Handling

When focused, the input handles these keys:

| Key | Action |
|-----|--------|
| `ArrowLeft` | Move cursor one position left |
| `ArrowRight` | Move cursor one position right |
| `Home` | Jump to start of input |
| `End` | Jump to end of input |
| `Backspace` | Delete character before cursor |
| `Delete` | Delete character after cursor |
| `Enter` | Trigger `onSubmit` callback |
| `Escape` | Trigger `onCancel` callback |
| Printable characters | Insert at cursor position |

Modifier keys (Ctrl, Alt, Meta) are ignored for character input, allowing system shortcuts to pass through.

## Cursor Configuration

Customize the cursor appearance:

```typescript
input({
  value: text,
  cursor: {
    style: 'bar',      // 'block' | 'bar' | 'underline'
    blink: true
  }
})
```

### Cursor Styles

| Style | Appearance |
|-------|------------|
| `block` | Full character block (default) |
| `bar` | Thin vertical line |
| `underline` | Horizontal line below text |

### Blink Configuration

```typescript
// Simple on/off
input({
  value: text,
  cursor: { blink: false }   // No blinking
})

// Advanced blink config
input({
  value: text,
  cursor: {
    blink: {
      enabled: true,
      fps: 2,              // Blink rate (default: 2 = 500ms cycle)
      altChar: ' '         // Character shown on "off" phase
    }
  }
})
```

### Custom Cursor Character

Override the style preset with a custom character:

```typescript
input({
  value: text,
  cursor: {
    char: '_'    // Use underscore as cursor
  }
})
```

## Max Length

Limit the number of characters:

```typescript
input({
  value: username,
  maxLength: 20    // Stop accepting input at 20 characters
})
```

When the limit is reached, additional character input is ignored. Navigation and deletion still work.

## Variants and Styling

Apply themed styles with variants:

```typescript
input({
  value: text,
  variant: 'primary'    // Uses theme primary colors
})
```

Available variants:
- `default` - No special styling
- `primary`, `secondary`, `tertiary`, `accent` - Core theme colors
- `success`, `warning`, `error`, `info` - Status colors
- `muted`, `surface`, `elevated` - Surface variations
- `ghost`, `outline` - Subtle styles

### Direct Colors

Override with explicit colors:

```typescript
import { t, Colors } from '@rlabs-inc/tui'

input({
  value: text,
  fg: t.text,
  bg: t.surface,
  borderColor: t.primary
})
```

### Borders

```typescript
import { BorderStyle } from '@rlabs-inc/tui'

input({
  value: text,
  border: BorderStyle.ROUNDED,
  borderColor: t.border
})
```

## Focus Management

```typescript
// Auto-focus on mount
input({ value: text, autoFocus: true })

// Tab order for navigation
input({ value: field1, tabIndex: 1 })
input({ value: field2, tabIndex: 2 })

// Focus callbacks
input({
  value: text,
  onFocus: () => console.log('Focused'),
  onBlur: () => console.log('Blurred')
})
```

Lower `tabIndex` values receive focus first. Inputs are always focusable.

## Event Callbacks

### onChange

Fires on every character change:

```typescript
input({
  value: searchQuery,
  onChange: (value) => {
    // Live search as user types
    performSearch(value)
  }
})
```

### onSubmit

Fires when the user presses Enter:

```typescript
input({
  value: message,
  onSubmit: (value) => {
    sendMessage(value)
    message.value = ''    // Clear after submit
  }
})
```

### onCancel

Fires when the user presses Escape:

```typescript
input({
  value: editText,
  onCancel: () => {
    editText.value = originalValue    // Revert changes
    closeEditor()
  }
})
```

## Dimensions and Spacing

```typescript
input({
  value: text,
  width: 40,
  minWidth: 20,
  maxWidth: 60,

  // Padding (inside)
  padding: 1,
  paddingLeft: 2,

  // Margin (outside)
  margin: 1,
  marginBottom: 2
})
```

## Common Patterns

### Login Form

```typescript
const username = signal('')
const password = signal('')

box({
  gap: 1,
  padding: 2,
  border: BorderStyle.ROUNDED,
  children: () => {
    text({ content: 'Login', attrs: Attr.BOLD })

    input({
      value: username,
      placeholder: 'Username',
      tabIndex: 1,
      autoFocus: true
    })

    input({
      value: password,
      placeholder: 'Password',
      password: true,
      tabIndex: 2,
      onSubmit: () => attemptLogin(username.value, password.value)
    })
  }
})
```

### Search Box

```typescript
const query = signal('')
const results = signal<string[]>([])

input({
  value: query,
  placeholder: 'Search...',
  width: 30,
  border: BorderStyle.ROUNDED,
  onChange: async (value) => {
    if (value.length > 2) {
      results.value = await search(value)
    }
  }
})
```

### Validated Input

```typescript
const email = signal('')
const isValid = derived(() => email.value.includes('@'))

input({
  value: email,
  placeholder: 'Email address',
  borderColor: derived(() => isValid.value ? t.border.value : t.error.value)
})
```

## Cleanup

Input returns a cleanup function:

```typescript
const cleanup = input({
  value: text,
  placeholder: 'Temporary input'
})

// Later, to remove the input:
cleanup()
```

This releases the component index and unregisters keyboard handlers.

## See Also

- [API Reference: input](../../api/primitives/input.md)
- [Box Guide](./box.md)
- [Text Guide](./text.md)
- [Keyboard Guide](../interaction/keyboard.md)
- [Focus Guide](../interaction/focus.md)
