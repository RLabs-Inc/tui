/**
 * File Manager Simulator
 *
 * Simulates a realistic file manager interface:
 * - Directory tree (left panel)
 * - File list (center panel)
 * - Preview/details (right panel)
 * - Status bar with stats
 *
 * Press Q to quit, J/K to navigate
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

// Directory structure
const directories = [
  { name: 'src', expanded: true, level: 0 },
  { name: 'components', expanded: true, level: 1 },
  { name: 'Button.tsx', expanded: false, level: 2, isFile: true },
  { name: 'Input.tsx', expanded: false, level: 2, isFile: true },
  { name: 'Modal.tsx', expanded: false, level: 2, isFile: true },
  { name: 'hooks', expanded: false, level: 1 },
  { name: 'utils', expanded: true, level: 1 },
  { name: 'helpers.ts', expanded: false, level: 2, isFile: true },
  { name: 'format.ts', expanded: false, level: 2, isFile: true },
  { name: 'test', expanded: false, level: 0 },
  { name: 'node_modules', expanded: false, level: 0 },
  { name: 'package.json', expanded: false, level: 0, isFile: true },
  { name: 'tsconfig.json', expanded: false, level: 0, isFile: true },
  { name: 'README.md', expanded: false, level: 0, isFile: true },
]

// Files in current directory
const files = signal([
  { name: 'index.ts', size: '2.4 KB', modified: '2 hours ago', type: 'ts' },
  { name: 'App.tsx', size: '5.1 KB', modified: '1 hour ago', type: 'tsx' },
  { name: 'styles.css', size: '12.3 KB', modified: '3 days ago', type: 'css' },
  { name: 'config.json', size: '892 B', modified: '1 week ago', type: 'json' },
  { name: 'utils.ts', size: '3.7 KB', modified: '5 hours ago', type: 'ts' },
  { name: 'types.ts', size: '1.2 KB', modified: '2 days ago', type: 'ts' },
  { name: 'constants.ts', size: '456 B', modified: '1 month ago', type: 'ts' },
  { name: 'helpers.ts', size: '2.1 KB', modified: '4 hours ago', type: 'ts' },
])

const selectedIndex = signal(0)
const selectedFile = derived(() => files.value[selectedIndex.value])

// Stats
const totalFiles = signal(847)
const totalSize = signal('124.5 MB')
const currentPath = signal('/Users/dev/project/src')

// File type icons
const typeIcons: Record<string, string> = {
  ts: '◆',
  tsx: '◇',
  css: '●',
  json: '○',
  md: '◎',
}

const typeColors: Record<string, typeof Colors.WHITE> = {
  ts: Colors.CYAN,
  tsx: Colors.BLUE,
  css: Colors.MAGENTA,
  json: Colors.YELLOW,
  md: Colors.WHITE,
}

async function main() {
  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      bg: { r: 20, g: 22, b: 28, a: 255 },
      children: () => {
        // ═══════════════════════════════════════════════════════════════════════
        // HEADER
        // ═══════════════════════════════════════════════════════════════════════
        box({
          height: 3,
          bg: { r: 30, g: 35, b: 45, a: 255 },
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '📁', fg: Colors.YELLOW })
                text({ content: 'File Manager', fg: Colors.WHITE })
              }
            })
            text({ content: currentPath, fg: Colors.CYAN })
          }
        })

        // ═══════════════════════════════════════════════════════════════════════
        // MAIN CONTENT (3 panels)
        // ═══════════════════════════════════════════════════════════════════════
        box({
          grow: 1,
          flexDirection: 'row',
          children: () => {
            // LEFT PANEL - Directory Tree
            box({
              width: 25,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                box({
                  padding: 1,
                  bg: { r: 25, g: 28, b: 35, a: 255 },
                  children: () => {
                    text({ content: 'EXPLORER', fg: Colors.GRAY })
                  }
                })
                box({
                  padding: 1,
                  flexDirection: 'column',
                  children: () => {
                    for (const dir of directories) {
                      const indent = '  '.repeat(dir.level)
                      const icon = dir.isFile ? '○' : (dir.expanded ? '▼' : '▶')
                      const color = dir.isFile ? Colors.WHITE : Colors.YELLOW
                      text({
                        content: `${indent}${icon} ${dir.name}`,
                        fg: color
                      })
                    }
                  }
                })
              }
            })

            // CENTER PANEL - File List
            box({
              grow: 1,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                // Header row
                box({
                  padding: 1,
                  bg: { r: 25, g: 28, b: 35, a: 255 },
                  flexDirection: 'row',
                  children: () => {
                    text({ content: 'Name', fg: Colors.GRAY, width: 20 })
                    text({ content: 'Size', fg: Colors.GRAY, width: 10 })
                    text({ content: 'Modified', fg: Colors.GRAY, width: 15 })
                  }
                })
                // File rows
                box({
                  padding: 1,
                  flexDirection: 'column',
                  children: () => {
                    for (let i = 0; i < files.value.length; i++) {
                      const file = files.value[i]!
                      const isSelected = derived(() => selectedIndex.value === i)
                      const icon = typeIcons[file.type] || '○'
                      const iconColor = typeColors[file.type] || Colors.WHITE

                      box({
                        flexDirection: 'row',
                        bg: derived(() => isSelected.value ? { r: 50, g: 55, b: 70, a: 255 } : { r: 0, g: 0, b: 0, a: 0 }),
                        children: () => {
                          box({
                            width: 20,
                            flexDirection: 'row',
                            gap: 1,
                            children: () => {
                              text({ content: icon, fg: iconColor })
                              text({
                                content: file.name,
                                fg: derived(() => isSelected.value ? Colors.WHITE : Colors.GRAY)
                              })
                            }
                          })
                          text({ content: file.size, fg: Colors.GRAY, width: 10 })
                          text({ content: file.modified, fg: Colors.GRAY, width: 15 })
                        }
                      })
                    }
                  }
                })
              }
            })

            // RIGHT PANEL - Preview
            box({
              width: 30,
              border: BorderStyle.SINGLE,
              borderColor: Colors.GRAY,
              flexDirection: 'column',
              children: () => {
                box({
                  padding: 1,
                  bg: { r: 25, g: 28, b: 35, a: 255 },
                  children: () => {
                    text({ content: 'PREVIEW', fg: Colors.GRAY })
                  }
                })
                box({
                  padding: 1,
                  flexDirection: 'column',
                  gap: 1,
                  children: () => {
                    text({
                      content: derived(() => selectedFile.value?.name || ''),
                      fg: Colors.WHITE
                    })
                    text({ content: '─'.repeat(26), fg: Colors.GRAY })
                    text({
                      content: derived(() => `Size: ${selectedFile.value?.size || ''}`),
                      fg: Colors.CYAN
                    })
                    text({
                      content: derived(() => `Modified: ${selectedFile.value?.modified || ''}`),
                      fg: Colors.CYAN
                    })
                    text({
                      content: derived(() => `Type: ${selectedFile.value?.type.toUpperCase() || ''}`),
                      fg: Colors.CYAN
                    })
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
          bg: { r: 30, g: 35, b: 45, a: 255 },
          padding: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                text({ content: derived(() => `${totalFiles.value} files`), fg: Colors.GRAY })
                text({ content: totalSize, fg: Colors.GRAY })
              }
            })
            text({ content: 'J/K=navigate  Q=quit', fg: Colors.GRAY })
          }
        })
      }
    })
  })

  // Navigation
  keyboard.onKey('j', () => {
    if (selectedIndex.value < files.value.length - 1) {
      selectedIndex.value++
    }
  })
  keyboard.onKey('k', () => {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  })
  keyboard.onKey('q', () => {
    cleanup().then(() => process.exit(0))
  })
}

main()
