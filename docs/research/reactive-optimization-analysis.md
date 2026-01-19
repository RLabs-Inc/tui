# Reactive Optimization Deep Dive Analysis
**Date:** January 19, 2026  
**Goal:** Redesign TITAN layout engine for optimal performance using reactive primitives

---

## Executive Summary

Current TITAN implementation is already highly optimized (O(n) linear passes, hash-based text caching), but processes **entire component tree every frame** even when only 1 component changed. By leveraging `ReactiveSet`/`ReactiveMap` for granular dirty tracking, we can achieve **O(changed) complexity** for typical interactions.

**Key Insight:** Our signals package has ALL the primitives needed for incremental computation. We just need to integrate them properly.

---

## Part 1: Current Architecture Analysis

### 1.1 Signal Package Features Available

From `@rlabs-inc/signals` v1.9.0:

| Primitive | Purpose | Current Usage | Optimization Potential |
|-----------|---------|---------------|------------------------|
| `signal()` | Basic reactive value | ✅ Everywhere | Already optimal |
| `derived()` | Computed value | ✅ layoutDerived, frameBufferDerived | Add granular deriveds |
| `effect()` | Side effect runner | ✅ Render loop | Already optimal |
| `slotArray()` | Array of reactive slots | ✅ All component arrays | **Add dirty tracking wrapper** |
| `ReactiveSet` | Per-item reactive set | ❌ Not used | **Track dirty components** |
| `ReactiveMap` | Per-key reactive map | ❌ Not used | **Cache component layouts** |
| `createSelector()` | O(2) list selection | ❌ Not used | **List rendering optimization** |
| `effectScope()` | Grouped effects | ❌ Not used | **Component lifecycle scopes** |
| `batch()` | Batch updates | ❌ Not used | **Multi-property updates** |
| `untrack()` | Read without tracking | ❌ Not used | **Break reactive chains** |
| `isDirty()` | Check if dirty | ❌ Not used | **Skip clean deriveds** |

**Unused gems:** 7 out of 11 primitives aren't being leveraged!

### 1.2 Current Pipeline Flow

```
User changes signal → SlotArray updates → layoutDerived recalcs ALL components → 
frameBufferDerived processes ALL components → render effect draws
```

**Every frame, every component:**
- Pass 1: Build tree (n iterations)
- Pass 2: BFS queue (n iterations)
- Pass 3: Intrinsic sizes (n iterations, with hash cache for text)
- Pass 4: Layout (n iterations)
- Pass 5: Absolute positioning (abs iterations)
- FrameBuffer: Render (n iterations)

**Total:** ~5n operations every frame, even if only 1 component changed.

### 1.3 Performance Hotspots (from benchmarks)

From `test/stress-benchmark.ts` results:

| Operation | Scale | Time | Notes |
|-----------|-------|------|-------|
| Create component | 1 | ~2-5μs | Box + text primitive |
| Update text signal | 1 | ~100ns | Signal write |
| Layout computation | 10k components | ~2-3ms | Full TITAN pass |
| FrameBuffer render | 10k components | ~3-5ms | Drawing + zIndex sort |
| Terminal render | - | ~10-20ms | ANSI escape sequences (bottleneck) |

**Key finding:** Layout is already fast (<1ms for typical UIs), but runs unnecessarily when nothing layout-affecting changed.

### 1.4 Hash-Based Caching (Already Implemented)

**Text content caching** (TITAN Pass 3):
```typescript
const textHash = BigInt(Bun.hash(str))
if (textHash === cachedTextHash[i] && 
    availableW === cachedAvailW[i] && 
    str.length === cachedTextLength[i]) {
  // Cache hit - skip stringWidth() and measureTextHeight()
  intrinsicW[i] = cachedIntrinsicW[i]!
  intrinsicH[i] = cachedIntrinsicH[i]!
  return
}
```

**Effectiveness:** Text measurement is expensive (~5-10μs), hash check is ~1-2ns. This is a **5000x speedup** for unchanged text!

**Insight:** This pattern works. We should expand it, not remove it.

---

## Part 2: Reactive Primitives Deep Dive

### 2.1 ReactiveSet - Per-Item Granularity

**How it works:**
```typescript
const dirtyComponents = new ReactiveSet<number>()

effect(() => {
  // Automatically tracks the set's version signal
  const dirty = Array.from(dirtyComponents)
  console.log(`${dirty.length} components changed`)
})

dirtyComponents.add(47)  // Effect runs: "1 components changed"
dirtyComponents.add(47)  // No-op (already in set), effect doesn't run
dirtyComponents.add(99)  // Effect runs: "2 components changed"
dirtyComponents.clear()  // Effect runs: "0 components changed"
```

**Three levels of reactivity:**
1. `set.has(item)` - Only tracks that specific item
2. `set.size` - Only tracks size changes
3. Version signal - Tracks any structural change (add/delete/clear)

**Perfect for:** Dirty tracking at component granularity.

### 2.2 ReactiveMap - Per-Key Granularity

**How it works:**
```typescript
const componentCache = new ReactiveMap<number, LayoutResult>()

effect(() => {
  // Only re-runs when component 47's cache entry changes
  const layout = componentCache.get(47)
  if (layout) useLayout(layout)
})

componentCache.set(23, newLayout)  // Above effect doesn't run
componentCache.set(47, newLayout)  // Above effect runs!
```

