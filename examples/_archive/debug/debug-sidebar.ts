/**
 * Debug: Test if sidebar with derived causes reactivity break
 *
 * Run: bun run examples/debug/debug-sidebar.ts
 */

import {
  mount,
  box,
  text,
  signal,
  derived,
  keyboard,
  t,
} from '../../index'

const count = signal(0)
const activeTab = signal('dashboard')
const notification = signal<string | null>(null)

function notify(msg: string) {
  notification.value = msg
  setTimeout(() => { notification.value = null }, 3000)
}

// Sidebar item component (like the demo)
function SidebarItem(id: string, label: string) {
  const isActive = derived(() => activeTab.value === id)

  box({
    height: 1,
    children: () => {
      text({
        content: () => isActive.value ? `> ${label}` : `  ${label}`,
        fg: () => isActive.value ? t.primary : t.text
      })
    }
  })
}

async function main() {
  console.log('=== DEBUG: Sidebar Test ===\n')

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      bg: t.bg,
      children: () => {
        // Sidebar
        box({
          width: 15,
          height: '100%',
          borderRight: 1,
          flexDirection: 'column',
          children: () => {
            text({ content: 'SIDEBAR' })
            SidebarItem('dashboard', 'Dashboard')
            SidebarItem('widgets', 'Widgets')
            SidebarItem('settings', 'Settings')
          }
        })

        // Main content
        box({
          grow: 1,
          flexDirection: 'column',
          children: () => {
            // Header (also reads count like the demo)
            box({
              height: 4,
              borderBottom: 1,
              padding: 1,
              flexDirection: 'column',
              children: () => {
                text({ content: () => `Section: ${activeTab.value}`, variant: 'primary' })
                text({
                  content: () => {
                    console.log(`[HEADER] count = ${count.value}`)
                    return `Count: ${count.value}`
                  }
                })
              }
            })

            // Scrollable area
            box({
              grow: 1,
              overflow: 'scroll',
              flexDirection: 'column',
              gap: 1,
              padding: 1,
              children: () => {
                // Counter
                text({
                  content: () => {
                    console.log(`[COUNTER] count = ${count.value}`)
                    return `Counter: ${count.value}`
                  }
                })

                text({ content: '' })
                text({ content: 'SPACE=+, 1/2/3=tab, Q=quit' })

                // Many items
                for (let i = 0; i < 50; i++) {
                  text({ content: `Item ${i}` })
                }
              }
            })
          }
        })

        // Notification
        box({
          position: 'absolute',
          top: 0,
          right: 0,
          width: 20,
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
    if (e.key === 'q') cleanup().then(() => process.exit(0))
    if (e.key === 'Space') count.value++
    if (e.key === '1') activeTab.value = 'dashboard'
    if (e.key === '2') activeTab.value = 'widgets'
    if (e.key === '3') activeTab.value = 'settings'
  })

  notify('Welcome!')

  setInterval(() => {
    console.log(`[INTERVAL] ${count.value} -> ${count.value + 1}`)
    count.value++
  }, 1000)

  console.log('[INIT] Ready\n')
}

main().catch(console.error)
