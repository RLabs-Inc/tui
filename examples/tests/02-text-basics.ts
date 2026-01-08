/**
 * Feature Test: Text Basics
 *
 * Tests:
 * - Foreground colors
 * - Text alignment (left, center, right)
 * - Static strings
 * - Numeric content (the 0 is falsy bug we fixed!)
 * - Empty strings
 * - Long text truncation
 */

import { signal } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  // Test reactive number (including 0!)
  const counter = signal(0)

  setInterval(() => {
    counter.value++
  }, 500)

  const cleanup = await mount(() => {
    box({
      width: 60,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'TEXT BASICS TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(58), fg: Colors.GRAY })

        // Foreground colors
        text({ content: 'Foreground Colors:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            text({ content: 'RED', fg: Colors.RED })
            text({ content: 'GREEN', fg: Colors.GREEN })
            text({ content: 'BLUE', fg: Colors.BLUE })
            text({ content: 'YELLOW', fg: Colors.YELLOW })
            text({ content: 'MAGENTA', fg: Colors.MAGENTA })
            text({ content: 'CYAN', fg: Colors.CYAN })
            text({ content: 'WHITE', fg: Colors.WHITE })
            text({ content: 'GRAY', fg: Colors.GRAY })
          },
        })

        text({ content: '' })

        // Text alignment in fixed-width boxes
        text({ content: 'Text Alignment:', fg: Colors.WHITE })
        box({
          width: 56,
          border: 1,
          borderColor: Colors.GRAY,
          children: () => {
            text({ content: 'Left aligned (default)', fg: Colors.GREEN })
          },
        })
        box({
          width: 56,
          border: 1,
          borderColor: Colors.GRAY,
          children: () => {
            text({ content: 'Center aligned', fg: Colors.YELLOW, align: 'center' })
          },
        })
        box({
          width: 56,
          border: 1,
          borderColor: Colors.GRAY,
          children: () => {
            text({ content: 'Right aligned', fg: Colors.CYAN, align: 'right' })
          },
        })

        text({ content: '' })

        // Numeric content (including 0!)
        text({ content: 'Numeric Content (0 is falsy test):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 0, fg: Colors.RED })
            text({ content: 1, fg: Colors.GREEN })
            text({ content: 42, fg: Colors.BLUE })
            text({ content: -1, fg: Colors.YELLOW })
            text({ content: 3.14, fg: Colors.MAGENTA })
          },
        })

        text({ content: '' })

        // Reactive counter
        text({ content: 'Reactive Counter (updates every 500ms):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            text({ content: 'Count:', fg: Colors.GRAY })
            text({ content: counter, fg: Colors.GREEN })
          },
        })

        text({ content: '' })

        // Function getter
        text({ content: 'Function Getter:', fg: Colors.WHITE })
        text({ content: () => `The count is ${counter.value} right now`, fg: Colors.CYAN })

        text({ content: '' })
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
