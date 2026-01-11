/**
 * Test: Many Components
 *
 * The TUI demo has MANY text components. Let's test with many slots
 * to see if that's what breaks the tracking.
 */

import { signal, derived, effect, slotArray } from '@rlabs-inc/signals'

const tick = () => new Promise(r => setTimeout(r, 10))

async function main() {
  console.log('=== Many Components Test ===\n')

  // Create many signals (like different user state)
  const count = signal(0)
  const activeTab = signal('dashboard')
  const themeName = signal('terminal')

  // Create a slotArray with MANY slots (like textContent in TUI)
  const textContent = slotArray<string>('')

  // Set up many slots (like many text components)
  for (let i = 0; i < 50; i++) {
    if (i === 0) {
      // This one reads count (like DEBUG COUNT)
      textContent.setSource(i, () => `DEBUG COUNT: ${count.value}`)
    } else if (i === 1) {
      // This one reads count too (like the counter display)
      textContent.setSource(i, () => `Count: ${count.value}`)
    } else if (i === 5) {
      // This one reads activeTab
      textContent.setSource(i, () => `Tab: ${activeTab.value}`)
    } else if (i === 10) {
      // This one reads theme
      textContent.setSource(i, () => `Theme: ${themeName.value}`)
    } else {
      // Static text
      textContent.setSource(i, `Static ${i}`)
    }
  }

  // Simulate layoutDerived (reads many signals)
  const terminalWidth = signal(80)
  const terminalHeight = signal(24)
  const renderMode = signal('fullscreen')

  const layoutDerived = derived(() => {
    const tw = terminalWidth.value
    const th = terminalHeight.value
    const mode = renderMode.value
    return { width: tw, height: th, mode }
  })

  // Simulate frameBufferDerived (reads layoutDerived then ALL slots)
  const frameBufferDerived = derived(() => {
    const layout = layoutDerived.value

    // Read ALL slots (like the real TUI does)
    const contents: string[] = []
    for (let i = 0; i < 50; i++) {
      contents.push(textContent[i])
    }

    return { layout, contents }
  })

  // Render effect
  const renders: { count0: string, count1: string }[] = []

  effect(() => {
    const fb = frameBufferDerived.value
    renders.push({
      count0: fb.contents[0],
      count1: fb.contents[1]
    })
    console.error(`[render] count0="${fb.contents[0]}", count1="${fb.contents[1]}"`)
  })
  await tick()

  console.log('\n--- Incrementing count (should trigger re-render each time) ---\n')

  // Simulate setInterval
  for (let i = 1; i <= 5; i++) {
    await new Promise(r => setTimeout(r, 100))
    count.value = i
    console.error(`[main] Set count to ${i}`)
  }
  await tick()

  console.log('\n--- Now change theme (like pressing t) ---\n')
  themeName.value = 'monokai'
  await tick()

  console.log('\n--- Increment count again ---\n')
  count.value = 6
  await tick()

  console.log('\n=== Results ===')
  console.log(`Total renders: ${renders.length}`)
  for (let i = 0; i < renders.length; i++) {
    console.log(`  ${i}: ${JSON.stringify(renders[i])}`)
  }

  // Should have: initial + 5 count changes + theme change + 1 more count change = 8
  const pass = renders.length >= 7 && renders[renders.length - 1].count0 === 'DEBUG COUNT: 6'

  if (pass) {
    console.log('\n✅ PASS: Many components work correctly!')
  } else {
    console.log('\n❌ FAIL: Tracking broken with many components')
    console.log(`Expected at least 7 renders, got ${renders.length}`)
    console.log(`Expected last count to be 6, got ${renders[renders.length - 1].count0}`)
  }

  process.exit(pass ? 0 : 1)
}

main()
