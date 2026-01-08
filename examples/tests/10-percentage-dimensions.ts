/**
 * TUI Framework - Percentage Dimensions Test
 *
 * Tests percentage-based dimensions:
 * - '100%' = full parent
 * - '50%' = half parent
 * - Nested percentages
 */

import { mount, box, text, keyboard } from '../../index'

async function main() {
  const cleanup = await mount(() => {
    // Root: 100% width, 100% height (full terminal)
    box({
      width: '100%',
      height: '100%',
      border: 1,
      flexDirection: 'column',
      children: () => {
        text({ content: 'Percentage Dimensions Test', variant: 'accent' })
        text({ content: 'Root: 100% x 100% (full terminal)', variant: 'muted' })

        // Row with 50%/50% split
        box({
          width: '100%',
          height: '50%',
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: '50%',
              height: '100%',
              border: 1,
              variant: 'primary',
              children: () => {
                text({ content: '50% width' })
                text({ content: '100% height of parent' })
              }
            })
            box({
              width: '50%',
              height: '100%',
              border: 1,
              variant: 'secondary',
              children: () => {
                text({ content: '50% width' })
                text({ content: '100% height of parent' })
              }
            })
          }
        })

        // Row with 33%/33%/33% split
        box({
          width: '100%',
          height: '30%',
          flexDirection: 'row',
          gap: 1,
          children: () => {
            box({
              width: '33%',
              height: '100%',
              border: 1,
              variant: 'success',
              children: () => text({ content: '33%' })
            })
            box({
              width: '33%',
              height: '100%',
              border: 1,
              variant: 'warning',
              children: () => text({ content: '33%' })
            })
            box({
              width: '33%',
              height: '100%',
              border: 1,
              variant: 'error',
              children: () => text({ content: '33%' })
            })
          }
        })

        text({ content: 'Press q to quit', variant: 'muted' })
      }
    })
  }, { mode: 'fullscreen' })

  keyboard.onKey('q', () => {
    cleanup()
    process.exit(0)
  })
  keyboard.onKey('Ctrl+c', () => {
    cleanup()
    process.exit(0)
  })
}

main()
