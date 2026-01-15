# Renderers

> Terminal output implementations

## Overview

TUI has three renderers for different modes:

| Renderer | Mode | Strategy |
|----------|------|----------|
| `DiffRenderer` | fullscreen | Differential (only changed cells) |
| `InlineRenderer` | inline | Erase + redraw |
| `AppendRegionRenderer` | append | Static + reactive regions |

## DiffRenderer

For fullscreen mode. Only outputs changed cells.

### Algorithm

```typescript
class DiffRenderer {
  private prevBuffer: FrameBuffer | null = null
  private lastFg: RGBA | null = null
  private lastBg: RGBA | null = null
  private lastAttrs: CellAttrs = 0
  private cursorX = 0
  private cursorY = 0

  render(buffer: FrameBuffer) {
    const output: string[] = []

    // Begin synchronized update
    output.push('\x1b[?2026h')

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.get(x, y)
        const prevCell = this.prevBuffer?.get(x, y)

        // Skip unchanged cells
        if (prevCell && cellEquals(cell, prevCell)) {
          continue
        }

        // Move cursor if needed
        if (x !== this.cursorX || y !== this.cursorY) {
          output.push(cursorTo(x, y))
          this.cursorX = x
          this.cursorY = y
        }

        // Update colors/attrs if needed
        if (!rgbaEquals(cell.fg, this.lastFg)) {
          output.push(toAnsiFg(cell.fg))
          this.lastFg = cell.fg
        }
        if (!rgbaEquals(cell.bg, this.lastBg)) {
          output.push(toAnsiBg(cell.bg))
          this.lastBg = cell.bg
        }
        if (cell.attrs !== this.lastAttrs) {
          output.push(toAnsiAttrs(cell.attrs))
          this.lastAttrs = cell.attrs
        }

        // Output character
        output.push(String.fromCodePoint(cell.char))
        this.cursorX++
      }
    }

    // End synchronized update
    output.push('\x1b[?2026l')

    // Write to terminal
    process.stdout.write(output.join(''))

    this.prevBuffer = buffer.clone()
  }

  invalidate() {
    this.prevBuffer = null
  }
}
```

### Optimizations

1. **Cursor positioning**: Skips cells, minimizes cursor moves
2. **State tracking**: Only outputs color changes when needed
3. **Synchronized update**: Prevents flicker during render

## InlineRenderer

For inline mode. Erases previous content and redraws.

### Algorithm

