/**
 * TUI Showcase: System Monitor
 *
 * A htop-style system monitor demonstrating:
 * - Multiple panels updating at different intervals (stress-testing reactivity)
 * - ASCII progress bars with color-coded status
 * - Reactive derived values
 * - Clean interval cleanup on unmount
 *
 * Controls:
 *   q - Quit
 *   r - Reset all stats
 *   p - Pause/resume updates
 *   1-4 - Toggle panel visibility
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

// =============================================================================
// CONSTANTS
// =============================================================================

const BAR_WIDTH = 20
const FILLED_CHAR = '\u2588' // Full block
const EMPTY_CHAR = '\u2591' // Light shade

// Status thresholds
const WARNING_THRESHOLD = 50
const CRITICAL_THRESHOLD = 80

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Create ASCII progress bar: [████████░░░░░░░░] */
function progressBar(percent: number, width: number = BAR_WIDTH): string {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  return `[${FILLED_CHAR.repeat(filled)}${EMPTY_CHAR.repeat(empty)}]`
}

/** Get status color based on percentage */
function getStatusColor(percent: number) {
  if (percent >= CRITICAL_THRESHOLD) return Colors.RED
  if (percent >= WARNING_THRESHOLD) return Colors.YELLOW
  return Colors.GREEN
}

/** Generate random percentage with slight variation from current */
function randomWalk(current: number, maxDelta: number = 10): number {
  const delta = (Math.random() - 0.5) * 2 * maxDelta
  return Math.max(0, Math.min(100, current + delta))
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
  return `${bytes} B`
}

/** Format speed with direction indicator */
function formatSpeed(bytesPerSec: number, direction: 'up' | 'down'): string {
  const arrow = direction === 'up' ? '\u2191' : '\u2193' // Up/down arrows
  return `${arrow} ${formatBytes(bytesPerSec)}/s`
}

// =============================================================================
// FAKE PROCESS DATA
// =============================================================================

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  mem: number
  state: 'R' | 'S' | 'D' | 'Z'
}