**Three levels of reactivity:**
1. `map.get(key)` - Only tracks that specific key
2. `map.size` - Only tracks size changes  
3. Version signal - Tracks any structural change

**Perfect for:** Per-component layout caching with automatic invalidation.

### 2.3 createSelector - O(2) List Updates

**The problem it solves:**
```typescript
// BAD: O(n) - every item re-renders when selection changes
const selectedId = signal(1)
items.forEach(item => {
  effect(() => {
    if (item.id === selectedId.value) {
      highlight(item)  // 1000 effects run when selectedId changes!
    }
  })
})

// GOOD: O(2) - only old and new selection re-render
const isSelected = createSelector(() => selectedId.value)
items.forEach(item => {
  effect(() => {
    if (isSelected(item.id)) {  // Only 2 effects run!
      highlight(item)
    }
  })
})
```

**How:** Internally maintains a map of subscriptions per key. When selection changes:
1. Mark old selection's subscribers dirty
2. Mark new selection's subscribers dirty
3. Other 998 items untouched

**Perfect for:** `each()` primitive with selection state, focus management.

### 2.4 effectScope - Grouped Lifecycle

**Current problem:**
```typescript
function box() {
  const index = allocateIndex()
  
  // Manual cleanup tracking
  const cleanups: (() => void)[] = []
  
  if (props.onKey) {
    const unsub = onFocused(index, props.onKey)
    cleanups.push(unsub)
  }
  
  if (props.onMouse) {
    const unsub = onMouseComponent(index, props.onMouse)
    cleanups.push(unsub)
  }
  
  return () => {
    cleanups.forEach(c => c())
    releaseIndex(index)
  }
}
```

**With effectScope:**
```typescript
function box() {
  const scope = effectScope()
  const index = allocateIndex()
  
  scope.run(() => {
    // All effects auto-tracked
    if (props.onKey) onFocused(index, props.onKey)
    if (props.onMouse) onMouseComponent(index, props.onMouse)
  })
  
  return () => {
    scope.stop()  // Cleans up ALL effects automatically
    releaseIndex(index)
  }
}
```

**Bonus:** `scope.pause()` / `scope.resume()` for performance debugging!

### 2.5 batch() - Atomic Multi-Updates

**Current behavior:**
```typescript
width.value = 100    // Triggers layoutDerived
height.value = 50    // Triggers layoutDerived again
padding.value = 10   // Triggers layoutDerived again
// Layout computed 3 times!
```

**With batch:**
```typescript
batch(() => {
  width.value = 100
  height.value = 50
  padding.value = 10
})
// Layout computed ONCE after all updates!
```

**Perfect for:** User code setting multiple properties, internal prop updates.

### 2.6 untrack() - Breaking Reactive Chains

**Use case - parent lookup without tracking:**
```typescript
function getInheritedFg(index: number): RGBA {
  let current = index
  
  while (current >= 0) {
    const fg = visual.fgColor[current]
    if (fg) return fg
    
    // BUG: This tracks parentIndex[current] as dependency!
    current = core.parentIndex[current]
  }
}
```

Every effect that calls `getInheritedFg()` now tracks the entire parent chain. If parent changes, effect re-runs unnecessarily.

**With untrack:**
```typescript
function getInheritedFg(index: number): RGBA {
  let current = index
  
  while (current >= 0) {
    const fg = visual.fgColor[current]
    if (fg) return fg
    
    // Don't track parent lookups - parent structure rarely changes
    current = untrack(() => core.parentIndex[current])
  }
}
```

Now only the actual `fgColor` reads are tracked, not the tree walk.

---

## Part 3: Array Access Patterns Analysis

### 3.1 Read Hotspots (from grep analysis)

**In TITAN layout (per frame):**
- `core.componentType[i]` - Read n times (tree traversal)
- `core.parentIndex[i]` - Read n times (tree building)
- `core.visible[i]` - Read n times (visibility check)
- `dimensions.width[i]` - Read ~2n times (intrinsic + layout)
- `dimensions.height[i]` - Read ~2n times
- `spacing.padding*[i]` - Read ~2n times (4 sides)
- `layout.flex*[i]` - Read ~n times
- `visual.border*[i]` - Read ~n times
- `text.textContent[i]` - Read ~3n times (intrinsic + layout + frameBuffer)

**In FrameBuffer (per frame):**
- All visual arrays (fg, bg, border colors) - Read n times
- All layout results (x, y, width, height) - Read n times
- `text.textContent[i]` - Read n times again

**Total reads per frame:** ~20n array accesses for typical UI.

### 3.2 Write Hotspots

**Component creation (one-time):**
- All SlotArray `.setSource()` calls (typically 5-15 per component)

**Signal changes (user interaction):**
- Text content: `textContent.setValue(i, newText)` - triggers text re-measurement
- Colors: `fgColor.setValue(i, newColor)` - triggers re-render only
- Dimensions: `width.setValue(i, newWidth)` - triggers full layout
- Flex props: `flexDirection.setValue(i, newDir)` - triggers layout

**Key insight:** Different properties have different invalidation costs!

### 3.3 Dependency Tracking Analysis

**Current SlotArray behavior:**
```typescript
// In derived/effect:
const content = text.textContent[i]
// This tracks:
// 1. The slot itself (if setSource is called)
// 2. The underlying source (if it's a signal/getter)
```

**Problem:** No way to know WHICH slots were read!

