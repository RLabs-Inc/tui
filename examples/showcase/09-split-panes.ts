/**
 * Showcase: Split Panes
 *
 * A tmux-style split-pane layout with resizable panels.
 * Demonstrates reactive width management using signals and flexbox.
 *
 * Features demonstrated:
 * - Three-pane horizontal layout (left | middle | right)
 * - Left and right panes have fixed widths controlled by signals
 * - Middle pane uses grow:1 to fill remaining space
 * - Keyboard controls for resizing panes
 * - Visual separators between panes
 * - Minimum pane width constraints
 * - Real-time width display in each pane
 *
 * Controls:
 * - [ / ]  Decrease/Increase left pane width
 * - { / }  Decrease/Increase right pane width (Shift + [ / ])
 * - r      Reset all panes to equal widths
 * - q      Quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { box, text, mount, keyboard, t, Colors, BorderStyle, Attr } from '../../index'

// =============================================================================
// CONFIGURATION
// =============================================================================

const MIN_PANE_WIDTH = 10
const RESIZE_STEP = 2
const DEFAULT_SIDE_WIDTH = 25

// =============================================================================
// REACTIVE STATE
// =============================================================================

// Pane widths (left and right are controlled, middle uses grow)
const leftWidth = signal(DEFAULT_SIDE_WIDTH)
const rightWidth = signal(DEFAULT_SIDE_WIDTH)

// Derived display values
const leftWidthDisplay = derived(() => `Width: ${leftWidth.value}`)
const rightWidthDisplay = derived(() => `Width: ${rightWidth.value}`)
const middleInfo = derived(() => 'grow: 1 (fills remaining space)')

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/** Pane header with title */
function PaneHeader(title: string, color: typeof Colors.CYAN) {
  box({
    height: 1,
    borderBottom: BorderStyle.SINGLE,
    borderColor: color,
    paddingLeft: 1,
    paddingRight: 1,
    flexDirection: 'row',
    alignItems: 'center',
    children: () => {
      text({ content: title, fg: color, attrs: Attr.BOLD })
    },
  })
}

/** Pane content area */
function PaneContent(
  widthDisplay: { value: string } | string,
  additionalInfo?: string,
  color: typeof Colors.CYAN = Colors.GRAY
) {
  box({
    grow: 1,
    padding: 1,
    flexDirection: 'column',
    gap: 1,
    children: () => {
      // Width display (reactive for side panes)
      text({
        content: typeof widthDisplay === 'string' ? widthDisplay : widthDisplay,
        fg: color,
      })

      // Additional info
      if (additionalInfo) {
        text({ content: additionalInfo, fg: Colors.GRAY })
      }
    },
  })
}

/** Vertical separator line */
function Separator() {
  box({
    width: 1,
    bg: t.border,
  })
}

// =============================================================================
// MAIN PANELS
// =============================================================================

/** Left pane - resizable */
function LeftPane() {
  box({
    width: derived(() => leftWidth.value),
    shrink: 0,
    minWidth: MIN_PANE_WIDTH,
    border: BorderStyle.SINGLE,
    borderColor: t.primary,
    flexDirection: 'column',
    children: () => {
      PaneHeader('LEFT PANE', Colors.BLUE)

      box({
        grow: 1,
        padding: 1,
        flexDirection: 'column',
        gap: 1,
        children: () => {
          text({ content: leftWidthDisplay, fg: Colors.CYAN })
          text({ content: `Min: ${MIN_PANE_WIDTH}`, fg: Colors.GRAY })
          text({ content: '', fg: Colors.GRAY })
          text({ content: 'Controls:', fg: Colors.WHITE })
          text({ content: '[  Shrink', fg: Colors.YELLOW })
          text({ content: ']  Expand', fg: Colors.GREEN })
        },
      })
    },
  })
}

/** Middle pane - flexible (grows to fill) */
function MiddlePane() {
  box({
    grow: 1,
    border: BorderStyle.SINGLE,
    borderColor: t.success,
    flexDirection: 'column',
    children: () => {
      PaneHeader('MIDDLE PANE', Colors.GREEN)

      box({
        grow: 1,
        padding: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        children: () => {
          text({ content: middleInfo, fg: Colors.CYAN })
          text({ content: '', fg: Colors.GRAY })
          text({ content: 'This pane automatically', fg: Colors.WHITE })
          text({ content: 'fills the remaining space', fg: Colors.WHITE })
          text({ content: 'between left and right panes.', fg: Colors.WHITE })
          text({ content: '', fg: Colors.GRAY })
          text({ content: '[ Flexbox Magic ]', fg: Colors.MAGENTA, attrs: Attr.BOLD })
        },
      })
    },
  })
}

