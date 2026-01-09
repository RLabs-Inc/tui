/**
 * TUI Framework - BREAK IT Benchmark
 *
 * Goal: Find the ACTUAL breaking points where:
 * 1. Performance becomes unacceptably slow (>1s response)
 * 2. Memory causes OOM
 * 3. System becomes unresponsive
 *
 * We document:
 * - "Usable limit": Still responsive (<100ms)
 * - "Laggy limit": Slow but works (<1s)
 * - "Breaking point": Unacceptable (>1s or fails)
 */

import { signal } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry, getAllocatedIndices } from '../src/engine/registry'
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
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
}

interface LimitResult {
  usable: number      // <100ms
  laggy: number       // <1s
  breaking: number    // >1s or failed
  failedAt?: number
  error?: string
}

// =============================================================================
// TEST 1: Component Count Limit
// =============================================================================

async function findComponentLimit(): Promise<LimitResult> {
  console.log('\n🔬 TEST 1: COMPONENT COUNT LIMIT')
  console.log('   Finding where component creation + layout breaks...\n')

  const scales = [
    100_000, 250_000, 500_000, 750_000,
    1_000_000, 1_500_000, 2_000_000, 2_500_000,
    3_000_000, 4_000_000, 5_000_000
  ]

  let usable = 0, laggy = 0, breaking = 0
  let failedAt: number | undefined
  let error: string | undefined

  terminalWidth.value = 200
  terminalHeight.value = 100

  for (const count of scales) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(200)

    const startMem = process.memoryUsage().heapUsed

    try {
      console.log(`   Testing ${count.toLocaleString().padStart(10)} components...`)

      // CREATE
      const createStart = performance.now()
      for (let i = 0; i < count; i++) {
        box({ width: 10, height: 2 })
      }
      const createTime = performance.now() - createStart

      // LAYOUT
      const layoutStart = performance.now()
      layoutDerived.value
      const layoutTime = performance.now() - layoutStart

      const totalTime = createTime + layoutTime
      const mem = process.memoryUsage().heapUsed - startMem

      const status = totalTime < 100 ? '🟢 USABLE' :
                     totalTime < 1000 ? '🟡 LAGGY' :
                     totalTime < 5000 ? '🟠 SLOW' : '🔴 BREAKING'

      console.log(`     ${status} create=${formatTime(createTime)} layout=${formatTime(layoutTime)} total=${formatTime(totalTime)} mem=${formatBytes(mem)}`)

      if (totalTime < 100) usable = count
      else if (totalTime < 1000) laggy = count
      else if (totalTime < 5000) breaking = count
      else {
        breaking = count
        console.log(`     → BREAKING POINT FOUND at ${count.toLocaleString()}`)
        break
      }

      cleanupAll()

    } catch (e) {
      failedAt = count
      error = String(e)
      console.log(`     🔴 FAILED: ${error}`)
      break
    }
  }

  return { usable, laggy, breaking, failedAt, error }
}

// =============================================================================
// TEST 2: Nesting Depth Limit
// =============================================================================

async function findNestingLimit(): Promise<LimitResult> {
  console.log('\n🔬 TEST 2: NESTING DEPTH LIMIT')
  console.log('   Finding where deep nesting breaks...\n')

  const depths = [
    500, 1000, 2000, 3000, 4000, 5000,
    7500, 10000, 15000, 20000
  ]

  let usable = 0, laggy = 0, breaking = 0
  let failedAt: number | undefined
  let error: string | undefined

  terminalWidth.value = 200
  terminalHeight.value = 100

  for (const depth of depths) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(100)

    try {
      console.log(`   Testing depth ${depth.toLocaleString().padStart(6)}...`)

      // CREATE nested structure
      const createStart = performance.now()

      function createNested(level: number): () => void {
        if (level >= depth) {
          return box({
            width: 100,
            height: 50,
            children: () => { text({ content: `Depth ${depth}` }) }
          })
        }
        return box({
          width: 100 - Math.floor(level * 0.01),
          height: 50,
          children: () => { createNested(level + 1) }
        })
      }

      const cleanup = createNested(0)
      const createTime = performance.now() - createStart

      // LAYOUT
      const layoutStart = performance.now()
      layoutDerived.value
      const layoutTime = performance.now() - layoutStart

      const totalTime = createTime + layoutTime

      const status = totalTime < 100 ? '🟢 USABLE' :
                     totalTime < 1000 ? '🟡 LAGGY' :
                     totalTime < 5000 ? '🟠 SLOW' : '🔴 BREAKING'

      console.log(`     ${status} create=${formatTime(createTime)} layout=${formatTime(layoutTime)} total=${formatTime(totalTime)}`)

      if (totalTime < 100) usable = depth
      else if (totalTime < 1000) laggy = depth
      else if (totalTime < 5000) breaking = depth
      else {
        breaking = depth
        console.log(`     → BREAKING POINT FOUND at depth ${depth}`)
        break
      }

      cleanup()
      cleanupAll()

    } catch (e) {
      failedAt = depth
      error = String(e)
      console.log(`     🔴 FAILED: ${error}`)
      break
    }
  }

  return { usable, laggy, breaking, failedAt, error }
}

