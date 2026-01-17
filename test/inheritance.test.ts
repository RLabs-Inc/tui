/**
 * TUI Framework - Inheritance Module Tests
 *
 * Tests for the color and style inheritance system:
 * - getInheritedFg, getInheritedBg: Color inheritance up parent chain
 * - getBorderStyles: Border style resolution with per-side overrides
 * - getBorderColors: Border color resolution with fallbacks
 * - hasBorder: Border detection
 * - getEffectiveOpacity: Opacity inheritance with multiplication
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { bind } from '@rlabs-inc/signals'

import {
  getInheritedFg,
  getInheritedBg,
  getInheritedBorderColor,
  getBorderColors,
  getBorderStyles,
  hasBorder,
  getEffectiveOpacity,
} from '../src/engine/inheritance'

import { TERMINAL_DEFAULT, Colors } from '../src/types/color'
import type { RGBA } from '../src/types'
import { ComponentType } from '../src/types'

import * as core from '../src/engine/arrays/core'
import * as visual from '../src/engine/arrays/visual'
import { resetAllArrays } from '../src/engine/arrays'
import { resetRegistry, allocateIndex } from '../src/engine/registry'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

/**
 * Set up a component with optional parent and colors.
 */
function setupComponent(
  index: number,
  parentIndex: number,
  options: {
    fg?: RGBA | null
    bg?: RGBA | null
    opacity?: number
    borderStyle?: number
    borderTop?: number
    borderRight?: number
    borderBottom?: number
    borderLeft?: number
    borderColor?: RGBA | null
    borderColorTop?: RGBA | null
    borderColorRight?: RGBA | null
    borderColorBottom?: RGBA | null
    borderColorLeft?: RGBA | null
  } = {}
): void {
  core.ensureCapacity(index)
  visual.ensureCapacity(index)

  core.componentType[index] = ComponentType.BOX
  core.parentIndex[index] = bind(parentIndex)

  visual.fgColor[index] = bind(options.fg ?? null)
  visual.bgColor[index] = bind(options.bg ?? null)
  visual.opacity[index] = bind(options.opacity ?? 1)

  visual.borderStyle[index] = bind(options.borderStyle ?? 0)
  visual.borderTop[index] = bind(options.borderTop ?? 0)
  visual.borderRight[index] = bind(options.borderRight ?? 0)
  visual.borderBottom[index] = bind(options.borderBottom ?? 0)
  visual.borderLeft[index] = bind(options.borderLeft ?? 0)

  visual.borderColor[index] = bind(options.borderColor ?? null)
  visual.borderColorTop[index] = bind(options.borderColorTop ?? null)
  visual.borderColorRight[index] = bind(options.borderColorRight ?? null)
  visual.borderColorBottom[index] = bind(options.borderColorBottom ?? null)
  visual.borderColorLeft[index] = bind(options.borderColorLeft ?? null)
}

// =============================================================================
// COLOR INHERITANCE TESTS (getInheritedFg, getInheritedBg)
// =============================================================================

describe('Inheritance - Foreground Color', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('component with own fg color returns it', () => {
    setupComponent(0, -1, { fg: Colors.RED })

    const result = getInheritedFg(0)

    expect(result).toEqual(Colors.RED)
  })

  test('component without fg color inherits from parent', () => {
    setupComponent(0, -1, { fg: Colors.GREEN })
    setupComponent(1, 0, { fg: null }) // No color, should inherit

    const result = getInheritedFg(1)

    expect(result).toEqual(Colors.GREEN)
  })

  test('walks up parent chain until color found', () => {
    setupComponent(0, -1, { fg: Colors.BLUE }) // Root with color
    setupComponent(1, 0, { fg: null }) // No color
    setupComponent(2, 1, { fg: null }) // No color
    setupComponent(3, 2, { fg: null }) // No color, should find Blue from root

    const result = getInheritedFg(3)

    expect(result).toEqual(Colors.BLUE)
  })

  test('returns TERMINAL_DEFAULT if no color in chain', () => {
    setupComponent(0, -1, { fg: null })
    setupComponent(1, 0, { fg: null })

    const result = getInheritedFg(1)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })

  test('stops at first parent with color', () => {
    setupComponent(0, -1, { fg: Colors.RED }) // Root
    setupComponent(1, 0, { fg: Colors.GREEN }) // Has color
    setupComponent(2, 1, { fg: null }) // Should get GREEN not RED

    const result = getInheritedFg(2)

    expect(result).toEqual(Colors.GREEN)
  })

  test('root component without color returns TERMINAL_DEFAULT', () => {
    setupComponent(0, -1, { fg: null })

    const result = getInheritedFg(0)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })
})

