# Bun FFI Analysis for Native Layout Engine

Research document consolidating findings on Bun's FFI capabilities for designing a high-performance native layout engine (TITAN v2).

## Executive Summary

Bun's FFI provides **zero-copy array passing** between JavaScript and native code, making it ideal for a parallel-array layout engine. TypedArrays are passed as direct memory pointers without serialization, achieving **2-6x faster performance** than Node.js FFI.

---

## 1. How Bun's FFI Works

### Architecture

```
JavaScript (TypedArrays)
    │
    ▼ (bun:ffi module)
JIT-compiled C bindings (via TinyCC)
    │
    ▼ (direct pointer access)
Native Library (.so/.dylib/.dll)
```

**Key components:**
- `bun:ffi` - JavaScript API layer
- TinyCC - Embedded C compiler for JIT wrapper generation
- JSC bindings - Direct access to JavaScriptCore internals

### Basic Usage

```typescript
import { dlopen, FFIType, ptr } from "bun:ffi";

const lib = dlopen("./libtitan.so", {
  compute_layout: {
    args: ["ptr", "ptr", "ptr", "ptr", "u32"],
    returns: FFIType.i32,
  },
});

// Call native function
lib.symbols.compute_layout(widths, heights, outX, outY, count);
```

---

## 2. Zero-Copy Array Passing

### The Critical Insight

TypedArrays are passed as **direct memory pointers** - Bun reads the pointer directly from JSC's internal `JSArrayBufferView` structure:

```c
// Bun's internal FFI.h
static void* JSVALUE_TO_TYPED_ARRAY_VECTOR(EncodedJSValue val) {
  return *(void**)((char*)val.asPtr + JSArrayBufferView__offsetOfVector);
}

static uint64_t JSVALUE_TO_TYPED_ARRAY_LENGTH(EncodedJSValue val) {
  return *(uint64_t*)((char*)val.asPtr + JSArrayBufferView__offsetOfLength);
}
```

**No serialization. No copying. Direct pointer extraction.**

### Supported TypedArrays

| TypedArray | C Type | Use Case |
|------------|--------|----------|
| `Float32Array` | `float*` | Positions, dimensions |
| `Float64Array` | `double*` | High-precision calculations |
| `Int32Array` | `int32_t*` | Parent indices, flags |
| `Uint32Array` | `uint32_t*` | Unsigned indices |
| `Uint8Array` | `uint8_t*` | Boolean flags, small values |

### Usage Patterns

```typescript
// Create parallel arrays
const widths = new Float32Array(MAX_COMPONENTS);
const heights = new Float32Array(MAX_COMPONENTS);
const parentIdx = new Int32Array(MAX_COMPONENTS);
const outX = new Float32Array(MAX_COMPONENTS);
const outY = new Float32Array(MAX_COMPONENTS);

// Pass to native - ZERO COPY
lib.symbols.compute_layout(
  widths,      // Passed as float*
  heights,     // Passed as float*
  parentIdx,   // Passed as int32_t*
  outX,        // Output: modified in-place
  outY,        // Output: modified in-place
  count
);

// Results are already in outX/outY - no need to copy back!
```

---

## 3. Performance Characteristics

### Benchmark Results

- **2-6x faster** than Node.js N-API
- FFI call overhead: ~50-70ns per call
- For 1000-element arrays: overhead is negligible (<0.1% of compute time)

### Why It's Fast

1. **No serialization** - Direct pointer extraction from JSC objects
2. **JIT compilation** - Specialized wrappers generated per function signature
3. **Minimal wrapping** - Specialized code paths for each parameter count
4. **TypedArray native support** - First-class citizen, not marshaled

### Optimized Code Paths

```typescript
// Bun generates specialized wrappers based on argument count
switch (paramNames.length) {
  case 0: wrap = () => func(functionToCall); break;
  case 1: wrap = arg1 => func(functionToCall, arg1); break;
  case 2: wrap = (arg1, arg2) => func(functionToCall, arg1, arg2); break;
  // ... up to 9 params, then fallback to variadic
}
```

---

## 4. Memory Management

### Key Rules

1. **Keep TypedArray references alive** - GC can free the underlying buffer
2. **Native code must not store pointers** - Only valid during function call
3. **If native allocates, JS must free** - No automatic cleanup

### Safe Pattern

```typescript
// Keep references alive during computation
const arrays = {
  widths: new Float32Array(MAX_COMPONENTS),
  heights: new Float32Array(MAX_COMPONENTS),
  // ... other arrays
};

// Use within derived (references stay alive)
const layoutDerived = derived(() => {
  lib.symbols.compute_layout(
    arrays.widths,
    arrays.heights,
    // ...
  );
  return arrays;
});
```

