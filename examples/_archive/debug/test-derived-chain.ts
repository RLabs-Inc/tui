/**
 * Test: Direct effect reading layoutDerived
 */

import { signal, effect, derived } from '@rlabs-inc/signals'
import { mount, text, keyboard, Colors } from '../../index'
import { layoutDerived } from '../../src/pipeline/layout'

async function main() {
  const counter = signal(0)

  setInterval(() => {
    counter.value++
    console.error(`[auto] count=${counter.value}`)
  }, 500)

  // Mount creates components that layoutDerived tracks
  const cleanup = await mount(() => {
    text({ content: counter, fg: Colors.GREEN })
  }, { mode: 'inline', mouse: false })

  // Direct effect reading layoutDerived
  let effectCount = 0
  effect(() => {
    effectCount++
    const layout = layoutDerived.value
    console.error(`[direct effect] Run #${effectCount}`)
  })

  keyboard.onKey('q', cleanup)
}

main().catch(console.error)
