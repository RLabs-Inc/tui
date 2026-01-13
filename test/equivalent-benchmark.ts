#!/usr/bin/env bun
/**
 * Equivalent Benchmark - Truly Fair Comparison with OpenTUI
 *
 * This benchmark isolates the EXACT same operations that OpenTUI measures:
 *
 * OpenTUI's drawTextBuffer benchmark measures:
 * - COLD: buffer setup + text wrapping + render to cells
 * - WARM: pre-wrapped text, just render to cells
 * - HOT: pre-wrapped text, reused buffer, just render to cells
 *
 * We measure our equivalent operations:
 * - Text wrapping: wrapTextLines()
 * - Cell writing: drawText() to a buffer
 * - Buffer creation: createBuffer()
 *
 * Same dimensions as OpenTUI:
 * - 80x24, 120x40, 200x60, 400x200
 *
 * Same text sizes:
 * - 100 lines, 500 lines, 1000 lines, 10k lines
 */

import { wrapTextLines } from '../src/pipeline/layout/utils/text-measure'
import { createBuffer, drawText, fillRect } from '../src/renderer/buffer'
import { Colors } from '../src/types/color'
import type { FrameBuffer, RGBA } from '../src/types'

// =============================================================================
// TEST DATA GENERATION (matches OpenTUI)
// =============================================================================

function generateTestText(lineCount: number, avgLineLength: number = 60): string {
  const words = [
    'Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'Ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  ]

  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    let line = ''
    while (line.length < avgLineLength) {
      const word = words[Math.floor(Math.random() * words.length)]!
      line += (line.length > 0 ? ' ' : '') + word
    }
    lines.push(line)
  }
  return lines.join('\n')
}

// Pre-generate test data for different sizes
const testTexts = {
  lines100: generateTestText(100),
  lines500: generateTestText(500),
  lines1000: generateTestText(1000),
  lines10000: generateTestText(10000),
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

function formatTime(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)}ns`
  if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`
  return `${(ns / 1_000_000_000).toFixed(2)}s`
}

interface BenchResult {
  min: number
  max: number
  avg: number
  median: number
  samples: number[]
}

function runBench(name: string, iterations: number, fn: () => void): BenchResult {
  const samples: number[] = []

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    fn()
  }

  // Actual measurement
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds()
    fn()
    const end = Bun.nanoseconds()
    samples.push(end - start)
  }

  samples.sort((a, b) => a - b)
  const min = samples[0]!
  const max = samples[samples.length - 1]!
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  const median = samples[Math.floor(samples.length / 2)]!

  return { min, max, avg, median, samples }
}

function printResult(name: string, result: BenchResult) {
  console.log(`  ${name}:`)
  console.log(`    min: ${formatTime(result.min)}, max: ${formatTime(result.max)}`)
  console.log(`    avg: ${formatTime(result.avg)}, median: ${formatTime(result.median)}`)
}

// =============================================================================
// ISOLATED BENCHMARKS
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════════')
console.log('  TUI Framework - Equivalent Benchmarks (matching OpenTUI)')
console.log('═══════════════════════════════════════════════════════════════════')
console.log()

// -----------------------------------------------------------------------------
// 1. TEXT WRAPPING ONLY (equivalent to OpenTUI's text chunking/wrapping)
// -----------------------------------------------------------------------------
console.log('┌─────────────────────────────────────────────────────────────────┐')
console.log('│ 1. TEXT WRAPPING (wrapTextLines)                                │')
console.log('│    Equivalent to OpenTUI TextBuffer word wrapping               │')
console.log('└─────────────────────────────────────────────────────────────────┘')

const wrapWidths = [80, 120, 200]

for (const [textName, text] of Object.entries(testTexts)) {
  console.log(`\n  Text: ${textName} (${text.length} chars, ~${text.split('\n').length} input lines)`)

  for (const width of wrapWidths) {
    const result = runBench(`wrap to ${width}`, 100, () => {
      wrapTextLines(text, width)
    })
    printResult(`  width=${width}`, result)
  }
}

