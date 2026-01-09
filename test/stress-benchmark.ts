/**
 * TUI Framework - Comprehensive Stress Benchmark
 *
 * Tests ALL operations in complete cycles:
 * 1. CREATE - Component instantiation
 * 2. UPDATE - Property mutations (text, colors, dimensions, layout)
 * 3. LAYOUT - TITAN layout computation
 * 4. FRAMEBUFFER - Buffer generation
 * 5. DESTROY - Component cleanup
 *
 * Uses Bun.nanoseconds() for high-precision timing.
 */

import { signal, derived, effect } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import {
  allocateIndex,
  releaseIndex,
  getAllocatedIndices,
  resetRegistry
} from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'
import * as textArrays from '../src/engine/arrays/text'
import * as visual from '../src/engine/arrays/visual'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as layout from '../src/engine/arrays/layout'
import { bind } from '@rlabs-inc/signals'
import { Colors } from '../src/types/color'

// =============================================================================
// UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

function formatNanos(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)}ns`
  if (ns < 1_000_000) return `${(ns / 1000).toFixed(2)}μs`
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`
  return `${(ns / 1_000_000_000).toFixed(2)}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatRate(count: number, nanos: number): string {
  const perSecond = count / (nanos / 1_000_000_000)
  if (perSecond >= 1_000_000) return `${(perSecond / 1_000_000).toFixed(2)}M/sec`
  if (perSecond >= 1_000) return `${(perSecond / 1_000).toFixed(2)}K/sec`
  return `${perSecond.toFixed(0)}/sec`
}

interface Stats {
  count: number
  totalNs: number
  minNs: number
  maxNs: number
  samples: number[]
}

function createStats(): Stats {
  return { count: 0, totalNs: 0, minNs: Infinity, maxNs: 0, samples: [] }
}

function recordSample(stats: Stats, ns: number): void {
  stats.count++
  stats.totalNs += ns
  stats.minNs = Math.min(stats.minNs, ns)
  stats.maxNs = Math.max(stats.maxNs, ns)
  if (stats.samples.length < 10000) stats.samples.push(ns)
}

function getPercentile(stats: Stats, p: number): number {
  if (stats.samples.length === 0) return 0
  const sorted = [...stats.samples].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * p / 100)
  return sorted[Math.min(idx, sorted.length - 1)]
}

function printStats(name: string, stats: Stats): void {
  const avg = stats.totalNs / stats.count
  console.log(`  ${name}:`)
  console.log(`    Count: ${stats.count.toLocaleString()}`)
  console.log(`    Total: ${formatNanos(stats.totalNs)}`)
  console.log(`    Avg:   ${formatNanos(avg)}`)
  console.log(`    Min:   ${formatNanos(stats.minNs)}`)
  console.log(`    Max:   ${formatNanos(stats.maxNs)}`)
  console.log(`    p50:   ${formatNanos(getPercentile(stats, 50))}`)
  console.log(`    p95:   ${formatNanos(getPercentile(stats, 95))}`)
  console.log(`    p99:   ${formatNanos(getPercentile(stats, 99))}`)
  console.log(`    Rate:  ${formatRate(stats.count, stats.totalNs)}`)
}

// =============================================================================
// INDIVIDUAL OPERATION BENCHMARKS
// =============================================================================

async function benchmarkCreate(count: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  const stats = createStats()
  const cleanups: (() => void)[] = []

  for (let i = 0; i < count; i++) {
    const start = Bun.nanoseconds()
    const cleanup = box({
      width: 50,
      height: 10,
      children: () => {
        text({ content: `Item ${i}` })
      }
    })
    const elapsed = Bun.nanoseconds() - start
    recordSample(stats, elapsed)
    cleanups.push(cleanup)
  }

  // Cleanup
  cleanups.forEach(c => c())
  cleanupAll()

  return stats
}

async function benchmarkUpdateText(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Create components with reactive text
  const textSignals: ReturnType<typeof signal<string>>[] = []
  const cleanups: (() => void)[] = []

  for (let i = 0; i < count; i++) {
    const content = signal(`Initial ${i}`)
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

  // Measure updates
  const stats = createStats()

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < count; i++) {
      const start = Bun.nanoseconds()
      textSignals[i].value = `Updated ${i} - ${iter}`
      const elapsed = Bun.nanoseconds() - start
      recordSample(stats, elapsed)
    }
  }

  // Cleanup
  cleanups.forEach(c => c())
  cleanupAll()

  return stats
}

async function benchmarkUpdateColors(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Create components with reactive colors
  const colorSignals: ReturnType<typeof signal<typeof Colors.red>>[] = []
  const cleanups: (() => void)[] = []

  const colors = [Colors.red, Colors.green, Colors.blue, Colors.yellow, Colors.cyan, Colors.magenta]

  for (let i = 0; i < count; i++) {
    const fg = signal(Colors.white)
    colorSignals.push(fg)
    const cleanup = box({
      width: 20,
      height: 5,
      fg,
      bg: Colors.black,
    })
    cleanups.push(cleanup)
  }

  // Measure updates
  const stats = createStats()

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < count; i++) {
      const start = Bun.nanoseconds()
      colorSignals[i].value = colors[(iter + i) % colors.length]
      const elapsed = Bun.nanoseconds() - start
      recordSample(stats, elapsed)
    }
  }

  // Cleanup
  cleanups.forEach(c => c())
  cleanupAll()

  return stats
}

async function benchmarkUpdateDimensions(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Create components with reactive dimensions
  const widthSignals: ReturnType<typeof signal<number>>[] = []
  const heightSignals: ReturnType<typeof signal<number>>[] = []
  const cleanups: (() => void)[] = []

  for (let i = 0; i < count; i++) {
    const width = signal(20 + (i % 10))
    const height = signal(5 + (i % 5))
    widthSignals.push(width)
    heightSignals.push(height)
    const cleanup = box({ width, height })
    cleanups.push(cleanup)
  }

  // Measure updates
  const stats = createStats()

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < count; i++) {
      const start = Bun.nanoseconds()
      widthSignals[i].value = 20 + ((iter + i) % 50)
      heightSignals[i].value = 5 + ((iter + i) % 20)
      const elapsed = Bun.nanoseconds() - start
      recordSample(stats, elapsed)
    }
  }

  // Cleanup
  cleanups.forEach(c => c())
  cleanupAll()

  return stats
}

async function benchmarkLayout(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Set terminal size
  terminalWidth.value = 200
  terminalHeight.value = 100

  // Create nested component tree
  const widthSignal = signal(100)

  const cleanup = box({
    width: widthSignal,
    height: 80,
    flexDirection: 'column',
    children: () => {
      for (let i = 0; i < count; i++) {
        box({
          width: '100%',
          height: 3,
          flexDirection: 'row',
          children: () => {
            text({ content: `Row ${i}` })
          }
        })
      }
    }
  })

  // Warm up
  layoutDerived.value

  // Measure layout recomputation
  const stats = createStats()

  for (let iter = 0; iter < iterations; iter++) {
    // Trigger layout recomputation by changing dimension
    widthSignal.value = 100 + (iter % 50)

    const start = Bun.nanoseconds()
    const result = layoutDerived.value
    const elapsed = Bun.nanoseconds() - start
    recordSample(stats, elapsed)
  }

  // Cleanup
  cleanup()
  cleanupAll()

  return stats
}

async function benchmarkFrameBuffer(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Set terminal size
  terminalWidth.value = 200
  terminalHeight.value = 100

  // Create component tree with varied content
  const textSignal = signal('Hello')

  const cleanup = box({
    width: 180,
    height: 80,
    flexDirection: 'column',
    children: () => {
      for (let i = 0; i < count; i++) {
        box({
          width: '100%',
          height: 3,
          fg: Colors.white,
          bg: i % 2 === 0 ? Colors.blue : Colors.green,
          children: () => {
            text({ content: textSignal })
          }
        })
      }
    }
  })

  // Warm up
  layoutDerived.value
  frameBufferDerived.value

  // Measure frame buffer generation
  const stats = createStats()

  for (let iter = 0; iter < iterations; iter++) {
    // Trigger recomputation
    textSignal.value = `Frame ${iter}`
    layoutDerived.value // Ensure layout is fresh

    const start = Bun.nanoseconds()
    const result = frameBufferDerived.value
    const elapsed = Bun.nanoseconds() - start
    recordSample(stats, elapsed)
  }

  // Cleanup
  cleanup()
  cleanupAll()

  return stats
}

async function benchmarkFullPipeline(count: number, iterations: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  // Set terminal size
  terminalWidth.value = 200
  terminalHeight.value = 100

  // Create reactive component tree
  const textSignal = signal('Initial')
  const colorSignal = signal(Colors.white)
  const widthSignal = signal(180)

  const cleanup = box({
    width: widthSignal,
    height: 80,
    flexDirection: 'column',
    children: () => {
      for (let i = 0; i < count; i++) {
        box({
          width: '100%',
          height: 3,
          fg: colorSignal,
          bg: Colors.black,
          children: () => {
            text({ content: textSignal })
          }
        })
      }
    }
  })

  // Warm up
  layoutDerived.value
  frameBufferDerived.value

  // Measure full pipeline
  const stats = createStats()
  const colors = [Colors.red, Colors.green, Colors.blue, Colors.yellow, Colors.cyan]

  for (let iter = 0; iter < iterations; iter++) {
    // Update multiple things
    textSignal.value = `Pipeline ${iter}`
    colorSignal.value = colors[iter % colors.length]
    widthSignal.value = 150 + (iter % 50)

    const start = Bun.nanoseconds()
    layoutDerived.value
    frameBufferDerived.value
    const elapsed = Bun.nanoseconds() - start
    recordSample(stats, elapsed)
  }

  // Cleanup
  cleanup()
  cleanupAll()

  return stats
}

async function benchmarkDestroy(count: number): Promise<Stats> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(50)

  const stats = createStats()

  // Create components
  const cleanups: (() => void)[] = []
  for (let i = 0; i < count; i++) {
    const cleanup = box({
      width: 50,
      height: 10,
      children: () => {
        text({ content: `Item ${i}` })
      }
    })
    cleanups.push(cleanup)
  }

  // Measure destruction
  for (const cleanup of cleanups) {
    const start = Bun.nanoseconds()
    cleanup()
    const elapsed = Bun.nanoseconds() - start
    recordSample(stats, elapsed)
  }

  cleanupAll()

  return stats
}

// =============================================================================
// STRESS TESTS
// =============================================================================

async function stressTestCycles(
  componentCount: number,
  cycleCount: number
): Promise<{
  createStats: Stats
  updateStats: Stats
  layoutStats: Stats
  frameBufferStats: Stats
  destroyStats: Stats
  memoryGrowthKB: number
  totalTimeMs: number
}> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  const startMem = process.memoryUsage().heapUsed
  const startTime = performance.now()

  const cycleCreateStats = createStats()
  const cycleUpdateStats = createStats()
  const cycleLayoutStats = createStats()
  const cycleFbStats = createStats()
  const cycleDestroyStats = createStats()

  terminalWidth.value = 200
  terminalHeight.value = 100

  for (let cycle = 0; cycle < cycleCount; cycle++) {
    // CREATE
    const textSignals: ReturnType<typeof signal<string>>[] = []
    const cleanups: (() => void)[] = []

    const createStart = Bun.nanoseconds()
    for (let i = 0; i < componentCount; i++) {
      const content = signal(`C${cycle}I${i}`)
      textSignals.push(content)
      const cleanup = box({
        width: 50,
        height: 5,
        children: () => {
          text({ content })
        }
      })
      cleanups.push(cleanup)
    }
    recordSample(cycleCreateStats, Bun.nanoseconds() - createStart)

    // UPDATE
    const updateStart = Bun.nanoseconds()
    for (let i = 0; i < componentCount; i++) {
      textSignals[i].value = `Updated C${cycle}I${i}`
    }
    recordSample(cycleUpdateStats, Bun.nanoseconds() - updateStart)

    // LAYOUT
    const layoutStart = Bun.nanoseconds()
    layoutDerived.value
    recordSample(cycleLayoutStats, Bun.nanoseconds() - layoutStart)

    // FRAMEBUFFER
    const fbStart = Bun.nanoseconds()
    frameBufferDerived.value
    recordSample(cycleFbStats, Bun.nanoseconds() - fbStart)

    // DESTROY
    const destroyStart = Bun.nanoseconds()
    cleanups.forEach(c => c())
    cleanupAll()
    recordSample(cycleDestroyStats, Bun.nanoseconds() - destroyStart)
  }

  Bun.gc(true)
  await Bun.sleep(100)

  const endMem = process.memoryUsage().heapUsed
  const totalTime = performance.now() - startTime

  return {
    createStats: cycleCreateStats,
    updateStats: cycleUpdateStats,
    layoutStats: cycleLayoutStats,
    frameBufferStats: cycleFbStats,
    destroyStats: cycleDestroyStats,
    memoryGrowthKB: (endMem - startMem) / 1024,
    totalTimeMs: totalTime
  }
}

async function stressTestSustained(
  componentCount: number,
  durationMs: number
): Promise<{
  totalUpdates: number
  updatesPerSec: number
  avgLatencyNs: number
  maxLatencyNs: number
  p99LatencyNs: number
}> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  terminalWidth.value = 200
  terminalHeight.value = 100

  // Create components
  const textSignals: ReturnType<typeof signal<string>>[] = []
  const cleanups: (() => void)[] = []

  for (let i = 0; i < componentCount; i++) {
    const content = signal(`Item ${i}`)
    textSignals.push(content)
    const cleanup = box({
      width: 50,
      height: 5,
      children: () => {
        text({ content })
      }
    })
    cleanups.push(cleanup)
  }

  // Warm up
  layoutDerived.value
  frameBufferDerived.value

  // Sustained load
  const stats = createStats()
  const startTime = performance.now()
  let updateCount = 0

  while (performance.now() - startTime < durationMs) {
    for (let i = 0; i < componentCount; i++) {
      const start = Bun.nanoseconds()
      textSignals[i].value = `U${updateCount}I${i}`
      layoutDerived.value
      frameBufferDerived.value
      recordSample(stats, Bun.nanoseconds() - start)
      updateCount++
    }
  }

  const actualDuration = performance.now() - startTime

  // Cleanup
  cleanups.forEach(c => c())
  cleanupAll()

  return {
    totalUpdates: stats.count,
    updatesPerSec: stats.count / (actualDuration / 1000),
    avgLatencyNs: stats.totalNs / stats.count,
    maxLatencyNs: stats.maxNs,
    p99LatencyNs: getPercentile(stats, 99)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║           TUI FRAMEWORK - STRESS BENCHMARK                       ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log()

  // Individual operations
  console.log('📦 INDIVIDUAL OPERATIONS')
  console.log('────────────────────────────────────────────────────────────')

  console.log('\n🔨 CREATE (1000 box+text pairs)')
  const createStats = await benchmarkCreate(1000)
  printStats('Create', createStats)

  console.log('\n📝 UPDATE TEXT (500 components × 100 iterations)')
  const textStats = await benchmarkUpdateText(500, 100)
  printStats('Text Update', textStats)

  console.log('\n🎨 UPDATE COLORS (500 components × 100 iterations)')
  const colorStats = await benchmarkUpdateColors(500, 100)
  printStats('Color Update', colorStats)

  console.log('\n📐 UPDATE DIMENSIONS (500 components × 100 iterations)')
  const dimStats = await benchmarkUpdateDimensions(500, 100)
  printStats('Dimension Update', dimStats)

  console.log('\n📏 LAYOUT COMPUTATION (200 rows × 100 iterations)')
  const layoutStats = await benchmarkLayout(200, 100)
  printStats('Layout', layoutStats)

  console.log('\n🖼️  FRAMEBUFFER GENERATION (200 rows × 100 iterations)')
  const fbStats = await benchmarkFrameBuffer(200, 100)
  printStats('FrameBuffer', fbStats)

  console.log('\n⚡ FULL PIPELINE (200 components × 100 iterations)')
  const pipelineStats = await benchmarkFullPipeline(200, 100)
  printStats('Full Pipeline', pipelineStats)

  console.log('\n💥 DESTROY (1000 box+text pairs)')
  const destroyStats = await benchmarkDestroy(1000)
  printStats('Destroy', destroyStats)

  // Stress tests
  console.log('\n\n🔥 STRESS TESTS')
  console.log('────────────────────────────────────────────────────────────')

  console.log('\n🔄 COMPLETE CYCLES (500 components × 50 cycles)')
  const cycleResults = await stressTestCycles(500, 50)
  console.log(`  Total Time: ${cycleResults.totalTimeMs.toFixed(0)}ms`)
  console.log(`  Memory Growth: ${cycleResults.memoryGrowthKB.toFixed(2)} KB`)
  console.log(`  Per Cycle:`)
  console.log(`    Create:      ${formatNanos(cycleResults.createStats.totalNs / cycleResults.createStats.count)}`)
  console.log(`    Update:      ${formatNanos(cycleResults.updateStats.totalNs / cycleResults.updateStats.count)}`)
  console.log(`    Layout:      ${formatNanos(cycleResults.layoutStats.totalNs / cycleResults.layoutStats.count)}`)
  console.log(`    FrameBuffer: ${formatNanos(cycleResults.frameBufferStats.totalNs / cycleResults.frameBufferStats.count)}`)
  console.log(`    Destroy:     ${formatNanos(cycleResults.destroyStats.totalNs / cycleResults.destroyStats.count)}`)

  console.log('\n⏱️  SUSTAINED LOAD (100 components × 5 seconds)')
  const sustainedResults = await stressTestSustained(100, 5000)
  console.log(`  Total Updates:  ${sustainedResults.totalUpdates.toLocaleString()}`)
  console.log(`  Updates/sec:    ${sustainedResults.updatesPerSec.toLocaleString()}`)
  console.log(`  Avg Latency:    ${formatNanos(sustainedResults.avgLatencyNs)}`)
  console.log(`  Max Latency:    ${formatNanos(sustainedResults.maxLatencyNs)}`)
  console.log(`  p99 Latency:    ${formatNanos(sustainedResults.p99LatencyNs)}`)

  // Memory pressure test
  console.log('\n💾 MEMORY PRESSURE TEST')
  console.log('────────────────────────────────────────────────────────────')

  const scales = [1000, 5000, 10000, 25000, 50000]

  for (const count of scales) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(100)

    const startMem = process.memoryUsage().heapUsed
    const startTime = performance.now()

    // Create
    const cleanups: (() => void)[] = []
    for (let i = 0; i < count; i++) {
      const cleanup = box({ width: 50, height: 5 })
      cleanups.push(cleanup)
    }

    const createTime = performance.now() - startTime
    const afterCreateMem = process.memoryUsage().heapUsed

    // Force full pipeline
    layoutDerived.value
    frameBufferDerived.value

    const afterPipelineMem = process.memoryUsage().heapUsed
    const pipelineTime = performance.now() - startTime - createTime

    // Destroy
    const destroyStart = performance.now()
    cleanups.forEach(c => c())
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(50)

    const destroyTime = performance.now() - destroyStart
    const afterDestroyMem = process.memoryUsage().heapUsed

    console.log(`  ${count.toLocaleString().padStart(6)} components:`)
    console.log(`    Create:   ${createTime.toFixed(0)}ms (${formatBytes(afterCreateMem - startMem)})`)
    console.log(`    Pipeline: ${pipelineTime.toFixed(0)}ms (${formatBytes(afterPipelineMem - afterCreateMem)})`)
    console.log(`    Destroy:  ${destroyTime.toFixed(0)}ms (${formatBytes(afterDestroyMem - startMem)} remaining)`)
  }

  // =========================================================================
  // BREAKING POINT TESTS
  // =========================================================================
  console.log('\n\n💀 BREAKING POINT TESTS')
  console.log('────────────────────────────────────────────────────────────')

  // Find max components before slowdown
  console.log('\n🔍 Finding component limit...')
  let lastGoodCount = 0
  let lastGoodLayoutTime = 0
  const componentLimits = [10000, 50000, 100000, 250000, 500000, 750000, 1000000]

  for (const count of componentLimits) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(100)

    try {
      const startMem = process.memoryUsage().heapUsed

      const createStart = Bun.nanoseconds()
      const cleanups: (() => void)[] = []
      for (let i = 0; i < count; i++) {
        const cleanup = box({ width: 10, height: 2 })
        cleanups.push(cleanup)
      }
      const createTime = Bun.nanoseconds() - createStart

      const layoutStart = Bun.nanoseconds()
      layoutDerived.value
      const layoutTime = Bun.nanoseconds() - layoutStart

      const afterMem = process.memoryUsage().heapUsed

      console.log(`  ${count.toLocaleString().padStart(10)}: ✓ create=${formatNanos(createTime)} layout=${formatNanos(layoutTime)} mem=${formatBytes(afterMem - startMem)}`)

      lastGoodCount = count
      lastGoodLayoutTime = layoutTime

      // Cleanup
      cleanups.forEach(c => c())
      cleanupAll()

      // If layout takes > 5 seconds, that's our practical limit
      if (layoutTime > 5_000_000_000) {
        console.log(`  → Layout taking > 5s, stopping at ${count.toLocaleString()}`)
        break
      }
    } catch (e) {
      console.log(`  ${count.toLocaleString().padStart(10)}: ✗ FAILED - ${e}`)
      break
    }
  }
  console.log(`  → Component limit: ~${lastGoodCount.toLocaleString()} (layout in ${formatNanos(lastGoodLayoutTime)})`)

  // Find max nesting depth
  console.log('\n🔍 Finding nesting depth limit...')
  const depthLimits = [100, 250, 500, 750, 1000, 1500, 2000]
  let lastGoodDepth = 0

  for (const depth of depthLimits) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(50)

    try {
      const createStart = Bun.nanoseconds()

      // Create deeply nested structure
      let currentCleanup: () => void = () => {}
      for (let i = 0; i < depth; i++) {
        const prev = currentCleanup
        const cleanup = box({
          width: 100 - Math.floor(i * 0.05),
          height: 50,
          children: i === depth - 1
            ? () => { text({ content: `Depth ${depth}` }) }
            : () => { prev }
        })
        currentCleanup = cleanup
      }
      const createTime = Bun.nanoseconds() - createStart

      const layoutStart = Bun.nanoseconds()
      layoutDerived.value
      const layoutTime = Bun.nanoseconds() - layoutStart

      console.log(`  Depth ${depth.toString().padStart(5)}: ✓ create=${formatNanos(createTime)} layout=${formatNanos(layoutTime)}`)

      lastGoodDepth = depth

      cleanupAll()

      // If layout takes > 1 second, we're hitting limits
      if (layoutTime > 1_000_000_000) {
        console.log(`  → Layout taking > 1s at depth ${depth}`)
        break
      }
    } catch (e) {
      console.log(`  Depth ${depth.toString().padStart(5)}: ✗ FAILED - ${e}`)
      break
    }
  }
  console.log(`  → Depth limit: ~${lastGoodDepth}`)

  // Find max updates per second
  console.log('\n🔍 Finding update throughput limit...')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  // Create 100 reactive components
  const signals: ReturnType<typeof signal<string>>[] = []
  const throughputCleanups: (() => void)[] = []
  for (let i = 0; i < 100; i++) {
    const s = signal(`Init ${i}`)
    signals.push(s)
    const cleanup = box({
      width: 50,
      height: 3,
      children: () => { text({ content: s }) }
    })
    throughputCleanups.push(cleanup)
  }

  // Measure maximum raw update throughput (no pipeline)
  let rawUpdateCount = 0
  const rawStart = performance.now()
  while (performance.now() - rawStart < 2000) {
    for (const s of signals) {
      s.value = `U${rawUpdateCount++}`
    }
  }
  const rawDuration = performance.now() - rawStart
  const rawUpdatesPerSec = rawUpdateCount / (rawDuration / 1000)
  console.log(`  Raw signal updates:     ${rawUpdatesPerSec.toLocaleString()} /sec`)

  // Measure with layout only
  let layoutUpdateCount = 0
  const layoutOnlyStart = performance.now()
  while (performance.now() - layoutOnlyStart < 2000) {
    signals[layoutUpdateCount % signals.length].value = `L${layoutUpdateCount}`
    layoutDerived.value
    layoutUpdateCount++
  }
  const layoutOnlyDuration = performance.now() - layoutOnlyStart
  const layoutUpdatesPerSec = layoutUpdateCount / (layoutOnlyDuration / 1000)
  console.log(`  With layout:            ${layoutUpdatesPerSec.toLocaleString()} /sec`)

  // Measure with full pipeline
  let fullUpdateCount = 0
  const fullStart = performance.now()
  while (performance.now() - fullStart < 2000) {
    signals[fullUpdateCount % signals.length].value = `F${fullUpdateCount}`
    layoutDerived.value
    frameBufferDerived.value
    fullUpdateCount++
  }
  const fullDuration = performance.now() - fullStart
  const fullUpdatesPerSec = fullUpdateCount / (fullDuration / 1000)
  console.log(`  With full pipeline:     ${fullUpdatesPerSec.toLocaleString()} /sec`)

  throughputCleanups.forEach(c => c())
  cleanupAll()

  // Find concurrent signal limit
  console.log('\n🔍 Finding concurrent signal limit...')
  const signalCounts = [1000, 5000, 10000, 25000, 50000, 100000]

  for (const count of signalCounts) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(50)

    try {
      const sigs: ReturnType<typeof signal<number>>[] = []
      for (let i = 0; i < count; i++) {
        sigs.push(signal(i))
      }

      // Update all at once
      const updateStart = Bun.nanoseconds()
      for (let i = 0; i < sigs.length; i++) {
        sigs[i].value = i + 1
      }
      const updateTime = Bun.nanoseconds() - updateStart

      console.log(`  ${count.toLocaleString().padStart(7)} signals: ${formatNanos(updateTime)} (${formatRate(count, updateTime)})`)
    } catch (e) {
      console.log(`  ${count.toLocaleString().padStart(7)} signals: ✗ FAILED`)
      break
    }
  }

  // Find rapid create/destroy limit
  console.log('\n🔍 Finding rapid create/destroy limit...')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  let cycleCount = 0
  const cycleStart = performance.now()
  while (performance.now() - cycleStart < 3000) {
    const cleanup = box({
      width: 50,
      height: 10,
      children: () => {
        text({ content: `Cycle ${cycleCount}` })
      }
    })
    cleanup()
    cycleCount++
  }
  const cycleDuration = performance.now() - cycleStart
  const cyclesPerSec = cycleCount / (cycleDuration / 1000)
  console.log(`  Create/destroy cycles:  ${cyclesPerSec.toLocaleString()} /sec`)
  cleanupAll()

  // Memory pressure - find where we OOM
  console.log('\n🔍 Finding memory limit...')
  const memScales = [100000, 250000, 500000, 750000, 1000000, 1500000, 2000000]
  let maxComponents = 0
  let maxMemory = 0

  for (const count of memScales) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(100)

    try {
      const startMem = process.memoryUsage().heapUsed

      for (let i = 0; i < count; i++) {
        box({ width: 10, height: 2 })
      }

      const endMem = process.memoryUsage().heapUsed
      const usedMem = endMem - startMem

      console.log(`  ${count.toLocaleString().padStart(10)} components: ${formatBytes(usedMem)} (${(usedMem / count / 1024).toFixed(2)} KB/component)`)

      maxComponents = count
      maxMemory = usedMem

      cleanupAll()
    } catch (e) {
      console.log(`  ${count.toLocaleString().padStart(10)} components: ✗ OOM or FAILED`)
      break
    }
  }
  console.log(`  → Memory limit: ~${maxComponents.toLocaleString()} components (${formatBytes(maxMemory)})`)

  // Final summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                         SUMMARY                                  ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Create:         ${formatNanos(createStats.totalNs / createStats.count)}/component`)
  console.log(`  Update:         ${formatNanos(textStats.totalNs / textStats.count)}/op`)
  console.log(`  Layout:         ${formatNanos(layoutStats.totalNs / layoutStats.count)}/frame`)
  console.log(`  FrameBuffer:    ${formatNanos(fbStats.totalNs / fbStats.count)}/frame`)
  console.log(`  Destroy:        ${formatNanos(destroyStats.totalNs / destroyStats.count)}/component`)
  console.log()
  console.log(`  Throughput:     ${sustainedResults.updatesPerSec.toLocaleString()} updates/sec`)
  console.log(`  p99 Latency:    ${formatNanos(sustainedResults.p99LatencyNs)}`)
  console.log()
  console.log('  LIMITS FOUND:')
  console.log(`    Max Components:     ${lastGoodCount.toLocaleString()}`)
  console.log(`    Max Nesting Depth:  ${lastGoodDepth}`)
  console.log(`    Raw Signal Updates: ${rawUpdatesPerSec.toLocaleString()}/sec`)
  console.log(`    Full Pipeline:      ${fullUpdatesPerSec.toLocaleString()}/sec`)
  console.log(`    Create/Destroy:     ${cyclesPerSec.toLocaleString()}/sec`)
  console.log(`    Memory Capacity:    ${maxComponents.toLocaleString()} components`)
  console.log()
}

main().catch(console.error)
