/**
 * Debug: Level 2 border bug - minimal reproduction
 *
 * Isolates the nested scroll border issue
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'
import { layoutDerived } from '../../src/pipeline/layout'
import { getAllocatedIndices, getId } from '../../src/engine/registry'

async function main() {
  const cleanup = await mount(() => {
    // Outer scrollable (like Box 6 in debug-scroll)
    box({
      id: 'outer',
      width: 40,
      height: 12,
      border: BorderStyle.SINGLE,
      borderColor: Colors.WHITE,
      overflow: 'scroll',
      children: () => {
        text({ content: 'Outer (scroll h=12)', fg: Colors.WHITE })

        // Level 1 - gray border
        box({
          id: 'level1',
          padding: 1,
          border: BorderStyle.SINGLE,
          borderColor: Colors.GRAY,
          children: () => {
            text({ content: 'Level 1', fg: Colors.GRAY })

            // Level 2 - yellow border (BUG: bottom border missing!)
            box({
              id: 'level2',
              padding: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.YELLOW,
              children: () => {
                text({ content: 'Level 2', fg: Colors.YELLOW })

                // Level 3 - green, scrollable, explicit height
                box({
                  id: 'level3',
                  height: 4,
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.GREEN,
                  overflow: 'scroll',
                  children: () => {
                    text({ content: 'L3 (h=4)', fg: Colors.GREEN })
                    for (let i = 0; i < 5; i++) {
                      text({ content: `  Item ${i}`, fg: Colors.WHITE })
                    }
                  },
                })
              },
            })
          },
        })

        text({ content: 'After nest', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Dump layout after mount
  setTimeout(() => {
    const layout = layoutDerived.value
    const indices = getAllocatedIndices()

    console.log('\n\n=== LAYOUT DEBUG ===\n')

    for (const i of indices) {
      const id = getId(i)
      if (['outer', 'level1', 'level2', 'level3'].includes(id || '')) {
        console.log(`${id} (idx ${i}): pos=(${layout.x[i]}, ${layout.y[i]}) size=${layout.width[i]}x${layout.height[i]}`)
      }
    }

    console.log('\n=== EXPECTED HEIGHTS ===')
    console.log('level3: 4 (explicit)')
    console.log('level2: 1(bT) + 1(pT) + 1(text) + 4(L3) + 1(pB) + 1(bB) = 9')
    console.log('level1: 1(bT) + 1(pT) + 1(text) + 9(L2) + 1(pB) + 1(bB) = 14')
    console.log('outer content: 12 - 2(borders) = 10')
    console.log('\nIf level2 height < 9, that explains missing bottom border!')
    console.log('\nPress Q to quit')
  }, 100)

  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
