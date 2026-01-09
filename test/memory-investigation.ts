/**
 * TUI Framework - Memory Investigation
 *
 * Isolate where the memory is going.
 */

import { signal, derived, bind } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry, getAllocatedIndices, allocateIndex, releaseIndex } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getMem(): number {
  Bun.gc(true)
  return process.memoryUsage().heapUsed
}

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

async function investigate() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║           MEMORY INVESTIGATION                                   ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  const count = 1000

  // Test 1: Raw signals only
  console.log('📊 TEST 1: Raw signals (1000 signals)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const sig1 = getMem()

  const signals: any[] = []
  for (let i = 0; i < count; i++) {
    signals.push(signal(i))
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const sig2 = getMem()
  console.log(`  Memory: ${formatBytes(sig2 - sig1)} (${((sig2 - sig1) / count / 1024).toFixed(2)} KB per signal)\n`)
  signals.length = 0

  // Test 2: Raw bindings only
  console.log('📊 TEST 2: Raw bindings (1000 bindings)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const bind1 = getMem()

  const bindings: any[] = []
  for (let i = 0; i < count; i++) {
    const s = signal(i)
    bindings.push(bind(s))
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const bind2 = getMem()
  console.log(`  Memory: ${formatBytes(bind2 - bind1)} (${((bind2 - bind1) / count / 1024).toFixed(2)} KB per binding)\n`)
  bindings.length = 0

  // Test 3: Just registry allocation
  console.log('📊 TEST 3: Registry allocation only (1000 indices)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const reg1 = getMem()

  const indices: number[] = []
  for (let i = 0; i < count; i++) {
    indices.push(allocateIndex())
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const reg2 = getMem()
  console.log(`  Memory: ${formatBytes(reg2 - reg1)} (${((reg2 - reg1) / count / 1024).toFixed(2)} KB per index)\n`)

  // Test 4: Simple box() only (no children)
  console.log('📊 TEST 5: box() only - no children (1000 boxes)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const box1 = getMem()

  for (let i = 0; i < count; i++) {
    box({ width: 100, height: 50 })
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const box2 = getMem()
  console.log(`  Memory: ${formatBytes(box2 - box1)} (${((box2 - box1) / count / 1024).toFixed(2)} KB per box)\n`)

  // Test 6: box() with static text child
  console.log('📊 TEST 6: box() + text() child (1000 pairs)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const pair1 = getMem()

  for (let i = 0; i < count; i++) {
    box({
      width: 100,
      height: 50,
      children: () => {
        text({ content: 'Hello' })
      }
    })
  }

  Bun.gc(true)
  await Bun.sleep(100)
  const pair2 = getMem()
  console.log(`  Memory: ${formatBytes(pair2 - pair1)} (${((pair2 - pair1) / count / 1024).toFixed(2)} KB per pair)\n`)

  // Test 7: box() with signal text child
  console.log('📊 TEST 7: box() + text(signal) child (1000 pairs with signals)')
  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)
  const sigPair1 = getMem()

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
  const sigPair2 = getMem()
  console.log(`  Memory: ${formatBytes(sigPair2 - sigPair1)} (${((sigPair2 - sigPair1) / count / 1024).toFixed(2)} KB per pair with signal)\n`)

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║                      SUMMARY                                     ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝')
  console.log(`  Signal only:        ${((sig2 - sig1) / count / 1024).toFixed(2)} KB`)
  console.log(`  Binding only:       ${((bind2 - bind1) / count / 1024).toFixed(2)} KB`)
  console.log(`  Registry only:      ${((reg2 - reg1) / count / 1024).toFixed(2)} KB`)
  console.log(`  box() only:         ${((box2 - box1) / count / 1024).toFixed(2)} KB`)
  console.log(`  box()+text():       ${((pair2 - pair1) / count / 1024).toFixed(2)} KB`)
  console.log(`  box()+text(signal): ${((sigPair2 - sigPair1) / count / 1024).toFixed(2)} KB`)

  cleanupAll()
}

investigate().catch(console.error)
