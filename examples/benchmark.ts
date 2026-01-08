/**
 * TUI Framework - Comprehensive Benchmark Suite
 *
 * Tests:
 * 1. Bulk Add - Create N components
 * 2. Bulk Update Text - Update N text contents
 * 3. Bulk Update Colors - Update N colors
 * 4. Bulk Update Dimensions - Update N widths/heights
 * 5. Single Update Latency - Time for one change to render
 * 6. Rapid Fire - Max updates per second
 * 7. Layout Computation - TITAN layout time
 * 8. FrameBuffer Generation - Buffer compute time
 * 9. Full Pipeline - End-to-end reactive update
 * 10. Memory Usage - Heap size with N components
 */

import { signal, derived, effect } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { allocateIndex, releaseIndex, getAllocatedIndices } from '../src/engine/registry'
import { layoutDerived } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'
import * as core from '../src/engine/arrays/core'
import * as textArrays from '../src/engine/arrays/text'
import * as visual from '../src/engine/arrays/visual'
import * as dimensions from '../src/engine/arrays/dimensions'
import { bind, unwrap } from '@rlabs-inc/signals'
import { ComponentType } from '../src/types'
import { Colors } from '../src/types/color'

// =============================================================================
// UTILITIES
// =============================================================================

function formatTime(ms: number): string {
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1) return `${ms.toFixed(3)}ms`
  return `${ms.toFixed(2)}ms`
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function clearAllComponents(): void {
  const indices = [...getAllocatedIndices()]
  for (const i of indices) {
    releaseIndex(i)
  }
  // Force GC to actually release memory
  Bun.gc(true)
}

// =============================================================================
// BENCHMARKS
// =============================================================================

interface BenchmarkResult {
  name: string
  count: number
  totalMs: number
  avgMs: number
  medianMs?: number
  p95Ms?: number
  opsPerSec?: number
}

const results: BenchmarkResult[] = []

/**
 * Benchmark 1: Bulk Add Components
 */
