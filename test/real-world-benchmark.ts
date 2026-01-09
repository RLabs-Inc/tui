/**
 * TUI Framework - REAL WORLD Benchmark
 *
 * Measures what actually matters for production apps:
 * 1. STARTUP: How long to create N components (one-time, can wait)
 * 2. RUNTIME: How fast are updates (must be <16ms for 60fps)
 * 3. SHUTDOWN: How long to destroy (cleanup, less critical)
 *
 * The key insight: If creation takes 3 seconds but updates are <1ms,
 * that's PERFECT for a dashboard, TUI app, or any persistent UI.
 */

import { signal } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
}

interface RealWorldResult {
  componentCount: number
  createTime: number
  layoutTime: number
  startupTotal: number
  memory: number

  // Update stats (100 iterations)
  updateAvg: number
  updateMin: number
  updateMax: number
  updateP95: number
  updateP99: number
  updatesPerSec: number

  // Full pipeline stats
  pipelineAvg: number
  pipelineMin: number
  pipelineMax: number
  pipelineP95: number
  pipelineP99: number
  pipelineFps: number

  destroyTime: number

  // Verdict
  usableFor60fps: boolean
  usableFor30fps: boolean
}

async function benchmarkRealWorld(componentCount: number): Promise<RealWorldResult> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(200)

  terminalWidth.value = 200
  terminalHeight.value = 100

  const startMem = process.memoryUsage().heapUsed

  // ==========================================================================
  // PHASE 1: STARTUP (Create all components)
  // ==========================================================================

  const textSignals: ReturnType<typeof signal<string>>[] = []
  const cleanups: (() => void)[] = []

  const createStart = performance.now()

  // Create a realistic component tree: rows with text
  for (let i = 0; i < componentCount; i++) {
    const content = signal(`Row ${i}`)
    textSignals.push(content)

    const cleanup = box({
      width: '100%',
      height: 3,
      children: () => {
        text({ content })
      }
    })
    cleanups.push(cleanup)
  }

  const createTime = performance.now() - createStart

  // Initial layout
  const layoutStart = performance.now()
  layoutDerived.value
  frameBufferDerived.value
  const layoutTime = performance.now() - layoutStart

  const startupTotal = createTime + layoutTime
  const memory = process.memoryUsage().heapUsed - startMem

  // ==========================================================================
  // PHASE 2: RUNTIME (Measure update performance)
  // ==========================================================================

  const updateTimes: number[] = []
  const pipelineTimes: number[] = []
  const iterations = 100

  // Warm up
  for (let i = 0; i < 10; i++) {
    textSignals[i % textSignals.length].value = `Warmup ${i}`
    layoutDerived.value
    frameBufferDerived.value
  }

  // Measure individual signal updates (just the signal, no pipeline)
  for (let i = 0; i < iterations; i++) {
    const idx = i % textSignals.length
    const start = Bun.nanoseconds()
    textSignals[idx].value = `Update ${i}`
    updateTimes.push((Bun.nanoseconds() - start) / 1_000_000) // Convert to ms
  }

  // Measure full pipeline updates (signal + layout + framebuffer)
  for (let i = 0; i < iterations; i++) {
    const idx = i % textSignals.length
    const start = Bun.nanoseconds()
    textSignals[idx].value = `Pipeline ${i}`
    layoutDerived.value
    frameBufferDerived.value
    pipelineTimes.push((Bun.nanoseconds() - start) / 1_000_000) // Convert to ms
  }

  // Calculate stats
  const sortedUpdates = [...updateTimes].sort((a, b) => a - b)
  const sortedPipeline = [...pipelineTimes].sort((a, b) => a - b)

  const updateAvg = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
  const updateMin = sortedUpdates[0]
  const updateMax = sortedUpdates[sortedUpdates.length - 1]
  const updateP95 = sortedUpdates[Math.floor(sortedUpdates.length * 0.95)]
  const updateP99 = sortedUpdates[Math.floor(sortedUpdates.length * 0.99)]

  const pipelineAvg = pipelineTimes.reduce((a, b) => a + b, 0) / pipelineTimes.length
  const pipelineMin = sortedPipeline[0]
  const pipelineMax = sortedPipeline[sortedPipeline.length - 1]
  const pipelineP95 = sortedPipeline[Math.floor(sortedPipeline.length * 0.95)]
  const pipelineP99 = sortedPipeline[Math.floor(sortedPipeline.length * 0.99)]

  // Calculate throughput
  const updateTotal = updateTimes.reduce((a, b) => a + b, 0)
  const pipelineTotal = pipelineTimes.reduce((a, b) => a + b, 0)
  const updatesPerSec = iterations / (updateTotal / 1000)
  const pipelineFps = iterations / (pipelineTotal / 1000)

  // ==========================================================================
  // PHASE 3: SHUTDOWN (Destroy all)
  // ==========================================================================

  const destroyStart = performance.now()
  cleanups.forEach(c => c())
  cleanupAll()
  const destroyTime = performance.now() - destroyStart

  // ==========================================================================
  // VERDICT
  // ==========================================================================

  // 60fps = 16.67ms budget, 30fps = 33.33ms budget
  const usableFor60fps = pipelineP95 < 16.67
  const usableFor30fps = pipelineP95 < 33.33

  return {
    componentCount,
    createTime,
    layoutTime,
    startupTotal,
    memory,
    updateAvg,
    updateMin,
    updateMax,
    updateP95,
    updateP99,
    updatesPerSec,
    pipelineAvg,
    pipelineMin,
    pipelineMax,
    pipelineP95,
    pipelineP99,
    pipelineFps,
    destroyTime,
    usableFor60fps,
    usableFor30fps,
  }
}