### Reading Results Back

```typescript
import { toArrayBuffer, read } from "bun:ffi";

// Option 1: Single value reads (fast, no allocation)
const value = read.f32(resultPtr, byteOffset);

// Option 2: Create view of native memory
const buffer = toArrayBuffer(resultPtr, 0, byteLength);
const result = new Float32Array(buffer);
```

---

## 5. FFI Types Reference

### Primitives

| FFIType | Bytes | C Type |
|---------|-------|--------|
| `i8` / `u8` | 1 | `int8_t` / `uint8_t` |
| `i16` / `u16` | 2 | `int16_t` / `uint16_t` |
| `i32` / `u32` | 4 | `int32_t` / `uint32_t` |
| `i64` / `u64` | 8 | `int64_t` / `uint64_t` |
| `f32` | 4 | `float` |
| `f64` | 8 | `double` |
| `ptr` | 8 | `void*` |

### Special Types

| FFIType | Use Case |
|---------|----------|
| `buffer` | TypedArray (auto-converts to pointer) |
| `cstring` | Null-terminated string |
| `i64_fast` / `u64_fast` | Returns Number if safe, BigInt otherwise |

---

## 6. Proposed TITAN v2 Architecture

### JavaScript Side

```typescript
import { dlopen, ptr } from "bun:ffi";
import { derived } from "@rlabs-inc/signals";

// Pre-allocated parallel arrays (reused across frames)
const MAX_COMPONENTS = 10000;
const arrays = {
  // Input arrays (from user props)
  width: new Float32Array(MAX_COMPONENTS),
  height: new Float32Array(MAX_COMPONENTS),
  minWidth: new Float32Array(MAX_COMPONENTS),
  maxWidth: new Float32Array(MAX_COMPONENTS),
  parentIdx: new Int32Array(MAX_COMPONENTS),
  flexDirection: new Uint8Array(MAX_COMPONENTS),
  flexWrap: new Uint8Array(MAX_COMPONENTS),
  // ... more input arrays

  // Output arrays (computed by native)
  outX: new Float32Array(MAX_COMPONENTS),
  outY: new Float32Array(MAX_COMPONENTS),
  outW: new Float32Array(MAX_COMPONENTS),
  outH: new Float32Array(MAX_COMPONENTS),
};

// Load native library
const titan = dlopen("./libtitan.so", {
  compute_layout: {
    args: [
      "ptr", "ptr", "ptr", "ptr", "ptr", "ptr", "ptr",  // inputs
      "ptr", "ptr", "ptr", "ptr",  // outputs
      "u32", "u32", "u32"  // count, terminalWidth, terminalHeight
    ],
    returns: "i32",
  },
});

// Reactive layout computation
const layoutDerived = derived(() => {
  // Reactivity detects changes to input arrays
  const count = getAllocatedCount();

  // Single FFI call - all computation in native
  titan.symbols.compute_layout(
    arrays.width, arrays.height, arrays.minWidth, arrays.maxWidth,
    arrays.parentIdx, arrays.flexDirection, arrays.flexWrap,
    arrays.outX, arrays.outY, arrays.outW, arrays.outH,
    count, terminalWidth.value, terminalHeight.value
  );

  // Results already in output arrays
  return {
    x: arrays.outX,
    y: arrays.outY,
    width: arrays.outW,
    height: arrays.outH,
  };
});
```

### Native Side (Zig)

```zig
// libtitan.zig
export fn compute_layout(
    // Inputs (read-only)
    width: [*]f32,
    height: [*]f32,
    min_width: [*]f32,
    max_width: [*]f32,
    parent_idx: [*]i32,
    flex_direction: [*]u8,
    flex_wrap: [*]u8,
    // Outputs (write)
    out_x: [*]f32,
    out_y: [*]f32,
    out_w: [*]f32,
    out_h: [*]f32,
    // Metadata
    count: u32,
    terminal_width: u32,
    terminal_height: u32,
) callconv(.C) i32 {
    // All computation here - no FFI calls back to JS
    // Can use SIMD, skip unchanged, parallel processing, etc.

    // Pass 1: Build tree structure
    // Pass 2: Calculate intrinsic sizes (bottom-up)
    // Pass 3: Resolve constraints (top-down)
    // Pass 4: Position elements

    return 0; // Success
}
```

---

## 7. Advantages of This Approach

| Aspect | Benefit |
|--------|---------|
| **Performance** | 5-10x faster than pure JS layout |
| **Memory** | Zero-copy, no GC pressure during layout |
| **Reactivity** | JS reactivity triggers native compute |
| **Debugging** | JS side still debuggable, native is black box |
| **Scalability** | SIMD potential, 10K+ components feasible |