If we read 1000 slots in layoutDerived, and ONE changes, we still re-run the entire derived.

**What we need:**
```typescript
// Track which slots were accessed
const accessedSlots = new ReactiveSet<number>()

// During derived execution:
textContent[47]  // Automatically adds 47 to accessedSlots

// When textContent[23] changes:
if (!accessedSlots.has(23)) {
  // This derived didn't read slot 23, skip re-run!
  return cachedResult
}
```

**Challenge:** SlotArray doesn't expose this automatically. We'd need wrapper.

---

## Part 4: Proposed Architecture

### 4.1 Dirty Tracking Layer

**Add reactive dirty sets per category:**

```typescript
// src/engine/arrays/dirty.ts

import { ReactiveSet } from '@rlabs-inc/signals'

// Separate dirty tracking by invalidation cost
export const dirtyLayout = new ReactiveSet<number>()    // width, height, flex*, margins, padding
export const dirtyVisual = new ReactiveSet<number>()    // colors, opacity
export const dirtyText = new ReactiveSet<number>()      // text content
export const dirtyBorders = new ReactiveSet<number>()   // border styles/colors
export const dirtyScroll = new ReactiveSet<number>()    // scroll offsets

// Track parent changes (rare, but critical)
export const dirtyHierarchy = new ReactiveSet<number>() // parentIndex changes
```

**Wrap SlotArray to auto-mark dirty:**

```typescript
// src/engine/arrays/tracked.ts

function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): SlotArray<T> {
  const arr = slotArray<T>(defaultValue)
  
  // Intercept setSource
  const originalSetSource = arr.setSource.bind(arr)
  arr.setSource = (index: number, source: any) => {
    originalSetSource(index, source)
    dirtySet.add(index)  // Auto-mark dirty!
  }
  
  // Intercept setValue (writes through to source)
  const originalSetValue = arr.setValue.bind(arr)
  arr.setValue = (index: number, value: any) => {
    originalSetValue(index, value)
    dirtySet.add(index)  // Auto-mark dirty!
  }
  
  return arr
}

// Usage in dimensions.ts:
export const width = trackedSlotArray(0, dirtyLayout)
export const height = trackedSlotArray(0, dirtyLayout)
```

### 4.2 Incremental Layout Derived

**New granular deriveds:**

```typescript
// src/pipeline/layout-incremental.ts

import { derived } from '@rlabs-inc/signals'
import { dirtyLayout, dirtyText, dirtyHierarchy } from '../engine/arrays/dirty'

// Cache component layouts in ReactiveMap
const layoutCache = new ReactiveMap<number, ComponentLayout>()

// Hierarchy changes invalidate everything (rare)
const hierarchyVersion = derived(() => {
  const changed = Array.from(dirtyHierarchy)
  if (changed.length > 0) {
    layoutCache.clear()  // Full invalidation
    dirtyHierarchy.clear()
  }
  return Date.now()
})

// Text changes only re-measure that component
const textMeasurements = derived(() => {
  const changed = Array.from(dirtyText)
  
  for (const idx of changed) {
    const content = text.textContent[idx]
    if (!content) continue
    
    const str = String(content)
    const parent = core.parentIndex[idx]
    const availW = parent >= 0 ? layoutCache.get(parent)?.width ?? 100 : 100
    
    // Re-measure just this text
    const hash = BigInt(Bun.hash(str))
    if (hash !== cachedTextHash[idx] || availW !== cachedAvailW[idx]) {
      intrinsicW[idx] = stringWidth(str)
      intrinsicH[idx] = measureTextHeight(str, availW)
      
      // Invalidate parent layout (text size changed)
      if (parent >= 0) dirtyLayout.add(parent)
    }
  }
  
  dirtyText.clear()
  return Date.now()
})

// Layout changes trigger incremental recalc
export const layoutDerived = derived(() => {
  hierarchyVersion.value  // Depend on hierarchy
  textMeasurements.value  // Depend on text measurements
  
  const changed = Array.from(dirtyLayout)
  
  if (changed.length === 0) {
    // NOTHING CHANGED - O(1) return!
    return cachedLayoutResult
  }
  
  // Find minimal affected subtrees
  const affectedRoots = findCommonAncestors(changed)
  
  // Only re-layout affected subtrees
  for (const root of affectedRoots) {
    relayoutSubtree(root)
  }
  
  dirtyLayout.clear()
  return computedLayoutResult
})
```

### 4.3 Per-Component Caching

**ReactiveMap for component-level cache:**

```typescript
interface CachedLayout {
  x: number
  y: number  
  width: number
  height: number
  propsHash: bigint  // Hash of all layout-affecting props
  childrenHash: bigint  // Hash of children array
}

const layoutCache = new ReactiveMap<number, CachedLayout>()

// In layout computation:
function layoutComponent(index: number) {
  // Compute current props hash
  const propsHash = hashLayoutProps(index)
  const childrenHash = hashChildren(index)
  
  const cached = layoutCache.get(index)
  
  if (cached && 
      cached.propsHash === propsHash && 
      cached.childrenHash === childrenHash) {
    // Cache hit - skip layout computation!
    return cached
  }
  
  // Cache miss - compute layout
  const layout = computeLayoutForComponent(index)
  
  layoutCache.set(index, {
    ...layout,
    propsHash,
    childrenHash,
  })
  
  return layout
}
```

