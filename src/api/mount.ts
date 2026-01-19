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
import type { MountOptions, ResizeEvent, AppendMountResult } from '../types'
import {
  DiffRenderer,
  InlineRenderer,
} from '../renderer/output'
import { AppendRegionRenderer } from '../renderer/append-region'
import { HistoryWriter, createRenderToHistory } from './history'
import * as ansi from '../renderer/ansi'
import { frameBufferDerived, _dbg_layout_us, _dbg_buf_us, _dbg_map_us, _dbg_render_us } from '../pipeline/frameBuffer'
import { layoutDerived, terminalWidth, terminalHeight, updateTerminalSize, renderMode } from '../pipeline/layout'
import { resetRegistry } from '../engine/registry'
import { hitGrid, clearHitGrid, mouse } from '../state/mouse'
import { globalKeys } from '../state/global-keys'

// =============================================================================
// MODULE STATE
// =============================================================================

// Track if global error handlers have been registered (only once per process)
let globalErrorHandlersRegistered = false

// =============================================================================
// MOUNT
// =============================================================================

/**
 * Mount a TUI application.
 *
 * @param root - Function that creates the component tree
 * @param options - Mount options (mode, mouse, keyboard)
 * @returns Cleanup function to unmount (or AppendMountResult for append mode)
 */
// Overloads for proper return type inference
export async function mount(
  root: () => void,
  options: MountOptions & { mode: 'append' }
): Promise<AppendMountResult>
export async function mount(
  root: () => void,
  options?: MountOptions & { mode?: 'fullscreen' | 'inline' }
): Promise<() => Promise<void>>
export async function mount(
  root: () => void,
  options?: MountOptions
): Promise<(() => Promise<void>) | AppendMountResult>
// Implementation
export async function mount(
  root: () => void,
  options: MountOptions = {}
): Promise<(() => Promise<void>) | AppendMountResult> {
  const {
    mode = 'fullscreen',
    mouse = true,
    kittyKeyboard = true,
  } = options

  // Set render mode signal BEFORE creating components
  // This affects how layout and frameBuffer compute dimensions
  renderMode.value = mode

  // Create renderer based on mode
  // Fullscreen uses DiffRenderer (absolute positioning)
  // Inline uses InlineRenderer (eraseLines + sequential write)
  // Append uses AppendRegionRenderer (eraseDown + render active)
  const diffRenderer = new DiffRenderer()
  const inlineRenderer = new InlineRenderer()
  const appendRegionRenderer = new AppendRegionRenderer()

  // For append mode: create history writer and renderToHistory function
  let historyWriter: HistoryWriter | null = null
  let renderToHistory: ((componentFn: () => void) => void) | null = null

  if (mode === 'append') {
    historyWriter = new HistoryWriter()
    renderToHistory = createRenderToHistory(historyWriter, appendRegionRenderer)
  }

  // Mode-specific state
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

  // Global error handlers for debugging (register only once per process)
  if (!globalErrorHandlersRegistered) {
    globalErrorHandlersRegistered = true
    process.on('uncaughtException', (err) => {
      console.error('[TUI] Uncaught exception:', err)
    })
    process.on('unhandledRejection', (err) => {
      console.error('[TUI] Unhandled rejection:', err)
    })
  }

  // THE ONE RENDER EFFECT
  // This is where the magic happens - reactive rendering!
  // Side effects (HitGrid) are applied HERE, not in the derived.
  let stopEffect: (() => void) | null = null

  stopEffect = effect(() => {
    try {
    const start = Bun.nanoseconds()

    // Read derived values (triggers computation if needed)
    const computedLayout = layoutDerived.value
    const { buffer, hitRegions, terminalSize } = frameBufferDerived.value

    // Apply hit regions to HitGrid (side effect happens in effect, not derived!)
    if (hitGrid.width !== terminalSize.width || hitGrid.height !== terminalSize.height) {
      hitGrid.resize(terminalSize.width, terminalSize.height)
    } else {
      clearHitGrid()
    }
    for (const region of hitRegions) {
      hitGrid.fillRect(region.x, region.y, region.width, region.height, region.componentIndex)
    }

    // Time render to terminal (actual I/O work)
    const renderStart = Bun.nanoseconds()
    if (mode === 'fullscreen') {
      diffRenderer.render(buffer)
    } else if (mode === 'inline') {
      inlineRenderer.render(buffer)
    } else if (mode === 'append') {
      // Append mode: render active content only
      // History is written via renderToHistory() by the app
      appendRegionRenderer.render(buffer)
    } else {
      // Fallback to inline for unknown modes
      inlineRenderer.render(buffer)
    }
    const renderNs = Bun.nanoseconds() - renderStart
    const totalNs = Bun.nanoseconds() - start

    // Use REAL timing from inside the deriveds (not cached read times!)
    // These are exported from frameBuffer.ts and represent actual computation
    const layoutMs = _dbg_layout_us / 1000  // Convert μs to ms
    const bufferMs = (_dbg_buf_us + _dbg_map_us + _dbg_render_us) / 1000  // Total buffer work
    const renderMs = renderNs / 1_000_000  // Terminal render
    const totalMs = totalNs / 1_000_000  // Total frame time
    const fps = totalMs > 0 ? Math.round(1000 / totalMs) : 0
    const lines = buffer.height
    
    // Format: [24 lines] Layout: 0.18ms | Buffer: 0.20ms | Render: 1.31ms | Total: 2.15ms (465 FPS)
    process.stdout.write(
      `\x1b]0;[${lines} lines] ` +
      `Layout: ${layoutMs.toFixed(2)}ms | ` +
      `Buffer: ${bufferMs.toFixed(2)}ms | ` +
      `Render: ${renderMs.toFixed(2)}ms | ` +
      `Total: ${totalMs.toFixed(2)}ms (${fps} FPS)\x07`
    )
    } catch (err) {
      console.error('[TUI] Render effect error:', err)
    }
  })

  // Cleanup function
  const cleanup = async () => {
    // Stop the render effect
    if (stopEffect) {
      stopEffect()
      stopEffect = null
    }

    // Cleanup global input system
    globalKeys.cleanup()

    // Cleanup append mode resources
    if (mode === 'append') {
      appendRegionRenderer.cleanup()
      if (historyWriter) {
        historyWriter.end()
      }
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

  // Return based on mode
  if (mode === 'append' && renderToHistory) {
    return {
      cleanup,
      renderToHistory,
    }
  }

  return cleanup
}