---

## 8. Considerations

### Pros
- Massive performance gain for large component trees
- Clean separation: JS for reactivity, native for compute
- Parallel arrays map perfectly to C array parameters
- Zero-copy means no serialization overhead

### Cons
- Build complexity (need to compile Zig/C)
- Debugging native code is harder
- Platform-specific binaries (.so/.dylib/.dll)
- `bun:ffi` is experimental (known bugs)

### Recommendation

For TITAN v2:
1. **Design the algorithm** in pure TypeScript first (validate correctness)
2. **Benchmark** to identify if native is needed
3. **Port to Zig** if performance requires it
4. The **interface stays the same** (arrays in → arrays out)

---

## 9. Files Reference

- Bun FFI Docs: `tui-docs-backup/docs/references/bun/docs/runtime/ffi.mdx`
- Type Definitions: `tui-docs-backup/docs/references/bun/packages/bun-types/ffi.d.ts`
- FFI Implementation: `tui-docs-backup/docs/references/bun/src/js/bun/ffi.ts`
- FFI Headers: `tui-docs-backup/docs/references/bun/src/bun.js/api/FFI.h`
- Benchmarks: `tui-docs-backup/docs/references/bun/bench/ffi/`

---

## Part 2: Bun Internal Architecture Patterns

Bun itself is written in Zig and faces the same JS ↔ native challenges. Here's what we can learn from their implementation.

### 10. Type Tagging for Fast Dispatch

**From:** `bun/src/bun.js/webcore/ReadableStream.zig`

Bun uses enum tags to identify data sources and dispatch to optimized code paths:

```zig
pub const Tag = enum(i32) {
    JavaScript = 0,    // Generic, user-defined stream
    Blob = 1,          // In-memory blob - fast path
    File = 2,          // Native file reader - fast path
    Bytes = 4,         // Network byte stream - fast path
    Direct = 3,        // Internal native-to-native
    Invalid = -1,
};
```

**Application to Layout Engine:**
```zig
pub const ComponentType = enum(u8) {
    SimpleBox = 0,     // No children, skip flex algorithm
    TextLeaf = 1,      // Text measurement only
    FlexContainer = 2, // Full flexbox algorithm
    GridContainer = 3, // Full grid algorithm
    Scrollable = 4,    // Needs overflow handling
};

// Dispatch based on tag - no pointer chasing
switch (type_tags[i]) {
    .SimpleBox => computeSimpleBox(i),
    .TextLeaf => computeTextLeaf(i),
    .FlexContainer => computeFlexbox(i),
    // ...
}
```

### 11. BabyList - Optimized Array Container

**From:** `bun/src/collections/baby_list.zig`

Bun's typed array with 32-bit length/capacity:

```zig
pub fn BabyList(comptime Type: type) type {
    return struct {
        ptr: [*]Type = &.{},
        len: u32 = 0,
        cap: u32 = 0,
    };
}
```

**Key optimizations:**
- **Zero-copy slicing:** `.slice()` returns direct pointer
- **Inline hot paths:** `callconv(bun.callconv_inline)`
- **Pre-allocation:** `ensureTotalCapacity` prevents reallocations

**For Layout Engine:**
```zig
pub const ComponentStore = struct {
    // Parallel arrays using BabyList
    widths: BabyList(f32),
    heights: BabyList(f32),
    x_positions: BabyList(f32),
    y_positions: BabyList(f32),
    parent_indices: BabyList(u32),
    type_tags: BabyList(ComponentType),

    // Hot path iteration - SIMD friendly
    pub fn slice(self: *Self) []f32 {
        return self.widths.ptr[0..self.widths.len];
    }
};
```

### 12. Zero-Copy Ownership Signaling

**From:** `bun/src/bun.js/webcore/streams.zig`

Bun uses discriminated unions to signal memory ownership:

```zig
pub const Result = union(Tag) {
    owned: bun.ByteList,              // Receiver owns, must free
    owned_and_done: bun.ByteList,     // Final chunk, owned
    temporary: bun.ByteList,          // Zero-copy view, borrowed
    temporary_and_done: bun.ByteList, // Borrowed + end signal

    pub fn deinit(this: *Result) void {
        switch (this.*) {
            .owned => |*owned| owned.clearAndFree(allocator),
            // temporary variants need no cleanup
            else => {},
        }
    }
};
```

**For Layout Results:**
```zig
pub const LayoutResult = union(enum) {
    cached: *const LayoutCache,     // Borrowed, no cleanup
    computed: ComputedLayout,       // Owned, needs cleanup
    pending: *PendingLayout,        // Async in progress
};
```