**Effect that uses this:**
```typescript
// This effect only re-runs when component 47's layout changes!
effect(() => {
  const layout = layoutCache.get(47)
  if (layout) {
    drawComponent(layout)
  }
})
```

### 4.4 Selector for Focus/Selection

**Current focus management:**
```typescript
export const focusedIndex = signal<number>(-1)

// Each focusable component:
effect(() => {
  const isFocused = focusedIndex.value === myIndex
  if (isFocused) {
    // Render with focus styles
  }
})
// When focus changes: ALL focusable components re-render!
```

**With createSelector:**
```typescript
const isFocused = createSelector(() => focusedIndex.value)

// Each focusable component:
effect(() => {
  if (isFocused(myIndex)) {  // Only re-runs when THIS component's focus state changes!
    // Render with focus styles
  }
})
// When focus changes: Only old + new focused components re-render! (O(2) instead of O(n))
```

---

## Part 5: Hash Function Optimization

### 5.1 Current Text Hashing

```typescript
const textHash = BigInt(Bun.hash(str))
```

**Bun.hash()** uses Wyhash - extremely fast (~3-5ns for short strings).

**Collision prevention:**
```typescript
if (hash === cachedHash && 
    availW === cachedAvailW && 
    str.length === cachedLength) {
  // Triple check prevents false positives
}
```

**This is already optimal!**

### 5.2 Property Hash Strategies

**For layout properties (multiple values):**

```typescript
// Option 1: JSON stringify + hash (easy, ~100ns)
const propsHash = Bun.hash(JSON.stringify({
  width: dimensions.width[i],
  height: dimensions.height[i],
  flexDirection: layout.flexDirection[i],
  // ... all layout props
}))

// Option 2: Manual combine (fast, ~10ns)
function hashLayoutProps(index: number): bigint {
  // Use XOR for commutative properties, concat for ordered
  let hash = 0n
  hash ^= BigInt(dimensions.width[index] ?? 0)
  hash ^= BigInt(dimensions.height[index] ?? 0) << 16n
  hash ^= BigInt(layout.flexDirection[index] ?? 0) << 32n
  // ... continue for all props
  return hash
}

// Option 3: Read all, hash buffer (fastest, ~5ns)
const buf = new Uint32Array([
  dimensions.width[i] ?? 0,
  dimensions.height[i] ?? 0,
  layout.flexDirection[i] ?? 0,
  // ... pack all props
])
const propsHash = Bun.hash(buf)
```

**Recommendation:** Option 3 for hot paths (layout props), Option 1 for convenience elsewhere.

### 5.3 Children Hash

**Track when children change:**

```typescript
// Compute hash of children indices
function hashChildren(parentIndex: number): bigint {
  const children: number[] = []
  let child = firstChild[parentIndex]
  
  while (child !== -1) {
    children.push(child)
    child = nextSibling[child]
  }
  
  if (children.length === 0) return 0n
  
  // Hash the array of indices
  const buf = new Uint32Array(children)
  return Bun.hash(buf)
}
```

**Caching:**
```typescript
const cachedChildrenHash: bigint[] = []

// Invalidate when hierarchy changes
dirtyHierarchy.on((changed) => {
  for (const idx of changed) {
    cachedChildrenHash[idx] = 0n  // Force recompute
  }
})
```

---

## Part 6: New Reactive Primitives to Consider

### 6.1 ReactiveArray (doesn't exist, but we could implement)

**Problem with current SlotArray:**
- Tracks individual slots fine
- Doesn't track structural changes (length, indices added/removed)

**Desired:**
```typescript
const componentIndices = new ReactiveArray<number>()

effect(() => {
  // Re-runs when array structure changes
  for (const idx of componentIndices) {
    processComponent(idx)
  }
})

componentIndices.push(47)  // Effect re-runs
componentIndices[10] = 99  // Effect doesn't re-run (just value change)
```

**Implementation sketch:**
```typescript
class ReactiveArray<T> extends Array<T> {
  #version = signal(0)
  
  push(...items: T[]) {
    const result = super.push(...items)
    this.#version.value++
    return result
  }
  
  pop() {
    const result = super.pop()
    this.#version.value++
    return result
  }
  
  // Override all mutating methods...
  
  [Symbol.iterator]() {
    this.#version.value  // Track version
    return super[Symbol.iterator]()
  }
}
```

**Use case:** Tracking allocated component indices without full Set iteration.

### 6.2 computedMap / computedSet

**Problem:**
```typescript
const dirtySet = new ReactiveSet<number>()

// Want to compute derived data from set contents
const dirtyArray = derived(() => Array.from(dirtySet))
// Creates new array every time, even if set unchanged!
```

**Desired:**
```typescript
const dirtyArray = computedSet(dirtySet, (set) => {
  return Array.from(set)
}, {
  equals: shallowEquals  // Only recompute if array contents changed
})
```

**Can implement with existing primitives:**
```typescript
function computedSet<T, R>(
  reactiveSet: ReactiveSet<T>,
  transform: (set: Set<T>) => R,
  options: { equals?: (a: R, b: R) => boolean } = {}
): DerivedSignal<R> {
  return derived(() => {
    // Track set version
    const size = reactiveSet.size
    
    // Transform
    return transform(reactiveSet)
  }, options.equals)
}
```

### 6.3 asyncDerived (for future async layout)

**Future consideration:** What if layout computation becomes async (Web Workers, native)?

