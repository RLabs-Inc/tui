/**
 * TUI Framework - OpenTUI Comparison Benchmarks
 *
 * Direct comparison with OpenTUI's Zig benchmarks.
 * Tests the same scenarios for apples-to-apples performance comparison.
 *
 * Run: bun run test/opentui-comparison.ts
 *
 * OpenTUI numbers (Zig, ReleaseFast):
 * - COLD 120x40: 278-330μs
 * - WARM 120x40: 61-275μs
 * - HOT 120x40: 57-289μs
 * - 80x24: 24-74μs
 * - 200x60: 127-624μs
 * - 400x200: 669μs-7.43ms
 */

import { signal, effect, flushSync } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { layoutDerived } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'
import { measureText, measureTextWidth, wrapTextLines } from '../src/pipeline/layout/utils/text-measure'

// =============================================================================
// UTILITIES
// =============================================================================

interface MemStat {
  name: string
  bytes: number
}

interface BenchResult {
  name: string
  minNs: number
  avgNs: number
  maxNs: number
  iterations: number
  memStats?: MemStat[]
}

function formatTime(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)}ns`
  if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`
  return `${(ns / 1_000_000).toFixed(2)}ms`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

function getMemoryUsage(): { heap: number; rss: number } {
  const mem = process.memoryUsage()
  return { heap: mem.heapUsed, rss: mem.rss }
}

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

// Generate test text like OpenTUI does
function generateText(lines: number, avgLineLen: number): string {
  const patterns = [
    'The quick brown fox jumps over the lazy dog. ',
    'Lorem ipsum dolor sit amet consectetur. ',
    'function test() { return 42; } ',
    'Hello 世界 Unicode テスト 🌍 ',
    'Mixed: ASCII 中文 emoji 🚀💻 text. ',
  ]

  let result = ''
  for (let i = 0; i < lines; i++) {
    let lineLen = 0
    while (lineLen < avgLineLen) {
      const pattern = patterns[i % patterns.length]!
      result += pattern
      lineLen += pattern.length
    }
    result += '\n'
  }
  return result
}

function generateSingleLine(targetBytes: number): string {
  let result = ''
  while (result.length < targetBytes) {
    result += 'word '
  }
  return result
}

function generateManySmallChunks(chunks: number): string {
  let result = ''
  for (let i = 0; i < chunks; i++) {
    result += 'ab '
    if (i % 20 === 19) result += '\n'
  }
  return result
}

// =============================================================================
// TEXT MEASUREMENT BENCHMARKS (like TextBuffer/TextBufferView)
// =============================================================================

function benchSetText(): BenchResult[] {
  const results: BenchResult[] = []
  const iterations = 10

  // Small text (3 lines, ~40 bytes)
  {
    const text = 'Hello, world!\nSecond line\nThird line'
    const times: number[] = []

    Bun.gc(true)
    const memBefore = getMemoryUsage()

    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds()
      // "setText" equivalent - measure the text
      const _ = measureText(text, 80)
      times.push(Bun.nanoseconds() - start)
    }

    const memAfter = getMemoryUsage()

    results.push({
      name: 'measureText small (3 lines, 40 bytes)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
      memStats: [{ name: 'Heap', bytes: memAfter.heap - memBefore.heap }],
    })
  }

  // Large text (5000 lines, ~1MB)
  {
    const textContent = generateText(5000, 200) // ~1MB

    Bun.gc(true)
    const memBefore = getMemoryUsage()
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds()
      const _ = measureText(textContent, 80)
      times.push(Bun.nanoseconds() - start)
    }

    const memAfter = getMemoryUsage()

    results.push({
      name: `measureText large (5k lines, ${(textContent.length / 1024 / 1024).toFixed(2)} MiB)`,
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
      memStats: [{ name: 'Heap', bytes: memAfter.heap - memBefore.heap }],
    })
  }

  return results
}

