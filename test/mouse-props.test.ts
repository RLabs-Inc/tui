/**
 * TUI Framework - Mouse Props Tests
 *
 * Tests for mouse props on primitives (box, text, input):
 * - Mouse handler props (onClick, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave, onScroll)
 * - Click-to-focus behavior on focusable elements
 * - Handler cleanup when components are destroyed
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { signal } from '@rlabs-inc/signals'

// Primitive imports
import { box } from '../src/primitives/box'
import { text } from '../src/primitives/text'
import { input } from '../src/primitives/input'

// Mouse module imports
import {
  hitGrid,
  dispatch,
  cleanup as mouseCleanup,
  MouseButton,
  type MouseEvent,
} from '../src/state/mouse'

// Focus module imports
import { focusedIndex } from '../src/state/focus'

// Engine imports for test setup
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  mouseCleanup()
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
  focusedIndex.value = -1
  terminalWidth.value = 80
  terminalHeight.value = 24
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

/** Trigger layout (hitGrid needs manual population in tests) */
function triggerLayout(): void {
  layoutDerived.value
}

/**
 * Manually populate hitGrid for a component at a position.
 * In production, the render pipeline does this. In tests, we must do it manually.
 */
function populateHitGrid(componentIndex: number, x: number, y: number, width: number, height: number): void {
  hitGrid.fillRect(x, y, width, height, componentIndex)
}

// =============================================================================
// BOX MOUSE PROPS TESTS
// =============================================================================

describe('Box Mouse Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onClick handler is called when box is clicked', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onClick: handler,
    })

    triggerLayout()
    // First allocated component is index 0 (nextIndex starts at 0)
    populateHitGrid(0, 0, 0, 10, 5)

    // Simulate click at position (0,0)
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseDown handler is called on mouse down', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseDown: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseUp handler is called on mouse up', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseUp: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseEnter is called when mouse enters box', () => {
    const enterHandler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseEnter: enterHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    // Move into box area
    dispatch(createMouseEvent({ action: 'move', x: 0, y: 0 }))

    expect(enterHandler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseLeave is called when mouse leaves box', () => {
    const leaveHandler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseLeave: leaveHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    // Enter box first
    dispatch(createMouseEvent({ action: 'move', x: 0, y: 0 }))

    // Leave box (move to area outside - componentIndex will be -1)
    dispatch(createMouseEvent({ action: 'move', x: 50, y: 50 }))

    expect(leaveHandler).toHaveBeenCalled()

    cleanup()
  })

  test('onScroll handler receives scroll events', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onScroll: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({
      action: 'scroll',
      x: 0,
      y: 0,
      scroll: { direction: 'down', delta: 3 },
    }))

    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('handlers are cleaned up when box is destroyed', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    // Verify it works before cleanup
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))
    expect(handler).toHaveBeenCalled()

    // Destroy the box
    cleanup()
    handler.mockClear()

    // After cleanup, handler should not be called (handlers unregistered)
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).not.toHaveBeenCalled()
  })

  test('onClick can return true to consume event', () => {
    const innerHandler = mock(() => true) // Consume event
    const outerHandler = mock(() => {})

    // Outer box with handler
    box({
      width: 20,
      height: 10,
      onClick: outerHandler,
      children: () => {
        // Inner box that consumes click
        box({
          width: 5,
          height: 3,
          onClick: innerHandler,
        })
      },
    })

    triggerLayout()
    // Outer box is index 0, inner box is index 1
    // Inner box should overlap outer at (0,0)
    populateHitGrid(1, 0, 0, 5, 3) // Inner covers 0,0

    // Click on inner box area
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(innerHandler).toHaveBeenCalled()
    // Outer should NOT be called because inner consumed the event
    expect(outerHandler).not.toHaveBeenCalled()
  })
})

// =============================================================================
// BOX CLICK-TO-FOCUS TESTS
// =============================================================================