```typescript
const layoutDerived = asyncDerived(async () => {
  const changed = Array.from(dirtyLayout)
  
  // Compute layout in worker
  const result = await computeLayoutInWorker(changed)
  
  return result
}, {
  pending: cachedLayoutResult,  // Use cache while computing
})
```

This already exists in some signal libraries. Consider for v2.

---

## Part 7: Migration Strategy

### Phase 1: Add Dirty Tracking (Non-Breaking)

**Week 1: Foundation**
1. Create `src/engine/arrays/dirty.ts` with ReactiveSet instances
2. Create `trackedSlotArray()` wrapper
3. Add to ONE array (e.g., `text.textContent`) as proof-of-concept
4. Write tests comparing layout runs with/without changes

**Success criteria:** Text changes trigger layout, color changes don't (when only using tracked array).

### Phase 2: Expand Tracking (Incremental)

**Week 2: Layout Props**
1. Wrap all `dimensions.*` arrays with dirty tracking
2. Wrap all `layout.*` arrays  
3. Wrap all `spacing.*` arrays
4. Create `layoutDerived-v2` that checks `dirtyLayout.size`

**Success criteria:** Layout skipped when only visual props change.

### Phase 3: Granular Deriveds

**Week 3: Split Pipeline**
1. Create `textMeasurementDerived` (handles `dirtyText`)
2. Create `hierarchyDerived` (handles `dirtyHierarchy`)
3. Create `layoutDerived` (composes above, handles `dirtyLayout`)
4. Add `ReactiveMap` caching for components

**Success criteria:** Changing one text component only re-measures that component.

### Phase 4: Hash-Based Caching

**Week 4: Prop Hashing**
1. Implement `hashLayoutProps()` for all layout-affecting properties
2. Implement `hashChildren()` for child structure
3. Add `layoutCache` ReactiveMap
4. Integrate cache checks into layout computation

**Success criteria:** Static components skipped entirely in layout pass.

### Phase 5: Algorithm Redesign

**Week 5-6: Single-Pass Layout**
1. Design new top-down single-pass algorithm
2. Implement alongside existing TITAN (feature flag)
3. Extensive testing and benchmarking
4. Gradual migration

**Success criteria:** Correct wrapping behavior, equal or better performance.

### Phase 6: Optimization & Polish

**Week 7-8: Performance Tuning**
1. Profile all hotspots
2. Optimize hash functions
3. Add `createSelector` for focus management
4. Add `effectScope` for component lifecycle
5. Add `batch()` to public API for user code

**Success criteria:** 10x improvement for typical interactions (e.g., typing in input).

---

## Part 8: Performance Predictions

### 8.1 Current Performance (from benchmarks)

| Scenario | Components | Changes | Current Time | Complexity |
|----------|-----------|---------|--------------|-----------|
| Static frame | 10,000 | 0 | ~2ms layout | O(n) |
| One text change | 10,000 | 1 | ~2ms layout | O(n) |
| Color change | 10,000 | 1 | ~2ms layout | O(n) |
| Resize window | 10,000 | 10,000 | ~3ms layout | O(n) |

### 8.2 Predicted Performance (with optimizations)

| Scenario | Components | Changes | Predicted Time | Complexity | Speedup |
|----------|-----------|---------|----------------|-----------|---------|
| Static frame | 10,000 | 0 | ~10μs (hash check) | O(1) | 200x |
| One text change | 10,000 | 1 | ~50μs (measure + parent) | O(depth) | 40x |
| Color change | 10,000 | 1 | ~5μs (skip layout) | O(1) | 400x |
| Resize window | 10,000 | 10,000 | ~3ms (full recalc) | O(n) | 1x |

**Key insight:** Biggest wins are for **common cases** (small updates), not worst case.

### 8.3 Memory Overhead

**Additional structures:**
- 6 ReactiveSet instances (~1KB each) = ~6KB
- 1 ReactiveMap instance (sparse) = ~100 bytes + (n × 100 bytes per cached entry)
- Hash caches (per component):
  - `cachedPropsHash: bigint[]` = n × 8 bytes
  - `cachedChildrenHash: bigint[]` = n × 8 bytes
  - Existing text cache = n × 40 bytes

**Total added:** ~16 bytes per component + 6KB fixed overhead.

For 10,000 components: **160KB additional** (vs ~5MB current arrays).

**Verdict:** ~3% memory increase for potential 40-400x speedup on common cases. **Worth it!**

---

## Part 9: Risks & Mitigations

### Risk 1: Complexity Increase

**Risk:** More reactive primitives = more moving parts = harder to debug.

**Mitigation:**
- Gradual rollout (feature flags)
- Extensive logging in dev mode
- Document all reactive flows
- Keep old TITAN available for fallback

### Risk 2: Hash Collisions

**Risk:** False cache hits due to hash collisions.

**Mitigation:**
- Use 64-bit hashes (collision probability: ~1 in 2^64)
- Add length/size checks (like text cache does)
- Add equality checks for critical paths
- Monitor for incorrect renderings in tests

### Risk 3: Over-Engineering

**Risk:** Building complex system that doesn't improve real-world performance.

**Mitigation:**
- Benchmark EVERY change against realistic workloads
- Have "abort threshold": if no 2x improvement, revert
- Focus on common cases first (text input, hover, selection)
- Keep algorithm simple, add complexity only when measured benefit

### Risk 4: Breaking Changes

**Risk:** Changing core arrays breaks existing code.

