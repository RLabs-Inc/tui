/**
 * TUI Framework - Mouse State Module
 *
 * Robust mouse handling based on terminalKit/OpenTUI patterns:
 * - SGR mouse protocol (extended coordinates > 223)
 * - Basic X10 mouse protocol fallback
 * - HitGrid for O(1) coordinate-to-component lookup
 * - Event dispatching with hover/press tracking
 *
 * API:
 *   mouse.enable()           - Enable mouse tracking
 *   mouse.disable()          - Disable mouse tracking
 *   mouse.onMouseDown(fn)    - Global mouse down handler
 *   mouse.onMouseUp(fn)      - Global mouse up handler
 *   mouse.onClick(fn)        - Global click handler
 *   mouse.onScroll(fn)       - Global scroll handler
 *   mouse.onComponent(idx, handlers) - Per-component handlers
 */

import { signal } from '@rlabs-inc/signals'
import * as interaction from '../engine/arrays/interaction'
import { unwrap } from '@rlabs-inc/signals'

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
  /** Event type */
  action: MouseAction
  /** Button number (0=left, 1=middle, 2=right) */
  button: MouseButton
  /** X coordinate (0-based) */
  x: number
  /** Y coordinate (0-based) */
  y: number
  /** Modifier keys */
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  /** Scroll info (if action is 'scroll') */
  scroll?: ScrollInfo
  /** Component index at (x, y) from HitGrid */
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

  /** Get component index at (x, y), or -1 if none */
  get(x: number, y: number): number {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return -1
    return this.grid[y * this._width + x]!
  }

  /** Set component index at (x, y) */
  set(x: number, y: number, componentIndex: number): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return
    this.grid[y * this._width + x] = componentIndex
  }

  /** Fill a rectangle with component index */
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

  /** Clear entire grid */
  clear(): void {
    this.grid.fill(-1)
  }

  /** Resize grid (clears all data) */
  resize(width: number, height: number): void {
    this._width = width
    this._height = height
    this.grid = new Int16Array(width * height).fill(-1)
  }
}

// =============================================================================
// MOUSE PARSER (from OpenTUI)
// =============================================================================

const SCROLL_DIRECTIONS: Record<number, 'up' | 'down' | 'left' | 'right'> = {
  0: 'up',
  1: 'down',
  2: 'left',
  3: 'right',
}

function parseMouseEvent(data: Buffer, hitGrid: HitGrid): MouseEvent | null {
  const str = data.toString()

  // Parse SGR mouse mode: \x1b[<b;x;yM or \x1b[<b;x;ym
  const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/)
  if (sgrMatch) {
    const [, buttonCode, xStr, yStr, pressRelease] = sgrMatch
    const rawButtonCode = parseInt(buttonCode!)
    const x = parseInt(xStr!) - 1 // Convert to 0-based
    const y = parseInt(yStr!) - 1

    const button = (rawButtonCode & 3) as MouseButton
    const isScroll = (rawButtonCode & 64) !== 0
    const isMotion = (rawButtonCode & 32) !== 0

    const modifiers = {
      shiftKey: (rawButtonCode & 4) !== 0,
      altKey: (rawButtonCode & 8) !== 0,
      ctrlKey: (rawButtonCode & 16) !== 0,
    }

    let action: MouseAction
    let scrollInfo: ScrollInfo | undefined

    if (isScroll && pressRelease === 'M') {
      action = 'scroll'
      scrollInfo = {
        direction: SCROLL_DIRECTIONS[button] ?? 'up',
        delta: 1,
      }
    } else if (isMotion) {
      action = button === MouseButton.NONE ? 'move' : 'drag'
    } else {
      action = pressRelease === 'M' ? 'down' : 'up'
    }

    return {
      action,
      button: button === MouseButton.NONE ? MouseButton.LEFT : button,
      x,
      y,
      ...modifiers,
      scroll: scrollInfo,
      componentIndex: hitGrid.get(x, y),
    }
  }

  // Parse basic X10 mouse mode: \x1b[M followed by 3 bytes
  if (str.startsWith('\x1b[M') && str.length >= 6) {
    const buttonByte = str.charCodeAt(3) - 32
    const x = str.charCodeAt(4) - 33 // Convert to 0-based
    const y = str.charCodeAt(5) - 33

    const button = (buttonByte & 3) as MouseButton
    const isScroll = (buttonByte & 64) !== 0

    const modifiers = {
      shiftKey: (buttonByte & 4) !== 0,
      altKey: (buttonByte & 8) !== 0,
      ctrlKey: (buttonByte & 16) !== 0,
    }

    let action: MouseAction
    let scrollInfo: ScrollInfo | undefined

    if (isScroll) {
      action = 'scroll'
      scrollInfo = {
        direction: SCROLL_DIRECTIONS[button] ?? 'up',
        delta: 1,
      }
    } else {
      action = button === MouseButton.NONE ? 'up' : 'down'
    }

    return {
      action,
      button: button === MouseButton.NONE ? MouseButton.LEFT : button,
      x,
      y,
      ...modifiers,
      scroll: scrollInfo,
      componentIndex: hitGrid.get(x, y),
    }
  }

  return null
}

