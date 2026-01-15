# cursor

> Terminal cursor control

## Import

```typescript
import { cursor } from '@rlabs-inc/tui'
```

## API Reference

### cursor.show()

Show the cursor.

```typescript
cursor.show(): void
```

### cursor.hide()

Hide the cursor.

```typescript
cursor.hide(): void
```

### cursor.toggle()

Toggle cursor visibility.

```typescript
cursor.toggle(): void
```

### cursor.setShape()

Set cursor shape and blinking.

```typescript
cursor.setShape(
  shape: CursorShape,
  blink?: boolean  // default: true
): void
```

```typescript
cursor.setShape('bar')           // Blinking bar
cursor.setShape('block', false)  // Non-blinking block
```

### cursor.moveTo()

Move cursor to absolute position.

```typescript
cursor.moveTo(col: number, row: number): void
```

```typescript
cursor.moveTo(0, 0)   // Top-left
cursor.moveTo(10, 5)  // Column 10, row 5
```

### cursor.moveBy()

Move cursor relative to current position.

```typescript
cursor.moveBy(dx: number, dy: number): void
```

```typescript
cursor.moveBy(1, 0)   // Move right 1
cursor.moveBy(-1, 0)  // Move left 1
cursor.moveBy(0, 1)   // Move down 1
```

### cursor.save()

Get ANSI sequence to save cursor position.

```typescript
cursor.save(): string
```

### cursor.restore()

Get ANSI sequence to restore cursor position.

```typescript
cursor.restore(): string
```

## State Properties

### cursor.visible

Current visibility state.

```typescript
cursor.visible: boolean  // Read-only
```

### cursor.shape

Current cursor shape.

```typescript
cursor.shape: CursorShape  // Read-only
```

### cursor.blinking

Current blinking state.

```typescript
cursor.blinking: boolean  // Read-only
```

### cursor.x / cursor.y

Current cursor position.

```typescript
cursor.x: number  // Read-only
cursor.y: number  // Read-only
```

## State Signals

For reactive access, import the signals directly:

```typescript
import {
  visible as cursorVisible,
  shape as cursorShape,
  blinking as cursorBlinking,
  x as cursorX,
  y as cursorY
} from '@rlabs-inc/tui'

effect(() => {
  console.log('Cursor at:', cursorX.value, cursorY.value)
})
```

## Types

### CursorShape

```typescript
type CursorShape = 'block' | 'underline' | 'bar'
```

| Shape | Description |
|-------|-------------|
| `'block'` | Full block cursor (default) |
| `'underline'` | Underscore cursor |
| `'bar'` | Vertical line cursor (I-beam) |

## Examples

### Input Field Cursor

```typescript
function InputField() {
  const value = signal('')
  const cursorPos = signal(0)

  // Show cursor when focused
  const inputIndex = allocateIndex()

  effect(() => {
    if (isFocused(inputIndex).value) {
      cursor.show()
      cursor.setShape('bar')
    }
  })

  keyboard.onFocused(inputIndex, (event) => {
    if (event.char) {
      // Insert character
      const before = value.value.slice(0, cursorPos.value)
      const after = value.value.slice(cursorPos.value)
      value.value = before + event.char + after
      cursorPos.value++
      return true
    }
    // ... handle other keys
  })

  return box({
    focusable: true,
    tabIndex: 1,
    children: () => text({ content: value })
  })
}
```

### Custom Cursor Position

```typescript
function PositionedCursor() {
  const pos = signal({ x: 10, y: 5 })

  effect(() => {
    cursor.moveTo(pos.value.x, pos.value.y)
    cursor.show()
  })

  keyboard.onKey('ArrowUp', () => {
    pos.value = { ...pos.value, y: Math.max(0, pos.value.y - 1) }
  })

  // ... other arrow keys

  return box({
    children: () => {
      text({ content: `Cursor at: ${pos.value.x}, ${pos.value.y}` })
    }
  })
}
```

### Save/Restore Pattern

```typescript
function WithSavedCursor(fn: () => void) {
  process.stdout.write(cursor.save())
  fn()
  process.stdout.write(cursor.restore())
}
```

### Cursor Styles for Different Modes

```typescript
const mode = signal<'normal' | 'insert' | 'visual'>('normal')

effect(() => {
  switch (mode.value) {
    case 'normal':
      cursor.setShape('block')
      break
    case 'insert':
      cursor.setShape('bar')
      break
    case 'visual':
      cursor.setShape('underline')
      break
  }
})
```

## ANSI Sequence Generation

For low-level control, use these functions:

### getVisibilitySequence()

Get ANSI for current visibility.

```typescript
import { getVisibilitySequence } from '@rlabs-inc/tui'

const seq = getVisibilitySequence()  // '\x1b[?25h' or '\x1b[?25l'
```

### getShapeSequence()

Get ANSI for current shape.

```typescript
import { getShapeSequence } from '@rlabs-inc/tui'

const seq = getShapeSequence()  // e.g., '\x1b[6 q'
```

### getPositionSequence()

Get ANSI to move to current position.

```typescript
import { getPositionSequence } from '@rlabs-inc/tui'

const seq = getPositionSequence()  // e.g., '\x1b[6;11H'
```

## Notes

- TUI hides the cursor by default during mount
- Cursor is shown automatically on cleanup
- Cursor position is relative to terminal (1-indexed in ANSI, 0-indexed in API)
- Some terminals may not support all cursor shapes

## See Also

- [Input Fields](../../guides/patterns/component-patterns.md)
- [keyboard](./keyboard.md)
