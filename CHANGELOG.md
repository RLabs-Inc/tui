# Changelog

All notable changes to the TUI Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-01-17

### Added
- **Focus trap API exports** - `pushFocusTrap`, `popFocusTrap`, `isFocusTrapped`, `getFocusTrapContainer` now accessible from root
- **Mouse handler exports** - `onMouseDown`, `onMouseUp`, `onClick`, `onScroll`, `onComponent` now accessible from root
- **Comprehensive test suite** - 775 tests across 17 files (up from 125)
  - Input primitive tests (76 tests)
  - Template primitive tests (each: 38, show: 31, when: 28)
  - Box/text primitive tests (94 tests)
  - Keyboard state tests (61 tests)
  - Theme state tests (69 tests)
  - Mouse/scroll tests (53 tests)
  - Renderer tests (95 tests)
  - Inheritance tests (44 tests)
  - Stress tests (26 tests) - deep nesting, large component counts, rapid updates
  - Integration tests (35 tests) - nested primitives, full pipeline

### Fixed
- **Memory leak in mount.ts** - Process exception handlers now only registered once per process
- **FPS validation in drawnCursor.ts** - Returns no-op for fps ≤ 0 (prevents infinite interval)
- **O(n²) text measurement** - Replaced `indexOf()` with loop index in text-measure.ts
- **TITAN array bounds safety** - Replaced unsafe `array[index]!` with `array[index] ?? -1`
- **show.ts reactive dependency** - Effect now reads condition on every run to establish proper dependency
- **Border style triple-read** - Inlined `hasBorder()` check using already-fetched borderStyles (33% fewer array reads)

### Changed
- **Code cleanup** - Removed duplicate `Cleanup` type definition (scope.ts now imports from types.ts)
- **Shared helper extraction** - `enumSource` moved to utils.ts (removed duplication in box.ts/text.ts)
- **Dead code removal** - Removed unused `SelectProps`, `SelectOption`, `ProgressProps` types

## [0.5.0] - 2025-01-17

### Added
- **Input primitive** - Full-featured single-line text input with:
  - Two-way value binding via `WritableSignal` or `Binding`
  - Password mode with configurable mask character
  - Cursor styles (block, bar, underline) with blink animation
  - Full keyboard handling (arrows, home/end, backspace/delete, enter/escape)
  - Focus management integration (Tab/Shift+Tab navigation)
  - Theme variants support
  - Callbacks: `onChange`, `onSubmit`, `onCancel`, `onFocus`, `onBlur`
- **Input documentation** - User guide and API reference
- **id prop** for `text()` and `input()` primitives (matches `box()`)
- **Duplicate key warning** in `each()` primitive for development

### Fixed
- **Focus callback overwrite bug** - `registerFocusCallbacks` now supports multiple registrations per component (fixed cursor blink not working)
- **Race condition in `when.ts`** - Added scope alive check before rendering after promise resolves
- **Double render in `show.ts`** - Deferred condition read until after initialization
- **Memory leak in `drawnCursor.ts`** - Auto-registers cleanup with `onDestroy` lifecycle hook
- **Focus history index reuse** - Now stores `{index, id}` pairs to prevent focusing wrong component after index recycling
- **Tab index overflow** - Changed sort from subtraction to explicit comparison
- **Signal detection in `context.ts`** - Now checks for `Symbol('signal.source')` instead of just `'value' in obj`
- **Hash collision in TITAN** - Added string length to text cache key

## [0.4.0] - 2025-01-16

### Added
- **Lifecycle hooks** - `onMount()` and `onDestroy()` for component lifecycle management
- **Reactive context system** - `createContext()`, `provide()`, `useContext()` for dependency injection
- Zero overhead when hooks not used

### Fixed
- Test infrastructure improvements
- Reactive syntax documentation updates

## [0.3.0] - 2025-01-15

### Added
- **Professional documentation overhaul** - 52 files, 16K+ lines
  - Getting started guides
  - API reference for all primitives and state modules
  - Architecture documentation
  - Pattern guides (lists, modals, forms)

### Changed
- Removed benchmarks and publishing from CLAUDE.md
- Updated README with cleaner examples

## [0.2.4] - 2025-01-14

### Fixed
- Use `clearViewport` instead of `clearTerminal` to preserve scrollback history

### Added
- Sync mode for all renderers
- Append mode overflow handling improvements

## [0.2.1] - 2025-01-13

### Fixed
- Restore `eraseActive` call in `renderToHistory` for proper append mode
- Move `eraseActive` inside batch to prevent race conditions
- Ghost line bug in `InlineRenderer`
- Include child margins in intrinsic size calculation

### Added
- **Append mode** with `renderToHistory` for O(1) chat UIs
- DX improvements: `scoped()`, `onCleanup()`, `useAnimation()`
- Export `reactiveProps` for user component development

## [0.2.0] - 2025-01-12

### Added
- **Template primitives** - `each()`, `show()`, `when()` with recursive cleanup
- Full reactivity demo in Counter template

### Fixed
- Dedupe user imports in compiler
- Unwrap ternary results in derived attrs

## [0.1.x] - Earlier releases

### Added
- Core framework: box, text primitives
- TITAN flexbox layout engine
- Parallel arrays (ECS pattern)
- State modules: keyboard, mouse, focus, scroll, theme, cursor
- Fine-grained reactivity via @rlabs-inc/signals
- Multiple render modes: fullscreen, inline, append
