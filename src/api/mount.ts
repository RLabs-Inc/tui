/**
 * TUI Framework - Mount API
 *
 * The entry point for TUI applications.
 * Sets up terminal, creates the render effect, handles cleanup.
 *
 * Usage:
 * ```ts
 * const cleanup = await mount(() => {
 *   box({
 *     width: 40,
 *     height: 10,
 *     border: 1,
 *     children: () => {
 *       text({ content: 'Hello, TUI!' })
 *     }
 *   })
 * })
 *
 * // Later...
 * await cleanup()
 * ```
 */

import { effect } from '@rlabs-inc/signals'
import type { MountOptions, ResizeEvent } from '../types'
import {
  DiffRenderer,
  InlineRenderer,
} from '../renderer/output'
import { AppendRegionRenderer } from '../renderer/append-region'
import * as ansi from '../renderer/ansi'
import { frameBufferDerived } from '../pipeline/frameBuffer'
import { layoutDerived, terminalWidth, terminalHeight, updateTerminalSize, renderMode } from '../pipeline/layout'
import { resetRegistry } from '../engine/registry'
import { hitGrid, clearHitGrid, mouse } from '../state/mouse'
import { globalKeys } from '../state/global-keys'

// =============================================================================
// MOUNT
// =============================================================================

/**
 * Mount a TUI application.
 *
 * @param root - Function that creates the component tree
 * @param options - Mount options (mode, mouse, keyboard)
 * @returns Cleanup function to unmount
 */
