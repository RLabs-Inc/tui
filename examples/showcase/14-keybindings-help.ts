/**
 * TUI Framework - Keybindings Help / Cheatsheet
 *
 * A professional keybindings reference display demonstrating:
 * - Categorized keyboard shortcuts with clean two-column layout
 * - Category navigation with Tab/Arrow keys
 * - Theme-aware styling with variants
 * - Beautiful key combination formatting
 * - Flexbox layout for organized UI
 *
 * Run with: bun run examples/showcase/14-keybindings-help.ts
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, BorderStyle, Attr, Colors } from '../../index'

// =============================================================================
// KEYBINDING DATA
// =============================================================================

interface Keybinding {
  keys: string[]      // Key combinations like ['Ctrl+C'], ['Alt+Tab'], ['Arrow Up', 'Arrow Down']
  description: string
}

interface Category {
  name: string
  icon: string
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'accent'
  bindings: Keybinding[]
}

const categories: Category[] = [
  {
    name: 'Navigation',
    icon: '>',
    variant: 'primary',
    bindings: [
      { keys: ['Arrow Up', 'k'], description: 'Move cursor up' },
      { keys: ['Arrow Down', 'j'], description: 'Move cursor down' },
      { keys: ['Arrow Left', 'h'], description: 'Move cursor left' },
      { keys: ['Arrow Right', 'l'], description: 'Move cursor right' },
      { keys: ['Home', 'g'], description: 'Jump to start' },
      { keys: ['End', 'G'], description: 'Jump to end' },
      { keys: ['Page Up'], description: 'Page up' },
      { keys: ['Page Down'], description: 'Page down' },
      { keys: ['Tab'], description: 'Next focusable element' },
      { keys: ['Shift+Tab'], description: 'Previous focusable element' },
    ],
  },
  {
    name: 'Actions',
    icon: '*',
    variant: 'success',
    bindings: [
      { keys: ['Enter', 'Space'], description: 'Confirm / Select' },
      { keys: ['Escape'], description: 'Cancel / Close' },
      { keys: ['Delete', 'Backspace'], description: 'Delete item' },
      { keys: ['Ctrl+Z'], description: 'Undo last action' },
      { keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], description: 'Redo action' },
      { keys: ['Ctrl+A'], description: 'Select all' },
      { keys: ['Ctrl+C'], description: 'Copy selection' },
      { keys: ['Ctrl+V'], description: 'Paste clipboard' },
      { keys: ['Ctrl+X'], description: 'Cut selection' },
      { keys: ['F2'], description: 'Rename / Edit' },
    ],
  },
  {
    name: 'View',
    icon: '#',
    variant: 'info',
    bindings: [
      { keys: ['Ctrl+B'], description: 'Toggle sidebar' },
      { keys: ['Ctrl+\\'], description: 'Toggle split view' },
      { keys: ['Ctrl++', 'Ctrl+='], description: 'Zoom in' },
      { keys: ['Ctrl+-'], description: 'Zoom out' },
      { keys: ['Ctrl+0'], description: 'Reset zoom' },
      { keys: ['F11'], description: 'Toggle fullscreen' },
      { keys: ['Ctrl+Shift+P'], description: 'Command palette' },
      { keys: ['Ctrl+,'], description: 'Open settings' },
      { keys: ['Ctrl+`'], description: 'Toggle terminal' },
    ],
  },
  {
    name: 'System',
    icon: '@',
    variant: 'warning',
    bindings: [
      { keys: ['Ctrl+S'], description: 'Save file' },
      { keys: ['Ctrl+Shift+S'], description: 'Save all files' },
      { keys: ['Ctrl+O'], description: 'Open file' },
      { keys: ['Ctrl+N'], description: 'New file' },
      { keys: ['Ctrl+W'], description: 'Close tab' },
      { keys: ['Ctrl+Q'], description: 'Quit application' },
      { keys: ['Ctrl+R'], description: 'Reload / Refresh' },
      { keys: ['Ctrl+Shift+R'], description: 'Hard reload' },
      { keys: ['F1'], description: 'Show help' },
      { keys: ['?'], description: 'Show keybindings' },
    ],
  },
]

// =============================================================================
// STATE
// =============================================================================

const selectedCategoryIndex = signal(0)
const selectedCategory = derived(() => categories[selectedCategoryIndex.value])

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a key name for display with nice brackets and symbols
 */
function formatKey(key: string): string {
  // Replace arrow names with symbols
  const formatted = key
    .replace('Arrow Up', 'Up')
    .replace('Arrow Down', 'Down')
    .replace('Arrow Left', 'Left')
    .replace('Arrow Right', 'Right')
    .replace('Page Up', 'PgUp')
    .replace('Page Down', 'PgDn')
  return `[${formatted}]`
}

/**
 * Format multiple keys with proper separators
 */
function formatKeys(keys: string[]): string {
  return keys.map(formatKey).join(' ')
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Render the category tabs at the top
 */
function renderCategoryTabs() {
  box({
    flexDirection: 'row',
    gap: 1,
    marginBottom: 1,
    children: () => {
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]!
        const isSelected = derived(() => selectedCategoryIndex.value === i)

        box({
          flexDirection: 'row',
          padding: 0,
          paddingLeft: 1,
          paddingRight: 1,
          border: derived(() => isSelected.value ? BorderStyle.ROUNDED : BorderStyle.SINGLE),
          borderColor: derived(() => isSelected.value ? t[category.variant].value : t.border),
          bg: derived(() => isSelected.value ? t[category.variant].value : Colors.TRANSPARENT),
          children: () => {
            text({
              content: `${category.icon} ${category.name}`,
              fg: derived(() => isSelected.value ? t.textBright : t.textMuted),
              attrs: derived(() => isSelected.value ? Attr.BOLD : Attr.NONE),
            })
          },
        })
      }
    },
  })
}

