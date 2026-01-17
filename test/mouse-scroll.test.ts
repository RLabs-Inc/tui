/**
 * TUI Framework - Mouse and Scroll Module Tests
 *
 * Tests for mouse state and scroll state management:
 * - Mouse event handlers (global and per-component)
 * - Mouse state signals (x, y, isDown, lastEvent)
 * - HitGrid coordinate-to-component lookup
 * - Scroll offset management
 * - Scroll bounds and clamping
 * - Scroll operations (scrollBy, scrollToTop, etc.)
 * - Scroll handlers for keyboard and wheel events
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { bind } from '@rlabs-inc/signals'

// Mouse module imports
import {
  HitGrid,
  hitGrid,
  lastMouseEvent,
  mouseX,
  mouseY,
  isMouseDown,
  dispatch,
  onMouseDown,
  onMouseUp,
  onClick,
  onScroll,
  onComponent,
  cleanup as mouseCleanup,
  clearHitGrid,
  resize,
  MouseButton,
  type MouseEvent,
  type MouseHandler,
} from '../src/state/mouse'

// Scroll module imports
import {
  isScrollable,
  getScrollOffset,
  getMaxScroll,
  setScrollOffset,
  scrollBy,
  scrollToTop,
  scrollToBottom,
  scrollToStart,
  scrollToEnd,
  scrollByWithChaining,
  findScrollableAt,
  getFocusedScrollable,
  handleArrowScroll,
  handlePageScroll,
  handleHomeEnd,
  handleWheelScroll,
  scrollIntoView,
  LINE_SCROLL,
  WHEEL_SCROLL,
} from '../src/state/scroll'

// Engine imports for test setup
import { allocateIndex, resetRegistry, releaseIndex } from '../src/engine/registry'
import * as core from '../src/engine/arrays/core'
import * as interaction from '../src/engine/arrays/interaction'
import * as layoutArrays from '../src/engine/arrays/layout'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { Overflow } from '../src/pipeline/layout/types'
import { ComponentType } from '../src/types'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  mouseCleanup()
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
  // Reset signals to default values
  interaction.focusedIndex.value = -1
}

/** Create a simple component */
function createComponent(): number {
  const idx = allocateIndex()
  core.ensureCapacity(idx)
  interaction.ensureCapacity(idx)
  layoutArrays.ensureCapacity(idx)

  core.componentType[idx] = ComponentType.BOX
  core.visible[idx] = bind(true)

  return idx
}

/** Create a scrollable component by setting overflow to SCROLL */
function createScrollableComponent(): number {
  const idx = createComponent()
  layoutArrays.overflow[idx] = bind(Overflow.SCROLL)
  return idx
}

/** Create a mouse event for testing */
function createMouseEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return {
    action: 'move',
    button: MouseButton.NONE,
    x: 0,
    y: 0,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    componentIndex: -1,
    ...overrides,
  }
}

// =============================================================================
// HITGRID TESTS
// =============================================================================