// -----------------------------------------------------------------------------
// 2. BUFFER CREATION ONLY (equivalent to OpenTUI buffer allocation)
// -----------------------------------------------------------------------------
console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│ 2. BUFFER CREATION (createBuffer)                               │')
console.log('│    Equivalent to OpenTUI OptimizedBuffer init                   │')
console.log('└─────────────────────────────────────────────────────────────────┘')

const bufferSizes = [
  { w: 80, h: 24, name: '80x24' },
  { w: 120, h: 40, name: '120x40' },
  { w: 200, h: 60, name: '200x60' },
  { w: 400, h: 200, name: '400x200' },
]

for (const size of bufferSizes) {
  const result = runBench(size.name, 100, () => {
    createBuffer(size.w, size.h, Colors.BLACK)
  })
  printResult(size.name, result)
}

// -----------------------------------------------------------------------------
// 3. CELL WRITING ONLY (equivalent to OpenTUI drawTextBuffer HOT path)
// -----------------------------------------------------------------------------
console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│ 3. CELL WRITING - HOT PATH (drawText to pre-allocated buffer)   │')
console.log('│    Equivalent to OpenTUI drawTextBuffer HOT (reused buffer)     │')
console.log('│    This is the FAIR comparison to their 55-76μs HOT benchmark   │')
console.log('└─────────────────────────────────────────────────────────────────┘')

// Pre-wrap text and pre-allocate buffer (like OpenTUI's HOT path)
for (const size of bufferSizes) {
  console.log(`\n  Buffer: ${size.name}`)

  for (const [textName, text] of Object.entries(testTexts)) {
    // Pre-wrap text (done outside timing, like OpenTUI)
    const wrappedLines = wrapTextLines(text, size.w)

    // Pre-allocate buffer (done outside timing, like OpenTUI)
    const buffer = createBuffer(size.w, size.h, Colors.BLACK)

    // Measure ONLY the cell writing (HOT path)
    const result = runBench(`${textName}`, 100, () => {
      // Write pre-wrapped lines to buffer (this is what OpenTUI's drawTextBuffer does)
      const linesToRender = Math.min(wrappedLines.length, size.h)
      for (let y = 0; y < linesToRender; y++) {
        drawText(buffer, 0, y, wrappedLines[y]!, Colors.WHITE, undefined, 0)
      }
    })

    const linesRendered = Math.min(wrappedLines.length, size.h)
    printResult(`  ${textName} (${linesRendered} visible lines)`, result)
  }
}

// -----------------------------------------------------------------------------
// 4. WARM PATH (pre-wrapped, fresh buffer)
// -----------------------------------------------------------------------------
console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│ 4. WARM PATH (pre-wrapped text, fresh buffer each time)         │')
console.log('│    Equivalent to OpenTUI drawTextBuffer WARM                    │')
console.log('└─────────────────────────────────────────────────────────────────┘')

for (const size of bufferSizes) {
  console.log(`\n  Buffer: ${size.name}`)

  for (const [textName, text] of Object.entries(testTexts)) {
    // Pre-wrap text (done outside timing)
    const wrappedLines = wrapTextLines(text, size.w)

    // Measure buffer creation + cell writing (WARM path)
    const result = runBench(`${textName}`, 100, () => {
      const buffer = createBuffer(size.w, size.h, Colors.BLACK)
      const linesToRender = Math.min(wrappedLines.length, size.h)
      for (let y = 0; y < linesToRender; y++) {
        drawText(buffer, 0, y, wrappedLines[y]!, Colors.WHITE, undefined, 0)
      }
    })

    const linesRendered = Math.min(wrappedLines.length, size.h)
    printResult(`  ${textName} (${linesRendered} visible lines)`, result)
  }
}

// -----------------------------------------------------------------------------
// 5. COLD PATH (everything from scratch)
// -----------------------------------------------------------------------------
console.log('\n┌─────────────────────────────────────────────────────────────────┐')
console.log('│ 5. COLD PATH (text wrap + buffer creation + cell writing)       │')
console.log('│    Equivalent to OpenTUI drawTextBuffer COLD                    │')
console.log('└─────────────────────────────────────────────────────────────────┘')

