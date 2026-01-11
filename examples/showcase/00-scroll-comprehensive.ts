/**
 * Comprehensive Scroll Test
 *
 * Tests multiple scroll scenarios:
 * 1. Simple scroll area (framework auto-scroll)
 * 2. Nested scroll areas (inner and outer)
 * 3. Side-by-side scroll areas
 * 4. Deep nesting with scroll
 *
 * Tab to cycle focus between scrollable areas.
 * Arrow keys scroll the focused area.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, t, BorderStyle } from '../../index'

// Generate lines of content
function generateLines(prefix: string, count: number): void {
  for (let i = 1; i <= count; i++) {
    text({
      content: `${prefix} Line ${i.toString().padStart(2, '0')}`,
      fg: i % 5 === 0 ? t.accent : t.text,
    })
  }
}

async function main() {
  const cleanup = await mount(() => {
    // Root container
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      padding: 1,
      gap: 1,
      bg: t.bg,
      children: () => {
        // Header
        box({
          border: BorderStyle.DOUBLE,
          borderColor: t.primary,
          padding: 1,
          children: () => {
            text({ content: 'Comprehensive Scroll Test', fg: t.primary })
            text({ content: '[Tab] Cycle focus | [↑↓] Scroll | [q] Quit', fg: t.textDim })
          },
        })

        // Main content - row of scroll areas
        box({
          flexDirection: 'row',
          gap: 1,
          grow: 1,
          children: () => {
            // ============================================================
            // LEFT: Simple scroll (30 lines in 10-line container)
            // ============================================================
            box({
              width: '30%',
              height: '100%',  // Fill parent height
              flexDirection: 'column',
              gap: 1,
              children: () => {
                text({ content: '1. Simple Scroll', fg: t.secondary })
                box({
                  height: 12,
                  border: BorderStyle.ROUNDED,
                  borderColor: t.secondary,
                  overflow: 'scroll',
                  padding: 1,
                  tabIndex: 1,
                  children: () => {
                    generateLines('Simple', 30)
                  },
                })
              },
            })

            // ============================================================
            // MIDDLE: Nested scroll (outer + inner scrollable)
            // ============================================================
            box({
              width: '40%',
              height: '100%',  // Fill parent height
              flexDirection: 'column',
              gap: 1,
              children: () => {
                text({ content: '2. Nested Scroll', fg: t.warning })
                // Outer scrollable
                box({
                  height: 15,
                  border: BorderStyle.ROUNDED,
                  borderColor: t.warning,
                  overflow: 'scroll',
                  // padding: 1,
                  tabIndex: 2,
                  children: () => {
                    text({ content: '-- Outer scroll area --', fg: t.warning })
                    generateLines('Outer', 10)

                    // Inner scrollable (nested)
                    box({
                      height: 6,
                      border: BorderStyle.SINGLE,
                      borderColor: t.info,
                      overflow: 'scroll',
                      padding: 1,
                      tabIndex: 3,
                      children: () => {
                        text({ content: '== Inner scroll ==', fg: t.info })
                        generateLines('Inner', 20)
                      },
                    })

                    generateLines('More Outer', 15)
                  },
                })
              },
            })

            // ============================================================
            // RIGHT: Deep nesting
            // ============================================================
            box({
              width: '30%',
              height: '100%',  // Fill parent height
              flexDirection: 'column',
              gap: 1,
              children: () => {
                text({ content: '3. Deep Nesting', fg: t.success })
                box({
                  grow: 1,
                  border: BorderStyle.ROUNDED,
                  borderColor: t.success,
                  overflow: 'scroll',
                  padding: 1,
                  tabIndex: 4,
                  children: () => {
                    text({ content: 'Level 1', fg: t.success })

                    box({
                      border: BorderStyle.SINGLE,
                      borderColor: t.border,
                      padding: 1,
                      children: () => {
                        text({ content: 'Level 2 (not scrollable)', fg: t.textDim })

                        box({
                          height: 5,
                          border: BorderStyle.SINGLE,
                          borderColor: t.info,
                          overflow: 'scroll',
                          padding: 1,
                          tabIndex: 5,
                          children: () => {
                            text({ content: 'Level 3 (scroll)', fg: t.info })
                            generateLines('Deep', 15)
                          },
                        })
                      },
                    })

                    generateLines('Back to L1', 20)
                  },
                })
              },
            })
          },
        })

        // Status bar
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.border,
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: 'Scrollable areas: 5 total (3 outer + 2 nested)', fg: t.textDim })
            text({ content: 'Framework auto-scroll - no custom handlers', fg: t.textDim })
          },
        })
      },
    })
  })

  // Only quit handler
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
    process.exit(0)
  })
}

main().catch(console.error)
