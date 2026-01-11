/**
 * Showcase 08: Todo App
 *
 * Demonstrates:
 * - Dynamic component management (add/remove items)
 * - Array-based state with signals
 * - Keyboard navigation through a list
 * - Toggle state (complete/incomplete)
 * - Reactive statistics display
 * - Visual styling based on item state
 *
 * A fully functional todo list app built with the TUI framework.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, BorderStyle } from '../../index'

// =============================================================================
// TYPES
// =============================================================================

interface Todo {
  id: number
  text: string
  done: boolean
}

// =============================================================================
// STATE
// =============================================================================

// Auto-incrementing ID for new todos
let nextId = 1

// Initial todos to show the app isn't empty
const initialTodos: Todo[] = [
  { id: nextId++, text: 'Learn TUI framework', done: true },
  { id: nextId++, text: 'Build something cool', done: false },
  { id: nextId++, text: 'Share with friends', done: false },
]

// Main todo list state
const todos = signal<Todo[]>(initialTodos)

// Currently selected index for navigation
const selectedIndex = signal(0)

// =============================================================================
// DERIVED STATE
// =============================================================================

// Total count of todos
const totalCount = derived(() => todos.value.length)

// Count of completed todos
const completedCount = derived(() => todos.value.filter(t => t.done).length)

// Status text showing completion progress
const statusText = derived(() => {
  const total = totalCount.value
  const completed = completedCount.value
  if (total === 0) return 'No todos yet - press [a] to add one!'
  return `${completed}/${total} completed`
})

// Progress percentage for visual bar
const progressPercent = derived(() => {
  const total = totalCount.value
  if (total === 0) return 0
  return Math.round((completedCount.value / total) * 100)
})

// Currently selected todo
const selectedTodo = derived(() => {
  const list = todos.value
  const idx = selectedIndex.value
  return list[idx] ?? null
})

// =============================================================================
// ACTIONS
// =============================================================================

function addTodo() {
  const id = nextId++
  todos.value = [...todos.value, { id, text: `Todo #${id}`, done: false }]
  // Select the newly added item
  selectedIndex.value = todos.value.length - 1
}

function removeTodo() {
  const list = todos.value
  const idx = selectedIndex.value
  if (list.length === 0) return

  todos.value = list.filter((_, i) => i !== idx)

  // Adjust selection if needed
  if (selectedIndex.value >= todos.value.length) {
    selectedIndex.value = Math.max(0, todos.value.length - 1)
  }
}

function toggleTodo() {
  const list = todos.value
  const idx = selectedIndex.value
  if (idx < 0 || idx >= list.length) return

  todos.value = list.map((todo, i) =>
    i === idx ? { ...todo, done: !todo.done } : todo
  )
}

function moveUp() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function moveDown() {
  if (selectedIndex.value < todos.value.length - 1) {
    selectedIndex.value++
  }
}

function clearCompleted() {
  const remaining = todos.value.filter(t => !t.done)
  todos.value = remaining
  // Adjust selection
  if (selectedIndex.value >= remaining.length) {
    selectedIndex.value = Math.max(0, remaining.length - 1)
  }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Root container
    box({
      padding: 1,
      gap: 1,
      children: () => {
        // =======================================================================
        // HEADER
        // =======================================================================
        box({
          border: BorderStyle.DOUBLE,
          borderColor: t.primary,
          padding: 1,
          alignItems: 'center',
          children: () => {
            text({
              content: 'TUI Todo App',
              fg: t.primary,
            })
            text({
              content: 'Dynamic component management demo',
              fg: t.textDim,
            })
          },
        })

        // =======================================================================
        // STATISTICS BAR
        // =======================================================================
        box({
          flexDirection: 'row',
          gap: 2,
          padding: 1,
          border: BorderStyle.ROUNDED,
          borderColor: t.border,
          children: () => {
            // Status text
            text({
              content: statusText,
              fg: derived(() => completedCount.value === totalCount.value && totalCount.value > 0
                ? t.success.value
                : t.text.value),
            })

            // Visual progress bar
            text({
              content: derived(() => {
                const percent = progressPercent.value
                const filled = Math.round(percent / 5)  // 20 chars total
                const empty = 20 - filled
                return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']'
              }),
              fg: t.info,
            })

            // Percentage
            text({
              content: derived(() => `${progressPercent.value}%`),
              fg: t.textDim,
              width: 5,
              align: 'right',
            })
          },
        })

        // =======================================================================
        // TODO LIST
        // =======================================================================
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.border,
          padding: 1,
          minHeight: 10,
          children: () => {
            // List header
            box({
              flexDirection: 'row',
              children: () => {
                text({ content: '  ', width: 3 })  // Checkbox space
                text({ content: 'Status', fg: t.textDim, width: 8 })
                text({ content: 'Task', fg: t.textDim })
              },
            })
            text({ content: '-'.repeat(50), fg: t.textDim })

            // Empty state
            box({
              visible: derived(() => todos.value.length === 0),
              padding: 2,
              alignItems: 'center',
              children: () => {
                text({
                  content: 'No todos yet!',
                  fg: t.textDim,
                })
                text({
                  content: 'Press [a] to add your first todo',
                  fg: t.info,
                })
              },
            })

            // Todo items - rebuild on todos change
            // We create derived values for each position that reactively
            // look up the current todo at that index
            for (let i = 0; i < 20; i++) {  // Max 20 visible items
              const index = i

              // This item's visibility
              const isVisible = derived(() => index < todos.value.length)

              // This item's data (reactive lookup)
              const todoAtIndex = derived(() => todos.value[index])
              const isSelected = derived(() => selectedIndex.value === index)
              const isDone = derived(() => todoAtIndex.value?.done ?? false)
              const todoText = derived(() => todoAtIndex.value?.text ?? '')

              box({
                visible: isVisible,
                flexDirection: 'row',
                bg: derived(() => isSelected.value ? t.surface.value : null),
                children: () => {
                  // Selection indicator
                  text({
                    content: derived(() => isSelected.value ? '>' : ' '),
                    fg: t.primary,
                    width: 2,
                  })

                  // Checkbox
                  text({
                    content: derived(() => isDone.value ? '[x]' : '[ ]'),
                    fg: derived(() => isDone.value ? t.success.value : t.textDim.value),
                    width: 4,
                  })

                  // Status label
                  text({
                    content: derived(() => isDone.value ? 'Done' : 'Todo'),
                    fg: derived(() => isDone.value ? t.success.value : t.warning.value),
                    width: 6,
                  })

                  // Todo text with strikethrough for completed items
                  text({
                    content: derived(() => {
                      const txt = todoText.value
                      // Add strikethrough visual for completed items
                      if (isDone.value && txt) {
                        return txt.split('').map(c => c + '\u0336').join('')
                      }
                      return txt
                    }),
                    fg: derived(() => isDone.value ? t.textDim.value : t.text.value),
                  })
                },
              })
            }
          },
        })

        // =======================================================================
        // KEY BINDINGS HELP
        // =======================================================================
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.textDim,
          padding: 1,
          children: () => {
            text({ content: 'Key Bindings', fg: t.textDim })
            text({ content: '' })

            box({
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 3,
              children: () => {
                // Navigation
                box({
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[Up/Down]', fg: t.info, width: 12 })
                        text({ content: 'Navigate', fg: t.text })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[j/k]', fg: t.info, width: 12 })
                        text({ content: 'Vim nav', fg: t.text })
                      },
                    })
                  },
                })

                // Actions
                box({
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[Space/Enter]', fg: t.success, width: 14 })
                        text({ content: 'Toggle done', fg: t.text })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[a]', fg: t.success, width: 14 })
                        text({ content: 'Add todo', fg: t.text })
                      },
                    })
                  },
                })

                // Delete/Clear
                box({
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[d/Delete]', fg: t.error, width: 12 })
                        text({ content: 'Remove', fg: t.text })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[c]', fg: t.warning, width: 12 })
                        text({ content: 'Clear done', fg: t.text })
                      },
                    })
                  },
                })

                // Quit
                box({
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[q/Escape]', fg: t.textDim, width: 12 })
                        text({ content: 'Quit', fg: t.text })
                      },
                    })
                  },
                })
              },
            })
          },
        })

        // =======================================================================
        // FOOTER
        // =======================================================================
        text({
          content: 'Built with TUI - Fine-grained reactivity for the terminal',
          fg: t.textDim,
        })
      },
    })
  }, { mode: 'fullscreen' })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Navigation
  keyboard.onKey(['ArrowUp', 'k'], () => {
    moveUp()
    return true
  })

  keyboard.onKey(['ArrowDown', 'j'], () => {
    moveDown()
    return true
  })

  // Toggle complete
  keyboard.onKey(['Space', 'Enter'], () => {
    toggleTodo()
    return true
  })

  // Add new todo
  keyboard.onKey('a', () => {
    addTodo()
    return true
  })

  // Remove todo
  keyboard.onKey(['d', 'Delete', 'Backspace'], () => {
    removeTodo()
    return true
  })

  // Clear completed
  keyboard.onKey('c', () => {
    clearCompleted()
    return true
  })

  // Quit
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

// Run the application
main().catch(console.error)
