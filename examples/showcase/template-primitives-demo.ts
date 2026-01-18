/**
 * Template Primitives Demo
 *
 * Showcases each() with fine-grained reactivity.
 * Items stored in signals - updates don't recreate components!
 *
 * Controls: Arrows (select), Space (toggle), A (add), D (delete), Tab (panels), Q (quit)
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, each, keyboard, t } from '../../index'

async function main() {
  // State
  const activePanel = signal(0)
  const selectedId = signal<string | null>('1')  // Track by ID, not index!

  interface Task { id: string; text: string; done: boolean }

  const tasks = signal<Task[]>([
    { id: '1', text: 'Learn TUI Framework', done: true },
    { id: '2', text: 'Build reactive lists', done: true },
    { id: '3', text: 'Create awesome apps!', done: false },
  ])

  let taskCounter = 4

  const completedCount = derived(() => tasks.value.filter(t => t.done).length)
  const totalCount = derived(() => tasks.value.length)

  // UI
  const cleanup = await mount(() => {
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      children: () => {
        // Header
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 1,
          children: () => {
            text({ content: 'each() Fine-Grained Demo', fg: t.primary })
            text({ content: derived(() => `${completedCount.value}/${totalCount.value} done`) })
          }
        })

        // Tabs
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            ['Tasks', 'Stats', 'Info'].forEach((name, i) => {
              box({
                border: 1,
                paddingLeft: 1,
                paddingRight: 1,
                bg: derived(() => activePanel.value === i ? t.primary : undefined),
                fg: derived(() => activePanel.value === i ? t.bg : t.text),
                children: () => text({ content: `${i + 1}. ${name}` })
              })
            })
          }
        })

        // Content
        box({
          grow: 1,
          border: 1,
          padding: 1,
          children: () => {
            // Tasks panel
            box({
              visible: derived(() => activePanel.value === 0),
              flexDirection: 'column',
              children: () => {
                text({ content: 'Task List - fine-grained each()', fg: t.primary })
                text({ content: 'Components update in place, not recreated!' })
                text({ content: '' })

                each(
                  () => tasks.value,
                  (getItem, key) => {
                    // key is STABLE - use for selection!
                    // getItem() returns CURRENT item value (reactive!)
                    return box({
                      id: `task-${key}`,
                      height: 1,
                      flexDirection: 'row',
                      gap: 1,
                      bg: derived(() => selectedId.value === key ? t.surface : undefined),
                      children: () => {
                        text({
                          content: derived(() => selectedId.value === key ? '>' : ' '),
                          fg: t.primary
                        })
                        text({
                          content: derived(() => getItem().done ? '[x]' : '[ ]'),
                          fg: derived(() => getItem().done ? t.success : t.textMuted)
                        })
                        text({
                          content: derived(() => getItem().text),
                          fg: derived(() => getItem().done ? t.textMuted : t.text)
                        })
                      }
                    })
                  },
                  { key: (task) => task.id }
                )
              }
            })

            // Stats panel
            box({
              visible: derived(() => activePanel.value === 1),
              flexDirection: 'column',
              children: () => {
                text({ content: 'Statistics', fg: t.primary })
                text({ content: '' })
                text({ content: derived(() => `Total: ${totalCount.value}`) })
                text({ content: derived(() => `Done: ${completedCount.value}`) })
                text({ content: derived(() => `Remaining: ${totalCount.value - completedCount.value}`) })
              }
            })

            // Info panel
            box({
              visible: derived(() => activePanel.value === 2),
              flexDirection: 'column',
              children: () => {
                text({ content: 'How it works', fg: t.primary })
                text({ content: '' })
                text({ content: '1. Each item stored in a signal' })
                text({ content: '2. renderFn gets a getter, not the item' })
                text({ content: '3. When item changes, signal updates' })
                text({ content: '4. Component reads new value - no recreation!' })
                text({ content: '' })
                text({ content: 'This is TRUE fine-grained reactivity.' })
              }
            })
          }
        })

        // Footer
        box({
          padding: 1,
          children: () => {
            text({ content: 'Up/Down: select | Space: toggle | A: add | D: del | Tab: panels | Q: quit', fg: t.textMuted })
          }
        })
      }
    })
  })

  // Helper to get current selection index
  const getSelectedIndex = () => tasks.value.findIndex(t => t.id === selectedId.value)

  // Keyboard handlers
  keyboard.onKey(['ArrowUp', 'k'], () => {
    if (activePanel.value === 0) {
      const idx = getSelectedIndex()
      if (idx > 0) {
        selectedId.value = tasks.value[idx - 1]!.id
      }
    }
  })

  keyboard.onKey(['ArrowDown', 'j'], () => {
    if (activePanel.value === 0) {
      const idx = getSelectedIndex()
      if (idx < tasks.value.length - 1) {
        selectedId.value = tasks.value[idx + 1]!.id
      }
    }
  })

  keyboard.onKey(['Space', 'Enter'], () => {
    if (activePanel.value === 0 && selectedId.value) {
      tasks.value = tasks.value.map(t =>
        t.id === selectedId.value ? { ...t, done: !t.done } : t
      )
    }
  })

  keyboard.onKey('Tab', () => {
    activePanel.value = (activePanel.value + 1) % 3
  })

  keyboard.onKey('1', () => { activePanel.value = 0 })
  keyboard.onKey('2', () => { activePanel.value = 1 })
  keyboard.onKey('3', () => { activePanel.value = 2 })

  keyboard.onKey('a', () => {
    if (activePanel.value === 0) {
      const newId = String(taskCounter++)
      tasks.value = [...tasks.value, {
        id: newId,
        text: `New Task ${taskCounter - 1}`,
        done: false
      }]
      // Select the new item
      selectedId.value = newId
    }
  })

  keyboard.onKey('d', () => {
    if (activePanel.value === 0 && tasks.value.length > 0 && selectedId.value) {
      const idx = getSelectedIndex()
      tasks.value = tasks.value.filter(t => t.id !== selectedId.value)
      // Select next or previous item
      if (tasks.value.length > 0) {
        const newIdx = Math.min(idx, tasks.value.length - 1)
        selectedId.value = tasks.value[newIdx]!.id
      } else {
        selectedId.value = null
      }
    }
  })

  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

main()
