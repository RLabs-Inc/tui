/**
 * Showcase: Multi-Panel Dashboard
 *
 * A comprehensive dashboard demonstrating advanced flexbox layouts:
 * - Header bar (full width)
 * - Sidebar (fixed width) + Main content (flex grow)
 * - Footer with status information
 * - Nested boxes showcasing flexbox power
 * - Reactive metrics updating in real-time
 * - Theme variants for different panels
 *
 * Controls:
 * - q: Quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, Colors, BorderStyle, Attr } from '../../index'
import type { RGBA } from '../../index'

// =============================================================================
// REACTIVE STATE - Simulated metrics that update over time
// =============================================================================

// Server metrics
const cpuUsage = signal(45)
const memoryUsage = signal(62)
const diskUsage = signal(78)
const networkIn = signal(1.2)
const networkOut = signal(0.8)

// Activity metrics
const requestsPerSec = signal(1250)
const activeUsers = signal(342)
const errorRate = signal(0.02)
const avgResponseTime = signal(145)

// System status
const serverStatus = signal<'online' | 'degraded' | 'offline'>('online')
const lastUpdated = signal(new Date().toLocaleTimeString())
const uptime = signal(0) // seconds

// =============================================================================
// DERIVED VALUES - All reactive computations
// =============================================================================

// Uptime formatted display
const uptimeFormatted = derived(() => {
  const s = uptime.value
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Status color based on server status
const statusColor = derived(() => {
  switch (serverStatus.value) {
    case 'online': return Colors.GREEN
    case 'degraded': return Colors.YELLOW
    case 'offline': return Colors.RED
  }
})

// Uptime with label
const uptimeDisplay = derived(() => `Uptime: ${uptimeFormatted.value}`)

// CPU derived values
const cpuDisplay = derived(() => `${Math.round(cpuUsage.value)}%`)
const cpuColor = derived(() => cpuUsage.value > 80 ? Colors.RED : Colors.GREEN)
const cpuBarColor = derived(() => cpuUsage.value > 80 ? Colors.RED : cpuUsage.value > 60 ? Colors.YELLOW : Colors.GREEN)
const cpuBar = derived(() => progressBar(cpuUsage.value, 24))

// Memory derived values
const memoryDisplay = derived(() => `${Math.round(memoryUsage.value)}%`)
const memoryColor = derived(() => memoryUsage.value > 80 ? Colors.RED : Colors.GREEN)
const memoryBarColor = derived(() => memoryUsage.value > 80 ? Colors.RED : memoryUsage.value > 60 ? Colors.YELLOW : Colors.BLUE)
const memoryBar = derived(() => progressBar(memoryUsage.value, 24))

// Disk derived values
const diskDisplay = derived(() => `${Math.round(diskUsage.value)}%`)
const diskColor = derived(() => diskUsage.value > 90 ? Colors.RED : Colors.GREEN)
const diskBarColor = derived(() => diskUsage.value > 90 ? Colors.RED : diskUsage.value > 75 ? Colors.YELLOW : Colors.MAGENTA)
const diskBar = derived(() => progressBar(diskUsage.value, 24))

// Network I/O derived values
const networkInDisplay = derived(() => `${networkIn.value.toFixed(1)} MB/s`)
const networkOutDisplay = derived(() => `${networkOut.value.toFixed(1)} MB/s`)

// Traffic metrics derived values
const requestsDisplay = derived(() => requestsPerSec.value.toLocaleString())
const activeUsersDisplay = derived(() => activeUsers.value.toString())
const errorRateDisplay = derived(() => `${(errorRate.value * 100).toFixed(2)}%`)
const errorRateColor = derived(() => errorRate.value > 0.05 ? Colors.RED : Colors.GREEN)
const avgResponseDisplay = derived(() => `${avgResponseTime.value}ms`)
const avgResponseColor = derived(() => avgResponseTime.value > 200 ? Colors.YELLOW : Colors.GREEN)

// Footer derived values
const footerCpuDisplay = derived(() => `CPU: ${Math.round(cpuUsage.value)}%`)
const footerCpuColor = derived(() => cpuUsage.value > 80 ? Colors.RED : Colors.GREEN)
const footerMemDisplay = derived(() => `MEM: ${Math.round(memoryUsage.value)}%`)
const footerMemColor = derived(() => memoryUsage.value > 80 ? Colors.RED : Colors.BLUE)
const footerReqDisplay = derived(() => `REQ: ${requestsPerSec.value}/s`)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Create a progress bar visualization */
function progressBar(value: number, width: number): string {
  const filled = Math.round((value / 100) * width)
  const empty = width - filled
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty)
}

