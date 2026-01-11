/**
 * Test: Direct effect with single signal - does it work?
 */

import { signal, effect } from '@rlabs-inc/signals'

async function main() {
  const counter = signal(0)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  let runCount = 0
  effect(() => {
    runCount++
    console.error(`[effect] Run #${runCount}: counter=${counter.value}`)
  })
}

main().catch(console.error)
