/**
 * Debug: Trace dependency tracking
 *
 * This test shows when signals are being tracked/untracked
 * Run: bun run examples/debug/debug-deps.ts
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

// Patch the signals to add logging
const originalSignal = signal

// Simple test - just ONE text with ONE signal
const count = signal(0)

// Track how many times text getter is called
let textGetterCalls = 0

async function main() {
  console.log('=== DEBUG: Dependency Tracking Test ===\n')

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      padding: 2,
      gap: 1,
      bg: t.bg,
      children: () => {
        text({ content: 'Dependency Debug Test', variant: 'primary' })

        // The critical text - uses a getter that logs
        text({
          content: () => {
            textGetterCalls++
            const c = count.value
            console.log(`[TEXT GETTER #${textGetterCalls}] Reading count.value = ${c}`)
            return `Counter: ${c}`
          }
        })

        text({ content: '' })
        text({ content: 'SPACE=increment, T=theme, Q=quit' })
      }
    })
  }, { mouse: false })

  console.log('\n[INIT] Mount complete')
  console.log('[INIT] textGetterCalls so far:', textGetterCalls)

  keyboard.on((e) => {
    if (e.key === 'q' || e.key === 'Q') {
      cleanup().then(() => process.exit(0))
    }

    if (e.key === 'Space') {
      console.log(`\n[KEYBOARD] Space pressed`)
      console.log(`[KEYBOARD] BEFORE: count = ${count.value}`)
      count.value++
      console.log(`[KEYBOARD] AFTER: count = ${count.value}`)
      console.log(`[KEYBOARD] Waiting for render effect...`)
    }

    if (e.key === 't' || e.key === 'T') {
      console.log(`\n[KEYBOARD] Theme key pressed`)
      setTheme('dracula')
    }
  })

  // Auto increment after 3 seconds
  setTimeout(() => {
    console.log(`\n[TIMEOUT] Auto-incrementing...`)
    console.log(`[TIMEOUT] BEFORE: count = ${count.value}`)
    count.value++
    console.log(`[TIMEOUT] AFTER: count = ${count.value}`)
  }, 3000)

  console.log('[INIT] Ready - press SPACE to test\n')
}

main().catch(console.error)