function benchWrap(): BenchResult[] {
  const results: BenchResult[] = []
  const iterations = 10

  const textMultiline = generateText(5000, 200) // ~1MB multi-line
  const textSingleline = generateSingleLine(2 * 1024 * 1024) // 2MB single line

  const scenarios = [
    { width: 40, singleLine: false, label: 'word, width=40, multi-line' },
    { width: 80, singleLine: false, label: 'word, width=80, multi-line' },
    { width: 120, singleLine: false, label: 'word, width=120, multi-line' },
    { width: 40, singleLine: true, label: 'word, width=40, single-line' },
    { width: 80, singleLine: true, label: 'word, width=80, single-line' },
    { width: 120, singleLine: true, label: 'word, width=120, single-line' },
  ]

  for (const scenario of scenarios) {
    const content = scenario.singleLine ? textSingleline : textMultiline
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = Bun.nanoseconds()
      const _ = wrapTextLines(content, scenario.width)
      times.push(Bun.nanoseconds() - start)
    }

    results.push({
      name: `wrapTextLines (${scenario.label})`,
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  return results
}

// =============================================================================
// COMPONENT + LAYOUT BENCHMARKS (like measureForDimensions)
// =============================================================================

function benchLayout(): BenchResult[] {
  const results: BenchResult[] = []
  const iterations = 10

  // Static layout - no streaming
  {
    const textContent = generateText(500, 100)
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      cleanupAll()
      terminalWidth.value = 120
      terminalHeight.value = 40

      // Create component tree
      const cleanup = box({
        width: 120,
        height: 40,
        children: () => {
          text({ content: textContent, wrap: 'wrap' })
        }
      })

      const start = Bun.nanoseconds()
      // Force layout calculation
      const _ = layoutDerived.value
      times.push(Bun.nanoseconds() - start)

      cleanup()
    }

    results.push({
      name: 'TITAN layout (500 lines, static)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  // Streaming layout simulation - repeated measure calls
  {
    cleanupAll()
    terminalWidth.value = 120
    terminalHeight.value = 40

    const contentSignal = signal('')
    const cleanup = box({
      width: 120,
      height: 40,
      children: () => {
        text({ content: contentSignal, wrap: 'wrap' })
      }
    })

    // Initial layout
    flushSync()
    const _ = layoutDerived.value

    const times: number[] = []
    const steps = 200
    const token = 'token '

    for (let iter = 0; iter < iterations; iter++) {
      contentSignal.value = ''
      flushSync()

      const start = Bun.nanoseconds()
      for (let step = 0; step < steps; step++) {
        contentSignal.value += token
        if ((step + 1) % 20 === 0) contentSignal.value += '\n'
        flushSync()
        // Force 3 layout passes like OpenTUI does
        for (let pass = 0; pass < 3; pass++) {
          const __ = layoutDerived.value
        }
      }
      times.push(Bun.nanoseconds() - start)
    }

    cleanup()

    results.push({
      name: 'TITAN layout (streaming, 200 steps × 3 passes)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  return results
}

// =============================================================================
// FRAME BUFFER BENCHMARKS (like drawTextBuffer)
// =============================================================================

function benchFrameBuffer(): BenchResult[] {
  const results: BenchResult[] = []
  const iterations = 10

  // ==========================================================================
  // FAIR COMPARISON: Separate setup from render (like OpenTUI does)
  // OpenTUI times ONLY drawTextBuffer, not TextBuffer creation or wrapping
  // ==========================================================================

  const scenarios = [
    { w: 120, h: 40, lines: 500, label: '120x40 (500 lines)' },
    { w: 80, h: 24, lines: 100, label: '80x24 (100 lines)' },
    { w: 200, h: 60, lines: 1000, label: '200x60 (1000 lines)' },
    { w: 400, h: 200, lines: 10000, label: '400x200 (10k lines)' },
  ]

  // COLD: Full pipeline including setup (NOT what OpenTUI measures)
  for (const scenario of scenarios) {
    const textContent = generateText(scenario.lines, scenario.w)
    const times: number[] = []

    Bun.gc(true)
    const memBefore = getMemoryUsage()
    let memAfter = memBefore

    for (let i = 0; i < iterations; i++) {
      cleanupAll()
      terminalWidth.value = scenario.w
      terminalHeight.value = scenario.h

      const start = Bun.nanoseconds()

      // Create component tree
      const cleanup = box({
        width: scenario.w,
        height: scenario.h,
        children: () => {
          text({ content: textContent, wrap: 'wrap' })
        }
      })

      // Force full render pipeline
      flushSync()
      const _ = frameBufferDerived.value

      times.push(Bun.nanoseconds() - start)

      // Capture memory on last iteration
      if (i === iterations - 1) {
        memAfter = getMemoryUsage()
      }
      cleanup()
    }

    results.push({
      name: `FULL: ${scenario.label} (setup+layout+render)`,
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
      memStats: [{ name: 'Heap', bytes: memAfter.heap - memBefore.heap }],
    })
  }

  // FAIR: Pre-setup, force re-render each iteration (like OpenTUI clears buffer)
  for (const scenario of scenarios) {
    const baseText = generateText(scenario.lines, scenario.w)

    // Setup OUTSIDE timer (like OpenTUI does)
    cleanupAll()
    terminalWidth.value = scenario.w
    terminalHeight.value = scenario.h

    const contentSignal = signal(baseText)

    const cleanup = box({
      width: scenario.w,
      height: scenario.h,
      children: () => {
        text({ content: contentSignal, wrap: 'wrap' })
      }
    })

    // Initial render to warm up
    flushSync()
    let _ = layoutDerived.value
    _ = frameBufferDerived.value

    Bun.gc(true)
    const memBefore = getMemoryUsage()
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      // Force dirty by changing content to DIFFERENT value each time
      contentSignal.value = baseText + ` ${i}`  // Different each iteration!
      flushSync()

      // Time the buffer re-computation
      const start = Bun.nanoseconds()
      _ = frameBufferDerived.value
      times.push(Bun.nanoseconds() - start)
    }

    const memAfter = getMemoryUsage()
    cleanup()

    results.push({
      name: `FAIR: ${scenario.label} (re-render, like OpenTUI)`,
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
      memStats: [{ name: 'Heap', bytes: memAfter.heap - memBefore.heap }],
    })
  }

  // WARM: Pre-created tree, just re-render
  {
    cleanupAll()
    terminalWidth.value = 120
    terminalHeight.value = 40

    const textContent = generateText(500, 120)
    const contentSignal = signal(textContent)

    const cleanup = box({
      width: 120,
      height: 40,
      children: () => {
        text({ content: contentSignal, wrap: 'wrap' })
      }
    })

    // Initial render (warm up caches)
    flushSync()
    let _ = frameBufferDerived.value

    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      // Trigger re-render without changing content (test cache)
      contentSignal.value = textContent + ' ' // Tiny change to force update
      flushSync()

      const start = Bun.nanoseconds()
      _ = frameBufferDerived.value
      times.push(Bun.nanoseconds() - start)
    }

    cleanup()

    results.push({
      name: 'WARM: 120x40 (500 lines, pre-wrapped, pure render)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  // HOT: Same buffer, content-only change
  {
    cleanupAll()
    terminalWidth.value = 120
    terminalHeight.value = 40

    const contentSignal = signal('Initial content')

    const cleanup = box({
      width: 120,
      height: 40,
      children: () => {
        text({ content: contentSignal, wrap: 'wrap' })
      }
    })

    // Warm up
    flushSync()
    let _ = frameBufferDerived.value

    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
      // Small content change
      contentSignal.value = `Updated ${i}`
      flushSync()

      const start = Bun.nanoseconds()
      _ = frameBufferDerived.value
      times.push(Bun.nanoseconds() - start)
    }

    cleanup()

    results.push({
      name: 'HOT: 120x40 (content-only update)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  // Many lines, viewport test
  {
    const textContent = generateText(50000, 60)
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      cleanupAll()
      terminalWidth.value = 120
      terminalHeight.value = 40

      const start = Bun.nanoseconds()

      const cleanup = box({
        width: 120,
        height: 40,
        children: () => {
          text({ content: textContent, wrap: 'wrap' })
        }
      })

      flushSync()
      const _ = frameBufferDerived.value

      times.push(Bun.nanoseconds() - start)
      cleanup()
    }

    results.push({
      name: '120x40 (50k lines, viewport first 40)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  // One massive line
  {
    const textContent = generateSingleLine(500 * 1024) // 500KB single line
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      cleanupAll()
      terminalWidth.value = 80
      terminalHeight.value = 30

      const start = Bun.nanoseconds()

      const cleanup = box({
        width: 80,
        height: 30,
        children: () => {
          text({ content: textContent, wrap: 'wrap' })
        }
      })

      flushSync()
      const _ = frameBufferDerived.value

      times.push(Bun.nanoseconds() - start)
      cleanup()
    }

    results.push({
      name: '80x30 (1 massive line 500KB, wrap=80)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  // Many small chunks
  {
    const textContent = generateManySmallChunks(10000)
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      cleanupAll()
      terminalWidth.value = 80
      terminalHeight.value = 30

      const start = Bun.nanoseconds()

      const cleanup = box({
        width: 80,
        height: 30,
        children: () => {
          text({ content: textContent, wrap: 'wrap' })
        }
      })

      flushSync()
      const _ = frameBufferDerived.value

      times.push(Bun.nanoseconds() - start)
      cleanup()
    }

    results.push({
      name: '80x30 (10k tiny chunks)',
      minNs: Math.min(...times),
      avgNs: times.reduce((a, b) => a + b, 0) / times.length,
      maxNs: Math.max(...times),
      iterations,
    })
  }

  return results
}

// =============================================================================
// MAIN
// =============================================================================

function printResults(title: string, results: BenchResult[], showMem: boolean = true) {
  console.log(`\n=== ${title} ===\n`)
  const memCol = showMem ? ' │ Mem'.padStart(12) : ''
  console.log('─'.repeat(showMem ? 105 : 90))
  console.log(`${'Benchmark'.padEnd(55)} │ ${'Min'.padStart(10)} │ ${'Avg'.padStart(10)} │ ${'Max'.padStart(10)}${memCol}`)
  console.log('─'.repeat(showMem ? 105 : 90))

  for (const r of results) {
    const name = r.name.length > 54 ? r.name.slice(0, 51) + '...' : r.name
    let memStr = ''
    if (showMem && r.memStats && r.memStats.length > 0) {
      memStr = ` │ ${formatBytes(r.memStats[0]!.bytes).padStart(10)}`
    } else if (showMem) {
      memStr = ' │ ' + '-'.padStart(10)
    }
    console.log(
      `${name.padEnd(55)} │ ${formatTime(r.minNs).padStart(10)} │ ${formatTime(r.avgNs).padStart(10)} │ ${formatTime(r.maxNs).padStart(10)}${memStr}`
    )
  }
  console.log('─'.repeat(showMem ? 105 : 90))
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║                    TUI Framework vs OpenTUI Comparison Benchmarks                     ║')
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════════╣')
  console.log('║  Comparing TypeScript/Bun vs Zig/ReleaseFast                                          ║')
  console.log('║  OpenTUI numbers for reference in comments above                                      ║')
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════╝')

  // Warm up
  await Bun.sleep(100)
  Bun.gc(true)

  // Text measurement
  printResults('Text Measurement (vs TextBuffer setText)', benchSetText())

  Bun.gc(true)
  await Bun.sleep(50)

  // Text wrapping
  printResults('Text Wrapping (vs TextBufferView wrap)', benchWrap())

  Bun.gc(true)
  await Bun.sleep(50)

  // Layout
  printResults('Layout Engine (vs measureForDimensions)', benchLayout())

  Bun.gc(true)
  await Bun.sleep(50)

  // Frame buffer
  printResults('Frame Buffer (vs drawTextBuffer)', benchFrameBuffer())

  console.log('\n✅ Benchmarks complete!')
  console.log('\nOpenTUI reference numbers (Zig ReleaseFast):')
  console.log('  COLD 120x40: 278-330μs')
  console.log('  WARM 120x40: 61-275μs')
  console.log('  HOT 120x40: 57-289μs')
  console.log('  80x24: 24-74μs')
  console.log('  200x60: 127-624μs')
  console.log('  400x200: 669μs-7.43ms')
}

main().catch(console.error)
