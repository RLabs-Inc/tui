/**
 * TUI Framework - REALISTIC Stress Test
 *
 * Just like a real app:
 * 1. Create components (box + text with signals)
 * 2. Set up ONE render effect (like framework would)
 * 3. Update signals rapidly
 * 4. Measure actual frame throughput
 */

import { signal, effect, flushSync } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { layoutDerived } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

async function stressTest(componentCount: number, durationMs: number = 3000) {
  console.log(`\n━━━ ${componentCount.toLocaleString()} COMPONENTS ━━━`)

  cleanupAll()
  Bun.gc(true)
  await Bun.sleep(100)

  terminalWidth.value = 200
  terminalHeight.value = 100

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE - Just like a real app would
  // ══════════════════════════════════════════════════════════════════════════
  const signals: ReturnType<typeof signal<string>>[] = []
  const cleanups: (() => void)[] = []

  const createStart = performance.now()

  for (let i = 0; i < componentCount; i++) {
    const s = signal(`Item ${i}`)
    signals.push(s)

    const cleanup = box({
      width: 50,
      height: 1,
      children: () => {
        text({ content: s })
      }
    })
    cleanups.push(cleanup)
  }

  const createTime = performance.now() - createStart
  console.log(`  Create: ${createTime.toFixed(1)}ms`)

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER EFFECT - The ONE effect that renders (like framework would have)
  // ══════════════════════════════════════════════════════════════════════════
  let frameCount = 0
  const frameTimes: number[] = []
  let lastFrame = performance.now()

  const disposeRender = effect(() => {
    // This is what the framework's render loop does
    const layout = layoutDerived.value
    const fb = frameBufferDerived.value

    // Track frame time
    const now = performance.now()
    if (frameCount > 0) {
      frameTimes.push(now - lastFrame)
    }
    lastFrame = now
    frameCount++
  })

  // Initial render
  flushSync()
  frameCount = 0
  frameTimes.length = 0

  // ══════════════════════════════════════════════════════════════════════════
  // UPDATE - Rapid signal changes (simulating real usage)
  // ══════════════════════════════════════════════════════════════════════════
  let updateCount = 0
  const updateStart = performance.now()

  while (performance.now() - updateStart < durationMs) {
    // Update a signal - like real user interaction
    const idx = updateCount % signals.length
    signals[idx].value = `Updated ${updateCount}`
    updateCount++

    // Let framework process the update
    flushSync()
  }

  const updateTime = performance.now() - updateStart
  const updatesPerSec = (updateCount / updateTime) * 1000

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════════
  disposeRender()

  const avgFrameTime = frameTimes.length > 0
    ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    : 0
  const sortedFrames = [...frameTimes].sort((a, b) => a - b)
  const p95 = sortedFrames[Math.floor(sortedFrames.length * 0.95)] || 0
  const fps = frameCount / (updateTime / 1000)

  console.log(`  Updates: ${updateCount.toLocaleString()} in ${(updateTime/1000).toFixed(1)}s`)
  console.log(`  Throughput: ${updatesPerSec.toFixed(0)} updates/sec`)
  console.log(`  Frames: ${frameCount}`)
  console.log(`  Avg frame: ${avgFrameTime.toFixed(2)}ms`)
  console.log(`  P95 frame: ${p95.toFixed(2)}ms`)
  console.log(`  FPS: ${fps.toFixed(1)}`)

  const verdict = avgFrameTime < 16.67 ? '✅ 60fps' : avgFrameTime < 33.33 ? '⚠️ 30fps' : '❌ <30fps'
  console.log(`  Verdict: ${verdict}`)

  // ══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════════════════════════════════════
  cleanups.forEach(c => c())
  cleanupAll()
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║         TUI FRAMEWORK - REALISTIC STRESS TEST                 ║')
  console.log('║                                                               ║')
  console.log('║   Create real components, update signals, measure throughput  ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  const scales = [100, 500, 1_000, 2_500, 5_000, 10_000]

  for (const count of scales) {
    await stressTest(count, 3000)
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