// =============================================================================
// TEST 3: Update Throughput Limit
// =============================================================================

async function findUpdateLimit(): Promise<{
  rawSignals: number
  withLayout: number
  fullPipeline: number
}> {
  console.log('\n🔬 TEST 3: UPDATE THROUGHPUT LIMIT')
  console.log('   Finding maximum sustainable update rate...\n')

  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(200)

  terminalWidth.value = 200
  terminalHeight.value = 100

  // Create 1000 reactive components
  const signals: ReturnType<typeof signal<string>>[] = []
  const cleanups: (() => void)[] = []

  for (let i = 0; i < 1000; i++) {
    const s = signal(`Init ${i}`)
    signals.push(s)
    const cleanup = box({
      width: 50,
      height: 3,
      children: () => { text({ content: s }) }
    })
    cleanups.push(cleanup)
  }

  // Warm up
  layoutDerived.value
  frameBufferDerived.value

  // Test 1: Raw signals (no pipeline)
  console.log('   Testing raw signal updates...')
  let rawCount = 0
  const rawStart = performance.now()
  while (performance.now() - rawStart < 3000) {
    for (const s of signals) {
      s.value = `R${rawCount++}`
    }
  }
  const rawRate = rawCount / 3

  // Test 2: With layout
  console.log('   Testing with layout...')
  let layoutCount = 0
  const layoutStart = performance.now()
  while (performance.now() - layoutStart < 3000) {
    signals[layoutCount % signals.length].value = `L${layoutCount}`
    layoutDerived.value
    layoutCount++
  }
  const layoutRate = layoutCount / 3

  // Test 3: Full pipeline
  console.log('   Testing full pipeline...')
  let fullCount = 0
  const fullStart = performance.now()
  while (performance.now() - fullStart < 3000) {
    signals[fullCount % signals.length].value = `F${fullCount}`
    layoutDerived.value
    frameBufferDerived.value
    fullCount++
  }
  const fullRate = fullCount / 3

  console.log(`\n     Raw Signals:    ${rawRate.toLocaleString()}/sec`)
  console.log(`     With Layout:    ${layoutRate.toLocaleString()}/sec`)
  console.log(`     Full Pipeline:  ${fullRate.toLocaleString()}/sec`)

  cleanups.forEach(c => c())
  cleanupAll()

  return { rawSignals: rawRate, withLayout: layoutRate, fullPipeline: fullRate }
}

// =============================================================================
// TEST 4: Memory Limit
// =============================================================================