**Mitigation:**
- Make `trackedSlotArray` wrapper transparent (same API)
- Keep existing TITAN algorithm working
- Add v2 deriveds alongside v1
- Gradual migration with deprecation warnings

### Risk 5: Reactive Chain Complexity

**Risk:** Too many deriveds → deep chains → stack overflows or infinite loops.

**Mitigation:**
- Signals package already handles this (ITERATIVE derived chains)
- Limit chain depth (e.g., max 3 levels: text → layout → frameBuffer)
- Use `untrack()` to break unnecessary dependencies
- Add cycle detection in dev mode

---

## Part 10: Questions for Discussion

### 10.1 Architecture Decisions

**Q1:** Should we use separate ReactiveSet per property type (dirtyText, dirtyLayout, dirtyVisual), or one global dirty set with property flags?

**Option A (separate sets):**
```typescript
dirtyText.add(index)
dirtyLayout.add(index)
```
Pros: Clear separation, easy to track invalidation scope
Cons: One component might be in multiple sets

**Option B (global dirty with flags):**
```typescript
dirty.set(index, DIRTY_TEXT | DIRTY_LAYOUT)
```
Pros: Single source of truth, no duplicates
Cons: More complex flag management

**Recommendation:** Option A for clarity. Duplicates are fine (Sets handle it).

---

**Q2:** Should hash caching be opt-in (manual) or automatic (wrapper)?

**Option A (automatic via wrapper):**
```typescript
const width = trackedSlotArray(0, dirtyLayout, { cacheHash: true })
```
Pros: Zero boilerplate, can't forget
Cons: Hidden magic, harder to debug

**Option B (manual in layout code):**
```typescript
const propsHash = hashLayoutProps(index)
if (propsHash === cachedHash[index]) return cached
```
Pros: Explicit, easy to see what's cached
Cons: Easy to forget, boilerplate

**Recommendation:** Option B for now (explicit), revisit after we see patterns.

---

**Q3:** Should we redesign TITAN algorithm first, or add optimizations to current algorithm?

**Option A (redesign first):**
- Build new single-pass top-down algorithm
- Add reactive tracking to it
- Migrate when ready

**Option B (optimize current first):**
- Add dirty tracking to existing TITAN
- Get wins immediately
- Redesign later if needed

**Recommendation:** Option B. Current algorithm works, just runs too often. Fix that first.

---

### 10.2 API Questions

**Q4:** Should we expose `dirtyLayout` etc. in public API?

**Use case:** User wants to batch updates:
```typescript
import { batch, dirtyLayout } from '@rlabs-inc/tui'

batch(() => {
  box1.width = 100
  box2.height = 50
})
// Only one layout computation
```

Currently this works via `batch()` from signals package. Do we need to export dirty sets?

**Recommendation:** No, `batch()` is sufficient. Keep dirty sets internal.

---

**Q5:** Should we add new reactive primitives to signals package or keep in TUI?

**Candidates:**
- `ReactiveArray` (array with structural reactivity)
- `computedSet` / `computedMap` (derived from collections)

**Option A:** Add to `@rlabs-inc/signals` (reusable across projects)
**Option B:** Keep in TUI as utilities (faster iteration)

**Recommendation:** Option B initially, promote to signals package if patterns emerge.

---

## Part 11: Next Steps

### Immediate Actions (This Week)

1. **Create proof-of-concept branch:**
   ```bash
   git checkout -b feat/reactive-optimization
   ```

2. **Implement minimal dirty tracking:**
   - Add `src/engine/arrays/dirty.ts`
   - Create `trackedSlotArray()` wrapper
   - Wrap `text.textContent` only

3. **Add benchmark:**
   ```typescript
   // test/dirty-tracking-benchmark.ts
   // Compare: 10k components, change 1 text, measure layout time
   ```

4. **Measure baseline:**
   - Run benchmark WITHOUT dirty tracking
   - Record layout time (~2ms expected)

5. **Implement dirty check in layoutDerived:**
   ```typescript
   if (dirtyText.size === 0 && dirtyLayout.size === 0) {
     return cachedLayout  // Skip!
   }
   ```

6. **Measure improvement:**
   - Run benchmark WITH dirty tracking
   - Should see ~100x speedup for text-only changes
   - Record exact numbers

### This Week's Success Criteria

- [ ] Dirty tracking works for text content
- [ ] Layout skipped when text unchanged
- [ ] Layout runs when text changed
- [ ] Benchmark shows measurable improvement
- [ ] No regressions in existing tests

### Next Week (if POC successful)

- Expand tracking to all layout properties
- Implement prop hashing
- Add ReactiveMap caching
- Measure real-world scenarios (typing, scrolling, etc.)

---

## Appendix A: Code Examples

### A.1 Complete trackedSlotArray Implementation

```typescript
// src/engine/arrays/tracked.ts

import { slotArray, type SlotArray } from '@rlabs-inc/signals'
import type { ReactiveSet } from '@rlabs-inc/signals'

export interface TrackedSlotArray<T> extends SlotArray<T> {
  // Exposed for debugging
  readonly dirtySet: ReactiveSet<number>
}

export function trackedSlotArray<T>(
  defaultValue: T,
  dirtySet: ReactiveSet<number>
): TrackedSlotArray<T> {
  const arr = slotArray<T>(defaultValue)
  
  // Store original methods
  const originalSetSource = arr.setSource.bind(arr)
  const originalSetValue = arr.setValue.bind(arr)
  
  // Wrap setSource
  arr.setSource = (index: number, source: any) => {
    originalSetSource(index, source)
    dirtySet.add(index)
  }
  
  // Wrap setValue
  arr.setValue = (index: number, value: any) => {
    originalSetValue(index, value)
    dirtySet.add(index)
  }
  
  // Add debug access
  Object.defineProperty(arr, 'dirtySet', {
    get: () => dirtySet,
    enumerable: false,
  })
  
  return arr as TrackedSlotArray<T>
}
```

