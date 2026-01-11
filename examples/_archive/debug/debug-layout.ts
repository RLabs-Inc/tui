/**
 * Debug: Layout overlap issue
 * Test text + boxes in flex row
 */

import { mount, box, text, keyboard, Colors, BorderStyle } from './index'

// Hook into TITAN to see what's happening
import { computeLayoutTitan } from './src/pipeline/layout/titan-engine'
import { getAllocatedIndices } from './src/engine/registry'
import * as core from './src/engine/arrays/core'
import * as textArrays from './src/engine/arrays/text'
import * as dimensions from './src/engine/arrays/dimensions'
import { unwrap } from '@rlabs-inc/signals'
import { ComponentType } from './src/types'

async function main() {
  const cleanup = await mount(() => {
    // Simple case: text + boxes in row
    box({
      width: 40,
      height: 5,
      border: BorderStyle.SINGLE,
      borderColor: Colors.GRAY,
      flexDirection: 'row',
      gap: 1,
      children: () => {
        text({ content: 'Label' })  // Should take ~5 chars
        box({ width: 5, height: 2, bg: Colors.RED })
        box({ width: 5, height: 2, bg: Colors.GREEN })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Debug: dump layout info
  setTimeout(() => {
    const indices = getAllocatedIndices()
    console.log('\n=== LAYOUT DEBUG ===')
    console.log(`Total components: ${indices.size}`)

    for (const i of indices) {
      const type = core.componentType[i]
      const typeName = type === ComponentType.TEXT ? 'TEXT' : 'BOX'
      const content = type === ComponentType.TEXT ? unwrap(textArrays.textContent[i]) : null
      const w = unwrap(dimensions.width[i])
      const h = unwrap(dimensions.height[i])

      console.log(`[${i}] ${typeName} content="${content}" explicit w=${w} h=${h}`)
    }

    // Run layout manually to see results
    const layout = computeLayoutTitan(80, 24, indices, false)
    console.log('\n=== COMPUTED LAYOUT ===')
    for (const i of indices) {
      const type = core.componentType[i]
      const typeName = type === ComponentType.TEXT ? 'TEXT' : 'BOX'
      const content = type === ComponentType.TEXT ? unwrap(textArrays.textContent[i]) : null
      console.log(`[${i}] ${typeName} "${content}" → x=${layout.x[i]} y=${layout.y[i]} w=${layout.width[i]} h=${layout.height[i]}`)
    }
  }, 100)

  keyboard.onKey((event) => {
    if (event.key === 'q' || event.key === 'Q') {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