const FAKE_PROCESSES: ProcessInfo[] = [
  { pid: 1, name: 'systemd', cpu: 0.1, mem: 0.8, state: 'S' },
  { pid: 234, name: 'node', cpu: 12.3, mem: 4.2, state: 'R' },
  { pid: 456, name: 'bun', cpu: 8.7, mem: 2.1, state: 'R' },
  { pid: 789, name: 'postgres', cpu: 3.4, mem: 8.5, state: 'S' },
  { pid: 1024, name: 'redis-server', cpu: 1.2, mem: 1.8, state: 'S' },
  { pid: 1337, name: 'nginx', cpu: 0.5, mem: 0.3, state: 'S' },
  { pid: 2048, name: 'docker', cpu: 5.6, mem: 6.2, state: 'R' },
  { pid: 4096, name: 'chrome', cpu: 25.8, mem: 15.3, state: 'R' },
]

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // CPU cores (simulate 4 cores)
  const cpu0 = signal(randomWalk(50))
  const cpu1 = signal(randomWalk(30))
  const cpu2 = signal(randomWalk(45))
  const cpu3 = signal(randomWalk(60))

  // Memory
  const memUsed = signal(8.2)  // GB
  const memTotal = signal(16.0) // GB
  const swapUsed = signal(0.5)  // GB
  const swapTotal = signal(4.0) // GB

  // Network
  const netUp = signal(1.2e6)   // bytes/sec
  const netDown = signal(5.8e6) // bytes/sec
  const totalUp = signal(0)     // total bytes sent
  const totalDown = signal(0)   // total bytes received

  // Disk I/O
  const diskRead = signal(2.5e6)  // bytes/sec
  const diskWrite = signal(1.1e6) // bytes/sec

  // Processes
  const processes = signal([...FAKE_PROCESSES])

  // App state
  const paused = signal(false)
  const uptime = signal(0)

  // Panel visibility
  const showCpu = signal(true)
  const showMem = signal(true)
  const showNet = signal(true)
  const showProc = signal(true)

  // ---------------------------------------------------------------------------
  // DERIVED VALUES
  // ---------------------------------------------------------------------------

  // Average CPU across all cores
  const cpuAvg = derived(() => {
    return (cpu0.value + cpu1.value + cpu2.value + cpu3.value) / 4
  })

  // Memory percentage
  const memPercent = derived(() => {
    return (memUsed.value / memTotal.value) * 100
  })

  // Swap percentage
  const swapPercent = derived(() => {
    return (swapUsed.value / swapTotal.value) * 100
  })

  // Format uptime
  const uptimeStr = derived(() => {
    const secs = uptime.value
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  })

  // Status display
  const statusText = derived(() => {
    return paused.value ? 'PAUSED' : 'RUNNING'
  })

  const statusColor = derived(() => {
    return paused.value ? Colors.YELLOW : Colors.GREEN
  })

  // Sorted processes by CPU
  const sortedProcesses = derived(() => {
    return [...processes.value].sort((a, b) => b.cpu - a.cpu)
  })

  // ---------------------------------------------------------------------------
  // UPDATE INTERVALS
  // ---------------------------------------------------------------------------

  const intervals: ReturnType<typeof setInterval>[] = []

  // CPU update (100ms - fast updates for stress test)
  intervals.push(setInterval(() => {
    if (paused.value) return
    cpu0.value = randomWalk(cpu0.value, 8)
    cpu1.value = randomWalk(cpu1.value, 8)
    cpu2.value = randomWalk(cpu2.value, 8)
    cpu3.value = randomWalk(cpu3.value, 8)
  }, 100))

  // Memory update (500ms)
  intervals.push(setInterval(() => {
    if (paused.value) return
    memUsed.value = Math.max(2, Math.min(15.5, memUsed.value + (Math.random() - 0.5) * 0.3))
    swapUsed.value = Math.max(0, Math.min(3.5, swapUsed.value + (Math.random() - 0.5) * 0.1))
  }, 500))

  // Network update (250ms)
  intervals.push(setInterval(() => {
    if (paused.value) return
    netUp.value = Math.max(0, netUp.value + (Math.random() - 0.5) * 5e5)
    netDown.value = Math.max(0, netDown.value + (Math.random() - 0.5) * 2e6)
    totalUp.value += netUp.value * 0.25
    totalDown.value += netDown.value * 0.25
    diskRead.value = Math.max(0, diskRead.value + (Math.random() - 0.5) * 1e6)
    diskWrite.value = Math.max(0, diskWrite.value + (Math.random() - 0.5) * 5e5)
  }, 250))

  // Process update (1000ms)
  intervals.push(setInterval(() => {
    if (paused.value) return
    const updated = processes.value.map(p => ({
      ...p,
      cpu: Math.max(0, p.cpu + (Math.random() - 0.5) * 5),
      mem: Math.max(0, p.mem + (Math.random() - 0.5) * 1),
    }))
    processes.value = updated
  }, 1000))

  // Uptime counter (1000ms)
  intervals.push(setInterval(() => {
    if (paused.value) return
    uptime.value++
  }, 1000))

  // ---------------------------------------------------------------------------
  // RESET FUNCTION
  // ---------------------------------------------------------------------------

  function resetStats() {
    cpu0.value = 25
    cpu1.value = 25
    cpu2.value = 25
    cpu3.value = 25
    memUsed.value = 4.0
    swapUsed.value = 0.1
    netUp.value = 0
    netDown.value = 0
    totalUp.value = 0
    totalDown.value = 0
    diskRead.value = 0
    diskWrite.value = 0
    uptime.value = 0
    processes.value = [...FAKE_PROCESSES]
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const cleanup = await mount(() => {
    box({
      width: 80,
      padding: 1,
      gap: 1,
      bg: Colors.BLACK,
      children: () => {
        // Header
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'TUI System Monitor', fg: Colors.CYAN, attrs: 1 }) // Bold
                text({
                  content: statusText,
                  fg: statusColor,
                })
              },
            })
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'Uptime:', fg: Colors.GRAY })
                text({ content: uptimeStr, fg: Colors.WHITE })
              },
            })
          },
        })

        text({ content: '\u2500'.repeat(78), fg: Colors.GRAY })

        // Main content - two columns
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // Left column - CPU and Memory
            box({
              width: 38,
              gap: 1,
              children: () => {
                // CPU Panel
                box({
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.BLUE,
                  padding: 1,
                  visible: showCpu,
                  children: () => {
                    text({ content: ' CPU Usage ', fg: Colors.BLUE, attrs: 1 })

                    // Average CPU
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Avg:', fg: Colors.GRAY, width: 4 })
                        text({
                          content: derived(() => progressBar(cpuAvg.value)),
                          fg: derived(() => getStatusColor(cpuAvg.value)),
                        })
                        text({
                          content: derived(() => `${cpuAvg.value.toFixed(1)}%`.padStart(6)),
                          fg: derived(() => getStatusColor(cpuAvg.value)),
                        })
                      },
                    })

                    text({ content: '' })

                    // Individual cores
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'CPU0:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(cpu0.value, 14)),
                          fg: derived(() => getStatusColor(cpu0.value)),
                        })
                        text({
                          content: derived(() => `${cpu0.value.toFixed(0)}%`.padStart(4)),
                          fg: derived(() => getStatusColor(cpu0.value)),
                        })
                      },
                    })

                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'CPU1:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(cpu1.value, 14)),
                          fg: derived(() => getStatusColor(cpu1.value)),
                        })
                        text({
                          content: derived(() => `${cpu1.value.toFixed(0)}%`.padStart(4)),
                          fg: derived(() => getStatusColor(cpu1.value)),
                        })
                      },
                    })

                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'CPU2:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(cpu2.value, 14)),
                          fg: derived(() => getStatusColor(cpu2.value)),
                        })
                        text({
                          content: derived(() => `${cpu2.value.toFixed(0)}%`.padStart(4)),
                          fg: derived(() => getStatusColor(cpu2.value)),
                        })
                      },
                    })

                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'CPU3:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(cpu3.value, 14)),
                          fg: derived(() => getStatusColor(cpu3.value)),
                        })
                        text({
                          content: derived(() => `${cpu3.value.toFixed(0)}%`.padStart(4)),
                          fg: derived(() => getStatusColor(cpu3.value)),
                        })
                      },
                    })
                  },
                })

                // Memory Panel
                box({
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.MAGENTA,
                  padding: 1,
                  visible: showMem,
                  children: () => {
                    text({ content: ' Memory ', fg: Colors.MAGENTA, attrs: 1 })

                    // RAM
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'RAM:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(memPercent.value, 14)),
                          fg: derived(() => getStatusColor(memPercent.value)),
                        })
                        text({
                          content: derived(() => `${memUsed.value.toFixed(1)}/${memTotal.value}G`),
                          fg: Colors.WHITE,
                        })
                      },
                    })

                    // Swap
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Swap:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => progressBar(swapPercent.value, 14)),
                          fg: derived(() => getStatusColor(swapPercent.value)),
                        })
                        text({
                          content: derived(() => `${swapUsed.value.toFixed(1)}/${swapTotal.value}G`),
                          fg: Colors.WHITE,
                        })
                      },
                    })
                  },
                })
              },
            })

            // Right column - Network and Processes
            box({
              width: 38,
              gap: 1,
              children: () => {
                // Network Panel
                box({
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.GREEN,
                  padding: 1,
                  visible: showNet,
                  children: () => {
                    text({ content: ' Network & Disk I/O ', fg: Colors.GREEN, attrs: 1 })

                    // Network speeds
                    box({
                      flexDirection: 'row',
                      gap: 2,
                      children: () => {
                        text({ content: 'Net:', fg: Colors.GRAY, width: 4 })
                        text({
                          content: derived(() => formatSpeed(netDown.value, 'down')),
                          fg: Colors.CYAN,
                        })
                        text({
                          content: derived(() => formatSpeed(netUp.value, 'up')),
                          fg: Colors.YELLOW,
                        })
                      },
                    })

                    // Network totals
                    box({
                      flexDirection: 'row',
                      gap: 2,
                      children: () => {
                        text({ content: 'Tot:', fg: Colors.GRAY, width: 4 })
                        text({
                          content: derived(() => `\u2193 ${formatBytes(totalDown.value)}`),
                          fg: Colors.CYAN,
                        })
                        text({
                          content: derived(() => `\u2191 ${formatBytes(totalUp.value)}`),
                          fg: Colors.YELLOW,
                        })
                      },
                    })

                    text({ content: '' })

                    // Disk I/O
                    box({
                      flexDirection: 'row',
                      gap: 2,
                      children: () => {
                        text({ content: 'Disk:', fg: Colors.GRAY, width: 5 })
                        text({
                          content: derived(() => `R: ${formatBytes(diskRead.value)}/s`),
                          fg: Colors.GREEN,
                        })
                        text({
                          content: derived(() => `W: ${formatBytes(diskWrite.value)}/s`),
                          fg: Colors.RED,
                        })
                      },
                    })
                  },
                })

                // Process List Panel
                box({
                  border: BorderStyle.SINGLE,
                  borderColor: Colors.YELLOW,
                  padding: 1,
                  visible: showProc,
                  children: () => {
                    text({ content: ' Top Processes ', fg: Colors.YELLOW, attrs: 1 })

                    // Header
                    box({
                      flexDirection: 'row',
                      children: () => {
                        text({ content: 'PID', fg: Colors.GRAY, width: 6 })
                        text({ content: 'NAME', fg: Colors.GRAY, width: 12 })
                        text({ content: 'CPU%', fg: Colors.GRAY, width: 6 })
                        text({ content: 'MEM%', fg: Colors.GRAY, width: 6 })
                        text({ content: 'S', fg: Colors.GRAY, width: 2 })
                      },
                    })

                    text({ content: '\u2500'.repeat(32), fg: Colors.GRAY })

                    // Process rows - show top 5
                    box({
                      gap: 0,
                      children: () => {
                        // We need to create boxes for each process
                        // Using derived to get current process list
                        const procs = sortedProcesses.value.slice(0, 5)
                        for (const proc of procs) {
                          box({
                            flexDirection: 'row',
                            children: () => {
                              text({
                                content: proc.pid.toString().padEnd(6),
                                fg: Colors.WHITE,
                              })
                              text({
                                content: proc.name.slice(0, 11).padEnd(12),
                                fg: Colors.CYAN,
                              })
                              text({
                                content: proc.cpu.toFixed(1).padStart(5) + ' ',
                                fg: getStatusColor(proc.cpu * 4), // Scale for status
                              })
                              text({
                                content: proc.mem.toFixed(1).padStart(5) + ' ',
                                fg: Colors.WHITE,
                              })
                              text({
                                content: proc.state,
                                fg: proc.state === 'R' ? Colors.GREEN : Colors.GRAY,
                              })
                            },
                          })
                        }
                      },
                    })
                  },
                })
              },
            })
          },
        })

        text({ content: '\u2500'.repeat(78), fg: Colors.GRAY })

        // Footer with controls
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'q', fg: Colors.YELLOW })
                text({ content: 'Quit', fg: Colors.GRAY })
                text({ content: 'r', fg: Colors.YELLOW })
                text({ content: 'Reset', fg: Colors.GRAY })
                text({ content: 'p', fg: Colors.YELLOW })
                text({ content: 'Pause', fg: Colors.GRAY })
              },
            })
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: '1-4', fg: Colors.YELLOW })
                text({ content: 'Toggle panels', fg: Colors.GRAY })
              },
            })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // ---------------------------------------------------------------------------
  // KEYBOARD HANDLERS
  // ---------------------------------------------------------------------------

  const cleanupAndExit = () => {
    // Clean up ALL intervals
    intervals.forEach(clearInterval)
    cleanup()
  }

  keyboard.onKey('q', cleanupAndExit)
  keyboard.onKey('Q', cleanupAndExit)

  keyboard.onKey('r', () => {
    resetStats()
  })
  keyboard.onKey('R', () => {
    resetStats()
  })

  keyboard.onKey('p', () => {
    paused.value = !paused.value
  })
  keyboard.onKey('P', () => {
    paused.value = !paused.value
  })

  // Toggle panels
  keyboard.onKey('1', () => {
    showCpu.value = !showCpu.value
  })
  keyboard.onKey('2', () => {
    showMem.value = !showMem.value
  })
  keyboard.onKey('3', () => {
    showNet.value = !showNet.value
  })
  keyboard.onKey('4', () => {
    showProc.value = !showProc.value
  })
}

main().catch(console.error)