// =============================================================================
// MOUSE EVENT DISPATCHER
// =============================================================================

class MouseEventDispatcher {
  private hitGrid: HitGrid
  private handlers = new Map<number, MouseHandlers>()
  private globalHandlers: {
    onMouseDown: Set<MouseHandler>
    onMouseUp: Set<MouseHandler>
    onClick: Set<MouseHandler>
    onScroll: Set<MouseHandler>
  } = {
    onMouseDown: new Set(),
    onMouseUp: new Set(),
    onClick: new Set(),
    onScroll: new Set(),
  }

  // Track state for hover and click detection
  private hoveredComponent = -1
  private pressedComponent = -1
  private pressedButton = MouseButton.NONE

  constructor(hitGrid: HitGrid) {
    this.hitGrid = hitGrid
  }

  /** Register handlers for a component */
  register(index: number, handlers: MouseHandlers): () => void {
    this.handlers.set(index, handlers)
    return () => this.handlers.delete(index)
  }

  /** Add global handler */
  onMouseDown(handler: MouseHandler): () => void {
    this.globalHandlers.onMouseDown.add(handler)
    return () => this.globalHandlers.onMouseDown.delete(handler)
  }

  onMouseUp(handler: MouseHandler): () => void {
    this.globalHandlers.onMouseUp.add(handler)
    return () => this.globalHandlers.onMouseUp.delete(handler)
  }

  onClick(handler: MouseHandler): () => void {
    this.globalHandlers.onClick.add(handler)
    return () => this.globalHandlers.onClick.delete(handler)
  }

  onScroll(handler: MouseHandler): () => void {
    this.globalHandlers.onScroll.add(handler)
    return () => this.globalHandlers.onScroll.delete(handler)
  }

