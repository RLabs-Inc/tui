/**
 * Test: Append Mode with renderToHistory
 *
 * Demonstrates the new append mode architecture:
 * - Active content renders at bottom (reactive)
 * - renderToHistory() writes content to terminal scrollback (frozen)
 */

import { mount, box, text, signal, keyboard, Colors, type AppendMountResult } from '../index'

async function main() {
  const messageCount = signal(0)
  const inputText = signal('Type and press Enter...')

  // Mount in append mode - returns object with cleanup and renderToHistory
  const result = await mount(() => {
    // Active content only - this is what gets re-rendered each frame
    box({
      flexDirection: 'column',
      width: '100%',
      children: () => {
        // Status bar at bottom
        box({
          width: '100%',
          bg: Colors.gray800,
          padding: 1,
          children: () => {
            text({
              content: () => `Messages frozen: ${messageCount.value} | Press Enter to add message | Press Q to quit`,
              fg: Colors.gray400,
            })
          },
        })

        // Input area
        box({
          width: '100%',
          padding: 1,
          children: () => {
            text({
              content: () => `> ${inputText.value}`,
              fg: Colors.white,
            })
          },
        })
      },
    })
  }, {
    mode: 'append',
    mouse: false,
  }) as AppendMountResult

  const { cleanup, renderToHistory } = result

  // Handle keyboard
  keyboard.on((event) => {
    if (event.key === 'q' || (event.key === 'c' && event.modifiers.ctrl)) {
      cleanup()
      process.exit(0)
      return true
    }

    if (event.key === 'Enter' && event.state === 'press') {
      // Freeze a new message to history
      const msgNum = messageCount.value + 1

      renderToHistory(() => {
        box({
          width: '100%',
          marginBottom: 1,
          children: () => {
            box({
              flexDirection: 'row',
              children: () => {
                text({
                  content: `[Message ${msgNum}]`,
                  fg: Colors.cyan,
                })
                text({
                  content: ` This message is now frozen in terminal history!`,
                  fg: Colors.white,
                })
              },
            })
          },
        })
      })

      messageCount.value = msgNum
      inputText.value = `Message ${msgNum} frozen! Press Enter again...`
      return true
    }

    return false
  })

  console.log('Append mode test started. Press Enter to freeze messages, Q to quit.')
}

main().catch(console.error)
