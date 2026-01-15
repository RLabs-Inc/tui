# Theme API

> Theming and color system

## Import

```typescript
import {
  t, theme, setTheme, themes,
  resolveColor, resolvedTheme,
  getVariantStyle, variantStyle
} from '@rlabs-inc/tui'
```

## t (Theme Accessors)

Reactive theme color accessors.

### Usage

```typescript
import { t } from '@rlabs-inc/tui'

box({
  borderColor: t.primary,  // Reactive!
  bg: t.surface,
  children: () => {
    text({ content: 'Title', fg: t.text })
    text({ content: 'Muted', fg: t.textMuted })
  }
})
```

### Available Colors

#### Main Palette

| Accessor | Description |
|----------|-------------|
| `t.primary` | Primary brand color |
| `t.secondary` | Secondary accent |
| `t.tertiary` | Tertiary color |
| `t.accent` | Highlight/accent |

#### Semantic Colors

| Accessor | Description |
|----------|-------------|
| `t.success` | Success/positive |
| `t.warning` | Warning/caution |
| `t.error` | Error/danger |
| `t.info` | Informational |

#### Text Colors

| Accessor | Description |
|----------|-------------|
| `t.text` | Primary text |
| `t.textMuted` | Muted text |
| `t.textDim` | Dimmed text |
| `t.textDisabled` | Disabled text |
| `t.textBright` | Bright/emphasized text |

#### Background Colors

| Accessor | Description |
|----------|-------------|
| `t.bg` | Primary background |
| `t.bgMuted` | Muted background |
| `t.surface` | Surface (cards, panels) |
| `t.overlay` | Overlay (modals) |

#### Border Colors

| Accessor | Description |
|----------|-------------|
| `t.border` | Default border |
| `t.borderFocus` | Focused border |

---

## theme

Raw theme state object. Use for reading/writing theme values.

### Properties

```typescript
theme.primary      // ThemeColor
theme.secondary    // ThemeColor
theme.tertiary     // ThemeColor
theme.accent       // ThemeColor
theme.success      // ThemeColor
theme.warning      // ThemeColor
theme.error        // ThemeColor
theme.info         // ThemeColor
theme.text         // ThemeColor
theme.textMuted    // ThemeColor
theme.textDim      // ThemeColor
theme.textDisabled // ThemeColor
theme.textBright   // ThemeColor
theme.background   // ThemeColor
theme.backgroundMuted // ThemeColor
theme.surface      // ThemeColor
theme.overlay      // ThemeColor
theme.border       // ThemeColor
theme.borderFocus  // ThemeColor
theme.name         // string
theme.description  // string
```

### ThemeColor Type

```typescript
type ThemeColor = null | number | string
// null: Terminal default
// 0-15: ANSI 16 colors
// 16-255: ANSI 256 colors
// > 255: RGB (0xRRGGBB)
// string: CSS color (hex, rgb, oklch, etc.)
```

### Example

```typescript
// Read current theme color
console.log(theme.primary)  // 12 (ANSI bright blue)

// Modify single color
theme.primary = '#ff0000'
theme.error = 0xff0000

// Use OKLCH for perceptual uniformity
theme.primary = 'oklch(0.7 0.15 250)'
```

---

## setTheme()

Apply a theme preset or custom theme.

### Signature

```typescript
function setTheme(
  themeNameOrObject: keyof typeof themes | Partial<typeof theme>
): void
```

### Examples

```typescript
// Apply preset
setTheme('dracula')
setTheme('nord')
setTheme('monokai')
setTheme('solarized')
setTheme('terminal')  // Reset to defaults

// Apply partial custom theme
setTheme({
  primary: '#007acc',
  secondary: '#d73a49',
  success: '#28a745'
})

// Apply full custom theme
setTheme({
  name: 'custom',
  description: 'My custom theme',
  primary: '#6200ee',
  secondary: '#03dac6',
  // ... all other colors
})
```