### A.2 Complete Incremental Layout Derived

```typescript
// src/pipeline/layout-incremental.ts

import { derived, ReactiveSet, ReactiveMap } from '@rlabs-inc/signals'
import { dirtyLayout, dirtyText, dirtyHierarchy } from '../engine/arrays/dirty'
import type { ComputedLayout } from './layout/types'

// Layout cache
const layoutCache = new ReactiveMap<number, ComputedLayout>()

// Cached result for O(1) returns
let cachedLayoutResult: ComputedLayout | null = null

// Hierarchy invalidation (rare)
const hierarchyTracker = derived(() => {
  const changed = Array.from(dirtyHierarchy)
  
  if (changed.length > 0) {
    // Full invalidation
    layoutCache.clear()
    cachedLayoutResult = null
    dirtyHierarchy.clear()
  }
  
  return Date.now()
})

// Text measurement (frequent)
const textTracker = derived(() => {
  const changed = Array.from(dirtyText)
  
  for (const idx of changed) {
    // Re-measure this text component
    remeasureText(idx)
    
    // Invalidate parent layout
    const parent = core.parentIndex[idx]
    if (parent !== undefined && parent >= 0) {
      dirtyLayout.add(parent)
      layoutCache.delete(parent)
    }
  }
  
  dirtyText.clear()
  return Date.now()
})

// Main layout derived
export const layoutDerivedV2 = derived((): ComputedLayout => {
  // Track dependencies
  hierarchyTracker.value
  textTracker.value
  
  const changed = Array.from(dirtyLayout)
  
  // Fast path: nothing changed
  if (changed.length === 0 && cachedLayoutResult) {
    return cachedLayoutResult
  }
  
  // Find affected subtrees
  const affectedRoots = findCommonAncestors(changed)
  
  // Re-layout only affected subtrees
  for (const root of affectedRoots) {
    relayoutSubtree(root, layoutCache)
  }
  
  // Build full layout result
  const result = buildLayoutResult()
  
  cachedLayoutResult = result
  dirtyLayout.clear()
  
  return result
})

function findCommonAncestors(indices: number[]): number[] {
  // Find minimal set of roots that contain all changed indices
  // TODO: Implement efficient algorithm (LCA on tree)
  
  // For now: just return unique roots
  const roots = new Set<number>()
  
  for (const idx of indices) {
    let current = idx
    let parent = core.parentIndex[current]
    
    while (parent !== undefined && parent >= 0) {
      current = parent
      parent = core.parentIndex[current]
    }
    
    roots.add(current)
  }
  
  return Array.from(roots)
}

function relayoutSubtree(root: number, cache: ReactiveMap<number, any>) {
  // Check cache first
  const cached = cache.get(root)
  const propsHash = hashLayoutProps(root)
  
  if (cached && cached.propsHash === propsHash) {
    // Cache hit - skip!
    return
  }
  
  // Cache miss - compute layout
  const layout = computeLayoutForComponent(root)
  
  cache.set(root, {
    ...layout,
    propsHash,
  })
  
  // Recursively layout children
  let child = firstChild[root]
  while (child !== undefined && child >= 0) {
    relayoutSubtree(child, cache)
    child = nextSibling[child]
  }
}

function hashLayoutProps(index: number): bigint {
  // Pack all layout-affecting props into buffer
  const buf = new Uint32Array(20)
  let i = 0
  
  buf[i++] = dimensions.width[index] ?? 0
  buf[i++] = dimensions.height[index] ?? 0
  buf[i++] = dimensions.minWidth[index] ?? 0
  buf[i++] = dimensions.maxWidth[index] ?? 0
  buf[i++] = dimensions.minHeight[index] ?? 0
  buf[i++] = dimensions.maxHeight[index] ?? 0
  
  buf[i++] = layout.flexDirection[index] ?? 0
  buf[i++] = layout.flexWrap[index] ?? 0
  buf[i++] = layout.justifyContent[index] ?? 0
  buf[i++] = layout.alignItems[index] ?? 0
  buf[i++] = layout.flexGrow[index] ?? 0
  buf[i++] = layout.flexShrink[index] ?? 0
  buf[i++] = layout.flexBasis[index] ?? 0
  
  buf[i++] = spacing.paddingTop[index] ?? 0
  buf[i++] = spacing.paddingRight[index] ?? 0
  buf[i++] = spacing.paddingBottom[index] ?? 0
  buf[i++] = spacing.paddingLeft[index] ?? 0
  buf[i++] = spacing.gap[index] ?? 0
  
  // Hash the buffer
  return Bun.hash(buf)
}
```

### A.3 Usage in Primitives

