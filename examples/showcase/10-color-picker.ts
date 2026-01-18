/**
 * TUI Framework - Interactive Color Picker
 *
 * A fun interactive color tool that demonstrates:
 * - Custom RGB color manipulation
 * - Reactive UI updates with signals
 * - Derived color values (hex display, preview)
 * - Keyboard navigation between channels
 * - Preset color palette selection
 * - OKLCH color space for perceptually uniform hues
 *
 * Controls:
 * - Left/Right: Switch between R/G/B channels
 * - Up/Down: Increase/decrease selected channel
 * - PageUp/PageDown: Change by 16
 * - 0-9: Select preset color
 * - H: Cycle hue (using OKLCH for beautiful gradients)
 * - C: Copy hex value (shows "Copied!" message)
 * - R: Reset to white
 * - Q: Quit
 *
 * Run with: bun run examples/showcase/10-color-picker.ts
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, BorderStyle, oklch } from '../../index'
import type { RGBA } from '../../index'

// =============================================================================
// APPLICATION STATE
// =============================================================================

// RGB channel values (0-255)
const red = signal(128)
const green = signal(128)
const blue = signal(128)

// Currently selected channel: 0=R, 1=G, 2=B
const selectedChannel = signal(0)

// Show "Copied!" message temporarily
const showCopied = signal(false)

// Hue cycling state (0-360)
const hueAngle = signal(0)

// =============================================================================
// DERIVED VALUES
// =============================================================================

// Current color as RGBA
const currentColor = derived((): RGBA => ({
  r: red.value,
  g: green.value,
  b: blue.value,
  a: 255,
}))

// Hex representation
const hexValue = derived(() => {
  const r = red.value.toString(16).padStart(2, '0')
  const g = green.value.toString(16).padStart(2, '0')
  const b = blue.value.toString(16).padStart(2, '0')
  return `#${r}${g}${b}`.toUpperCase()
})

// RGB string representation
const rgbValue = derived(() => {
  return `rgb(${red.value}, ${green.value}, ${blue.value})`
})

// HSL approximation for display
const hslValue = derived(() => {
  const r = red.value / 255
  const g = green.value / 255
  const b = blue.value / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return `hsl(0, 0%, ${Math.round(l * 100)}%)`
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
})

// Channel name for display
const channelName = derived(() => {
  const names = ['Red', 'Green', 'Blue']
  return names[selectedChannel.value] ?? 'Red'
})

// =============================================================================
// PRESET COLORS
// =============================================================================

const presets: Array<{ name: string; color: RGBA }> = [
  { name: 'White', color: { r: 255, g: 255, b: 255, a: 255 } },
  { name: 'Red', color: { r: 255, g: 0, b: 0, a: 255 } },
  { name: 'Orange', color: { r: 255, g: 165, b: 0, a: 255 } },
  { name: 'Yellow', color: { r: 255, g: 255, b: 0, a: 255 } },
  { name: 'Green', color: { r: 0, g: 255, b: 0, a: 255 } },
  { name: 'Cyan', color: { r: 0, g: 255, b: 255, a: 255 } },
  { name: 'Blue', color: { r: 0, g: 0, b: 255, a: 255 } },
  { name: 'Purple', color: { r: 128, g: 0, b: 128, a: 255 } },
  { name: 'Pink', color: { r: 255, g: 105, b: 180, a: 255 } },
  { name: 'Black', color: { r: 0, g: 0, b: 0, a: 255 } },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function adjustChannel(delta: number) {
  const channel = selectedChannel.value
  if (channel === 0) {
    red.value = Math.max(0, Math.min(255, red.value + delta))
  } else if (channel === 1) {
    green.value = Math.max(0, Math.min(255, green.value + delta))
  } else {
    blue.value = Math.max(0, Math.min(255, blue.value + delta))
  }
}

function setPreset(index: number) {
  const preset = presets[index]
  if (preset) {
    red.value = preset.color.r
    green.value = preset.color.g
    blue.value = preset.color.b
  }
}

function cycleHue() {
  // Use OKLCH for perceptually uniform hue cycling
  hueAngle.value = (hueAngle.value + 30) % 360
  const color = oklch(0.7, 0.15, hueAngle.value)
  red.value = color.r
  green.value = color.g
  blue.value = color.b
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function SliderBar(props: {
  label: string
  value: { value: number }
  isSelected: { value: boolean }
  color: RGBA
}) {
  const barWidth = 32
  const fillDerived = derived(() =>
    Math.round((props.value.value / 255) * barWidth)
  )
  const barContent = derived(() => {
    const fill = fillDerived.value
    const empty = barWidth - fill
    return '\u2588'.repeat(fill) + '\u2591'.repeat(empty)
  })

  const labelColor = derived(() =>
    props.isSelected.value ? t.accent : t.textMuted
  )

  const valueDisplay = derived(() =>
    props.value.value.toString().padStart(3, ' ')
  )

  box({
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    children: () => {
      // Label
      text({
        content: props.label,
        fg: labelColor,
        width: 6,
      })

      // Selection indicator
      const indicator = derived(() => (props.isSelected.value ? '>' : ' '))
      text({
        content: indicator,
        fg: t.accent,
      })

      // Slider bar
      text({
        content: barContent,
        fg: props.color,
      })

      // Numeric value
      text({
        content: valueDisplay,
        fg: labelColor,
        width: 4,
      })
    },
  })
}

function ColorPreview() {
  box({
    border: BorderStyle.DOUBLE,
    borderColor: t.border,
    padding: 1,
    gap: 1,
    children: () => {
      text({
        content: 'Color Preview',
        fg: t.textMuted,
      })

      // Large preview box
      box({
        width: 20,
        height: 5,
        bg: currentColor,
        border: BorderStyle.ROUNDED,
        borderColor: t.border,
        justifyContent: 'center',
        alignItems: 'center',
        children: () => {
          // Show hex on the preview
          text({
            content: hexValue,
            // Use contrasting color for text
            fg: derived(() => {
              const luminance =
                (red.value * 0.299 + green.value * 0.587 + blue.value * 0.114) /
                255
              return luminance > 0.5
                ? { r: 0, g: 0, b: 0, a: 255 }
                : { r: 255, g: 255, b: 255, a: 255 }
            }),
          })
        },
      })

      // Color values
      box({
        gap: 0,
        children: () => {
          text({ content: hexValue, fg: t.text })
          text({ content: rgbValue, fg: t.textMuted })
          text({ content: hslValue, fg: t.textDim })
        },
      })
    },
  })
}

function PresetPalette() {
  box({
    border: BorderStyle.SINGLE,
    borderColor: t.border,
    padding: 1,
    gap: 1,
    children: () => {
      text({
        content: 'Presets [0-9]',
        fg: t.textMuted,
      })

      // Color swatches row
      box({
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 1,
        children: () => {
          for (let i = 0; i < presets.length; i++) {
            const preset = presets[i]!
            box({
              width: 4,
              height: 2,
              bg: preset.color,
              border: BorderStyle.SINGLE,
              borderColor: derived(() => {
                // Highlight if matches current color
                if (
                  red.value === preset.color.r &&
                  green.value === preset.color.g &&
                  blue.value === preset.color.b
                ) {
                  return t.accent
                }
                return t.border
              }),
              justifyContent: 'center',
              alignItems: 'center',
              children: () => {
                // Show number key
                const luminance =
                  (preset.color.r * 0.299 +
                    preset.color.g * 0.587 +
                    preset.color.b * 0.114) /
                  255
                text({
                  content: `${i}`,
                  fg:
                    luminance > 0.5
                      ? { r: 0, g: 0, b: 0, a: 255 }
                      : { r: 255, g: 255, b: 255, a: 255 },
                })
              },
            })
          }
        },
      })
    },
  })
}

function HueGradient() {
  box({
    border: BorderStyle.SINGLE,
    borderColor: t.border,
    padding: 1,
    gap: 1,
    children: () => {
      text({
        content: 'Hue Gradient [H to cycle]',
        fg: t.textMuted,
      })

      // Rainbow bar using OKLCH
      box({
        flexDirection: 'row',
        children: () => {
          for (let i = 0; i < 36; i++) {
            const hue = i * 10
            const color = oklch(0.7, 0.15, hue)
            box({
              width: 1,
              height: 1,
              bg: color,
            })
          }
        },
      })

      // Current hue indicator
      const hueDisplay = derived(() => `Hue: ${hueAngle.value}`)
      text({
        content: hueDisplay,
        fg: t.textDim,
      })
    },
  })
}

function KeyBindings() {
  box({
    border: BorderStyle.SINGLE,
    borderColor: t.textDim,
    padding: 1,
    gap: 0,
    children: () => {
      text({
        content: 'Controls',
        fg: t.textMuted,
      })

      // Key bindings in two columns
      box({
        flexDirection: 'row',
        gap: 4,
        children: () => {
          box({
            gap: 0,
            children: () => {
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[Left/Right]', fg: t.info, width: 14 })
                  text({ content: 'Switch channel', fg: t.text })
                },
              })
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[Up/Down]', fg: t.info, width: 14 })
                  text({ content: '+/- 1', fg: t.text })
                },
              })
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[PgUp/PgDn]', fg: t.info, width: 14 })
                  text({ content: '+/- 16', fg: t.text })
                },
              })
            },
          })

          box({
            gap: 0,
            children: () => {
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[H]', fg: t.secondary, width: 8 })
                  text({ content: 'Cycle hue', fg: t.text })
                },
              })
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[C]', fg: t.success, width: 8 })
                  text({ content: 'Copy hex', fg: t.text })
                },
              })
              box({
                flexDirection: 'row',
                gap: 1,
                children: () => {
                  text({ content: '[Q]', fg: t.error, width: 8 })
                  text({ content: 'Quit', fg: t.text })
                },
              })
            },
          })
        },
      })
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(
    () => {
      // Root container
      box({
        padding: 2,
        gap: 1,
        children: () => {
          // Header
          box({
            border: BorderStyle.DOUBLE,
            borderColor: t.primary,
            padding: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            children: () => {
              text({
                content: 'TUI Color Picker',
                fg: t.primary,
              })

              // Copied message (appears temporarily)
              const copiedText = derived(() =>
                showCopied.value ? 'Copied!' : ''
              )
              text({
                content: copiedText,
                fg: t.success,
              })
            },
          })

          // Main content area
          box({
            flexDirection: 'row',
            gap: 2,
            children: () => {
              // Left column: RGB Sliders
              box({
                gap: 1,
                children: () => {
                  text({
                    content: 'RGB Channels',
                    fg: t.textMuted,
                  })

                  // Red slider
                  SliderBar({
                    label: 'Red',
                    value: red,
                    isSelected: derived(() => selectedChannel.value === 0),
                    color: { r: 255, g: 50, b: 50, a: 255 },
                  })

                  // Green slider
                  SliderBar({
                    label: 'Green',
                    value: green,
                    isSelected: derived(() => selectedChannel.value === 1),
                    color: { r: 50, g: 255, b: 50, a: 255 },
                  })

                  // Blue slider
                  SliderBar({
                    label: 'Blue',
                    value: blue,
                    isSelected: derived(() => selectedChannel.value === 2),
                    color: { r: 50, g: 50, b: 255, a: 255 },
                  })

                  // Current channel indicator
                  box({
                    flexDirection: 'row',
                    gap: 1,
                    children: () => {
                      text({ content: 'Selected:', fg: t.textDim })
                      text({ content: channelName, fg: t.accent })
                    },
                  })
                },
              })

              // Right column: Preview and Presets
              box({
                gap: 1,
                children: () => {
                  ColorPreview()
                  PresetPalette()
                  HueGradient()
                },
              })
            },
          })

          // Key bindings
          KeyBindings()

          // Footer
          text({
            content:
              'Built with TUI - Fine-grained reactivity for the terminal',
            fg: t.textDim,
          })
        },
      })
    },
    { mode: 'fullscreen' }
  )

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Channel selection
  keyboard.onKey('ArrowLeft', () => {
    selectedChannel.value = (selectedChannel.value + 2) % 3
  })

  keyboard.onKey('ArrowRight', () => {
    selectedChannel.value = (selectedChannel.value + 1) % 3
  })

  // Value adjustment
  keyboard.onKey('ArrowUp', () => {
    adjustChannel(1)
  })

  keyboard.onKey('ArrowDown', () => {
    adjustChannel(-1)
  })

  keyboard.onKey('PageUp', () => {
    adjustChannel(16)
  })

  keyboard.onKey('PageDown', () => {
    adjustChannel(-16)
  })

  // Preset selection (0-9)
  for (let i = 0; i < 10; i++) {
    keyboard.onKey(String(i), () => {
      setPreset(i)
    })
  }

  // Hue cycling
  keyboard.onKey(['h', 'H'], () => {
    cycleHue()
  })

  // Copy hex
  keyboard.onKey(['c', 'C'], () => {
    // In a real app, you'd copy to clipboard here
    // For this demo, we just show the message
    showCopied.value = true
    setTimeout(() => {
      showCopied.value = false
    }, 1500)
  })

  // Reset to white
  keyboard.onKey(['r', 'R'], () => {
    red.value = 255
    green.value = 255
    blue.value = 255
    hueAngle.value = 0
  })

  // Quit
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

// Run the application
main().catch(console.error)
