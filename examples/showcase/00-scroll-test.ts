/**
 * Scroll Test - Verify auto-scroll behavior
 *
 * This example has NO custom arrow handlers.
 * Framework scroll should "just work":
 * - Tab to focus the scrollable box
 * - Arrow keys should scroll content
 * - Page Up/Down should work
 * - Home/End should work
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, t, BorderStyle } from '../../index'

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
            text({ content: 'Scroll Test', fg: t.primary })
            text({ content: 'Press Tab to focus the list, then use Arrow keys to scroll', fg: t.textDim })
            text({ content: 'No custom handlers - framework scroll should "just work"', fg: t.textDim })
          },
        })

        // Scrollable container - auto-focusable because overflow:'scroll'
        box({
          height: 15,
          border: BorderStyle.ROUNDED,
          borderColor: t.accent,
          overflow: 'scroll',  // This makes it focusable automatically now!
          padding: 1,
          children: () => {
            // Create 40 lines of content - more than fits in container
            for (let i = 1; i <= 40; i++) {
              text({
                content: `Line ${i.toString().padStart(2, '0')}: This is scrollable content that should work with arrow keys`,
                fg: i % 5 === 0 ? t.accent : t.text,
              })
            }
          },
        })

        // Footer with instructions
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.border,
          padding: 1,
          flexDirection: 'row',
          gap: 3,
          children: () => {
            text({ content: '[Tab] Focus list', fg: t.textDim })
            text({ content: '[↑/↓] Scroll', fg: t.textDim })
            text({ content: '[PgUp/PgDn] Page scroll', fg: t.textDim })
            text({ content: '[Home/End] Jump', fg: t.textDim })
            text({ content: '[q] Quit', fg: t.textDim })
          },
        })
      },
    })
  })

  // Only quit handler - no arrow handlers!
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
    process.exit(0)
  })
}

main().catch(console.error)