async function findMemoryLimit(): Promise<{
  maxComponents: number
  peakMemory: number
  failedAt?: number
  error?: string
}> {
  console.log('\n🔬 TEST 4: MEMORY LIMIT')
  console.log('   Finding where memory becomes a problem...\n')

  const scales = [
    500_000, 1_000_000, 1_500_000, 2_000_000,
    2_500_000, 3_000_000, 4_000_000, 5_000_000,
    7_500_000, 10_000_000
  ]

  let maxComponents = 0
  let peakMemory = 0
  let failedAt: number | undefined
  let error: string | undefined

  for (const count of scales) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(500)

    const startMem = process.memoryUsage().heapUsed

    try {
      console.log(`   Testing ${count.toLocaleString().padStart(11)} components...`)

      const start = performance.now()
      for (let i = 0; i < count; i++) {
        box({ width: 5, height: 1 })
      }
      const createTime = performance.now() - start

      const endMem = process.memoryUsage().heapUsed
      const usedMem = endMem - startMem
      const perComponent = usedMem / count

      console.log(`     ✓ ${formatTime(createTime)} | ${formatBytes(usedMem)} total | ${perComponent.toFixed(0)} bytes/component`)

      maxComponents = count
      if (usedMem > peakMemory) peakMemory = usedMem

      cleanupAll()

    } catch (e) {
      failedAt = count
      error = String(e)
      console.log(`     🔴 FAILED: ${error}`)
      break
    }
  }

  return { maxComponents, peakMemory, failedAt, error }
}

// =============================================================================
// TEST 5: Concurrent Signals Limit
// =============================================================================

async function findSignalLimit(): Promise<LimitResult> {
  console.log('\n🔬 TEST 5: CONCURRENT SIGNALS LIMIT')
  console.log('   Finding where signal updates break...\n')

  const counts = [
    10_000, 50_000, 100_000, 250_000,
    500_000, 1_000_000, 2_000_000, 5_000_000
  ]

  let usable = 0, laggy = 0, breaking = 0
  let failedAt: number | undefined
  let error: string | undefined

  for (const count of counts) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(100)

    try {
      console.log(`   Testing ${count.toLocaleString().padStart(10)} signals...`)

      // Create signals
      const createStart = performance.now()
      const sigs: ReturnType<typeof signal<number>>[] = []
      for (let i = 0; i < count; i++) {
        sigs.push(signal(i))
      }
      const createTime = performance.now() - createStart

      // Update all at once
      const updateStart = performance.now()
      for (let i = 0; i < sigs.length; i++) {
        sigs[i].value = i + 1
      }
      const updateTime = performance.now() - updateStart

      const status = updateTime < 100 ? '🟢 USABLE' :
                     updateTime < 1000 ? '🟡 LAGGY' : '🔴 BREAKING'

      console.log(`     ${status} create=${formatTime(createTime)} update=${formatTime(updateTime)}`)

      if (updateTime < 100) usable = count
      else if (updateTime < 1000) laggy = count
      else {
        breaking = count
        break
      }

    } catch (e) {
      failedAt = count
      error = String(e)
      console.log(`     🔴 FAILED: ${error}`)
      break
    }
  }

  return { usable, laggy, breaking, failedAt, error }
}

// =============================================================================
// TEST 6: Create/Destroy Cycle Limit
// =============================================================================

