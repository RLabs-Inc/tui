/**
 * Demo: Append Mode with History
 *
 * Run this and scroll up to see frozen messages in terminal history!
 * Press numbers 1-5 to freeze messages, q to quit.
 */

import { mount, box, text, keyboard, Colors, type AppendMountResult } from '../index'

async function main() {
  let frozenCount = 0

  const result = await mount(() => {
    box({
      width: 60,
      border: 1,
      borderColor: Colors.cyan,
      padding: 1,
      children: () => {
        text({
          content: '>>> ACTIVE AREA (re-renders each frame) <<<',
          fg: Colors.green,
        })
        text({
          content: `Frozen messages: ${frozenCount}`,
          fg: Colors.white,
        })
        text({
          content: 'Press 1-5 to freeze messages, Q to quit',
          fg: Colors.gray500,
        })
      },
    })
  }, {
    mode: 'append',
    mouse: false,
  }) as AppendMountResult

  const { cleanup, renderToHistory } = result

  keyboard.on((event) => {
    if (event.state !== 'press') return false

    if (event.key === 'q') {
      cleanup()
      console.log('\n\nScroll UP to see frozen messages in terminal history!')
      process.exit(0)
      return true
    }

    const num = parseInt(event.key)
    if (num >= 1 && num <= 5) {
      frozenCount++

      // Freeze a message to history
      renderToHistory(() => {
        box({
          width: 60,
          border: 1,
          borderColor: Colors.yellow,
          padding: 1,
          marginBottom: 1,
          children: () => {
            text({
              content: `=== FROZEN MESSAGE #${frozenCount} ===`,
              fg: Colors.yellow,
            })
            text({
              content: `This message is now in terminal scrollback history.`,
              fg: Colors.white,
            })
            text({
              content: `Key pressed: ${num}`,
              fg: Colors.gray500,
            })
          },
        })
      })

      return true
    }

    return false
  })
}

main().catch(console.error)
