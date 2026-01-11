/**
 * Debug: Keyboard Events
 * Shows what keys are being received
 */

import { mount, box, text, keyboard, focusedIndex, Colors } from '../../index'
import { derived } from '@rlabs-inc/signals'
import { lastKey, lastEvent } from '../../src/state/keyboard'
import { focusNext, focusPrevious, getFocusableIndices } from '../../src/state/focus'

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 60,
      padding: 1,
      flexDirection: 'column',
      gap: 1,
      children: () => {
        text({ content: 'KEYBOARD DEBUG', fg: Colors.CYAN })
        text({ content: '─'.repeat(56), fg: Colors.GRAY })

        text({
          content: derived(() => `Last key: "${lastKey.value}"`),
          fg: Colors.YELLOW,
        })

        text({
          content: derived(() => {
            const e = lastEvent.value
            if (!e) return 'No event yet'
            return `Event: key="${e.key}" ctrl=${e.modifiers.ctrl} alt=${e.modifiers.alt} shift=${e.modifiers.shift}`
          }),
          fg: Colors.GREEN,
        })

        text({
          content: derived(() => `Focused index: ${focusedIndex.value}`),
          fg: Colors.MAGENTA,
        })

        text({
          content: derived(() => `Focusables: [${getFocusableIndices().join(', ')}]`),
          fg: Colors.CYAN,
        })

        text({ content: '─'.repeat(56), fg: Colors.GRAY })

        // Three focusable boxes
        box({ flexDirection: 'row', gap: 2, children: () => {
          box({
            width: 15,
            height: 3,
            border: 1,
            focusable: true,
            tabIndex: 1,
            children: () => text({ content: '[1] Box A' }),
          })

          box({
            width: 15,
            height: 3,
            border: 1,
            focusable: true,
            tabIndex: 2,
            children: () => text({ content: '[2] Box B' }),
          })

          box({
            width: 15,
            height: 3,
            border: 1,
            focusable: true,
            tabIndex: 3,
            children: () => text({ content: '[3] Box C' }),
          })
        }})

        text({ content: '─'.repeat(56), fg: Colors.GRAY })
        text({ content: 'Press Tab to cycle focus, Q to quit', fg: Colors.GRAY })
      }
    })
  })

  keyboard.onKey(['q', 'Q'], () => {
    cleanup().then(() => process.exit(0))
  })
}

main().catch(console.error)
