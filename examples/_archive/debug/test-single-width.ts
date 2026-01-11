/**
 * Test: Single reactive WIDTH
 */

import { signal } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors } from '../../index'

async function main() {
  const width = signal(20)

  setInterval(() => {
    width.value = 20 + (width.value % 20)
    console.error(`[auto] width=${width.value}`)
  }, 500)

  const cleanup = await mount(() => {
    box({
      width: width,  // ONLY reactive prop
      height: 3,
      bg: Colors.GREEN,
      children: () => {
        text({ content: 'Width test', fg: Colors.BLACK })
      }
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
