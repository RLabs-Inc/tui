/**
 * Test: Derived that reads from MULTIPLE slotArrays (like TUI's layoutDerived)
 */

import { signal, derived, effect, slotArray } from '@rlabs-inc/signals'

const counter = signal(0)

// Multiple arrays like TUI
const textContent = slotArray<number>(0)
const width = slotArray<number>(0)
const height = slotArray<number>(0)
const visible = slotArray<number>(1)

// Set up slots - some reactive, some static
textContent.setSource(0, counter)  // Reactive
width.setSource(0, 40)              // Static
height.setSource(0, 10)             // Static
visible.setSource(0, 1)             // Static

// Derived that reads from ALL arrays (like layoutDerived)
let layoutRuns = 0
const layout = derived(() => {
  layoutRuns++
  const t = textContent[0]
  const w = width[0]
  const h = height[0]
  const v = visible[0]
  console.error(`[layout] Run #${layoutRuns}: text=${t}, w=${w}, h=${h}, v=${v}`)
  return { text: t, width: w, height: h, visible: v }
})

// SECOND derived that reads from FIRST (like frameBufferDerived reads layoutDerived)
let frameBufferRuns = 0
const frameBuffer = derived(() => {
  frameBufferRuns++
  const l = layout.value  // Chain from layout derived
  console.error(`[frameBuffer] Run #${frameBufferRuns}: text=${l.text}`)
  return { buffer: `rendered: ${l.text}` }
})

// Effect that reads the SECOND derived (like render effect)
let effectRuns = 0
effect(() => {
  effectRuns++
  const fb = frameBuffer.value
  console.error(`[effect] Run #${effectRuns}: ${fb.buffer}`)
})

// Update counter
setInterval(() => {
  counter.value++
  console.error(`[auto] counter=${counter.value}`)
}, 500)
