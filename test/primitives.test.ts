/**
 * TUI Framework - Box and Text Primitives Tests
 *
 * Comprehensive tests for the box and text primitive components.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, unwrap } from '@rlabs-inc/signals'

import { box } from '../src/primitives/box'
import { text } from '../src/primitives/text'
import { ComponentType, Attr } from '../src/types'

import { allocateIndex, releaseIndex, resetRegistry, getAllocatedIndices, getCurrentParentIndex } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { resetLifecycle, onMount, onDestroy, getCurrentComponentIndex } from '../src/engine/lifecycle'

// Import arrays for verification
import * as core from '../src/engine/arrays/core'
import * as dimensions from '../src/engine/arrays/dimensions'
import * as spacing from '../src/engine/arrays/spacing'
import * as layout from '../src/engine/arrays/layout'
import * as visual from '../src/engine/arrays/visual'
import * as textArrays from '../src/engine/arrays/text'
import * as interaction from '../src/engine/arrays/interaction'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
  resetLifecycle()
}

// =============================================================================
// BOX PRIMITIVE TESTS
// =============================================================================

describe('Box Primitive - Component Creation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('allocates index correctly', () => {
    const cleanup = box({})

    // Box should have allocated index 0
    expect(getAllocatedIndices().has(0)).toBe(true)
    expect(getAllocatedIndices().size).toBe(1)

    cleanup()
  })

  test('sets componentType to BOX', () => {
    const cleanup = box({})

    expect(core.componentType[0]).toBe(ComponentType.BOX)

    cleanup()
  })

  test('sets parent index to -1 for root component', () => {
    const cleanup = box({})

    expect(unwrap(core.parentIndex[0])).toBe(-1)

    cleanup()
  })

  test('allocates sequential indices for multiple boxes', () => {
    const cleanup1 = box({})
    const cleanup2 = box({})
    const cleanup3 = box({})

    expect(core.componentType[0]).toBe(ComponentType.BOX)
    expect(core.componentType[1]).toBe(ComponentType.BOX)
    expect(core.componentType[2]).toBe(ComponentType.BOX)

    cleanup1()
    cleanup2()
    cleanup3()
  })

  test('uses provided id for registry lookup', () => {
    const cleanup = box({ id: 'my-box' })

    // The id is used by the registry for ID <-> index mapping
    // Check via getId from registry
    const { getId } = require('../src/engine/registry')
    expect(getId(0)).toBe('my-box')

    cleanup()
  })
})

describe('Box Primitive - Dimension Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('width and height set correctly', () => {
    const cleanup = box({ width: 100, height: 50 })

    expect(unwrap(dimensions.width[0])).toBe(100)
    expect(unwrap(dimensions.height[0])).toBe(50)

    cleanup()
  })

  test('minWidth and maxWidth work', () => {
    const cleanup = box({ minWidth: 10, maxWidth: 200 })

    expect(unwrap(dimensions.minWidth[0])).toBe(10)
    expect(unwrap(dimensions.maxWidth[0])).toBe(200)

    cleanup()
  })

  test('minHeight and maxHeight work', () => {
    const cleanup = box({ minHeight: 5, maxHeight: 100 })

    expect(unwrap(dimensions.minHeight[0])).toBe(5)
    expect(unwrap(dimensions.maxHeight[0])).toBe(100)

    cleanup()
  })

  test('percentage dimensions stored as strings', () => {
    const cleanup = box({ width: '50%', height: '100%' })

    expect(unwrap(dimensions.width[0])).toBe('50%')
    expect(unwrap(dimensions.height[0])).toBe('100%')

    cleanup()
  })

  test('reactive width updates', () => {
    const width = signal(100)
    const cleanup = box({ width })

    expect(unwrap(dimensions.width[0])).toBe(100)

    width.value = 200
    expect(unwrap(dimensions.width[0])).toBe(200)

    cleanup()
  })
})

describe('Box Primitive - Spacing Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('padding shorthand applies to all sides', () => {
    const cleanup = box({ padding: 10 })

    expect(unwrap(spacing.paddingTop[0])).toBe(10)
    expect(unwrap(spacing.paddingRight[0])).toBe(10)
    expect(unwrap(spacing.paddingBottom[0])).toBe(10)
    expect(unwrap(spacing.paddingLeft[0])).toBe(10)

    cleanup()
  })

  test('individual padding props override shorthand', () => {
    const cleanup = box({ padding: 10, paddingTop: 20, paddingLeft: 5 })

    expect(unwrap(spacing.paddingTop[0])).toBe(20)
    expect(unwrap(spacing.paddingRight[0])).toBe(10)
    expect(unwrap(spacing.paddingBottom[0])).toBe(10)
    expect(unwrap(spacing.paddingLeft[0])).toBe(5)

    cleanup()
  })

  test('margin shorthand applies to all sides', () => {
    const cleanup = box({ margin: 5 })

    expect(unwrap(spacing.marginTop[0])).toBe(5)
    expect(unwrap(spacing.marginRight[0])).toBe(5)
    expect(unwrap(spacing.marginBottom[0])).toBe(5)
    expect(unwrap(spacing.marginLeft[0])).toBe(5)

    cleanup()
  })

  test('individual margin props override shorthand', () => {
    const cleanup = box({ margin: 5, marginTop: 15, marginRight: 8 })

    expect(unwrap(spacing.marginTop[0])).toBe(15)
    expect(unwrap(spacing.marginRight[0])).toBe(8)
    expect(unwrap(spacing.marginBottom[0])).toBe(5)
    expect(unwrap(spacing.marginLeft[0])).toBe(5)

    cleanup()
  })

  test('gap prop works', () => {
    const cleanup = box({ gap: 8 })

    expect(unwrap(spacing.gap[0])).toBe(8)

    cleanup()
  })
})

describe('Box Primitive - Flex Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('flexDirection column (default encoding: 0)', () => {
    const cleanup = box({ flexDirection: 'column' })

    expect(unwrap(layout.flexDirection[0])).toBe(0)

    cleanup()
  })

  test('flexDirection row (encoding: 1)', () => {
    const cleanup = box({ flexDirection: 'row' })

    expect(unwrap(layout.flexDirection[0])).toBe(1)

    cleanup()
  })

  test('flexWrap wrap (encoding: 1)', () => {
    const cleanup = box({ flexWrap: 'wrap' })

    expect(unwrap(layout.flexWrap[0])).toBe(1)

    cleanup()
  })

  test('justifyContent center (encoding: 1)', () => {
    const cleanup = box({ justifyContent: 'center' })

    expect(unwrap(layout.justifyContent[0])).toBe(1)

    cleanup()
  })

  test('justifyContent space-between (encoding: 3)', () => {
    const cleanup = box({ justifyContent: 'space-between' })

    expect(unwrap(layout.justifyContent[0])).toBe(3)

    cleanup()
  })

  test('alignItems center (encoding: 2)', () => {
    const cleanup = box({ alignItems: 'center' })

    expect(unwrap(layout.alignItems[0])).toBe(2)

    cleanup()
  })

  test('flexGrow and flexShrink work', () => {
    const cleanup = box({ grow: 2, shrink: 0 })

    expect(unwrap(layout.flexGrow[0])).toBe(2)
    expect(unwrap(layout.flexShrink[0])).toBe(0)

    cleanup()
  })

  test('flexBasis works', () => {
    const cleanup = box({ flexBasis: 100 })

    expect(unwrap(layout.flexBasis[0])).toBe(100)

    cleanup()
  })

  test('alignSelf center (encoding: 3)', () => {
    const cleanup = box({ alignSelf: 'center' })

    expect(unwrap(layout.alignSelf[0])).toBe(3)

    cleanup()
  })
})

describe('Box Primitive - Visual Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('fg and bg colors set correctly', () => {
    const fgColor = { r: 255, g: 0, b: 0, a: 255 }
    const bgColor = { r: 0, g: 0, b: 255, a: 255 }
    const cleanup = box({ fg: fgColor, bg: bgColor })

    expect(unwrap(visual.fgColor[0])).toEqual(fgColor)
    expect(unwrap(visual.bgColor[0])).toEqual(bgColor)

    cleanup()
  })

  test('border style works', () => {
    const cleanup = box({ border: 1 }) // SINGLE

    expect(unwrap(visual.borderStyle[0])).toBe(1)

    cleanup()
  })

  test('individual border props work', () => {
    const cleanup = box({
      borderTop: 1,
      borderRight: 2,
      borderBottom: 3,
      borderLeft: 4
    })

    expect(unwrap(visual.borderTop[0])).toBe(1)
    expect(unwrap(visual.borderRight[0])).toBe(2)
    expect(unwrap(visual.borderBottom[0])).toBe(3)
    expect(unwrap(visual.borderLeft[0])).toBe(4)

    cleanup()
  })

  test('borderColor works', () => {
    const color = { r: 128, g: 128, b: 128, a: 255 }
    const cleanup = box({ border: 1, borderColor: color })

    expect(unwrap(visual.borderColor[0])).toEqual(color)

    cleanup()
  })

  test('opacity works', () => {
    const cleanup = box({ opacity: 0.5 })

    expect(unwrap(visual.opacity[0])).toBe(0.5)

    cleanup()
  })

  test('zIndex works', () => {
    const cleanup = box({ zIndex: 10 })

    expect(unwrap(layout.zIndex[0])).toBe(10)

    cleanup()
  })
})

describe('Box Primitive - Children', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('children callback is executed', () => {
    let childrenCalled = false
    const cleanup = box({
      children: () => {
        childrenCalled = true
      }
    })

    expect(childrenCalled).toBe(true)

    cleanup()
  })

  test('parent context is set for children', () => {
    let childParentIndex = -999

    const cleanup = box({
      children: () => {
        // Create a child box and check its parent
        const childCleanup = box({})
        childParentIndex = unwrap(core.parentIndex[1])
        childCleanup()
      }
    })

    // Child (index 1) should have parent 0
    expect(childParentIndex).toBe(0)

    cleanup()
  })

  test('nested children have correct parent chain', () => {
    const cleanup = box({
      children: () => {
        box({
          children: () => {
            box({}) // index 2, parent should be 1
          }
        }) // index 1, parent should be 0
      }
    }) // index 0, parent should be -1

    expect(unwrap(core.parentIndex[0])).toBe(-1)
    expect(unwrap(core.parentIndex[1])).toBe(0)
    expect(unwrap(core.parentIndex[2])).toBe(1)

    cleanup()
  })
})

describe('Box Primitive - Visible Prop', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('visible: false hides component', () => {
    const cleanup = box({ visible: false })

    // visible can be stored as boolean or number
    const val = unwrap(core.visible[0])
    expect(val === false || val === 0).toBe(true)

    cleanup()
  })

  test('visible: true shows component', () => {
    const cleanup = box({ visible: true })

    const val = unwrap(core.visible[0])
    expect(val === true || val === 1).toBe(true)

    cleanup()
  })

  test('reactive visible works', () => {
    const isVisible = signal(true)
    const cleanup = box({ visible: isVisible })

    let val = unwrap(core.visible[0])
    expect(val === true || val === 1).toBe(true)

    isVisible.value = false
    val = unwrap(core.visible[0])
    expect(val === false || val === 0).toBe(true)

    isVisible.value = true
    val = unwrap(core.visible[0])
    expect(val === true || val === 1).toBe(true)

    cleanup()
  })
})

describe('Box Primitive - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('cleanup releases index', () => {
    const cleanup = box({})
    expect(getAllocatedIndices().has(0)).toBe(true)

    cleanup()
    expect(getAllocatedIndices().has(0)).toBe(false)
  })
})

// =============================================================================
// TEXT PRIMITIVE TESTS
// =============================================================================

describe('Text Primitive - Component Creation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('sets componentType to TEXT', () => {
    const cleanup = text({ content: 'Hello' })

    expect(core.componentType[0]).toBe(ComponentType.TEXT)

    cleanup()
  })

  test('content stored in textContent array', () => {
    const cleanup = text({ content: 'Hello, World!' })

    expect(unwrap(textArrays.textContent[0])).toBe('Hello, World!')

    cleanup()
  })

  test('number content is converted to string', () => {
    const cleanup = text({ content: 42 })

    expect(unwrap(textArrays.textContent[0])).toBe('42')

    cleanup()
  })

  test('uses provided id for registry lookup', () => {
    const cleanup = text({ content: 'Test', id: 'my-text' })

    // The id is used by the registry for ID <-> index mapping
    const { getId } = require('../src/engine/registry')
    expect(getId(0)).toBe('my-text')

    cleanup()
  })
})

describe('Text Primitive - Content Reactivity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('static content works', () => {
    const cleanup = text({ content: 'Static text' })

    expect(unwrap(textArrays.textContent[0])).toBe('Static text')

    cleanup()
  })

  test('signal content updates', () => {
    const content = signal('Initial')
    const cleanup = text({ content })

    expect(unwrap(textArrays.textContent[0])).toBe('Initial')

    content.value = 'Updated'
    expect(unwrap(textArrays.textContent[0])).toBe('Updated')

    cleanup()
  })

  test('getter content updates', () => {
    const count = signal(0)
    const cleanup = text({ content: () => `Count: ${count.value}` })

    expect(unwrap(textArrays.textContent[0])).toBe('Count: 0')

    count.value = 5
    expect(unwrap(textArrays.textContent[0])).toBe('Count: 5')

    cleanup()
  })

  test('reactive number content', () => {
    const num = signal(100)
    const cleanup = text({ content: num })

    expect(unwrap(textArrays.textContent[0])).toBe('100')

    num.value = 999
    expect(unwrap(textArrays.textContent[0])).toBe('999')

    cleanup()
  })
})

describe('Text Primitive - Text-Specific Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('textAlign left (encoding: 0)', () => {
    const cleanup = text({ content: 'Hello', align: 'left' })

    expect(unwrap(textArrays.textAlign[0])).toBe(0)

    cleanup()
  })

  test('textAlign center (encoding: 1)', () => {
    const cleanup = text({ content: 'Hello', align: 'center' })

    expect(unwrap(textArrays.textAlign[0])).toBe(1)

    cleanup()
  })

  test('textAlign right (encoding: 2)', () => {
    const cleanup = text({ content: 'Hello', align: 'right' })

    expect(unwrap(textArrays.textAlign[0])).toBe(2)

    cleanup()
  })

  test('textWrap wrap (encoding: 1)', () => {
    const cleanup = text({ content: 'Hello', wrap: 'wrap' })

    expect(unwrap(textArrays.textWrap[0])).toBe(1)

    cleanup()
  })

  test('textWrap nowrap (encoding: 0)', () => {
    const cleanup = text({ content: 'Hello', wrap: 'nowrap' })

    expect(unwrap(textArrays.textWrap[0])).toBe(0)

    cleanup()
  })

  test('textWrap truncate (encoding: 2)', () => {
    const cleanup = text({ content: 'Hello', wrap: 'truncate' })

    expect(unwrap(textArrays.textWrap[0])).toBe(2)

    cleanup()
  })
})

describe('Text Primitive - Styling', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('bold attribute works', () => {
    const cleanup = text({ content: 'Bold', attrs: Attr.BOLD })

    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.BOLD)

    cleanup()
  })

  test('italic attribute works', () => {
    const cleanup = text({ content: 'Italic', attrs: Attr.ITALIC })

    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.ITALIC)

    cleanup()
  })

  test('underline attribute works', () => {
    const cleanup = text({ content: 'Underline', attrs: Attr.UNDERLINE })

    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.UNDERLINE)

    cleanup()
  })

  test('combined attributes work', () => {
    const attrs = Attr.BOLD | Attr.ITALIC | Attr.UNDERLINE
    const cleanup = text({ content: 'Styled', attrs })

    expect(unwrap(textArrays.textAttrs[0])).toBe(attrs)

    cleanup()
  })

  test('fg and bg colors work', () => {
    const fg = { r: 255, g: 255, b: 255, a: 255 }
    const bg = { r: 0, g: 0, b: 0, a: 255 }
    const cleanup = text({ content: 'Colored', fg, bg })

    expect(unwrap(visual.fgColor[0])).toEqual(fg)
    expect(unwrap(visual.bgColor[0])).toEqual(bg)

    cleanup()
  })

  test('opacity works', () => {
    const cleanup = text({ content: 'Faded', opacity: 0.7 })

    expect(unwrap(visual.opacity[0])).toBe(0.7)

    cleanup()
  })
})

describe('Text Primitive - Dimension Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('width and height work', () => {
    const cleanup = text({ content: 'Text', width: 20, height: 1 })

    expect(unwrap(dimensions.width[0])).toBe(20)
    expect(unwrap(dimensions.height[0])).toBe(1)

    cleanup()
  })

  test('minWidth and maxWidth work', () => {
    const cleanup = text({ content: 'Text', minWidth: 5, maxWidth: 50 })

    expect(unwrap(dimensions.minWidth[0])).toBe(5)
    expect(unwrap(dimensions.maxWidth[0])).toBe(50)

    cleanup()
  })
})

describe('Text Primitive - Flex Item Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('grow and shrink work', () => {
    const cleanup = text({ content: 'Text', grow: 1, shrink: 0 })

    expect(unwrap(layout.flexGrow[0])).toBe(1)
    expect(unwrap(layout.flexShrink[0])).toBe(0)

    cleanup()
  })

  test('flexBasis works', () => {
    const cleanup = text({ content: 'Text', flexBasis: 50 })

    expect(unwrap(layout.flexBasis[0])).toBe(50)

    cleanup()
  })

  test('alignSelf works', () => {
    const cleanup = text({ content: 'Text', alignSelf: 'center' })

    expect(unwrap(layout.alignSelf[0])).toBe(3) // center = 3

    cleanup()
  })
})

describe('Text Primitive - Cleanup', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('cleanup releases index', () => {
    const cleanup = text({ content: 'Hello' })
    expect(getAllocatedIndices().has(0)).toBe(true)

    cleanup()
    expect(getAllocatedIndices().has(0)).toBe(false)
  })
})

// =============================================================================
// LIFECYCLE HOOKS TESTS (for both primitives)
// =============================================================================

describe('Box Primitive - Lifecycle Hooks', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('onMount fires after box creation', () => {
    let mounted = false
    const cleanup = box({
      children: () => {
        onMount(() => { mounted = true })
      }
    })

    // onMount should have fired (run synchronously after setup)
    expect(mounted).toBe(true)

    cleanup()
  })

  test('onDestroy fires on cleanup', () => {
    let destroyed = false
    const cleanup = box({
      children: () => {
        onDestroy(() => { destroyed = true })
      }
    })

    expect(destroyed).toBe(false)

    cleanup()
    expect(destroyed).toBe(true)
  })
})

describe('Text Primitive - Lifecycle Hooks', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('text component tracks lifecycle during creation', () => {
    let componentIndex = -999

    // We need to register in parent that creates text
    const cleanup = box({
      children: () => {
        // Inside the text creation context
        const textCleanup = text({ content: 'Hello' })
        // Text component would be at index 1
        componentIndex = 1
      }
    })

    expect(core.componentType[1]).toBe(ComponentType.TEXT)

    cleanup()
  })
})

// =============================================================================
// COMBINED BOX AND TEXT TESTS
// =============================================================================

describe('Box and Text - Combined Usage', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('box with text child', () => {
    const cleanup = box({
      width: 50,
      height: 10,
      children: () => {
        text({ content: 'Hello!' })
      }
    })

    // Box at 0, Text at 1
    expect(core.componentType[0]).toBe(ComponentType.BOX)
    expect(core.componentType[1]).toBe(ComponentType.TEXT)
    expect(unwrap(core.parentIndex[1])).toBe(0)
    expect(unwrap(textArrays.textContent[1])).toBe('Hello!')

    cleanup()
  })

  test('multiple text children in box', () => {
    const cleanup = box({
      children: () => {
        text({ content: 'Line 1' })
        text({ content: 'Line 2' })
        text({ content: 'Line 3' })
      }
    })

    expect(unwrap(textArrays.textContent[1])).toBe('Line 1')
    expect(unwrap(textArrays.textContent[2])).toBe('Line 2')
    expect(unwrap(textArrays.textContent[3])).toBe('Line 3')

    // All have parent 0
    expect(unwrap(core.parentIndex[1])).toBe(0)
    expect(unwrap(core.parentIndex[2])).toBe(0)
    expect(unwrap(core.parentIndex[3])).toBe(0)

    cleanup()
  })

  test('nested structure with mixed components', () => {
    const cleanup = box({
      id: 'root',
      children: () => {
        text({ content: 'Header' }) // index 1
        box({
          id: 'content',
          children: () => {
            text({ content: 'Content' }) // index 3
          }
        }) // index 2
        text({ content: 'Footer' }) // index 4
      }
    }) // index 0

    expect(core.componentType[0]).toBe(ComponentType.BOX)
    expect(core.componentType[1]).toBe(ComponentType.TEXT)
    expect(core.componentType[2]).toBe(ComponentType.BOX)
    expect(core.componentType[3]).toBe(ComponentType.TEXT)
    expect(core.componentType[4]).toBe(ComponentType.TEXT)

    expect(unwrap(core.parentIndex[1])).toBe(0)
    expect(unwrap(core.parentIndex[2])).toBe(0)
    expect(unwrap(core.parentIndex[3])).toBe(2)
    expect(unwrap(core.parentIndex[4])).toBe(0)

    cleanup()
  })
})

// =============================================================================
// INTERACTION PROPS TESTS
// =============================================================================

describe('Box Primitive - Interaction Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('focusable prop works', () => {
    const cleanup = box({ focusable: true })

    expect(unwrap(interaction.focusable[0])).toBe(1)

    cleanup()
  })

  test('tabIndex prop works', () => {
    const cleanup = box({ focusable: true, tabIndex: 5 })

    expect(unwrap(interaction.tabIndex[0])).toBe(5)

    cleanup()
  })

  test('overflow scroll makes box focusable', () => {
    const cleanup = box({ overflow: 'scroll' })

    expect(unwrap(interaction.focusable[0])).toBe(1)

    cleanup()
  })
})

// =============================================================================
// VARIANT STYLING TESTS
// =============================================================================

describe('Box Primitive - Variant Styling', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('variant applies theme colors', () => {
    const cleanup = box({ variant: 'primary' })

    // Colors should be resolved from theme
    const fg = unwrap(visual.fgColor[0])
    const bg = unwrap(visual.bgColor[0])

    // Should have colors set (not null/undefined defaults)
    expect(fg).not.toBeNull()
    expect(bg).not.toBeNull()

    cleanup()
  })

  test('explicit fg overrides variant fg', () => {
    const customFg = { r: 100, g: 200, b: 50, a: 255 }
    const cleanup = box({ variant: 'primary', fg: customFg })

    expect(unwrap(visual.fgColor[0])).toEqual(customFg)

    cleanup()
  })

  test('explicit bg overrides variant bg', () => {
    const customBg = { r: 10, g: 20, b: 30, a: 255 }
    const cleanup = box({ variant: 'primary', bg: customBg })

    expect(unwrap(visual.bgColor[0])).toEqual(customBg)

    cleanup()
  })

  test('default variant does not apply theme colors', () => {
    const cleanup = box({ variant: 'default' })

    // Default variant should not set colors (they stay as defaults)
    // The arrays are slot arrays with null defaults
    expect(unwrap(visual.fgColor[0])).toBeNull()
    expect(unwrap(visual.bgColor[0])).toBeNull()

    cleanup()
  })
})

describe('Text Primitive - Variant Styling', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('variant applies theme colors', () => {
    const cleanup = text({ content: 'Styled', variant: 'error' })

    const fg = unwrap(visual.fgColor[0])
    const bg = unwrap(visual.bgColor[0])

    expect(fg).not.toBeNull()
    expect(bg).not.toBeNull()

    cleanup()
  })

  test('explicit colors override variant', () => {
    const customFg = { r: 255, g: 100, b: 100, a: 255 }
    const cleanup = text({ content: 'Custom', variant: 'success', fg: customFg })

    expect(unwrap(visual.fgColor[0])).toEqual(customFg)

    cleanup()
  })
})

// =============================================================================
// TEXT VISIBLE PROP TESTS
// =============================================================================

describe('Text Primitive - Visible Prop', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('visible: false hides text', () => {
    const cleanup = text({ content: 'Hidden', visible: false })

    const val = unwrap(core.visible[0])
    expect(val === false || val === 0).toBe(true)

    cleanup()
  })

  test('reactive visible works for text', () => {
    const isVisible = signal(true)
    const cleanup = text({ content: 'Toggle', visible: isVisible })

    let val = unwrap(core.visible[0])
    expect(val === true || val === 1).toBe(true)

    isVisible.value = false
    val = unwrap(core.visible[0])
    expect(val === false || val === 0).toBe(true)

    cleanup()
  })
})

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

describe('Primitives - Edge Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('box with no props uses defaults', () => {
    const cleanup = box({})

    expect(core.componentType[0]).toBe(ComponentType.BOX)
    expect(unwrap(core.parentIndex[0])).toBe(-1)
    // Default visible is 1 (truthy)
    const visible = unwrap(core.visible[0])
    expect(visible === 1 || visible === true).toBe(true)

    cleanup()
  })

  test('text with empty string content', () => {
    const cleanup = text({ content: '' })

    expect(unwrap(textArrays.textContent[0])).toBe('')

    cleanup()
  })

  test('text with zero number content', () => {
    const cleanup = text({ content: 0 })

    expect(unwrap(textArrays.textContent[0])).toBe('0')

    cleanup()
  })

  test('box with zero dimensions', () => {
    const cleanup = box({ width: 0, height: 0 })

    expect(unwrap(dimensions.width[0])).toBe(0)
    expect(unwrap(dimensions.height[0])).toBe(0)

    cleanup()
  })

  test('nested boxes release in correct order', () => {
    let innerDestroyed = false
    let outerDestroyed = false

    const cleanup = box({
      children: () => {
        onDestroy(() => { outerDestroyed = true })
        box({
          children: () => {
            onDestroy(() => { innerDestroyed = true })
          }
        })
      }
    })

    expect(innerDestroyed).toBe(false)
    expect(outerDestroyed).toBe(false)

    cleanup()

    // Both should be destroyed after cleanup
    expect(innerDestroyed).toBe(true)
    expect(outerDestroyed).toBe(true)
  })

  test('index is reused after cleanup', () => {
    const cleanup1 = box({})
    const firstIndex = 0
    expect(core.componentType[firstIndex]).toBe(ComponentType.BOX)

    cleanup1()
    expect(getAllocatedIndices().has(firstIndex)).toBe(false)

    // Next allocation should reuse index 0
    const cleanup2 = text({ content: 'Reused' })
    expect(core.componentType[0]).toBe(ComponentType.TEXT)

    cleanup2()
  })
})

// =============================================================================
// REACTIVE PROPS TESTS
// =============================================================================

describe('Box Primitive - Reactive Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('reactive height updates', () => {
    const height = signal(10)
    const cleanup = box({ height })

    expect(unwrap(dimensions.height[0])).toBe(10)

    height.value = 25
    expect(unwrap(dimensions.height[0])).toBe(25)

    cleanup()
  })

  test('reactive padding updates', () => {
    const padding = signal(5)
    const cleanup = box({ padding })

    expect(unwrap(spacing.paddingTop[0])).toBe(5)
    expect(unwrap(spacing.paddingLeft[0])).toBe(5)

    padding.value = 10
    expect(unwrap(spacing.paddingTop[0])).toBe(10)
    expect(unwrap(spacing.paddingLeft[0])).toBe(10)

    cleanup()
  })

  test('reactive gap updates', () => {
    const gap = signal(4)
    const cleanup = box({ gap })

    expect(unwrap(spacing.gap[0])).toBe(4)

    gap.value = 8
    expect(unwrap(spacing.gap[0])).toBe(8)

    cleanup()
  })

  test('reactive flexGrow updates', () => {
    const grow = signal(1)
    const cleanup = box({ grow })

    expect(unwrap(layout.flexGrow[0])).toBe(1)

    grow.value = 2
    expect(unwrap(layout.flexGrow[0])).toBe(2)

    cleanup()
  })

  test('reactive color updates', () => {
    const bgColor = signal<{ r: number; g: number; b: number; a: number }>({ r: 255, g: 0, b: 0, a: 255 })
    const cleanup = box({ bg: bgColor })

    expect(unwrap(visual.bgColor[0])).toEqual({ r: 255, g: 0, b: 0, a: 255 })

    bgColor.value = { r: 0, g: 255, b: 0, a: 255 }
    expect(unwrap(visual.bgColor[0])).toEqual({ r: 0, g: 255, b: 0, a: 255 })

    cleanup()
  })
})

describe('Text Primitive - Reactive Props', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('reactive align updates', () => {
    const align = signal<'left' | 'center' | 'right'>('left')
    const cleanup = text({ content: 'Aligned', align })

    expect(unwrap(textArrays.textAlign[0])).toBe(0) // left

    align.value = 'center'
    expect(unwrap(textArrays.textAlign[0])).toBe(1)

    align.value = 'right'
    expect(unwrap(textArrays.textAlign[0])).toBe(2)

    cleanup()
  })

  test('reactive wrap updates', () => {
    const wrap = signal<'wrap' | 'nowrap' | 'truncate'>('wrap')
    const cleanup = text({ content: 'Wrapped', wrap })

    expect(unwrap(textArrays.textWrap[0])).toBe(1) // wrap

    wrap.value = 'truncate'
    expect(unwrap(textArrays.textWrap[0])).toBe(2)

    cleanup()
  })

  test('reactive attrs updates', () => {
    const attrs = signal(Attr.BOLD)
    const cleanup = text({ content: 'Styled', attrs })

    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.BOLD)

    attrs.value = Attr.ITALIC
    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.ITALIC)

    attrs.value = Attr.BOLD | Attr.UNDERLINE
    expect(unwrap(textArrays.textAttrs[0])).toBe(Attr.BOLD | Attr.UNDERLINE)

    cleanup()
  })
})
