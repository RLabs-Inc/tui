import { renderMode } from './src/pipeline/layout'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'
import { unwrap } from '@rlabs-inc/signals'
import { ComponentType } from './src/types'
import { getAllocatedIndices } from './src/engine/registry'
import * as core from './src/engine/arrays/core'

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
console.log('Checking parent relationships:')
for (const i of indices) {
  const type = core.componentType[i]
  const typeName = type === ComponentType.BOX ? 'BOX' : type === ComponentType.TEXT ? 'TEXT' : 'NONE'
  const parent = unwrap(core.parentIndex[i])
  console.log('[' + i + '] ' + typeName + ' parent=' + parent)
}
