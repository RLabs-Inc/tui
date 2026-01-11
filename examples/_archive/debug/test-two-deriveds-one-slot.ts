/**
 * Test: TWO deriveds reading from the SAME slotArray slot
 * This mimics TUI: layoutDerived and frameBufferDerived both read textContent[0]
 */

import { signal, derived, effect, slotArray } from '@rlabs-inc/signals'

const counter = signal(0)
const textContent = slotArray<number>(0)
textContent.setSource(0, counter)

// First derived reads the slot (like layoutDerived)
let layoutRuns = 0
const layoutDerived = derived(() => {
  layoutRuns++
  const val = textContent[0]
  console.error(`[layout] Run #${layoutRuns}: val=${val}`)
  return { text: val }
})

// Second derived reads SAME slot AND reads first derived (like frameBufferDerived)
let frameRuns = 0
const frameBufferDerived = derived(() => {
  frameRuns++
  const layout = layoutDerived.value  // Read first derived
  const val = textContent[0]           // ALSO read same slot
  console.error(`[frameBuffer] Run #${frameRuns}: layout.text=${layout.text}, direct=${val}`)
  return { buffer: val }
})

// Effect reads second derived (like render effect)
let effectRuns = 0
effect(() => {
  effectRuns++
  const fb = frameBufferDerived.value
  console.error(`[effect] Run #${effectRuns}: buffer=${fb.buffer}`)
})

// Update counter
setInterval(() => {
  counter.value++
  console.error(`[auto] counter=${counter.value}`)
}, 500)