describe('Inheritance - Background Color', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('component with own bg color returns it', () => {
    setupComponent(0, -1, { bg: Colors.YELLOW })

    const result = getInheritedBg(0)

    expect(result).toEqual(Colors.YELLOW)
  })

  test('component without bg color inherits from parent', () => {
    setupComponent(0, -1, { bg: Colors.CYAN })
    setupComponent(1, 0, { bg: null })

    const result = getInheritedBg(1)

    expect(result).toEqual(Colors.CYAN)
  })

  test('walks up parent chain until bg color found', () => {
    setupComponent(0, -1, { bg: Colors.MAGENTA })
    setupComponent(1, 0, { bg: null })
    setupComponent(2, 1, { bg: null })
    setupComponent(3, 2, { bg: null })
    setupComponent(4, 3, { bg: null })

    const result = getInheritedBg(4)

    expect(result).toEqual(Colors.MAGENTA)
  })

  test('returns TERMINAL_DEFAULT if no bg color in chain', () => {
    setupComponent(0, -1, { bg: null })
    setupComponent(1, 0, { bg: null })
    setupComponent(2, 1, { bg: null })

    const result = getInheritedBg(2)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })
})

// =============================================================================
// BORDER STYLES TESTS (getBorderStyles)
// =============================================================================

describe('Inheritance - Border Styles', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returns all four border styles', () => {
    setupComponent(0, -1, {
      borderTop: 1,
      borderRight: 2,
      borderBottom: 3,
      borderLeft: 4,
    })

    const result = getBorderStyles(0)

    expect(result.top).toBe(1)
    expect(result.right).toBe(2)
    expect(result.bottom).toBe(3)
    expect(result.left).toBe(4)
  })

  test('borderStyle shorthand applies to all sides', () => {
    setupComponent(0, -1, { borderStyle: 2 })

    const result = getBorderStyles(0)

    expect(result.top).toBe(2)
    expect(result.right).toBe(2)
    expect(result.bottom).toBe(2)
    expect(result.left).toBe(2)
  })

  test('individual borders override shorthand', () => {
    setupComponent(0, -1, {
      borderStyle: 1, // Default for all
      borderTop: 5, // Override top
      borderLeft: 3, // Override left
    })

    const result = getBorderStyles(0)

    expect(result.top).toBe(5) // Overridden
    expect(result.right).toBe(1) // From shorthand
    expect(result.bottom).toBe(1) // From shorthand
    expect(result.left).toBe(3) // Overridden
  })

  test('default is 0 (no border) when nothing set', () => {
    setupComponent(0, -1, {})

    const result = getBorderStyles(0)

    expect(result.top).toBe(0)
    expect(result.right).toBe(0)
    expect(result.bottom).toBe(0)
    expect(result.left).toBe(0)
  })

  test('partial individual borders with no shorthand', () => {
    setupComponent(0, -1, {
      borderTop: 2,
      borderBottom: 2,
    })

    const result = getBorderStyles(0)

    expect(result.top).toBe(2)
    expect(result.right).toBe(0)
    expect(result.bottom).toBe(2)
    expect(result.left).toBe(0)
  })
})

// =============================================================================
// BORDER COLORS TESTS (getBorderColors)
// =============================================================================

