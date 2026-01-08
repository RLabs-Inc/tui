/**
 * Feature Test: Colors and Themes
 *
 * Tests:
 * - All predefined Colors
 * - Custom RGBA colors
 * - Opacity blending
 * - Color inheritance
 * - Theme system
 */

import { mount, box, text, keyboard, Colors, BorderStyle, state } from '../../index'
import { theme, themes, resolveColor } from '../../src/state/theme'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'COLORS AND THEMES TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(78), fg: Colors.GRAY })

        // Section 1: All predefined foreground colors
        text({ content: 'Predefined Foreground Colors:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            text({ content: 'RED', fg: Colors.RED })
            text({ content: 'GREEN', fg: Colors.GREEN })
            text({ content: 'BLUE', fg: Colors.BLUE })
            text({ content: 'YELLOW', fg: Colors.YELLOW })
            text({ content: 'MAGENTA', fg: Colors.MAGENTA })
            text({ content: 'CYAN', fg: Colors.CYAN })
            text({ content: 'WHITE', fg: Colors.WHITE })
            text({ content: 'BLACK', fg: Colors.BLACK, bg: Colors.WHITE })
            text({ content: 'GRAY', fg: Colors.GRAY })
          },
        })

        text({ content: '' })

        // Section 2: All predefined background colors
        text({ content: 'Predefined Background Colors:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            box({ width: 8, height: 2, bg: Colors.RED, children: () => text({ content: 'RED' }) })
            box({ width: 8, height: 2, bg: Colors.GREEN, children: () => text({ content: 'GREEN' }) })
            box({ width: 8, height: 2, bg: Colors.BLUE, children: () => text({ content: 'BLUE' }) })
            box({ width: 8, height: 2, bg: Colors.YELLOW, children: () => text({ content: 'YELLOW', fg: Colors.BLACK }) })
            box({ width: 8, height: 2, bg: Colors.MAGENTA, children: () => text({ content: 'MAGENTA' }) })
            box({ width: 8, height: 2, bg: Colors.CYAN, children: () => text({ content: 'CYAN', fg: Colors.BLACK }) })
            box({ width: 8, height: 2, bg: Colors.WHITE, children: () => text({ content: 'WHITE', fg: Colors.BLACK }) })
            box({ width: 8, height: 2, bg: Colors.GRAY, children: () => text({ content: 'GRAY' }) })
          },
        })

        text({ content: '' })

        // Section 3: Custom RGBA colors
        text({ content: 'Custom RGBA Colors:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            // Orange (not predefined)
            box({
              width: 10,
              height: 3,
              bg: { r: 255, g: 165, b: 0, a: 255 },
              children: () => text({ content: 'ORANGE', fg: Colors.BLACK }),
            })
            // Pink
            box({
              width: 10,
              height: 3,
              bg: { r: 255, g: 192, b: 203, a: 255 },
              children: () => text({ content: 'PINK', fg: Colors.BLACK }),
            })
            // Purple
            box({
              width: 10,
              height: 3,
              bg: { r: 128, g: 0, b: 128, a: 255 },
              children: () => text({ content: 'PURPLE' }),
            })
            // Teal
            box({
              width: 10,
              height: 3,
              bg: { r: 0, g: 128, b: 128, a: 255 },
              children: () => text({ content: 'TEAL' }),
            })
            // Navy
            box({
              width: 10,
              height: 3,
              bg: { r: 0, g: 0, b: 128, a: 255 },
              children: () => text({ content: 'NAVY' }),
            })
          },
        })

        text({ content: '' })

        // Section 4: Opacity
        text({ content: 'Opacity (over blue background):', fg: Colors.WHITE })
        box({
          bg: Colors.BLUE,
          padding: 1,
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: 12,
              height: 3,
              bg: Colors.WHITE,
              opacity: 1.0,
              children: () => text({ content: 'op:1.0', fg: Colors.BLACK }),
            })
            box({
              width: 12,
              height: 3,
              bg: Colors.WHITE,
              opacity: 0.75,
              children: () => text({ content: 'op:0.75', fg: Colors.BLACK }),
            })
            box({
              width: 12,
              height: 3,
              bg: Colors.WHITE,
              opacity: 0.5,
              children: () => text({ content: 'op:0.5', fg: Colors.BLACK }),
            })
            box({
              width: 12,
              height: 3,
              bg: Colors.WHITE,
              opacity: 0.25,
              children: () => text({ content: 'op:0.25', fg: Colors.BLACK }),
            })
          },
        })

        text({ content: '' })

        // Section 5: Color inheritance
        text({ content: 'Color Inheritance:', fg: Colors.WHITE })
        box({
          bg: Colors.BLUE,
          fg: Colors.YELLOW,
          padding: 1,
          border: 1,
          borderColor: Colors.YELLOW,
          children: () => {
            text({ content: 'Parent: bg=BLUE, fg=YELLOW' })
            box({
              padding: 1,
              border: 1,
              borderColor: Colors.GREEN,
              children: () => {
                text({ content: 'Child: inherits bg (BLUE), inherits fg (YELLOW)' })
                box({
                  bg: Colors.RED,
                  padding: 1,
                  children: () => {
                    text({ content: 'Grandchild: bg=RED, still inherits fg (YELLOW)' })
                  },
                })
              },
            })
          },
        })

        text({ content: '' })

        // Section 6: Gradient effect (simulated with boxes)
        text({ content: 'Gradient Effect (simulated):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          children: () => {
            for (let i = 0; i <= 10; i++) {
              const intensity = Math.round((i / 10) * 255)
              box({
                width: 6,
                height: 2,
                bg: { r: intensity, g: 0, b: 255 - intensity, a: 255 },
              })
            }
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
