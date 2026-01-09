/**
 * 1000 Animated Components Benchmark
 * Uses ONE shared interval instead of 1000 separate ones
 * Press Q to quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors } from '../../index'

const COUNT = 1000
const PER_TYPE = COUNT / 4

const palette = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.CYAN, Colors.MAGENTA, Colors.WHITE, Colors.GRAY]
const sparkles = '★☆✦✧◆◇●○■□▲△'

const memoryMB = signal(0)

// Store all signals so we can update them from ONE interval
const clockSignals: ReturnType<typeof signal<string>>[] = []
const counterSignals: ReturnType<typeof signal<number>>[] = []
const colorSignals: ReturnType<typeof signal<number>>[] = []
const sparkleSignals: ReturnType<typeof signal<number>>[] = []

async function main() {
  const cleanup = await mount(() => {
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
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: `BENCHMARK: ${COUNT} ANIMATED COMPONENTS`, fg: Colors.CYAN })
            text({ content: derived(() => `Memory: ${memoryMB.value}MB`), fg: Colors.YELLOW })
          }
        })

        // Components container
        box({
          grow: 1,
          padding: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          children: () => {
            // CLOCKS
            for (let i = 0; i < PER_TYPE; i++) {
              const content = signal(new Date().toLocaleTimeString())
              clockSignals.push(content)
              text({ content, fg: Colors.CYAN, width: 10 })
            }

            // COUNTERS
            for (let i = 0; i < PER_TYPE; i++) {
              const count = signal(0)
              counterSignals.push(count)
              text({ content: derived(() => `N:${count.value}`), fg: Colors.GREEN, width: 6 })
            }

            // COLORS
            for (let i = 0; i < PER_TYPE; i++) {
              const idx = signal(i)
              colorSignals.push(idx)
              text({ content: 'COL', fg: derived(() => palette[idx.value % 8]!), width: 4 })
            }

            // SPARKLES
            for (let i = 0; i < PER_TYPE; i++) {
              const idx = signal(0)
              sparkleSignals.push(idx)
              text({
                content: derived(() => sparkles[idx.value % sparkles.length]!),
                fg: derived(() => palette[idx.value % 8]!),
                width: 2
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
            text({ content: 'Press Q to quit', fg: Colors.GRAY })
          }
        })
      }
    })
  })

  // ONE interval updates everything - much more efficient!
  let tick = 0
  const interval = setInterval(() => {
    tick++

    // Update clocks every second
    if (tick % 60 === 0) {
      const time = new Date().toLocaleTimeString()
      for (const s of clockSignals) s.value = time
    }

    // Update counters every 6 ticks (~100ms)
    if (tick % 6 === 0) {
      for (const s of counterSignals) s.value++
    }

    // Update colors every 12 ticks (~200ms)
    if (tick % 12 === 0) {
      for (const s of colorSignals) s.value++
    }

    // Update sparkles every 9 ticks (~150ms)
    if (tick % 9 === 0) {
      for (const s of sparkleSignals) {
        s.value = Math.floor(Math.random() * sparkles.length)
      }
    }

    // Memory
    if (tick % 60 === 0) {
      memoryMB.value = Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
  }, 16) // ~60fps

  keyboard.onKey('q', () => {
    clearInterval(interval)
    cleanup().then(() => process.exit(0))
  })
}

main()
