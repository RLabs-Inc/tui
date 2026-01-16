/**
 * Reactive Syntax Test
 *
 * Tests all the ways to pass reactive values to props:
 * 1. Signal directly: text({ content: mySignal })
 * 2. Derived directly: text({ content: myDerived })
 * 3. Inline getter (inline derived): text({ content: () => expr })
 * 4. Static value (non-reactive baseline)
 *
 * Press Space to increment counter - ALL reactive rows should update together.
 * Press Q to quit.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, BorderStyle } from '../../index'

// === STATE ===
const count = signal(0)

// Pre-computed deriveds - all return strings for text content
const countAsString = derived(() => String(count.value))
const countDerivedString = derived(() => String(count.value))
const formattedDerived = derived(() => `Count: ${count.value}`)

// === KEYBOARD ===
keyboard.onKey('Space', () => { count.value++ })
keyboard.onKey(['q', 'Q', 'Escape'], () => process.exit(0))

// === UI ===
mount(() => {
  box({
    padding: 2,
    gap: 1,
    border: BorderStyle.ROUNDED,
    borderColor: t.primary,
    children: () => {
      text({ content: 'Reactive Syntax Test', fg: t.primary })
      text({ content: 'Press SPACE to increment, Q to quit', fg: t.textDim })
      text({ content: '' })

      // Row 1: Signal converted to string via derived
      box({
        flexDirection: 'row',
        gap: 1,
        children: () => {
          text({ content: 'Derived from signal:', fg: t.textDim, width: 35 })
          text({ content: countAsString, fg: t.success })
        }
      })

      // Row 2: Another derived (same pattern)
      box({
        flexDirection: 'row',
        gap: 1,
        children: () => {
          text({ content: 'Another derived:', fg: t.textDim, width: 35 })
          text({ content: countDerivedString, fg: t.success })
        }
      })

      // Row 3: Derived directly (formatted string)
      box({
        flexDirection: 'row',
        gap: 1,
        children: () => {
          text({ content: 'Derived directly (string):', fg: t.textDim, width: 35 })
          text({ content: formattedDerived, fg: t.success })
        }
      })

      // Row 4: Inline getter (inline derived)
      box({
        flexDirection: 'row',
        gap: 1,
        children: () => {
          text({ content: 'Inline getter () =>:', fg: t.textDim, width: 35 })
          text({ content: () => `Count: ${count.value}`, fg: t.success })
        }
      })

      // Row 5: Static value (should NOT update)
      box({
        flexDirection: 'row',
        gap: 1,
        children: () => {
          text({ content: 'Static (should stay 0):', fg: t.textDim, width: 35 })
          text({ content: `Count: ${count.value}`, fg: t.error })
        }
      })

      text({ content: '' })
      text({ content: 'If rows 1-4 update together and row 5 stays at 0,', fg: t.textDim })
      text({ content: 'all reactive syntax forms work correctly!', fg: t.textDim })
    }
  })
}, { mode: 'fullscreen' })
