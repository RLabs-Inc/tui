/**
 * TUI Framework - Memory Benchmark
 *
 * Measures real memory usage at various component scales.
 * Tests create/destroy cycles and cleanup effectiveness.
 */

import { box, text } from '../src/primitives'
import { resetRegistry, getAllocatedIndices, releaseIndex } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { signal } from '@rlabs-inc/signals'

// =============================================================================
// UTILITIES
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function getMemoryUsage(): number {
  Bun.gc(true) // Force synchronous garbage collection
  return process.memoryUsage().heapUsed
}

function getDetailedMemory() {
  Bun.gc(true)
  const usage = process.memoryUsage()
  return {
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    rss: usage.rss
  }
}

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

// =============================================================================
// BENCHMARK: Memory Per Component
// =============================================================================

async function benchmarkMemoryPerComponent(count: number): Promise<{
  totalMB: number
  perComponentKB: number
  indices: number
}> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100) // Let GC settle

  const before = getMemoryUsage()

  // Create components
  for (let i = 0; i < count; i++) {
    box({
      width: 100,
      height: 50,
      children: () => {
        text({ content: signal(`Item ${i}`) })
      }
    })
  }

  Bun.gc(true)
  await Bun.sleep(100)

  const after = getMemoryUsage()
  const indices = getAllocatedIndices().size

  const totalBytes = after - before
  const perComponentBytes = totalBytes / count

  return {
    totalMB: totalBytes / 1024 / 1024,
    perComponentKB: perComponentBytes / 1024,
    indices
  }
}

// =============================================================================
// BENCHMARK: Cleanup Effectiveness
// =============================================================================

async function benchmarkCleanup(count: number): Promise<{
  beforeMB: number
  afterCreateMB: number
  afterCleanupMB: number
  leakKB: number
}> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  const before = getMemoryUsage()

  // Create components
  for (let i = 0; i < count; i++) {
    box({
      width: 100,
      height: 50,
      children: () => {
        text({ content: signal(`Item ${i}`) })
      }
    })
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const afterCreate = getMemoryUsage()

  // Cleanup
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(200) // Give more time for cleanup

  const afterCleanup = getMemoryUsage()

  return {
    beforeMB: before / 1024 / 1024,
    afterCreateMB: afterCreate / 1024 / 1024,
    afterCleanupMB: afterCleanup / 1024 / 1024,
    leakKB: (afterCleanup - before) / 1024
  }
}

// =============================================================================
// BENCHMARK: Create/Destroy Cycles
// =============================================================================

async function benchmarkCycles(count: number, cycles: number): Promise<{
  avgCycleMS: number
  memoryGrowthKB: number
}> {
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  const startMem = getMemoryUsage()
  const start = performance.now()

  for (let c = 0; c < cycles; c++) {
    // Create
    for (let i = 0; i < count; i++) {
      box({ width: 50, height: 25 })
    }

    // Destroy
    cleanupAll()
  }

  const elapsed = performance.now() - start

  Bun.gc(true)
  await Bun.sleep(100)
  const endMem = getMemoryUsage()

  return {
    avgCycleMS: elapsed / cycles,
    memoryGrowthKB: (endMem - startMem) / 1024
  }
}

// =============================================================================
// BENCHMARK: Scale Test
// =============================================================================

async function benchmarkScale(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║           TUI FRAMEWORK - MEMORY BENCHMARK                        ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  // Memory per component at various scales
  console.log('📦 MEMORY PER COMPONENT')
  console.log('────────────────────────────────────────────────────────────')

  const scales = [1000, 5000, 10000, 50000, 100000]

  for (const count of scales) {
    const result = await benchmarkMemoryPerComponent(count)
    console.log(`  ${count.toLocaleString().padStart(7)} components: ${result.totalMB.toFixed(2).padStart(7)} MB total (${result.perComponentKB.toFixed(2)} KB/component)`)
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(200)
  }

  // Cleanup effectiveness
  console.log('\n💾 CLEANUP EFFECTIVENESS')
  console.log('────────────────────────────────────────────────────────────')

  for (const count of [10000, 50000, 100000]) {
    const result = await benchmarkCleanup(count)
    const cleaned = result.afterCreateMB - result.afterCleanupMB
    const cleanedPct = (cleaned / (result.afterCreateMB - result.beforeMB)) * 100
    console.log(`  ${count.toLocaleString().padStart(7)} components:`)
    console.log(`    Before:      ${result.beforeMB.toFixed(2)} MB`)
    console.log(`    After create: ${result.afterCreateMB.toFixed(2)} MB`)
    console.log(`    After cleanup: ${result.afterCleanupMB.toFixed(2)} MB`)
    console.log(`    Cleaned: ${cleaned.toFixed(2)} MB (${cleanedPct.toFixed(1)}%)`)
    console.log(`    Leak: ${result.leakKB.toFixed(2)} KB`)
    await Bun.sleep(200)
  }

  // Create/destroy cycles
  console.log('\n🔄 CREATE/DESTROY CYCLES (Memory Leak Test)')
  console.log('────────────────────────────────────────────────────────────')

  const cycleResult = await benchmarkCycles(1000, 100)
  console.log(`  1000 components × 100 cycles:`)
  console.log(`    Avg cycle time: ${cycleResult.avgCycleMS.toFixed(2)} ms`)
  console.log(`    Memory growth: ${cycleResult.memoryGrowthKB.toFixed(2)} KB`)
  console.log(`    Per cycle leak: ${(cycleResult.memoryGrowthKB / 100).toFixed(4)} KB`)

  // Maximum scale test
  console.log('\n🔥 MAXIMUM SCALE TEST')
  console.log('────────────────────────────────────────────────────────────')

  const maxScales = [100000, 250000, 500000]
  for (const count of maxScales) {
    cleanupAll()
    Bun.gc(true)
    await Bun.sleep(200)

    const start = performance.now()
    try {
      for (let i = 0; i < count; i++) {
        box({ width: 10, height: 5 })
      }
      const createTime = performance.now() - start
      const indices = getAllocatedIndices().size
      const mem = getMemoryUsage()
      console.log(`  ${count.toLocaleString().padStart(7)} components: ✓ (${createTime.toFixed(0)}ms, ${formatBytes(mem)})`)
    } catch (e) {
      console.log(`  ${count.toLocaleString().padStart(7)} components: ✗ FAILED - ${e}`)
      break
    }
  }

  // Final cleanup
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(200)
  const finalMem = getMemoryUsage()
  console.log(`\n  Final memory after cleanup: ${formatBytes(finalMem)}`)

  console.log('\n╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                         COMPLETE                                  ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')
}

// Run
benchmarkScale().catch(console.error)
