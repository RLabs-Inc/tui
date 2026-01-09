/**
 * TITAN ENGINE vs YOGA - Benchmark Comparison
 *
 * Tests layout computation performance at different scales.
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
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1) return `${ms.toFixed(3)}ms`
  return `${ms.toFixed(2)}ms`
}

function clearAllComponents(): void {
  const indices = [...getAllocatedIndices()]
  for (const i of indices) {
    releaseIndex(i)
  }
}

// =============================================================================
// CREATE TEST STRUCTURE
// =============================================================================

function createFlatStructure(count: number): void {
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
    text.textContent[index] = bind(`Item ${i}`)
    dimensions.width[index] = bind(0) // auto
    dimensions.height[index] = bind(0) // auto
  }
}

function createNestedStructure(depth: number, childrenPerLevel: number): void {
  function createLevel(parent: number, currentDepth: number): void {
    if (currentDepth >= depth) return

    for (let i = 0; i < childrenPerLevel; i++) {
      const index = allocateIndex()
      core.componentType[index] = ComponentType.BOX
      core.parentIndex[index] = bind(parent)
      core.visible[index] = bind(1)
      dimensions.width[index] = bind(0)
      dimensions.height[index] = bind(0)
      layout.flexGrow[index] = bind(1)

      createLevel(index, currentDepth + 1)
    }
  }

  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(200)
  dimensions.height[rootIndex] = bind(200)

  createLevel(rootIndex, 0)
}

function createFlexStructure(count: number): void {
  const rootIndex = allocateIndex()
  core.componentType[rootIndex] = ComponentType.BOX
  core.parentIndex[rootIndex] = bind(-1)
  core.visible[rootIndex] = bind(1)
  dimensions.width[rootIndex] = bind(200)
  dimensions.height[rootIndex] = bind(200)
  layout.flexDirection[rootIndex] = bind(1) // row
  layout.flexWrap[rootIndex] = bind(1) // wrap
  layout.justifyContent[rootIndex] = bind(3) // space-between
  spacing.gap[rootIndex] = bind(2)

  for (let i = 0; i < count; i++) {
    const index = allocateIndex()
    core.componentType[index] = ComponentType.BOX
    core.parentIndex[index] = bind(rootIndex)
    core.visible[index] = bind(1)
    dimensions.width[index] = bind(20)
    dimensions.height[index] = bind(5)
    layout.flexGrow[index] = bind(i % 3) // varying grow
  }
}

// =============================================================================
// BENCHMARKS
// =============================================================================

interface BenchResult {
  name: string
  components: number
  avgMs: number
  minMs: number
  maxMs: number
  opsPerSec: number
}

function benchmark(name: string, setup: () => void, iterations: number = 100): BenchResult {
  clearAllComponents()
  setup()

  const componentCount = getAllocatedIndices().size
  const times: number[] = []

  // Warmup
  for (let i = 0; i < 10; i++) {
    computeLayoutTitan(200, 200)
  }

  // Benchmark
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds()
    computeLayoutTitan(200, 200)
    times.push((Bun.nanoseconds() - start) / 1_000_000)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  return {
    name,
    components: componentCount,
    avgMs: avg,
    minMs: min,
    maxMs: max,
    opsPerSec: Math.round(1000 / avg)
  }
}

// =============================================================================
// RUN BENCHMARKS
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║           TITAN ENGINE - BENCHMARK SUITE                         ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()

// Flat structure benchmarks
console.log('📦 FLAT STRUCTURE (single parent, N children)')
console.log('─'.repeat(60))

const flatSizes = [100, 500, 1000, 5000]
for (const size of flatSizes) {
  const result = benchmark(`Flat ${size}`, () => createFlatStructure(size))
  console.log(`  ${result.name.padEnd(12)}: avg ${formatTime(result.avgMs).padEnd(10)} (${result.opsPerSec}/sec)`)
}
console.log()

// Flex structure benchmarks
console.log('🔄 FLEX STRUCTURE (row + wrap + grow)')
console.log('─'.repeat(60))

const flexSizes = [100, 500, 1000]
for (const size of flexSizes) {
  const result = benchmark(`Flex ${size}`, () => createFlexStructure(size))
  console.log(`  ${result.name.padEnd(12)}: avg ${formatTime(result.avgMs).padEnd(10)} (${result.opsPerSec}/sec)`)
}
console.log()

// Nested structure benchmarks
console.log('🌳 NESTED STRUCTURE (depth × children)')
console.log('─'.repeat(60))

const nestedConfigs = [
  { depth: 5, children: 3 },   // 3^5 = 243 nodes
  { depth: 6, children: 3 },   // 3^6 = 729 nodes
  { depth: 10, children: 2 },  // 2^10 = 1024 nodes
  { depth: 100, children: 1 }, // 100 deep, single chain
]

for (const { depth, children } of nestedConfigs) {
  const result = benchmark(`D${depth}×C${children}`, () => createNestedStructure(depth, children))
  console.log(`  ${result.name.padEnd(12)}: ${result.components} nodes, avg ${formatTime(result.avgMs).padEnd(10)} (${result.opsPerSec}/sec)`)
}
console.log()

// Stress test
console.log('🔥 STRESS TEST')
console.log('─'.repeat(60))

const stressResult = benchmark('10K flat', () => createFlatStructure(10000), 50)
console.log(`  ${stressResult.components} components: avg ${formatTime(stressResult.avgMs)}, ${stressResult.opsPerSec}/sec`)

clearAllComponents()

// Rapid fire test
console.log()
console.log('⚡ RAPID FIRE (sustained updates)')
console.log('─'.repeat(60))

createFlexStructure(500)
const duration = 1000
let updates = 0
const startTime = Date.now()

while (Date.now() - startTime < duration) {
  computeLayoutTitan(200, 200)
  updates++
}

const actualDuration = Date.now() - startTime
console.log(`  ${updates} layout computations in ${actualDuration}ms`)
console.log(`  ${Math.round(updates / (actualDuration / 1000))}/sec sustained`)

clearAllComponents()

// Summary
console.log()
console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║                         SUMMARY                                  ║')
console.log('╚══════════════════════════════════════════════════════════════════╝')
console.log()
console.log('  TITAN ENGINE - Complete Flexbox in pure parallel arrays')
console.log('  Features: block, flex (grow/shrink/wrap/justify/align), absolute')
console.log('  No Yoga. No WASM. Just TypeScript trusting reactivity.')
console.log()
