/**
 * Feature Test: All Border Styles
 *
 * Tests EVERY border style:
 * - SINGLE, DOUBLE, ROUNDED, BOLD
 * - DASHED, DOTTED, ASCII, BLOCK
 * - DOUBLE_HORZ, DOUBLE_VERT
 * - Per-side borders (borderTop, borderRight, borderBottom, borderLeft)
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'ALL BORDER STYLES TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(78), fg: Colors.GRAY })

        // Row 1: SINGLE, DOUBLE, ROUNDED, BOLD
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: 18,
              height: 4,
              border: BorderStyle.SINGLE,
              borderColor: Colors.WHITE,
              children: () => text({ content: 'SINGLE', fg: Colors.WHITE }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.DOUBLE,
              borderColor: Colors.YELLOW,
              children: () => text({ content: 'DOUBLE', fg: Colors.YELLOW }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.ROUNDED,
              borderColor: Colors.CYAN,
              children: () => text({ content: 'ROUNDED', fg: Colors.CYAN }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.BOLD,
              borderColor: Colors.GREEN,
              children: () => text({ content: 'BOLD', fg: Colors.GREEN }),
            })
          },
        })

        // Row 2: DASHED, DOTTED, ASCII, BLOCK
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: 18,
              height: 4,
              border: BorderStyle.DASHED,
              borderColor: Colors.MAGENTA,
              children: () => text({ content: 'DASHED', fg: Colors.MAGENTA }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.DOTTED,
              borderColor: Colors.RED,
              children: () => text({ content: 'DOTTED', fg: Colors.RED }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.ASCII,
              borderColor: Colors.BLUE,
              children: () => text({ content: 'ASCII', fg: Colors.BLUE }),
            })
            box({
              width: 18,
              height: 4,
              border: BorderStyle.BLOCK,
              borderColor: Colors.GRAY,
              children: () => text({ content: 'BLOCK', fg: Colors.WHITE }),
            })
          },
        })

        // Row 3: DOUBLE_HORZ, DOUBLE_VERT
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: 25,
              height: 4,
              border: BorderStyle.DOUBLE_HORZ,
              borderColor: Colors.CYAN,
              children: () => text({ content: 'DOUBLE_HORZ', fg: Colors.CYAN }),
            })
            box({
              width: 25,
              height: 4,
              border: BorderStyle.DOUBLE_VERT,
              borderColor: Colors.YELLOW,
              children: () => text({ content: 'DOUBLE_VERT', fg: Colors.YELLOW }),
            })
          },
        })

        text({ content: '' })
        text({ content: 'Per-Side Borders:', fg: Colors.WHITE })

        // Row 4: Per-side borders
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            // Top only
            box({
              width: 15,
              height: 4,
              borderTop: BorderStyle.DOUBLE,
              borderColor: Colors.RED,
              children: () => text({ content: 'TOP only', fg: Colors.RED }),
            })
            // Right only
            box({
              width: 15,
              height: 4,
              borderRight: BorderStyle.DOUBLE,
              borderColor: Colors.GREEN,
              children: () => text({ content: 'RIGHT only', fg: Colors.GREEN }),
            })
            // Bottom only
            box({
              width: 15,
              height: 4,
              borderBottom: BorderStyle.DOUBLE,
              borderColor: Colors.BLUE,
              children: () => text({ content: 'BOTTOM only', fg: Colors.BLUE }),
            })
            // Left only
            box({
              width: 15,
              height: 4,
              borderLeft: BorderStyle.DOUBLE,
              borderColor: Colors.YELLOW,
              children: () => text({ content: 'LEFT only', fg: Colors.YELLOW }),
            })
          },
        })

        // Row 5: Mixed per-side
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            // Top + Bottom
            box({
              width: 18,
              height: 4,
              borderTop: BorderStyle.SINGLE,
              borderBottom: BorderStyle.SINGLE,
              borderColor: Colors.CYAN,
              children: () => text({ content: 'TOP+BOTTOM', fg: Colors.CYAN }),
            })
            // Left + Right
            box({
              width: 18,
              height: 4,
              borderLeft: BorderStyle.SINGLE,
              borderRight: BorderStyle.SINGLE,
              borderColor: Colors.MAGENTA,
              children: () => text({ content: 'LEFT+RIGHT', fg: Colors.MAGENTA }),
            })
            // All different styles
            box({
              width: 25,
              height: 4,
              borderTop: BorderStyle.DOUBLE,
              borderRight: BorderStyle.SINGLE,
              borderBottom: BorderStyle.BOLD,
              borderLeft: BorderStyle.DASHED,
              borderColor: Colors.WHITE,
              children: () => text({ content: 'ALL DIFFERENT', fg: Colors.WHITE }),
            })
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
