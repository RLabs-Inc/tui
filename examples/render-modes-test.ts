/**
 * Test the three render modes: fullscreen, inline, append
 *
 * Usage:
 *   bun run examples/render-modes-test.ts fullscreen
 *   bun run examples/render-modes-test.ts inline
 *   bun run examples/render-modes-test.ts append
 */

import { signal, mount, box, text, keyboard, Colors } from '../index'
import type { RenderMode } from '../src/types'

// Get mode from command line
const mode = (process.argv[2] || 'inline') as RenderMode

if (!['fullscreen', 'inline', 'append'].includes(mode)) {
  console.log('Usage: bun run examples/render-modes-test.ts [fullscreen|inline|append]')
  process.exit(1)
}

console.log(`Testing ${mode} mode...`)
console.log('Press Ctrl+C to exit\n')

// Create some reactive state
const count = signal(0)
const time = signal(new Date().toLocaleTimeString())

// Update time every second
setInterval(() => {
  time.value = new Date().toLocaleTimeString()
}, 1000)

// Update count every 500ms
setInterval(() => {
  count.value++
}, 500)

// For inline mode, disable mouse to allow terminal scroll
const enableMouse = mode === 'fullscreen'

const cleanup = await mount(() => {
  // A box with more content to test scrolling
  box({
    width: 60,
    // height: 20,  // Taller box - comment out to test auto-height
    bg: Colors.BLUE,
    border: 1,
    borderColor: Colors.CYAN,
    padding: 1,
    children: () => {
      text({
        content: () => `Render Mode: ${mode.toUpperCase()}`,
        fg: Colors.YELLOW,
      })

      text({
        content: () => `Time: ${time.value}`,
        fg: Colors.GREEN,
      })

      text({
        content: () => `Count: ${count.value}`,
        fg: Colors.CYAN,
      })

      // Add more lines to make it scrollable
      for (let i = 1; i <= 15; i++) {
        text({
          content: `Line ${i}: This is some content to make the box taller`,
          fg: Colors.WHITE,
        })
      }

      text({
        content: 'Press Ctrl+C to exit',
        fg: Colors.GRAY,
      })
    },
  })
}, { mode, mouse: enableMouse })

// Setup exit handler
keyboard.onKey('q', () => cleanup().then(() => process.exit(0)))