describe('Box Click-to-Focus', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('clicking focusable box focuses it', () => {
    expect(focusedIndex.value).toBe(-1) // Nothing focused initially

    const cleanup = box({
      width: 10,
      height: 5,
      focusable: true,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    // Click on the box
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Box should now be focused (index 0 since it's the first component)
    expect(focusedIndex.value).toBe(0)

    cleanup()
  })

  test('clicking non-focusable box does not focus it', () => {
    expect(focusedIndex.value).toBe(-1)

    const cleanup = box({
      width: 10,
      height: 5,
      focusable: false, // Explicitly not focusable
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Should still be unfocused (no mouse handlers registered for non-focusable box without props)
    expect(focusedIndex.value).toBe(-1)

    cleanup()
  })

  test('click-to-focus works alongside user onClick handler', () => {
    const handler = mock(() => {})

    const cleanup = box({
      width: 10,
      height: 5,
      focusable: true,
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Both should happen: focus AND user handler called
    expect(focusedIndex.value).toBe(0)
    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('scrollable boxes are auto-focusable and focus on click', () => {
    const cleanup = box({
      width: 10,
      height: 5,
      overflow: 'scroll', // Makes it auto-focusable
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Should be focused due to auto-focusable
    expect(focusedIndex.value).toBe(0)

    cleanup()
  })
})

// =============================================================================
// TEXT MOUSE PROPS TESTS
// =============================================================================

describe('Text Mouse Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onClick handler is called when text is clicked', () => {
    const handler = mock(() => {})

    const cleanup = text({
      content: 'Click me',
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 8, 1) // Text component index 0, 8 chars wide

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseEnter/onMouseLeave work on text', () => {
    const enterHandler = mock(() => {})
    const leaveHandler = mock(() => {})

    const cleanup = text({
      content: 'Hover me',
      onMouseEnter: enterHandler,
      onMouseLeave: leaveHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 8, 1) // Text component index 0

    // Enter
    dispatch(createMouseEvent({ action: 'move', x: 0, y: 0 }))
    expect(enterHandler).toHaveBeenCalled()

    // Leave
    dispatch(createMouseEvent({ action: 'move', x: 50, y: 50 }))
    expect(leaveHandler).toHaveBeenCalled()

    cleanup()
  })

  test('handlers are cleaned up when text is destroyed', () => {
    const handler = mock(() => {})

    const cleanup = text({
      content: 'Test',
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 4, 1)

    // Verify handler works before cleanup
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))
    expect(handler).toHaveBeenCalled()

    cleanup()
    handler.mockClear()

    // After cleanup, handlers unregistered
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).not.toHaveBeenCalled()
  })
})

// =============================================================================
// INPUT MOUSE PROPS TESTS
// =============================================================================

describe('Input Mouse Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('clicking input focuses it', () => {
    const value = signal('')

    expect(focusedIndex.value).toBe(-1)

    const cleanup = input({
      value,
      width: 20,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 20, 1) // Input component index 0

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Input should be focused
    expect(focusedIndex.value).toBe(0)

    cleanup()
  })

  test('onClick handler is called alongside focus', () => {
    const value = signal('')
    const handler = mock(() => {})

    const cleanup = input({
      value,
      width: 20,
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 20, 1)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    // Both: focused AND handler called
    expect(focusedIndex.value).toBe(0)
    expect(handler).toHaveBeenCalled()

    cleanup()
  })

  test('onMouseEnter/onMouseLeave work on input', () => {
    const value = signal('')
    const enterHandler = mock(() => {})
    const leaveHandler = mock(() => {})

    const cleanup = input({
      value,
      width: 20,
      onMouseEnter: enterHandler,
      onMouseLeave: leaveHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 20, 1)

    // Enter
    dispatch(createMouseEvent({ action: 'move', x: 0, y: 0 }))
    expect(enterHandler).toHaveBeenCalled()

    // Leave
    dispatch(createMouseEvent({ action: 'move', x: 50, y: 50 }))
    expect(leaveHandler).toHaveBeenCalled()

    cleanup()
  })

  test('handlers are cleaned up when input is destroyed', () => {
    const value = signal('')
    const handler = mock(() => {})

    const cleanup = input({
      value,
      width: 20,
      onClick: handler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 20, 1)

    // Verify handler works before cleanup
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))
    expect(handler).toHaveBeenCalled()

    cleanup()
    handler.mockClear()
    focusedIndex.value = -1

    // After cleanup, handlers unregistered
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(handler).not.toHaveBeenCalled()
  })
})

// =============================================================================
// MULTIPLE PRIMITIVES INTERACTION
// =============================================================================

describe('Multiple Primitives Mouse Interaction', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('clicking different boxes focuses each one', () => {
    const cleanup1 = box({
      width: 10,
      height: 5,
      focusable: true,
    })

    const cleanup2 = box({
      width: 10,
      height: 5,
      focusable: true,
    })

    triggerLayout()
    // Position boxes at different locations
    populateHitGrid(0, 0, 0, 10, 5)   // First box at (0,0)
    populateHitGrid(1, 15, 0, 10, 5)  // Second box at (15,0)

    // Click first box
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(focusedIndex.value).toBe(0)

    // Click second box
    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 15, y: 0 }))
    dispatch(createMouseEvent({ action: 'up', button: MouseButton.LEFT, x: 15, y: 0 }))

    expect(focusedIndex.value).toBe(1)

    cleanup1()
    cleanup2()
  })

  test('nested boxes with handlers work correctly', () => {
    const outerHandler = mock(() => {})
    const innerHandler = mock(() => {})

    const cleanup = box({
      width: 20,
      height: 10,
      onMouseEnter: outerHandler,
      children: () => {
        box({
          width: 10,
          height: 5,
          onMouseEnter: innerHandler,
        })
      },
    })

    triggerLayout()
    // Inner box (index 1) is rendered on top of outer (index 0)
    // HitGrid stores the topmost component
    populateHitGrid(1, 0, 0, 10, 5)   // Inner box covers (0,0) to (10,5)
    populateHitGrid(0, 10, 0, 10, 10) // Outer box visible area outside inner

    // Move to inner box area - inner should capture
    dispatch(createMouseEvent({ action: 'move', x: 0, y: 0 }))

    expect(innerHandler).toHaveBeenCalled()
    expect(outerHandler).not.toHaveBeenCalled()

    // Move to outer-only area
    dispatch(createMouseEvent({ action: 'move', x: 12, y: 0 }))

    expect(outerHandler).toHaveBeenCalled()

    cleanup()
  })
})

// =============================================================================
// EVENT CONSUMPTION TESTS
// =============================================================================

describe('Mouse Event Consumption', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returning true from handler prevents global handlers', () => {
    const componentHandler = mock(() => true) // Consume
    const globalHandler = mock(() => {})

    // Register global handler
    const { onMouseDown } = require('../src/state/mouse')
    const unsub = onMouseDown(globalHandler)

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseDown: componentHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(componentHandler).toHaveBeenCalled()
    expect(globalHandler).not.toHaveBeenCalled()

    unsub()
    cleanup()
  })

  test('returning undefined allows propagation to global handlers', () => {
    const componentHandler = mock(() => undefined) // Don't consume
    const globalHandler = mock(() => {})

    const { onMouseDown } = require('../src/state/mouse')
    const unsub = onMouseDown(globalHandler)

    const cleanup = box({
      width: 10,
      height: 5,
      onMouseDown: componentHandler,
    })

    triggerLayout()
    populateHitGrid(0, 0, 0, 10, 5)

    dispatch(createMouseEvent({ action: 'down', button: MouseButton.LEFT, x: 0, y: 0 }))

    expect(componentHandler).toHaveBeenCalled()
    expect(globalHandler).toHaveBeenCalled()

    unsub()
    cleanup()
  })
})