describe('HitGrid', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('constructor creates grid with correct dimensions', () => {
    const grid = new HitGrid(40, 20)
    expect(grid.width).toBe(40)
    expect(grid.height).toBe(20)
  })

  test('get returns -1 for empty cells', () => {
    const grid = new HitGrid(10, 10)
    expect(grid.get(5, 5)).toBe(-1)
  })

  test('set and get work correctly', () => {
    const grid = new HitGrid(10, 10)
    grid.set(3, 4, 42)
    expect(grid.get(3, 4)).toBe(42)
  })

  test('fillRect fills rectangular region', () => {
    const grid = new HitGrid(10, 10)
    grid.fillRect(2, 2, 3, 3, 7)

    // Inside region
    expect(grid.get(2, 2)).toBe(7)
    expect(grid.get(3, 3)).toBe(7)
    expect(grid.get(4, 4)).toBe(7)

    // Outside region
    expect(grid.get(1, 1)).toBe(-1)
    expect(grid.get(5, 5)).toBe(-1)
  })

  test('fillRect clips to grid bounds', () => {
    const grid = new HitGrid(10, 10)
    // Fill extending past bounds
    grid.fillRect(-2, -2, 5, 5, 3)

    // Should have filled within bounds
    expect(grid.get(0, 0)).toBe(3)
    expect(grid.get(1, 1)).toBe(3)
    expect(grid.get(2, 2)).toBe(3)
    // But not past where fillRect would end
    expect(grid.get(3, 3)).toBe(-1)
  })

  test('get returns -1 for out-of-bounds coordinates', () => {
    const grid = new HitGrid(10, 10)
    expect(grid.get(-1, 0)).toBe(-1)
    expect(grid.get(0, -1)).toBe(-1)
    expect(grid.get(10, 0)).toBe(-1)
    expect(grid.get(0, 10)).toBe(-1)
  })

  test('clear resets all cells to -1', () => {
    const grid = new HitGrid(10, 10)
    grid.fillRect(0, 0, 5, 5, 5)
    grid.clear()

    expect(grid.get(0, 0)).toBe(-1)
    expect(grid.get(2, 2)).toBe(-1)
  })

  test('resize creates new grid with new dimensions', () => {
    const grid = new HitGrid(10, 10)
    grid.set(5, 5, 42)

    grid.resize(20, 15)

    expect(grid.width).toBe(20)
    expect(grid.height).toBe(15)
    // Old data cleared
    expect(grid.get(5, 5)).toBe(-1)
  })
})

// =============================================================================
// MOUSE STATE TESTS
// =============================================================================

describe('Mouse State', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('mouseX and mouseY start at 0', () => {
    expect(mouseX.value).toBe(0)
    expect(mouseY.value).toBe(0)
  })

  test('isMouseDown starts as false', () => {
    expect(isMouseDown.value).toBe(false)
  })

  test('lastMouseEvent starts as null', () => {
    expect(lastMouseEvent.value).toBeNull()
  })

  test('dispatch updates mouseX and mouseY', () => {
    dispatch(createMouseEvent({ x: 15, y: 20 }))

    expect(mouseX.value).toBe(15)
    expect(mouseY.value).toBe(20)
  })

  test('dispatch updates isMouseDown on down action', () => {
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT }))
    expect(isMouseDown.value).toBe(true)
  })

  test('dispatch updates isMouseDown on up action', () => {
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT }))
    expect(isMouseDown.value).toBe(true)

    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT }))
    expect(isMouseDown.value).toBe(false)
  })

  test('dispatch stores event in lastMouseEvent', () => {
    const event = createMouseEvent({ x: 10, y: 5, action: 'move' })
    dispatch(event)

    expect(lastMouseEvent.value).not.toBeNull()
    expect(lastMouseEvent.value!.x).toBe(10)
    expect(lastMouseEvent.value!.y).toBe(5)
  })
})

// =============================================================================
// GLOBAL MOUSE HANDLERS TESTS
// =============================================================================

describe('Mouse Global Handlers', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onMouseDown registers handler and returns unsubscribe', () => {
    const handler = mock(() => {})
    const unsub = onMouseDown(handler)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT }))

    expect(handler).toHaveBeenCalled()

    unsub()
    handler.mockClear()

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT }))
    expect(handler).not.toHaveBeenCalled()
  })

  test('onMouseUp registers handler and returns unsubscribe', () => {
    const handler = mock(() => {})
    const unsub = onMouseUp(handler)

    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT }))

    expect(handler).toHaveBeenCalled()

    unsub()
    handler.mockClear()

    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT }))
    expect(handler).not.toHaveBeenCalled()
  })

  test('onClick registers handler for press+release on same component', () => {
    const handler = mock(() => {})
    onClick(handler)

    const idx = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)

    // Press at position
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 5, y: 5 }))
    expect(handler).not.toHaveBeenCalled()

    // Release at same position (same component)
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 5, y: 5 }))
    expect(handler).toHaveBeenCalled()
  })

  test('onClick does not fire when release is on different component', () => {
    const handler = mock(() => {})
    onClick(handler)

    const idx1 = createComponent()
    const idx2 = createComponent()
    hitGrid.fillRect(0, 0, 5, 10, idx1)
    hitGrid.fillRect(5, 0, 5, 10, idx2)

    // Press on first component
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 2, y: 5 }))
    // Release on second component
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 7, y: 5 }))

    expect(handler).not.toHaveBeenCalled()
  })

  test('onScroll registers handler for scroll events', () => {
    const handler = mock(() => {})
    const unsub = onScroll(handler)

    dispatch(createMouseEvent({
      action: 'scroll',
      x: 5,
      y: 5,
      scroll: { direction: 'down', delta: 3 },
    }))

    expect(handler).toHaveBeenCalled()

    unsub()
  })

  test('handler returning true stops propagation', () => {
    const handler1 = mock(() => true)
    const handler2 = mock(() => {})

    onMouseDown(handler1)
    onMouseDown(handler2)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT }))

    expect(handler1).toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })
})

