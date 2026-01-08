/**
 * Debug: Keyboard input test
 * Shows what key events are received
 */

import { mount, box, text, keyboard, Colors } from './index'
import { signal } from '@rlabs-inc/signals'

async function main() {
  const lastKey = signal('(press any key)')
  const keyCount = signal(0)
  const lastRaw = signal('')

  const cleanup = await mount(() => {
    box({
      width: 50,
      padding: 2,
      border: 1,
      borderColor: Colors.CYAN,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'KEYBOARD DEBUG', fg: Colors.CYAN })
        text({ content: '' })
        text({ content: 'Press any key to see what is received' })
        text({ content: 'Press Q to exit' })
        text({ content: '' })
        text({ content: () => `Last key: "${lastKey.value}"`, fg: Colors.YELLOW })
        text({ content: () => `Key count: ${keyCount.value}`, fg: Colors.GREEN })
        text({ content: () => `Last raw: ${lastRaw.value}`, fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Listen to ALL key events
  keyboard.onKey((event) => {
    console.log('[KEY]', JSON.stringify(event))
    lastKey.value = event.key
    keyCount.value++
    lastRaw.value = JSON.stringify(event.modifiers)

    // Exit on Q
    if (event.key === 'q' || event.key === 'Q') {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
