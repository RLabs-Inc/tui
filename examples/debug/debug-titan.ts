import { renderMode } from './src/pipeline/layout'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'
import { unwrap } from '@rlabs-inc/signals'
import { ComponentType } from './src/types'
import { getAllocatedIndices } from './src/engine/registry'
import { stringWidth } from './src/utils/text'
import * as core from './src/engine/arrays/core'
import * as textArrays from './src/engine/arrays/text'
import * as dimensions from './src/engine/arrays/dimensions'

renderMode.value = 'inline'

box({
  width: 60,
  bg: Colors.BLUE,
  children: () => {
    text({ content: 'Line 1', fg: Colors.YELLOW })
    text({ content: 'Line 2', fg: Colors.GREEN })
  }
})

const indices = getAllocatedIndices()
console.log('Before layout - checking dimensions arrays:')
for (const i of indices) {
  const type = core.componentType[i]
  const ew = unwrap(dimensions.width[i])
  const eh = unwrap(dimensions.height[i])
  console.log('[' + i + '] type=' + type + ' explicit w=' + ew + ' explicit h=' + eh)
}

// Now manually run the intrinsic calculation to debug
console.log('\nText content check:')
for (const i of indices) {
  const type = core.componentType[i]
  if (type === ComponentType.TEXT) {
    const content = unwrap(textArrays.textContent[i])
    console.log('[' + i + '] content="' + content + '" truthy=' + (!!content) + ' type=' + (typeof content))
    if (content) {
      console.log('  -> Would set intrinsicH=1, intrinsicW=' + stringWidth(String(content)))
    }
  }
}