/**
 * Render a single keybinding row
 */
function renderKeybindingRow(binding: Keybinding, variant: Category['variant']) {
  box({
    flexDirection: 'row',
    gap: 2,
    paddingTop: 0,
    paddingBottom: 0,
    children: () => {
      // Key column - fixed width for alignment
      text({
        content: formatKeys(binding.keys),
        fg: t[variant],
        width: 28,
        attrs: Attr.BOLD,
      })
      // Description column
      text({
        content: binding.description,
        fg: t.text,
        grow: 1,
      })
    },
  })
}

/**
 * Render the keybindings list for the selected category
 */
function renderKeybindingsList() {
  // Create a derived for each category's visibility
  for (let catIndex = 0; catIndex < categories.length; catIndex++) {
    const category = categories[catIndex]!
    const isVisible = derived(() => selectedCategoryIndex.value === catIndex)

    box({
      visible: isVisible,
      border: BorderStyle.ROUNDED,
      borderColor: t[category.variant],
      padding: 1,
      gap: 0,
      grow: 1,
      children: () => {
        // Category header
        box({
          flexDirection: 'row',
          gap: 2,
          marginBottom: 1,
          children: () => {
            text({
              content: `${category.icon} ${category.name} Shortcuts`,
              fg: t[category.variant],
              attrs: Attr.BOLD,
            })
          },
        })

        // Separator
        text({
          content: '-'.repeat(60),
          fg: t.border,
        })

        // Column headers
        box({
          flexDirection: 'row',
          gap: 2,
          marginTop: 1,
          marginBottom: 1,
          children: () => {
            text({
              content: 'KEYS',
              fg: t.textDim,
              width: 28,
              attrs: Attr.DIM,
            })
            text({
              content: 'ACTION',
              fg: t.textDim,
              grow: 1,
              attrs: Attr.DIM,
            })
          },
        })

        // Keybindings
        for (const binding of category.bindings) {
          renderKeybindingRow(binding, category.variant)
        }
      },
    })
  }
}

/**
 * Render the help footer
 */
function renderFooter() {
  box({
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
    children: () => {
      // Navigation help
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({
            content: '[Left/Right] or [Tab]',
            fg: t.textDim,
          })
          text({
            content: 'Switch category',
            fg: t.textMuted,
          })
        },
      })

      // Quit hint
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({
            content: '[Q]',
            fg: t.error,
          })
          text({
            content: 'Quit',
            fg: t.textMuted,
          })
        },
      })
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Root container
    box({
      width: '100%',
      height: '100%',
      bg: t.bg,
      fg: t.text,
      padding: 2,
      gap: 1,
      children: () => {
        // =======================================================================
        // HEADER
        // =======================================================================
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 1,
          children: () => {
            // Title
            box({
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              children: () => {
                text({
                  content: '?',
                  fg: t.accent,
                  attrs: Attr.BOLD,
                })
                text({
                  content: 'Keybindings Reference',
                  fg: t.primary,
                  attrs: Attr.BOLD,
                })
              },
            })

            // Current category indicator
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({
                  content: 'Category:',
                  fg: t.textMuted,
                })
                text({
                  content: derived(() => `${selectedCategory.value?.name ?? ''}`),
                  fg: derived(() => {
                    const cat = selectedCategory.value
                    return cat ? t[cat.variant].value : t.text
                  }),
                  attrs: Attr.BOLD,
                })
                text({
                  content: derived(() => `(${selectedCategoryIndex.value + 1}/${categories.length})`),
                  fg: t.textDim,
                })
              },
            })
          },
        })

        // Separator
        text({
          content: '='.repeat(76),
          fg: t.border,
        })

        // =======================================================================
        // CATEGORY TABS
        // =======================================================================
        renderCategoryTabs()

        // =======================================================================
        // KEYBINDINGS LIST
        // =======================================================================
        renderKeybindingsList()

        // =======================================================================
        // FOOTER
        // =======================================================================
        text({
          content: '='.repeat(76),
          fg: t.border,
        })

        renderFooter()

        // Attribution
        text({
          content: 'TUI Framework - Fine-grained reactivity for terminal interfaces',
          fg: t.textDim,
          align: 'center',
        })
      },
    })
  }, { mode: 'fullscreen' })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Navigate categories with arrow keys
  keyboard.onKey('ArrowRight', () => {
    selectedCategoryIndex.value = (selectedCategoryIndex.value + 1) % categories.length
  })

  keyboard.onKey('ArrowLeft', () => {
    selectedCategoryIndex.value = (selectedCategoryIndex.value - 1 + categories.length) % categories.length
  })

  // Tab to cycle through categories
  keyboard.onKey('Tab', () => {
    selectedCategoryIndex.value = (selectedCategoryIndex.value + 1) % categories.length
  })

  // Number keys to jump directly to category
  keyboard.onKey('1', () => { selectedCategoryIndex.value = 0 })
  keyboard.onKey('2', () => { selectedCategoryIndex.value = 1 })
  keyboard.onKey('3', () => { selectedCategoryIndex.value = 2 })
  keyboard.onKey('4', () => { selectedCategoryIndex.value = 3 })

  // Quit handlers
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup().then(() => process.exit(0))
  })

  keyboard.onKey('Ctrl+c', () => {
    cleanup().then(() => process.exit(0))
  })
}

// Run the application
main().catch(console.error)
