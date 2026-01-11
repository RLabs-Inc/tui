/**
 * Debug test for reactivity issue
 *
 * This minimal example isolates the counter reactivity bug:
 * - Counter should increment on spacebar
 * - setInterval should auto-increment
 * - Both should trigger re-renders
 *
 * Run: bun run examples/debug/debug-reactivity.ts
 */

import {
  mount,
  box,
  text,
  signal,
  derived,
  effect,
  keyboard,
  t,
  setTheme,
} from '../../index'

// Signals
const count = signal(0)
const renderCount = signal(0)

// Debug logging
let lastCountValue = 0

async function main() {
  console.log('=== DEBUG: Reactivity Test ===')
  console.log('Press SPACE to increment counter')
  console.log('Press T to change theme')
  console.log('Press Q to quit')
  console.log('Auto-increment every 2 seconds')
  console.log('')

  // Debug effect - watch count changes
  effect(() => {
    const c = count.value
    console.log(`[EFFECT] count.value = ${c} (changed from ${lastCountValue})`)
    lastCountValue = c
  })

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      padding: 2,
      gap: 1,
      bg: t.bg,
      children: () => {
        text({
          content: 'Reactivity Debug Test',
          variant: 'primary'
        })

        text({
          content: () => {
            const c = count.value
            console.log(`[TEMPLATE] Rendering count = ${c}`)
            return `Counter: ${c}`
          }
        })

        text({
          content: () => `Render #${renderCount.value}`,
          variant: 'muted'
        })

        text({ content: '' })
        text({ content: 'SPACE=increment, T=theme, Q=quit' })
      }
    })

    // Increment render count to track re-renders
    renderCount.value++
  }, { mouse: true })  // ENABLE MOUSE - does it break?

  // Keyboard handlers
  keyboard.on((e) => {
    if (e.key === 'q' || e.key === 'Q') {
      cleanup().then(() => process.exit(0))
    }

    if (e.key === 'Space') {
      console.log(`[KEYBOARD] Space pressed, incrementing count`)
      count.value++
    }

    if (e.key === 't' || e.key === 'T') {
      const themes = ['terminal', 'dracula', 'nord', 'monokai']
      const next = themes[(themes.indexOf(t.name ?? 'terminal') + 1) % themes.length]
      console.log(`[KEYBOARD] T pressed, switching to theme: ${next}`)
      setTheme(next as any)
    }
  })

  // Auto-increment
  setInterval(() => {
    console.log(`[INTERVAL] Auto-incrementing count`)
    count.value++
  }, 2000)

  console.log('[INIT] Mount complete, starting render loop')
}

main().catch(console.error)
