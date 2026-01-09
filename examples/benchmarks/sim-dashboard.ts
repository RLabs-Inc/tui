/**
 * System Dashboard Simulator
 *
 * Simulates a realistic monitoring dashboard:
 * - CPU/Memory/Network stats
 * - Process list
 * - Log viewer
 * - All with live updates
 *
 * Press Q to quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

// System stats (simulated)
const cpuUsage = signal(45)
const memoryUsage = signal(62)
const memoryUsed = signal('4.2 GB')
const memoryTotal = signal('8.0 GB')
const networkIn = signal('1.2 MB/s')
const networkOut = signal('340 KB/s')
const uptime = signal(0)

// Processes
const processes = signal([
  { pid: 1234, name: 'node', cpu: 12.5, mem: 245 },
  { pid: 5678, name: 'chrome', cpu: 8.2, mem: 1024 },
  { pid: 9012, name: 'code', cpu: 5.1, mem: 512 },
  { pid: 3456, name: 'docker', cpu: 3.8, mem: 386 },
  { pid: 7890, name: 'postgres', cpu: 2.1, mem: 156 },
  { pid: 1122, name: 'redis', cpu: 0.5, mem: 32 },
])

// Logs
const logs = signal([
  { time: '01:32:15', level: 'INFO', msg: 'Server started on port 3000' },
  { time: '01:32:16', level: 'INFO', msg: 'Database connection established' },
  { time: '01:32:18', level: 'WARN', msg: 'High memory usage detected' },
  { time: '01:32:20', level: 'INFO', msg: 'Request: GET /api/users (200)' },
  { time: '01:32:21', level: 'INFO', msg: 'Request: POST /api/data (201)' },
  { time: '01:32:25', level: 'ERROR', msg: 'Connection timeout to cache' },
  { time: '01:32:26', level: 'INFO', msg: 'Retrying cache connection...' },
  { time: '01:32:27', level: 'INFO', msg: 'Cache connection restored' },
])

// Helper to create a bar graph
function makeBar(value: number, width: number): string {
  const filled = Math.round((value / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

async function main() {
  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      bg: { r: 18, g: 20, b: 26, a: 255 },
      children: () => {
        // ═══════════════════════════════════════════════════════════════════════
        // HEADER
        // ═══════════════════════════════════════════════════════════════════════
        box({
          height: 3,
          bg: { r: 28, g: 32, b: 42, a: 255 },
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '◉', fg: Colors.GREEN })
                text({ content: 'System Dashboard', fg: Colors.WHITE })
              }
            })
            text({
              content: derived(() => {
                const h = Math.floor(uptime.value / 3600)
                const m = Math.floor((uptime.value % 3600) / 60)
                const s = uptime.value % 60
                return `Uptime: ${h}h ${m}m ${s}s`
              }),
              fg: Colors.CYAN
            })
          }
        })

        // ═══════════════════════════════════════════════════════════════════════
        // TOP ROW - Stats
        // ═══════════════════════════════════════════════════════════════════════
        box({
          height: 8,
          flexDirection: 'row',
          gap: 1,
          padding: 1,
          children: () => {
            // CPU Panel
            box({
              grow: 1,
              border: BorderStyle.ROUNDED,
              borderColor: Colors.CYAN,
              padding: 1,
              flexDirection: 'column',
              children: () => {
                text({ content: 'CPU', fg: Colors.CYAN })
                text({
                  content: derived(() => `${cpuUsage.value}%`),
                  fg: derived(() => cpuUsage.value > 80 ? Colors.RED : cpuUsage.value > 50 ? Colors.YELLOW : Colors.GREEN)
                })
                text({
                  content: derived(() => makeBar(cpuUsage.value, 15)),
                  fg: derived(() => cpuUsage.value > 80 ? Colors.RED : cpuUsage.value > 50 ? Colors.YELLOW : Colors.GREEN)
                })
              }
            })

            // Memory Panel
            box({
              grow: 1,
              border: BorderStyle.ROUNDED,
              borderColor: Colors.MAGENTA,
              padding: 1,
              flexDirection: 'column',
              children: () => {
                text({ content: 'MEMORY', fg: Colors.MAGENTA })
                text({
                  content: derived(() => `${memoryUsage.value}%`),
                  fg: derived(() => memoryUsage.value > 80 ? Colors.RED : memoryUsage.value > 60 ? Colors.YELLOW : Colors.GREEN)
                })
                text({
                  content: derived(() => makeBar(memoryUsage.value, 15)),
                  fg: derived(() => memoryUsage.value > 80 ? Colors.RED : memoryUsage.value > 60 ? Colors.YELLOW : Colors.GREEN)
                })
                text({
                  content: derived(() => `${memoryUsed.value} / ${memoryTotal.value}`),
                  fg: Colors.GRAY
                })
              }
            })

            // Network Panel
            box({
              grow: 1,
              border: BorderStyle.ROUNDED,
              borderColor: Colors.YELLOW,
              padding: 1,
              flexDirection: 'column',
              children: () => {
                text({ content: 'NETWORK', fg: Colors.YELLOW })
                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '↓', fg: Colors.GREEN })
                    text({ content: networkIn, fg: Colors.WHITE })
                  }
                })
                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '↑', fg: Colors.CYAN })
                    text({ content: networkOut, fg: Colors.WHITE })
                  }
                })
              }
            })
          }
        })

        // ═══════════════════════════════════════════════════════════════════════
        // BOTTOM ROW - Processes & Logs
        // ═══════════════════════════════════════════════════════════════════════
        box({
          grow: 1,
          flexDirection: 'row',
          gap: 1,
          padding: 1,
          children: () => {
            // Processes Panel
            box({
              grow: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                box({
                  padding: 1,
                  bg: { r: 25, g: 28, b: 36, a: 255 },
                  children: () => {
                    text({ content: 'PROCESSES', fg: Colors.WHITE })
                  }
                })
                // Header
                box({
                  paddingLeft: 1,
                  paddingRight: 1,
                  flexDirection: 'row',
                  children: () => {
                    text({ content: 'PID', fg: Colors.GRAY, width: 8 })
                    text({ content: 'NAME', fg: Colors.GRAY, width: 12 })
                    text({ content: 'CPU%', fg: Colors.GRAY, width: 8 })
                    text({ content: 'MEM', fg: Colors.GRAY, width: 8 })
                  }
                })
                // Process rows
                box({
                  paddingLeft: 1,
                  paddingRight: 1,
                  flexDirection: 'column',
                  children: () => {
                    for (const proc of processes.value) {
                      box({
                        flexDirection: 'row',
                        children: () => {
                          text({ content: String(proc.pid), fg: Colors.CYAN, width: 8 })
                          text({ content: proc.name, fg: Colors.WHITE, width: 12 })
                          text({
                            content: `${proc.cpu.toFixed(1)}%`,
                            fg: proc.cpu > 10 ? Colors.YELLOW : Colors.GREEN,
                            width: 8
                          })
                          text({ content: `${proc.mem}M`, fg: Colors.GRAY, width: 8 })
                        }
                      })
                    }
                  }
                })
              }
            })

            // Logs Panel
            box({
              grow: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                box({
                  padding: 1,
                  bg: { r: 25, g: 28, b: 36, a: 255 },
                  children: () => {
                    text({ content: 'LOGS', fg: Colors.WHITE })
                  }
                })
                box({
                  padding: 1,
                  flexDirection: 'column',
                  children: () => {
                    for (const log of logs.value) {
                      box({
                        flexDirection: 'row',
                        gap: 1,
                        children: () => {
                          text({ content: log.time, fg: Colors.GRAY, width: 10 })
                          text({
                            content: log.level,
                            fg: log.level === 'ERROR' ? Colors.RED : log.level === 'WARN' ? Colors.YELLOW : Colors.GREEN,
                            width: 6
                          })
                          text({ content: log.msg, fg: Colors.WHITE })
                        }
                      })
                    }
                  }
                })
              }
            })
          }
        })

        // ═══════════════════════════════════════════════════════════════════════
        // STATUS BAR
        // ═══════════════════════════════════════════════════════════════════════
        box({
          height: 2,
          bg: { r: 28, g: 32, b: 42, a: 255 },
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            text({ content: '◉ All systems operational', fg: Colors.GREEN })
            text({ content: 'Q=quit', fg: Colors.GRAY })
          }
        })
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  setInterval(() => {
    // Simulate CPU fluctuation
    cpuUsage.value = Math.min(100, Math.max(10, cpuUsage.value + (Math.random() - 0.5) * 10))

    // Simulate memory
    memoryUsage.value = Math.min(100, Math.max(40, memoryUsage.value + (Math.random() - 0.5) * 5))
    memoryUsed.value = `${(memoryUsage.value * 0.08).toFixed(1)} GB`

    // Simulate network
    const inVal = 0.8 + Math.random() * 1.5
    const outVal = 200 + Math.random() * 400
    networkIn.value = `${inVal.toFixed(1)} MB/s`
    networkOut.value = `${Math.round(outVal)} KB/s`

    // Update process CPU
    const newProcs = processes.value.map(p => ({
      ...p,
      cpu: Math.max(0.1, p.cpu + (Math.random() - 0.5) * 3)
    }))
    processes.value = newProcs

    // Uptime
    uptime.value++
  }, 1000)

  keyboard.onKey('q', () => {
    cleanup().then(() => process.exit(0))
  })
}

main()
