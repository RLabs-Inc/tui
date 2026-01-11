/**
 * Minimal test: Does an effect track a derived that tracks a signal?
 */

import { signal, derived, effect } from '@rlabs-inc/signals'

const counter = signal(0)

// Derived that reads counter
const doubled = derived(() => {
  console.error(`[doubled derived] computing, counter=${counter.value}`)
  return counter.value * 2
})

// Effect that reads the derived
let effectRuns = 0
effect(() => {
  effectRuns++
  console.error(`[effect] Run #${effectRuns}, doubled=${doubled.value}`)
})

// Update counter
setInterval(() => {
  counter.value++
  console.error(`[auto] counter=${counter.value}`)
}, 500)