function benchmarkBulkAdd(count: number): BenchmarkResult {
  clearAllComponents()

  const start = Bun.nanoseconds()

  // Create a root box
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(100)
  dimensions.height[rootIndex] = bind(100)

  // Add N text components
  for (let i = 0; i < count; i++) {
    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(`Item ${i}`)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  const elapsed = (Bun.nanoseconds() - start) / 1_000_000

  const result: BenchmarkResult = {
    name: `Bulk Add ${formatNumber(count)}`,
    count,
    totalMs: elapsed,
    avgMs: elapsed / count,
    opsPerSec: Math.round(count / (elapsed / 1000)),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 2: Bulk Update Text Content
 */
function benchmarkBulkUpdateText(count: number): BenchmarkResult {
  clearAllComponents()

  // Setup: create signals for each text
  const textSignals: ReturnType<typeof signal<string>>[] = []

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(100)
  dimensions.height[rootIndex] = bind(100)

  for (let i = 0; i < count; i++) {
    const textSig = signal(`Item ${i}`)
    textSignals.push(textSig)

    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(textSig)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  // Benchmark: update all text signals
  const start = Bun.nanoseconds()

  for (let i = 0; i < count; i++) {
    textSignals[i].value = `Updated ${i}`
  }

  const elapsed = (Bun.nanoseconds() - start) / 1_000_000

  const result: BenchmarkResult = {
    name: `Bulk Update Text ${formatNumber(count)}`,
    count,
    totalMs: elapsed,
    avgMs: elapsed / count,
    opsPerSec: Math.round(count / (elapsed / 1000)),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 3: Bulk Update Colors
 */
function benchmarkBulkUpdateColors(count: number): BenchmarkResult {
  clearAllComponents()

  const colorSignals: ReturnType<typeof signal<typeof Colors.RED>>[] = []
  const colorOptions = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.CYAN]

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(100)
  dimensions.height[rootIndex] = bind(100)

  for (let i = 0; i < count; i++) {
    const colorSig = signal(Colors.WHITE)
    colorSignals.push(colorSig)

    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(`Item ${i}`)
    visual.fgColor[index] = bind(colorSig)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  // Benchmark: update all color signals
  const start = Bun.nanoseconds()

  for (let i = 0; i < count; i++) {
    colorSignals[i].value = colorOptions[i % colorOptions.length]
  }

  const elapsed = (Bun.nanoseconds() - start) / 1_000_000

  const result: BenchmarkResult = {
    name: `Bulk Update Colors ${formatNumber(count)}`,
    count,
    totalMs: elapsed,
    avgMs: elapsed / count,
    opsPerSec: Math.round(count / (elapsed / 1000)),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 4: Layout Computation
 */
function benchmarkLayout(count: number): BenchmarkResult {
  clearAllComponents()

  // Setup components
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(200)
  dimensions.height[rootIndex] = bind(200)

  for (let i = 0; i < count; i++) {
    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(`Item ${i}`)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  // Benchmark: compute layout multiple times
  const iterations = 100
  const times: number[] = []

  for (let iter = 0; iter < iterations; iter++) {
    const start = Bun.nanoseconds()
    const _ = layoutDerived.value
    times.push((Bun.nanoseconds() - start) / 1_000_000)
  }

  const result: BenchmarkResult = {
    name: `Layout ${formatNumber(count)} components`,
    count,
    totalMs: times.reduce((a, b) => a + b, 0),
    avgMs: times.reduce((a, b) => a + b, 0) / iterations,
    medianMs: median(times),
    p95Ms: percentile(times, 95),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 5: FrameBuffer Generation
 */
function benchmarkFrameBuffer(count: number): BenchmarkResult {
  clearAllComponents()

  // Setup components
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(200)
  dimensions.height[rootIndex] = bind(200)

  for (let i = 0; i < count; i++) {
    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(`Item ${i}`)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  // Compute layout first
  layoutDerived.value

  // Benchmark: generate framebuffer multiple times
  const iterations = 100
  const times: number[] = []

  for (let iter = 0; iter < iterations; iter++) {
    const start = Bun.nanoseconds()
    const _ = frameBufferDerived.value.buffer
    times.push((Bun.nanoseconds() - start) / 1_000_000)
  }

  const result: BenchmarkResult = {
    name: `FrameBuffer ${formatNumber(count)} components`,
    count,
    totalMs: times.reduce((a, b) => a + b, 0),
    avgMs: times.reduce((a, b) => a + b, 0) / iterations,
    medianMs: median(times),
    p95Ms: percentile(times, 95),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 6: Rapid Fire Updates
 */
function benchmarkRapidFire(durationMs: number = 1000): BenchmarkResult {
  clearAllComponents()

  // Setup single text component
  const counter = signal(0)

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(50)
  dimensions.height[rootIndex] = bind(10)

  const textIndex = allocateIndex()
  core.componentType[textIndex] = ComponentType.TEXT
  core.parentIndex[textIndex] = bind(rootIndex)
  core.visible[textIndex] = bind(1)
  textArrays.textContent[textIndex] = bind(derived(() => `Count: ${counter.value}`))
  dimensions.width[textIndex] = bind(20)
  dimensions.height[textIndex] = bind(1)

  // Rapid fire updates for duration
  let updateCount = 0
  const startTime = Date.now()
  const endTime = startTime + durationMs

  while (Date.now() < endTime) {
    counter.value++
    // Read layout and framebuffer to simulate full pipeline
    layoutDerived.value
    frameBufferDerived.value.buffer
    updateCount++
  }

  const actualDuration = Date.now() - startTime
  const updatesPerSec = Math.round(updateCount / (actualDuration / 1000))

  const result: BenchmarkResult = {
    name: `Rapid Fire (${durationMs}ms)`,
    count: updateCount,
    totalMs: actualDuration,
    avgMs: actualDuration / updateCount,
    opsPerSec: updatesPerSec,
  }

  results.push(result)
  return result
}

/**
 * Benchmark 7: Single Update Latency
 */
function benchmarkSingleUpdate(): BenchmarkResult {
  clearAllComponents()

  // Setup
  const counter = signal(0)
  const counterText = derived(() => `Count: ${counter.value}`)

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(50)
  dimensions.height[rootIndex] = bind(10)

  const textIndex = allocateIndex()
  core.componentType[textIndex] = ComponentType.TEXT
  core.parentIndex[textIndex] = bind(rootIndex)
  core.visible[textIndex] = bind(1)
  textArrays.textContent[textIndex] = bind(counterText)
  dimensions.width[textIndex] = bind(20)
  dimensions.height[textIndex] = bind(1)

  // Warm up
  for (let i = 0; i < 100; i++) {
    counter.value++
    layoutDerived.value
    frameBufferDerived.value.buffer
  }

  // Benchmark many single updates
  const iterations = 1000
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds()
    counter.value++
    layoutDerived.value
    frameBufferDerived.value.buffer
    times.push((Bun.nanoseconds() - start) / 1_000_000)
  }

  const result: BenchmarkResult = {
    name: 'Single Update Latency',
    count: iterations,
    totalMs: times.reduce((a, b) => a + b, 0),
    avgMs: times.reduce((a, b) => a + b, 0) / iterations,
    medianMs: median(times),
    p95Ms: percentile(times, 95),
  }

  results.push(result)
  return result
}

/**
 * Benchmark 8: Memory Usage
 * Note: Run with `bun --smol run examples/benchmark.ts` for accurate memory
 */
function benchmarkMemory(count: number): { count: number; heapMB: number; perComponentKB: number } {
  clearAllComponents()

  // Force GC if available (need --expose-gc flag)
  if (typeof global.gc === 'function') global.gc()

  // Use RSS (Resident Set Size) which is more reliable
  const rssBefore = process.memoryUsage().rss

  // Create components
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(100)
  dimensions.height[rootIndex] = bind(100)

  for (let i = 0; i < count; i++) {
    const index = allocateIndex()
    core.componentType[index] = ComponentType.TEXT
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    textArrays.textContent[index] = bind(`Item ${i}`)
    visual.fgColor[index] = bind(Colors.WHITE)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(1)
  }

  // Force GC if available
  if (typeof global.gc === 'function') global.gc()

  const rssAfter = process.memoryUsage().rss
  const rssDiff = rssAfter - rssBefore
  const heapMB = rssDiff / 1024 / 1024
  const perComponentKB = (rssDiff / count) / 1024

  return { count, heapMB, perComponentKB }
}

// =============================================================================
// RUN BENCHMARKS
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║           TUI FRAMEWORK - BENCHMARK SUITE                        ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()

// Test sizes
const sizes = [1000, 5000, 10000]

// Bulk Add
console.log('📦 BULK ADD COMPONENTS')
console.log('─'.repeat(60))
for (const size of sizes) {
  const r = benchmarkBulkAdd(size)
  console.log(`  ${r.name}: ${formatTime(r.totalMs)} (${formatTime(r.avgMs)}/op, ${formatNumber(r.opsPerSec!)}/sec)`)
}
console.log()

// Bulk Update Text
console.log('📝 BULK UPDATE TEXT')
console.log('─'.repeat(60))
for (const size of sizes) {
  const r = benchmarkBulkUpdateText(size)
  console.log(`  ${r.name}: ${formatTime(r.totalMs)} (${formatTime(r.avgMs)}/op, ${formatNumber(r.opsPerSec!)}/sec)`)
}
console.log()

// Bulk Update Colors
console.log('🎨 BULK UPDATE COLORS')
console.log('─'.repeat(60))
for (const size of sizes) {
  const r = benchmarkBulkUpdateColors(size)
  console.log(`  ${r.name}: ${formatTime(r.totalMs)} (${formatTime(r.avgMs)}/op, ${formatNumber(r.opsPerSec!)}/sec)`)
}
console.log()

// Layout Computation
console.log('📐 LAYOUT COMPUTATION (TITAN)')
console.log('─'.repeat(60))
for (const size of sizes) {
  const r = benchmarkLayout(size)
  console.log(`  ${r.name}: avg ${formatTime(r.avgMs)}, median ${formatTime(r.medianMs!)}, p95 ${formatTime(r.p95Ms!)}`)
}
console.log()

// FrameBuffer Generation
console.log('🖼️  FRAMEBUFFER GENERATION')
console.log('─'.repeat(60))
for (const size of sizes) {
  const r = benchmarkFrameBuffer(size)
  console.log(`  ${r.name}: avg ${formatTime(r.avgMs)}, median ${formatTime(r.medianMs!)}, p95 ${formatTime(r.p95Ms!)}`)
}
console.log()

// Single Update Latency
console.log('⚡ SINGLE UPDATE LATENCY')
console.log('─'.repeat(60))
const singleUpdate = benchmarkSingleUpdate()
console.log(`  ${singleUpdate.name}: avg ${formatTime(singleUpdate.avgMs)}, median ${formatTime(singleUpdate.medianMs!)}, p95 ${formatTime(singleUpdate.p95Ms!)}`)
console.log()

// Rapid Fire
console.log('🔥 RAPID FIRE UPDATES')
console.log('─'.repeat(60))
const rapidFire = benchmarkRapidFire(1000)
console.log(`  ${rapidFire.name}: ${formatNumber(rapidFire.count)} updates, ${formatNumber(rapidFire.opsPerSec!)} updates/sec`)
console.log()

// Memory Usage
console.log('💾 MEMORY USAGE')
console.log('─'.repeat(60))
for (const size of sizes) {
  const mem = benchmarkMemory(size)
  console.log(`  ${formatNumber(mem.count)} components: ${mem.heapMB.toFixed(2)} MB (${mem.perComponentKB.toFixed(2)} KB/component)`)
}
console.log()

// =============================================================================
// STRESS TESTS
// =============================================================================

console.log('🔥 STRESS TESTS')
console.log('─'.repeat(60))

/**
 * Stress Test 1: Sustained Load (30 seconds continuous)
 */
function stressTestSustainedLoad(durationSecs: number = 10): void {
  clearAllComponents()

  const counter = signal(0)
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(50)
  dimensions.height[rootIndex] = bind(10)

  const textIndex = allocateIndex()
  core.componentType[textIndex] = ComponentType.TEXT
  core.parentIndex[textIndex] = bind(rootIndex)
  core.visible[textIndex] = bind(1)
  textArrays.textContent[textIndex] = bind(derived(() => `Count: ${counter.value}`))
  dimensions.width[textIndex] = bind(20)
  dimensions.height[textIndex] = bind(1)

  const startTime = Date.now()
  const endTime = startTime + (durationSecs * 1000)
  let updates = 0
  let minOps = Infinity
  let maxOps = 0
  let lastSecond = startTime
  let opsThisSecond = 0

  console.log(`  Sustained Load: Running for ${durationSecs}s...`)

  while (Date.now() < endTime) {
    counter.value++
    layoutDerived.value
    frameBufferDerived.value.buffer
    updates++
    opsThisSecond++

    const now = Date.now()
    if (now - lastSecond >= 1000) {
      if (opsThisSecond < minOps) minOps = opsThisSecond
      if (opsThisSecond > maxOps) maxOps = opsThisSecond
      opsThisSecond = 0
      lastSecond = now
    }
  }

  const actualDuration = (Date.now() - startTime) / 1000
  const avgOps = Math.round(updates / actualDuration)

  console.log(`    Total updates: ${formatNumber(updates)}`)
  console.log(`    Avg: ${formatNumber(avgOps)}/sec, Min: ${formatNumber(minOps)}/sec, Max: ${formatNumber(maxOps)}/sec`)
  console.log(`    Variance: ${((maxOps - minOps) / avgOps * 100).toFixed(1)}%`)
}

/**
 * Stress Test 2: Memory Leak Detection
 */
function stressTestMemoryLeak(iterations: number = 100): void {
  console.log(`  Memory Leak Test: ${iterations} create/destroy cycles...`)

  const heapStart = process.memoryUsage().heapUsed
  const startTime = Bun.nanoseconds()

  for (let i = 0; i < iterations; i++) {
    // Create 100 components
    const indices: number[] = []
    const rootIndex = allocateIndex()
    core.componentType[rootIndex] = ComponentType.BOX
    core.parentIndex[rootIndex] = bind(-1)
    core.visible[rootIndex] = bind(1)
    dimensions.width[rootIndex] = bind(100)
    dimensions.height[rootIndex] = bind(100)
    indices.push(rootIndex)

    for (let j = 0; j < 100; j++) {
      const idx = allocateIndex()
      core.componentType[idx] = ComponentType.TEXT
      core.parentIndex[idx] = bind(rootIndex)
      core.visible[idx] = bind(1)
      textArrays.textContent[idx] = bind(`Item ${j}`)
      dimensions.width[idx] = bind(20)
      dimensions.height[idx] = bind(1)
      indices.push(idx)
    }

    // Force layout computation
    layoutDerived.value

    // Destroy all - cleanup is automatic via FinalizationRegistry
    for (const idx of indices) {
      releaseIndex(idx)
    }

    // Force GC every 10 iterations to let FinalizationRegistry callbacks run
    if (i % 10 === 0) {
      Bun.gc(true)
    }
  }

  const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000
  const heapEnd = process.memoryUsage().heapUsed
  const heapGrowth = (heapEnd - heapStart) / 1024 / 1024

  console.log(`    Time: ${formatTime(elapsed)} (${formatTime(elapsed / iterations)}/cycle)`)
  console.log(`    Heap growth: ${heapGrowth.toFixed(2)} MB over ${iterations * 100} component cycles`)
  console.log(`    Per cycle: ${(heapGrowth * 1024 / iterations).toFixed(2)} KB`)
}

/**
 * Stress Test 3: Concurrent Signal Updates
 */
function stressTestConcurrentUpdates(count: number = 1000): void {
  clearAllComponents()
  console.log(`  Concurrent Updates: ${count} signals updating simultaneously...`)

  const signals: ReturnType<typeof signal<number>>[] = []

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(200)
  dimensions.height[rootIndex] = bind(200)

  for (let i = 0; i < count; i++) {
    const sig = signal(0)
    signals.push(sig)

    const idx = allocateIndex()
    core.componentType[idx] = ComponentType.TEXT
    core.parentIndex[idx] = bind(rootIndex)
    core.visible[idx] = bind(1)
    textArrays.textContent[idx] = bind(derived(() => `Val: ${sig.value}`))
    dimensions.width[idx] = bind(20)
    dimensions.height[idx] = bind(1)
  }

  // Update all signals rapidly
  const iterations = 100
  const start = Bun.nanoseconds()

  for (let iter = 0; iter < iterations; iter++) {
    // Update all signals
    for (const sig of signals) {
      sig.value++
    }
    // Compute full pipeline
    layoutDerived.value
    frameBufferDerived.value.buffer
  }

  const elapsed = (Bun.nanoseconds() - start) / 1_000_000
  const totalUpdates = count * iterations
  const updatesPerSec = Math.round(totalUpdates / (elapsed / 1000))

  console.log(`    ${formatNumber(totalUpdates)} signal updates in ${formatTime(elapsed)}`)
  console.log(`    ${formatNumber(updatesPerSec)} updates/sec with full pipeline`)
}

/**
 * Stress Test 4: Maximum Component Limit - PUSH TO BREAKING POINT
 */
function stressTestMaxComponents(): void {
  clearAllComponents()
  console.log('  Maximum Components: Finding the BREAKING POINT...')

  // Go crazy - up to 1 MILLION (will use lots of RAM!)
  const sizes = [10000, 50000, 100000, 250000, 500000, 1000000]

  for (const size of sizes) {
    clearAllComponents()

    try {
      const start = Bun.nanoseconds()

      const rootIndex = allocateIndex()
      core.componentType[rootIndex] = ComponentType.BOX
      core.parentIndex[rootIndex] = bind(-1)
      core.visible[rootIndex] = bind(1)
      dimensions.width[rootIndex] = bind(500)
      dimensions.height[rootIndex] = bind(500)

      for (let i = 0; i < size; i++) {
        const idx = allocateIndex()
        core.componentType[idx] = ComponentType.TEXT
        core.parentIndex[idx] = bind(rootIndex)
        core.visible[idx] = bind(1)
        textArrays.textContent[idx] = bind(`Item ${i}`)
        dimensions.width[idx] = bind(20)
        dimensions.height[idx] = bind(1)
      }

      // Try to compute layout
      const layoutStart = Bun.nanoseconds()
      layoutDerived.value
      const layoutTime = (Bun.nanoseconds() - layoutStart) / 1_000_000

      const totalTime = (Bun.nanoseconds() - start) / 1_000_000

      console.log(`    ${formatNumber(size)}: ✓ (create: ${formatTime(totalTime - layoutTime)}, layout: ${formatTime(layoutTime)})`)
    } catch (e) {
      console.log(`    ${formatNumber(size)}: ✗ FAILED - ${(e as Error).message}`)
      break
    }
  }
}

/**
 * Stress Test 5: Deep Nesting - EXTREME DEPTH
 */
function stressTestDeepNesting(depth: number = 500): void {
  clearAllComponents()
  console.log(`  Deep Nesting: ${depth} levels deep...`)

  const start = Bun.nanoseconds()

  let parentIdx = allocateIndex()
  core.componentType[parentIdx] = ComponentType.BOX
  core.parentIndex[parentIdx] = bind(-1)
  core.visible[parentIdx] = bind(1)
  dimensions.width[parentIdx] = bind(200)
  dimensions.height[parentIdx] = bind(200)

  for (let i = 0; i < depth; i++) {
    const idx = allocateIndex()
    core.componentType[idx] = ComponentType.BOX
    core.parentIndex[idx] = bind(parentIdx)
    core.visible[idx] = bind(1)
    dimensions.width[idx] = bind(180)
    dimensions.height[idx] = bind(180)
    parentIdx = idx
  }

  // Add text at the deepest level
  const textIdx = allocateIndex()
  core.componentType[textIdx] = ComponentType.TEXT
  core.parentIndex[textIdx] = bind(parentIdx)
  core.visible[textIdx] = bind(1)
  textArrays.textContent[textIdx] = bind('Deep text!')
  dimensions.width[textIdx] = bind(20)
  dimensions.height[textIdx] = bind(1)

  const createTime = (Bun.nanoseconds() - start) / 1_000_000

  const layoutStart = Bun.nanoseconds()
  const layout = layoutDerived.value
  const layoutTime = (Bun.nanoseconds() - layoutStart) / 1_000_000

  // Verify deep text has valid position
  const deepTextX = layout.x[textIdx]
  const deepTextY = layout.y[textIdx]

  console.log(`    Create: ${formatTime(createTime)}, Layout: ${formatTime(layoutTime)}`)
  console.log(`    Deep text position: (${deepTextX}, ${deepTextY})`)
}

// Run stress tests with explicit cleanup between each
stressTestSustainedLoad(10)
clearAllComponents()
console.log()

Bun.gc(true)  // Clean up before memory test
stressTestMemoryLeak(100)  // 100 cycles × 100 components = 10K component lifecycles
clearAllComponents()
console.log()

stressTestConcurrentUpdates(1000)
clearAllComponents()
console.log()

stressTestMaxComponents()
clearAllComponents()
console.log()

stressTestDeepNesting(500)  // Testing deep nesting - TITAN v3 handles this!
clearAllComponents()
console.log()

// Summary
console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║                         SUMMARY                                  ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()
console.log(`  Single Update Latency:  ${formatTime(singleUpdate.medianMs!)} (median)`)
console.log(`  Rapid Fire Throughput:  ${formatNumber(rapidFire.opsPerSec!)} updates/sec`)
console.log(`  Layout (10K):           ${formatTime(results.find(r => r.name.includes('Layout') && r.count === 10000)?.avgMs || 0)} (avg)`)
console.log(`  FrameBuffer (10K):      ${formatTime(results.find(r => r.name.includes('FrameBuffer') && r.count === 10000)?.avgMs || 0)} (avg)`)
console.log()
