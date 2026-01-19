# Signals Package Exploration & TrackedSlotArray Design
**Date:** January 19, 2026  
**Context:** 75% full - This document preserves critical findings  
**Purpose:** Design new reactive primitives for TUI dirty tracking without modifying existing signals package

---

## CRITICAL CONTEXT

**Projects involved:**
1. **@rlabs-inc/signals** - `/Users/rusty/Documents/Projects/AI/Tools/ClaudeTools/memory-ts/packages/signals`
   - Standalone reactivity library (v1.9.0)
   - Used by MULTIPLE projects
   - **DO NOT MODIFY EXISTING PRIMITIVES**

2. **@rlabs-inc/tui** - `/Users/rusty/Documents/Projects/TUI/tui`
   - Terminal UI framework
   - Depends on signals package
   - Needs dirty tracking for performance

**Goal:** Add NEW primitives to signals package for dirty tracking without breaking existing functionality.

---

## Part 1: Signals Package Architecture

### 1.1 Package Structure

```
/Users/rusty/.../signals/
├── src/
│   ├── core/              # Foundation
│   │   ├── types.ts       # TypeScript interfaces
│   │   ├── constants.ts   # Flags (DIRTY, CLEAN, etc.)
│   │   └── globals.ts     # Tracking state
│   ├── primitives/        # User-facing APIs
│   │   ├── signal.ts      # signal(), source(), state()
│   │   ├── derived.ts     # derived()
│   │   ├── effect.ts      # effect()
│   │   ├── bind.ts        # bind(), bindReadonly()
│   │   ├── linked.ts      # linkedSignal()
│   │   ├── selector.ts    # createSelector()
│   │   ├── scope.ts       # effectScope()
│   │   ├── slot.ts        # slot(), slotArray()
│   │   └── props.ts       # reactiveProps()
│   ├── collections/       # Reactive collections
│   │   ├── map.ts         # ReactiveMap
│   │   ├── set.ts         # ReactiveSet
│   │   └── date.ts        # ReactiveDate
│   ├── reactivity/        # Core algorithms
│   │   ├── tracking.ts    # get(), set()
│   │   ├── scheduling.ts  # flushSync()
│   │   ├── batching.ts    # batch(), untrack()
│   │   └── equality.ts    # Equality functions
│   ├── deep/
│   │   └── proxy.ts       # Deep reactivity
│   └── index.ts           # Public exports
├── test/
│   ├── unit/              # Unit tests per primitive
│   ├── integration/       # Integration tests
│   ├── performance/       # Perf benchmarks
│   └── slot.test.ts       # Comprehensive slot tests
├── dist/                  # Built files
├── package.json           # Build config
└── CLAUDE.md              # Development guide
```

**Total:** 64 TypeScript files

**Build process:**
```bash
bun run build
# 1. Compiles to ESM: dist/index.mjs
# 2. Compiles to CJS: dist/index.js  
# 3. Generates types: dist/index.d.ts
```

**Test process:**
```bash
bun test                    # All tests
bun test test/unit/         # Unit tests only
bun test test/slot.test.ts  # Single file
```

---

### 1.2 Existing Primitives Analysis

| Primitive | File | LOC | Purpose | Pattern |
|-----------|------|-----|---------|---------|
| `signal()` | signal.ts | 152 | Writable reactive value | Source with version tracking |
| `derived()` | derived.ts | 217 | Computed value | Reaction with caching |
| `effect()` | effect.ts | 335 | Side effect runner | Reaction that schedules |
| `bind()` | bind.ts | 362 | Two-way binding | Wrapper with static optimization |
| `linkedSignal()` | linked.ts | 209 | Resettable derived | Derived + effect.pre combo |
| `createSelector()` | selector.ts | 175 | O(2) selection | Map of key→reactions |
| `effectScope()` | scope.ts | 286 | Grouped effects | Tree of effects |
| `slot()` / `slotArray()` | slot.ts | 448 | Stable reactive cell | Source + proxy |
| `reactiveProps()` | props.ts | 140 | Normalize props | Wrapper utility |
| `ReactiveMap` | collections/map.ts | 273 | Per-key reactive map | Map + per-key signals |
| `ReactiveSet` | collections/set.ts | 229 | Per-item reactive set | Set + per-item signals |
| `ReactiveDate` | collections/date.ts | ~250 | Reactive date | Date wrapper |

