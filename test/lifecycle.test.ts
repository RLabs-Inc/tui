/**
 * TUI Framework - Lifecycle Hooks Tests
 *
 * Tests for onMount and onDestroy hooks.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'

import {
  onMount,
  onDestroy,
  pushCurrentComponent,
  popCurrentComponent,
  runMountCallbacks,
  runDestroyCallbacks,
  getCurrentComponentIndex,
  resetLifecycle,
} from '../src/engine/lifecycle'

import { allocateIndex, releaseIndex, resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

// =============================================================================
// LIFECYCLE HOOKS TESTS
// =============================================================================

describe('Lifecycle Hooks - Current Component Tracking', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('getCurrentComponentIndex returns -1 when not in component', () => {
    expect(getCurrentComponentIndex()).toBe(-1)
  })

  test('pushCurrentComponent tracks current component', () => {
    const idx = allocateIndex()
    pushCurrentComponent(idx)

    expect(getCurrentComponentIndex()).toBe(idx)

    popCurrentComponent()
  })

  test('component stack handles nesting', () => {
    const idx1 = allocateIndex()
    const idx2 = allocateIndex()
    const idx3 = allocateIndex()

    pushCurrentComponent(idx1)
    expect(getCurrentComponentIndex()).toBe(idx1)

    pushCurrentComponent(idx2)
    expect(getCurrentComponentIndex()).toBe(idx2)

    pushCurrentComponent(idx3)
    expect(getCurrentComponentIndex()).toBe(idx3)

    popCurrentComponent()
    expect(getCurrentComponentIndex()).toBe(idx2)

    popCurrentComponent()
    expect(getCurrentComponentIndex()).toBe(idx1)

    popCurrentComponent()
    expect(getCurrentComponentIndex()).toBe(-1)
  })
})

describe('Lifecycle Hooks - onMount', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onMount callback is called when runMountCallbacks is invoked', () => {
    const idx = allocateIndex()
    let mounted = false

    pushCurrentComponent(idx)
    onMount(() => { mounted = true })
    popCurrentComponent()

    expect(mounted).toBe(false)

    runMountCallbacks(idx)

    expect(mounted).toBe(true)
  })

  test('multiple onMount callbacks are all called', () => {
    const idx = allocateIndex()
    const calls: number[] = []

    pushCurrentComponent(idx)
    onMount(() => { calls.push(1) })
    onMount(() => { calls.push(2) })
    onMount(() => { calls.push(3) })
    popCurrentComponent()

    runMountCallbacks(idx)

    expect(calls).toEqual([1, 2, 3])
  })

  test('onMount warns when called outside component', () => {
    const originalWarn = console.warn
    let warned = false
    console.warn = () => { warned = true }

    onMount(() => {})

    expect(warned).toBe(true)
    console.warn = originalWarn
  })
})

describe('Lifecycle Hooks - onDestroy', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onDestroy callback is called when runDestroyCallbacks is invoked', () => {
    const idx = allocateIndex()
    let destroyed = false

    pushCurrentComponent(idx)
    onDestroy(() => { destroyed = true })
    popCurrentComponent()

    expect(destroyed).toBe(false)

    runDestroyCallbacks(idx)

    expect(destroyed).toBe(true)
  })

  test('multiple onDestroy callbacks are all called', () => {
    const idx = allocateIndex()
    const calls: number[] = []

    pushCurrentComponent(idx)
    onDestroy(() => { calls.push(1) })
    onDestroy(() => { calls.push(2) })
    onDestroy(() => { calls.push(3) })
    popCurrentComponent()

    runDestroyCallbacks(idx)

    expect(calls).toEqual([1, 2, 3])
  })

  test('onDestroy is called via releaseIndex', () => {
    const idx = allocateIndex()
    let destroyed = false

    pushCurrentComponent(idx)
    onDestroy(() => { destroyed = true })
    popCurrentComponent()
    runMountCallbacks(idx) // Simulate full component setup

    // releaseIndex should call runDestroyCallbacks
    releaseIndex(idx)

    expect(destroyed).toBe(true)
  })

  test('onDestroy callbacks are cleaned up after running', () => {
    const idx = allocateIndex()
    let callCount = 0

    pushCurrentComponent(idx)
    onDestroy(() => { callCount++ })
    popCurrentComponent()

    runDestroyCallbacks(idx)
    expect(callCount).toBe(1)

    // Second call should do nothing (callbacks were cleaned up)
    runDestroyCallbacks(idx)
    expect(callCount).toBe(1)
  })
})

describe('Lifecycle Hooks - Error Handling', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('error in onMount does not prevent other callbacks', () => {
    const idx = allocateIndex()
    const calls: number[] = []
    const originalError = console.error
    console.error = () => {} // Suppress error output

    pushCurrentComponent(idx)
    onMount(() => { calls.push(1) })
    onMount(() => { throw new Error('test error') })
    onMount(() => { calls.push(3) })
    popCurrentComponent()

    runMountCallbacks(idx)

    expect(calls).toEqual([1, 3])
    console.error = originalError
  })

  test('error in onDestroy does not prevent other callbacks', () => {
    const idx = allocateIndex()
    const calls: number[] = []
    const originalError = console.error
    console.error = () => {} // Suppress error output

    pushCurrentComponent(idx)
    onDestroy(() => { calls.push(1) })
    onDestroy(() => { throw new Error('test error') })
    onDestroy(() => { calls.push(3) })
    popCurrentComponent()

    runDestroyCallbacks(idx)

    expect(calls).toEqual([1, 3])
    console.error = originalError
  })
})

describe('Lifecycle Hooks - Practical Use Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('timer cleanup pattern', () => {
    const idx = allocateIndex()
    let timerCleared = false

    // Simulate: const timer = setInterval(...)
    // In reality we'd use a real timer, but for test we just track the call
    const mockTimer = { id: 123 }

    pushCurrentComponent(idx)
    // Register cleanup
    onDestroy(() => {
      // clearInterval(mockTimer.id)
      timerCleared = true
    })
    popCurrentComponent()
    runMountCallbacks(idx)

    expect(timerCleared).toBe(false)

    // Component destroyed
    releaseIndex(idx)

    expect(timerCleared).toBe(true)
  })

  test('subscription cleanup pattern', () => {
    const idx = allocateIndex()
    const subscriptions: string[] = []

    pushCurrentComponent(idx)

    // Simulate subscribing to multiple things
    subscriptions.push('websocket')
    onDestroy(() => { subscriptions.splice(subscriptions.indexOf('websocket'), 1) })

    subscriptions.push('keyboard')
    onDestroy(() => { subscriptions.splice(subscriptions.indexOf('keyboard'), 1) })

    popCurrentComponent()
    runMountCallbacks(idx)

    expect(subscriptions).toEqual(['websocket', 'keyboard'])

    releaseIndex(idx)

    expect(subscriptions).toEqual([])
  })
})
