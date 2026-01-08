/**
 * Feature Test: Complete Flexbox
 *
 * Tests ALL flex properties:
 * - flexDirection: column, row, column-reverse, row-reverse
 * - justifyContent: flex-start, center, flex-end, space-between, space-around, space-evenly
 * - alignItems: stretch, flex-start, center, flex-end
 * - flexGrow, flexShrink
 * - gap
 * - flexWrap: nowrap, wrap
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

// Helper to create labeled colored boxes
function colorBox(label: string, color: typeof Colors.RED, w = 5, h = 2) {
  return () => box({ width: w, height: h, bg: color, children: () => text({ content: label, fg: Colors.BLACK }) })
}

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 90,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'COMPLETE FLEXBOX TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(88), fg: Colors.GRAY })

        // Section 1: Flex Direction
        text({ content: 'Flex Direction:', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // column (default)
            box({
              width: 20,
              height: 8,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              gap: 1,
              children: () => {
                text({ content: 'column', fg: Colors.CYAN })
                box({ width: 8, height: 1, bg: Colors.RED })
                box({ width: 8, height: 1, bg: Colors.GREEN })
                box({ width: 8, height: 1, bg: Colors.BLUE })
              },
            })
            // row
            box({
              width: 20,
              height: 8,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'row', fg: Colors.CYAN })
                box({ width: 3, height: 3, bg: Colors.RED })
                box({ width: 3, height: 3, bg: Colors.GREEN })
                box({ width: 3, height: 3, bg: Colors.BLUE })
              },
            })
            // column-reverse
            box({
              width: 20,
              height: 8,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'column-reverse',
              gap: 1,
              children: () => {
                text({ content: 'col-rev', fg: Colors.CYAN })
                box({ width: 8, height: 1, bg: Colors.RED, children: () => text({ content: '1' }) })
                box({ width: 8, height: 1, bg: Colors.GREEN, children: () => text({ content: '2' }) })
                box({ width: 8, height: 1, bg: Colors.BLUE, children: () => text({ content: '3' }) })
              },
            })
            // row-reverse
            box({
              width: 20,
              height: 8,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row-reverse',
              gap: 1,
              children: () => {
                text({ content: 'row-rev', fg: Colors.CYAN })
                box({ width: 3, height: 3, bg: Colors.RED, children: () => text({ content: '1' }) })
                box({ width: 3, height: 3, bg: Colors.GREEN, children: () => text({ content: '2' }) })
                box({ width: 3, height: 3, bg: Colors.BLUE, children: () => text({ content: '3' }) })
              },
            })
          },
        })

        text({ content: '' })

        // Section 2: Justify Content (row direction)
        text({ content: 'Justify Content (row, width=70):', fg: Colors.WHITE })

        const justifyOptions = [
          { name: 'flex-start', value: 'flex-start' as const },
          { name: 'center', value: 'center' as const },
          { name: 'flex-end', value: 'flex-end' as const },
          { name: 'space-between', value: 'space-between' as const },
          { name: 'space-around', value: 'space-around' as const },
          { name: 'space-evenly', value: 'space-evenly' as const },
        ]

        for (const opt of justifyOptions) {
          box({
            width: 70,
            height: 3,
            border: 1,
            borderColor: Colors.GRAY,
            flexDirection: 'row',
            justifyContent: opt.value,
            children: () => {
              text({ content: opt.name, fg: Colors.YELLOW, width: 14 })
              box({ width: 5, height: 1, bg: Colors.RED })
              box({ width: 5, height: 1, bg: Colors.GREEN })
              box({ width: 5, height: 1, bg: Colors.BLUE })
            },
          })
        }

        text({ content: '' })

        // Section 3: Align Items (row direction, fixed height container)
        text({ content: 'Align Items (row, height=6):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // stretch (default)
            box({
              width: 20,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: 1,
              children: () => {
                text({ content: 'stretch' })
                box({ width: 3, bg: Colors.RED })
                box({ width: 3, bg: Colors.GREEN })
              },
            })
            // flex-start
            box({
              width: 20,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 1,
              children: () => {
                text({ content: 'start' })
                box({ width: 3, height: 2, bg: Colors.RED })
                box({ width: 3, height: 2, bg: Colors.GREEN })
              },
            })
            // center
            box({
              width: 20,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 1,
              children: () => {
                text({ content: 'center' })
                box({ width: 3, height: 2, bg: Colors.RED })
                box({ width: 3, height: 2, bg: Colors.GREEN })
              },
            })
            // flex-end
            box({
              width: 20,
              height: 6,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 1,
              children: () => {
                text({ content: 'end' })
                box({ width: 3, height: 2, bg: Colors.RED })
                box({ width: 3, height: 2, bg: Colors.GREEN })
              },
            })
          },
        })

        text({ content: '' })

        // Section 4: Flex Grow
        text({ content: 'Flex Grow (row, grow values shown):', fg: Colors.WHITE })
        box({
          width: 70,
          height: 3,
          border: 1,
          borderColor: Colors.GRAY,
          flexDirection: 'row',
          children: () => {
            box({ grow: 1, bg: Colors.RED, children: () => text({ content: 'grow:1' }) })
            box({ grow: 2, bg: Colors.GREEN, children: () => text({ content: 'grow:2' }) })
            box({ grow: 1, bg: Colors.BLUE, children: () => text({ content: 'grow:1' }) })
          },
        })

        text({ content: '' })

        // Section 5: Flex Wrap
        text({ content: 'Flex Wrap (row, width=40, 6 items of width 10):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // nowrap (overflow)
            box({
              width: 40,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              flexWrap: 'nowrap',
              children: () => {
                text({ content: 'nowrap', fg: Colors.YELLOW, width: 8 })
                for (let i = 1; i <= 6; i++) {
                  box({ width: 8, height: 2, bg: i % 2 === 0 ? Colors.RED : Colors.BLUE })
                }
              },
            })
            // wrap
            box({
              width: 40,
              border: 1,
              borderColor: Colors.GRAY,
              flexDirection: 'row',
              flexWrap: 'wrap',
              children: () => {
                text({ content: 'wrap', fg: Colors.GREEN, width: 8 })
                for (let i = 1; i <= 6; i++) {
                  box({ width: 8, height: 2, bg: i % 2 === 0 ? Colors.RED : Colors.BLUE })
                }
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
