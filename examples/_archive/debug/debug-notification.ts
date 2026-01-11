/**
 * Debug: Test if notification causes the reactivity break
 *
 * Run: bun run examples/debug/debug-notification.ts
 */

import {
  mount,
  box,
  text,
  signal,
  keyboard,
  t,
} from '../../index'

const count = signal(0)
const notification = signal<string | null>(null)

function notify(msg: string) {
  console.log(`[NOTIFY] Setting notification: "${msg}"`)
  notification.value = msg
  setTimeout(() => {
    console.log(`[NOTIFY] Clearing notification`)
    notification.value = null
  }, 3000)
}

async function main() {
  console.log('=== DEBUG: Notification Test ===\n')

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      padding: 2,
      gap: 1,
      bg: t.bg,
      children: () => {
        text({ content: 'Notification Test', variant: 'primary' })

        // Counter
        text({
          content: () => {
            console.log(`[COUNTER] Rendering count = ${count.value}`)
            return `Counter: ${count.value}`
          }
        })

        text({ content: '' })
        text({ content: 'SPACE=increment, N=notify, Q=quit' })

        // Notification box (positioned absolute)
        box({
          position: 'absolute',
          top: 0,
          right: 0,
          width: 25,
          height: 3,
          visible: () => notification.value !== null,
          variant: 'success',
          border: 1,
          children: () => {
            text({ content: () => notification.value || '' })
          }
        })
      }
    })
  }, { mouse: false, mode: 'inline' })

  console.log('[INIT] Mount complete')

  keyboard.on((e) => {
    if (e.key === 'q' || e.key === 'Q') {
      cleanup().then(() => process.exit(0))
    }

    if (e.key === 'Space') {
      console.log(`\n[SPACE] Before: count = ${count.value}`)
      count.value++
      console.log(`[SPACE] After: count = ${count.value}`)
    }

    if (e.key === 'n' || e.key === 'N') {
      notify('Hello notification!')
    }
  })

  // Trigger notification like the demo does
  notify('Welcome!')

  // Auto increment
  setInterval(() => {
    console.log(`\n[INTERVAL] count: ${count.value} -> ${count.value + 1}`)
    count.value++
  }, 1000)

  console.log('[INIT] Ready\n')
}

main().catch(console.error)
