import { renderMode, layoutDerived } from './src/pipeline/layout'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'
import * as core from './src/engine/arrays/core'
import { ComponentType } from './src/types'

renderMode.value = 'inline'

box({
  width: 60,
  bg: Colors.BLUE,
  border: 1,
  padding: 1,
  children: () => {
    text({ content: 'Line 1', fg: Colors.YELLOW })
    text({ content: 'Line 2', fg: Colors.GREEN })
    for (let i = 3; i <= 10; i++) {
      text({ content: `Line ${i}`, fg: Colors.WHITE })
    }
  }
})

const layout = layoutDerived.value
console.log('Content bounds:', layout.contentWidth, 'x', layout.contentHeight)
console.log('\nComponents:')
for (let i = 0; i < Math.min(15, layout.y.length); i++) {
  const type = core.componentType[i]
  const typeName = type === ComponentType.BOX ? 'BOX' : type === ComponentType.TEXT ? 'TEXT' : 'NONE'
  console.log(`[${i}] ${typeName}: y=${layout.y[i]}, h=${layout.height[i]}, w=${layout.width[i]}`)
}
