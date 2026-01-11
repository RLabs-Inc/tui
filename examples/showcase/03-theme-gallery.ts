/**
 * TUI Framework - Theme Gallery Showcase
 *
 * A comprehensive demonstration of the TUI theming system:
 * - All box variants with visual examples
 * - Theme color swatches using t.* reactive deriveds
 * - Live theme switching with number keys
 * - Beautiful flexbox gallery layout
 *
 * Press 1-9 to switch themes, Q to quit.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, themes, setTheme, BorderStyle } from '../../index'
import type { Variant } from '../../src/state/theme'

// Available themes for cycling
const themeList = [
  'terminal',
  'dracula',
  'nord',
  'monokai',
  'solarized',
] as const

// Current theme index (reactive state)
const currentThemeIndex = signal(0)
const currentThemeName = derived(() => themeList[currentThemeIndex.value] ?? 'terminal')

// Helper to create a color swatch box
function colorSwatch(label: string, color: { value: unknown }) {
  box({
    width: 14,
    height: 3,
    border: BorderStyle.ROUNDED,
    borderColor: t.border,
    bg: color as any,
    justifyContent: 'center',
    alignItems: 'center',
    children: () => {
      text({
        content: label,
        fg: t.textBright,
      })
    },
  })
}

// Helper to create a variant showcase box
function variantBox(variant: Variant) {
  box({
    width: 12,
    height: 4,
    variant,
    border: BorderStyle.ROUNDED,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    children: () => {
      text({
        content: variant,
        variant,
      })
    },
  })
}

async function main() {
  const cleanup = await mount(() => {
    // Main container - full screen
    box({
      width: '100%',
      height: '100%',
      bg: t.bg,
      fg: t.text,
      padding: 2,
      gap: 1,
      children: () => {
        // =====================================================================
        // HEADER
        // =====================================================================
        box({
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          children: () => {
            text({
              content: 'TUI Theme Gallery',
              fg: t.primary,
              attrs: 1, // Bold
            })
            box({
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              children: () => {
                text({ content: 'Theme:', fg: t.textMuted })
                text({
                  content: currentThemeName,
                  fg: t.accent,
                  attrs: 1,
                })
              },
            })
          },
        })

        // Separator
        text({
          content: '-'.repeat(80),
          fg: t.border,
        })

        // =====================================================================
        // SECTION: Box Variants
        // =====================================================================
        text({
          content: 'Box Variants',
          fg: t.secondary,
          attrs: 1,
        })
        text({
          content: 'Each box uses variant prop for automatic theme-aware styling',
          fg: t.textMuted,
        })

        // Variant grid - Row 1: Core variants
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            variantBox('default')
            variantBox('primary')
            variantBox('secondary')
            variantBox('tertiary')
            variantBox('accent')
          },
        })

        // Variant grid - Row 2: Semantic variants
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            variantBox('success')
            variantBox('warning')
            variantBox('error')
            variantBox('info')
          },
        })

        // Variant grid - Row 3: Surface variants
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            variantBox('muted')
            variantBox('surface')
            variantBox('elevated')
            variantBox('ghost')
            variantBox('outline')
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // SECTION: Theme Color Palette
        // =====================================================================
        text({
          content: 'Theme Color Palette (t.* reactive deriveds)',
          fg: t.secondary,
          attrs: 1,
        })
        text({
          content: 'Colors update automatically when theme changes',
          fg: t.textMuted,
        })

        // Main palette row
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            colorSwatch('primary', t.primary)
            colorSwatch('secondary', t.secondary)
            colorSwatch('tertiary', t.tertiary)
            colorSwatch('accent', t.accent)
          },
        })

        // Semantic colors row
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            colorSwatch('success', t.success)
            colorSwatch('warning', t.warning)
            colorSwatch('error', t.error)
            colorSwatch('info', t.info)
          },
        })

        // Background colors row
        box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
          children: () => {
            colorSwatch('bg', t.bg)
            colorSwatch('bgMuted', t.bgMuted)
            colorSwatch('surface', t.surface)
            colorSwatch('overlay', t.overlay)
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // SECTION: Text Colors
        // =====================================================================
        text({
          content: 'Text Color Hierarchy',
          fg: t.secondary,
          attrs: 1,
        })

        box({
          flexDirection: 'row',
          gap: 3,
          children: () => {
            text({ content: 'textBright', fg: t.textBright })
            text({ content: 'text', fg: t.text })
            text({ content: 'textMuted', fg: t.textMuted })
            text({ content: 'textDim', fg: t.textDim })
            text({ content: 'textDisabled', fg: t.textDisabled })
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // SECTION: Border Demo
        // =====================================================================
        text({
          content: 'Border Colors',
          fg: t.secondary,
          attrs: 1,
        })

        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            box({
              width: 20,
              height: 3,
              border: BorderStyle.SINGLE,
              borderColor: t.border,
              justifyContent: 'center',
              alignItems: 'center',
              children: () => {
                text({ content: 't.border', fg: t.textMuted })
              },
            })
            box({
              width: 20,
              height: 3,
              border: BorderStyle.DOUBLE,
              borderColor: t.borderFocus,
              justifyContent: 'center',
              alignItems: 'center',
              children: () => {
                text({ content: 't.borderFocus', fg: t.primary })
              },
            })
            box({
              width: 20,
              height: 3,
              border: BorderStyle.ROUNDED,
              borderColor: t.primary,
              justifyContent: 'center',
              alignItems: 'center',
              children: () => {
                text({ content: 't.primary', fg: t.primary })
              },
            })
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // FOOTER: Controls
        // =====================================================================
        text({
          content: '-'.repeat(80),
          fg: t.border,
        })

        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          children: () => {
            // Theme switcher instructions
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: 'Switch theme:', fg: t.textMuted })
                for (let i = 0; i < themeList.length; i++) {
                  const idx = i  // Capture loop variable
                  const fgColor = derived(() =>
                    currentThemeIndex.value === idx ? t.accent.value : t.textDim.value
                  )
                  text({
                    content: `[${i + 1}]${themeList[i]}`,
                    fg: fgColor,
                  })
                }
              },
            })

            // Quit instruction
            text({
              content: '[Q] Quit',
              fg: t.textMuted,
            })
          },
        })
      },
    })
  }, { mode: 'fullscreen' })

  // =====================================================================
  // KEYBOARD HANDLERS
  // =====================================================================

  // Theme switching with number keys
  keyboard.onKey('1', () => {
    currentThemeIndex.value = 0
    setTheme('terminal')
  })

  keyboard.onKey('2', () => {
    currentThemeIndex.value = 1
    setTheme('dracula')
  })

  keyboard.onKey('3', () => {
    currentThemeIndex.value = 2
    setTheme('nord')
  })

  keyboard.onKey('4', () => {
    currentThemeIndex.value = 3
    setTheme('monokai')
  })

  keyboard.onKey('5', () => {
    currentThemeIndex.value = 4
    setTheme('solarized')
  })

  // Quit handlers
  keyboard.onKey('q', () => {
    cleanup().then(() => process.exit(0))
  })

  keyboard.onKey('Q', () => {
    cleanup().then(() => process.exit(0))
  })

  keyboard.onKey('Ctrl+c', () => {
    cleanup().then(() => process.exit(0))
  })
}

main().catch(console.error)
