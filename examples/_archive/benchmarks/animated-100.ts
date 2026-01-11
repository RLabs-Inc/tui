/**
 * 100 Animated Components Benchmark
 * 25 of each type: clock, counter, color, sparkle
 * Press Q to quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

const COUNT = 100
const PER_TYPE = COUNT / 4

const palette = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.CYAN, Colors.MAGENTA, Colors.WHITE, Colors.GRAY]
const sparkles = '★☆✦✧◆◇●○■□▲△'

const memoryMB = signal(0)
const intervals: ReturnType<typeof setInterval>[] = []

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

        // Components
        box({
          grow: 1,
          padding: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            // CLOCKS
            for (let i = 0; i < PER_TYPE; i++) {
              const content = signal(new Date().toLocaleTimeString())
              intervals.push(setInterval(() => { content.value = new Date().toLocaleTimeString() }, 1000))
              text({ content, fg: Colors.CYAN, width: 10 })
            }

            // COUNTERS
            for (let i = 0; i < PER_TYPE; i++) {
              const count = signal(0)
              intervals.push(setInterval(() => { count.value++ }, 100))
              text({ content: derived(() => `N:${count.value}`), fg: Colors.GREEN, width: 8 })
            }

            // COLORS
            for (let i = 0; i < PER_TYPE; i++) {
              const idx = signal(i)
              intervals.push(setInterval(() => { idx.value++ }, 200))
              text({ content: 'COLOR', fg: derived(() => palette[idx.value % 8]!), width: 7 })
            }

            // SPARKLES
            for (let i = 0; i < PER_TYPE; i++) {
              const idx = signal(0)
              intervals.push(setInterval(() => { idx.value = Math.floor(Math.random() * sparkles.length) }, 150))
              text({
                content: derived(() => sparkles[idx.value % sparkles.length]!),
                fg: derived(() => palette[idx.value % 8]!),
                width: 3
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

  setInterval(() => { memoryMB.value = Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }, 1000)

  keyboard.onKey('q', () => {
    intervals.forEach(clearInterval)
    cleanup().then(() => process.exit(0))
  })
}

main()