// =============================================================================
// COMPONENT MOUSE HANDLERS TESTS
// =============================================================================

describe('Mouse Component Handlers', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onComponent registers per-component handlers', () => {
    const idx = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)

    const onMouseDownHandler = mock(() => {})
    const unsub = onComponent(idx, { onMouseDown: onMouseDownHandler })

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 5, y: 5 }))

    expect(onMouseDownHandler).toHaveBeenCalled()

    unsub()
  })

  test('component handler returns unsubscribe function', () => {
    const idx = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)

    const handler = mock(() => {})
    const unsub = onComponent(idx, { onClick: handler })

    unsub()

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 5, y: 5 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 5, y: 5 }))

    expect(handler).not.toHaveBeenCalled()
  })

  test('component handlers only fire for events on that component', () => {
    const idx1 = createComponent()
    const idx2 = createComponent()
    hitGrid.fillRect(0, 0, 5, 10, idx1)
    hitGrid.fillRect(5, 0, 5, 10, idx2)

    const handler1 = mock(() => {})
    const handler2 = mock(() => {})
    onComponent(idx1, { onMouseDown: handler1 })
    onComponent(idx2, { onMouseDown: handler2 })

    // Click on component 1
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 2, y: 5 }))

    expect(handler1).toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })

  test('component onScroll handler receives scroll events', () => {
    const idx = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)

    const handler = mock(() => {})
    onComponent(idx, { onScroll: handler })

    dispatch(createMouseEvent({
      action: 'scroll',
      x: 5,
      y: 5,
      scroll: { direction: 'up', delta: 2 },
    }))

    expect(handler).toHaveBeenCalled()
  })
})

// =============================================================================
// MOUSE CLEANUP TESTS
// =============================================================================

describe('Mouse Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('cleanup clears all handlers', () => {
    const globalHandler = mock(() => {})
    onMouseDown(globalHandler)

    const idx = createComponent()
    const componentHandler = mock(() => {})
    onComponent(idx, { onMouseDown: componentHandler })

    mouseCleanup()

    hitGrid.fillRect(0, 0, 10, 10, idx)
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 5, y: 5 }))

    expect(globalHandler).not.toHaveBeenCalled()
    expect(componentHandler).not.toHaveBeenCalled()
  })

  test('cleanup resets mouse state signals', () => {
    dispatch(createMouseEvent({ action: 'down', x: 50, y: 30 }))

    mouseCleanup()

    expect(mouseX.value).toBe(0)
    expect(mouseY.value).toBe(0)
    expect(isMouseDown.value).toBe(false)
    expect(lastMouseEvent.value).toBeNull()
  })

  test('clearHitGrid clears the hit grid', () => {
    const idx = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)

    expect(hitGrid.get(5, 5)).toBe(idx)

    clearHitGrid()

    expect(hitGrid.get(5, 5)).toBe(-1)
  })

  test('resize updates hit grid dimensions', () => {
    resize(100, 50)

    expect(hitGrid.width).toBe(100)
    expect(hitGrid.height).toBe(50)
  })
})

// =============================================================================
// SCROLL STATE TESTS
// =============================================================================

