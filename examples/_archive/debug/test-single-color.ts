/**
 * Test: Single reactive COLOR (fg)
 */

import { signal } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors } from '../../index'

async function main() {
  const color = signal(Colors.GREEN)
  const colorCycle = [Colors.GREEN, Colors.YELLOW, Colors.RED, Colors.BLUE]
  let idx = 0

  setInterval(() => {
    idx = (idx + 1) % colorCycle.length
    color.value = colorCycle[idx]!
    console.error(`[auto] color changed`)
  }, 500)

  const cleanup = await mount(() => {
    box({
      width: 30,
      height: 3,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'Color test', fg: color })  // ONLY reactive prop
      }
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
