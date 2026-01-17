/**
 * TUI Framework - Input Showcase
 *
 * A comprehensive demonstration of the input primitive:
 * - Basic text input with placeholder
 * - Password mode with custom mask
 * - Theme variants (primary, success, error, warning, info)
 * - Cursor styles (bar, block, underline)
 * - Max length constraints
 * - Live value binding
 * - Submit history
 * - Tab navigation between inputs
 *
 * Tab/Shift+Tab to navigate, Enter to submit, Q to quit.
 */

import { signal, derived } from '@rlabs-inc/signals'
import {
  box,
  text,
  input,
  each,
  mount,
  keyboard,
  focusManager,
  t,
  BorderStyle,
} from '../../index'
import type { Variant, CursorStyle } from '../../index'

// =============================================================================
// APPLICATION STATE
// =============================================================================

// Input values
const basicValue = signal('')
const passwordValue = signal('')
const limitedValue = signal('')
const primaryValue = signal('')
const successValue = signal('')
const errorValue = signal('')

// Submission history
let submissionId = 0
const submissions = signal<Array<{ id: number; label: string; value: string; time: string }>>([])

// Currently focused input name (for display)
const focusedName = signal('Basic Input')

// Add submission to history
function addSubmission(label: string, value: string) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false })
  submissions.value = [
    { id: ++submissionId, label, value, time },
    ...submissions.value.slice(0, 4), // Keep last 5
  ]
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

// Section header
function sectionHeader(title: string) {
  text({
    content: title,
    fg: t.secondary,
    attrs: 1, // Bold
  })
}

