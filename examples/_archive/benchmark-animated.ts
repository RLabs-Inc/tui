/**
 * TUI Framework - Animated Components Benchmark
 *
 * 4 types of self-animating components:
 * - Clock: updates time every second
 * - Counter: counts up continuously
 * - ColorCycler: cycles through colors
 * - Sparkle: random characters
 *
 * Controls:
 * - 1/2/3/4: Add 10 of that component type
 * - SHIFT+1/2/3/4: Remove 10 of that type
 * - +/-: Add/remove 100 random components
 * - R: Reset (remove all)
 * - Q: Quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'
import { pushParentContext, popParentContext } from '../src/engine/registry'

// =============================================================================
// ANIMATED COMPONENT TYPES
// =============================================================================

type AnimatedComponent = {
  type: 'clock' | 'counter' | 'colorCycler' | 'sparkle'
  cleanup: () => void
  intervalCleanup: () => void
}

const palette = [
  Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW,
  Colors.CYAN, Colors.MAGENTA, Colors.WHITE, Colors.GRAY
]

const sparkleChars = '★☆✦✧◆◇●○■□▲△♠♣♥♦'

// Track all created components
const components: AnimatedComponent[] = []

// Index of the items container (set during mount)
let itemsContainerIndex = -1

// Metrics
const totalCount = signal(0)
const clockCount = signal(0)
const counterCount = signal(0)
const colorCount = signal(0)
const sparkleCount = signal(0)
const memoryMB = signal(0)
const status = signal('1-4=add, SHIFT+1-4=remove, +/-=bulk, R=reset, Q=quit')

// =============================================================================
// COMPONENT FACTORIES
// =============================================================================

function createClock(): AnimatedComponent {
  const content = signal(new Date().toLocaleTimeString())
  const interval = setInterval(() => {
    content.value = new Date().toLocaleTimeString()
  }, 1000)

  const cleanup = text({
    content,
    fg: Colors.CYAN,
    width: 10,
  })

  clockCount.value++
  totalCount.value++

  return {
    type: 'clock',
    cleanup,
    intervalCleanup: () => clearInterval(interval),
  }
}

function createCounter(): AnimatedComponent {
  const count = signal(0)
  const content = derived(() => `C:${count.value}`)
  const interval = setInterval(() => {
    count.value++
  }, 100)

  const cleanup = text({
    content,
    fg: Colors.GREEN,
    width: 8,
  })

  counterCount.value++
  totalCount.value++

  return {
    type: 'counter',
    cleanup,
    intervalCleanup: () => clearInterval(interval),
  }
}

function createColorCycler(): AnimatedComponent {
  const colorIdx = signal(0)
  const color = derived(() => palette[colorIdx.value % palette.length]!)
  const interval = setInterval(() => {
    colorIdx.value++
  }, 200)

  const cleanup = text({
    content: 'COLOR',
    fg: color,
    width: 7,
  })

  colorCount.value++
  totalCount.value++

  return {
    type: 'colorCycler',
    cleanup,
    intervalCleanup: () => clearInterval(interval),
  }
}

function createSparkle(): AnimatedComponent {
  const charIdx = signal(0)
  const content = derived(() => sparkleChars[charIdx.value % sparkleChars.length]!)
  const color = derived(() => palette[charIdx.value % palette.length]!)
  const interval = setInterval(() => {
    charIdx.value = Math.floor(Math.random() * sparkleChars.length)
  }, 150)

  const cleanup = text({
    content,
    fg: color,
    width: 3,
  })

  sparkleCount.value++
  totalCount.value++

  return {
    type: 'sparkle',
    cleanup,
    intervalCleanup: () => clearInterval(interval),
  }
}

// =============================================================================
// ADD/REMOVE FUNCTIONS
// =============================================================================

function addComponents(type: 'clock' | 'counter' | 'colorCycler' | 'sparkle', count: number) {
  const factory = {
    clock: createClock,
    counter: createCounter,
    colorCycler: createColorCycler,
    sparkle: createSparkle,
  }[type]

  for (let i = 0; i < count; i++) {
    components.push(factory())
  }

  updateStatus()
}

function removeComponents(type: 'clock' | 'counter' | 'colorCycler' | 'sparkle', count: number) {
  let removed = 0
  for (let i = components.length - 1; i >= 0 && removed < count; i--) {
    if (components[i]!.type === type) {
      const comp = components.splice(i, 1)[0]!
      comp.intervalCleanup()
      comp.cleanup()
      removed++

      // Update type counts
      if (type === 'clock') clockCount.value--
      else if (type === 'counter') counterCount.value--
      else if (type === 'colorCycler') colorCount.value--
      else if (type === 'sparkle') sparkleCount.value--
      totalCount.value--
    }
  }

  updateStatus()
}

function addRandom(count: number) {
  const types: Array<'clock' | 'counter' | 'colorCycler' | 'sparkle'> = ['clock', 'counter', 'colorCycler', 'sparkle']
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]!
    addComponents(type, 1)
  }
}

function removeRandom(count: number) {
  for (let i = 0; i < count && components.length > 0; i++) {
    const idx = Math.floor(Math.random() * components.length)
    const comp = components.splice(idx, 1)[0]!
    comp.intervalCleanup()
    comp.cleanup()

    if (comp.type === 'clock') clockCount.value--
    else if (comp.type === 'counter') counterCount.value--
    else if (comp.type === 'colorCycler') colorCount.value--
    else if (comp.type === 'sparkle') sparkleCount.value--
    totalCount.value--
  }

  updateStatus()
}

function removeAll() {
  for (const comp of components) {
    comp.intervalCleanup()
    comp.cleanup()
  }
  components.length = 0
  clockCount.value = 0
  counterCount.value = 0
  colorCount.value = 0
  sparkleCount.value = 0
  totalCount.value = 0

  // Force GC
  if (typeof Bun !== 'undefined' && Bun.gc) {
    Bun.gc(true)
  }

  updateStatus()
}

function updateStatus() {
  const mem = process.memoryUsage()
  memoryMB.value = Math.round(mem.heapUsed / 1024 / 1024)
  status.value = `Total: ${totalCount.value} | Clocks: ${clockCount.value} | Counters: ${counterCount.value} | Colors: ${colorCount.value} | Sparkles: ${sparkleCount.value} | Mem: ${memoryMB.value}MB`
}

// =============================================================================
// MAIN
// =============================================================================

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
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: 'ANIMATED COMPONENTS BENCHMARK', fg: Colors.CYAN })
            text({
              content: derived(() => `Total: ${totalCount.value}`),
              fg: Colors.YELLOW
            })
          }
        })

        // Stats panel
        box({
          border: BorderStyle.SINGLE,
          borderColor: Colors.GREEN,
          padding: 1,
          flexDirection: 'column',
          children: () => {
            text({ content: 'COMPONENT COUNTS', fg: Colors.GREEN })
            box({
              flexDirection: 'row',
              gap: 3,
              children: () => {
                text({ content: '1.Clock:', fg: Colors.GRAY })
                text({ content: clockCount, fg: Colors.CYAN })
                text({ content: '2.Counter:', fg: Colors.GRAY })
                text({ content: counterCount, fg: Colors.GREEN })
                text({ content: '3.Color:', fg: Colors.GRAY })
                text({ content: colorCount, fg: Colors.MAGENTA })
                text({ content: '4.Sparkle:', fg: Colors.GRAY })
                text({ content: sparkleCount, fg: Colors.YELLOW })
                text({ content: 'Memory:', fg: Colors.GRAY })
                text({
                  content: derived(() => `${memoryMB.value}MB`),
                  fg: Colors.BLUE
                })
              }
            })
          }
        })

        // COMPONENTS AREA - This is where animated components will appear
        box({
          grow: 1,
          border: BorderStyle.SINGLE,
          borderColor: Colors.CYAN,
          padding: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            // Components are added here dynamically via createXxx() functions
          }
        })

        // Controls hint
        box({
          height: 3,
          bg: { r: 30, g: 30, b: 50, a: 255 },
          padding: 1,
          flexDirection: 'column',
          children: () => {
            text({ content: status, fg: Colors.WHITE })
            text({ content: '1-4=add10 | SHIFT+1-4=remove10 | +/-=bulk100 | R=reset | Q=quit', fg: Colors.GRAY })
          }
        })
      }
    })
  })

  // Memory update interval
  const memInterval = setInterval(() => {
    const mem = process.memoryUsage()
    memoryMB.value = Math.round(mem.heapUsed / 1024 / 1024)
  }, 1000)

  // Keyboard handlers
  keyboard.onKey('1', () => addComponents('clock', 10))
  keyboard.onKey('2', () => addComponents('counter', 10))
  keyboard.onKey('3', () => addComponents('colorCycler', 10))
  keyboard.onKey('4', () => addComponents('sparkle', 10))

  keyboard.onKey('!', () => removeComponents('clock', 10))      // Shift+1
  keyboard.onKey('@', () => removeComponents('counter', 10))    // Shift+2
  keyboard.onKey('#', () => removeComponents('colorCycler', 10)) // Shift+3
  keyboard.onKey('$', () => removeComponents('sparkle', 10))    // Shift+4

  keyboard.onKey('+', () => addRandom(100))
  keyboard.onKey('=', () => addRandom(100))  // Same key without shift
  keyboard.onKey('-', () => removeRandom(100))

  keyboard.onKey('r', removeAll)
  keyboard.onKey('R', removeAll)

  keyboard.onKey('q', () => {
    clearInterval(memInterval)
    removeAll()
    cleanup().then(() => process.exit(0))
  })
  keyboard.onKey('Q', () => {
    clearInterval(memInterval)
    removeAll()
    cleanup().then(() => process.exit(0))
  })

  updateStatus()
}

main().catch(console.error)
