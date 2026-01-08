/**
 * TUI Framework - Simplest Demo
 *
 * Just a box with static text inside.
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 40,
      height: 5,
      border: BorderStyle.SINGLE,
      borderColor: Colors.GREEN,
      padding: 1,
      children: () => {
        text({
          content: 'Hello TUI!',
          fg: Colors.YELLOW,
        })
      }
    })
  })

  // Exit on 'q' key (Ctrl+C is built-in)
  keyboard.onKey('q', () => {
    cleanup().then(() => process.exit(0))
  })

  // Auto-exit after 5 seconds for testing
  setTimeout(async () => {
    await cleanup()
    process.exit(0)
  }, 5000)
}

main().catch(console.error)
