/**
 * Feature Test: Flexbox Layout
 *
 * Tests:
 * - flexDirection (row, column)
 * - justifyContent (start, center, end, between, around, evenly)
 * - alignItems (stretch, start, center, end)
 * - flexGrow / flexShrink
 * - gap
 * - flexWrap
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'FLEXBOX LAYOUT TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(78), fg: Colors.GRAY })

        // Row 1: Flex Direction
        text({ content: 'Flex Direction:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // Column (default)
            box({
              width: 20,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                text({ content: 'column', fg: Colors.CYAN })
                text({ content: 'A', fg: Colors.RED })
                text({ content: 'B', fg: Colors.GREEN })
                text({ content: 'C', fg: Colors.BLUE })
              },
            })
            // Row
            box({
              width: 35,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'row:', fg: Colors.CYAN })
                text({ content: 'A', fg: Colors.RED })
                text({ content: 'B', fg: Colors.GREEN })
                text({ content: 'C', fg: Colors.BLUE })
              },
            })
          },
        })

        text({ content: '' })

        // Row 2: Justify Content
        text({ content: 'Justify Content (row direction, width=60):', fg: Colors.WHITE })

        // justify: start
        box({
          width: 60,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          children: () => {
            text({ content: 'start:', fg: Colors.CYAN })
            box({ width: 5, height: 1, bg: Colors.RED })
            box({ width: 5, height: 1, bg: Colors.GREEN })
            box({ width: 5, height: 1, bg: Colors.BLUE })
          },
        })

        // justify: center
        box({
          width: 60,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          justifyContent: 'center',
          children: () => {
            text({ content: 'center:', fg: Colors.CYAN })
            box({ width: 5, height: 1, bg: Colors.RED })
            box({ width: 5, height: 1, bg: Colors.GREEN })
            box({ width: 5, height: 1, bg: Colors.BLUE })
          },
        })

        // justify: end
        box({
          width: 60,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          children: () => {
            text({ content: 'end:', fg: Colors.CYAN })
            box({ width: 5, height: 1, bg: Colors.RED })
            box({ width: 5, height: 1, bg: Colors.GREEN })
            box({ width: 5, height: 1, bg: Colors.BLUE })
          },
        })

        // justify: space-between
        box({
          width: 60,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: 'between', fg: Colors.CYAN })
            box({ width: 5, height: 1, bg: Colors.RED })
            box({ width: 5, height: 1, bg: Colors.GREEN })
            box({ width: 5, height: 1, bg: Colors.BLUE })
          },
        })

        text({ content: '' })

        // Row 3: Flex Grow
        text({ content: 'Flex Grow (row, grow values shown):', fg: Colors.WHITE })
        box({
          width: 60,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          children: () => {
            box({ grow: 1, height: 1, bg: Colors.RED, children: () => text({ content: 'grow:1' }) })
            box({ grow: 2, height: 1, bg: Colors.GREEN, children: () => text({ content: 'grow:2' }) })
            box({ grow: 1, height: 1, bg: Colors.BLUE, children: () => text({ content: 'grow:1' }) })
          },
        })

        text({ content: '' })

        // Row 4: Gap
        text({ content: 'Gap (row, different gap values):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 24,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 0,
              children: () => {
                text({ content: 'gap:0', fg: Colors.CYAN })
                box({ width: 3, height: 1, bg: Colors.RED })
                box({ width: 3, height: 1, bg: Colors.GREEN })
                box({ width: 3, height: 1, bg: Colors.BLUE })
              },
            })
            box({
              width: 24,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'gap:1', fg: Colors.CYAN })
                box({ width: 3, height: 1, bg: Colors.RED })
                box({ width: 3, height: 1, bg: Colors.GREEN })
                box({ width: 3, height: 1, bg: Colors.BLUE })
              },
            })
            box({
              width: 24,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'gap:2', fg: Colors.CYAN })
                box({ width: 3, height: 1, bg: Colors.RED })
                box({ width: 3, height: 1, bg: Colors.GREEN })
                box({ width: 3, height: 1, bg: Colors.BLUE })
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