describe('Inheritance - Border Colors', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returns all four border colors', () => {
    setupComponent(0, -1, {
      borderColorTop: Colors.RED,
      borderColorRight: Colors.GREEN,
      borderColorBottom: Colors.BLUE,
      borderColorLeft: Colors.YELLOW,
    })

    const result = getBorderColors(0)

    expect(result.top).toEqual(Colors.RED)
    expect(result.right).toEqual(Colors.GREEN)
    expect(result.bottom).toEqual(Colors.BLUE)
    expect(result.left).toEqual(Colors.YELLOW)
  })

  test('borderColor shorthand applies to all sides', () => {
    setupComponent(0, -1, { borderColor: Colors.CYAN })

    const result = getBorderColors(0)

    expect(result.top).toEqual(Colors.CYAN)
    expect(result.right).toEqual(Colors.CYAN)
    expect(result.bottom).toEqual(Colors.CYAN)
    expect(result.left).toEqual(Colors.CYAN)
  })

  test('individual colors override shorthand', () => {
    setupComponent(0, -1, {
      borderColor: Colors.WHITE,
      borderColorTop: Colors.RED,
      borderColorBottom: Colors.BLUE,
    })

    const result = getBorderColors(0)

    expect(result.top).toEqual(Colors.RED) // Overridden
    expect(result.right).toEqual(Colors.WHITE) // From shorthand
    expect(result.bottom).toEqual(Colors.BLUE) // Overridden
    expect(result.left).toEqual(Colors.WHITE) // From shorthand
  })

  test('falls back to inherited fg color when no border color set', () => {
    setupComponent(0, -1, { fg: Colors.MAGENTA })

    const result = getBorderColors(0)

    expect(result.top).toEqual(Colors.MAGENTA)
    expect(result.right).toEqual(Colors.MAGENTA)
    expect(result.bottom).toEqual(Colors.MAGENTA)
    expect(result.left).toEqual(Colors.MAGENTA)
  })

  test('inherits fg color from parent for border fallback', () => {
    setupComponent(0, -1, { fg: Colors.GREEN })
    setupComponent(1, 0, { fg: null }) // No fg, no border color

    const result = getBorderColors(1)

    expect(result.top).toEqual(Colors.GREEN)
    expect(result.right).toEqual(Colors.GREEN)
    expect(result.bottom).toEqual(Colors.GREEN)
    expect(result.left).toEqual(Colors.GREEN)
  })
})

// =============================================================================
// INHERITED BORDER COLOR (getInheritedBorderColor)
// =============================================================================

describe('Inheritance - getInheritedBorderColor', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returns specific side color when set', () => {
    setupComponent(0, -1, { borderColorTop: Colors.RED })

    const result = getInheritedBorderColor(0, 'top')

    expect(result).toEqual(Colors.RED)
  })

  test('falls back to unified borderColor', () => {
    setupComponent(0, -1, { borderColor: Colors.BLUE })

    const result = getInheritedBorderColor(0, 'right')

    expect(result).toEqual(Colors.BLUE)
  })

  test('falls back to inherited fg when no border colors set', () => {
    setupComponent(0, -1, { fg: Colors.YELLOW })

    const result = getInheritedBorderColor(0, 'bottom')

    expect(result).toEqual(Colors.YELLOW)
  })

  test('walks up parent chain for fg fallback', () => {
    setupComponent(0, -1, { fg: Colors.CYAN })
    setupComponent(1, 0, {})

    const result = getInheritedBorderColor(1, 'left')

    expect(result).toEqual(Colors.CYAN)
  })
})

// =============================================================================
// HAS BORDER TESTS (hasBorder)
// =============================================================================

describe('Inheritance - hasBorder', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returns true if any border > 0', () => {
    setupComponent(0, -1, { borderTop: 1 })

    expect(hasBorder(0)).toBe(true)
  })

  test('returns true for any single border', () => {
    setupComponent(0, -1, { borderRight: 2 })
    expect(hasBorder(0)).toBe(true)

    setupComponent(1, -1, { borderBottom: 1 })
    expect(hasBorder(1)).toBe(true)

    setupComponent(2, -1, { borderLeft: 3 })
    expect(hasBorder(2)).toBe(true)
  })

  test('returns false if all borders 0', () => {
    setupComponent(0, -1, {})

    expect(hasBorder(0)).toBe(false)
  })

  test('returns true when borderStyle shorthand is set', () => {
    setupComponent(0, -1, { borderStyle: 1 })

    expect(hasBorder(0)).toBe(true)
  })

  test('returns true with multiple borders set', () => {
    setupComponent(0, -1, {
      borderTop: 1,
      borderBottom: 1,
    })

    expect(hasBorder(0)).toBe(true)
  })
})

// =============================================================================
// EFFECTIVE OPACITY TESTS (getEffectiveOpacity)
// =============================================================================

