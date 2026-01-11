/**
 * TUI Framework - Mouse Module
 *
 * HitGrid for coordinate-to-component lookup.
 * State and handler registry for mouse events.
 * Does NOT own stdin (that's input.ts).
 * Does NOT handle global shortcuts (that's global-keys.ts).
 *
 * API:
 *   lastEvent         - Reactive last mouse event
 *   x, y              - Reactive cursor position
 *   isDown            - Reactive mouse button state
 *   hitGrid           - O(1) coordinate lookup
 *   onMouseDown(fn)   - Subscribe to mouse down
 *   onMouseUp(fn)     - Subscribe to mouse up
 *   onClick(fn)       - Subscribe to clicks
 *   onScroll(fn)      - Subscribe to scroll
 *   onComponent(i,h)  - Per-component handlers
 */

import { signal } from '@rlabs-inc/signals'
import * as interaction from '../engine/arrays/interaction'

// =============================================================================
// TYPES
// =============================================================================

export type MouseAction = 'down' | 'up' | 'move' | 'drag' | 'scroll'

export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  NONE = 3,
}

export interface ScrollInfo {
  direction: 'up' | 'down' | 'left' | 'right'
  delta: number
}

export interface MouseEvent {
  action: MouseAction
  button: MouseButton | number
  x: number
  y: number
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  scroll?: ScrollInfo
  componentIndex: number
}

export interface MouseHandlers {
  onMouseDown?: (event: MouseEvent) => void | boolean
  onMouseUp?: (event: MouseEvent) => void | boolean
  onClick?: (event: MouseEvent) => void | boolean
  onMouseEnter?: (event: MouseEvent) => void
  onMouseLeave?: (event: MouseEvent) => void
  onScroll?: (event: MouseEvent) => void | boolean
}

export type MouseHandler = (event: MouseEvent) => void | boolean

// =============================================================================
// HIT GRID - O(1) Coordinate to Component Lookup
// =============================================================================

export class HitGrid {
  private grid: Int16Array
  private _width: number
  private _height: number

  constructor(width: number, height: number) {
    this._width = width
    this._height = height
    this.grid = new Int16Array(width * height).fill(-1)
  }

  get width(): number { return this._width }
  get height(): number { return this._height }

  get(x: number, y: number): number {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return -1
    return this.grid[y * this._width + x]!
  }

  set(x: number, y: number, componentIndex: number): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return
    this.grid[y * this._width + x] = componentIndex
  }

  fillRect(x: number, y: number, width: number, height: number, componentIndex: number): void {
    const x1 = Math.max(0, x)
    const y1 = Math.max(0, y)
    const x2 = Math.min(this._width, x + width)
    const y2 = Math.min(this._height, y + height)

    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        this.grid[py * this._width + px] = componentIndex
      }
    }
  }

  clear(): void {
    this.grid.fill(-1)
  }

  resize(width: number, height: number): void {
    this._width = width
    this._height = height
    this.grid = new Int16Array(width * height).fill(-1)
  }
}

// =============================================================================
// STATE
// =============================================================================

export const hitGrid = new HitGrid(80, 24)

/** Last mouse event (reactive signal) */
export const lastMouseEvent = signal<MouseEvent | null>(null)

/** Mouse X position (reactive signal) */
export const mouseX = signal(0)

/** Mouse Y position (reactive signal) */
export const mouseY = signal(0)

/** Is mouse button down (reactive signal) */
export const isMouseDown = signal(false)

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

const componentHandlers = new Map<number, MouseHandlers>()
const globalHandlers = {
  onMouseDown: new Set<MouseHandler>(),
  onMouseUp: new Set<MouseHandler>(),
  onClick: new Set<MouseHandler>(),
  onScroll: new Set<MouseHandler>(),
}

// Tracking state for hover and click detection
let hoveredComponent = -1
let pressedComponent = -1
let pressedButton = MouseButton.NONE

// =============================================================================
// EVENT DISPATCH (called by global-keys.ts)
// =============================================================================

/**
 * Dispatch a mouse event to all registered handlers.
 * Updates reactive state and handles hover/click tracking.
 */
