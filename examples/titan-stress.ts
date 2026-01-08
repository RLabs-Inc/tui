/**
 * TITAN ENGINE - BRUTAL STRESS TEST
 *
 * No sugarcoating. Find the limits. Break it.
 */

import { bind } from '@rlabs-inc/signals'
import { ComponentType } from '../src/types'
import { allocateIndex, releaseIndex, getAllocatedIndices } from '../src/engine/registry'
import * as core from '../src/engine/arrays/core'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as spacing from '../src/engine/arrays/spacing'
import * as layout from '../src/engine/arrays/layout'
import * as text from '../src/engine/arrays/text'

import { computeLayoutTitan } from '../src/pipeline/layout/titan-engine'

// =============================================================================
// UTILITIES
// =============================================================================

function formatTime(ms: number): string {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)}ns`
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1) return `${ms.toFixed(3)}ms`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function clearAll(): void {
  const indices = [...getAllocatedIndices()]
  for (const i of indices) releaseIndex(i)
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function p99(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.99)]
}

// =============================================================================
// TEST STRUCTURES
// =============================================================================

function createFlat(count: number): number {
  const root = allocateIndex()
  core.componentType[root] = ComponentType.BOX
  core.parentIndex[root] = bind(-1)
  core.visible[root] = bind(1)
  dimensions.width[root] = bind(1000)
  dimensions.height[root] = bind(1000)

  for (let i = 0; i < count; i++) {
    const idx = allocateIndex()
    core.componentType[idx] = ComponentType.BOX
    core.parentIndex[idx] = bind(root)
    core.visible[idx] = bind(1)
    dimensions.width[idx] = bind(10)
    dimensions.height[idx] = bind(10)
  }

  return count + 1
}

function createDeepChain(depth: number): number {
  let parent = allocateIndex()
  core.componentType[parent] = ComponentType.BOX
  core.parentIndex[parent] = bind(-1)
  core.visible[parent] = bind(1)
  dimensions.width[parent] = bind(1000)
  dimensions.height[parent] = bind(1000)

  for (let i = 0; i < depth; i++) {
    const idx = allocateIndex()
    core.componentType[idx] = ComponentType.BOX
    core.parentIndex[idx] = bind(parent)
    core.visible[idx] = bind(1)
    dimensions.width[idx] = bind(0)
    dimensions.height[idx] = bind(0)
    layout.flexGrow[idx] = bind(1)
    parent = idx
  }

  return depth + 1
}

function createTree(depth: number, children: number): number {
  let count = 0

  function createLevel(parent: number, d: number): void {
    if (d >= depth) return
    for (let i = 0; i < children; i++) {
      const idx = allocateIndex()
      core.componentType[idx] = ComponentType.BOX
      core.parentIndex[idx] = bind(parent)
      core.visible[idx] = bind(1)
      dimensions.width[idx] = bind(0)
      dimensions.height[idx] = bind(0)
      layout.flexGrow[idx] = bind(1)
      count++
      createLevel(idx, d + 1)
    }
  }

  const root = allocateIndex()
  core.componentType[root] = ComponentType.BOX
  core.parentIndex[root] = bind(-1)
  core.visible[root] = bind(1)
  dimensions.width[root] = bind(1000)
  dimensions.height[root] = bind(1000)
  count++

  createLevel(root, 0)
  return count
}

function createFlex(count: number): number {
  const root = allocateIndex()
  core.componentType[root] = ComponentType.BOX
  core.parentIndex[root] = bind(-1)
  core.visible[root] = bind(1)
  dimensions.width[root] = bind(1000)
  dimensions.height[root] = bind(1000)
  layout.flexDirection[root] = bind(1) // row
  layout.flexWrap[root] = bind(1) // wrap
  layout.justifyContent[root] = bind(3) // space-between
  spacing.gap[root] = bind(5)

  for (let i = 0; i < count; i++) {
    const idx = allocateIndex()
    core.componentType[idx] = ComponentType.BOX
    core.parentIndex[idx] = bind(root)
    core.visible[idx] = bind(1)
    dimensions.width[idx] = bind(50)
    dimensions.height[idx] = bind(30)
    layout.flexGrow[idx] = bind(i % 3)
    layout.flexShrink[idx] = bind(1)
  }

  return count + 1
}

// =============================================================================
// BENCHMARK RUNNER
// =============================================================================

function benchmark(
  name: string,
  setup: () => number,
  iterations: number = 100
): { avg: number; median: number; p99: number; min: number; max: number; nodes: number } {
  clearAll()
  const nodes = setup()

  // Warmup
  for (let i = 0; i < 5; i++) computeLayoutTitan(1000, 1000)

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds()
    computeLayoutTitan(1000, 1000)
    times.push((Bun.nanoseconds() - start) / 1_000_000)
  }

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    median: median(times),
    p99: p99(times),
    min: Math.min(...times),
    max: Math.max(...times),
    nodes,
  }
}

// =============================================================================
// RUN TESTS
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║           TITAN ENGINE - BRUTAL STRESS TEST                     ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()

// -----------------------------------------------------------------------------
// FLAT SCALING
// -----------------------------------------------------------------------------

console.log('📊 FLAT SCALING (1 parent, N children)')
console.log('─'.repeat(70))
console.log('  Nodes       Avg         Median      P99         Min         Max')
console.log('─'.repeat(70))

const flatSizes = [10, 100, 500, 1000, 2000, 5000, 10000, 20000]
const flatResults: { nodes: number; avg: number }[] = []

for (const size of flatSizes) {
  const r = benchmark(`Flat ${size}`, () => createFlat(size))
  flatResults.push({ nodes: r.nodes, avg: r.avg })
  console.log(
    `  ${r.nodes.toString().padStart(6)}    ` +
      `${formatTime(r.avg).padStart(10)}  ` +
      `${formatTime(r.median).padStart(10)}  ` +
      `${formatTime(r.p99).padStart(10)}  ` +
      `${formatTime(r.min).padStart(10)}  ` +
      `${formatTime(r.max).padStart(10)}`
  )
}

// Check scaling
console.log()
console.log('  Scaling analysis:')
for (let i = 1; i < flatResults.length; i++) {
  const prev = flatResults[i - 1]
  const curr = flatResults[i]
  const nodeRatio = curr.nodes / prev.nodes
  const timeRatio = curr.avg / prev.avg
  const scaling = timeRatio / nodeRatio
  const quality = scaling <= 1.1 ? '✓ linear' : scaling <= 2 ? '⚠ sublinear' : '✗ BAD'
  console.log(`    ${prev.nodes} → ${curr.nodes}: ${nodeRatio.toFixed(1)}x nodes, ${timeRatio.toFixed(1)}x time (${scaling.toFixed(2)}x scaling) ${quality}`)
}

console.log()

// -----------------------------------------------------------------------------
// DEEP NESTING
// -----------------------------------------------------------------------------

console.log('🌲 DEEP NESTING (single chain)')
console.log('─'.repeat(70))
console.log('  Depth       Avg         Median      P99         Min         Max')
console.log('─'.repeat(70))

const depths = [10, 50, 100, 200, 500, 1000]
const depthResults: { depth: number; avg: number }[] = []

for (const depth of depths) {
  const r = benchmark(`Depth ${depth}`, () => createDeepChain(depth))
  depthResults.push({ depth, avg: r.avg })
  console.log(
    `  ${depth.toString().padStart(6)}    ` +
      `${formatTime(r.avg).padStart(10)}  ` +
      `${formatTime(r.median).padStart(10)}  ` +
      `${formatTime(r.p99).padStart(10)}  ` +
      `${formatTime(r.min).padStart(10)}  ` +
      `${formatTime(r.max).padStart(10)}`
  )
}

// Check scaling
console.log()
console.log('  Scaling analysis:')
for (let i = 1; i < depthResults.length; i++) {
  const prev = depthResults[i - 1]
  const curr = depthResults[i]
  const depthRatio = curr.depth / prev.depth
  const timeRatio = curr.avg / prev.avg
  const scaling = timeRatio / depthRatio
  const quality = scaling <= 1.2 ? '✓ linear' : scaling <= 2 ? '⚠ O(n log n)?' : '✗ O(n²)?'
  console.log(`    ${prev.depth} → ${curr.depth}: ${depthRatio.toFixed(1)}x depth, ${timeRatio.toFixed(1)}x time (${scaling.toFixed(2)}x scaling) ${quality}`)
}

console.log()

// -----------------------------------------------------------------------------
// TREE STRUCTURES
// -----------------------------------------------------------------------------

console.log('🌳 TREE STRUCTURES (depth × children)')
console.log('─'.repeat(70))
console.log('  Config      Nodes       Avg         Median      P99')
console.log('─'.repeat(70))

const treeConfigs = [
  { depth: 3, children: 5 },   // 156 nodes
  { depth: 4, children: 4 },   // 341 nodes
  { depth: 5, children: 3 },   // 364 nodes
  { depth: 6, children: 3 },   // 1093 nodes
  { depth: 7, children: 3 },   // 3280 nodes
  { depth: 10, children: 2 },  // 2047 nodes
  { depth: 12, children: 2 },  // 8191 nodes
  { depth: 15, children: 2 },  // 65535 nodes
]

for (const { depth, children } of treeConfigs) {
  const expectedNodes = Math.floor((Math.pow(children, depth + 1) - 1) / (children - 1))
  if (expectedNodes > 100000) {
    console.log(`  D${depth}×C${children}    SKIPPED (would be ${expectedNodes} nodes)`)
    continue
  }

  const r = benchmark(`D${depth}×C${children}`, () => createTree(depth, children), 50)
  console.log(
    `  D${depth}×C${children}`.padEnd(12) +
      `${r.nodes.toString().padStart(8)}    ` +
      `${formatTime(r.avg).padStart(10)}  ` +
      `${formatTime(r.median).padStart(10)}  ` +
      `${formatTime(r.p99).padStart(10)}`
  )
}

console.log()

// -----------------------------------------------------------------------------
// FLEX LAYOUT
// -----------------------------------------------------------------------------

console.log('🔄 FLEX LAYOUT (row + wrap + grow + gap)')
console.log('─'.repeat(70))
console.log('  Items       Avg         Median      P99         ops/sec')
console.log('─'.repeat(70))

const flexSizes = [100, 500, 1000, 2000, 5000]

for (const size of flexSizes) {
  const r = benchmark(`Flex ${size}`, () => createFlex(size))
  const opsPerSec = Math.round(1000 / r.avg)
  console.log(
    `  ${size.toString().padStart(6)}    ` +
      `${formatTime(r.avg).padStart(10)}  ` +
      `${formatTime(r.median).padStart(10)}  ` +
      `${formatTime(r.p99).padStart(10)}  ` +
      `${opsPerSec.toString().padStart(10)}`
  )
}

console.log()

// -----------------------------------------------------------------------------
// SUSTAINED THROUGHPUT
// -----------------------------------------------------------------------------

console.log('⚡ SUSTAINED THROUGHPUT (layouts per second)')
console.log('─'.repeat(70))

const sustainedConfigs = [
  { name: 'Flat 100', setup: () => createFlat(100) },
  { name: 'Flat 1000', setup: () => createFlat(1000) },
  { name: 'Flex 500', setup: () => createFlex(500) },
  { name: 'Tree D5×C3', setup: () => createTree(5, 3) },
  { name: 'Deep 100', setup: () => createDeepChain(100) },
]

for (const { name, setup } of sustainedConfigs) {
  clearAll()
  setup()

  // 1 second sustained
  let count = 0
  const start = Date.now()
  while (Date.now() - start < 1000) {
    computeLayoutTitan(1000, 1000)
    count++
  }

  console.log(`  ${name.padEnd(15)} ${count.toString().padStart(6)} layouts/sec`)
}

console.log()

// -----------------------------------------------------------------------------
// BREAKING POINT
// -----------------------------------------------------------------------------

console.log('💥 BREAKING POINT (find the limits)')
console.log('─'.repeat(70))

// Flat breaking point
console.log('  Flat structure:')
for (const size of [50000, 100000, 200000]) {
  clearAll()
  try {
    const start = Bun.nanoseconds()
    createFlat(size)
    const createTime = (Bun.nanoseconds() - start) / 1_000_000

    const layoutStart = Bun.nanoseconds()
    computeLayoutTitan(1000, 1000)
    const layoutTime = (Bun.nanoseconds() - layoutStart) / 1_000_000

    console.log(`    ${size}: create ${formatTime(createTime)}, layout ${formatTime(layoutTime)} ✓`)
  } catch (e) {
    console.log(`    ${size}: FAILED - ${(e as Error).message}`)
    break
  }
}

// Deep breaking point
console.log('  Deep nesting:')
for (const depth of [2000, 5000, 10000]) {
  clearAll()
  try {
    const start = Bun.nanoseconds()
    createDeepChain(depth)
    const createTime = (Bun.nanoseconds() - start) / 1_000_000

    const layoutStart = Bun.nanoseconds()
    computeLayoutTitan(1000, 1000)
    const layoutTime = (Bun.nanoseconds() - layoutStart) / 1_000_000

    console.log(`    ${depth}: create ${formatTime(createTime)}, layout ${formatTime(layoutTime)} ✓`)
  } catch (e) {
    console.log(`    ${depth}: FAILED - ${(e as Error).message}`)
    break
  }
}

console.log()

// -----------------------------------------------------------------------------
// MEMORY PRESSURE
// -----------------------------------------------------------------------------

console.log('💾 MEMORY PRESSURE')
console.log('─'.repeat(70))

Bun.gc(true)
const heapBefore = process.memoryUsage().heapUsed

clearAll()
const bigCount = createFlat(50000)
const heapAfter = process.memoryUsage().heapUsed

const totalMB = (heapAfter - heapBefore) / 1024 / 1024
const perComponent = (heapAfter - heapBefore) / bigCount

console.log(`  50K components: ${totalMB.toFixed(2)} MB (${perComponent.toFixed(0)} bytes/component)`)

clearAll()
Bun.gc(true)
const heapFinal = process.memoryUsage().heapUsed
console.log(`  After cleanup:  ${((heapFinal - heapBefore) / 1024 / 1024).toFixed(2)} MB`)

console.log()

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------

console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║                         VERDICT                                  ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()
