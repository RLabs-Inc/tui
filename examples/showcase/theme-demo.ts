/**
 * TUI Framework - Reactive Theme Demo
 *
 * Demonstrates:
 * - Theme color helpers (t.primary, t.error, etc.)
 * - Box variants (primary, success, error, etc.)
 * - Reactive theme switching
 * - All colors update instantly when theme changes!
 *
 * Controls:
 * - 1-5: Switch themes (terminal, dracula, nord, monokai, solarized)
 * - Q: Quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import {
  mount,
  box,
  text,
  keyboard,
  BorderStyle,
  theme,
  themes,
  setTheme,
  t,
} from '../index'
import type { Variant } from '../index'

async function main() {
  // Track current theme name reactively
  const currentTheme = signal<keyof typeof themes>('terminal')

  const cleanup = await mount(() => {
    // Main container
    box({
      width: 80,
      padding: 1,
      border: BorderStyle.ROUNDED,
      borderColor: t.border,
      bg: t.bg,
      children: () => {
        // Header
        text({
          content: derived(() => `REACTIVE THEME DEMO - ${theme.name.toUpperCase()}`),
          fg: t.primary,
        })
        text({
          content: derived(() => theme.description),
          fg: t.textMuted,
        })
        text({ content: '─'.repeat(76), fg: t.border })
        text({
          content: '1-5: Switch themes | Q: Quit',
          fg: t.textMuted,
        })
        text({ content: '' })

        // =========================================
        // SECTION 1: Variants
        // =========================================
        text({ content: 'BOX VARIANTS', fg: t.textBright })
        text({ content: '' })

        // Row 1: Core semantic variants
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            const row1: Variant[] = ['default', 'primary', 'secondary', 'tertiary', 'accent']

            for (const variant of row1) {
              box({
                variant,
                border: BorderStyle.SINGLE,
                padding: 0,
                width: 11,
                height: 3,
                children: () => {
                  const darkText = variant === 'accent'
                  text({ content: variant, fg: darkText ? { r: 0, g: 0, b: 0, a: 255 } : undefined })
                },
              })
            }
          },
        })

        // Row 2: Status variants
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            const row2: Variant[] = ['success', 'warning', 'error', 'info']

            for (const variant of row2) {
              box({
                variant,
                border: BorderStyle.SINGLE,
                padding: 0,
                width: 11,
                height: 3,
                children: () => {
                  const darkText = variant === 'warning'
                  text({ content: variant, fg: darkText ? { r: 0, g: 0, b: 0, a: 255 } : undefined })
                },
              })
            }
          },
        })

        // Row 3: Surface and subtle variants
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            const row3: Variant[] = ['surface', 'elevated', 'muted', 'ghost', 'outline']

            for (const variant of row3) {
              box({
                variant,
                border: BorderStyle.SINGLE,
                padding: 0,
                width: 11,
                height: 3,
                children: () => {
                  text({ content: variant })
                },
              })
            }
          },
        })

        text({ content: '' })

        // Sample usage text
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              variant: 'muted',
              border: BorderStyle.SINGLE,
              padding: 1,
              width: 25,
              children: () => {
                text({ content: 'Muted: De-emphasized' })
                text({ content: 'content like hints' })
              },
            })
            box({
              variant: 'elevated',
              border: BorderStyle.SINGLE,
              padding: 1,
              width: 25,
              children: () => {
                text({ content: 'Elevated: Modals,' })
                text({ content: 'dropdowns, popovers' })
              },
            })
          },
        })

        text({ content: '' })

        // =========================================
        // SECTION 2: Theme Colors
        // =========================================
        text({ content: 'THEME COLORS', fg: t.textBright })
        text({ content: '' })

        // Main palette row
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            const colors = [
              { name: 'primary', color: t.primary },
              { name: 'secondary', color: t.secondary },
              { name: 'tertiary', color: t.tertiary },
              { name: 'accent', color: t.accent },
            ]
            for (const { name, color } of colors) {
              box({
                width: 12,
                height: 3,
                bg: color,
                children: () => {
                  text({ content: name, fg: t.textBright })
                },
              })
            }
          },
        })

        text({ content: '' })

        // Semantic colors row
        box({
          flexDirection: 'row',
          gap: 1,
          children: () => {
            const colors = [
              { name: 'success', color: t.success },
              { name: 'warning', color: t.warning },
              { name: 'error', color: t.error },
              { name: 'info', color: t.info },
            ]
            for (const { name, color } of colors) {
              box({
                width: 12,
                height: 3,
                bg: color,
                children: () => {
                  text({
                    content: name,
                    fg: name === 'warning' ? { r: 0, g: 0, b: 0, a: 255 } : t.textBright,
                  })
                },
              })
            }
          },
        })

        text({ content: '' })

        // Text colors
        text({ content: 'TEXT COLORS', fg: t.textBright })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'text', fg: t.text })
            text({ content: 'textMuted', fg: t.textMuted })
            text({ content: 'textDim', fg: t.textDim })
            text({ content: 'textBright', fg: t.textBright })
          },
        })

        text({ content: '' })

        // =========================================
        // SECTION 3: Using t.* helpers
        // =========================================
        text({ content: 'USING t.* HELPERS', fg: t.textBright })
        text({ content: '' })

        box({
          border: BorderStyle.ROUNDED,
          borderColor: t.primary,
          padding: 1,
          children: () => {
            text({
              content: "box({ borderColor: t.primary, fg: t.text })",
              fg: t.text,
            })
            text({
              content: "These colors update when theme changes!",
              fg: t.textMuted,
            })
          },
        })

        text({ content: '' })

        // =========================================
        // SECTION 4: Available Themes
        // =========================================
        text({ content: 'AVAILABLE THEMES', fg: t.textBright })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            const themeNames = Object.keys(themes) as (keyof typeof themes)[]
            themeNames.forEach((name, i) => {
              text({
                content: derived(() =>
                  theme.name === name ? `[${i + 1}] ${name.toUpperCase()}` : `[${i + 1}] ${name}`
                ),
                fg: derived(() => (theme.name === name ? t.primary.value : t.textMuted.value)),
              })
            })
          },
        })
      },
    })
  }, { mode: 'inline', mouse: false })

  // Theme switching handlers
  const themeNames = Object.keys(themes) as (keyof typeof themes)[]
  themeNames.forEach((name, i) => {
    keyboard.onKey(String(i + 1), () => {
      setTheme(name)
      currentTheme.value = name
    })
  })

  // Quit handler
  keyboard.onKey('q', cleanup)
  keyboard.onKey('Q', cleanup)
}

main().catch(console.error)