export function dispatch(event: MouseEvent): boolean {
  // Fill componentIndex from HitGrid
  event.componentIndex = hitGrid.get(event.x, event.y)

  // Update reactive state
  lastMouseEvent.value = event
  mouseX.value = event.x
  mouseY.value = event.y
  isMouseDown.value = event.action === 'down' || (event.action !== 'up' && isMouseDown.value)

  const componentIndex = event.componentIndex
  const handlers = componentIndex >= 0 ? componentHandlers.get(componentIndex) : undefined

  // Handle hover (enter/leave)
  if (componentIndex !== hoveredComponent) {
    // Leave previous
    if (hoveredComponent >= 0) {
      const prevHandlers = componentHandlers.get(hoveredComponent)
      prevHandlers?.onMouseLeave?.({ ...event, componentIndex: hoveredComponent })
      if (interaction.hovered[hoveredComponent]) {
        interaction.hovered.setValue(hoveredComponent, 0)
      }
    }

    // Enter new
    if (componentIndex >= 0) {
      handlers?.onMouseEnter?.(event)
      if (interaction.hovered[componentIndex]) {
        interaction.hovered.setValue(componentIndex, 1)
      }
    }

    hoveredComponent = componentIndex
  }

  // Handle scroll
  if (event.action === 'scroll') {
    if (handlers?.onScroll?.(event) === true) return true
    for (const handler of globalHandlers.onScroll) {
      if (handler(event) === true) return true
    }
    return false
  }

  // Handle down
  if (event.action === 'down') {
    pressedComponent = componentIndex
    pressedButton = event.button as MouseButton

    if (componentIndex >= 0 && interaction.pressed[componentIndex]) {
      interaction.pressed.setValue(componentIndex, 1)
    }

    if (handlers?.onMouseDown?.(event) === true) return true
    for (const handler of globalHandlers.onMouseDown) {
      if (handler(event) === true) return true
    }
  }

  // Handle up
  if (event.action === 'up') {
    if (pressedComponent >= 0 && interaction.pressed[pressedComponent]) {
      interaction.pressed.setValue(pressedComponent, 0)
    }

    if (handlers?.onMouseUp?.(event) === true) return true
    for (const handler of globalHandlers.onMouseUp) {
      if (handler(event) === true) return true
    }

    // Detect click (press and release on same component)
    if (pressedComponent === componentIndex && pressedButton === event.button) {
      if (handlers?.onClick?.(event) === true) return true
      for (const handler of globalHandlers.onClick) {
        if (handler(event) === true) return true
      }
    }

    pressedComponent = -1
    pressedButton = MouseButton.NONE
  }

  return false
}

// =============================================================================
// MOUSE TRACKING (ANSI escape codes)
// =============================================================================

const ENABLE_MOUSE = '\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h'
const DISABLE_MOUSE = '\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l'

let trackingEnabled = false

export function enableTracking(): void {
  if (trackingEnabled) return
  trackingEnabled = true
  process.stdout.write(ENABLE_MOUSE)
}

export function disableTracking(): void {
  if (!trackingEnabled) return
  trackingEnabled = false
  process.stdout.write(DISABLE_MOUSE)
}

export function isTrackingEnabled(): boolean {
  return trackingEnabled
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function onMouseDown(handler: MouseHandler): () => void {
  globalHandlers.onMouseDown.add(handler)
  return () => globalHandlers.onMouseDown.delete(handler)
}

export function onMouseUp(handler: MouseHandler): () => void {
  globalHandlers.onMouseUp.add(handler)
  return () => globalHandlers.onMouseUp.delete(handler)
}

export function onClick(handler: MouseHandler): () => void {
  globalHandlers.onClick.add(handler)
  return () => globalHandlers.onClick.delete(handler)
}

export function onScroll(handler: MouseHandler): () => void {
  globalHandlers.onScroll.add(handler)
  return () => globalHandlers.onScroll.delete(handler)
}

export function onComponent(index: number, handlers: MouseHandlers): () => void {
  componentHandlers.set(index, handlers)
  return () => componentHandlers.delete(index)
}

export function resize(width: number, height: number): void {
  hitGrid.resize(width, height)
}

export function clearHitGrid(): void {
  hitGrid.clear()
}

export function cleanup(): void {
  disableTracking()
  componentHandlers.clear()
  globalHandlers.onMouseDown.clear()
  globalHandlers.onMouseUp.clear()
  globalHandlers.onClick.clear()
  globalHandlers.onScroll.clear()
  hoveredComponent = -1
  pressedComponent = -1
  pressedButton = MouseButton.NONE
  lastMouseEvent.value = null
  mouseX.value = 0
  mouseY.value = 0
  isMouseDown.value = false
}

// =============================================================================
// MOUSE OBJECT - Functions only, no state getters
// =============================================================================

export const mouse = {
  // HitGrid
  hitGrid,
  clearHitGrid,
  resize,

  // Tracking
  enableTracking,
  disableTracking,
  isTrackingEnabled,

  // Handlers
  onMouseDown,
  onMouseUp,
  onClick,
  onScroll,
  onComponent,

  // Cleanup
  cleanup,
}
