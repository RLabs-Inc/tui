/**
 * Test: Module-level derived (like TUI's frameBufferDerived)
 * Created BEFORE the effect
 */

import { signal, derived, effect, slotArray } from '@rlabs-inc/signals'

const counter = signal(0)
const textContent = slotArray<number>(0)
const width = slotArray<number>(0)

// Module-level deriveds (like TUI)
let layoutRuns = 0
export const layoutDerived = derived(() => {
  layoutRuns++
  const t = textContent[0]
  const w = width[0]
  console.error(`[layout] Run #${layoutRuns}: text=${t}, w=${w}`)
  return { text: t, width: w }
})

let frameBufferRuns = 0
export const frameBufferDerived = derived(() => {
  frameBufferRuns++
  const l = layoutDerived.value
  console.error(`[frameBuffer] Run #${frameBufferRuns}: text=${l.text}`)
  return { buffer: `rendered: ${l.text}` }
})

// Simulate mount() - called AFTER deriveds exist
async function mount() {
  // Set up component data
  textContent.setSource(0, counter)
  width.setSource(0, 40)

  // Create effect (like render effect in mount)
  let effectRuns = 0
  effect(() => {
    effectRuns++
    const fb = frameBufferDerived.value
    console.error(`[effect] Run #${effectRuns}: ${fb.buffer}`)
  })
}

// Run
mount()

setInterval(() => {
  counter.value++
  console.error(`[auto] counter=${counter.value}`)
}, 500)
