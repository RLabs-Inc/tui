# Parallel Arrays

> ECS-style data storage for components

## Overview

TUI uses an Entity Component System (ECS) inspired architecture where:
- Each **index** represents a component (entity)
- Each **array** stores one property type (component data)
- Components write via `setSource()` to preserve reactivity

This is fundamentally different from traditional component trees.

## Why Parallel Arrays?

### Traditional Approach (Objects)

```typescript
// Traditional: Objects with nested properties
const component = {
  type: 'box',
  width: 40,
  height: 10,
  bg: { r: 255, g: 0, b: 0, a: 255 },
  children: [...]
}

// Problems:
// - Hard to iterate all widths
// - Cache-unfriendly memory layout
// - Reconciliation required on update
```

### TUI Approach (Parallel Arrays)

```typescript
// TUI: Flat arrays, index-based
componentType[0] = 'box'
width.setSource(0, 40)
height.setSource(0, 10)
bgColor.setSource(0, { r: 255, g: 0, b: 0, a: 255 })

// Benefits:
// - Cache-friendly iteration
// - Direct updates (no reconciliation)
// - Fine-grained reactivity per property
```

## Array Groups

### Core Arrays

```typescript
// engine/arrays/core.ts
export const componentType: ComponentType[] = []
export const parentIndex: SlotArray<number>     // Parent reference
export const firstChildIndex: SlotArray<number> // First child
export const nextSiblingIndex: SlotArray<number> // Next sibling
export const visible: SlotArray<boolean>         // Visibility
```

### Dimension Arrays

```typescript
// engine/arrays/dimensions.ts
export const width: SlotArray<Dimension>
export const height: SlotArray<Dimension>
export const minWidth: SlotArray<Dimension>
export const maxWidth: SlotArray<Dimension>
export const minHeight: SlotArray<Dimension>
export const maxHeight: SlotArray<Dimension>
```

### Spacing Arrays

```typescript
// engine/arrays/spacing.ts
// Per-side margin (no general margin array)
export const marginTop: SlotArray<number>
export const marginRight: SlotArray<number>
export const marginBottom: SlotArray<number>
export const marginLeft: SlotArray<number>
// Per-side padding (no general padding array)
export const paddingTop: SlotArray<number>
export const paddingRight: SlotArray<number>
export const paddingBottom: SlotArray<number>
export const paddingLeft: SlotArray<number>
// Gap
export const gap: SlotArray<number>
export const rowGap: SlotArray<number>
export const columnGap: SlotArray<number>
```

### Layout Arrays

```typescript
// engine/arrays/layout.ts
export const flexDirection: SlotArray<FlexDirection>
export const flexWrap: SlotArray<FlexWrap>
export const justifyContent: SlotArray<JustifyContent>
export const alignItems: SlotArray<AlignItems>
export const alignSelf: SlotArray<AlignSelf>
export const grow: SlotArray<number>
export const shrink: SlotArray<number>
export const flexBasis: SlotArray<number>
export const overflow: SlotArray<Overflow>
export const zIndex: SlotArray<number>
```

### Visual Arrays

```typescript
// engine/arrays/visual.ts
export const fgColor: SlotArray<RGBA | null>
export const bgColor: SlotArray<RGBA | null>
export const opacity: SlotArray<number>
export const borderStyle: SlotArray<number>
export const borderColor: SlotArray<RGBA | null>
export const borderTop: SlotArray<number>
// ... per-side borders
```

### Text Arrays

```typescript
// engine/arrays/text.ts
export const textContent: SlotArray<string>
export const textAlign: SlotArray<TextAlign>
export const textWrap: SlotArray<TextWrap>
export const textAttrs: SlotArray<CellAttrs>
```

### Interaction Arrays

```typescript
// engine/arrays/interaction.ts
export const focusable: SlotArray<boolean>
export const tabIndex: SlotArray<number>
export const focusedIndex: WritableSignal<number>
export const scrollOffsetX: SlotArray<number>
export const scrollOffsetY: SlotArray<number>
```

