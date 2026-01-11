/**
 * Showcase 05: Scrollable List
 *
 * Demonstrates:
 * - Scrollable containers with overflow: 'scroll'
 * - Keyboard navigation (arrow keys, page up/down, home/end)
 * - Visual selection highlighting
 * - Scroll position indicators
 * - Auto-scroll when content exceeds container
 *
 * A file browser-like list that feels responsive and natural.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, scroll, Colors, BorderStyle } from '../../index'

// =============================================================================
// FILE LIST DATA
// =============================================================================

interface FileItem {
  name: string
  type: 'file' | 'folder'
  size?: string
  modified?: string
}

const files: FileItem[] = [
  { name: '..', type: 'folder' },
  { name: '.git', type: 'folder' },
  { name: 'node_modules', type: 'folder' },
  { name: 'src', type: 'folder' },
  { name: 'tests', type: 'folder' },
  { name: 'docs', type: 'folder' },
  { name: 'examples', type: 'folder' },
  { name: 'dist', type: 'folder' },
  { name: '.gitignore', type: 'file', size: '245 B', modified: 'Jan 5' },
  { name: '.npmrc', type: 'file', size: '89 B', modified: 'Dec 12' },
  { name: 'README.md', type: 'file', size: '4.2 KB', modified: 'Jan 8' },
  { name: 'package.json', type: 'file', size: '1.8 KB', modified: 'Jan 10' },
  { name: 'tsconfig.json', type: 'file', size: '892 B', modified: 'Dec 28' },
  { name: 'bun.lock', type: 'file', size: '156 KB', modified: 'Jan 10' },
  { name: 'index.ts', type: 'file', size: '2.1 KB', modified: 'Jan 9' },
  { name: 'CHANGELOG.md', type: 'file', size: '12.4 KB', modified: 'Jan 7' },
  { name: 'LICENSE', type: 'file', size: '1.1 KB', modified: 'Nov 15' },
  { name: '.eslintrc.json', type: 'file', size: '456 B', modified: 'Dec 1' },
  { name: '.prettierrc', type: 'file', size: '123 B', modified: 'Dec 1' },
  { name: 'jest.config.js', type: 'file', size: '678 B', modified: 'Dec 15' },
  { name: 'vitest.config.ts', type: 'file', size: '445 B', modified: 'Jan 2' },
  { name: 'CONTRIBUTING.md', type: 'file', size: '3.2 KB', modified: 'Dec 20' },
  { name: 'CODE_OF_CONDUCT.md', type: 'file', size: '2.8 KB', modified: 'Nov 10' },
  { name: 'SECURITY.md', type: 'file', size: '1.5 KB', modified: 'Nov 10' },
  { name: '.env.example', type: 'file', size: '234 B', modified: 'Dec 5' },
  { name: 'docker-compose.yml', type: 'file', size: '1.2 KB', modified: 'Dec 18' },
  { name: 'Dockerfile', type: 'file', size: '567 B', modified: 'Dec 18' },
  { name: 'Makefile', type: 'file', size: '2.3 KB', modified: 'Jan 3' },
  { name: '.dockerignore', type: 'file', size: '145 B', modified: 'Dec 18' },
  { name: 'renovate.json', type: 'file', size: '234 B', modified: 'Nov 20' },
  { name: '.github', type: 'folder' },
  { name: 'scripts', type: 'folder' },
  { name: 'types', type: 'folder' },
  { name: 'patches', type: 'folder' },
  { name: 'benchmarks', type: 'folder' },
]

// =============================================================================
// STATE
// =============================================================================

const selectedIndex = signal(0)
const confirmedSelection = signal<FileItem | null>(null)

// Visible height of the list (in lines)
const VISIBLE_HEIGHT = 15

// Derived values for display
const selectedItem = derived(() => files[selectedIndex.value])
const totalItems = files.length

// Calculate visible range for scroll indicator
const visibleStart = derived(() => {
  // Approximate based on selection - scroll should keep selection visible
  const sel = selectedIndex.value
  if (sel < VISIBLE_HEIGHT) return 1
  return Math.min(sel - Math.floor(VISIBLE_HEIGHT / 2), totalItems - VISIBLE_HEIGHT + 1)
})

const visibleEnd = derived(() => {
  return Math.min(visibleStart.value + VISIBLE_HEIGHT - 1, totalItems)
})

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

function moveSelection(delta: number) {
  const newIndex = selectedIndex.value + delta
  if (newIndex >= 0 && newIndex < totalItems) {
    selectedIndex.value = newIndex
  }
}

function moveToTop() {
  selectedIndex.value = 0
}

function moveToBottom() {
  selectedIndex.value = totalItems - 1
}

function pageUp() {
  moveSelection(-VISIBLE_HEIGHT)
  if (selectedIndex.value < 0) selectedIndex.value = 0
}

function pageDown() {
  moveSelection(VISIBLE_HEIGHT)
  if (selectedIndex.value >= totalItems) selectedIndex.value = totalItems - 1
}

function confirmSelection() {
  confirmedSelection.value = files[selectedIndex.value] ?? null
}

// =============================================================================
// FILE ICON HELPER
// =============================================================================

function getIcon(type: 'file' | 'folder'): string {
  return type === 'folder' ? '>' : '-'
}

function getIconColor(type: 'file' | 'folder') {
  return type === 'folder' ? Colors.YELLOW : Colors.CYAN
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Main container
    box({
      width: 80,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        // Header
        text({ content: 'SCROLLABLE LIST - File Browser Demo', fg: Colors.CYAN })
        text({ content: '-'.repeat(78), fg: Colors.GRAY })

        // Current path
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            text({ content: 'Path:', fg: Colors.GRAY })
            text({ content: '/Users/demo/projects/tui-framework', fg: Colors.WHITE })
          },
        })

        text({ content: '' })

        // Main content area with list and info panel
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            // Left side: Scrollable file list
            box({
              width: 50,
              height: VISIBLE_HEIGHT + 2, // +2 for border
              border: BorderStyle.SINGLE,
              borderColor: Colors.BLUE,
              overflow: 'scroll',
              children: () => {
                // Render all file items
                for (let i = 0; i < files.length; i++) {
                  const file = files[i]!
                  const index = i // Capture for closure

                  box({
                    flexDirection: 'row',
                    // Highlight selected row
                    bg: derived(() => selectedIndex.value === index ? Colors.BLUE : Colors.TRANSPARENT),
                    children: () => {
                      // Icon
                      text({
                        content: getIcon(file.type),
                        fg: getIconColor(file.type),
                        width: 2,
                      })
                      // Filename
                      text({
                        content: file.name,
                        fg: derived(() => {
                          if (selectedIndex.value === index) return Colors.WHITE
                          return file.type === 'folder' ? Colors.YELLOW : Colors.WHITE
                        }),
                        grow: 1,
                      })
                      // Size (for files only)
                      if (file.size) {
                        text({
                          content: file.size,
                          fg: Colors.GRAY,
                          width: 10,
                          align: 'right',
                        })
                      }
                    },
                  })
                }
              },
            })

            // Right side: Info panel
            box({
              grow: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              padding: 1,
              children: () => {
                text({ content: 'Selected Item', fg: Colors.CYAN })
                text({ content: '-'.repeat(22), fg: Colors.GRAY })

                text({ content: '' })

                // Show selected item details
                box({
                  gap: 1,
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Name:', fg: Colors.GRAY, width: 10 })
                        text({ content: derived(() => selectedItem.value?.name ?? ''), fg: Colors.WHITE })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Type:', fg: Colors.GRAY, width: 10 })
                        text({
                          content: derived(() => selectedItem.value?.type ?? ''),
                          fg: derived(() => selectedItem.value?.type === 'folder' ? Colors.YELLOW : Colors.CYAN),
                        })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Size:', fg: Colors.GRAY, width: 10 })
                        text({ content: derived(() => selectedItem.value?.size ?? '-'), fg: Colors.WHITE })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: 'Modified:', fg: Colors.GRAY, width: 10 })
                        text({ content: derived(() => selectedItem.value?.modified ?? '-'), fg: Colors.WHITE })
                      },
                    })
                  },
                })

                text({ content: '' })
                text({ content: '-'.repeat(22), fg: Colors.GRAY })

                // Last confirmed selection
                text({ content: 'Last Opened', fg: Colors.GREEN })
                text({
                  content: derived(() => confirmedSelection.value?.name ?? '(none)'),
                  fg: derived(() => confirmedSelection.value ? Colors.WHITE : Colors.GRAY),
                })
              },
            })
          },
        })

        // Scroll position indicator
        text({ content: '' })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({
              content: derived(() => `Showing ${visibleStart.value}-${visibleEnd.value} of ${totalItems}`),
              fg: Colors.GRAY,
            })
            // Visual scroll bar
            text({
              content: derived(() => {
                const pos = Math.floor((selectedIndex.value / (totalItems - 1)) * 10)
                const bar = '.'.repeat(10).split('')
                bar[Math.min(pos, 9)] = ''
                return '[' + bar.join('') + ']'
              }),
              fg: Colors.BLUE,
            })
            text({
              content: derived(() => `Item ${selectedIndex.value + 1}/${totalItems}`),
              fg: Colors.CYAN,
            })
          },
        })

        // Help footer
        text({ content: '' })
        text({ content: '-'.repeat(78), fg: Colors.GRAY })
        box({
          flexDirection: 'row',
          gap: 3,
          children: () => {
            text({ content: '/: Navigate', fg: Colors.GRAY })
            text({ content: 'PgUp/PgDn: Page', fg: Colors.GRAY })
            text({ content: 'Home/End: Jump', fg: Colors.GRAY })
            text({ content: 'Enter: Open', fg: Colors.GREEN })
            text({ content: 'q: Quit', fg: Colors.RED })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  // Arrow navigation
  keyboard.onKey('ArrowUp', () => {
    moveSelection(-1)
    return true
  })
  keyboard.onKey('ArrowDown', () => {
    moveSelection(1)
    return true
  })

  // Vim-style navigation
  keyboard.onKey('k', () => {
    moveSelection(-1)
    return true
  })
  keyboard.onKey('j', () => {
    moveSelection(1)
    return true
  })

  // Page navigation
  keyboard.onKey('PageUp', () => {
    pageUp()
    return true
  })
  keyboard.onKey('PageDown', () => {
    pageDown()
    return true
  })

  // Jump to start/end
  keyboard.onKey('Home', () => {
    moveToTop()
    return true
  })
  keyboard.onKey('End', () => {
    moveToBottom()
    return true
  })

  // Vim-style jump
  keyboard.onKey('g', () => {
    moveToTop()
    return true
  })
  keyboard.onKey('G', () => {
    moveToBottom()
    return true
  })

  // Confirm selection
  keyboard.onKey('Enter', () => {
    confirmSelection()
    return true
  })

  // Quit
  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
