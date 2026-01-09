/**
 * TUI Framework - REAL Benchmark
 *
 * Uses the raw API (box, text) directly with signal bindings.
 * This tests the actual reactive pipeline, not the .tui compiler.
 *
 * Controls:
 * - 1-8: Select scale (10, 50, 100, 200, 500, 1K, 2K, 5K)
 * - SPACE: Start/stop
 * - Q: Quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'

const SCALES = [10, 50, 100, 200, 500, 1000, 2000, 5000]
const SCALE_LABELS = ['10', '50', '100', '200', '500', '1K', '2K', '5K']

async function main() {
  // ==========================================================================
  // STATE
  // ==========================================================================
  const scaleIndex = signal(2)  // Start at 100
  const currentScale = derived(() => SCALES[scaleIndex.value] ?? 100)
  const isRunning = signal(false)

  // Metrics
  const tickCount = signal(0)
  const fps = signal(0)
  const avgFrameTime = signal(0)
  const updatesPerSec = signal(0)
  const memoryMB = signal(0)
  const status = signal('Press 1-8 for scale, SPACE to start, Q to quit')

  // Timing
  let frameTimes: number[] = []
  let lastTickTime = 0
  let benchmarkStart = 0
  let totalUpdates = 0
  let updateInterval: ReturnType<typeof setInterval> | null = null

  // ==========================================================================
  // ITEM SIGNALS - These drive the actual text components
  // ==========================================================================
  const maxItems = SCALES[SCALES.length - 1]!
  const itemLabels: ReturnType<typeof signal<string>>[] = []
  const itemColors: ReturnType<typeof signal<number>>[] = []

  for (let i = 0; i < maxItems; i++) {
    itemLabels.push(signal(`Item ${i}`))
    itemColors.push(signal(Colors.WHITE))
  }

  const palette = [
    Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW,
    Colors.CYAN, Colors.MAGENTA, Colors.WHITE, Colors.GRAY
  ]

  // ==========================================================================
  // FUNCTIONS
  // ==========================================================================

  function startBenchmark() {
    isRunning.value = true
    tickCount.value = 0
    totalUpdates = 0
    frameTimes = []
    benchmarkStart = performance.now()
    lastTickTime = benchmarkStart
    status.value = `Running with ${count} components...`

    // ONE central update loop
    updateInterval = setInterval(() => {
      if (!isRunning.value) return

      const count = currentScale.value
      const tick = tickCount.value

      // Update a rotating batch
      const batchSize = Math.min(50, count)
      for (let i = 0; i < batchSize; i++) {
        const idx = (tick * batchSize + i) % count
        itemLabels[idx]!.value = `#${idx}@${tick}`
        itemColors[idx]!.value = palette[(tick + idx) % 8]!
      }

      totalUpdates += batchSize
      tickCount.value++

      // Timing
      const now = performance.now()
      const frameTime = now - lastTickTime
      lastTickTime = now

      frameTimes.push(frameTime)
      if (frameTimes.length > 60) frameTimes.shift()

      // Metrics
      const elapsed = (now - benchmarkStart) / 1000
      if (elapsed > 0) {
        fps.value = Math.round(tickCount.value / elapsed)
        updatesPerSec.value = Math.round(totalUpdates / elapsed)
      }

      if (frameTimes.length > 0) {
        avgFrameTime.value = Math.round(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length * 100) / 100
      }

      memoryMB.value = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }, 16)
  }

  function stopBenchmark() {
    isRunning.value = false
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
    status.value = `Stopped. ${tickCount.value} ticks, ${totalUpdates.toLocaleString()} updates, ${fps.value} FPS`
  }

  function changeScale(idx: number) {
    if (isRunning.value) stopBenchmark()
    scaleIndex.value = idx
    status.value = `Scale: ${SCALE_LABELS[idx]} (${SCALES[idx]}). SPACE to start.`
  }

  // ==========================================================================
  // UI - Using raw box/text API
  // ==========================================================================

  const cleanup = await mount(() => {
    // Main container
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      bg: { r: 15, g: 15, b: 25, a: 255 },
      children: () => {
        // Header
        box({
          height: 3,
          bg: { r: 30, g: 30, b: 50, a: 255 },
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: 'TUI REAL BENCHMARK', fg: Colors.CYAN })
            text({
              content: derived(() => `Components: ${currentScale.value}`),
              fg: Colors.YELLOW
            })
          }
        })

        // Metrics panel
        box({
          border: BorderStyle.SINGLE,
          borderColor: Colors.GREEN,
          padding: 1,
          flexDirection: 'column',
          children: () => {
            text({ content: 'LIVE METRICS', fg: Colors.GREEN })

            box({
              flexDirection: 'row',
              gap: 3,
              children: () => {
                text({ content: 'FPS:', fg: Colors.GRAY })
                text({
                  content: fps,
                  fg: derived(() => fps.value >= 30 ? Colors.GREEN : Colors.RED)
                })
                text({ content: 'Avg:', fg: Colors.GRAY })
                text({
                  content: derived(() => `${avgFrameTime.value}ms`),
                  fg: Colors.WHITE
                })
                text({ content: 'Updates/sec:', fg: Colors.GRAY })
                text({ content: updatesPerSec, fg: Colors.YELLOW })
                text({ content: 'Ticks:', fg: Colors.GRAY })
                text({ content: tickCount, fg: Colors.WHITE })
                text({ content: 'Mem:', fg: Colors.GRAY })
                text({
                  content: derived(() => `${memoryMB.value}MB`),
                  fg: Colors.BLUE
                })
              }
            })

            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'Status:', fg: Colors.GRAY })
                text({
                  content: derived(() => isRunning.value ? 'RUNNING' : 'STOPPED'),
                  fg: derived(() => isRunning.value ? Colors.GREEN : Colors.RED)
                })
              }
            })
          }
        })

        // Scale selector
        box({
          height: 3,
          flexDirection: 'row',
          padding: 1,
          gap: 1,
          children: () => {
            text({ content: 'Scale:', fg: Colors.GRAY })
            for (let i = 0; i < SCALE_LABELS.length; i++) {
              const idx = i  // Capture for closure
              box({
                width: 6,
                border: BorderStyle.SINGLE,
                borderColor: derived(() => scaleIndex.value === idx ? Colors.CYAN : Colors.GRAY),
                children: () => {
                  text({
                    content: SCALE_LABELS[idx]!,
                    fg: derived(() => scaleIndex.value === idx ? Colors.WHITE : Colors.GRAY),
                    align: 'center'
                  })
                }
              })
            }
          }
        })

        // ITEMS CONTAINER - All items created here, visibility controlled by signal
        box({
          grow: 1,
          border: BorderStyle.SINGLE,
          borderColor: Colors.CYAN,
          padding: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          children: () => {
            // Create ALL items upfront - use visible prop to show/hide
            for (let i = 0; i < maxItems; i++) {
              const idx = i  // Capture for closure
              text({
                content: itemLabels[idx]!,  // Signal - reactive!
                fg: itemColors[idx]!,       // Signal - reactive!
                width: 10,
                visible: derived(() => idx < currentScale.value),  // Only show up to scale
              })
            }
          }
        })

        // Footer
        box({
          height: 2,
          bg: { r: 30, g: 30, b: 50, a: 255 },
          padding: 1,
          children: () => {
            text({ content: status, fg: Colors.WHITE })
          }
        })
      }
    })
  })

  // ==========================================================================
  // KEYBOARD
  // ==========================================================================
  keyboard.onKey('1', () => changeScale(0))
  keyboard.onKey('2', () => changeScale(1))
  keyboard.onKey('3', () => changeScale(2))
  keyboard.onKey('4', () => changeScale(3))
  keyboard.onKey('5', () => changeScale(4))
  keyboard.onKey('6', () => changeScale(5))
  keyboard.onKey('7', () => changeScale(6))
  keyboard.onKey('8', () => changeScale(7))

  keyboard.onKey(' ', () => {
    if (isRunning.value) stopBenchmark()
    else startBenchmark()
  })

  keyboard.onKey('q', () => {
    stopBenchmark()
    cleanup().then(() => process.exit(0))
  })
  keyboard.onKey('Q', () => {
    stopBenchmark()
    cleanup().then(() => process.exit(0))
  })
}

main().catch(console.error)
