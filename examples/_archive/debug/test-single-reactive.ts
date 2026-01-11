/**
 * Test: Does a SINGLE reactive prop work?
 */

import { signal } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors } from '../../index'

async function main() {
  const counter = signal(0)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  const cleanup = await mount(() => {
    box({
      width: 40,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'Single reactive test', fg: Colors.CYAN })
        // ONLY one reactive binding - counter signal directly
        text({ content: counter, fg: Colors.GREEN })
      }
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
