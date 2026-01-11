/**
 * Showcase 13: Real-time Log Viewer
 *
 * Demonstrates:
 * - Real-time streaming data (simulated log messages)
 * - Color-coded log levels (INFO, WARN, ERROR, DEBUG)
 * - Filtering by log level (toggle with 1-4 keys)
 * - Auto-scroll to bottom on new logs
 * - Pause/resume auto-scroll with Space
 * - Clear logs with 'c'
 * - Scrollable container with overflow
 * - Dynamic header showing stats and filter status
 *
 * A realistic log monitoring tool for terminal applications.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, scroll, Colors, BorderStyle, type RGBA } from '../../index'

// =============================================================================
// TYPES
// =============================================================================

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface LogEntry {
  id: number
  level: LogLevel
  message: string
  timestamp: string
  source: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_LOGS = 100
const LOG_SOURCES = ['api', 'db', 'auth', 'cache', 'worker', 'http', 'queue']
const LOG_MESSAGES: Record<LogLevel, string[]> = {
  INFO: [
    'Server started on port 3000',
    'Database connection established',
    'Cache warmed up successfully',
    'Request processed in 42ms',
    'User session created',
    'Background job completed',
    'Health check passed',
    'Configuration loaded',
    'WebSocket client connected',
    'Email sent successfully',
  ],
  WARN: [
    'High memory usage detected (85%)',
    'Slow query detected (>1000ms)',
    'Rate limit approaching for IP 192.168.1.1',
    'Certificate expires in 7 days',
    'Deprecated API endpoint called',
    'Cache miss rate above threshold',
    'Connection pool nearly exhausted',
    'Retry attempt 2/3 for external API',
  ],
  ERROR: [
    'Failed to connect to database',
    'Authentication failed for user admin',
    'Timeout waiting for response',
    'Invalid JSON in request body',
    'File not found: /data/config.json',
    'Out of memory error',
    'Permission denied for resource',
    'External API returned 500',
  ],
  DEBUG: [
    'Parsing request headers',
    'Query execution plan: full scan',
    'Cache key: user:1234:profile',
    'Response serialized in 2ms',
    'GC triggered, freed 128MB',
    'Socket buffer size: 4096',
    'Thread pool stats: 4/8 active',
    'Middleware chain: [auth, log, cors]',
  ],
}

// Colors for each log level
const LEVEL_COLORS: Record<LogLevel, RGBA> = {
  INFO: Colors.GREEN,
  WARN: Colors.YELLOW,
  ERROR: Colors.RED,
  DEBUG: Colors.GRAY,
}

// =============================================================================
// STATE
// =============================================================================

// Log storage
const logs = signal<LogEntry[]>([])
let logIdCounter = 0

// Filter toggles (true = show, false = hide)
const showInfo = signal(true)
const showWarn = signal(true)
const showError = signal(true)
const showDebug = signal(true)

// Auto-scroll toggle
const autoScroll = signal(true)

// Pause log generation
const paused = signal(false)

// Track the scrollable container index for manual scrolling
let scrollableIndex = -1

// =============================================================================
// HELPERS
// =============================================================================

function getTimestamp(): string {
  const now = new Date()
  return now.toTimeString().slice(0, 8) + '.' + now.getMilliseconds().toString().padStart(3, '0')
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function generateLog(): LogEntry {
  // Weight the log levels: more INFO, fewer ERRORs
  const weights: LogLevel[] = [
    'INFO', 'INFO', 'INFO', 'INFO',
    'DEBUG', 'DEBUG', 'DEBUG',
    'WARN', 'WARN',
    'ERROR',
  ]
  const level = randomChoice(weights)

  return {
    id: ++logIdCounter,
    level,
    message: randomChoice(LOG_MESSAGES[level]),
    timestamp: getTimestamp(),
    source: randomChoice(LOG_SOURCES),
  }
}

function addLog(entry: LogEntry) {
  const current = logs.value
  const newLogs = [...current, entry]
  // Keep only the last MAX_LOGS entries
  if (newLogs.length > MAX_LOGS) {
    logs.value = newLogs.slice(-MAX_LOGS)
  } else {
    logs.value = newLogs
  }
}

function clearLogs() {
  logs.value = []
  logIdCounter = 0
}

// =============================================================================
// DERIVED VALUES
// =============================================================================

// Filtered logs based on level toggles
const filteredLogs = derived(() => {
  return logs.value.filter(log => {
    switch (log.level) {
      case 'INFO': return showInfo.value
      case 'WARN': return showWarn.value
      case 'ERROR': return showError.value
      case 'DEBUG': return showDebug.value
      default: return true
    }
  })
})

// Count logs by level
const infoCnt = derived(() => logs.value.filter(l => l.level === 'INFO').length)
const warnCnt = derived(() => logs.value.filter(l => l.level === 'WARN').length)
const errorCnt = derived(() => logs.value.filter(l => l.level === 'ERROR').length)
const debugCnt = derived(() => logs.value.filter(l => l.level === 'DEBUG').length)

// Filter status display
const filterStatus = derived(() => {
  const parts: string[] = []
  if (showInfo.value) parts.push('INFO')
  if (showWarn.value) parts.push('WARN')
  if (showError.value) parts.push('ERROR')
  if (showDebug.value) parts.push('DEBUG')
  return parts.length === 4 ? 'ALL' : parts.join(' ')
})

// Auto-scroll status
const scrollStatus = derived(() => autoScroll.value ? 'AUTO' : 'MANUAL')

// Paused status
const pausedStatus = derived(() => paused.value ? '[PAUSED]' : '')

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // Generate some initial logs
  for (let i = 0; i < 15; i++) {
    addLog(generateLog())
  }

  // Start log generation interval
  const logInterval = setInterval(() => {
    if (!paused.value) {
      addLog(generateLog())

      // Auto-scroll to bottom when new logs arrive
      if (autoScroll.value && scrollableIndex >= 0) {
        // Use setTimeout to let the layout update first
        setTimeout(() => {
          scroll.scrollToBottom(scrollableIndex)
        }, 0)
      }
    }
  }, 500 + Math.random() * 1000) // Random interval 500-1500ms

  const cleanup = await mount(() => {
    // Main container
    box({
      width: 100,
      padding: 1,
      gap: 1,
      bg: Colors.BLACK,
      children: () => {
        // =======================================================================
        // HEADER
        // =======================================================================
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            // Title and status
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: 'LOG VIEWER', fg: Colors.CYAN, attrs: 1 })
                text({ content: pausedStatus, fg: Colors.YELLOW })
              },
            })

            // Scroll mode
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'Scroll:', fg: Colors.GRAY })
                text({
                  content: scrollStatus,
                  fg: derived(() => autoScroll.value ? Colors.GREEN : Colors.YELLOW),
                })
              },
            })
          },
        })

        // =======================================================================
        // STATS BAR
        // =======================================================================
        box({
          flexDirection: 'row',
          gap: 3,
          children: () => {
            // Total count
            text({
              content: derived(() => `Total: ${logs.value.length}`),
              fg: Colors.WHITE,
            })

            // Level counts
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({
                  content: derived(() => `INFO:${infoCnt.value}`),
                  fg: derived(() => showInfo.value ? Colors.GREEN : Colors.GRAY),
                })
                text({
                  content: derived(() => `WARN:${warnCnt.value}`),
                  fg: derived(() => showWarn.value ? Colors.YELLOW : Colors.GRAY),
                })
                text({
                  content: derived(() => `ERR:${errorCnt.value}`),
                  fg: derived(() => showError.value ? Colors.RED : Colors.GRAY),
                })
                text({
                  content: derived(() => `DBG:${debugCnt.value}`),
                  fg: derived(() => showDebug.value ? Colors.GRAY : Colors.GRAY),
                })
              },
            })

            // Filter status
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'Filter:', fg: Colors.GRAY })
                text({ content: filterStatus, fg: Colors.CYAN })
              },
            })

            // Visible count
            text({
              content: derived(() => `Showing: ${filteredLogs.value.length}`),
              fg: Colors.WHITE,
            })
          },
        })

        text({ content: '\u2500'.repeat(98), fg: Colors.GRAY })

        // =======================================================================
        // LOG LIST (Scrollable)
        // =======================================================================
        box({
          id: 'log-container',
          height: 20,
          border: BorderStyle.SINGLE,
          borderColor: Colors.BLUE,
          overflow: 'scroll',
          children: () => {
            // Store the scrollable index for auto-scroll
            // We need to get it after the component is created
            // Using a hack: the box with overflow scroll is the current index

            // Render filtered log entries
            const logsToShow = filteredLogs.value
            for (const log of logsToShow) {
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  // Timestamp
                  text({
                    content: log.timestamp,
                    fg: Colors.GRAY,
                    width: 12,
                  })

                  // Level badge
                  text({
                    content: `[${log.level}]`.padEnd(7),
                    fg: LEVEL_COLORS[log.level],
                    width: 7,
                  })

                  // Source
                  text({
                    content: `[${log.source}]`.padEnd(9),
                    fg: Colors.CYAN,
                    width: 9,
                  })

                  // Message
                  text({
                    content: log.message,
                    fg: Colors.WHITE,
                    grow: 1,
                  })
                },
              })
            }

            // Empty state
            if (logsToShow.length === 0) {
              box({
                alignItems: 'center',
                justifyContent: 'center',
                grow: 1,
                children: () => {
                  text({
                    content: logs.value.length === 0
                      ? 'No logs yet...'
                      : 'No logs match current filters',
                    fg: Colors.GRAY,
                  })
                },
              })
            }
          },
        })

        text({ content: '\u2500'.repeat(98), fg: Colors.GRAY })

        // =======================================================================
        // HELP FOOTER
        // =======================================================================
        box({
          gap: 1,
          children: () => {
            // First row - filter keys
            box({
              flexDirection: 'row',
              gap: 3,
              children: () => {
                text({ content: 'Filters:', fg: Colors.GRAY })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '1', fg: Colors.WHITE })
                    text({
                      content: 'INFO',
                      fg: derived(() => showInfo.value ? Colors.GREEN : Colors.GRAY),
                    })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '2', fg: Colors.WHITE })
                    text({
                      content: 'WARN',
                      fg: derived(() => showWarn.value ? Colors.YELLOW : Colors.GRAY),
                    })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '3', fg: Colors.WHITE })
                    text({
                      content: 'ERROR',
                      fg: derived(() => showError.value ? Colors.RED : Colors.GRAY),
                    })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: '4', fg: Colors.WHITE })
                    text({
                      content: 'DEBUG',
                      fg: derived(() => showDebug.value ? Colors.GRAY : Colors.GRAY),
                    })
                  },
                })

                text({ content: '|', fg: Colors.GRAY })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'a', fg: Colors.WHITE })
                    text({ content: 'All', fg: Colors.CYAN })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'n', fg: Colors.WHITE })
                    text({ content: 'None', fg: Colors.CYAN })
                  },
                })
              },
            })

            // Second row - actions
            box({
              flexDirection: 'row',
              gap: 3,
              children: () => {
                text({ content: 'Actions:', fg: Colors.GRAY })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'Space', fg: Colors.WHITE })
                    text({ content: 'Toggle auto-scroll', fg: Colors.GREEN })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'p', fg: Colors.WHITE })
                    text({ content: 'Pause/Resume', fg: Colors.YELLOW })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'c', fg: Colors.WHITE })
                    text({ content: 'Clear', fg: Colors.RED })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'q', fg: Colors.WHITE })
                    text({ content: 'Quit', fg: Colors.RED })
                  },
                })
              },
            })

            // Third row - scroll help
            box({
              flexDirection: 'row',
              gap: 3,
              children: () => {
                text({ content: 'Scroll:', fg: Colors.GRAY })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'j/k or ↑/↓', fg: Colors.WHITE })
                    text({ content: 'Line', fg: Colors.CYAN })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'PgUp/PgDn', fg: Colors.WHITE })
                    text({ content: 'Page', fg: Colors.CYAN })
                  },
                })

                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    text({ content: 'g/G', fg: Colors.WHITE })
                    text({ content: 'Top/Bottom', fg: Colors.CYAN })
                  },
                })
              },
            })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Find the scrollable container by ID after mount
  // For now, we'll track scroll manually with keyboard

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  // Filter toggles
  keyboard.onKey('1', () => {
    showInfo.value = !showInfo.value
    return true
  })

  keyboard.onKey('2', () => {
    showWarn.value = !showWarn.value
    return true
  })

  keyboard.onKey('3', () => {
    showError.value = !showError.value
    return true
  })

  keyboard.onKey('4', () => {
    showDebug.value = !showDebug.value
    return true
  })

  // Show all filters
  keyboard.onKey(['a', 'A'], () => {
    showInfo.value = true
    showWarn.value = true
    showError.value = true
    showDebug.value = true
    return true
  })

  // Hide all filters (show none)
  keyboard.onKey(['n', 'N'], () => {
    showInfo.value = false
    showWarn.value = false
    showError.value = false
    showDebug.value = false
    return true
  })

  // Toggle auto-scroll
  keyboard.onKey(' ', () => {
    autoScroll.value = !autoScroll.value
    return true
  })

  // Pause/resume log generation
  keyboard.onKey(['p', 'P'], () => {
    paused.value = !paused.value
    return true
  })

  // Clear logs
  keyboard.onKey(['c', 'C'], () => {
    clearLogs()
    return true
  })

  // Manual scroll (vim-style)
  keyboard.onKey(['j', 'ArrowDown'], () => {
    // Disable auto-scroll when manually scrolling
    if (autoScroll.value) {
      autoScroll.value = false
    }
    return true
  })

  keyboard.onKey(['k', 'ArrowUp'], () => {
    if (autoScroll.value) {
      autoScroll.value = false
    }
    return true
  })

  // Jump to top
  keyboard.onKey('g', () => {
    autoScroll.value = false
    return true
  })

  // Jump to bottom and enable auto-scroll
  keyboard.onKey('G', () => {
    autoScroll.value = true
    return true
  })

  // Page scroll
  keyboard.onKey('PageUp', () => {
    autoScroll.value = false
    return true
  })

  keyboard.onKey('PageDown', () => {
    // Don't disable auto-scroll for page down
    return true
  })

  // Quit
  const cleanupAndExit = () => {
    clearInterval(logInterval)
    cleanup()
  }

  keyboard.onKey(['q', 'Q'], cleanupAndExit)
}

main().catch(console.error)
