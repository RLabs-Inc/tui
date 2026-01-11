/**
 * Test: Use TUI's actual primitives and layoutDerived
 */

import { signal, effect } from '@rlabs-inc/signals'
import { text, Colors } from '../../index'
import { layoutDerived } from '../../src/pipeline/layout'
import { frameBufferDerived } from '../../src/pipeline/frameBuffer'

const counter = signal(0)
const color = signal(Colors.GREEN)

// Use actual text() primitive WITH TWO reactive props (like 08-reactivity)
text({ content: counter, fg: color })
// Add more text components with STATIC content
text({ content: 'static 1', fg: Colors.WHITE })
text({ content: 'static 2', fg: Colors.WHITE })

// Effect that reads frameBufferDerived (like render effect)
let effectRuns = 0
effect(() => {
  effectRuns++
  const fb = frameBufferDerived.value
  console.error(`[effect] Run #${effectRuns}`)
})

// Update counter
setInterval(() => {
  counter.value++
  console.error(`[auto] counter=${counter.value}`)
}, 500)

// Update color too (like 08-reactivity)
const colors = [Colors.GREEN, Colors.RED, Colors.BLUE]
let idx = 0
setInterval(() => {
  idx = (idx + 1) % colors.length
  color.value = colors[idx]!
}, 750)
