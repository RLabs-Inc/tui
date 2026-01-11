/**
 * Test: each() primitive
 *
 * Verifies reactive list rendering works correctly.
 */

import { mount, box, text, each, keyboard, signal } from '../../index'

const items = signal([
  { id: '1', name: 'Apple' },
  { id: '2', name: 'Banana' },
  { id: '3', name: 'Cherry' },
])

const cleanup = mount(() => {
  box({
    width: 40,
    height: 20,
    border: 1,
    flexDirection: 'column',
    padding: 1,
    children: () => {
      text({ content: 'Press A to add, R to remove, Q to quit' })
      text({ content: '' })
      text({ content: () => `Items: ${items.value.length}` })
      text({ content: '' })

      each(
        () => items.value,
        (item, index) => {
          return box({
            height: 1,
            children: () => {
              text({ content: () => `${index + 1}. ${item.name}` })
            }
          })
        },
        { key: item => item.id }
      )
    }
  })
})

let counter = 4

keyboard.onKey('a', () => {
  items.value = [...items.value, { id: String(counter), name: `Item ${counter}` }]
  counter++
})

keyboard.onKey('r', () => {
  if (items.value.length > 0) {
    items.value = items.value.slice(0, -1)
  }
})

keyboard.onKey('q', () => {
  cleanup()
  process.exit(0)
})
