import { renderMode } from './src/pipeline/layout'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'
import * as textArrays from './src/engine/arrays/text'
import * as core from './src/engine/arrays/core'
import { unwrap } from '@rlabs-inc/signals'
import { ComponentType } from './src/types'
import { getAllocatedIndices } from './src/engine/registry'
import { stringWidth } from './src/utils/text'

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
console.log('Allocated indices:', [...indices])

for (const i of indices) {
  const type = core.componentType[i]
  if (type === ComponentType.TEXT) {
    const content = unwrap(textArrays.textContent[i])
    const str = String(content)
    console.log('[' + i + '] TEXT: content="' + str + '", strWidth=' + stringWidth(str) + ', truthy=' + (!!content))
  } else {
    console.log('[' + i + '] type=' + type)
  }
}
