/**
 * TUI Framework - Hello World Demo
 *
 * Our first test! A simple reactive counter.
 */

import { mount, box, text, signal, keyboard, Colors, BorderStyle } from '../index'

async function main() {
  // Reactive state
  const count = signal(0)
  const message = signal('Press SPACE to increment, Q to quit')

  // Mount the app
  const cleanup = await mount(() => {
    box({
      width: 50,
      height: 10,
      border: BorderStyle.ROUNDED,
      borderColor: Colors.CYAN,
      padding: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 1,
      children: () => {
        // Title - give it explicit dimensions
        text({
          content: '✨ TUI Framework ✨',
          fg: Colors.YELLOW,
          width: 30,
          height: 1,
        })

        // Counter - reactive!
        text({
          content: () => `Count: ${count.value}`,
          fg: Colors.GREEN,
          width: 20,
          height: 1,
        })

        // Instructions
        text({
          content: message,
          fg: Colors.WHITE,
          width: 40,
          height: 1,
        })
      }
    })
  })

  // Handle keyboard
  keyboard.onKey((event) => {
    if (event.key === 'Space') {
      count.value++
      message.value = `Incremented! Count is now ${count.value}`
    }

    if (event.key === 'q' || (event.modifiers.ctrl && event.key === 'c')) {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
