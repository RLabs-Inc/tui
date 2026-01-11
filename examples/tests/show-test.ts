/**
 * Test: show() primitive
 *
 * Verifies conditional rendering works correctly.
 */

import { mount, box, text, show, keyboard, signal } from '../../index'

const isLoggedIn = signal(false)
const count = signal(0)

const cleanup = mount(() => {
  box({
    width: 50,
    height: 15,
    border: 1,
    flexDirection: 'column',
    padding: 1,
    children: () => {
      text({ content: 'Press L to toggle login, +/- to change count, Q to quit' })
      text({ content: '' })
      text({ content: () => `Logged in: ${isLoggedIn.value}` })
      text({ content: () => `Count: ${count.value}` })
      text({ content: '' })

      // Conditional rendering with show()
      show(
        () => isLoggedIn.value,
        () => box({
          border: 1,
          padding: 1,
          children: () => {
            text({ content: 'Welcome back, user!', fg: 'green' })
            text({ content: () => `You have ${count.value} notifications` })
          }
        }),
        // Else branch
        () => text({ content: 'Please log in to continue', fg: 'yellow' })
      )

      text({ content: '' })

      // Another show - appears when count > 5
      show(
        () => count.value > 5,
        () => text({ content: '🎉 Count is greater than 5!', fg: 'cyan' })
      )
    }
  })
})

keyboard.onKey('l', () => {
  isLoggedIn.value = !isLoggedIn.value
})

keyboard.onKey('+', () => {
  count.value++
})

keyboard.onKey('-', () => {
  if (count.value > 0) count.value--
})

keyboard.onKey('q', () => {
  cleanup()
  process.exit(0)
})