async function findCycleLimit(): Promise<{
  rate: number
  memoryPerCycle: number
}> {
  console.log('\n🔬 TEST 6: CREATE/DESTROY CYCLE LIMIT')
  console.log('   Finding maximum component churn rate...\n')

  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(200)

  const startMem = process.memoryUsage().heapUsed
  let cycleCount = 0
  const testDuration = 5000

  console.log('   Running create/destroy cycles for 5 seconds...')

  const start = performance.now()
  while (performance.now() - start < testDuration) {
    const cleanup = box({
      width: 50,
      height: 10,
      children: () => {
        text({ content: `Cycle ${cycleCount}` })
        text({ content: `Second line` })
      }
    })
    cleanup()
    cycleCount++

    // Cleanup registry periodically to prevent accumulation
    if (cycleCount % 1000 === 0) {
      cleanupAll()
    }
  }

  const duration = performance.now() - start
  const rate = cycleCount / (duration / 1000)

  Bun.gc(true)
  await Bun.sleep(100)
  const endMem = process.memoryUsage().heapUsed
  const memoryGrowth = endMem - startMem

  console.log(`\n     Cycles completed: ${cycleCount.toLocaleString()}`)
  console.log(`     Rate: ${rate.toLocaleString()}/sec`)
  console.log(`     Memory growth: ${formatBytes(memoryGrowth)}`)
  console.log(`     Per cycle: ${(memoryGrowth / cycleCount).toFixed(2)} bytes`)

  cleanupAll()

  return { rate, memoryPerCycle: memoryGrowth / cycleCount }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║           TUI FRAMEWORK - BREAK IT BENCHMARK                     ║')
  console.log('║           Finding the ACTUAL breaking points                     ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')

  const componentLimit = await findComponentLimit()
  const nestingLimit = await findNestingLimit()
  const updateLimit = await findUpdateLimit()
  const memoryLimit = await findMemoryLimit()
  const signalLimit = await findSignalLimit()
  const cycleLimit = await findCycleLimit()

  // Final Report
  console.log('\n')
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                    BREAKING POINT REPORT                         ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log()

  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ COMPONENT COUNT                                                 │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ 🟢 Usable (<100ms):    ${componentLimit.usable.toLocaleString().padStart(12)} components          │`)
  console.log(`│ 🟡 Laggy (<1s):        ${componentLimit.laggy.toLocaleString().padStart(12)} components          │`)
  console.log(`│ 🔴 Breaking (>1s):     ${componentLimit.breaking.toLocaleString().padStart(12)} components          │`)
  if (componentLimit.failedAt) {
    console.log(`│ 💀 Failed at:          ${componentLimit.failedAt.toLocaleString().padStart(12)} components          │`)
  }
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ NESTING DEPTH                                                   │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ 🟢 Usable (<100ms):    ${nestingLimit.usable.toLocaleString().padStart(12)} levels               │`)
  console.log(`│ 🟡 Laggy (<1s):        ${nestingLimit.laggy.toLocaleString().padStart(12)} levels               │`)
  console.log(`│ 🔴 Breaking (>1s):     ${nestingLimit.breaking.toLocaleString().padStart(12)} levels               │`)
  if (nestingLimit.failedAt) {
    console.log(`│ 💀 Failed at:          ${nestingLimit.failedAt.toLocaleString().padStart(12)} levels               │`)
  }
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ UPDATE THROUGHPUT                                               │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ Raw Signals:           ${updateLimit.rawSignals.toLocaleString().padStart(12)}/sec               │`)
  console.log(`│ With Layout:           ${updateLimit.withLayout.toLocaleString().padStart(12)}/sec               │`)
  console.log(`│ Full Pipeline:         ${updateLimit.fullPipeline.toLocaleString().padStart(12)}/sec               │`)
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ MEMORY                                                          │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ Max Components:        ${memoryLimit.maxComponents.toLocaleString().padStart(12)}                  │`)
  console.log(`│ Peak Memory:           ${formatBytes(memoryLimit.peakMemory).padStart(12)}                  │`)
  if (memoryLimit.failedAt) {
    console.log(`│ 💀 OOM at:             ${memoryLimit.failedAt.toLocaleString().padStart(12)}                  │`)
  }
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ CONCURRENT SIGNALS                                              │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ 🟢 Usable (<100ms):    ${signalLimit.usable.toLocaleString().padStart(12)} signals              │`)
  console.log(`│ 🟡 Laggy (<1s):        ${signalLimit.laggy.toLocaleString().padStart(12)} signals              │`)
  console.log(`│ 🔴 Breaking (>1s):     ${signalLimit.breaking.toLocaleString().padStart(12)} signals              │`)
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ CREATE/DESTROY CYCLES                                           │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  console.log(`│ Rate:                  ${cycleLimit.rate.toLocaleString().padStart(12)}/sec               │`)
  console.log(`│ Memory per cycle:      ${cycleLimit.memoryPerCycle.toFixed(2).padStart(12)} bytes              │`)
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log()
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('                         VERDICT                                   ')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log()
  console.log('  RECOMMENDED LIMITS FOR PRODUCTION:')
  console.log(`    Components:     < ${componentLimit.usable.toLocaleString()} (instant response)`)
  console.log(`    Nesting:        < ${nestingLimit.usable} levels`)
  console.log(`    Updates:        < ${updateLimit.fullPipeline.toLocaleString()}/sec`)
  console.log(`    Memory:         < ${formatBytes(memoryLimit.peakMemory)}`)
  console.log()
}

main().catch(console.error)