// =============================================================================
// PANEL COMPONENTS
// =============================================================================

/** Header Panel */
function Header() {
  box({
    height: 3,
    width: '100%',
    border: BorderStyle.SINGLE,
    padding: 0,
    paddingLeft: 1,
    paddingRight: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    variant: 'primary',
    children: () => {
      // Left: Title
      box({
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
        children: () => {
          text({ content: 'SYSTEM DASHBOARD', attrs: Attr.BOLD })
          text({ content: '|', fg: Colors.GRAY })
          text({ content: 'v2.0.1', fg: Colors.GRAY })
        },
      })

      // Center: Status
      box({
        flexDirection: 'row',
        gap: 1,
        alignItems: 'center',
        children: () => {
          text({ content: 'Status:', fg: Colors.GRAY })
          text({
            content: serverStatus,
            fg: statusColor,
            attrs: Attr.BOLD,
          })
        },
      })

      // Right: Time and Uptime
      box({
        flexDirection: 'row',
        gap: 3,
        alignItems: 'center',
        children: () => {
          text({
            content: uptimeDisplay,
            fg: Colors.CYAN,
          })
          text({
            content: lastUpdated,
            fg: Colors.GRAY,
          })
        },
      })
    },
  })
}

/** Sidebar Panel - Navigation and Quick Stats */
function Sidebar() {
  box({
    width: 28,
    border: BorderStyle.SINGLE,
    flexDirection: 'column',
    variant: 'surface',
    children: () => {
      // Sidebar header
      box({
        padding: 1,
        borderBottom: BorderStyle.SINGLE,
        children: () => {
          text({ content: 'QUICK STATS', attrs: Attr.BOLD, fg: Colors.WHITE })
        },
      })

      // Server Resources
      box({
        padding: 1,
        gap: 1,
        children: () => {
          text({ content: 'Resources', fg: Colors.CYAN, attrs: Attr.BOLD })

          // CPU
          box({
            gap: 0,
            children: () => {
              box({
                flexDirection: 'row',
                justifyContent: 'space-between',
                children: () => {
                  text({ content: 'CPU', fg: Colors.GRAY })
                  text({ content: cpuDisplay, fg: cpuColor })
                },
              })
              text({ content: cpuBar, fg: cpuBarColor })
            },
          })

          // Memory
          box({
            gap: 0,
            children: () => {
              box({
                flexDirection: 'row',
                justifyContent: 'space-between',
                children: () => {
                  text({ content: 'Memory', fg: Colors.GRAY })
                  text({ content: memoryDisplay, fg: memoryColor })
                },
              })
              text({ content: memoryBar, fg: memoryBarColor })
            },
          })

          // Disk
          box({
            gap: 0,
            children: () => {
              box({
                flexDirection: 'row',
                justifyContent: 'space-between',
                children: () => {
                  text({ content: 'Disk', fg: Colors.GRAY })
                  text({ content: diskDisplay, fg: diskColor })
                },
              })
              text({ content: diskBar, fg: diskBarColor })
            },
          })
        },
      })

      // Network I/O
      box({
        padding: 1,
        borderTop: BorderStyle.SINGLE,
        gap: 1,
        children: () => {
          text({ content: 'Network I/O', fg: Colors.CYAN, attrs: Attr.BOLD })
          box({
            flexDirection: 'row',
            justifyContent: 'space-between',
            children: () => {
              text({ content: 'In:', fg: Colors.GRAY })
              text({ content: networkInDisplay, fg: Colors.GREEN })
            },
          })
          box({
            flexDirection: 'row',
            justifyContent: 'space-between',
            children: () => {
              text({ content: 'Out:', fg: Colors.GRAY })
              text({ content: networkOutDisplay, fg: Colors.YELLOW })
            },
          })
        },
      })

      // Quick Actions
      box({
        padding: 1,
        borderTop: BorderStyle.SINGLE,
        grow: 1,
        children: () => {
          text({ content: 'Navigation', fg: Colors.CYAN, attrs: Attr.BOLD })
          text({ content: '' })
          text({ content: '[q]   Quit', fg: Colors.GRAY })
        },
      })
    },
  })
}

