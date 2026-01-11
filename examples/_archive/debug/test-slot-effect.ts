/**
 * Test: Effect with slotArray - single slot
 */

import { signal, effect, slotArray } from '@rlabs-inc/signals'

async function main() {
  const counter = signal(0)
  const textContent = slotArray<string>('')

  // Set slot 0 to point to the counter
  textContent.setSource(0, counter)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  let runCount = 0
  effect(() => {
    runCount++
    const val = textContent[0]  // Read through slotArray
    console.error(`[effect] Run #${runCount}: textContent[0]=${val}`)
  })
}

main().catch(console.error)
