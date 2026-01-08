/**
 * TUI Framework - Comprehensive Reactivity Test
 *
 * The clean API pattern:
 * - Reactive props: pass signals/deriveds directly
 * - Static props: pass normal values
 *
 * Tests:
 * 1. signal() direct - content: mySignal
 * 2. derived() for formatted text - content: formattedDerived
 * 3. Static value - content: 'Hello'
 * 4. Reactive colors - fg: colorDerived
 * 5. Reactive dimensions - width: widthSignal
 * 6. Reactive visibility - visible: visibleSignal
 * 7. Theme switching - entire UI reacts to theme changes
 *
 * Press keys to test:
 * - SPACE: Increment counter
 * - C: Cycle color
 * - W: Toggle width
 * - V: Toggle visibility
 * - T: Cycle theme (terminal, dracula, nord, monokai, solarized)
 * - Q: Quit
 */

import { mount, box, text, signal, keyboard, Colors, BorderStyle, theme, setTheme, resolveColor } from '../index'
import { derived } from '@rlabs-inc/signals'

// Available themes
const themeNames = ['terminal', 'dracula', 'nord', 'monokai', 'solarized'] as const

async function main() {
  // ==========================================================================
  // REACTIVE STATE
  // ==========================================================================

  // Basic counter
  const count = signal(0)

  // Derived for formatted text (the clean way to compose text with signals)
  const countText = derived(() => `Count: ${count.value}`)
  const doubledText = derived(() => `Doubled: ${count.value * 2}`)
  const tripledText = derived(() => `Tripled: ${count.value * 3}`)

  // Color cycling (custom colors independent of theme)
  const colors = [Colors.RED, Colors.GREEN, Colors.BLUE, Colors.YELLOW, Colors.CYAN, Colors.MAGENTA]
  const colorIndex = signal(0)
  const currentColor = derived(() => colors[colorIndex.value % colors.length])

  // Dynamic dimensions
  const boxWidth = signal(60)

  // Visibility toggle
  const showOptional = signal(true)

  // Theme index
  const themeIndex = signal(0)
  const currentThemeName = derived(() => themeNames[themeIndex.value % themeNames.length])

  // Status message
  const status = signal('Ready! Press keys to test reactivity.')

  // Theme-derived colors (reactive to theme changes!)
  const primaryColor = derived(() => resolveColor(theme.primary))
  const successColor = derived(() => resolveColor(theme.success))
  const warningColor = derived(() => resolveColor(theme.warning))
  const errorColor = derived(() => resolveColor(theme.error))
  const infoColor = derived(() => resolveColor(theme.info))
  const borderColor = derived(() => resolveColor(theme.border))
  const textColor = derived(() => resolveColor(theme.text))

  // ==========================================================================
  // MOUNT THE APP
  // ==========================================================================

  const cleanup = await mount(() => {
    // Main container - uses theme border color
    box({
      width: boxWidth,  // Reactive dimension
      height: 24,
      border: BorderStyle.ROUNDED,
      borderColor: primaryColor,  // Reactive theme color!
      padding: 1,
      flexDirection: 'column',
      gap: 1,
      children: () => {

        // Title - theme-aware
        text({
          content: '=== TUI Reactivity Test Suite ===',
          fg: primaryColor,  // Reactive theme color
          width: 40,
          height: 1,
        })

        // Theme indicator
        text({
          content: derived(() => `Theme: ${theme.name}`),
          fg: infoColor,
          width: 40,
          height: 1,
        })

        // ---------------------------------------------------------------------
        // SECTION 1: Counter tests
        // ---------------------------------------------------------------------

        // Counter box - auto height
        box({
          width: 50,
          // height: auto
          border: BorderStyle.SINGLE,
          borderColor: successColor,  // Reactive theme color
          padding: 1,
          flexDirection: 'column',
          children: () => {
            text({
              content: 'Counter Reactivity:',
              fg: textColor,
              width: 30,
              height: 1,
            })

            // Derived signal - formatted text
            text({
              content: countText,
              fg: warningColor,  // Theme warning color
              width: 30,
              height: 1,
            })

            // Another derived
            text({
              content: doubledText,
              fg: successColor,  // Theme success color
              width: 30,
              height: 1,
            })

            // And another
            text({
              content: tripledText,
              fg: infoColor,  // Theme info color
              width: 30,
              height: 1,
            })
          }
        })

        // ---------------------------------------------------------------------
        // SECTION 2: Color reactivity (independent of theme)
        // ---------------------------------------------------------------------

        // Color box - auto height
        box({
          width: 50,
          // height: auto
          border: BorderStyle.SINGLE,
          borderColor: borderColor,
          padding: 1,
          flexDirection: 'column',
          children: () => {
            text({
              content: 'Custom Color Cycle (press C):',
              fg: textColor,
              width: 35,
              height: 1,
            })

            // Reactive color via derived (not theme, custom cycle)
            text({
              content: 'This text cycles through custom colors!',
              fg: currentColor,  // Custom color cycle
              width: 42,
              height: 1,
            })
          }
        })

        // ---------------------------------------------------------------------
        // SECTION 3: Theme color showcase
        // ---------------------------------------------------------------------

        // Theme box - auto height
        box({
          width: 50,
          // height: auto
          border: BorderStyle.SINGLE,
          borderColor: primaryColor,
          padding: 1,
          flexDirection: 'row',
          gap: 1,
          children: () => {
            text({ content: 'Err', fg: errorColor, width: 5, height: 1 })
            text({ content: 'Warn', fg: warningColor, width: 5, height: 1 })
            text({ content: 'Ok', fg: successColor, width: 5, height: 1 })
            text({ content: 'Info', fg: infoColor, width: 5, height: 1 })
            text({ content: 'Pri', fg: primaryColor, width: 5, height: 1 })
          }
        })

        // ---------------------------------------------------------------------
        // SECTION 4: Visibility reactivity
        // ---------------------------------------------------------------------

        text({
          content: 'Visibility test (press V):',
          fg: textColor,
          width: 30,
          height: 1,
        })

        // Reactive visibility
        box({
          width: 50,
          height: 2,
          visible: showOptional,  // Signal<boolean>
          border: BorderStyle.SINGLE,
          borderColor: warningColor,
          children: () => {
            text({
              content: 'I am visible! Toggle me with V key.',
              fg: warningColor,
              width: 45,
              height: 1,
            })
          }
        })

        // ---------------------------------------------------------------------
        // Status bar
        // ---------------------------------------------------------------------

        text({
          content: status,  // signal() for reactive status message
          fg: textColor,
          width: 55,
          height: 1,
        })

        text({
          content: 'SPACE=count C=color W=width V=visible T=theme Q=quit',
          fg: infoColor,
          width: 55,
          height: 1,
        })
      }
    })
  })

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  keyboard.onKey((event) => {
    const key = event.key.toLowerCase()

    // Increment counter
    if (event.key === 'Space' || key === ' ') {
      count.value++
      status.value = `Counter: ${count.value} | Doubled: ${count.value * 2}`
    }

    // Cycle color
    if (key === 'c') {
      colorIndex.value++
      status.value = `Custom color index: ${colorIndex.value}`
    }

    // Toggle width
    if (key === 'w') {
      boxWidth.value = boxWidth.value === 60 ? 80 : 60
      status.value = `Width: ${boxWidth.value}`
    }

    // Toggle visibility
    if (key === 'v') {
      showOptional.value = !showOptional.value
      status.value = `Visible: ${showOptional.value}`
    }

    // Cycle theme
    if (key === 't') {
      themeIndex.value++
      const nextTheme = themeNames[themeIndex.value % themeNames.length]
      setTheme(nextTheme)
      status.value = `Theme: ${nextTheme}`
    }

    // Quit
    if (key === 'q' || (event.modifiers?.ctrl && key === 'c')) {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