for (const size of bufferSizes) {
  console.log(`\n  Buffer: ${size.name}`)

  for (const [textName, text] of Object.entries(testTexts)) {
    // Measure EVERYTHING (COLD path)
    const result = runBench(`${textName}`, 50, () => {
      // Wrap text
      const wrappedLines = wrapTextLines(text, size.w)

      // Create buffer
      const buffer = createBuffer(size.w, size.h, Colors.BLACK)

      // Write to buffer
      const linesToRender = Math.min(wrappedLines.length, size.h)
      for (let y = 0; y < linesToRender; y++) {
        drawText(buffer, 0, y, wrappedLines[y]!, Colors.WHITE, undefined, 0)
      }
    })

    printResult(`  ${textName}`, result)
  }
}

// -----------------------------------------------------------------------------
// 6. SUMMARY COMPARISON
// -----------------------------------------------------------------------------
console.log('\n═══════════════════════════════════════════════════════════════════')
console.log('  SUMMARY: Direct Comparison with OpenTUI')
console.log('═══════════════════════════════════════════════════════════════════')
console.log()

// Run the key comparison benchmark
const comparisonSize = { w: 120, h: 40 }
const comparisonText = testTexts.lines500
const comparisonWrapped = wrapTextLines(comparisonText, comparisonSize.w)
const comparisonBuffer = createBuffer(comparisonSize.w, comparisonSize.h, Colors.BLACK)

const hotResult = runBench('HOT', 1000, () => {
  const linesToRender = Math.min(comparisonWrapped.length, comparisonSize.h)
  for (let y = 0; y < linesToRender; y++) {
    drawText(comparisonBuffer, 0, y, comparisonWrapped[y]!, Colors.WHITE, undefined, 0)
  }
})

const warmResult = runBench('WARM', 1000, () => {
  const buffer = createBuffer(comparisonSize.w, comparisonSize.h, Colors.BLACK)
  const linesToRender = Math.min(comparisonWrapped.length, comparisonSize.h)
  for (let y = 0; y < linesToRender; y++) {
    drawText(buffer, 0, y, comparisonWrapped[y]!, Colors.WHITE, undefined, 0)
  }
})

const coldResult = runBench('COLD', 500, () => {
  const wrapped = wrapTextLines(comparisonText, comparisonSize.w)
  const buffer = createBuffer(comparisonSize.w, comparisonSize.h, Colors.BLACK)
  const linesToRender = Math.min(wrapped.length, comparisonSize.h)
  for (let y = 0; y < linesToRender; y++) {
    drawText(buffer, 0, y, wrapped[y]!, Colors.WHITE, undefined, 0)
  }
})

console.log('  120x40 buffer, 500 lines of text:')
console.log()
console.log('  ┌────────────┬──────────────────┬──────────────────┬─────────┐')
console.log('  │ Path       │ OpenTUI (Zig)    │ TUI (TypeScript) │ Ratio   │')
console.log('  ├────────────┼──────────────────┼──────────────────┼─────────┤')
console.log(`  │ HOT        │ 55-76μs          │ ${formatTime(hotResult.median).padEnd(16)} │ ${(hotResult.median / 65000).toFixed(2)}x    │`)
console.log(`  │ WARM       │ 58-79μs          │ ${formatTime(warmResult.median).padEnd(16)} │ ${(warmResult.median / 68000).toFixed(2)}x    │`)
console.log(`  │ COLD       │ 257-370μs        │ ${formatTime(coldResult.median).padEnd(16)} │ ${(coldResult.median / 313000).toFixed(2)}x    │`)
console.log('  └────────────┴──────────────────┴──────────────────┴─────────┘')
console.log()
console.log('  OpenTUI reference numbers from: bench:native (ReleaseFast Zig)')
console.log('  HOT = pre-wrapped text, reused buffer')
console.log('  WARM = pre-wrapped text, fresh buffer')
console.log('  COLD = wrap text + create buffer + render')
console.log()
