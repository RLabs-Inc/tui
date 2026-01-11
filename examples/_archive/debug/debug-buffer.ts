import { signal } from '@rlabs-inc/signals'
import { renderMode, layoutDerived, terminalWidth, terminalHeight } from './src/pipeline/layout'
import { frameBufferDerived } from './src/pipeline/frameBuffer'
import { box, text } from './src/primitives'
import { Colors } from './src/types/color'

// Set inline mode
renderMode.value = 'inline'

console.log('Terminal:', terminalWidth.value, 'x', terminalHeight.value)

// Create a simple box
box({
  width: 50,
  height: 8,
  bg: Colors.BLUE,
  border: 1,
  children: () => {
    text({ content: 'Line 1', fg: Colors.YELLOW })
    text({ content: 'Line 2', fg: Colors.GREEN })
  }
})

// Check layout
const layout = layoutDerived.value
console.log('Content bounds:', layout.contentWidth, 'x', layout.contentHeight)

// Check frameBuffer
const { buffer, terminalSize } = frameBufferDerived.value
console.log('Buffer size:', buffer.width, 'x', buffer.height)
console.log('terminalSize:', terminalSize)
