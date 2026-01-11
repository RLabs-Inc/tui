/**
 * Test: Do TWO reactive props work?
 */

import { signal } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors } from '../../index'

async function main() {
  const counter = signal(0)
  const color = signal(Colors.GREEN)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  // Cycle color too
  const colors = [Colors.GREEN, Colors.YELLOW, Colors.RED]
  let idx = 0
  setInterval(() => {
    idx = (idx + 1) % colors.length
    color.value = colors[idx]!
  }, 750)

  const cleanup = await mount(() => {
    box({
      width: 40,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'Two reactive test', fg: Colors.CYAN })
        // TWO reactive bindings
        text({ content: counter, fg: color })
      }
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
