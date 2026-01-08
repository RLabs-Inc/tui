/**
 * TUI Framework - Showcase Demo
 *
 * A comprehensive demo showing all framework features working together.
 * This is the "wow" demo that demonstrates what's possible.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'

async function main() {
  // State
  const tick = signal(0)
  const selectedTab = signal(0)

  // Derived state
  const cpuUsage = derived(() => 20 + Math.sin(tick.value * 0.1) * 15 + Math.random() * 10)
  const memUsage = derived(() => 45 + Math.cos(tick.value * 0.08) * 10 + Math.random() * 5)
  const networkIn = derived(() => Math.floor(Math.random() * 1000))
  const networkOut = derived(() => Math.floor(Math.random() * 500))

  // Tab names
  const tabs = ['Dashboard', 'Processes', 'Network', 'About']

  // Update tick
  const tickInterval = setInterval(() => {
    tick.value++
  }, 100)

  const cleanup = await mount(() => {
    // Main container - full dashboard layout
    box({
      width: 80,
      bg: { r: 20, g: 20, b: 30, a: 255 },
      children: () => {
        // Header
        box({
          height: 3,
          bg: { r: 40, g: 40, b: 60, a: 255 },
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: '  TUI DASHBOARD', fg: Colors.CYAN })
            text({
              content: () => {
                const d = new Date()
                return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
              },
              fg: Colors.GRAY,
            })
          },
        })

        // Tab bar
        box({
          height: 3,
          flexDirection: 'row',
          gap: 1,
          padding: 1,
          children: () => {
            for (let i = 0; i < tabs.length; i++) {
              const isSelected = () => selectedTab.value === i
              box({
                width: 14,
                border: BorderStyle.ROUNDED,
                borderColor: () => isSelected() ? Colors.CYAN : Colors.GRAY,
                bg: () => isSelected() ? { r: 0, g: 80, b: 80, a: 255 } : { r: 30, g: 30, b: 40, a: 255 },
                children: () => {
                  text({
                    content: tabs[i]!,
                    fg: () => isSelected() ? Colors.WHITE : Colors.GRAY,
                    align: 'center',
                  })
                },
              })
            }
          },
        })

        // Main content area
        box({
          grow: 1,
          padding: 1,
          gap: 1,
          children: () => {
            // Top row: CPU and Memory
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                // CPU Box
                box({
                  grow: 1,
                  border: BorderStyle.ROUNDED,
                  borderColor: Colors.GREEN,
                  padding: 1,
                  children: () => {
                    text({ content: ' CPU Usage', fg: Colors.GREEN })
                    text({ content: '' })
                    // CPU bar
                    box({
                      flexDirection: 'row',
                      children: () => {
                        const pct = () => Math.floor(cpuUsage.value)
                        const filled = () => Math.floor(pct() / 100 * 30)
                        text({
                          content: () => ''.padStart(filled(), ''),
                          fg: () => pct() > 80 ? Colors.RED : pct() > 50 ? Colors.YELLOW : Colors.GREEN,
                        })
                        text({
                          content: () => ''.padStart(30 - filled(), '░'),
                          fg: Colors.GRAY,
                        })
                        text({
                          content: () => ` ${pct()}%`,
                          fg: Colors.WHITE,
                        })
                      },
                    })
                  },
                })

                // Memory Box
                box({
                  grow: 1,
                  border: BorderStyle.ROUNDED,
                  borderColor: Colors.BLUE,
                  padding: 1,
                  children: () => {
                    text({ content: ' Memory', fg: Colors.BLUE })
                    text({ content: '' })
                    // Memory bar
                    box({
                      flexDirection: 'row',
                      children: () => {
                        const pct = () => Math.floor(memUsage.value)
                        const filled = () => Math.floor(pct() / 100 * 30)
                        text({
                          content: () => ''.padStart(filled(), ''),
                          fg: Colors.BLUE,
                        })
                        text({
                          content: () => ''.padStart(30 - filled(), '░'),
                          fg: Colors.GRAY,
                        })
                        text({
                          content: () => ` ${pct()}%`,
                          fg: Colors.WHITE,
                        })
                      },
                    })
                  },
                })
              },
            })

            // Network stats
            box({
              border: BorderStyle.ROUNDED,
              borderColor: Colors.MAGENTA,
              padding: 1,
              flexDirection: 'row',
              justifyContent: 'space-around',
              children: () => {
                box({
                  children: () => {
                    text({ content: '↓ Download', fg: Colors.GREEN })
                    text({ content: () => `${networkIn.value} KB/s`, fg: Colors.WHITE })
                  },
                })
                box({
                  children: () => {
                    text({ content: '↑ Upload', fg: Colors.RED })
                    text({ content: () => `${networkOut.value} KB/s`, fg: Colors.WHITE })
                  },
                })
                box({
                  children: () => {
                    text({ content: '⟳ Latency', fg: Colors.YELLOW })
                    text({ content: () => `${Math.floor(10 + Math.random() * 50)} ms`, fg: Colors.WHITE })
                  },
                })
              },
            })

            // Process list simulation
            box({
              grow: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              padding: 1,
              children: () => {
                text({ content: ' Top Processes', fg: Colors.WHITE })
                text({ content: '─'.repeat(70), fg: Colors.GRAY })

                const processes = [
                  { name: 'node', cpu: () => 12 + Math.random() * 5, mem: () => 8 + Math.random() * 2 },
                  { name: 'chrome', cpu: () => 25 + Math.random() * 10, mem: () => 35 + Math.random() * 5 },
                  { name: 'vscode', cpu: () => 8 + Math.random() * 3, mem: () => 15 + Math.random() * 3 },
                  { name: 'docker', cpu: () => 5 + Math.random() * 2, mem: () => 12 + Math.random() * 2 },
                  { name: 'bun', cpu: () => 3 + Math.random() * 2, mem: () => 2 + Math.random() * 1 },
                ]

                for (const proc of processes) {
                  box({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    children: () => {
                      text({ content: proc.name.padEnd(12), fg: Colors.CYAN })
                      text({ content: () => `CPU: ${proc.cpu().toFixed(1)}%`.padStart(12), fg: Colors.GREEN })
                      text({ content: () => `MEM: ${proc.mem().toFixed(1)}%`.padStart(12), fg: Colors.BLUE })
                    },
                  })
                }
              },
            })
          },
        })

        // Footer
        box({
          height: 2,
          bg: { r: 40, g: 40, b: 60, a: 255 },
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: 'Press 1-4 to switch tabs | Q to quit', fg: Colors.GRAY })
            text({ content: () => `Tick: ${tick.value}`, fg: Colors.GRAY })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Tab switching
  keyboard.onKey('1', () => selectedTab.value = 0)
  keyboard.onKey('2', () => selectedTab.value = 1)
  keyboard.onKey('3', () => selectedTab.value = 2)
  keyboard.onKey('4', () => selectedTab.value = 3)

  // Quit
  keyboard.onKey('q', () => {
    clearInterval(tickInterval)
    cleanup()
  })
  keyboard.onKey('Q', () => {
    clearInterval(tickInterval)
    cleanup()
  })
}

main().catch(console.error)