### 13. Synchronous Fast Paths

**Pattern:** Check if data is available synchronously, only create async work if needed.

```zig
pub fn computeLayout(self: *LayoutEngine, constraint: Constraint) !LayoutBox {
    // Fast path: cached?
    if (self.cache.isValid(constraint)) {
        return self.cache.result;  // No allocation
    }

    // Fast path: leaf node?
    if (component.childCount == 0) {
        return self.computeLeafLayout(constraint);  // Inline
    }

    // Slow path: full computation
    return self.computeFullLayout(constraint);
}
```

### 14. Tight Loop Inlining

**From:** `bun/src/collections/baby_list.zig`

```zig
pub fn slice(this: Self) callconv(bun.callconv_inline) []Type {
    return this.ptr[0..this.len];
}

pub fn at(this: Self, index: usize) callconv(bun.callconv_inline) *const Type {
    return &this.ptr[index];
}
```

**For Layout Loops:**
```zig
// Force inline for hot paths
pub fn getWidth(self: *Self, i: u32) callconv(.Inline) f32 {
    return self.widths.ptr[i];
}

// Comptime loop unrolling
pub fn forEachComponent(self: *Self, comptime callback: fn(u32) void) void {
    for (0..self.count) |i| {
        callback(i);  // Monomorphic, fully inlined
    }
}
```

### 15. Memory Pooling

**From:** `bun/src/pool.zig`

Object pools with configurable threading:

```zig
pub fn ObjectPool(
    comptime Type: type,
    comptime threadsafe: bool,
    comptime max_count: comptime_int,
) type {
    return struct {
        threadlocal var data_threadlocal: DataStruct = .{};

        pub fn acquire(allocator: Allocator) !*Type {
            if (data().list.popFirst()) |node| {
                return &node.data;  // Reuse pooled
            }
            return allocator.create(Type);  // Allocate new
        }

        pub fn release(item: *Type) void {
            data().list.prepend(item);  // Return to pool
        }
    };
}
```

**For Layout Tasks:**
```zig
pub const LayoutTaskPool = ObjectPool(
    LayoutTask,
    false,  // Thread-local (no lock)
    128     // Max pooled
);

// Use pooled tasks - no allocation during layout
const task = try LayoutTaskPool.acquire(allocator);
defer LayoutTaskPool.release(task);
task.run();
```

---

## Part 3: Architecture Synthesis

### Recommended TITAN v2 Architecture

Based on Bun's patterns, here's the recommended approach:

```
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript Layer                                                │
│  - Signals/reactivity detect changes                            │
│  - TypedArrays for parallel component data                      │
│  - Single FFI call triggers native computation                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ (one FFI call, zero-copy)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Native Layer (Zig)                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ComponentStore (Parallel Arrays)                        │   │
│  │  - widths[], heights[], parents[], types[]               │   │
│  │  - BabyList<f32> for cache-friendly access               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Type-Tagged Dispatch                                    │   │
│  │  switch (type_tags[i]) {                                 │   │
│  │    .SimpleBox => fast_path(),                            │   │
│  │    .FlexContainer => flexbox_algorithm(),                │   │
│  │    .GridContainer => grid_algorithm(),                   │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Layout Algorithm (3 passes)                             │   │
│  │  1. Top-down: Propagate available space                  │   │
│  │  2. Bottom-up: Calculate desired sizes                   │   │
│  │  3. Top-down: Finalize positions                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Output Arrays (written in-place)                        │   │
│  │  - outX[], outY[], outW[], outH[]                        │   │
│  │  - Same TypedArrays passed from JS                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (returns, arrays already updated)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript Layer                                                │
│  - frameBuffer reads computed positions                         │
│  - Renders to terminal                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data structure | Parallel arrays | Cache-friendly, SIMD-able, matches FFI |
| Language | Zig | Same as Bun, zero-cost FFI, SIMD built-in |
| Dispatch | Type tags | No virtual calls, branch prediction friendly |
| Memory | Pre-allocated pools | No allocation during layout |
| Interface | TypedArrays | Zero-copy JS ↔ native |

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| 1K components | < 0.1ms | 10x faster than current TS |
| 10K components | < 1ms | Scales linearly |
| FFI overhead | < 1μs | Negligible vs. computation |
| Memory | Zero allocation | Pre-allocated arrays |

---

## Next Steps

1. **Prototype in TS** - Validate algorithm correctness
2. **Benchmark** - Measure current TS vs. target
3. **Port to Zig** - If performance requires it
4. **Integrate** - FFI bindings, reactive triggers

The key insight: **The algorithm design is language-agnostic. Get it right in TS, then port if needed.**