---

## themes

Built-in theme presets.

### Available Themes

```typescript
themes.terminal   // Default - uses terminal colors
themes.dracula    // Dracula dark theme
themes.nord       // Nord arctic theme
themes.monokai    // Monokai vibrant theme
themes.solarized  // Solarized dark theme
```

### Accessing Preset Colors

```typescript
console.log(themes.dracula.primary)  // 'oklch(0.75 0.15 300)'
console.log(themes.nord.background)  // 0x2e3440
```

---

## resolveColor()

Resolve a ThemeColor to RGBA.

### Signature

```typescript
function resolveColor(color: ThemeColor): RGBA
```

### Examples

```typescript
resolveColor(null)        // TERMINAL_DEFAULT
resolveColor(12)          // { r: 85, g: 85, b: 255, a: 255 } (ANSI bright blue)
resolveColor(0xff0000)    // { r: 255, g: 0, b: 0, a: 255 }
resolveColor('#00ff00')   // { r: 0, g: 255, b: 0, a: 255 }
resolveColor('oklch(0.7 0.15 250)')  // Parsed OKLCH
```

---

## resolvedTheme

Reactive derived with all colors resolved to RGBA.

### Usage

```typescript
import { resolvedTheme } from '@rlabs-inc/tui'

effect(() => {
  const colors = resolvedTheme.value
  console.log('Primary:', colors.primary)  // RGBA object
})
```

---

## Variants

### getVariantStyle()

Get styles for a variant.

```typescript
function getVariantStyle(variant: Variant): VariantStyle
```

```typescript
interface VariantStyle {
  fg: RGBA
  bg: RGBA
  border: RGBA
  borderFocus: RGBA
}
```

### variantStyle()

Reactive variant style derived.

```typescript
function variantStyle(variant: Variant): DerivedSignal<VariantStyle>
```

### Available Variants

```typescript
type Variant =
  | 'default'
  | 'primary' | 'secondary' | 'tertiary' | 'accent'
  | 'success' | 'warning' | 'error' | 'info'
  | 'muted' | 'surface' | 'elevated'
  | 'ghost' | 'outline'
```

### Example

```typescript
// Using variant prop
box({
  variant: 'primary',
  children: () => text({ content: 'Primary Button' })
})

// Manual variant styles
const style = getVariantStyle('error')
box({
  bg: style.bg,
  border: BorderStyle.SINGLE,
  borderColor: style.border,
  children: () => text({ content: 'Error', fg: style.fg })
})
```

---

## ANSI Code Generation

### toAnsiFg()

Get ANSI foreground code.

```typescript
function toAnsiFg(color: ThemeColor): string
```

### toAnsiBg()

Get ANSI background code.

```typescript
function toAnsiBg(color: ThemeColor): string
```

### Example

```typescript
const code = toAnsiFg(theme.primary)
process.stdout.write(code + 'Colored text' + '\x1b[0m')
```

---

## Color Formats

### ANSI Colors (0-15)

| Index | Color |
|-------|-------|
| 0 | Black |
| 1 | Red |
| 2 | Green |
| 3 | Yellow |
| 4 | Blue |
| 5 | Magenta |
| 6 | Cyan |
| 7 | White |
| 8-15 | Bright variants |

### Extended Palette (16-255)

- 16-231: 6x6x6 color cube
- 232-255: Grayscale (24 shades)

### RGB (> 255)

```typescript
const red = 0xff0000
const green = 0x00ff00
const blue = 0x0000ff
```

### CSS Strings

```typescript
'#ff0000'              // Hex
'rgb(255, 0, 0)'       // RGB
'rgba(255, 0, 0, 0.5)' // RGBA
'oklch(0.7 0.15 250)'  // OKLCH (perceptually uniform)
```

## See Also

- [Themes Guide](../guides/styling/themes.md)
- [Colors Guide](../guides/styling/colors.md)
- [Types](./types.md)
