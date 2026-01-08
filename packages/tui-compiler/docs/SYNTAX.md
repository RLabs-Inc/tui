# TUI Template Syntax

Complete guide to the `.tui` file format.

## File Structure

A `.tui` file has two main sections:

```tui
<script lang="ts">
  // Component logic here
</script>

<!-- Template here -->
<box>
  <text>Hello World</text>
</box>
```

## Script Block

### Basic Script

```tui
<script>
  const count = signal(0)
</script>
```

### TypeScript

```tui
<script lang="ts">
  interface User {
    name: string
    age: number
  }

  const user = signal<User>({ name: '', age: 0 })
</script>
```

### Props (Exports)

Components receive props via `export let`:

```tui
<script>
  export let label = 'Click me'     // Optional with default
  export let variant = 'primary'    // Optional with default
  export let onClick                // Required (no default)
</script>
```

With TypeScript:

```tui
<script lang="ts">
  export let label: string = 'Click me'
  export let count: number
  export let onChange: (value: string) => void
</script>
```

### Reactive Primitives

All primitives from `@rlabs-inc/signals` are auto-imported:

```tui
<script>
  // Core
  const count = signal(0)                           // Writable signal
  const user = state({ name: '', age: 0 })          // Deep reactive object
  const doubled = derived(() => count.value * 2)   // Computed value
  effect(() => console.log(count.value))            // Side effect

  // Advanced
  const selection = linkedSignal(() => items.value[0])  // Auto-reset
  const isSelected = createSelector(() => selectedId.value)  // O(2) optimization
  const scope = effectScope()                       // Grouped effects

  // Utilities
  batch(() => { a.value = 1; b.value = 2 })        // Batch updates
  const raw = untrack(() => count.value)            // Read without tracking
</script>
```

### Component Imports

Import other `.tui` components:

```tui
<script>
  import Button from './Button.tui'
  import { Card, Modal } from './components/index.tui'
</script>

<Button label="Click me" />
<Card>Content</Card>
```

## Template Syntax

### Elements

Built-in TUI components:

```tui
<box>           <!-- Container with flexbox -->
<text>          <!-- Text display -->
<input>         <!-- Text input (coming soon) -->
<select>        <!-- Selection (coming soon) -->
<progress>      <!-- Progress bar (coming soon) -->
<canvas>        <!-- Raw drawing (coming soon) -->
```

### Attributes

#### Static Attributes

```tui
<box width="50" height="10" border="1">
<text variant="primary">
```

#### Dynamic Attributes

```tui
<box width={containerWidth}>
<text variant={isError ? 'error' : 'default'}>
```

#### Shorthand

When the attribute name matches a variable:

```tui
<script>
  const width = '50%'
  const variant = 'primary'
</script>

<!-- Shorthand: {width} equals width={width} -->
<box {width} {variant}>
```

#### Spread

```tui
<script>
  const boxProps = { width: '100%', border: 1, padding: 1 }
</script>

<box {...boxProps}>
```

### Text Content

#### Static Text

```tui
<text>Hello World</text>
```

#### Dynamic Text

```tui
<text>Count: {count}</text>
<text>Hello, {user.name}!</text>
```

> **Unified Syntax**: In text content, you don't need `.value` for signals or deriveds.
> The compiler automatically handles all reactive types:
> - `{mySignal}` - signal values are extracted
> - `{myDerived}` - derived values are extracted
> - `{myState.property}` - state proxies work directly
> - `{plainValue}` - plain values pass through
>
> This means `{count}` works whether `count` is a `signal()`, `derived()`, or plain value.

#### Mixed Content

```tui
<text>You have {items.length} items in your cart</text>
```

### Event Handling

Use the `keyboard` and `mouse` modules in your `<script>` section:

```tui
<script>
  import { keyboard, mouse } from '@rlabs-inc/tui'

  // Global key handlers
  keyboard.onKey('Enter', () => console.log('Enter pressed'))
  keyboard.onKey('Escape', () => console.log('Escape pressed'))

  // Focus-scoped handlers (only fire when component is focused)
  // keyboard.onFocused(componentIndex, handler)

  // Mouse handlers
  // mouse.onClick(handler)
</script>

<box focusable>
  <text>Press Enter or Escape</text>
</box>
```

> **Note**: Template event syntax (`on:click`, `on:key:enter`) is not yet implemented.
> Use the keyboard/mouse APIs in `<script>` for full control.

### Two-Way Binding

```tui
<input bind:value={username} />
<select bind:value={selectedOption} />
```

## Control Flow

### Conditionals

#### If

```tui
{#if condition}
  <text>Shown when true</text>
{/if}
```

#### If/Else

```tui
{#if loggedIn}
  <text>Welcome back!</text>
{:else}
  <text>Please log in</text>
{/if}
```

#### If/Else If/Else

```tui
{#if status === 'loading'}
  <text>Loading...</text>
{:else if status === 'error'}
  <text variant="error">Error occurred</text>
{:else}
  <text>Ready</text>
{/if}
```

### Loops

#### Basic Each

```tui
{#each items as item}
  <text>{item.name}</text>
{/each}
```

#### With Index

```tui
{#each items as item, index}
  <text>{index + 1}. {item.name}</text>
{/each}
```

#### With Key (for efficient updates)

```tui
{#each items as item, index (item.id)}
  <text>{item.name}</text>
{/each}
```

> **Note**: Key expressions are parsed but not yet used for diffing optimization. They're included for future compatibility and Svelte syntax parity.

#### Empty State

```tui
{#each items as item}
  <text>{item.name}</text>
{:else}
  <text variant="muted">No items yet</text>
{/each}
```

### Async/Await

```tui
{#await fetchUser()}
  <text>Loading...</text>
{:then user}
  <text>Hello, {user.name}!</text>
{:catch error}
  <text variant="error">{error.message}</text>
{/await}
```

## Fragments

Render multiple elements without a wrapper:

```tui
<>
  <text>Line 1</text>
  <text>Line 2</text>
  <text>Line 3</text>
</>
```

## Slots (Component Children)

### Default Slot

```tui
<!-- Card.tui -->
<box border={1} padding={1}>
  <slot />
</box>

<!-- Usage -->
<Card>
  <text>Card content</text>
</Card>
```

### Slot Fallback Content

Provide default content when no slot content is provided:

```tui
<!-- Button.tui -->
<box border={1} padding={1}>
  <slot>
    <text>Default button text</text>
  </slot>
</box>

<!-- Usage without children - shows fallback -->
<Button />

<!-- Usage with children - replaces fallback -->
<Button>
  <text>Custom text</text>
</Button>
```

### Named Slots

```tui
<!-- Dialog.tui -->
<box border={1}>
  <slot name="header" />
  <slot />
  <slot name="footer" />
</box>

<!-- Usage -->
<Dialog>
  <text slot="header">Title</text>
  <text>Body content</text>
  <text slot="footer">Actions</text>
</Dialog>
```

## Component Example

Complete component example:

```tui
<script lang="ts">
  // Props
  export let title: string
  export let initialCount: number = 0

  // State
  const count = signal(initialCount)
  const doubled = derived(() => count.value * 2)

  // Methods
  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }
</script>

<box width="100%" border={1} padding={1} flexDirection="column" gap={1}>
  <text variant="accent">{title}</text>

  <box flexDirection="row" gap={2}>
    <text>Count: {count}</text>
    <text variant="muted">(doubled: {doubled})</text>
  </box>

  {#if count.value > 10}
    <text variant="warning">That's a lot!</text>
  {/if}

  <text variant="muted">Press +/- to change</text>
</box>
```
