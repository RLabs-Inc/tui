/**
 * Minimal reactivity test - EXACT copy of 08-reactivity structure
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  // EXACT same signals as 08-reactivity.ts
  const counter = signal(0)
  const name = signal('World')
  const color = signal<typeof Colors.RED>(Colors.WHITE)
  const width = signal(20)
  const visible = signal(true)

  // Derived values - EXACT same
  const doubled = derived(() => counter.value * 2)
  const greeting = derived(() => `Hello, ${name.value}!`)
  const isEven = derived(() => counter.value % 2 === 0)

  // Update counter every 500ms - SAME
  const counterInterval = setInterval(() => {
    counter.value++
  }, 500)

  // Cycle colors every 1s - SAME
  const colorCycle = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.MAGENTA, Colors.CYAN]
  let colorIndex = 0
  const colorInterval = setInterval(() => {
    colorIndex = (colorIndex + 1) % colorCycle.length
    color.value = colorCycle[colorIndex]!
  }, 1000)

  // Cycle width every 750ms - SAME
  const widthInterval = setInterval(() => {
    width.value = 15 + (counter.value % 10) * 3
  }, 750)

  // Toggle visibility every 2s - SAME
  const visibleInterval = setInterval(() => {
    visible.value = !visible.value
  }, 2000)

  const cleanup = await mount(() => {
    // SAME structure as 08-reactivity
    box({
      width: 70,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'MINIMAL TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(68), fg: Colors.GRAY })

        // Basic signal - EXACT pattern from 08-reactivity
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

        // Derived values - EXACT pattern from 08-reactivity
        text({ content: 'Derived Values:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'doubled:', fg: Colors.GRAY })
            text({ content: doubled, fg: Colors.YELLOW })
          },
        })

        // Reactive color - EXACT pattern from 08-reactivity
        text({ content: 'Reactive Color (changes every 1s):', fg: Colors.WHITE })
        text({ content: 'This text color changes', fg: color })

        // Reactive width - EXACT pattern from 08-reactivity
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
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', () => {
    clearInterval(counterInterval)
    cleanup()
  })
  keyboard.onKey('Q', () => {
    clearInterval(counterInterval)
    cleanup()
  })
}

main().catch(console.error)