/** Main Content Area with multiple panels */
function MainContent() {
  box({
    grow: 1,
    flexDirection: 'column',
    gap: 1,
    children: () => {
      // Top row: Two equal panels
      box({
        flexDirection: 'row',
        gap: 1,
        grow: 1,
        children: () => {
          // Traffic Panel
          box({
            grow: 1,
            border: BorderStyle.SINGLE,
            variant: 'surface',
            flexDirection: 'column',
            children: () => {
              box({
                padding: 1,
                borderBottom: BorderStyle.SINGLE,
                children: () => {
                  text({ content: 'TRAFFIC METRICS', attrs: Attr.BOLD, fg: Colors.WHITE })
                },
              })
              box({
                padding: 1,
                gap: 1,
                children: () => {
                  box({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    children: () => {
                      text({ content: 'Requests/sec', fg: Colors.GRAY })
                      text({
                        content: requestsDisplay,
                        fg: Colors.GREEN,
                        attrs: Attr.BOLD,
                      })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    children: () => {
                      text({ content: 'Active Users', fg: Colors.GRAY })
                      text({
                        content: activeUsersDisplay,
                        fg: Colors.CYAN,
                        attrs: Attr.BOLD,
                      })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    children: () => {
                      text({ content: 'Error Rate', fg: Colors.GRAY })
                      text({
                        content: errorRateDisplay,
                        fg: errorRateColor,
                      })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    children: () => {
                      text({ content: 'Avg Response', fg: Colors.GRAY })
                      text({
                        content: avgResponseDisplay,
                        fg: avgResponseColor,
                      })
                    },
                  })
                },
              })
            },
          })

          // Performance Panel
          box({
            grow: 1,
            border: BorderStyle.SINGLE,
            variant: 'surface',
            flexDirection: 'column',
            children: () => {
              box({
                padding: 1,
                borderBottom: BorderStyle.SINGLE,
                children: () => {
                  text({ content: 'PERFORMANCE', attrs: Attr.BOLD, fg: Colors.WHITE })
                },
              })
              box({
                padding: 1,
                flexDirection: 'column',
                gap: 1,
                children: () => {
                  // Latency distribution visualization
                  text({ content: 'Response Time Distribution', fg: Colors.CYAN })
                  box({
                    flexDirection: 'row',
                    gap: 1,
                    alignItems: 'flex-end',
                    height: 5,
                    children: () => {
                      // Simple bar chart simulation
                      const bars = [
                        { label: '<50', height: 4 },
                        { label: '50-100', height: 3 },
                        { label: '100-200', height: 2 },
                        { label: '200-500', height: 1 },
                        { label: '>500', height: 0 },
                      ]
                      bars.forEach((bar, i) => {
                        box({
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: 7,
                          children: () => {
                            if (bar.height > 0) {
                              box({
                                width: 5,
                                height: bar.height,
                                bg: i < 2 ? Colors.GREEN : i < 4 ? Colors.YELLOW : Colors.RED,
                              })
                            }
                            text({ content: bar.label, fg: Colors.GRAY })
                          },
                        })
                      })
                    },
                  })
                  text({ content: 'ms', fg: Colors.GRAY })
                },
              })
            },
          })
        },
      })

      // Bottom row: Three panels using space-between
      box({
        flexDirection: 'row',
        gap: 1,
        height: 8,
        children: () => {
          // Alerts Panel
          box({
            grow: 1,
            border: BorderStyle.SINGLE,
            flexDirection: 'column',
            children: () => {
              box({
                paddingLeft: 1,
                paddingRight: 1,
                borderBottom: BorderStyle.SINGLE,
                variant: 'warning',
                children: () => {
                  text({ content: 'ALERTS', attrs: Attr.BOLD })
                },
              })
              box({
                padding: 1,
                gap: 0,
                children: () => {
                  text({ content: '[!] High memory usage on node-3', fg: Colors.YELLOW })
                  text({ content: '[!] Disk space low on node-1', fg: Colors.YELLOW })
                  text({ content: '[i] Scheduled maintenance 02:00', fg: Colors.CYAN })
                },
              })
            },
          })

          // Services Panel
          box({
            grow: 1,
            border: BorderStyle.SINGLE,
            flexDirection: 'column',
            children: () => {
              box({
                paddingLeft: 1,
                paddingRight: 1,
                borderBottom: BorderStyle.SINGLE,
                variant: 'success',
                children: () => {
                  text({ content: 'SERVICES', attrs: Attr.BOLD })
                },
              })
              box({
                padding: 1,
                gap: 0,
                children: () => {
                  box({
                    flexDirection: 'row',
                    gap: 2,
                    children: () => {
                      text({ content: '\u25CF', fg: Colors.GREEN })
                      text({ content: 'API Gateway', fg: Colors.WHITE })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    gap: 2,
                    children: () => {
                      text({ content: '\u25CF', fg: Colors.GREEN })
                      text({ content: 'Database', fg: Colors.WHITE })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    gap: 2,
                    children: () => {
                      text({ content: '\u25CF', fg: Colors.YELLOW })
                      text({ content: 'Cache', fg: Colors.WHITE })
                    },
                  })
                  box({
                    flexDirection: 'row',
                    gap: 2,
                    children: () => {
                      text({ content: '\u25CF', fg: Colors.GREEN })
                      text({ content: 'Queue', fg: Colors.WHITE })
                    },
                  })
                },
              })
            },
          })

          // Nodes Panel
          box({
            grow: 1,
            border: BorderStyle.SINGLE,
            flexDirection: 'column',
            children: () => {
              box({
                paddingLeft: 1,
                paddingRight: 1,
                borderBottom: BorderStyle.SINGLE,
                variant: 'info',
                children: () => {
                  text({ content: 'CLUSTER NODES', attrs: Attr.BOLD })
                },
              })
              box({
                padding: 1,
                gap: 0,
                children: () => {
                  for (let i = 1; i <= 4; i++) {
                    box({
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      children: () => {
                        text({ content: `node-${i}`, fg: Colors.WHITE })
                        text({
                          content: i === 3 ? 'busy' : 'ready',
                          fg: i === 3 ? Colors.YELLOW : Colors.GREEN,
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
}

/** Footer Panel */
function Footer() {
  box({
    height: 3,
    width: '100%',
    border: BorderStyle.SINGLE,
    paddingLeft: 1,
    paddingRight: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    variant: 'muted',
    children: () => {
      // Left: Quick info
      box({
        flexDirection: 'row',
        gap: 3,
        children: () => {
          text({ content: 'TUI Dashboard Demo', fg: Colors.GRAY })
          text({ content: '|', fg: Colors.GRAY })
          text({ content: footerCpuDisplay, fg: footerCpuColor })
          text({ content: footerMemDisplay, fg: footerMemColor })
          text({ content: footerReqDisplay, fg: Colors.CYAN })
        },
      })

      // Right: Controls hint
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({ content: 'Press', fg: Colors.GRAY })
          text({ content: 'q', fg: Colors.WHITE, attrs: Attr.BOLD })
          text({ content: 'to quit', fg: Colors.GRAY })
        },
      })
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // Simulate metric updates
  const metricsInterval = setInterval(() => {
    // Add some randomness to metrics
    cpuUsage.value = Math.max(10, Math.min(95, cpuUsage.value + (Math.random() - 0.5) * 10))
    memoryUsage.value = Math.max(30, Math.min(90, memoryUsage.value + (Math.random() - 0.5) * 5))
    diskUsage.value = Math.max(50, Math.min(95, diskUsage.value + (Math.random() - 0.5) * 2))
    networkIn.value = Math.max(0.1, Math.min(5, networkIn.value + (Math.random() - 0.5) * 0.5))
    networkOut.value = Math.max(0.1, Math.min(3, networkOut.value + (Math.random() - 0.5) * 0.3))
    requestsPerSec.value = Math.max(500, Math.min(3000, requestsPerSec.value + Math.floor((Math.random() - 0.5) * 200)))
    activeUsers.value = Math.max(100, Math.min(1000, activeUsers.value + Math.floor((Math.random() - 0.5) * 50)))
    errorRate.value = Math.max(0, Math.min(0.1, errorRate.value + (Math.random() - 0.5) * 0.01))
    avgResponseTime.value = Math.max(50, Math.min(300, avgResponseTime.value + Math.floor((Math.random() - 0.5) * 20)))
    lastUpdated.value = new Date().toLocaleTimeString()
  }, 1000)

  // Track uptime
  const uptimeInterval = setInterval(() => {
    uptime.value++
  }, 1000)

  // Occasionally toggle server status for demo
  const statusInterval = setInterval(() => {
    const rand = Math.random()
    if (rand < 0.05) {
      serverStatus.value = 'degraded'
      setTimeout(() => {
        serverStatus.value = 'online'
      }, 3000)
    }
  }, 5000)

  // Mount the application
  const cleanup = await mount(() => {
    // Root container - full screen column layout
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      children: () => {
        // Header
        Header()

        // Main area: Sidebar + Content
        box({
          grow: 1,
          flexDirection: 'row',
          gap: 1,
          padding: 1,
          children: () => {
            Sidebar()
            MainContent()
          },
        })

        // Footer
        Footer()
      },
    })
  }, { mode: 'fullscreen', mouse: false })

  // Cleanup function
  const doCleanup = () => {
    clearInterval(metricsInterval)
    clearInterval(uptimeInterval)
    clearInterval(statusInterval)
    cleanup()
  }

  // Key bindings
  keyboard.onKey('q', doCleanup)
  keyboard.onKey('Q', doCleanup)
}

main().catch(console.error)
