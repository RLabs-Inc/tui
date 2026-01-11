/**
 * Test: Absolutely minimal TUI mount with ONE reactive text
 */

import { signal } from '@rlabs-inc/signals'
import { mount, text, keyboard, Colors } from '../../index'

async function main() {
  const counter = signal(0)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  // MINIMAL: just one text, no box wrapper
  const cleanup = await mount(() => {
    text({ content: counter, fg: Colors.GREEN })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