**Total primitives:** 12  
**Most complex:** slot.ts (448 LOC)  
**Most used in TUI:** slotArray (all component arrays)

---

### 1.3 SlotArray Deep Dive

**Current implementation** (slot.ts:316-437):

```typescript
export function slotArray<T>(defaultValue?: T): SlotArray<T> {
  const slots: Slot<T>[] = []

  const ensureCapacity = (index: number): void => {
    while (slots.length <= index) {
      slots.push(slot(defaultValue))
    }
  }

  // Proxy for array-like access
  const proxy = new Proxy({} as SlotArray<T>, {
    get(_, prop) {
      // Numeric index - read value
      if (typeof prop === 'string') {
        const index = Number(prop)
        if (!isNaN(index) && index >= 0) {
          ensureCapacity(index)
          return slots[index].value  // Auto-unwraps, auto-tracks!
        }
      }

      // Named properties
      switch (prop) {
        case 'setSource':
          return (index: number, source: T | WritableSignal<T> | ReadableSignal<T> | (() => T)) => {
            ensureCapacity(index)
            slots[index].source = source  // ← HOOK POINT!
          }

        case 'setValue':
          return (index: number, value: T) => {
            ensureCapacity(index)
            slots[index].set(value)  // ← HOOK POINT!
          }

        // ... other methods
      }
    }
  })

  return proxy
}
```