/** Right pane - resizable */
function RightPane() {
  box({
    width: derived(() => rightWidth.value),
    shrink: 0,
    minWidth: MIN_PANE_WIDTH,
    border: BorderStyle.SINGLE,
    borderColor: t.warning,
    flexDirection: 'column',
    children: () => {
      PaneHeader('RIGHT PANE', Colors.YELLOW)

      box({
        grow: 1,
        padding: 1,
        flexDirection: 'column',
        gap: 1,
        children: () => {
          text({ content: rightWidthDisplay, fg: Colors.CYAN })
          text({ content: `Min: ${MIN_PANE_WIDTH}`, fg: Colors.GRAY })
          text({ content: '', fg: Colors.GRAY })
          text({ content: 'Controls:', fg: Colors.WHITE })
          text({ content: '{  Shrink', fg: Colors.YELLOW })
          text({ content: '}  Expand', fg: Colors.GREEN })
        },
      })
    },
  })
}

/** Header bar */
function Header() {
  box({
    height: 3,
    border: BorderStyle.DOUBLE,
    borderColor: t.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
    paddingRight: 2,
    children: () => {
      // Title
      box({
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
        children: () => {
          text({ content: 'SPLIT PANES', fg: t.primary, attrs: Attr.BOLD })
          text({ content: '|', fg: Colors.GRAY })
          text({ content: 'tmux-style resizable layout', fg: Colors.GRAY })
        },
      })

      // Status
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          const leftStatus = derived(() => `L:${leftWidth.value}`)
          const rightStatus = derived(() => `R:${rightWidth.value}`)

          text({ content: leftStatus, fg: Colors.BLUE })
          text({ content: '|', fg: Colors.GRAY })
          text({ content: 'M:flex', fg: Colors.GREEN })
          text({ content: '|', fg: Colors.GRAY })
          text({ content: rightStatus, fg: Colors.YELLOW })
        },
      })
    },
  })
}

/** Footer with controls */
function Footer() {
  box({
    height: 3,
    border: BorderStyle.SINGLE,
    borderColor: t.textMuted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
    paddingRight: 2,
    children: () => {
      // Left controls
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({ content: '[', fg: Colors.BLUE, attrs: Attr.BOLD })
          text({ content: '/', fg: Colors.GRAY })
          text({ content: ']', fg: Colors.BLUE, attrs: Attr.BOLD })
          text({ content: 'Left', fg: Colors.GRAY })

          text({ content: '|', fg: Colors.GRAY })

          text({ content: '{', fg: Colors.YELLOW, attrs: Attr.BOLD })
          text({ content: '/', fg: Colors.GRAY })
          text({ content: '}', fg: Colors.YELLOW, attrs: Attr.BOLD })
          text({ content: 'Right', fg: Colors.GRAY })
        },
      })

      // Right controls
      box({
        flexDirection: 'row',
        gap: 2,
        children: () => {
          text({ content: 'r', fg: Colors.CYAN, attrs: Attr.BOLD })
          text({ content: 'Reset', fg: Colors.GRAY })

          text({ content: '|', fg: Colors.GRAY })

          text({ content: 'q', fg: Colors.RED, attrs: Attr.BOLD })
          text({ content: 'Quit', fg: Colors.GRAY })
        },
      })
    },
  })
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const cleanup = await mount(() => {
    // Root container - full screen
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      children: () => {
        // Header
        Header()

        // Main content area with three panes
        box({
          grow: 1,
          flexDirection: 'row',
          padding: 1,
          gap: 0, // No gap - separators provide visual divide
          children: () => {
            // Left pane (fixed width, resizable)
            LeftPane()

            // Separator
            Separator()

            // Middle pane (flexible, grows to fill)
            MiddlePane()

            // Separator
            Separator()

            // Right pane (fixed width, resizable)
            RightPane()
          },
        })

        // Footer with controls
        Footer()
      },
    })
  }, { mode: 'fullscreen', mouse: false })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Left pane controls: [ and ]
  keyboard.onKey('[', () => {
    if (leftWidth.value > MIN_PANE_WIDTH) {
      leftWidth.value = Math.max(MIN_PANE_WIDTH, leftWidth.value - RESIZE_STEP)
    }
  })

  keyboard.onKey(']', () => {
    leftWidth.value += RESIZE_STEP
  })

  // Right pane controls: { and } (Shift + [ and ])
  keyboard.onKey('{', () => {
    if (rightWidth.value > MIN_PANE_WIDTH) {
      rightWidth.value = Math.max(MIN_PANE_WIDTH, rightWidth.value - RESIZE_STEP)
    }
  })

  keyboard.onKey('}', () => {
    rightWidth.value += RESIZE_STEP
  })

  // Reset to equal widths
  keyboard.onKey(['r', 'R'], () => {
    leftWidth.value = DEFAULT_SIDE_WIDTH
    rightWidth.value = DEFAULT_SIDE_WIDTH
  })

  // Quit
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    cleanup()
  })
}

main().catch(console.error)
