/**
 * Debug: Complex layout similar to all-features demo
 *
 * Tests:
 * - Scrollable area
 * - Many child components
 * - Multiple signals
 *
 * Run: bun run examples/debug/debug-complex.ts
 */

import {
  mount,
  box,
  text,
  signal,
  derived,
  keyboard,
  t,
  setTheme,
} from '../../index'

// Multiple signals like the demo
const activeTab = signal('dashboard')
const count = signal(0)
const showModal = signal(false)

// Computed like the demo
const doubleCount = derived(() => count.value * 2)

let renderCount = 0

async function main() {
  console.log('=== DEBUG: Complex Layout Test ===\n')

  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      bg: t.bg,
      children: () => {
        // Sidebar (like demo)
        box({
          width: 20,
          height: '100%',
          borderRight: 1,
          flexDirection: 'column',
          children: () => {
            text({ content: 'SIDEBAR' })

            // Sidebar items with derived
            const tabs = ['dashboard', 'widgets', 'settings']
            tabs.forEach(id => {
              const isActive = derived(() => activeTab.value === id)
              box({
                height: 1,
                children: () => {
                  text({
                    content: () => isActive.value ? `> ${id}` : `  ${id}`,
                    fg: () => isActive.value ? t.primary : t.text
                  })
                }
              })
            })
          }
        })

        // Main content
        box({
          grow: 1,
          flexDirection: 'column',
          children: () => {
            // Header
            box({
              height: 3,
              borderBottom: 1,
              children: () => {
                text({
                  content: () => {
                    renderCount++
                    console.log(`[HEADER] Render #${renderCount}, count=${count.value}`)
                    return `Count: ${count.value} | Double: ${doubleCount.value}`
                  }
                })
              }
            })

            // Scrollable area (like demo)
            box({
              grow: 1,
              overflow: 'scroll',
              flexDirection: 'column',
              gap: 1,
              padding: 1,
              children: () => {
                text({ content: 'Scrollable Content' })

                // Counter display (THE CRITICAL ONE)
                box({
                  height: 3,
                  border: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  children: () => {
                    text({
                      content: () => {
                        console.log(`[COUNTER] count.value = ${count.value}`)
                        return String(count.value)
                      }
                    })
                  }
                })

                // Many items (like demo's 50 items)
                for (let i = 0; i < 30; i++) {
                  box({
                    height: 1,
                    children: () => {
                      text({ content: `Item ${i}` })
                    }
                  })
                }
              }
            })
          }
        })
      }
    })
  }, { mouse: false, mode: 'inline' })

  console.log('\n[INIT] Mount complete')

  keyboard.on((e) => {
    if (e.key === 'q') {
      cleanup().then(() => process.exit(0))
    }

    if (e.key === 'Space') {
      console.log(`\n[SPACE] Incrementing count...`)
      count.value++
      console.log(`[SPACE] count is now ${count.value}`)
    }

    if (e.key === '1') activeTab.value = 'dashboard'
    if (e.key === '2') activeTab.value = 'widgets'
    if (e.key === '3') activeTab.value = 'settings'

    if (e.key === 't') {
      console.log(`[THEME] Changing theme...`)
      setTheme('dracula')
    }
  })

  // Auto increment
  setInterval(() => {
    console.log(`\n[INTERVAL] Auto-incrementing...`)
    count.value++
    console.log(`[INTERVAL] count is now ${count.value}`)
  }, 2000)

  console.log('[INIT] Ready. SPACE=increment, 1/2/3=tab, T=theme, Q=quit\n')
}

main().catch(console.error)