```typescript
// src/primitives/text.ts

import { dirtyText } from '../engine/arrays/dirty'

export function text(props: TextProps): Cleanup {
  const index = allocateIndex()
  
  // Set content - automatically marks dirty!
  if (props.content !== undefined) {
    textContent.setSource(index, props.content)
    // dirtyText.add(index) happens automatically in trackedSlotArray!
  }
  
  // ... rest of text primitive
  
  return cleanup
}
```

---

## Appendix B: Benchmarking Template

```typescript
// test/reactive-optimization-benchmark.ts

import { signal, batch } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { layoutDerived } from '../src/pipeline/layout'
import { resetRegistry, resetAllArrays, resetTitanArrays } from '../src/engine'

async function benchmarkDirtyTracking() {
  console.log('\\n=== Reactive Optimization Benchmark ===\\n')
  
  // Setup
  const componentCount = 10_000
  const textSignals: any[] = []
  const cleanups: any[] = []
  
  for (let i = 0; i < componentCount; i++) {
    const content = signal(`Item ${i}`)
    textSignals.push(content)
    
    const cleanup = box({
      width: 50,
      height: 3,
      children: () => {
        text({ content })
      }
    })
    cleanups.push(cleanup)
  }
  
  // Initial layout
  const initial = layoutDerived.value
  
  // Test 1: Change ONE text component, measure layout time
  console.log('Test 1: Single text change')
  
  const samples: number[] = []
  
  for (let i = 0; i < 100; i++) {
    const start = Bun.nanoseconds()
    
    textSignals[0].value = `Updated ${i}`
    const _ = layoutDerived.value  // Force recomputation
    
    const elapsed = Bun.nanoseconds() - start
    samples.push(elapsed)
  }
  
  const avg = samples.reduce((a, b) => a + b) / samples.length
  const p95 = samples.sort((a, b) => a - b)[Math.floor(samples.length * 0.95)]
  
  console.log(`  Average: ${(avg / 1000).toFixed(2)}μs`)
  console.log(`  P95: ${(p95 / 1000).toFixed(2)}μs`)
  
  // Test 2: Change NOTHING, measure layout time (should be O(1))
  console.log('\\nTest 2: No changes (cache hit)')
  
  const cacheSamples: number[] = []
  
  for (let i = 0; i < 1000; i++) {
    const start = Bun.nanoseconds()
    const _ = layoutDerived.value
    const elapsed = Bun.nanoseconds() - start
    cacheSamples.push(elapsed)
  }
  
  const cacheAvg = cacheSamples.reduce((a, b) => a + b) / cacheSamples.length
  console.log(`  Average: ${(cacheAvg / 1000).toFixed(2)}μs`)
  console.log(`  Speedup: ${(avg / cacheAvg).toFixed(0)}x`)
  
  // Cleanup
  cleanups.forEach(c => c())
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

benchmarkDirtyTracking().catch(console.error)
```

---

## Appendix C: Migration Checklist

**Phase 1 - Foundation:**
- [ ] Create `src/engine/arrays/dirty.ts`
- [ ] Create `src/engine/arrays/tracked.ts`
- [ ] Add tests for `trackedSlotArray`
- [ ] Wrap `text.textContent` with tracking
- [ ] Create `test/dirty-tracking-benchmark.ts`
- [ ] Establish baseline metrics

**Phase 2 - Layout Tracking:**
- [ ] Wrap all `dimensions.*` arrays
- [ ] Wrap all `layout.*` arrays
- [ ] Wrap all `spacing.*` arrays
- [ ] Wrap all `visual.*` arrays (for later)
- [ ] Add `layoutDerived-v2` with dirty checks
- [ ] Compare performance: v1 vs v2

**Phase 3 - Caching:**
- [ ] Implement `hashLayoutProps()`
- [ ] Implement `hashChildren()`
- [ ] Add `ReactiveMap` layout cache
- [ ] Integrate cache checks into layout
- [ ] Add cache hit/miss metrics

**Phase 4 - Granular Deriveds:**
- [ ] Create `textMeasurementDerived`
- [ ] Create `hierarchyDerived`
- [ ] Compose into `layoutDerived`
- [ ] Test invalidation cascades

**Phase 5 - Additional Optimizations:**
- [ ] Add `createSelector` for focus
- [ ] Add `effectScope` for components
- [ ] Add `batch()` to public API
- [ ] Optimize hash functions (profile-guided)

**Phase 6 - Testing & Docs:**
- [ ] Integration tests for all scenarios
- [ ] Performance regression tests
- [ ] Update documentation
- [ ] Migration guide for users
- [ ] Deprecation warnings for old patterns

---

## Conclusion

The signals package provides ALL the primitives needed for incremental computation. We're currently not using 7 out of 11 features!

**Key opportunities:**
1. **ReactiveSet** for dirty tracking (auto-invalidation)
2. **ReactiveMap** for component caching (per-key reactivity)
3. **createSelector** for O(2) selection updates
4. **effectScope** for cleaner lifecycle
5. **batch()** for atomic multi-updates
6. **Hash-based caching** (expand current pattern)

**Predicted gains:**
- Static frames: 200x faster (O(n) → O(1))
- Single text change: 40x faster (O(n) → O(depth))
- Color change: 400x faster (skip layout entirely)

**Next step:** Build proof-of-concept with minimal dirty tracking for text content only. Measure. Decide whether to continue.

**Risk level:** Low (gradual rollout, can revert any time)
**Effort:** Medium (2-3 weeks for full implementation)
**Reward:** Potentially game-changing for large UIs

Ready to start when you are!
