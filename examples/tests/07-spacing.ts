/**
 * Feature Test: Spacing (Padding, Margin, Gap)
 *
 * Tests:
 * - Padding: all sides, per-side
 * - Gap between children
 * - Padding + border interaction
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'SPACING TEST (Padding & Gap)', fg: Colors.CYAN })
        text({ content: '─'.repeat(78), fg: Colors.GRAY })

        // Section 1: Padding all sides
        text({ content: 'Padding All Sides:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 0,
              bg: Colors.BLUE,
              children: () => text({ content: 'pad:0' }),
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 1,
              bg: Colors.BLUE,
              children: () => text({ content: 'pad:1' }),
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 2,
              bg: Colors.BLUE,
              children: () => text({ content: 'pad:2' }),
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              padding: 3,
              bg: Colors.BLUE,
              children: () => text({ content: 'pad:3' }),
            })
          },
        })

        text({ content: '' })

        // Section 2: Per-side padding
        text({ content: 'Per-Side Padding:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 16,
              border: 1,
              borderColor: Colors.GRAY,
              paddingTop: 2,
              bg: Colors.GREEN,
              children: () => text({ content: 'padTop:2' }),
            })
            box({
              width: 16,
              border: 1,
              borderColor: Colors.GRAY,
              paddingRight: 4,
              bg: Colors.GREEN,
              children: () => text({ content: 'padR:4' }),
            })
            box({
              width: 16,
              border: 1,
              borderColor: Colors.GRAY,
              paddingBottom: 2,
              bg: Colors.GREEN,
              children: () => text({ content: 'padBot:2' }),
            })
            box({
              width: 16,
              border: 1,
              borderColor: Colors.GRAY,
              paddingLeft: 4,
              bg: Colors.GREEN,
              children: () => text({ content: 'padL:4' }),
            })
          },
        })

        text({ content: '' })

        // Section 3: Mixed per-side padding
        text({ content: 'Mixed Per-Side Padding:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 22,
              border: 1,
              borderColor: Colors.GRAY,
              paddingTop: 1,
              paddingBottom: 3,
              bg: Colors.MAGENTA,
              children: () => text({ content: 'T:1 B:3' }),
            })
            box({
              width: 22,
              border: 1,
              borderColor: Colors.GRAY,
              paddingLeft: 2,
              paddingRight: 6,
              bg: Colors.MAGENTA,
              children: () => text({ content: 'L:2 R:6' }),
            })
            box({
              width: 22,
              border: 1,
              borderColor: Colors.GRAY,
              paddingTop: 1,
              paddingRight: 2,
              paddingBottom: 1,
              paddingLeft: 4,
              bg: Colors.MAGENTA,
              children: () => text({ content: 'T:1 R:2 B:1 L:4' }),
            })
          },
        })

        text({ content: '' })

        // Section 4: Gap between children
        text({ content: 'Gap Between Children (column):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 18,
              border: 1,
              borderColor: Colors.GRAY,
              gap: 0,
              children: () => {
                text({ content: 'gap:0', fg: Colors.CYAN })
                box({ height: 1, bg: Colors.RED })
                box({ height: 1, bg: Colors.GREEN })
                box({ height: 1, bg: Colors.BLUE })
              },
            })
            box({
              width: 18,
              border: 1,
              borderColor: Colors.GRAY,
              gap: 1,
              children: () => {
                text({ content: 'gap:1', fg: Colors.CYAN })
                box({ height: 1, bg: Colors.RED })
                box({ height: 1, bg: Colors.GREEN })
                box({ height: 1, bg: Colors.BLUE })
              },
            })
            box({
              width: 18,
              border: 1,
              borderColor: Colors.GRAY,
              gap: 2,
              children: () => {
                text({ content: 'gap:2', fg: Colors.CYAN })
                box({ height: 1, bg: Colors.RED })
                box({ height: 1, bg: Colors.GREEN })
                box({ height: 1, bg: Colors.BLUE })
              },
            })
          },
        })

        text({ content: '' })

        // Section 5: Gap in row direction
        text({ content: 'Gap Between Children (row):', fg: Colors.WHITE })
        box({
          gap: 2,
          children: () => {
            box({
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 0,
              children: () => {
                text({ content: 'gap:0', fg: Colors.CYAN })
                box({ width: 5, height: 2, bg: Colors.RED })
                box({ width: 5, height: 2, bg: Colors.GREEN })
                box({ width: 5, height: 2, bg: Colors.BLUE })
              },
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'gap:2', fg: Colors.CYAN })
                box({ width: 5, height: 2, bg: Colors.RED })
                box({ width: 5, height: 2, bg: Colors.GREEN })
                box({ width: 5, height: 2, bg: Colors.BLUE })
              },
            })
            box({
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 4,
              children: () => {
                text({ content: 'gap:4', fg: Colors.CYAN })
                box({ width: 5, height: 2, bg: Colors.RED })
                box({ width: 5, height: 2, bg: Colors.GREEN })
                box({ width: 5, height: 2, bg: Colors.BLUE })
              },
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
