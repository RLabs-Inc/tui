/**
 * TUI Framework - Text Variants Test
 *
 * Tests all 14 theme variants on text primitive:
 * - Core: default, primary, secondary, tertiary, accent
 * - Status: success, warning, error, info
 * - Surface: muted, surface, elevated, ghost, outline
 */

import { mount, box, text, keyboard } from '../../index'

const variants = [
  // Core variants
  'default', 'primary', 'secondary', 'tertiary', 'accent',
  // Status variants
  'success', 'warning', 'error', 'info',
  // Surface variants
  'muted', 'surface', 'elevated', 'ghost', 'outline'
] as const

async function main() {
  const cleanup = await mount(() => {
    box({
      width: 60,
      height: 20,
      border: 1,
      padding: 1,
      flexDirection: 'column',
      gap: 0,
      children: () => {
        text({ content: 'Text Variants Test (all 14)', variant: 'accent' })
        text({ content: '─'.repeat(40), variant: 'muted' })

        // Core variants
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'default', variant: 'default' })
            text({ content: 'primary', variant: 'primary' })
            text({ content: 'secondary', variant: 'secondary' })
            text({ content: 'tertiary', variant: 'tertiary' })
            text({ content: 'accent', variant: 'accent' })
          }
        })

        // Status variants
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'success', variant: 'success' })
            text({ content: 'warning', variant: 'warning' })
            text({ content: 'error', variant: 'error' })
            text({ content: 'info', variant: 'info' })
          }
        })

        // Surface variants
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'muted', variant: 'muted' })
            text({ content: 'surface', variant: 'surface' })
            text({ content: 'elevated', variant: 'elevated' })
            text({ content: 'ghost', variant: 'ghost' })
            text({ content: 'outline', variant: 'outline' })
          }
        })

        text({ content: '─'.repeat(40), variant: 'muted' })
        text({ content: 'Press q to quit', variant: 'muted' })
      }
    })
  }, { mode: 'fullscreen' })

  // Quit on 'q' or Ctrl+C
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
