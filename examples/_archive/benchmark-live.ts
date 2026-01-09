/**
 * TUI Framework - Live Performance Benchmark
 *
 * This benchmark IS a TUI app. It displays its own metrics on screen.
 * Uses the framework exactly how developers will - box, text, signals, deriveds.
 *
 * The framework eating its own dog food.
 * If we can't render smooth benchmarks, we have a problem.
 * If we can, we have proof.
 *
 * Controls:
 * - UP/DOWN: Change component count (100, 500, 1K, 2K, 5K, 10K, 20K)
 * - SPACE: Start/stop benchmark
 * - R: Reset metrics
 * - Q: Quit
 */

import { signal, derived, flushSync } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'

// Scales to test
const SCALES = [100, 500, 1000, 2000, 5000, 10000, 20000]

async function main() {
  // ==========================================================================
  // BENCHMARK STATE (reactive - displayed on screen!)
  // ==========================================================================

  const scaleIndex = signal(0)
  const componentCount = derived(() => SCALES[scaleIndex.value] ?? 100)

  const isRunning = signal(false)
  const frameCount = signal(0)
  const updateCount = signal(0)
  const fps = signal(0)
  const avgFrameTime = signal(0)
  const minFrameTime = signal(Infinity)
  const maxFrameTime = signal(0)
  const updatesPerSec = signal(0)
  const memoryMB = signal(0)

  const status = signal('Press SPACE to start, UP/DOWN to change scale')

  // Frame time history for percentiles
  let frameTimes: number[] = []
  let lastFrameTime = performance.now()
  let benchmarkStart = 0
  let updateStart = 0
  let updates = 0

  // ==========================================================================
  // BENCHMARK ITEMS - Created dynamically based on scale
  // ==========================================================================

  // These are the "work items" - signals that get updated
  const itemSignals: ReturnType<typeof signal<string>>[] = []
  const itemColors: ReturnType<typeof signal<typeof Colors.WHITE>>[] = []

  // Color palette for cycling
  const palette = [
    Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW,
    Colors.CYAN, Colors.MAGENTA, Colors.WHITE, Colors.GRAY
  ]

  // Initialize signals for max scale
  for (let i = 0; i < SCALES[SCALES.length - 1]!; i++) {
    itemSignals.push(signal(`Item ${i}`))
    itemColors.push(signal(palette[i % palette.length]!))
  }

  // ==========================================================================
  // BENCHMARK LOOP
  // ==========================================================================

  let animationFrame: ReturnType<typeof setTimeout> | null = null

  function runBenchmark() {
    if (!isRunning.value) return

    const frameStart = performance.now()
    const count = componentCount.value

    // Update a batch of items (simulate real app updates)
    const batchSize = Math.min(100, count)
    for (let i = 0; i < batchSize; i++) {
      const idx = (updates + i) % count
      itemSignals[idx]!.value = `Item ${idx} @ ${updates}`
      itemColors[idx]!.value = palette[(updates + idx) % palette.length]!
    }
    updates += batchSize
    updateCount.value = updates

    // Let the framework process updates
    flushSync()

    // Measure frame time
    const frameEnd = performance.now()
    const frameTime = frameEnd - lastFrameTime
    lastFrameTime = frameEnd

    frameTimes.push(frameTime)
    if (frameTimes.length > 100) frameTimes.shift()

    // Update metrics
    frameCount.value++

    const elapsed = (frameEnd - benchmarkStart) / 1000
    if (elapsed > 0) {
      fps.value = Math.round(frameCount.value / elapsed)
      updatesPerSec.value = Math.round(updates / elapsed)
    }

    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    avgFrameTime.value = Math.round(avg * 100) / 100
    minFrameTime.value = Math.min(minFrameTime.value, frameTime)
    maxFrameTime.value = Math.max(maxFrameTime.value, frameTime)

    // Memory (rough estimate via Bun)
    if (frameCount.value % 10 === 0) {
      const mem = process.memoryUsage()
      memoryMB.value = Math.round(mem.heapUsed / 1024 / 1024)
    }

    // Schedule next frame (target ~60fps = 16ms, but don't block)
    animationFrame = setTimeout(runBenchmark, 0)
  }

  function startBenchmark() {
    isRunning.value = true
    frameCount.value = 0
    updateCount.value = 0
    updates = 0
    frameTimes = []
    minFrameTime.value = Infinity
    maxFrameTime.value = 0
    benchmarkStart = performance.now()
    lastFrameTime = benchmarkStart
    status.value = `Running benchmark with ${componentCount.value} components...`
    runBenchmark()
  }

  function stopBenchmark() {
    isRunning.value = false
    if (animationFrame) {
      clearTimeout(animationFrame)
      animationFrame = null
    }
    status.value = `Stopped. ${frameCount.value} frames, ${updateCount.value} updates`
  }

  function resetMetrics() {
    frameCount.value = 0
    updateCount.value = 0
    fps.value = 0
    avgFrameTime.value = 0
    minFrameTime.value = Infinity
    maxFrameTime.value = 0
    updatesPerSec.value = 0
    frameTimes = []
    updates = 0
    status.value = 'Metrics reset. Press SPACE to start.'
  }

  // ==========================================================================
  // THE APP - Displays benchmark results AND the benchmark items
  // ==========================================================================

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      bg: { r: 15, g: 15, b: 25, a: 255 },
      children: () => {
        // =====================================================================
        // HEADER - Title and controls
        // =====================================================================
        box({
          height: 3,
          bg: { r: 30, g: 30, b: 50, a: 255 },
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: '  TUI LIVE BENCHMARK', fg: Colors.CYAN })
            text({
              content: derived(() => `Components: ${componentCount.value.toLocaleString()}`),
              fg: Colors.YELLOW
            })
          }
        })

        // =====================================================================
        // METRICS PANEL - Live performance stats
        // =====================================================================
        box({
          height: 8,
          border: BorderStyle.ROUNDED,
          borderColor: Colors.GREEN,
          padding: 1,
          flexDirection: 'column',
          gap: 0,
          children: () => {
            text({ content: ' LIVE METRICS', fg: Colors.GREEN })
            text({ content: '─'.repeat(70), fg: Colors.GRAY })

            // Row 1: FPS and Frame Time
            box({
              flexDirection: 'row',
              gap: 4,
              children: () => {
                text({ content: 'FPS:', fg: Colors.GRAY, width: 5 })
                text({
                  content: derived(() => fps.value.toString().padStart(4)),
                  fg: derived(() => fps.value >= 30 ? Colors.GREEN : fps.value >= 15 ? Colors.YELLOW : Colors.RED),
                  width: 5
                })

                text({ content: 'Avg Frame:', fg: Colors.GRAY, width: 11 })
                text({
                  content: derived(() => `${avgFrameTime.value.toFixed(2)}ms`),
                  fg: Colors.WHITE,
                  width: 10
                })

                text({ content: 'Min:', fg: Colors.GRAY, width: 5 })
                text({
                  content: derived(() => minFrameTime.value === Infinity ? '-' : `${minFrameTime.value.toFixed(1)}ms`),
                  fg: Colors.CYAN,
                  width: 8
                })

                text({ content: 'Max:', fg: Colors.GRAY, width: 5 })
                text({
                  content: derived(() => `${maxFrameTime.value.toFixed(1)}ms`),
                  fg: Colors.MAGENTA,
                  width: 8
                })
              }
            })

            // Row 2: Updates and Memory
            box({
              flexDirection: 'row',
              gap: 4,
              children: () => {
                text({ content: 'Updates/sec:', fg: Colors.GRAY, width: 13 })
                text({
                  content: derived(() => updatesPerSec.value.toLocaleString().padStart(8)),
                  fg: Colors.YELLOW,
                  width: 9
                })

                text({ content: 'Total Updates:', fg: Colors.GRAY, width: 15 })
                text({
                  content: derived(() => updateCount.value.toLocaleString().padStart(10)),
                  fg: Colors.WHITE,
                  width: 11
                })

                text({ content: 'Memory:', fg: Colors.GRAY, width: 8 })
                text({
                  content: derived(() => `${memoryMB.value}MB`),
                  fg: Colors.BLUE,
                  width: 8
                })
              }
            })

            // Row 3: Frames
            box({
              flexDirection: 'row',
              gap: 4,
              children: () => {
                text({ content: 'Frames:', fg: Colors.GRAY, width: 8 })
                text({
                  content: derived(() => frameCount.value.toLocaleString().padStart(8)),
                  fg: Colors.WHITE,
                  width: 9
                })

                text({ content: 'Status:', fg: Colors.GRAY, width: 8 })
                text({
                  content: derived(() => isRunning.value ? 'RUNNING' : 'STOPPED'),
                  fg: derived(() => isRunning.value ? Colors.GREEN : Colors.RED),
                  width: 10
                })
              }
            })
          }
        })

        // =====================================================================
        // SCALE SELECTOR
        // =====================================================================
        box({
          height: 3,
          flexDirection: 'row',
          padding: 1,
          gap: 1,
          children: () => {
            text({ content: 'Scale:', fg: Colors.GRAY })
            for (let i = 0; i < SCALES.length; i++) {
              const isSelected = derived(() => scaleIndex.value === i)
              box({
                width: 8,
                border: BorderStyle.SINGLE,
                borderColor: derived(() => isSelected.value ? Colors.CYAN : Colors.GRAY),
                bg: derived(() => isSelected.value ? { r: 0, g: 60, b: 80, a: 255 } : { r: 25, g: 25, b: 35, a: 255 }),
                children: () => {
                  text({
                    content: SCALES[i]! >= 1000 ? `${SCALES[i]! / 1000}K` : SCALES[i]!.toString(),
                    fg: derived(() => isSelected.value ? Colors.WHITE : Colors.GRAY),
                    align: 'center'
                  })
                }
              })
            }
          }
        })

        // =====================================================================
        // BENCHMARK ITEMS - The actual work being measured
        // =====================================================================
        box({
          grow: 1,
          border: BorderStyle.SINGLE,
          borderColor: Colors.GRAY,
          padding: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          overflow: 'hidden',
          children: () => {
            // Render items based on current scale
            // We create a fixed grid, but only show items up to componentCount
            const cols = 10
            const rows = Math.ceil(componentCount.value / cols)
            const visibleRows = Math.min(rows, 20) // Limit visible rows

            for (let row = 0; row < visibleRows; row++) {
              box({
                width: '100%',
                height: 1,
                flexDirection: 'row',
                children: () => {
                  for (let col = 0; col < cols; col++) {
                    const idx = row * cols + col
                    if (idx < componentCount.value) {
                      text({
                        content: itemSignals[idx]!,
                        fg: itemColors[idx]!,
                        width: 14,
                      })
                    }
                  }
                }
              })
            }

            // Show overflow indicator
            if (rows > visibleRows) {
              text({
                content: derived(() => `... and ${(rows - visibleRows) * cols} more items`),
                fg: Colors.GRAY
              })
            }
          }
        })

        // =====================================================================
        // STATUS BAR
        // =====================================================================
        box({
          height: 2,
          bg: { r: 30, g: 30, b: 50, a: 255 },
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: status, fg: Colors.WHITE })
            text({ content: 'SPACE=start/stop  UP/DOWN=scale  R=reset  Q=quit', fg: Colors.GRAY })
          }
        })
      }
    })
  })

  // ==========================================================================
  // KEYBOARD CONTROLS
  // ==========================================================================

  keyboard.onKey((event) => {
    const key = event.key.toLowerCase()

    // Toggle benchmark
    if (event.key === 'Space' || key === ' ') {
      if (isRunning.value) {
        stopBenchmark()
      } else {
        startBenchmark()
      }
    }

    // Scale up
    if (event.key === 'Up' || event.key === 'ArrowUp') {
      if (scaleIndex.value < SCALES.length - 1) {
        scaleIndex.value++
        status.value = `Scale: ${componentCount.value.toLocaleString()} components`
      }
    }

    // Scale down
    if (event.key === 'Down' || event.key === 'ArrowDown') {
      if (scaleIndex.value > 0) {
        scaleIndex.value--
        status.value = `Scale: ${componentCount.value.toLocaleString()} components`
      }
    }

    // Reset
    if (key === 'r') {
      resetMetrics()
    }

    // Quit
    if (key === 'q' || (event.modifiers?.ctrl && key === 'c')) {
      stopBenchmark()
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