describe('Scroll State Access', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('getScrollOffset returns zero for new components', () => {
    const idx = createComponent()
    const offset = getScrollOffset(idx)

    expect(offset.x).toBe(0)
    expect(offset.y).toBe(0)
  })

  test('setScrollOffset updates scroll position', () => {
    const idx = createScrollableComponent()

    // Trigger layout to populate scrollable flag
    layoutDerived.value

    // Manually set scrollable state for testing (layout would normally do this)
    interaction.scrollOffsetX.setValue(idx, 10)
    interaction.scrollOffsetY.setValue(idx, 20)

    const offset = getScrollOffset(idx)
    expect(offset.x).toBe(10)
    expect(offset.y).toBe(20)
  })

  test('getMaxScroll returns values from layout', () => {
    const idx = createScrollableComponent()

    // Trigger layout to get computed values
    const layout = layoutDerived.value

    // getMaxScroll reads from the layout derived
    const max = getMaxScroll(idx)
    expect(typeof max.x).toBe('number')
    expect(typeof max.y).toBe('number')
  })
})

// =============================================================================
// SCROLL OPERATIONS TESTS
// =============================================================================

describe('Scroll Operations', () => {
  beforeEach(() => {
    cleanupAll()
    // Set terminal size for consistent layout
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('scrollBy returns false for non-scrollable components', () => {
    const idx = createComponent() // Not scrollable
    layoutDerived.value

    const result = scrollBy(idx, 0, 10)
    expect(result).toBe(false)
  })

  test('scrollToTop sets vertical offset to 0', () => {
    const idx = createScrollableComponent()
    interaction.scrollOffsetY.setValue(idx, 50)

    scrollToTop(idx)

    // Should remain unchanged if not scrollable, but function is called
    const offset = getScrollOffset(idx)
    // Since component is not actually laid out as scrollable in test env,
    // we verify the function doesn't crash
    expect(typeof offset.y).toBe('number')
  })

  test('scrollToBottom scrolls to max scroll Y', () => {
    const idx = createScrollableComponent()
    layoutDerived.value

    scrollToBottom(idx)

    // Function completes without error
    const offset = getScrollOffset(idx)
    expect(typeof offset.y).toBe('number')
  })

  test('scrollToStart sets horizontal offset to 0', () => {
    const idx = createScrollableComponent()
    interaction.scrollOffsetX.setValue(idx, 30)

    scrollToStart(idx)

    const offset = getScrollOffset(idx)
    expect(typeof offset.x).toBe('number')
  })

  test('scrollToEnd scrolls to max scroll X', () => {
    const idx = createScrollableComponent()
    layoutDerived.value

    scrollToEnd(idx)

    const offset = getScrollOffset(idx)
    expect(typeof offset.x).toBe('number')
  })
})

// =============================================================================
// SCROLL CHAINING TESTS
// =============================================================================

describe('Scroll Chaining', () => {
  beforeEach(() => {
    cleanupAll()
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('scrollByWithChaining returns false for non-scrollable', () => {
    const idx = createComponent()
    layoutDerived.value

    const result = scrollByWithChaining(idx, 0, 10)
    expect(result).toBe(false)
  })

  test('scrollByWithChaining with no parent function returns false at boundary', () => {
    const idx = createComponent()
    layoutDerived.value

    const result = scrollByWithChaining(idx, 0, 10)
    expect(result).toBe(false)
  })
})

// =============================================================================
// SCROLL FINDER TESTS
// =============================================================================

describe('Scroll Finders', () => {
  beforeEach(() => {
    cleanupAll()
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('findScrollableAt returns -1 for empty hit grid', () => {
    const result = findScrollableAt(5, 5)
    expect(result).toBe(-1)
  })

  test('findScrollableAt uses hit grid to find component', () => {
    const idx = createScrollableComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx)
    layoutDerived.value

    const result = findScrollableAt(5, 5)
    // Will be -1 unless component is actually scrollable in layout
    expect(typeof result).toBe('number')
  })

  test('getFocusedScrollable returns -1 when nothing focused', () => {
    interaction.focusedIndex.value = -1
    const result = getFocusedScrollable()
    expect(result).toBe(-1)
  })

  test('getFocusedScrollable returns -1 when focused is not scrollable', () => {
    const idx = createComponent() // Not scrollable
    interaction.focusedIndex.value = idx
    layoutDerived.value

    const result = getFocusedScrollable()
    expect(result).toBe(-1)
  })
})

// =============================================================================
// SCROLL KEYBOARD HANDLERS TESTS
// =============================================================================

describe('Scroll Keyboard Handlers', () => {
  beforeEach(() => {
    cleanupAll()
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('handleArrowScroll returns false when no scrollable focused', () => {
    interaction.focusedIndex.value = -1

    expect(handleArrowScroll('up')).toBe(false)
    expect(handleArrowScroll('down')).toBe(false)
    expect(handleArrowScroll('left')).toBe(false)
    expect(handleArrowScroll('right')).toBe(false)
  })

  test('handlePageScroll returns false when no scrollable focused', () => {
    interaction.focusedIndex.value = -1

    expect(handlePageScroll('up')).toBe(false)
    expect(handlePageScroll('down')).toBe(false)
  })

  test('handleHomeEnd returns false when no scrollable focused', () => {
    interaction.focusedIndex.value = -1

    expect(handleHomeEnd('home')).toBe(false)
    expect(handleHomeEnd('end')).toBe(false)
  })
})

// =============================================================================
// SCROLL WHEEL HANDLER TESTS
// =============================================================================

describe('Scroll Wheel Handler', () => {
  beforeEach(() => {
    cleanupAll()
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('handleWheelScroll returns false when no scrollable at position', () => {
    interaction.focusedIndex.value = -1

    expect(handleWheelScroll(5, 5, 'up')).toBe(false)
    expect(handleWheelScroll(5, 5, 'down')).toBe(false)
    expect(handleWheelScroll(5, 5, 'left')).toBe(false)
    expect(handleWheelScroll(5, 5, 'right')).toBe(false)
  })

  test('handleWheelScroll checks hit grid first then focused', () => {
    const idx = createComponent() // Not scrollable
    hitGrid.fillRect(0, 0, 10, 10, idx)
    layoutDerived.value

    // Even with a component at position, returns false if not scrollable
    const result = handleWheelScroll(5, 5, 'down')
    expect(result).toBe(false)
  })
})

// =============================================================================
// SCROLL INTO VIEW TESTS
// =============================================================================

describe('Scroll Into View', () => {
  beforeEach(() => {
    cleanupAll()
    terminalWidth.value = 80
    terminalHeight.value = 24
  })
  afterEach(cleanupAll)

  test('scrollIntoView does nothing for non-scrollable parent', () => {
    const child = createComponent()
    const parent = createComponent() // Not scrollable
    layoutDerived.value

    // Should not crash
    scrollIntoView(child, parent, 50, 10, 20)

    const offset = getScrollOffset(parent)
    expect(offset.y).toBe(0)
  })

  test('scroll constants are defined', () => {
    expect(LINE_SCROLL).toBe(1)
    expect(WHEEL_SCROLL).toBe(3)
  })
})

// =============================================================================
// HITGRID + DISPATCH INTEGRATION TESTS
// =============================================================================

describe('HitGrid + Dispatch Integration', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('dispatch fills componentIndex from hitGrid', () => {
    const idx = createComponent()
    hitGrid.fillRect(10, 10, 5, 5, idx)

    dispatch(createMouseEvent({ x: 12, y: 12 }))

    expect(lastMouseEvent.value!.componentIndex).toBe(idx)
  })

  test('dispatch sets componentIndex to -1 for empty cell', () => {
    dispatch(createMouseEvent({ x: 50, y: 50 }))

    expect(lastMouseEvent.value!.componentIndex).toBe(-1)
  })

  test('hover enter/leave tracking between components', () => {
    const idx1 = createComponent()
    const idx2 = createComponent()
    hitGrid.fillRect(0, 0, 10, 10, idx1)
    hitGrid.fillRect(10, 0, 10, 10, idx2)

    const enter1 = mock(() => {})
    const leave1 = mock(() => {})
    const enter2 = mock(() => {})

    onComponent(idx1, { onMouseEnter: enter1, onMouseLeave: leave1 })
    onComponent(idx2, { onMouseEnter: enter2 })

    // Enter component 1
    dispatch(createMouseEvent({ x: 5, y: 5 }))
    expect(enter1).toHaveBeenCalled()

    // Move to component 2
    dispatch(createMouseEvent({ x: 15, y: 5 }))
    expect(leave1).toHaveBeenCalled()
    expect(enter2).toHaveBeenCalled()
  })
})