```typescript
class InlineRenderer {
  private lastHeight = 0

  render(buffer: FrameBuffer) {
    const output: string[] = []

    // Erase previous content
    if (this.lastHeight > 0) {
      // Move to start of previous content
      output.push(`\x1b[${this.lastHeight}A`)
      // Erase from cursor to end of screen
      output.push('\x1b[J')
    }

    // Reset state
    let lastFg: RGBA | null = null
    let lastBg: RGBA | null = null
    let lastAttrs: CellAttrs = 0

    // Render each line
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.get(x, y)

        // Update colors/attrs if needed
        if (!rgbaEquals(cell.fg, lastFg)) {
          output.push(toAnsiFg(cell.fg))
          lastFg = cell.fg
        }
        if (!rgbaEquals(cell.bg, lastBg)) {
          output.push(toAnsiBg(cell.bg))
          lastBg = cell.bg
        }
        if (cell.attrs !== lastAttrs) {
          output.push(toAnsiAttrs(cell.attrs))
          lastAttrs = cell.attrs
        }

        output.push(String.fromCodePoint(cell.char))
      }

      // Newline (except last line)
      if (y < buffer.height - 1) {
        output.push('\r\n')
      }
    }

    // Reset colors
    output.push('\x1b[0m')

    process.stdout.write(output.join(''))
    this.lastHeight = buffer.height
  }
}
```

### Characteristics

- Simpler than diff renderer
- Higher per-frame cost (O(cells))
- Good for short-lived content

## AppendRegionRenderer

For append mode. Splits output into static history and reactive region.

### Architecture

```
Terminal History (scrollback)     ← Static region (frozen content)
─────────────────────────────────
Active Viewport                   ← Reactive region (current render)
```

### Algorithm

```typescript
class AppendRegionRenderer {
  private staticWriter: FileSink
  private totalStaticLines = 0
  private lastReactiveHeight = 0

  constructor() {
    // Use Bun's FileSink for buffered stdout writes
    const stdoutFile = Bun.file(1)
    this.staticWriter = stdoutFile.writer({ highWaterMark: 1024 * 1024 })
  }

  render(buffer: FrameBuffer) {
    // Clear previous reactive content
    if (this.lastReactiveHeight > 0) {
      process.stdout.write(`\x1b[${this.lastReactiveHeight}A\x1b[J`)
    }

    // Render reactive content
    const output = this.renderBuffer(buffer)
    process.stdout.write(output)

    this.lastReactiveHeight = buffer.height
  }

  renderToHistory(buffer: FrameBuffer) {
    // Move cursor up to clear any reactive content
    if (this.lastReactiveHeight > 0) {
      process.stdout.write(`\x1b[${this.lastReactiveHeight}A\x1b[J`)
      this.lastReactiveHeight = 0
    }

    // Write to static region (history)
    const output = this.renderBuffer(buffer)
    this.staticWriter.write(output + '\n')
    this.staticWriter.flush()

    this.totalStaticLines += buffer.height
  }

  private renderBuffer(buffer: FrameBuffer): string {
    const output: string[] = []
    let lastFg: RGBA | null = null
    let lastBg: RGBA | null = null
    let lastAttrs: CellAttrs = 0

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.get(x, y)

        if (!rgbaEquals(cell.fg, lastFg)) {
          output.push(toAnsiFg(cell.fg))
          lastFg = cell.fg
        }
        if (!rgbaEquals(cell.bg, lastBg)) {
          output.push(toAnsiBg(cell.bg))
          lastBg = cell.bg
        }
        if (cell.attrs !== lastAttrs) {
          output.push(toAnsiAttrs(cell.attrs))
          lastAttrs = cell.attrs
        }

        output.push(String.fromCodePoint(cell.char))
      }

      if (y < buffer.height - 1) {
        output.push('\r\n')
      }
    }

    output.push('\x1b[0m')
    return output.join('')
  }

  cleanup() {
    this.staticWriter.end()
  }
}
```

### Benefits

- O(active content) render time
- Infinite history support
- Native terminal scroll

## FrameBuffer

The buffer structure all renderers use:

```typescript
interface Cell {
  char: number      // Unicode code point
  fg: RGBA | null   // Foreground color
  bg: RGBA | null   // Background color
  attrs: CellAttrs  // Text attributes
}

class FrameBuffer {
  private cells: Cell[]
  readonly width: number
  readonly height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = new Array(width * height)

    // Initialize with spaces
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = {
        char: 0x20,  // space
        fg: null,
        bg: null,
        attrs: 0
      }
    }
  }

  get(x: number, y: number): Cell {
    return this.cells[y * this.width + x]
  }

  set(x: number, y: number, cell: Partial<Cell>) {
    const idx = y * this.width + x
    Object.assign(this.cells[idx], cell)
  }

  clone(): FrameBuffer {
    const copy = new FrameBuffer(this.width, this.height)
    for (let i = 0; i < this.cells.length; i++) {
      copy.cells[i] = { ...this.cells[i] }
    }
    return copy
  }
}
```

## ANSI Helpers

```typescript
// Foreground color
function toAnsiFg(color: RGBA | null): string {
  if (!color || color.r === -1) return '\x1b[39m'  // Default
  return `\x1b[38;2;${color.r};${color.g};${color.b}m`
}

// Background color
function toAnsiBg(color: RGBA | null): string {
  if (!color || color.r === -1) return '\x1b[49m'  // Default
  return `\x1b[48;2;${color.r};${color.g};${color.b}m`
}

// Text attributes
function toAnsiAttrs(attrs: CellAttrs): string {
  const codes: number[] = [0]  // Reset first

  if (attrs & Attr.BOLD) codes.push(1)
  if (attrs & Attr.DIM) codes.push(2)
  if (attrs & Attr.ITALIC) codes.push(3)
  if (attrs & Attr.UNDERLINE) codes.push(4)
  if (attrs & Attr.BLINK) codes.push(5)
  if (attrs & Attr.INVERSE) codes.push(7)
  if (attrs & Attr.HIDDEN) codes.push(8)
  if (attrs & Attr.STRIKETHROUGH) codes.push(9)

  return `\x1b[${codes.join(';')}m`
}

// Cursor positioning
function cursorTo(x: number, y: number): string {
  return `\x1b[${y + 1};${x + 1}H`
}
```

## Performance Comparison

| Renderer | Best Case | Worst Case | Use When |
|----------|-----------|------------|----------|
| DiffRenderer | O(1) | O(cells) | Fullscreen, frequent updates |
| InlineRenderer | O(cells) | O(cells) | Short content, simple |
| AppendRegionRenderer | O(active) | O(active) | Growing content, logs |

## See Also

- [Architecture](../architecture.md)
- [Pipeline](./pipeline.md)
- [Render Modes Guide](../../guides/rendering/render-modes.md)