describe('Inheritance - Effective Opacity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('returns 1 for fully opaque component', () => {
    setupComponent(0, -1, { opacity: 1 })

    expect(getEffectiveOpacity(0)).toBe(1)
  })

  test('returns component opacity when no parent', () => {
    setupComponent(0, -1, { opacity: 0.5 })

    expect(getEffectiveOpacity(0)).toBe(0.5)
  })

  test('multiplies opacity down parent chain', () => {
    setupComponent(0, -1, { opacity: 0.5 })
    setupComponent(1, 0, { opacity: 0.5 })

    expect(getEffectiveOpacity(1)).toBe(0.25) // 0.5 * 0.5
  })

  test('multiplies through multiple levels', () => {
    setupComponent(0, -1, { opacity: 0.8 })
    setupComponent(1, 0, { opacity: 0.5 })
    setupComponent(2, 1, { opacity: 0.5 })

    expect(getEffectiveOpacity(2)).toBe(0.2) // 0.8 * 0.5 * 0.5
  })

  test('opacity 1 does not affect result', () => {
    setupComponent(0, -1, { opacity: 1 })
    setupComponent(1, 0, { opacity: 0.5 })
    setupComponent(2, 1, { opacity: 1 })

    expect(getEffectiveOpacity(2)).toBe(0.5) // 1 * 0.5 * 1
  })

  test('zero opacity results in zero', () => {
    setupComponent(0, -1, { opacity: 0 })
    setupComponent(1, 0, { opacity: 1 })

    expect(getEffectiveOpacity(1)).toBe(0) // 0 * 1
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Inheritance - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('root component (no parent) handles fg inheritance', () => {
    setupComponent(0, -1, { fg: null })

    const result = getInheritedFg(0)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })

  test('root component (no parent) handles bg inheritance', () => {
    setupComponent(0, -1, { bg: null })

    const result = getInheritedBg(0)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })

  test('deeply nested components (5+ levels) inherit correctly', () => {
    setupComponent(0, -1, { fg: Colors.RED })
    setupComponent(1, 0, { fg: null })
    setupComponent(2, 1, { fg: null })
    setupComponent(3, 2, { fg: null })
    setupComponent(4, 3, { fg: null })
    setupComponent(5, 4, { fg: null })
    setupComponent(6, 5, { fg: null })

    const result = getInheritedFg(6)

    expect(result).toEqual(Colors.RED)
  })

  test('deeply nested bg inheritance works', () => {
    setupComponent(0, -1, { bg: Colors.BLUE })
    setupComponent(1, 0, {})
    setupComponent(2, 1, {})
    setupComponent(3, 2, {})
    setupComponent(4, 3, {})
    setupComponent(5, 4, {})

    const result = getInheritedBg(5)

    expect(result).toEqual(Colors.BLUE)
  })

  test('deeply nested opacity multiplies correctly', () => {
    setupComponent(0, -1, { opacity: 0.9 })
    setupComponent(1, 0, { opacity: 0.9 })
    setupComponent(2, 1, { opacity: 0.9 })
    setupComponent(3, 2, { opacity: 0.9 })
    setupComponent(4, 3, { opacity: 0.9 })

    const result = getEffectiveOpacity(4)

    // 0.9^5 = 0.59049
    expect(result).toBeCloseTo(0.59049, 5)
  })

  test('parent with undefined parent index terminates walk', () => {
    // Component with parent index that doesn't exist
    core.ensureCapacity(0)
    visual.ensureCapacity(0)
    core.componentType[0] = ComponentType.BOX
    core.parentIndex[0] = bind(-1) // No parent
    visual.fgColor[0] = bind(null)

    const result = getInheritedFg(0)

    expect(result).toEqual(TERMINAL_DEFAULT)
  })

  test('independent sibling inheritance', () => {
    setupComponent(0, -1, { fg: Colors.RED })
    setupComponent(1, 0, { fg: Colors.GREEN }) // Child with own color
    setupComponent(2, 0, { fg: null }) // Sibling inherits from parent

    expect(getInheritedFg(1)).toEqual(Colors.GREEN)
    expect(getInheritedFg(2)).toEqual(Colors.RED)
  })

  test('mixed color and border inheritance', () => {
    setupComponent(0, -1, { fg: Colors.WHITE, borderStyle: 1, borderColor: Colors.GRAY })
    setupComponent(1, 0, { fg: null, borderTop: 2 }) // Inherits fg, has own border

    expect(getInheritedFg(1)).toEqual(Colors.WHITE)
    expect(getBorderStyles(1).top).toBe(2)
  })

  test('handles component at index 0 correctly', () => {
    setupComponent(0, -1, { fg: Colors.CYAN, bg: Colors.BLACK })

    expect(getInheritedFg(0)).toEqual(Colors.CYAN)
    expect(getInheritedBg(0)).toEqual(Colors.BLACK)
    expect(getEffectiveOpacity(0)).toBe(1)
  })
})