## SlotArray

`SlotArray` is a reactive array wrapper that enables fine-grained reactivity:

```typescript
// Simplified SlotArray interface
interface SlotArray<T> {
  // Get value at index (creates dependency)
  [index: number]: T

  // Set source for index
  setSource(index: number, source: T | Signal<T> | (() => T)): void

  // Set value directly
  setValue(index: number, value: T): void

  // Get raw binding
  getBinding(index: number): Binding<T>
}
```

### Usage in Primitives

```typescript
// In box.ts
export function box(props: BoxProps): Cleanup {
  const index = allocateIndex()

  // Set sources - preserves reactivity
  dimensions.width.setSource(index, props.width ?? 0)
  dimensions.height.setSource(index, props.height ?? 0)
  visual.bgColor.setSource(index, props.bg ?? null)

  // ...

  return () => releaseIndex(index)
}
```

### Reading Values

```typescript
// In derived (tracked)
const w = dimensions.width[index]  // Creates dependency

// Untracked read
const w = dimensions.width.getBinding(index).peek()
```

## Index Allocation

```typescript
// engine/registry.ts
const allocated = new Set<number>()
const released: number[] = []  // Reuse pool

export function allocateIndex(id?: string): number {
  // Try reuse pool first
  if (released.length > 0) {
    const index = released.pop()!
    allocated.add(index)
    return index
  }

  // Allocate new
  const index = allocated.size
  allocated.add(index)
  return index
}

export function releaseIndex(index: number): void {
  allocated.delete(index)
  released.push(index)

  // Clear array entries
  clearArraysAt(index)
}
```

## Parent-Child Relationships

Components track relationships via indices:

```typescript
// Building tree from flat arrays
function buildTree(indices: Set<number>): TreeNode[] {
  const roots: TreeNode[] = []
  const nodeMap = new Map<number, TreeNode>()

  // Create nodes
  for (const i of indices) {
    nodeMap.set(i, { index: i, children: [] })
  }

  // Link parent-child
  for (const i of indices) {
    const parent = core.parentIndex[i]
    if (parent === -1) {
      roots.push(nodeMap.get(i)!)
    } else {
      nodeMap.get(parent)?.children.push(nodeMap.get(i)!)
    }
  }

  return roots
}
```

## Critical Rules

### 1. Use SlotArray, Not state()

```typescript
// WRONG: state() snapshots values
const widths = state<number[]>([])
widths[0] = props.width  // Loses reactivity!

// RIGHT: SlotArray preserves reactivity
dimensions.width.setSource(0, props.width)  // Reactive link maintained
```

### 2. Bind Props Directly

```typescript
// WRONG: Extract then bind
const w = props.width?.value ?? 0
dimensions.width.setSource(index, w)  // Static value!

// RIGHT: Bind the prop directly
dimensions.width.setSource(index, props.width ?? 0)  // Signal passes through
```

### 3. Read in Derived Context

```typescript
// Reading in derived creates dependencies
const layoutDerived = derived(() => {
  for (const i of indices) {
    const w = dimensions.width[i]  // Tracked!
    // ...
  }
})
```

## Performance Benefits

### Cache Locality

When iterating widths, data is contiguous:

```typescript
// All widths are adjacent in memory
for (const i of indices) {
  totalWidth += dimensions.width[i]
}
```

### No Reconciliation

Updates are direct - no diffing needed:

```typescript
// Traditional: diff, patch, reconcile
// TUI: direct write, reactive system handles updates
dimensions.width.setSource(index, newWidth)
```

### Fine-Grained Updates

Only changed properties trigger updates:

```typescript
// Only width subscribers notified
dimensions.width.setSource(index, 50)

// Height, color, etc. unaffected
```

## See Also

- [Architecture](../architecture.md)
- [TITAN Engine](./titan-engine.md)
- [Pipeline](./pipeline.md)