function printResult(r: RealWorldResult): void {
  const fps60 = r.usableFor60fps ? '✅' : '❌'
  const fps30 = r.usableFor30fps ? '✅' : '❌'

  console.log(`\n┌${'─'.repeat(68)}┐`)
  console.log(`│ ${r.componentCount.toLocaleString().padStart(10)} COMPONENTS ${' '.repeat(45)}│`)
  console.log(`├${'─'.repeat(68)}┤`)
  console.log(`│ STARTUP (one-time)                                                 │`)
  console.log(`│   Create:     ${formatTime(r.createTime).padStart(10)}                                           │`)
  console.log(`│   Layout:     ${formatTime(r.layoutTime).padStart(10)}                                           │`)
  console.log(`│   Total:      ${formatTime(r.startupTotal).padStart(10)}                                           │`)
  console.log(`│   Memory:     ${formatBytes(r.memory).padStart(10)}                                           │`)
  console.log(`├${'─'.repeat(68)}┤`)
  console.log(`│ RUNTIME (per update)                                               │`)
  console.log(`│   Signal update:    avg=${formatTime(r.updateAvg).padStart(8)} p95=${formatTime(r.updateP95).padStart(8)} p99=${formatTime(r.updateP99).padStart(8)}  │`)
  console.log(`│   Full pipeline:    avg=${formatTime(r.pipelineAvg).padStart(8)} p95=${formatTime(r.pipelineP95).padStart(8)} p99=${formatTime(r.pipelineP99).padStart(8)}  │`)
  console.log(`│   Throughput:       ${r.updatesPerSec.toLocaleString().padStart(10)} signal updates/sec                 │`)
  console.log(`│   Effective FPS:    ${r.pipelineFps.toFixed(1).padStart(10)} (full pipeline)                     │`)
  console.log(`├${'─'.repeat(68)}┤`)
  console.log(`│ SHUTDOWN                                                           │`)
  console.log(`│   Destroy:   ${formatTime(r.destroyTime).padStart(10)}                                            │`)
  console.log(`├${'─'.repeat(68)}┤`)
  console.log(`│ VERDICT: 60fps ${fps60}  30fps ${fps30}                                        │`)
  console.log(`└${'─'.repeat(68)}┘`)
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║           TUI FRAMEWORK - REAL WORLD BENCHMARK                       ║')
  console.log('║                                                                      ║')
  console.log('║   Measuring what matters:                                            ║')
  console.log('║   • STARTUP: Can wait seconds (one-time)                             ║')
  console.log('║   • RUNTIME: Must be <16ms for 60fps                                 ║')
  console.log('║   • SHUTDOWN: Can take time (cleanup)                                ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  const scales = [
    1_000,
    5_000,
    10_000,
    25_000,
    50_000,
    100_000,
    250_000,
    500_000,
    1_000_000,
  ]

  const results: RealWorldResult[] = []

  for (const count of scales) {
    console.log(`\nTesting ${count.toLocaleString()} components...`)
    const result = await benchmarkRealWorld(count)
    results.push(result)
    printResult(result)

    // Stop if startup takes too long
    if (result.startupTotal > 30000) {
      console.log('\n⚠️  Startup > 30s, stopping tests')
      break
    }
  }

  // Summary
  console.log('\n')
  console.log('╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║                           SUMMARY                                    ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')
  console.log()
  console.log('  Components  │ Startup    │ Update p95 │ Pipeline p95 │ 60fps │ 30fps')
  console.log('  ────────────┼────────────┼────────────┼──────────────┼───────┼──────')

  for (const r of results) {
    const fps60 = r.usableFor60fps ? '  ✅ ' : '  ❌ '
    const fps30 = r.usableFor30fps ? '  ✅ ' : '  ❌ '
    console.log(`  ${r.componentCount.toLocaleString().padStart(10)} │ ${formatTime(r.startupTotal).padStart(10)} │ ${formatTime(r.updateP95).padStart(10)} │ ${formatTime(r.pipelineP95).padStart(12)} │${fps60}│${fps30}`)
  }

  // Find sweet spots
  const last60fps = results.filter(r => r.usableFor60fps).pop()
  const last30fps = results.filter(r => r.usableFor30fps).pop()

  console.log()
  console.log('  SWEET SPOTS:')
  if (last60fps) {
    console.log(`    60fps capable: up to ${last60fps.componentCount.toLocaleString()} components (startup: ${formatTime(last60fps.startupTotal)})`)
  }
  if (last30fps) {
    console.log(`    30fps capable: up to ${last30fps.componentCount.toLocaleString()} components (startup: ${formatTime(last30fps.startupTotal)})`)
  }

  console.log()
  console.log('  INTERPRETATION:')
  console.log('    • Startup time is a ONE-TIME cost')
  console.log('    • What matters is Runtime performance (update speed)')
  console.log('    • A 5-second startup with <1ms updates = GREAT for dashboards')
  console.log()
}

main().catch(console.error)