**Key observations:**
1. Uses Proxy for array-like access
2. Each slot is created lazily (ensureCapacity)
3. `setSource` and `setValue` are the write entry points
4. Slots array is private (can't be accessed directly)
5. Proxy is type-safe via interface

**Perfect for intercepting writes!**

---

### 1.4 ReactiveSet Pattern

**How ReactiveSet achieves dirty tracking** (set.ts:64-228):

```typescript
export class ReactiveSet<T> extends Set<T> {
  // Per-item signals
  #itemSignals = new Map<T, Source<boolean>>()
  
  // Version signal for structural changes
  #version: Source<number> = source(0)
  
  // Size signal
  #size: Source<number>

  add(item: T): this {
    const isNew = !super.has(item)
    super.add(item)
    
    if (isNew) {
      const sig = this.#getItemSignal(item)
      set(sig, true)  // Notify item signal
      set(this.#size, super.size)  // Notify size
      this.#incrementVersion()  // Notify version
    }
    
    return this
  }

  has(item: T): boolean {
    const sig = this.#itemSignals.get(item)
    if (sig === undefined) {
      const exists = super.has(item)
      if (exists) {
        const newSig = this.#getItemSignal(item)
        get(newSig)  // Track this item
        return true
      }
      get(this.#version)  // Track structural changes
      return false
    }
    get(sig)  // Track this specific item
    return super.has(item)
  }
}
```

**Three levels of reactivity:**
1. **Per-item:** `has('foo')` only tracks 'foo'
2. **Size:** `size` only tracks count changes
3. **Version:** Iteration tracks all structural changes

**This is the pattern we need!**

---

### 1.5 Test Patterns

**From slot.test.ts (200+ lines):**

```typescript
import { describe, test, expect } from 'bun:test'
import { slot, slotArray, signal, derived, effect, flushSync } from '../src/index'

describe('slotArray', () => {
  describe('basic operations', () => {
    test('creates empty array', () => {
      const arr = slotArray<number>(0)
      expect(arr.length).toBe(0)
    })

    test('auto-expands on access', () => {
      const arr = slotArray<number>(0)
      expect(arr[5]).toBe(0)  // Accesses index 5
      expect(arr.length).toBe(6)  // Array expanded to 6
    })

    test('setSource updates value', () => {
      const arr = slotArray<string>('')
      const sig = signal('hello')
      
      arr.setSource(0, sig)
      expect(arr[0]).toBe('hello')
      
      sig.value = 'world'
      expect(arr[0]).toBe('world')
    })

    test('tracks changes', () => {
      const arr = slotArray<number>(0)
      const sig = signal(42)
      arr.setSource(0, sig)

      const calls: number[] = []
      effect(() => {
        calls.push(arr[0])
      })
      flushSync()
      expect(calls).toEqual([42])

      sig.value = 99
      flushSync()
      expect(calls).toEqual([42, 99])
    })
  })
})
```

**Testing requirements:**
1. Import from main index (not individual files)
2. Use `flushSync()` after mutations
3. Test reactivity with `effect()`
4. Test all method variants
5. Test edge cases (undefined, 0, null)

---

## Part 2: Design for TrackedSlotArray

### 2.1 Requirements

**Must have:**
- ✅ Same API as slotArray (drop-in compatible)
- ✅ Tracks which indices were written to
- ✅ Integrates with ReactiveSet
- ✅ Zero overhead when not using tracking
- ✅ Type-safe
- ✅ Well-tested

**Must not:**
- ❌ Modify existing slotArray
- ❌ Break backwards compatibility
- ❌ Add runtime overhead to regular slotArray
- ❌ Require changes to TUI's existing code (beyond swapping function)

---

### 2.2 Design Option 1: Wrapper Function

**File:** `src/primitives/tracked-slot.ts` (NEW)

```typescript
import { slotArray, type SlotArray } from './slot.js'
import { ReactiveSet } from '../collections/set.js'
import type { WritableSignal, ReadableSignal } from '../core/types.js'

/**
 * A SlotArray that tracks which indices have been written to.
 * 
 * Extends slotArray with automatic dirty tracking via ReactiveSet.
 * When setSource() or setValue() is called, the index is marked dirty.
 * 
 * @param defaultValue - Default value for new slots
 * @param dirtySet - ReactiveSet to track dirty indices
 * @returns Enhanced SlotArray with dirty tracking
 * 
 * @example
 * ```ts
 * const dirtyIndices = new ReactiveSet<number>()
 * const textContent = trackedSlotArray('', dirtyIndices)
 * 
 * textContent.setSource(5, signal('hello'))  // dirtyIndices has 5
 * 
 * // In a derived:
 * derived(() => {
 *   const dirty = Array.from(dirtyIndices)
 *   if (dirty.length === 0) return cached
 *   // ... process dirty indices
 * })
 * ```
 */
export function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): SlotArray<T> {
  const baseArray = slotArray<T>(defaultValue)

  // Store original methods
  const originalSetSource = baseArray.setSource.bind(baseArray)
  const originalSetValue = baseArray.setValue.bind(baseArray)

  // Wrap setSource to mark dirty
  baseArray.setSource = (
    index: number,
    source: T | WritableSignal<T> | ReadableSignal<T> | (() => T)
  ) => {
    originalSetSource(index, source)
    dirtySet.add(index)  // Mark dirty!
  }

  // Wrap setValue to mark dirty
  baseArray.setValue = (index: number, value: T) => {
    originalSetValue(index, value)
    dirtySet.add(index)  // Mark dirty!
  }

  return baseArray
}
```

**Pros:**
- ✅ Simple wrapper pattern (35 lines)
- ✅ No modifications to existing code
- ✅ Easy to test
- ✅ Zero overhead for regular slotArray

**Cons:**
- ⚠️ Mutates methods (might confuse debuggers)
- ⚠️ Relies on `bind()` to preserve `this`

---

### 2.3 Design Option 2: Extended Proxy

**File:** `src/primitives/tracked-slot.ts` (NEW)

```typescript
export function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): SlotArray<T> {
  const slots: Slot<T>[] = []

  const ensureCapacity = (index: number): void => {
    while (slots.length <= index) {
      slots.push(slot(defaultValue))
    }
  }

  // Nearly identical to slotArray, but with dirty tracking
  const proxy = new Proxy({} as SlotArray<T>, {
    get(_, prop) {
      if (typeof prop === 'string') {
        const index = Number(prop)
        if (!isNaN(index) && index >= 0) {
          ensureCapacity(index)
          return slots[index].value
        }
      }

      switch (prop) {
        case 'setSource':
          return (index: number, source: any) => {
            ensureCapacity(index)
            slots[index].source = source
            dirtySet.add(index)  // ← ONLY DIFFERENCE
          }

        case 'setValue':
          return (index: number, value: T) => {
            ensureCapacity(index)
            slots[index].set(value)
            dirtySet.add(index)  // ← ONLY DIFFERENCE
          }

        // ... rest identical to slotArray
      }
    }
  })

  return proxy
}
```

**Pros:**
- ✅ No method mutation
- ✅ Clean implementation
- ✅ Easy to maintain (copy-paste from slot.ts)

**Cons:**
- ⚠️ Code duplication (~100 lines)
- ⚠️ Must sync with slot.ts changes

---

### 2.4 Design Option 3: Factory with Callback

**File:** `src/primitives/slot.ts` (MODIFY - but backwards compatible)

```typescript
export interface SlotArrayOptions<T> {
  defaultValue?: T
  onChange?: (index: number, type: 'source' | 'value') => void
}

export function slotArray<T>(
  options: T | SlotArrayOptions<T>
): SlotArray<T> {
  // Backwards compatibility
  const opts = typeof options === 'object' && 'onChange' in options
    ? options as SlotArrayOptions<T>
    : { defaultValue: options as T }

  const defaultValue = opts.defaultValue
  const onChange = opts.onChange

  // ... rest of implementation

  switch (prop) {
    case 'setSource':
      return (index: number, source: any) => {
        ensureCapacity(index)
        slots[index].source = source
        onChange?.(index, 'source')  // ← NEW
      }
  }
}
```

Then in separate file:

```typescript
export function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): SlotArray<T> {
  return slotArray({
    defaultValue,
    onChange: (index) => dirtySet.add(index)
  })
}
```

**Pros:**
- ✅ Generic callback system (useful beyond dirty tracking)
- ✅ Minimal code in trackedSlotArray
- ✅ Backwards compatible

**Cons:**
- ❌ MODIFIES existing primitive
- ❌ Adds runtime check to every write
- ❌ Risk to existing projects

**REJECTED:** Too risky for existing users.

---

### 2.5 Recommended Design: Option 1 (Wrapper)

**Why:**
1. ✅ Zero risk to existing code
2. ✅ Simple implementation
3. ✅ Easy to test
4. ✅ Can iterate quickly

**Implementation plan:**

```
src/primitives/tracked-slot.ts  (NEW - 80 lines)
test/unit/tracked-slot.test.ts  (NEW - 200 lines)
src/index.ts                    (MODIFY - add 1 export)
```

**Changes to index.ts:**

```typescript
// Add to imports
export { trackedSlotArray } from './primitives/tracked-slot.js'

// Add to types (if needed)
export type { TrackedSlotArray } from './primitives/tracked-slot.js'
```

---

## Part 3: Integration with TUI

### 3.1 Current TUI Usage

**File:** `/Users/rusty/Documents/Projects/TUI/tui/src/engine/arrays/text.ts`

```typescript
import { slotArray } from '@rlabs-inc/signals'

export const textContent = slotArray<string | number | null>('')
export const textAlign = slotArray<TextAlign>('left')
export const textWrap = slotArray<boolean>(true)
export const ellipsis = slotArray<boolean>(false)
export const textAttrs = slotArray<number>(0)
```

**Change to:**

```typescript
import { trackedSlotArray, ReactiveSet } from '@rlabs-inc/signals'

// Dirty set for text changes
const dirtyText = new ReactiveSet<number>()
export { dirtyText }  // Export for use in layout

export const textContent = trackedSlotArray<string | number | null>('', dirtyText)
export const textAlign = slotArray<TextAlign>('left')  // Not layout-affecting
export const textWrap = slotArray<boolean>(true)  // Could track separately
export const ellipsis = slotArray<boolean>(false)
export const textAttrs = slotArray<number>(0)  // Visual only
```

---

### 3.2 Dirty Tracking Architecture in TUI

**File:** `src/engine/arrays/dirty.ts` (NEW in TUI)

```typescript
import { ReactiveSet } from '@rlabs-inc/signals'

/**
 * Dirty tracking sets for incremental computation.
 * 
 * Each set tracks component indices that have changed.
 * Deriveds can check these sets to skip computation.
 */

// Layout-affecting properties
export const dirtyLayout = new ReactiveSet<number>()

// Visual-only properties (colors, opacity, borders)
export const dirtyVisual = new ReactiveSet<number>()

// Text content (re-measure needed)
export const dirtyText = new ReactiveSet<number>()

// Hierarchy changes (parent/child relationships)
export const dirtyHierarchy = new ReactiveSet<number>()

// Scroll state
export const dirtyScroll = new ReactiveSet<number>()
```

---

### 3.3 Usage in Layout Derived

**File:** `/Users/rusty/Documents/Projects/TUI/tui/src/pipeline/layout/index.ts`

**Before:**
```typescript
export const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  return computeLayoutTitan(tw, th, getAllocatedIndices(), constrainHeight)
  // ^ Processes ALL components EVERY time
})
```

**After:**
```typescript
import { dirtyLayout, dirtyText, dirtyHierarchy } from '../engine/arrays/dirty'

let cachedLayout: ComputedLayout | null = null

export const layoutDerived = derived(() => {
  const tw = terminalWidth.value
  const th = terminalHeight.value
  
  // Check if anything layout-affecting changed
  const layoutChanged = dirtyLayout.size > 0
  const textChanged = dirtyText.size > 0
  const hierarchyChanged = dirtyHierarchy.size > 0
  
  // Fast path: nothing changed!
  if (!layoutChanged && !textChanged && !hierarchyChanged && cachedLayout) {
    return cachedLayout  // O(1) return!
  }
  
  // Something changed - compute layout
  const result = computeLayoutTitan(tw, th, getAllocatedIndices(), constrainHeight)
  
  // Clear dirty sets for next frame
  dirtyLayout.clear()
  dirtyText.clear()
  dirtyHierarchy.clear()
  
  cachedLayout = result
  return result
})
```

**Expected improvement:** 200x faster for static frames (2ms → 10μs)

---

## Part 4: Implementation Checklist

### 4.1 Phase 1: Add Primitive to Signals Package

**Week 1, Day 1-2:**

- [ ] Create `src/primitives/tracked-slot.ts`
  - [ ] Implement trackedSlotArray function
  - [ ] Add JSDoc documentation
  - [ ] Export TrackedSlotArray type

- [ ] Update `src/index.ts`
  - [ ] Add export for trackedSlotArray
  - [ ] Add to type exports

- [ ] Create `test/unit/tracked-slot.test.ts`
  - [ ] Test basic creation
  - [ ] Test setSource marking dirty
  - [ ] Test setValue marking dirty
  - [ ] Test with ReactiveSet
  - [ ] Test reactivity with effect()
  - [ ] Test clear operation
  - [ ] Test multiple writes to same index (should not duplicate)

- [ ] Run tests: `bun test test/unit/tracked-slot.test.ts`

- [ ] Build: `bun run build`

- [ ] Verify dist/ files generated

**Success criteria:** All tests pass, builds successfully.

---

### 4.2 Phase 2: Integrate with TUI

**Week 1, Day 3:**

- [ ] Create `src/engine/arrays/dirty.ts` in TUI
  - [ ] Export 5 ReactiveSet instances
  - [ ] Document each set's purpose

- [ ] Update `package.json` in TUI
  - [ ] Update signals version to local workspace (for testing)
  - [ ] Or publish signals package to npm

- [ ] Update `src/engine/arrays/text.ts`
  - [ ] Import trackedSlotArray
  - [ ] Import dirtyText from dirty.ts
  - [ ] Change textContent to trackedSlotArray
  - [ ] Export dirtyText

- [ ] Update `src/pipeline/layout/index.ts`
  - [ ] Import dirty sets
  - [ ] Add cache check logic
  - [ ] Clear dirty sets after computation

- [ ] Run TUI tests: `bun test`

**Success criteria:** No test regressions, layout still computes correctly.

---

### 4.3 Phase 3: Benchmark

**Week 1, Day 4:**

- [ ] Create `test/dirty-tracking-benchmark.ts` in TUI
  - [ ] 10k components
  - [ ] Measure: No changes (should skip)
  - [ ] Measure: One text change
  - [ ] Measure: One color change (should skip layout)
  - [ ] Compare before/after

- [ ] Run benchmark: `bun run test/dirty-tracking-benchmark.ts`

- [ ] Document results

**Success criteria:** 
- Static frame: <10μs (was 2ms) = 200x improvement
- Text change: <50μs (was 2ms) = 40x improvement

---

### 4.4 Phase 4: Expand Tracking

**Week 1, Day 5:**

- [ ] Update `src/engine/arrays/dimensions.ts`
  - [ ] Track width, height with dirtyLayout

- [ ] Update `src/engine/arrays/layout.ts`
  - [ ] Track all flex properties with dirtyLayout

- [ ] Update `src/engine/arrays/spacing.ts`
  - [ ] Track padding, margin, gap with dirtyLayout

- [ ] Update `src/engine/arrays/visual.ts`
  - [ ] Track colors with dirtyVisual

- [ ] Test all changes

**Success criteria:** Layout skips for visual-only changes.

---

## Part 5: Code Templates

### 5.1 Complete tracked-slot.ts

```typescript
// ============================================================================
// @rlabs-inc/signals - TrackedSlotArray
// A SlotArray variant that tracks writes via ReactiveSet
// ============================================================================

import { slotArray, type SlotArray } from './slot.js'
import { ReactiveSet } from '../collections/set.js'
import type { WritableSignal, ReadableSignal } from '../core/types.js'

/**
 * A SlotArray that automatically tracks which indices have been written to.
 * 
 * When setSource() or setValue() is called, the index is automatically
 * added to the provided ReactiveSet. This enables incremental computation
 * patterns where deriveds can check the dirty set to skip unchanged work.
 * 
 * @param defaultValue - Default value for new slots
 * @param dirtySet - ReactiveSet that will track dirty indices
 * @returns Enhanced SlotArray with dirty tracking
 * 
 * @example
 * ```ts
 * import { trackedSlotArray, ReactiveSet, derived } from '@rlabs-inc/signals'
 * 
 * const dirtyIndices = new ReactiveSet<number>()
 * const values = trackedSlotArray(0, dirtyIndices)
 * 
 * // Setting a value marks it dirty
 * values.setSource(5, signal(42))  // dirtyIndices now has 5
 * 
 * // Check dirty set in derived
 * const result = derived(() => {
 *   const dirty = Array.from(dirtyIndices)
 *   
 *   if (dirty.length === 0) {
 *     return cachedResult  // O(1) skip!
 *   }
 *   
 *   // Process only dirty indices
 *   for (const idx of dirty) {
 *     processValue(values[idx])
 *   }
 *   
 *   dirtyIndices.clear()  // Clear for next frame
 *   return newResult
 * })
 * ```
 */
export function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): SlotArray<T> {
  const baseArray = slotArray<T>(defaultValue)

  // Store original methods with proper binding
  const originalSetSource = baseArray.setSource.bind(baseArray)
  const originalSetValue = baseArray.setValue.bind(baseArray)

  // Wrap setSource to mark index as dirty
  baseArray.setSource = (
    index: number,
    source: T | WritableSignal<T> | ReadableSignal<T> | (() => T)
  ) => {
    originalSetSource(index, source)
    dirtySet.add(index)  // Automatically mark dirty
  }

  // Wrap setValue to mark index as dirty
  baseArray.setValue = (index: number, value: T) => {
    originalSetValue(index, value)
    dirtySet.add(index)  // Automatically mark dirty
  }

  return baseArray
}
```

**Lines:** ~80  
**Dependencies:** slot.ts, set.ts, types.ts  
**Exports:** 1 function

---

### 5.2 Complete Test File

```typescript
// ============================================================================
// @rlabs-inc/signals - TrackedSlotArray Tests
// ============================================================================

import { describe, test, expect } from 'bun:test'
import {
  trackedSlotArray,
  ReactiveSet,
  signal,
  effect,
  flushSync,
} from '../../src/index.js'

describe('trackedSlotArray', () => {
  describe('dirty tracking', () => {
    test('marks index dirty on setSource', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      expect(dirty.size).toBe(0)
      
      arr.setSource(5, signal(42))
      
      expect(dirty.size).toBe(1)
      expect(dirty.has(5)).toBe(true)
    })

    test('marks index dirty on setValue', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      arr.setValue(3, 99)
      
      expect(dirty.size).toBe(1)
      expect(dirty.has(3)).toBe(true)
    })

    test('does not duplicate dirty indices', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      arr.setSource(0, 1)
      arr.setSource(0, 2)
      arr.setSource(0, 3)
      
      expect(dirty.size).toBe(1)  // Still just one entry
      expect(dirty.has(0)).toBe(true)
    })

    test('tracks multiple indices', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray('', dirty)
      
      arr.setSource(0, 'a')
      arr.setSource(5, 'b')
      arr.setSource(10, 'c')
      
      expect(dirty.size).toBe(3)
      expect(Array.from(dirty).sort()).toEqual([0, 5, 10])
    })

    test('can clear dirty set', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      arr.setSource(0, 1)
      arr.setSource(1, 2)
      expect(dirty.size).toBe(2)
      
      dirty.clear()
      expect(dirty.size).toBe(0)
    })
  })

  describe('reactivity', () => {
    test('dirty set is reactive', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      const sizes: number[] = []
      
      effect(() => {
        sizes.push(dirty.size)
      })
      
      flushSync()
      expect(sizes).toEqual([0])
      
      arr.setSource(0, 42)
      flushSync()
      expect(sizes).toEqual([0, 1])
      
      arr.setSource(1, 99)
      flushSync()
      expect(sizes).toEqual([0, 1, 2])
      
      dirty.clear()
      flushSync()
      expect(sizes).toEqual([0, 1, 2, 0])
    })

    test('can iterate dirty indices', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      let indices: number[] = []
      
      effect(() => {
        indices = Array.from(dirty)
      })
      
      flushSync()
      expect(indices).toEqual([])
      
      arr.setSource(5, 1)
      arr.setSource(3, 2)
      arr.setSource(1, 3)
      
      flushSync()
      expect(indices.sort()).toEqual([1, 3, 5])
    })
  })

  describe('SlotArray behavior', () => {
    test('still works as normal SlotArray', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray('default', dirty)
      
      expect(arr[0]).toBe('default')
      expect(arr.length).toBe(1)
      
      arr.setSource(5, 'hello')
      expect(arr[5]).toBe('hello')
      expect(arr.length).toBe(6)
    })

    test('tracks signal changes', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      const sig = signal(42)
      
      arr.setSource(0, sig)
      
      const values: number[] = []
      effect(() => {
        values.push(arr[0])
      })
      
      flushSync()
      expect(values).toEqual([42])
      
      sig.value = 99
      flushSync()
      expect(values).toEqual([42, 99])
    })

    test('supports getters', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray('', dirty)
      const count = signal(5)
      
      arr.setSource(0, () => `Count: ${count.value}`)
      
      expect(arr[0]).toBe('Count: 5')
      
      count.value = 10
      expect(arr[0]).toBe('Count: 10')
    })
  })

  describe('edge cases', () => {
    test('works with undefined default', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray<string | undefined>(undefined, dirty)
      
      expect(arr[0]).toBe(undefined)
      
      arr.setSource(0, 'value')
      expect(arr[0]).toBe('value')
      expect(dirty.has(0)).toBe(true)
    })

    test('works with null default', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray<string | null>(null, dirty)
      
      expect(arr[0]).toBe(null)
      
      arr.setSource(0, 'value')
      expect(arr[0]).toBe('value')
    })

    test('works with 0 default', () => {
      const dirty = new ReactiveSet<number>()
      const arr = trackedSlotArray(0, dirty)
      
      expect(arr[0]).toBe(0)
      
      arr.setValue(0, 42)
      expect(arr[0]).toBe(42)
    })
  })
})
```

**Lines:** ~200  
**Coverage:** All code paths, edge cases, reactivity

---

## Part 6: Safety Checklist

### 6.1 Pre-Implementation

- [ ] Verify signals package builds: `cd /Users/rusty/.../signals && bun run build`
- [ ] Verify signals tests pass: `bun test`
- [ ] Verify TUI tests pass: `cd /Users/rusty/.../tui && bun test`
- [ ] Create git branches in both repos

### 6.2 During Implementation

- [ ] Write tests FIRST (TDD)
- [ ] Run tests after each change
- [ ] Use TypeScript strict mode
- [ ] Follow existing code style
- [ ] Add JSDoc to all exports

### 6.3 Post-Implementation

- [ ] All signals tests pass
- [ ] All TUI tests pass
- [ ] Benchmark shows improvement
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Commit with clear message

---

## Part 7: Rollback Plan

**If something breaks:**

**Signals package:**
```bash
cd /Users/rusty/Documents/Projects/AI/Tools/ClaudeTools/memory-ts/packages/signals
git checkout main
bun run build
```

**TUI:**
```bash
cd /Users/rusty/Documents/Projects/TUI/tui
git checkout main
bun install  # Restore original signals version
bun test
```

**Both packages are independent - can roll back separately.**

---

## Part 8: Context Recovery Information

**If context gets compacted, this section has everything needed:**

**Key files to read:**
1. `/Users/rusty/.../signals/src/primitives/slot.ts` - Original slotArray
2. `/Users/rusty/.../signals/src/collections/set.ts` - ReactiveSet pattern
3. `/Users/rusty/.../signals/test/slot.test.ts` - Test patterns
4. `/Users/rusty/.../tui/src/engine/arrays/text.ts` - Current TUI usage

**Key concepts:**
- SlotArray uses Proxy for array-like access
- setSource/setValue are the write entry points
- ReactiveSet provides per-item dirty tracking
- Wrapper pattern preserves original behavior

**Implementation:**
- NEW file: `src/primitives/tracked-slot.ts` (~80 lines)
- NEW file: `test/unit/tracked-slot.test.ts` (~200 lines)
- MODIFY: `src/index.ts` (add 1 export line)

**Integration with TUI:**
- NEW file: `src/engine/arrays/dirty.ts` (5 ReactiveSet exports)
- MODIFY: Array files to use trackedSlotArray
- MODIFY: `src/pipeline/layout/index.ts` (add dirty checks)

**Success metrics:**
- Static frame: 2ms → <10μs (200x)
- Text change: 2ms → <50μs (40x)
- Color change: should skip layout entirely

---

## Appendix: Quick Reference

**Signals package path:**
```
/Users/rusty/Documents/Projects/AI/Tools/ClaudeTools/memory-ts/packages/signals
```

**TUI package path:**
```
/Users/rusty/Documents/Projects/TUI/tui
```

**Commands:**
```bash
# Signals
cd /Users/rusty/Documents/Projects/AI/Tools/ClaudeTools/memory-ts/packages/signals
bun test                           # All tests
bun test test/unit/tracked-slot.test.ts  # Specific test
bun run build                      # Build package

# TUI
cd /Users/rusty/Documents/Projects/TUI/tui
bun test                           # All tests
bun run dev                        # Run hello-counter example
```

**Import patterns:**
```typescript
// In signals package
import { slot, slotArray } from './slot.js'  // Relative
import { ReactiveSet } from '../collections/set.js'

// In TUI package  
import { trackedSlotArray, ReactiveSet } from '@rlabs-inc/signals'  // From package
```

**Type patterns:**
```typescript
// SlotArray is generic
const arr: SlotArray<string> = trackedSlotArray('', dirtySet)

// ReactiveSet is generic
const dirty: ReactiveSet<number> = new ReactiveSet()
```

---

**END OF DOCUMENT**

Ready to implement when context is restored. All critical information preserved.
