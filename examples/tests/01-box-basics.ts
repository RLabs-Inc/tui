/**
 * Feature Test: Box Basics
 *
 * Tests:
 * - Box with explicit dimensions
 * - Border styles (single, double, rounded, etc.)
 * - Border colors
 * - Padding (all sides)
 * - Background colors
 * - Opacity
 * - Nested boxes
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const cleanup = await mount(() => {
    // Main container
    box({
      width: 70,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        // Title
        text({ content: 'BOX BASICS TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(68), fg: Colors.GRAY })

        // Row 1: Border styles
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 15,
              height: 4,
              border: BorderStyle.SINGLE,
              borderColor: Colors.WHITE,
              children: () => text({ content: 'SINGLE', fg: Colors.WHITE }),
            })
            box({
              width: 15,
              height: 4,
              border: BorderStyle.DOUBLE,
              borderColor: Colors.YELLOW,
              children: () => text({ content: 'DOUBLE', fg: Colors.YELLOW }),
            })
            box({
              width: 15,
              height: 4,
              border: BorderStyle.ROUNDED,
              borderColor: Colors.CYAN,
              children: () => text({ content: 'ROUNDED', fg: Colors.CYAN }),
            })
            box({
              width: 15,
              height: 4,
              border: BorderStyle.BOLD,
              borderColor: Colors.GREEN,
              children: () => text({ content: 'HEAVY', fg: Colors.GREEN }),
            })
          },
        })

        // Spacer
        text({ content: '' })

        // Row 2: Background colors
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({ width: 8, height: 2, bg: Colors.RED, children: () => text({ content: 'RED' }) })
            box({ width: 8, height: 2, bg: Colors.GREEN, children: () => text({ content: 'GREEN' }) })
            box({ width: 8, height: 2, bg: Colors.BLUE, children: () => text({ content: 'BLUE' }) })
            box({ width: 8, height: 2, bg: Colors.YELLOW, children: () => text({ content: 'YELLOW', fg: Colors.BLACK }) })
            box({ width: 8, height: 2, bg: Colors.MAGENTA, children: () => text({ content: 'MAGENTA' }) })
            box({ width: 8, height: 2, bg: Colors.CYAN, children: () => text({ content: 'CYAN', fg: Colors.BLACK }) })
          },
        })

        // Spacer
        text({ content: '' })

        // Row 3: Padding test
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 0,
              children: () => text({ content: 'pad:0', fg: Colors.WHITE }),
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 1,
              children: () => text({ content: 'pad:1', fg: Colors.WHITE }),
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 2,
              children: () => text({ content: 'pad:2', fg: Colors.WHITE }),
            })
          },
        })

        // Spacer
        text({ content: '' })

        // Row 4: Nested boxes
        box({
          border: BorderStyle.DOUBLE,
          borderColor: Colors.BLUE,
          padding: 1,
          children: () => {
            text({ content: 'Outer Box (Double Blue)', fg: Colors.BLUE })
            box({
              border: BorderStyle.SINGLE,
              borderColor: Colors.GREEN,
              padding: 1,
              children: () => {
                text({ content: 'Middle Box (Single Green)', fg: Colors.GREEN })
                box({
                  border: BorderStyle.ROUNDED,
                  borderColor: Colors.YELLOW,
                  padding: 1,
                  children: () => {
                    text({ content: 'Inner Box (Rounded Yellow)', fg: Colors.YELLOW })
                  },
                })
              },
            })
          },
        })

        // Footer
        text({ content: '' })
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