// Input row with label
function inputRow(
  label: string,
  valueSignal: ReturnType<typeof signal<string>>,
  options: {
    placeholder?: string
    password?: boolean
    maskChar?: string
    maxLength?: number
    variant?: Variant
    cursor?: { style?: CursorStyle; blink?: boolean }
    width?: number
  } = {}
) {
  box({
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    children: () => {
      // Label
      text({
        content: label,
        fg: t.textMuted,
        width: 16,
      })

      // Input
      input({
        value: valueSignal,
        placeholder: options.placeholder ?? 'Type here...',
        password: options.password,
        maskChar: options.maskChar,
        maxLength: options.maxLength,
        variant: options.variant,
        cursor: options.cursor,
        width: options.width ?? 30,
        border: BorderStyle.ROUNDED,
        padding: 0,
        paddingLeft: 1,
        paddingRight: 1,
        onFocus: () => {
          focusedName.value = label
        },
        onSubmit: (val) => {
          if (val.trim()) {
            addSubmission(label, options.password ? '********' : val)
          }
        },
      })

      // Live value preview (unless password)
      if (!options.password) {
        text({
          content: () => {
            const val = valueSignal.value
            if (!val) return ''
            const display = val.length > 15 ? val.slice(0, 15) + '...' : val
            return `"${display}"`
          },
          fg: t.textDim,
          width: 20,
        })
      }
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Main container
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
            box({
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
              children: () => {
                text({
                  content: 'TUI Input Showcase',
                  fg: t.primary,
                  attrs: 1,
                })
                text({
                  content: 'v1.0',
                  fg: t.textDim,
                })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              children: () => {
                text({ content: 'Focus:', fg: t.textMuted })
                text({
                  content: focusedName,
                  fg: t.accent,
                  attrs: 1,
                })
              },
            })
          },
        })

        // Separator
        text({
          content: '─'.repeat(80),
          fg: t.border,
        })

        // =====================================================================
        // BASIC INPUTS SECTION
        // =====================================================================
        sectionHeader('Basic Inputs')

        box({
          gap: 1,
          paddingLeft: 2,
          children: () => {
            inputRow('Basic Input', basicValue, {
              placeholder: 'Enter some text...',
              cursor: { style: 'bar', blink: true },
            })

            inputRow('Password', passwordValue, {
              placeholder: 'Enter password...',
              password: true,
              maskChar: '●',
              cursor: { style: 'block', blink: true },
            })

            inputRow('Max 10 chars', limitedValue, {
              placeholder: 'Limited input...',
              maxLength: 10,
              cursor: { style: 'underline', blink: true },
            })
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // VARIANT INPUTS SECTION
        // =====================================================================
        sectionHeader('Theme Variants')

        box({
          gap: 1,
          paddingLeft: 2,
          children: () => {
            inputRow('Primary', primaryValue, {
              placeholder: 'Primary styled...',
              variant: 'primary',
            })

            inputRow('Success', successValue, {
              placeholder: 'Success styled...',
              variant: 'success',
            })

            inputRow('Error', errorValue, {
              placeholder: 'Error styled...',
              variant: 'error',
              cursor: { blink: false },  // Test: no blink
            })
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // CURSOR STYLES DEMO
        // =====================================================================
        sectionHeader('Cursor Styles')

        box({
          flexDirection: 'row',
          gap: 3,
          paddingLeft: 2,
          children: () => {
            box({
              gap: 0,
              children: () => {
                text({ content: 'Bar │', fg: t.textMuted })
                text({ content: 'Default style', fg: t.textDim })
              },
            })
            box({
              gap: 0,
              children: () => {
                text({ content: 'Block █', fg: t.textMuted })
                text({ content: 'Password style', fg: t.textDim })
              },
            })
            box({
              gap: 0,
              children: () => {
                text({ content: 'Underline _', fg: t.textMuted })
                text({ content: 'Limited style', fg: t.textDim })
              },
            })
          },
        })

        // Spacer
        text({ content: '' })

        // =====================================================================
        // SUBMISSION HISTORY
        // =====================================================================
        sectionHeader('Submission History')

        box({
          border: BorderStyle.SINGLE,
          borderColor: t.border,
          width: 60,
          height: 8,
          padding: 1,
          marginLeft: 2,
          overflow: 'hidden',
          children: () => {
            const isEmpty = derived(() => submissions.value.length === 0)

            // Empty state
            box({
              visible: isEmpty,
              children: () => {
                text({
                  content: 'Press Enter in any input to submit...',
                  fg: t.textDim,
                })
              },
            })

            // Submissions list
            box({
              visible: () => !isEmpty.value,
              gap: 0,
              children: () => {
                each(
                  () => submissions.value,
                  (getItem) => {
                    return box({
                      flexDirection: 'row',
                      gap: 2,
                      children: () => {
                        text({
                          content: () => `[${getItem().time}]`,
                          fg: t.textDim,
                          width: 12,
                        })
                        text({
                          content: () => getItem().label,
                          fg: t.accent,
                          width: 16,
                        })
                        text({
                          content: () => getItem().value,
                          fg: t.text,
                        })
                      },
                    })
                  },
                  { key: (item) => `submission-${item.id}` }
                )
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
          content: '─'.repeat(80),
          fg: t.border,
        })

        box({
          flexDirection: 'row',
          gap: 4,
          children: () => {
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '[Tab]', fg: t.accent })
                text({ content: 'Next input', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '[Shift+Tab]', fg: t.accent })
                text({ content: 'Previous', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '[Enter]', fg: t.success })
                text({ content: 'Submit', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '[Esc]', fg: t.warning })
                text({ content: 'Clear', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: '[Q]', fg: t.error })
                text({ content: 'Quit', fg: t.textMuted })
              },
            })
          },
        })

        // Framework credit
        text({
          content: 'Built with TUI - Fine-grained reactivity for the terminal',
          fg: t.textDim,
          marginTop: 1,
        })
      },
    })
  }, { mode: 'fullscreen' })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Focus first input on start
  queueMicrotask(() => {
    focusManager.focusFirst()
  })

  // Tab navigation
  keyboard.onKey('Tab', () => {
    focusManager.focusNext()
    return true
  })

  // Quit
  keyboard.onKey(['q', 'Q'], () => {
    cleanup().then(() => process.exit(0))
  })

  keyboard.onKey('Ctrl+c', () => {
    cleanup().then(() => process.exit(0))
  })
}

main().catch(console.error)
