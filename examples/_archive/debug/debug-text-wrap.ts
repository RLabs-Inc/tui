/**
 * Debug: Text Wrapping
 *
 * Verifies that text correctly wraps within its container
 * and that TITAN calculates the correct height.
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const longText = "This is a very long piece of text that should wrap to multiple lines within its container. The layout engine should calculate the correct height based on wrapping."

  const cleanup = await mount(() => {
    box({
      width: 50,
      padding: 1,
      border: BorderStyle.SINGLE,
      borderColor: Colors.CYAN,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'TEXT WRAPPING TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(46), fg: Colors.GRAY })

        // Container with fixed width - text should wrap
        box({
          width: 40,
          border: BorderStyle.SINGLE,
          borderColor: Colors.GREEN,
          padding: 1,
          children: () => {
            text({ content: longText, fg: Colors.WHITE })
          },
        })

        text({ content: '' })

        // Another container - narrow width
        box({
          width: 25,
          border: BorderStyle.SINGLE,
          borderColor: Colors.YELLOW,
          padding: 1,
          children: () => {
            text({ content: 'Short container with wrapping text that should wrap', fg: Colors.WHITE })
          },
        })

        text({ content: '' })
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
