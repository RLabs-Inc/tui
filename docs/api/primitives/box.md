# box()

> Container primitive with flexbox layout

## Import

```typescript
import { box } from '@rlabs-inc/tui'
```

## Signature

```typescript
function box(props: BoxProps): Cleanup
```

## Parameters

### BoxProps

All props can be static values or reactive (signals/getters).

#### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | auto | Component identifier |
| `visible` | `Reactive<boolean>` | `true` | Whether component is rendered |
| `children` | `() => void` | - | Child component renderer |
| `variant` | `Variant` | - | Style variant preset |

#### Dimension Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `Reactive<Dimension>` | `0` (auto) | Width (number, '%', or 'auto') |
| `height` | `Reactive<Dimension>` | `0` (auto) | Height |
| `minWidth` | `Reactive<Dimension>` | `0` | Minimum width |
| `maxWidth` | `Reactive<Dimension>` | `0` (none) | Maximum width |
| `minHeight` | `Reactive<Dimension>` | `0` | Minimum height |
| `maxHeight` | `Reactive<Dimension>` | `0` (none) | Maximum height |

#### Layout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flexDirection` | `Reactive<FlexDirection>` | `'column'` | Main axis direction |
| `flexWrap` | `Reactive<FlexWrap>` | `'nowrap'` | Wrap behavior |
| `justifyContent` | `Reactive<JustifyContent>` | `'flex-start'` | Main axis alignment |
| `alignItems` | `Reactive<AlignItems>` | `'stretch'` | Cross axis alignment |
| `alignSelf` | `Reactive<AlignSelf>` | `'auto'` | Self alignment override |
| `grow` | `Reactive<number>` | `0` | Flex grow factor |
| `shrink` | `Reactive<number>` | `1` | Flex shrink factor |
| `flexBasis` | `Reactive<number>` | `0` | Initial size before flex |
| `gap` | `Reactive<number>` | `0` | Gap between children |
| `overflow` | `Reactive<Overflow>` | `'visible'` | Overflow handling |
| `zIndex` | `Reactive<number>` | `0` | Stacking order |

#### Spacing Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `Reactive<number>` | `0` | All sides padding |
| `paddingTop` | `Reactive<number>` | `0` | Top padding |
| `paddingRight` | `Reactive<number>` | `0` | Right padding |
| `paddingBottom` | `Reactive<number>` | `0` | Bottom padding |
| `paddingLeft` | `Reactive<number>` | `0` | Left padding |
| `margin` | `Reactive<number>` | `0` | All sides margin |
| `marginTop` | `Reactive<number>` | `0` | Top margin |
| `marginRight` | `Reactive<number>` | `0` | Right margin |
| `marginBottom` | `Reactive<number>` | `0` | Bottom margin |
| `marginLeft` | `Reactive<number>` | `0` | Left margin |

#### Style Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fg` | `Reactive<RGBA \| null>` | `null` | Foreground color |
| `bg` | `Reactive<RGBA \| null>` | `null` | Background color |
| `opacity` | `Reactive<number>` | `1` | Opacity (0-1) |

#### Border Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `border` | `Reactive<number>` | `0` | Border style (see BorderStyle) |
| `borderColor` | `Reactive<RGBA \| null>` | `null` | Border color |
| `borderTop` | `Reactive<number>` | - | Top border override |
| `borderRight` | `Reactive<number>` | - | Right border override |
| `borderBottom` | `Reactive<number>` | - | Bottom border override |
| `borderLeft` | `Reactive<number>` | - | Left border override |

#### Interaction Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `focusable` | `Reactive<boolean>` | `false` | Can receive focus |
| `tabIndex` | `Reactive<number>` | `-1` | Tab order (-1 = not in tab order) |

## Returns

```typescript
type Cleanup = () => void
```

Call the returned function to unmount the box and release its resources.

## Examples

### Basic Box

```typescript
box({
  width: 40,
  height: 10,
  padding: 1,
  children: () => {
    text({ content: 'Content' })
  }
})
```

### With Border

```typescript
import { box, text, BorderStyle, t } from '@rlabs-inc/tui'

box({
  border: BorderStyle.ROUNDED,
  borderColor: t.primary,
  padding: 2,
  children: () => {
    text({ content: 'Bordered box' })
  }
})
```

### Flexbox Layout

```typescript
box({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 2,
  children: () => {
    text({ content: 'Left' })
    text({ content: 'Center' })
    text({ content: 'Right' })
  }
})
```

### Percentage Dimensions

```typescript
box({
  width: '100%',
  height: '50%',
  children: () => {
    // Content fills container
  }
})
```

### Reactive Props

```typescript
const width = signal(40)
const isVisible = signal(true)

box({
  width,  // Reactive
  visible: isVisible,  // Reactive
  bg: () => isActive.value ? t.primary.value : null,  // Getter
  children: () => {
    text({ content: 'Reactive box' })
  }
})
```

### Focusable Box

```typescript
box({
  focusable: true,
  tabIndex: 1,
  border: BorderStyle.SINGLE,
  borderColor: derived(() =>
    isFocused(myIndex) ? t.primary.value : t.border.value
  ),
  children: () => {
    text({ content: 'Tab to focus' })
  }
})
```

### With Variant

```typescript
box({
  variant: 'primary',  // Applies theme colors
  padding: 2,
  children: () => {
    text({ content: 'Primary button' })
  }
})
```

### Scrollable Container

```typescript
box({
  height: 10,
  overflow: 'scroll',
  focusable: true,
  children: () => {
    // Many children that exceed height
    for (let i = 0; i < 50; i++) {
      text({ content: `Line ${i}` })
    }
  }
})
```

### Nested Layout

```typescript
box({
  flexDirection: 'row',
  width: '100%',
  children: () => {
    // Sidebar
    box({
      width: 30,
      border: BorderStyle.SINGLE,
      children: () => Navigation()
    })

    // Main content
    box({
      grow: 1,
      children: () => Content()
    })
  }
})
```

## Type Definitions

### Dimension

```typescript
type Dimension = number | `${number}%`
// 0 = auto
// 40 = 40 columns
// '50%' = 50% of parent
// '100%' = full parent
```

### FlexDirection

```typescript
type FlexDirection = 'column' | 'row' | 'column-reverse' | 'row-reverse'
```

### JustifyContent

```typescript
type JustifyContent =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
```

### AlignItems

```typescript
type AlignItems =
  | 'stretch'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'baseline'
```

### Overflow

```typescript
type Overflow = 'visible' | 'hidden' | 'scroll' | 'auto'
```

### BorderStyle

```typescript
const BorderStyle = {
  NONE: 0,
  SINGLE: 1,
  DOUBLE: 2,
  ROUNDED: 3,
  THICK: 4,
  DASHED: 5,
  DOTTED: 6,
}
```

## See Also

- [Box Guide](../../guides/primitives/box.md)
- [Flexbox Guide](../../guides/layout/flexbox.md)
- [text()](./text.md)
