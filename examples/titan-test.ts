/**
 * TITAN ENGINE - Test Suite
 *
 * Tests all layout features:
 * - Basic block layout
 * - Flexbox grow/shrink
 * - Flex wrap
 * - Justify content
 * - Align items
 * - Absolute positioning
 */

import { signal, derived, effect } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { mount } from '../src/api/mount'
import { layoutDerived } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'
import { Colors } from '../src/types/color'

async function main() {
  // Track which test we're showing
  const testIndex = signal(0)
  const tests = [
    'Basic Block',
    'Flex Row',
    'Flex Grow',
    'Flex Wrap',
    'Justify Content',
    'Align Items',
    'Absolute Position'
  ]

  const cleanup = await mount(() => {
    // Main container
    box({
      width: 60,
      height: 20,
      border: 1,
      borderColor: Colors.CYAN,
      bg: { r: 20, g: 20, b: 30, a: 255 },
      children: () => {
        // Title
        text({
          content: derived(() => `TITAN ENGINE TEST: ${tests[testIndex.value]}`),
          fg: Colors.YELLOW
        })

        // Test container
        box({
          width: 56,
          height: 14,
          border: 1,
          borderColor: Colors.WHITE,
          flexDirection: 'column',
          children: () => {
            const idx = testIndex.value

            if (idx === 0) {
              // Basic Block (vertical stacking)
              text({ content: 'Item 1', fg: Colors.GREEN })
              text({ content: 'Item 2', fg: Colors.GREEN })
              text({ content: 'Item 3', fg: Colors.GREEN })
            }

            else if (idx === 1) {
              // Flex Row
              box({
                flexDirection: 'row',
                children: () => {
                  box({ width: 10, height: 3, bg: Colors.RED, children: () => text({ content: 'A' }) })
                  box({ width: 10, height: 3, bg: Colors.GREEN, children: () => text({ content: 'B' }) })
                  box({ width: 10, height: 3, bg: Colors.BLUE, children: () => text({ content: 'C' }) })
                }
              })
            }

            else if (idx === 2) {
              // Flex Grow
              box({
                flexDirection: 'row',
                children: () => {
                  box({ grow: 1, height: 3, bg: Colors.RED, children: () => text({ content: 'grow:1' }) })
                  box({ grow: 2, height: 3, bg: Colors.GREEN, children: () => text({ content: 'grow:2' }) })
                  box({ grow: 1, height: 3, bg: Colors.BLUE, children: () => text({ content: 'grow:1' }) })
                }
              })
            }

            else if (idx === 3) {
              // Flex Wrap
              box({
                flexDirection: 'row',
                flexWrap: 'wrap',
                children: () => {
                  for (let i = 0; i < 8; i++) {
                    box({
                      width: 12,
                      height: 2,
                      bg: i % 2 === 0 ? Colors.MAGENTA : Colors.CYAN,
                      children: () => text({ content: `Item ${i + 1}` })
                    })
                  }
                }
              })
            }

            else if (idx === 4) {
              // Justify Content
              const justifyModes = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] as const
              for (const mode of justifyModes) {
                box({
                  flexDirection: 'row',
                  justifyContent: mode,
                  height: 2,
                  border: 1,
                  children: () => {
                    text({ content: mode.padEnd(14), width: 14, fg: Colors.GRAY })
                    box({ width: 4, height: 1, bg: Colors.RED })
                    box({ width: 4, height: 1, bg: Colors.GREEN })
                    box({ width: 4, height: 1, bg: Colors.BLUE })
                  }
                })
              }
            }

            else if (idx === 5) {
              // Align Items
              box({
                flexDirection: 'row',
                height: 8,
                border: 1,
                alignItems: 'center',
                gap: 2,
                children: () => {
                  box({ width: 8, height: 2, bg: Colors.RED, children: () => text({ content: 'H:2' }) })
                  box({ width: 8, height: 4, bg: Colors.GREEN, children: () => text({ content: 'H:4' }) })
                  box({ width: 8, height: 6, bg: Colors.BLUE, children: () => text({ content: 'H:6' }) })
                }
              })
              text({ content: 'alignItems: center', fg: Colors.GRAY })
            }

            else if (idx === 6) {
              // Absolute Positioning
              box({
                height: 10,
                bg: { r: 40, g: 40, b: 50, a: 255 },
                children: () => {
                  text({ content: 'Container (relative)', fg: Colors.GRAY })

                  // Absolute positioned box
                  box({
                    width: 15,
                    height: 3,
                    bg: Colors.RED,
                    // position: 'absolute', // TODO: need to add this to box props
                    children: () => text({ content: 'TOP-LEFT' })
                  })
                }
              })
            }
          }
        })

        // Instructions
        text({
          content: '[←/→] Switch test  [Q] Quit',
          fg: Colors.GRAY
        })
      }
    })
  })

  // Keyboard navigation
  keyboard.setExitOnCtrlC(true); // cleanup)

  process.stdin.on('data', (data) => {
    const key = data.toString()
    if (key === '\x1b[C' || key === 'l') { // Right arrow
      testIndex.value = (testIndex.value + 1) % tests.length
    } else if (key === '\x1b[D' || key === 'h') { // Left arrow
      testIndex.value = (testIndex.value - 1 + tests.length) % tests.length
    }
  })
}

main().catch(console.error)
