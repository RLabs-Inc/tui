/**
 * Feature Test: Reactivity
 *
 * Tests all reactive patterns:
 * - Static values
 * - Signal values (numbers, strings, objects)
 * - Function getters
 * - Derived values
 * - Two-way reactivity
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  // Various reactive state
  const counter = signal(0)
  const name = signal('World')
  const color = signal<typeof Colors.RED>(Colors.WHITE)
  const width = signal(20)
  const visible = signal(true)

  // Derived values
  const doubled = derived(() => counter.value * 2)
  const greeting = derived(() => `Hello, ${name.value}!`)
  const isEven = derived(() => counter.value % 2 === 0)

  // Update counter every 500ms
  const counterInterval = setInterval(() => {
    counter.value++
  }, 500)

  // Cycle colors every 1s
  const colorCycle = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.MAGENTA, Colors.CYAN]
  let colorIndex = 0
  const colorInterval = setInterval(() => {
    colorIndex = (colorIndex + 1) % colorCycle.length
    color.value = colorCycle[colorIndex]!
  }, 1000)

  // Cycle width every 750ms
  const widthInterval = setInterval(() => {
    width.value = 15 + (counter.value % 10) * 3
  }, 750)

  // Toggle visibility every 2s
  const visibleInterval = setInterval(() => {
    visible.value = !visible.value
  }, 2000)

  const cleanup = await mount(() => {
    box({
      width: 70,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'REACTIVITY TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(68), fg: Colors.GRAY })

        // Section 1: Basic signal
        text({ content: 'Signal (number, updates every 500ms):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'counter:', fg: Colors.GRAY })
            text({ content: counter, fg: Colors.GREEN })
          },
        })

        text({ content: '' })

        // Section 2: Derived values
        text({ content: 'Derived Values:', fg: Colors.WHITE })
        box({
          gap: 1,
          children: () => {
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'doubled:', fg: Colors.GRAY })
                text({ content: doubled, fg: Colors.YELLOW })
              },
            })
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'isEven:', fg: Colors.GRAY })
                text({ content: () => isEven.value ? 'YES' : 'NO', fg: () => isEven.value ? Colors.GREEN : Colors.RED })
              },
            })
          },
        })

        text({ content: '' })

        // Section 3: Function getters
        text({ content: 'Function Getters:', fg: Colors.WHITE })
        box({
          gap: 1,
          children: () => {
            text({ content: () => `Counter is ${counter.value}`, fg: Colors.CYAN })
            text({ content: () => `Doubled is ${doubled.value}`, fg: Colors.MAGENTA })
            text({ content: () => `Counter mod 5 = ${counter.value % 5}`, fg: Colors.YELLOW })
          },
        })

        text({ content: '' })

        // Section 4: Reactive color
        text({ content: 'Reactive Color (changes every 1s):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'This text color changes', fg: color })
            box({
              width: 10,
              height: 2,
              bg: color,
              children: () => text({ content: 'BG too!' }),
            })
          },
        })

        text({ content: '' })

        // Section 5: Reactive dimensions
        text({ content: 'Reactive Width (changes every 750ms):', fg: Colors.WHITE })
        box({
          width: width,
          height: 3,
          border: BorderStyle.SINGLE,
          borderColor: Colors.GREEN,
          children: () => {
            text({ content: () => `width: ${width.value}`, fg: Colors.GREEN })
          },
        })

        text({ content: '' })

        // Section 6: Reactive visibility
        text({ content: 'Reactive Visibility (toggles every 2s):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'Status:', fg: Colors.GRAY })
            text({
              content: () => visible.value ? 'VISIBLE' : 'HIDDEN',
              fg: () => visible.value ? Colors.GREEN : Colors.RED,
            })
          },
        })
        box({
          width: 30,
          height: 3,
          border: 1,
          borderColor: Colors.YELLOW,
          visible: visible,
          children: () => {
            text({ content: 'I appear and disappear!', fg: Colors.YELLOW })
          },
        })

        text({ content: '' })

        // Section 7: Complex reactive expression
        text({ content: 'Complex Reactive Expression:', fg: Colors.WHITE })
        text({
          content: () => {
            const c = counter.value
            const d = doubled.value
            const e = isEven.value ? 'even' : 'odd'
            return `At tick ${c}, doubled=${d}, which is ${e}`
          },
          fg: Colors.CYAN,
        })

        text({ content: '' })
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', () => {
    clearInterval(counterInterval)
    clearInterval(colorInterval)
    clearInterval(widthInterval)
    clearInterval(visibleInterval)
    cleanup()
  })
  keyboard.onKey('Q', () => {
    clearInterval(counterInterval)
    clearInterval(colorInterval)
    clearInterval(widthInterval)
    clearInterval(visibleInterval)
    cleanup()
  })
}

main().catch(console.error)
