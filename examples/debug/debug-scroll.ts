/**
 * Debug: Scroll & Focus Navigation - BATTLE TEST
 *
 * Tests:
 * - Tab/Shift+Tab cycles through focusable elements
 * - Arrow keys scroll focused scrollable container
 * - Mouse wheel scrolls hovered element (fallback to focused)
 * - Auto-scroll detection (content > container)
 * - NESTED scrollables (scroll inside scroll)
 * - Mixed focusable/non-focusable
 * - Different overflow modes
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const items = Array.from({ length: 15 }, (_, i) => `Item ${i + 1}`)
  const shortItems = Array.from({ length: 5 }, (_, i) => `Short ${i + 1}`)

  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      border: BorderStyle.SINGLE,
      borderColor: Colors.CYAN,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'SCROLL & FOCUS BATTLE TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(76), fg: Colors.GRAY })
        text({ content: 'Tab = next focus | Shift+Tab = prev | Arrows = scroll | Q = quit', fg: Colors.GRAY })
        text({ content: '' })

        // Row 1: Two simple scrollables
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // Box 1: Simple scrollable
            box({
              width: 25,
              height: 8,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GREEN,
              overflow: 'scroll',
              focusable: true,
              tabIndex: 1,
              children: () => {
                text({ content: '[1] Simple scroll', fg: Colors.GREEN })
                for (const item of items) {
                  text({ content: item, fg: Colors.WHITE })
                }
              },
            })

            // Box 2: Auto overflow (should detect need for scroll)
            box({
              width: 25,
              height: 8,
              border: BorderStyle.SINGLE,
              borderColor: Colors.YELLOW,
              overflow: 'auto',
              focusable: true,
              tabIndex: 2,
              children: () => {
                text({ content: '[2] Auto overflow', fg: Colors.YELLOW })
                for (const item of items) {
                  text({ content: item, fg: Colors.WHITE })
                }
              },
            })

            // Box 3: No overflow (content fits)
            box({
              width: 25,
              height: 8,
              border: BorderStyle.SINGLE,
              borderColor: Colors.MAGENTA,
              overflow: 'auto',
              focusable: true,
              tabIndex: 3,
              children: () => {
                text({ content: '[3] Fits (no scroll)', fg: Colors.MAGENTA })
                for (const item of shortItems) {
                  text({ content: item, fg: Colors.WHITE })
                }
              },
            })
          },
        })

        text({ content: '' })

        // Row 2: NESTED scrollables - the real test!
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // Box 4: Outer scrollable with inner scrollable
            box({
              width: 38,
              height: 12,
              border: BorderStyle.DOUBLE,
              borderColor: Colors.RED,
              overflow: 'scroll',
              focusable: true,
              tabIndex: 4,
              children: () => {
                text({ content: '[4] OUTER scroll (focus me)', fg: Colors.RED })
                text({ content: '─'.repeat(34), fg: Colors.GRAY })

                // Inner scrollable (nested!)
                box({
                  width: 32,
                  height: 5,
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.BLUE,
                  overflow: 'scroll',
                  focusable: true,
                  tabIndex: 5,
                  children: () => {
                    text({ content: '[5] INNER scroll', fg: Colors.BLUE })
                    for (const item of items) {
                      text({ content: `  Nested: ${item}`, fg: Colors.CYAN })
                    }
                  },
                })

                text({ content: '' })
                text({ content: 'More outer content...', fg: Colors.WHITE })
                text({ content: 'Keep scrolling outer...', fg: Colors.WHITE })
                text({ content: 'Even more content...', fg: Colors.WHITE })
                text({ content: 'Almost there...', fg: Colors.WHITE })
                text({ content: 'Bottom of outer!', fg: Colors.RED })
              },
            })

            // Box 5: Deep nesting test
            box({
              width: 38,
              height: 12,
              border: BorderStyle.SINGLE,
              borderColor: Colors.WHITE,
              overflow: 'scroll',
              focusable: true,
              tabIndex: 6,
              children: () => {
                text({ content: '[6] Deep nesting', fg: Colors.WHITE })

                // Level 1
                box({
                  padding: 1,
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.GRAY,
                  children: () => {
                    text({ content: 'Level 1', fg: Colors.GRAY })

                    // Level 2
                    box({
                      padding: 1,
                      border: BorderStyle.SINGLE,
                      borderColor: Colors.YELLOW,
                      children: () => {
                        text({ content: 'Level 2', fg: Colors.YELLOW })

                        // Level 3 - scrollable!
                        box({
                          height: 4,
                          border: BorderStyle.SINGLE,
                          borderColor: Colors.GREEN,
                          overflow: 'scroll',
                          focusable: true,
                          tabIndex: 7,
                          children: () => {
                            text({ content: '[7] Level 3 scroll', fg: Colors.GREEN })
                            for (let i = 0; i < 10; i++) {
                              text({ content: `Deep item ${i}`, fg: Colors.WHITE })
                            }
                          },
                        })
                      },
                    })
                  },
                })

                text({ content: 'After deep nest', fg: Colors.WHITE })
                text({ content: 'More content...', fg: Colors.WHITE })
              },
            })
          },
        })

        text({ content: '' })

        // Status display
        box({
          border: BorderStyle.SINGLE,
          borderColor: Colors.CYAN,
          padding: 1,
          children: () => {
            text({
              content: derived(() => `Focused index: ${keyboard.focusedIndex}`),
              fg: Colors.CYAN,
            })
            text({ content: 'Boxes 1-7 are focusable. Try Tab, arrows, mouse wheel!', fg: Colors.GRAY })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })  // Mouse disabled to test keyboard navigation

  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
