/**
 * Showcase: Nested Layouts
 *
 * Demonstrates the TITAN layout engine's flexbox mastery with deeply
 * nested component hierarchies. This example shows how to build complex
 * UI structures using multiple levels of flex containers with different
 * directions, alignments, and wrapping behaviors.
 *
 * Features demonstrated:
 * - 4-5 levels of nesting depth
 * - Mixed row/column directions at different levels
 * - justify-content options (flex-start, center, flex-end, space-between)
 * - align-items options (stretch, flex-start, center, flex-end)
 * - flex-wrap for responsive card layouts
 * - flex-grow for dynamic sizing
 * - Gap and padding for spacing
 * - Theme colors for visual hierarchy
 *
 * Press 'q' to exit
 */

import { box, text, mount, keyboard, t, Colors } from '../../index'

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/** Card component for demonstrating wrap - Level 5 */
function card(title: string, color: typeof Colors.RED) {
  box({
    width: 10,
    height: 3,
    border: 1,
    borderColor: color,
    alignItems: 'center',
    justifyContent: 'center',
    children: () => {
      text({ content: title, fg: color })
    },
  })
}

/** Button component - Level 5 */
function button(label: string, variant: 'primary' | 'secondary' | 'success' = 'primary') {
  const colors = {
    primary: t.primary,
    secondary: t.secondary,
    success: t.success,
  }
  box({
    paddingLeft: 1,
    paddingRight: 1,
    height: 3,
    border: 1,
    borderColor: colors[variant],
    alignItems: 'center',
    justifyContent: 'center',
    children: () => {
      text({ content: label, fg: colors[variant] })
    },
  })
}

/** Menu item - Level 4 */
function menuItem(label: string, active = false) {
  box({
    paddingLeft: 1,
    height: 1,
    bg: active ? t.primary : undefined,
    children: () => {
      text({
        content: active ? `> ${label}` : `  ${label}`,
        fg: active ? t.textBright : t.textMuted,
      })
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // =========================================================================
    // LEVEL 1: Root Container (column) - White/Gray border
    // =========================================================================
    box({
      width: 80,
      height: 36,
      border: 1,
      borderColor: t.border,
      flexDirection: 'column',
      padding: 1,
      gap: 0,
      children: () => {
        // Title
        text({ content: 'NESTED LAYOUTS - TITAN Flexbox Demo', fg: t.primary })
        text({
          content: 'Borders show nesting depth: L1=white L2=blue/pink L3=cyan/info L4=yellow/green',
          fg: t.textMuted,
        })

        // =====================================================================
        // LEVEL 2: Header (row, space-between) - Blue border
        // =====================================================================
        box({
          height: 3,
          border: 1,
          borderColor: t.primary,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: 1,
          paddingRight: 1,
          children: () => {
            text({ content: 'L2: Header (row, space-between)', fg: t.primary })
            // L3: Nav items grouped
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'Home', fg: t.accent })
                text({ content: 'Docs', fg: t.textMuted })
                text({ content: 'API', fg: t.textMuted })
              },
            })
          },
        })

        // =====================================================================
        // LEVEL 2: Body (row) - Magenta/Pink border
        // =====================================================================
        box({
          grow: 1,
          border: 1,
          borderColor: t.secondary,
          flexDirection: 'row',
          gap: 1,
          padding: 1,
          children: () => {
            // =================================================================
            // LEVEL 3: Sidebar (column, fixed width) - Cyan border
            // =================================================================
            box({
              width: 18,
              shrink: 0,
              border: 1,
              borderColor: t.tertiary,
              flexDirection: 'column',
              padding: 1,
              children: () => {
                text({ content: 'L3: Sidebar', fg: t.tertiary })
                text({ content: '(column)', fg: t.textDim })
                // L4: Menu container
                box({
                  flexDirection: 'column',
                  children: () => {
                    menuItem('Dashboard', true)
                    menuItem('Components')
                    menuItem('Layout')
                    menuItem('Themes')
                  },
                })
              },
            })

            // =================================================================
            // LEVEL 3: Main Content (column, grow) - Info/Cyan border
            // =================================================================
            box({
              grow: 1,
              border: 1,
              borderColor: t.info,
              flexDirection: 'column',
              padding: 1,
              gap: 1,
              children: () => {
                text({ content: 'L3: Main (column, grow=1)', fg: t.info })

                // =============================================================
                // LEVEL 4: Cards Area (row, wrap) - Yellow border
                // =============================================================
                box({
                  grow: 1,
                  border: 1,
                  borderColor: t.warning,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  padding: 1,
                  gap: 1,
                  alignItems: 'flex-start',
                  children: () => {
                    text({ content: 'L4: (row, wrap)', fg: t.warning, width: 48 })
                    // L5: Individual cards that will wrap
                    card('L5:A', Colors.RED)
                    card('L5:B', Colors.GREEN)
                    card('L5:C', Colors.BLUE)
                    card('L5:D', Colors.MAGENTA)
                  },
                })

                // =============================================================
                // LEVEL 4: Actions (row, flex-end) - Green border
                // =============================================================
                box({
                  height: 5,
                  border: 1,
                  borderColor: t.success,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 1,
                  gap: 1,
                  children: () => {
                    text({ content: 'L4: (justify=space-between)', fg: t.success })
                    // L5: Buttons grouped
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        button('No', 'secondary')
                        button('Yes', 'primary')
                      },
                    })
                  },
                })
              },
            })
          },
        })

        // =====================================================================
        // LEVEL 2: Footer (row, space-between) - Muted border
        // =====================================================================
        box({
          height: 3,
          border: 1,
          borderColor: t.textMuted,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: 1,
          paddingRight: 1,
          children: () => {
            text({ content: 'L2: Footer', fg: t.textDim })
            text({ content: 'Press Q to quit', fg: t.textDim })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Exit handlers
  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
