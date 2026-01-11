/**
 * Showcase 12: Markdown Viewer
 *
 * Demonstrates:
 * - Text attributes (bold, italic, dim, underline)
 * - Styled text for headers, code blocks, and emphasis
 * - Scrollable content with virtual scrolling
 * - Line numbers gutter
 * - Keyboard navigation (arrows, page up/down, home/end)
 *
 * A simple markdown-style document reader with formatting.
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, Attr, BorderStyle, Colors, rgba } from '../../index'

// =============================================================================
// MARKDOWN DOCUMENT DATA
// =============================================================================

// Document line types for styling
type LineType = 'h1' | 'h2' | 'h3' | 'code' | 'list' | 'quote' | 'emphasis' | 'bold' | 'normal' | 'blank' | 'separator'

interface DocLine {
  content: string
  type: LineType
  indent?: number
}

// Sample markdown-like document
const document: DocLine[] = [
  { content: '  TUI Framework Documentation', type: 'h1' },
  { content: '', type: 'blank' },
  { content: 'A reactive terminal UI framework for TypeScript/Bun', type: 'emphasis' },
  { content: '', type: 'blank' },
  { content: '## Getting Started', type: 'h2' },
  { content: '', type: 'blank' },
  { content: '### Installation', type: 'h3' },
  { content: '', type: 'blank' },
  { content: 'Install the package using bun:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    bun add @rlabs-inc/tui', type: 'code' },
  { content: '', type: 'blank' },
  { content: 'Or with npm:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    npm install @rlabs-inc/tui', type: 'code' },
  { content: '', type: 'blank' },
  { content: '## Core Concepts', type: 'h2' },
  { content: '', type: 'blank' },
  { content: 'TUI is built on these key principles:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '  * Fine-grained Reactivity', type: 'list' },
  { content: '      Only what changes gets re-rendered', type: 'emphasis' },
  { content: '', type: 'blank' },
  { content: '  * Parallel Arrays (ECS-style)', type: 'list' },
  { content: '      Components are indices, properties are arrays', type: 'emphasis' },
  { content: '', type: 'blank' },
  { content: '  * Zero Fixed-FPS Rendering', type: 'list' },
  { content: '      Renders only when state changes', type: 'emphasis' },
  { content: '', type: 'blank' },
  { content: '## Primitives', type: 'h2' },
  { content: '', type: 'blank' },
  { content: '### Box', type: 'h3' },
  { content: '', type: 'blank' },
  { content: 'Container with flexbox layout, borders, and backgrounds.', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    box({', type: 'code' },
  { content: '      width: 40,', type: 'code' },
  { content: '      height: 10,', type: 'code' },
  { content: '      border: BorderStyle.ROUNDED,', type: 'code' },
  { content: '      padding: 1,', type: 'code' },
  { content: '      children: () => {', type: 'code' },
  { content: '        text({ content: "Hello!" })', type: 'code' },
  { content: '      }', type: 'code' },
  { content: '    })', type: 'code' },
  { content: '', type: 'blank' },
  { content: '### Text', type: 'h3' },
  { content: '', type: 'blank' },
  { content: 'Display text with styling, alignment, and wrapping.', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    text({', type: 'code' },
  { content: '      content: "Bold text",', type: 'code' },
  { content: '      attrs: Attr.BOLD', type: 'code' },
  { content: '    })', type: 'code' },
  { content: '', type: 'blank' },
  { content: '## Text Attributes', type: 'h2' },
  { content: '', type: 'blank' },
  { content: 'Available text attributes (combine with |):', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '  * Attr.BOLD      - Makes text bold/bright', type: 'list' },
  { content: '  * Attr.DIM       - Makes text dimmed/faded', type: 'list' },
  { content: '  * Attr.ITALIC    - Makes text italic', type: 'list' },
  { content: '  * Attr.UNDERLINE - Underlines the text', type: 'list' },
  { content: '', type: 'blank' },
  { content: 'Example combining attributes:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    attrs: Attr.BOLD | Attr.UNDERLINE', type: 'code' },
  { content: '', type: 'blank' },
  { content: '## Layout System', type: 'h2' },
  { content: '', type: 'blank' },
  { content: 'TITAN - The Layout Engine', type: 'bold' },
  { content: '', type: 'blank' },
  { content: 'Complete flexbox implementation:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '  * flexDirection: row, column, row-reverse, column-reverse', type: 'list' },
  { content: '  * flexWrap: nowrap, wrap, wrap-reverse', type: 'list' },
  { content: '  * justifyContent: flex-start, center, flex-end, space-between', type: 'list' },
  { content: '  * alignItems: stretch, flex-start, center, flex-end', type: 'list' },
  { content: '  * grow, shrink, flexBasis for flex items', type: 'list' },
  { content: '  * gap for spacing between children', type: 'list' },
  { content: '', type: 'blank' },
  { content: '## State Management', type: 'h2' },
  { content: '', type: 'blank' },
  { content: 'Built-in state modules:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '  * keyboard - Key event handling', type: 'list' },
  { content: '  * mouse    - Mouse tracking and hit testing', type: 'list' },
  { content: '  * focus    - Focus management and tab navigation', type: 'list' },
  { content: '  * scroll   - Scroll position and scrolling', type: 'list' },
  { content: '  * theme    - Theme colors and variants', type: 'list' },
  { content: '', type: 'blank' },
  { content: '### Keyboard Handling Example', type: 'h3' },
  { content: '', type: 'blank' },
  { content: '    keyboard.onKey("Enter", () => {', type: 'code' },
  { content: '      console.log("Enter pressed!")', type: 'code' },
  { content: '    })', type: 'code' },
  { content: '', type: 'blank' },
  { content: '    keyboard.onKey(["ArrowUp", "k"], () => {', type: 'code' },
  { content: '      // Handle both arrow up and vim-style k', type: 'code' },
  { content: '    })', type: 'code' },
  { content: '', type: 'blank' },
  { content: '## Theming', type: 'h2' },
  { content: '', type: 'blank' },
  { content: 'Use theme colors for consistent styling:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    import { t } from "@rlabs-inc/tui"', type: 'code' },
  { content: '', type: 'blank' },
  { content: '    text({ content: "Primary", fg: t.primary })', type: 'code' },
  { content: '    text({ content: "Success", fg: t.success })', type: 'code' },
  { content: '    text({ content: "Error", fg: t.error })', type: 'code' },
  { content: '', type: 'blank' },
  { content: 'Variants apply automatic styling:', type: 'normal' },
  { content: '', type: 'blank' },
  { content: '    box({ variant: "primary", children: () => { ... } })', type: 'code' },
  { content: '    box({ variant: "success", children: () => { ... } })', type: 'code' },
  { content: '', type: 'blank' },
  { content: '────────────────────────────────────────────────', type: 'separator' },
  { content: '', type: 'blank' },
  { content: 'End of documentation. Press q to quit.', type: 'emphasis' },
]

// =============================================================================
// STATE
// =============================================================================

const scrollOffset = signal(0)
const VISIBLE_LINES = 28  // Lines visible in viewport

// Derived values
const maxScroll = Math.max(0, document.length - VISIBLE_LINES)
const scrollPercent = derived(() => {
  if (maxScroll === 0) return 100
  return Math.round((scrollOffset.value / maxScroll) * 100)
})

// =============================================================================
// STYLING HELPERS
// =============================================================================

function getLineStyle(type: LineType): { fg: typeof Colors.WHITE, bg: typeof Colors.TRANSPARENT, attrs: number } {
  switch (type) {
    case 'h1':
      return { fg: Colors.CYAN, bg: Colors.TRANSPARENT, attrs: Attr.BOLD | Attr.UNDERLINE }
    case 'h2':
      return { fg: Colors.GREEN, bg: Colors.TRANSPARENT, attrs: Attr.BOLD }
    case 'h3':
      return { fg: Colors.YELLOW, bg: Colors.TRANSPARENT, attrs: Attr.BOLD }
    case 'code':
      return { fg: Colors.MAGENTA, bg: Colors.TRANSPARENT, attrs: Attr.NONE }
    case 'list':
      return { fg: Colors.CYAN, bg: Colors.TRANSPARENT, attrs: Attr.NONE }
    case 'quote':
      return { fg: Colors.GRAY, bg: Colors.TRANSPARENT, attrs: Attr.ITALIC }
    case 'emphasis':
      return { fg: Colors.GRAY, bg: Colors.TRANSPARENT, attrs: Attr.ITALIC }
    case 'bold':
      return { fg: Colors.WHITE, bg: Colors.TRANSPARENT, attrs: Attr.BOLD }
    case 'separator':
      return { fg: Colors.GRAY, bg: Colors.TRANSPARENT, attrs: Attr.DIM }
    case 'blank':
    case 'normal':
    default:
      return { fg: Colors.WHITE, bg: Colors.TRANSPARENT, attrs: Attr.NONE }
  }
}

// =============================================================================
// NAVIGATION
// =============================================================================

function scrollUp(amount: number = 1) {
  scrollOffset.value = Math.max(0, scrollOffset.value - amount)
}

function scrollDown(amount: number = 1) {
  scrollOffset.value = Math.min(maxScroll, scrollOffset.value + amount)
}

function scrollToTop() {
  scrollOffset.value = 0
}

function scrollToBottom() {
  scrollOffset.value = maxScroll
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Main container - full screen
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      bg: Colors.BLACK,
      children: () => {
        // =======================================================================
        // HEADER BAR
        // =======================================================================
        box({
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 1,
          paddingRight: 1,
          bg: Colors.BLUE,
          children: () => {
            text({
              content: ' MARKDOWN VIEWER ',
              fg: Colors.WHITE,
              attrs: Attr.BOLD,
            })
            text({
              content: derived(() => ` ${scrollPercent.value}% `),
              fg: Colors.WHITE,
            })
          },
        })

        // =======================================================================
        // TITLE BAR
        // =======================================================================
        box({
          width: '100%',
          padding: 1,
          bg: rgba(26, 26, 46),
          borderBottom: BorderStyle.SINGLE,
          borderColor: Colors.BLUE,
          children: () => {
            text({
              content: 'TUI Framework - Documentation',
              fg: Colors.CYAN,
              attrs: Attr.BOLD,
            })
          },
        })

        // =======================================================================
        // CONTENT AREA with line numbers
        // =======================================================================
        box({
          grow: 1,
          flexDirection: 'row',
          overflow: 'hidden',
          children: () => {
            // LINE NUMBERS GUTTER
            box({
              width: 6,
              bg: rgba(17, 17, 17),
              paddingTop: 1,
              children: () => {
                for (let i = 0; i < VISIBLE_LINES; i++) {
                  const lineIndex = i
                  text({
                    content: derived(() => {
                      const actualLine = scrollOffset.value + lineIndex + 1
                      if (actualLine > document.length) return '     '
                      return String(actualLine).padStart(4, ' ') + ' '
                    }),
                    fg: rgba(102, 102, 102),
                    attrs: Attr.DIM,
                  })
                }
              },
            })

            // SEPARATOR LINE
            box({
              width: 1,
              bg: rgba(51, 51, 51),
            })

            // DOCUMENT CONTENT
            box({
              grow: 1,
              paddingLeft: 2,
              paddingTop: 1,
              paddingRight: 1,
              overflow: 'hidden',
              children: () => {
                for (let i = 0; i < VISIBLE_LINES; i++) {
                  const lineIndex = i

                  // Create a derived for the line content and style
                  const lineData = derived(() => {
                    const docIndex = scrollOffset.value + lineIndex
                    if (docIndex >= document.length) {
                      return { content: ' ', style: getLineStyle('blank') }
                    }
                    const line = document[docIndex]!
                    return {
                      content: line.content || ' ',
                      style: getLineStyle(line.type),
                    }
                  })

                  text({
                    content: derived(() => lineData.value.content),
                    fg: derived(() => lineData.value.style.fg),
                    attrs: derived(() => lineData.value.style.attrs),
                  })
                }
              },
            })

            // SCROLLBAR
            box({
              width: 1,
              bg: rgba(34, 34, 34),
              children: () => {
                for (let i = 0; i < VISIBLE_LINES + 4; i++) {
                  const pos = i
                  text({
                    content: derived(() => {
                      if (maxScroll === 0) return pos === 0 ? '█' : '│'
                      const thumbSize = Math.max(2, Math.floor((VISIBLE_LINES / document.length) * VISIBLE_LINES))
                      const thumbPos = Math.floor((scrollOffset.value / maxScroll) * (VISIBLE_LINES - thumbSize))
                      if (pos >= thumbPos && pos < thumbPos + thumbSize) {
                        return '█'
                      }
                      return '│'
                    }),
                    fg: derived(() => {
                      if (maxScroll === 0) return Colors.BLUE
                      const thumbSize = Math.max(2, Math.floor((VISIBLE_LINES / document.length) * VISIBLE_LINES))
                      const thumbPos = Math.floor((scrollOffset.value / maxScroll) * (VISIBLE_LINES - thumbSize))
                      if (pos >= thumbPos && pos < thumbPos + thumbSize) {
                        return Colors.BLUE
                      }
                      return rgba(68, 68, 68)
                    }),
                  })
                }
              },
            })
          },
        })

        // =======================================================================
        // HELP FOOTER
        // =======================================================================
        box({
          width: '100%',
          borderTop: BorderStyle.SINGLE,
          borderColor: rgba(68, 68, 68),
          bg: rgba(17, 17, 17),
          paddingTop: 1,
          paddingBottom: 1,
          paddingLeft: 1,
          children: () => {
            box({
              flexDirection: 'row',
              gap: 2,
              children: () => {
                // Navigation keys
                box({
                  flexDirection: 'row',
                  children: () => {
                    text({ content: 'Up/k ', fg: Colors.CYAN, attrs: Attr.BOLD })
                    text({ content: 'Down/j ', fg: Colors.CYAN, attrs: Attr.BOLD })
                  },
                })
                text({ content: 'Scroll', fg: Colors.GRAY })

                text({ content: '|', fg: rgba(68, 68, 68) })

                box({
                  flexDirection: 'row',
                  children: () => {
                    text({ content: 'PgUp ', fg: Colors.CYAN, attrs: Attr.BOLD })
                    text({ content: 'PgDn ', fg: Colors.CYAN, attrs: Attr.BOLD })
                  },
                })
                text({ content: 'Page', fg: Colors.GRAY })

                text({ content: '|', fg: rgba(68, 68, 68) })

                box({
                  flexDirection: 'row',
                  children: () => {
                    text({ content: 'g/Home ', fg: Colors.CYAN, attrs: Attr.BOLD })
                    text({ content: 'G/End ', fg: Colors.CYAN, attrs: Attr.BOLD })
                  },
                })
                text({ content: 'Jump', fg: Colors.GRAY })

                text({ content: '|', fg: rgba(68, 68, 68) })

                text({ content: 'q ', fg: Colors.RED, attrs: Attr.BOLD })
                text({ content: 'Quit', fg: Colors.GRAY })
              },
            })
          },
        })

        // =======================================================================
        // STATUS BAR
        // =======================================================================
        box({
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 1,
          paddingRight: 1,
          bg: rgba(26, 26, 46),
          children: () => {
            text({
              content: derived(() => `Line ${scrollOffset.value + 1}-${Math.min(scrollOffset.value + VISIBLE_LINES, document.length)} of ${document.length}`),
              fg: Colors.GRAY,
            })
            text({
              content: derived(() => {
                if (scrollOffset.value === 0) return '[ TOP ]'
                if (scrollOffset.value >= maxScroll) return '[ END ]'
                return `[ ${scrollPercent.value}% ]`
              }),
              fg: Colors.CYAN,
            })
          },
        })
      },
    })
  }, { mode: 'fullscreen' })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Scroll up
  keyboard.onKey(['ArrowUp', 'k'], () => {
    scrollUp()
    return true
  })

  // Scroll down
  keyboard.onKey(['ArrowDown', 'j'], () => {
    scrollDown()
    return true
  })

  // Page up
  keyboard.onKey('PageUp', () => {
    scrollUp(VISIBLE_LINES - 2)
    return true
  })

  // Page down
  keyboard.onKey('PageDown', () => {
    scrollDown(VISIBLE_LINES - 2)
    return true
  })

  // Jump to top
  keyboard.onKey(['Home', 'g'], () => {
    scrollToTop()
    return true
  })

  // Jump to bottom
  keyboard.onKey(['End', 'G'], () => {
    scrollToBottom()
    return true
  })

  // Half page scroll (vim style)
  keyboard.onKey('u', () => {
    scrollUp(Math.floor(VISIBLE_LINES / 2))
    return true
  })

  keyboard.onKey('d', () => {
    scrollDown(Math.floor(VISIBLE_LINES / 2))
    return true
  })

  // Quit
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

// Run the application
main().catch(console.error)
