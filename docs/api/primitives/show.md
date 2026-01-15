# show()

> Conditional rendering primitive

## Import

```typescript
import { show } from '@rlabs-inc/tui'
```

## Signature

```typescript
function show(
  condition: () => boolean,
  then: () => Cleanup,
  otherwise?: () => Cleanup
): Cleanup
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `condition` | `() => boolean` | Getter returning condition |
| `then` | `() => Cleanup` | Renderer when true |
| `otherwise` | `() => Cleanup` | Optional renderer when false |

## Returns

```typescript
type Cleanup = () => void
```

## Examples

### Basic Conditional

```typescript
import { show, text, signal } from '@rlabs-inc/tui'

const isVisible = signal(true)

show(
  () => isVisible.value,
  () => text({ content: 'I am visible!' })
)
```

### With Else Branch

```typescript
const isLoggedIn = signal(false)

show(
  () => isLoggedIn.value,
  () => text({ content: 'Welcome, User!' }),
  () => text({ content: 'Please log in' })
)
```

### Complex Condition

```typescript
const count = signal(0)

show(
  () => count.value > 10,
  () => text({ content: 'Count is high!', fg: t.warning })
)
```

### Nested Show

```typescript
const status = signal<'loading' | 'error' | 'success'>('loading')

show(
  () => status.value === 'loading',
  () => text({ content: 'Loading...' }),
  () => show(
    () => status.value === 'error',
    () => text({ content: 'Error!', fg: t.error }),
    () => text({ content: 'Success!', fg: t.success })
  )
)
```

### Modal Overlay

```typescript
const isModalOpen = signal(false)

// Main content always visible
box({
  children: () => {
    text({ content: 'Main Content' })
  }
})

// Modal conditionally rendered
show(
  () => isModalOpen.value,
  () => box({
    zIndex: 100,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    bg: { r: 0, g: 0, b: 0, a: 128 },
    children: () => {
      box({
        border: BorderStyle.DOUBLE,
        padding: 2,
        children: () => {
          text({ content: 'Modal Content' })
        }
      })
    }
  })
)
```

### Loading State

```typescript
const isLoading = signal(true)
const data = signal<string | null>(null)

show(
  () => isLoading.value,
  () => text({ content: 'Loading...' }),
  () => show(
    () => data.value !== null,
    () => text({ content: () => `Data: ${data.value}` }),
    () => text({ content: 'No data', fg: t.textMuted })
  )
)
```

### Feature Flag

```typescript
const features = signal({
  darkMode: true,
  betaFeatures: false
})

show(
  () => features.value.betaFeatures,
  () => box({
    children: () => {
      text({ content: 'BETA', fg: t.warning })
      BetaFeatureUI()
    }
  })
)
```

### Visibility Toggle

```typescript
const panels = signal({
  sidebar: true,
  details: false
})

box({
  flexDirection: 'row',
  children: () => {
    show(
      () => panels.value.sidebar,
      () => Sidebar()
    )

    MainContent()

    show(
      () => panels.value.details,
      () => DetailsPanel()
    )
  }
})
```

### Error Handling

```typescript
const error = signal<string | null>(null)

show(
  () => error.value !== null,
  () => box({
    border: BorderStyle.SINGLE,
    borderColor: t.error,
    padding: 1,
    children: () => {
      text({ content: 'Error', fg: t.error, attrs: Attr.BOLD })
      text({ content: () => error.value! })
    }
  })
)
```

## Behavior

### Mounting/Unmounting

When condition changes:
- `true → false`: "then" branch is unmounted (cleanup called)
- `false → true`: "then" branch is mounted (render called)

### Cleanup

Both branches return cleanup functions that are called appropriately:

```typescript
show(
  () => condition.value,
  () => {
    // This runs on mount
    const cleanup = box({ ... })

    // cleanup is called when condition becomes false
    return cleanup
  }
)
```

### vs `visible` Prop

`show()` is different from `visible` prop:

```typescript
// show(): Component is mounted/unmounted
show(
  () => isVisible.value,
  () => HeavyComponent()  // Fully unmounted when false
)

// visible prop: Component stays mounted, just not rendered
box({
  visible: isVisible,  // Component stays in memory
  children: () => HeavyComponent()
})
```

Use `show()` when:
- Component has expensive initialization
- Component holds resources
- You want to reset state on toggle

Use `visible` prop when:
- Quick toggle is needed
- State should persist across visibility changes

## See Also

- [Template Primitives Guide](../../guides/primitives/template-primitives.md)
- [Modals Guide](../../guides/patterns/modals-overlays.md)
- [each()](./each.md)
- [when()](./when.md)
