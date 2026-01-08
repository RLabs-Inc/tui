import { renderMode, layoutDerived } from './src/pipeline/layout'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'
import * as textArrays from './src/engine/arrays/text'
import * as core from './src/engine/arrays/core'
import { unwrap } from '@rlabs-inc/signals'
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
    text({ content: 'Line 3', fg: Colors.WHITE })
  }
})

console.log('Text content array:')
for (let i = 0; i < 5; i++) {
  const type = core.componentType[i]
  const content = textArrays.textContent[i]
  const unwrapped = unwrap(content)
  console.log(`[${i}] type=${type}, content binding exists=${!!content}, unwrapped="${unwrapped}"`)
}
