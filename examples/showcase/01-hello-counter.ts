/**
 * TUI Framework - Hello Counter Example
 *
 * Your first TUI application! This example demonstrates:
 * - Creating a simple reactive UI with box and text primitives
 * - Using signals for reactive state management
 * - Handling keyboard input with keyboard.onKey()
 * - Using theme colors for consistent styling
 * - Flexbox layout with direction, gap, and padding
 *
 * Run with: bun run examples/showcase/01-hello-counter.ts
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, BorderStyle } from '../../index'

// =============================================================================
// APPLICATION STATE
// =============================================================================

// Create a reactive signal for our counter
// When counter.value changes, the UI automatically updates!
const counter = signal(0)

// Derived values automatically recompute when their dependencies change
const counterDisplay = derived(() => {
  const value = counter.value
  // Add some visual interest with different formats
  if (value === 0) return '0'
  if (value > 0) return `+${value}`
  return `${value}`
})

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // Mount the application - this sets up the terminal and starts rendering
  const cleanup = await mount(() => {
    // Root container - full width, centered content
    box({
      padding: 2,
      gap: 1,
      children: () => {
        // =======================================================================
        // HEADER
        // =======================================================================
        box({
          border: BorderStyle.DOUBLE,
          borderColor: t.primary,
          padding: 1,
          gap: 1,
          alignItems: 'center',
          children: () => {
            text({
              content: 'Welcome to TUI!',
              fg: t.primary,
            })
            text({
              content: 'A reactive terminal UI framework',
              fg: t.textDim,
            })
          },
        })

        // =======================================================================
        // COUNTER DISPLAY
        // =======================================================================
        box({
          border: BorderStyle.ROUNDED,
          borderColor: t.border,
          padding: 1,
          gap: 1,
          children: () => {
            // Counter label
            text({
              content: 'Counter',
              fg: t.textDim,
            })

            // The counter value - reactive!
            // Uses a derived to format the display
            box({
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              children: () => {
                // Create a derived for the dynamic color
                const counterColor = derived(() => {
                  const val = counter.value
                  if (val > 0) return t.success
                  if (val < 0) return t.error
                  return t.text
                })

                text({
                  content: counterDisplay,
                  fg: counterColor,
                })
              },
            })

            // Visual bar showing counter magnitude
            box({
              flexDirection: 'row',
              children: () => {
                // Create deriveds for reactive bar display
                const barContent = derived(() => {
                  const char = counter.value >= 0 ? '+' : '-'
                  return char.repeat(Math.max(1, Math.min(Math.abs(counter.value), 20)))
                })
                const barColor = derived(() =>
                  counter.value >= 0 ? t.success : t.error
                )

                text({
                  content: barContent,
                  fg: barColor,
                })
              },
            })
          },
        })

        // =======================================================================
        // KEY BINDINGS HELP
        // =======================================================================
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.textDim,
          padding: 1,
          gap: 1,
          children: () => {
            text({
              content: 'Key Bindings',
              fg: t.textDim,
            })

            // Key binding rows
            box({
              gap: 0,
              children: () => {
                // Increment
                box({
                  flexDirection: 'row',
                  gap: 2,
                  children: () => {
                    text({ content: '[+]  [Up]', fg: t.success, width: 12 })
                    text({ content: 'Increment counter', fg: t.text })
                  },
                })

                // Decrement
                box({
                  flexDirection: 'row',
                  gap: 2,
                  children: () => {
                    text({ content: '[-]  [Down]', fg: t.error, width: 12 })
                    text({ content: 'Decrement counter', fg: t.text })
                  },
                })

                // Reset
                box({
                  flexDirection: 'row',
                  gap: 2,
                  children: () => {
                    text({ content: '[r]', fg: t.warning, width: 12 })
                    text({ content: 'Reset to zero', fg: t.text })
                  },
                })

                // Quit
                box({
                  flexDirection: 'row',
                  gap: 2,
                  children: () => {
                    text({ content: '[q]', fg: t.textDim, width: 12 })
                    text({ content: 'Quit application', fg: t.text })
                  },
                })
              },
            })
          },
        })

        // =======================================================================
        // FOOTER
        // =======================================================================
        text({
          content: 'Built with TUI - Fine-grained reactivity for the terminal',
          fg: t.textDim,
        })
      },
    })
  }, { mode: 'fullscreen' })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Increment: + or ArrowUp
  keyboard.onKey(['+', '=', 'ArrowUp'], () => {
    counter.value++
  })

  // Decrement: - or ArrowDown
  keyboard.onKey(['-', '_', 'ArrowDown'], () => {
    counter.value--
  })

  // Reset: r
  keyboard.onKey(['r', 'R'], () => {
    counter.value = 0
  })

  // Quit: q or Escape
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

// Run the application
main().catch(console.error)