export async function mount(
  root: () => void,
  options: MountOptions = {}
): Promise<() => Promise<void>> {
  const {
    mode = 'fullscreen',
    mouse = true,
    kittyKeyboard = true,
    getStaticHeight,
  } = options

  // Set render mode signal BEFORE creating components
  // This affects how layout and frameBuffer compute dimensions
  renderMode.value = mode

  // Create renderer based on mode
  // Fullscreen uses DiffRenderer (absolute positioning)
  // Inline uses InlineRenderer (eraseLines + sequential write)
  // Append uses AppendRegionRenderer (two-region: static + reactive)
  const diffRenderer = new DiffRenderer()
  const inlineRenderer = new InlineRenderer()
  const appendRegionRenderer = new AppendRegionRenderer()

  // Mode-specific state
  let previousHeight = 0  // For append mode: track last rendered height
  let isFirstRender = true

  // Resize handlers (keyboard module handles key/mouse)
  const resizeHandlers: Set<(event: ResizeEvent) => void> = new Set()

  // Setup terminal
  const setupSequence: string[] = []

  if (mode === 'fullscreen') {
    setupSequence.push(ansi.enterAlternativeScreen)
    setupSequence.push(ansi.clearScreen)
    setupSequence.push(ansi.cursorTo(1, 1))  // Cursor home
  }
  // Inline/Append: no special setup needed
  // InlineRenderer handles erasing previous content

  setupSequence.push(ansi.hideCursor)

  // Mouse tracking is handled by globalKeys.initialize() via mouse.enableTracking()

  if (kittyKeyboard) {
    setupSequence.push(ansi.enableKittyKeyboard)
  }

  setupSequence.push(ansi.enableBracketedPaste)
  setupSequence.push(ansi.enableFocusReporting)

  // Write setup sequence
  process.stdout.write(setupSequence.join(''))

  // Initialize global input system (stdin, keyboard, mouse, shortcuts)
  globalKeys.initialize({ enableMouse: mouse })

  // Handle resize
  const handleResize = () => {
    updateTerminalSize()

    // For fullscreen, invalidate diff renderer to force full redraw
    if (mode === 'fullscreen') {
      diffRenderer.invalidate()
    }
    // For inline/append, InlineRenderer always redraws (eraseLines approach)

    for (const handler of resizeHandlers) {
      handler({ width: terminalWidth.value, height: terminalHeight.value })
    }
  }
  process.stdout.on('resize', handleResize)

  // Initialize terminal size
  updateTerminalSize()

  // Create the component tree
  root()

  // Global error handlers for debugging
  process.on('uncaughtException', (err) => {
    console.error('[TUI] Uncaught exception:', err)
  })
  process.on('unhandledRejection', (err) => {
    console.error('[TUI] Unhandled rejection:', err)
  })

  // THE ONE RENDER EFFECT
  // This is where the magic happens - reactive rendering!
  // Side effects (HitGrid) are applied HERE, not in the derived.
  let stopEffect: (() => void) | null = null

  stopEffect = effect(() => {
    try {
    const start = Bun.nanoseconds()

    // Time layout separately (reading .value triggers computation if needed)
    const layoutStart = Bun.nanoseconds()
    const computedLayout = layoutDerived.value
    const layoutNs = Bun.nanoseconds() - layoutStart

    // Time buffer computation (layout is cached, so this is just framebuffer)
    const bufferStart = Bun.nanoseconds()
    const { buffer, hitRegions, terminalSize } = frameBufferDerived.value
    const bufferNs = Bun.nanoseconds() - bufferStart

    // Apply hit regions to HitGrid (side effect happens in effect, not derived!)
    if (hitGrid.width !== terminalSize.width || hitGrid.height !== terminalSize.height) {
      hitGrid.resize(terminalSize.width, terminalSize.height)
    } else {
      clearHitGrid()
    }
    for (const region of hitRegions) {
      hitGrid.fillRect(region.x, region.y, region.width, region.height, region.componentIndex)
    }

    // Time render to terminal
    const renderStart = Bun.nanoseconds()
    if (mode === 'fullscreen') {
      diffRenderer.render(buffer)
    } else if (mode === 'inline') {
      inlineRenderer.render(buffer)
    } else if (mode === 'append') {
      // Append mode: use two-region renderer
      // staticHeight determined by getStaticHeight callback or defaults to 0
      const staticHeight = getStaticHeight ? getStaticHeight() : 0
      appendRegionRenderer.render(buffer, { staticHeight })
    } else {
      // Fallback to inline for unknown modes
      inlineRenderer.render(buffer)
    }
    const renderNs = Bun.nanoseconds() - renderStart

    const totalNs = Bun.nanoseconds() - start

    // Show all timing stats in window title
    const layoutMs = layoutNs / 1_000_000
    const bufferMs = bufferNs / 1_000_000
    const renderMs = renderNs / 1_000_000
    const totalMs = totalNs / 1_000_000
    process.stdout.write(`\x1b]0;TUI | h:${computedLayout.contentHeight} | layout: ${layoutMs.toFixed(3)}ms | buffer: ${bufferMs.toFixed(3)}ms | render: ${renderMs.toFixed(3)}ms | total: ${totalMs.toFixed(3)}ms\x07`)
    } catch (err) {
      console.error('[TUI] Render effect error:', err)
    }
  })

  // Cleanup function
  return async () => {
    // Stop the render effect
    if (stopEffect) {
      stopEffect()
      stopEffect = null
    }

    // Cleanup global input system
    globalKeys.cleanup()

    // Cleanup append region renderer if used
    if (mode === 'append') {
      appendRegionRenderer.cleanup()
    }

    // Remove resize listener
    process.stdout.removeListener('resize', handleResize)

    // Restore terminal
    const restoreSequence: string[] = []

    restoreSequence.push(ansi.disableFocusReporting)
    restoreSequence.push(ansi.disableBracketedPaste)

    if (kittyKeyboard) {
      restoreSequence.push(ansi.disableKittyKeyboard)
    }

    // Mouse disable and cursor show handled by globalKeys.cleanup()
    restoreSequence.push(ansi.reset)

    if (mode === 'fullscreen') {
      restoreSequence.push(ansi.exitAlternativeScreen)
    } else if (mode === 'inline' || mode === 'append') {
      // For inline/append: content is already on screen, just reset and add newline
      // InlineRenderer leaves cursor at end of content
      restoreSequence.push('\n')
    }

    process.stdout.write(restoreSequence.join(''))

    // Raw mode disabled by globalKeys.cleanup() -> input.cleanup()

    // Reset registry for clean slate
    resetRegistry()
  }
}