  /** Dispatch a mouse event */
  dispatch(event: MouseEvent): boolean {
    const componentIndex = event.componentIndex
    const handlers = componentIndex >= 0 ? this.handlers.get(componentIndex) : undefined

    // Handle hover (enter/leave)
    if (componentIndex !== this.hoveredComponent) {
      // Leave previous
      if (this.hoveredComponent >= 0) {
        const prevHandlers = this.handlers.get(this.hoveredComponent)
        if (prevHandlers?.onMouseLeave) {
          prevHandlers.onMouseLeave({ ...event, componentIndex: this.hoveredComponent })
        }
        // Update hovered array
        if (interaction.hovered[this.hoveredComponent]) {
          interaction.hovered[this.hoveredComponent]!.value = 0
        }
      }

      // Enter new
      if (componentIndex >= 0) {
        if (handlers?.onMouseEnter) {
          handlers.onMouseEnter(event)
        }
        // Update hovered array
        if (interaction.hovered[componentIndex]) {
          interaction.hovered[componentIndex]!.value = 1
        }
      }

      this.hoveredComponent = componentIndex
    }

    // Handle scroll
    if (event.action === 'scroll') {
      // First try component handler
      if (handlers?.onScroll && handlers.onScroll(event) === true) {
        return true
      }
      // Then global handlers
      for (const handler of this.globalHandlers.onScroll) {
        if (handler(event) === true) return true
      }
      return false
    }

    // Handle down
    if (event.action === 'down') {
      this.pressedComponent = componentIndex
      this.pressedButton = event.button

      // Update pressed array
      if (componentIndex >= 0 && interaction.pressed[componentIndex]) {
        interaction.pressed[componentIndex]!.value = 1
      }

      if (handlers?.onMouseDown && handlers.onMouseDown(event) === true) {
        return true
      }
      for (const handler of this.globalHandlers.onMouseDown) {
        if (handler(event) === true) return true
      }
    }

    // Handle up
    if (event.action === 'up') {
      // Clear pressed state
      if (this.pressedComponent >= 0 && interaction.pressed[this.pressedComponent]) {
        interaction.pressed[this.pressedComponent]!.value = 0
      }

      if (handlers?.onMouseUp && handlers.onMouseUp(event) === true) {
        return true
      }
      for (const handler of this.globalHandlers.onMouseUp) {
        if (handler(event) === true) return true
      }

      // Detect click (press and release on same component)
      if (this.pressedComponent === componentIndex && this.pressedButton === event.button) {
        if (handlers?.onClick && handlers.onClick(event) === true) {
          return true
        }
        for (const handler of this.globalHandlers.onClick) {
          if (handler(event) === true) return true
        }
      }

      this.pressedComponent = -1
      this.pressedButton = MouseButton.NONE
    }

    return false
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

// Default to 80x24, will be resized on mount
export const hitGrid = new HitGrid(80, 24)
const dispatcher = new MouseEventDispatcher(hitGrid)

// Reactive state
export const lastMouseEvent = signal<MouseEvent | null>(null)
export const mouseX = signal(0)
export const mouseY = signal(0)
export const isMouseDown = signal(false)

// =============================================================================
// ENABLE/DISABLE MOUSE TRACKING
// =============================================================================

let enabled = false
let inputHandler: ((data: Buffer) => void) | null = null

/** ANSI escape codes for mouse protocols */
const ENABLE_MOUSE = '\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h'
const DISABLE_MOUSE = '\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l'

/** Enable mouse tracking */
export function enable(): void {
  if (enabled) return
  enabled = true

  process.stdout.write(ENABLE_MOUSE)

  inputHandler = (data: Buffer) => {
    const event = parseMouseEvent(data, hitGrid)
    if (!event) return

    // Update reactive state
    lastMouseEvent.value = event
    mouseX.value = event.x
    mouseY.value = event.y
    isMouseDown.value = event.action === 'down' || (event.action !== 'up' && isMouseDown.value)

    // Dispatch to handlers
    dispatcher.dispatch(event)
  }

  // Note: This will be hooked up by the mount system
  // process.stdin.on('data', inputHandler)
}

/** Disable mouse tracking */
export function disable(): void {
  if (!enabled) return
  enabled = false

  process.stdout.write(DISABLE_MOUSE)

  if (inputHandler) {
    // process.stdin.removeListener('data', inputHandler)
    inputHandler = null
  }
}

/** Process raw input data (called by keyboard module which owns stdin) - LEGACY */
export function processInput(data: Buffer): boolean {
  if (!enabled || !inputHandler) return false

  const event = parseMouseEvent(data, hitGrid)
  if (!event) return false

  return processMouseEvent(event)
}

/** Process a parsed mouse event (called by unified keyboard input buffer) */
export function processMouseEvent(event: MouseEvent): boolean {
  if (!enabled) return false

  // Fill in componentIndex from HitGrid
  event.componentIndex = hitGrid.get(event.x, event.y)

  // Update reactive state
  lastMouseEvent.value = event
  mouseX.value = event.x
  mouseY.value = event.y
  isMouseDown.value = event.action === 'down' || (event.action !== 'up' && isMouseDown.value)

  // Dispatch to handlers
  dispatcher.dispatch(event)
  return true
}

/** Check if data is a mouse sequence - LEGACY, no longer needed with unified parsing */
export function isMouseSequence(data: Buffer): boolean {
  const str = data.toString()
  return str.startsWith('\x1b[<') || str.startsWith('\x1b[M')
}

// =============================================================================
// PUBLIC API
// =============================================================================

/** Register handlers for a component */
export function onComponent(index: number, handlers: MouseHandlers): () => void {
  return dispatcher.register(index, handlers)
}

/** Resize the hit grid (call on terminal resize) */
export function resize(width: number, height: number): void {
  hitGrid.resize(width, height)
}

/** Clear the hit grid (call before each render) */
export function clearHitGrid(): void {
  hitGrid.clear()
}

// =============================================================================
// MOUSE OBJECT (convenient namespace)
// =============================================================================

export const mouse = {
  // State
  get lastEvent() { return lastMouseEvent.value },
  get x() { return mouseX.value },
  get y() { return mouseY.value },
  get isDown() { return isMouseDown.value },

  // HitGrid
  hitGrid,
  clearHitGrid,
  resize,

  // Enable/disable
  enable,
  disable,
  processInput,
  isMouseSequence,

  // Handlers
  onMouseDown: (handler: MouseHandler) => dispatcher.onMouseDown(handler),
  onMouseUp: (handler: MouseHandler) => dispatcher.onMouseUp(handler),
  onClick: (handler: MouseHandler) => dispatcher.onClick(handler),
  onScroll: (handler: MouseHandler) => dispatcher.onScroll(handler),
  onComponent,
}
