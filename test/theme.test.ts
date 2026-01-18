/**
 * TUI Framework - Theme System Tests
 *
 * Comprehensive tests for the theme state module including:
 * - Theme retrieval and structure
 * - Theme switching
 * - Color resolution (t.* accessors)
 * - Variant styles
 * - resolveColor function
 * - Built-in themes
 * - Edge cases
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { derived } from '@rlabs-inc/signals'

import {
  theme,
  themes,
  setTheme,
  getThemeNames,
  resolveColor,
  resolvedTheme,
  t,
  getVariantStyle,
  variantStyle,
  toAnsiFg,
  toAnsiBg,
  type ThemeColor,
  type Variant,
} from '../src/state/theme'
import { TERMINAL_DEFAULT, isAnsiColor, ansiColor } from '../src/types/color'

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Store original theme values to restore after tests
 */
const originalTheme = { ...themes.terminal }

function resetTheme(): void {
  setTheme('terminal')
}

// =============================================================================
// THEME RETRIEVAL TESTS
// =============================================================================

describe('Theme - Retrieval', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('theme state object exists', () => {
    expect(theme).toBeDefined()
    expect(typeof theme).toBe('object')
  })

  test('theme has primary color', () => {
    expect(theme.primary).toBeDefined()
  })

  test('theme has all semantic colors', () => {
    expect(theme.success).toBeDefined()
    expect(theme.warning).toBeDefined()
    expect(theme.error).toBeDefined()
    expect(theme.info).toBeDefined()
  })

  test('theme has text colors', () => {
    expect(theme.text).toBeDefined()
    expect(theme.textMuted).toBeDefined()
    expect(theme.textDim).toBeDefined()
    expect(theme.textDisabled).toBeDefined()
    expect(theme.textBright).toBeDefined()
  })

  test('theme has background colors', () => {
    // Background can be null (terminal default)
    expect('background' in theme).toBe(true)
    expect('backgroundMuted' in theme).toBe(true)
    expect('surface' in theme).toBe(true)
    expect('overlay' in theme).toBe(true)
  })

  test('theme has border colors', () => {
    expect(theme.border).toBeDefined()
    expect(theme.borderFocus).toBeDefined()
  })

  test('default theme is terminal theme', () => {
    expect(theme.name).toBe('terminal')
  })
})

// =============================================================================
// THEME SWITCHING TESTS
// =============================================================================

describe('Theme - Switching', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('setTheme changes current theme by name', () => {
    expect(theme.name).toBe('terminal')

    setTheme('dracula')

    expect(theme.name).toBe('dracula')
  })

  test('setTheme with object updates theme properties', () => {
    const customPrimary = 0xff0000

    setTheme({ primary: customPrimary })

    expect(theme.primary).toBe(customPrimary)
  })

  test('setTheme updates multiple properties', () => {
    setTheme({
      primary: 0x00ff00,
      secondary: 0x0000ff,
      name: 'custom',
    })

    expect(theme.primary).toBe(0x00ff00)
    expect(theme.secondary).toBe(0x0000ff)
    expect(theme.name).toBe('custom')
  })

  test('theme signal updates reactively on setTheme', () => {
    const currentName = derived(() => theme.name)

    expect(currentName.value).toBe('terminal')

    setTheme('nord')

    expect(currentName.value).toBe('nord')
  })

  test('setTheme with invalid name logs error and does not change theme', () => {
    const originalName = theme.name
    const originalConsoleError = console.error
    let errorLogged = false
    console.error = () => {
      errorLogged = true
    }

    // @ts-expect-error - Testing invalid theme name
    setTheme('nonexistent-theme')

    expect(errorLogged).toBe(true)
    expect(theme.name).toBe(originalName)

    console.error = originalConsoleError
  })

  test('getThemeNames returns all available themes', () => {
    const names = getThemeNames()

    expect(Array.isArray(names)).toBe(true)
    expect(names).toContain('terminal')
    expect(names).toContain('dracula')
    expect(names).toContain('nord')
  })
})

// =============================================================================
// COLOR RESOLUTION (t.* ACCESSORS) TESTS
// =============================================================================

describe('Theme - t.* Color Accessors', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('t.primary returns RGBA', () => {
    const color = t.primary.value

    expect(color).toHaveProperty('r')
    expect(color).toHaveProperty('g')
    expect(color).toHaveProperty('b')
    expect(color).toHaveProperty('a')
  })

  test('t.success returns resolved color', () => {
    const color = t.success.value

    expect(typeof color.r).toBe('number')
    expect(typeof color.a).toBe('number')
  })

  test('t.error returns resolved color', () => {
    const color = t.error.value

    expect(color).toBeDefined()
    expect(color.a).toBe(255)
  })

  test('t.warning returns resolved color', () => {
    const color = t.warning

    expect(color).toBeDefined()
  })

  test('t.info returns resolved color', () => {
    const color = t.info

    expect(color).toBeDefined()
  })

  test('t.text returns resolved text color', () => {
    const color = t.text

    expect(color).toBeDefined()
  })

  test('t.bg returns resolved background color', () => {
    const color = t.bg

    expect(color).toBeDefined()
  })

  test('t.border returns resolved border color', () => {
    const color = t.border

    expect(color).toBeDefined()
  })

  test('t.* accessors are reactive - update when theme changes', () => {
    // Read initial value
    const initialPrimary = t.primary.value

    // Change to dracula theme which has different primary
    setTheme('dracula')

    const newPrimary = t.primary.value

    // Colors should be different (dracula uses OKLCH purple)
    expect(newPrimary).not.toEqual(initialPrimary)
  })

  test('all t.* accessors exist', () => {
    // Main palette
    expect(t.primary).toBeDefined()
    expect(t.secondary).toBeDefined()
    expect(t.tertiary).toBeDefined()
    expect(t.accent).toBeDefined()

    // Semantic
    expect(t.success).toBeDefined()
    expect(t.warning).toBeDefined()
    expect(t.error).toBeDefined()
    expect(t.info).toBeDefined()

    // Text
    expect(t.text).toBeDefined()
    expect(t.textMuted).toBeDefined()
    expect(t.textDim).toBeDefined()
    expect(t.textDisabled).toBeDefined()
    expect(t.textBright).toBeDefined()

    // Backgrounds
    expect(t.bg).toBeDefined()
    expect(t.bgMuted).toBeDefined()
    expect(t.surface).toBeDefined()
    expect(t.overlay).toBeDefined()

    // Borders
    expect(t.border).toBeDefined()
    expect(t.borderFocus).toBeDefined()
  })
})

// =============================================================================
// VARIANT STYLES TESTS
// =============================================================================

describe('Theme - Variant Styles', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('getVariantStyle returns style object with fg, bg, border, borderFocus', () => {
    const style = getVariantStyle('primary')

    expect(style).toHaveProperty('fg')
    expect(style).toHaveProperty('bg')
    expect(style).toHaveProperty('border')
    expect(style).toHaveProperty('borderFocus')
  })

  test('getVariantStyle primary returns primary colors', () => {
    const style = getVariantStyle('primary')

    // bg should match theme primary (resolved)
    expect(style.bg).toBeDefined()
    expect(style.bg.a).toBe(255)
  })

  test('getVariantStyle success returns success colors', () => {
    const style = getVariantStyle('success')

    expect(style.bg).toBeDefined()
  })

  test('getVariantStyle error returns error colors', () => {
    const style = getVariantStyle('error')

    expect(style.bg).toBeDefined()
  })

  test('getVariantStyle warning returns warning colors', () => {
    const style = getVariantStyle('warning')

    expect(style.bg).toBeDefined()
  })

  test('getVariantStyle info returns info colors', () => {
    const style = getVariantStyle('info')

    expect(style.bg).toBeDefined()
  })

  test('getVariantStyle default returns default style', () => {
    const style = getVariantStyle('default')

    expect(style).toBeDefined()
    expect(style.fg).toBeDefined()
  })

  test('getVariantStyle ghost has transparent-like background', () => {
    const style = getVariantStyle('ghost')

    // Ghost uses TERMINAL_DEFAULT for bg
    expect(style.bg.r).toBe(-1)
  })

  test('getVariantStyle outline has primary fg with default bg', () => {
    const style = getVariantStyle('outline')

    expect(style.bg.r).toBe(-1) // TERMINAL_DEFAULT
  })

  test('variantStyle returns reactive derived', () => {
    const style = variantStyle('primary')

    expect(style.value).toBeDefined()
    expect(style.value.fg).toBeDefined()
  })

  test('variantStyle updates when theme changes', () => {
    const style = variantStyle('primary')
    const initialBg = { ...style.value.bg }

    setTheme('dracula')

    const newBg = style.value.bg

    // Dracula has different primary color
    expect(newBg).not.toEqual(initialBg)
  })

  test('unknown variant returns default style', () => {
    // @ts-expect-error - Testing unknown variant
    const style = getVariantStyle('nonexistent')

    // Should fall through to default case
    expect(style).toBeDefined()
    expect(style.fg).toBeDefined()
  })
})

// =============================================================================
// RESOLVE COLOR TESTS
// =============================================================================

describe('Theme - resolveColor', () => {
  test('resolveColor null returns TERMINAL_DEFAULT', () => {
    const color = resolveColor(null)

    expect(color.r).toBe(-1)
    expect(color.g).toBe(-1)
    expect(color.b).toBe(-1)
  })

  test('resolveColor undefined returns TERMINAL_DEFAULT', () => {
    const color = resolveColor(undefined as unknown as ThemeColor)

    expect(color.r).toBe(-1)
  })

  test('resolveColor ANSI index (0-15) returns ANSI marker', () => {
    const color = resolveColor(12) // bright blue

    expect(isAnsiColor(color)).toBe(true)
    expect(color.g).toBe(12) // ANSI index stored in g
  })

  test('resolveColor extended palette (16-255) returns ANSI marker', () => {
    const color = resolveColor(200)

    expect(isAnsiColor(color)).toBe(true)
    expect(color.g).toBe(200)
  })

  test('resolveColor RGB number (0xRRGGBB) returns RGBA', () => {
    const color = resolveColor(0xff0000) // red

    expect(color.r).toBe(255)
    expect(color.g).toBe(0)
    expect(color.b).toBe(0)
    expect(color.a).toBe(255)
  })

  test('resolveColor CSS hex string returns RGBA', () => {
    const color = resolveColor('#00ff00')

    expect(color.r).toBe(0)
    expect(color.g).toBe(255)
    expect(color.b).toBe(0)
  })

  test('resolveColor OKLCH string returns RGBA', () => {
    const color = resolveColor('oklch(0.7 0.15 120)')

    expect(color.r).toBeGreaterThanOrEqual(0)
    expect(color.g).toBeGreaterThanOrEqual(0)
    expect(color.b).toBeGreaterThanOrEqual(0)
    expect(color.a).toBe(255)
  })
})

// =============================================================================
// THEME STRUCTURE TESTS
// =============================================================================

describe('Theme - Structure', () => {
  test('theme has colors object (individual properties)', () => {
    // Theme uses flat structure, not nested colors object
    expect(theme.primary).toBeDefined()
    expect(theme.secondary).toBeDefined()
  })

  test('themes object contains all expected themes', () => {
    expect(themes.terminal).toBeDefined()
    expect(themes.dracula).toBeDefined()
    expect(themes.nord).toBeDefined()
    expect(themes.monokai).toBeDefined()
    expect(themes.solarized).toBeDefined()
    expect(themes.catppuccin).toBeDefined()
    expect(themes.gruvbox).toBeDefined()
    expect(themes.tokyoNight).toBeDefined()
    expect(themes.oneDark).toBeDefined()
    expect(themes.rosePine).toBeDefined()
    expect(themes.kanagawa).toBeDefined()
    expect(themes.everforest).toBeDefined()
    expect(themes.nightOwl).toBeDefined()
  })

  test('each theme has name property', () => {
    for (const [key, themePreset] of Object.entries(themes)) {
      expect(themePreset.name).toBe(key)
    }
  })

  test('each theme has description', () => {
    for (const themePreset of Object.values(themes)) {
      expect(typeof themePreset.description).toBe('string')
      expect(themePreset.description.length).toBeGreaterThan(0)
    }
  })

  test('each theme has all required color properties', () => {
    const requiredProps = [
      'primary',
      'secondary',
      'tertiary',
      'accent',
      'success',
      'warning',
      'error',
      'info',
      'text',
      'textMuted',
      'textDim',
      'textDisabled',
      'textBright',
      'background',
      'backgroundMuted',
      'surface',
      'overlay',
      'border',
      'borderFocus',
    ]

    for (const themePreset of Object.values(themes)) {
      for (const prop of requiredProps) {
        expect(prop in themePreset).toBe(true)
      }
    }
  })
})

// =============================================================================
// BUILT-IN THEMES TESTS
// =============================================================================

describe('Theme - Built-in Themes', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('terminal theme uses ANSI colors', () => {
    const terminal = themes.terminal

    expect(terminal.primary).toBe(12) // ANSI bright blue
    expect(terminal.error).toBe(1) // ANSI red
    expect(terminal.success).toBe(2) // ANSI green
  })

  test('terminal theme uses null for defaults', () => {
    const terminal = themes.terminal

    expect(terminal.text).toBe(null) // Terminal default
    expect(terminal.background).toBe(null)
  })

  test('dracula theme uses RGB and OKLCH colors', () => {
    const dracula = themes.dracula

    // Dracula uses OKLCH strings for semantic colors
    expect(typeof dracula.primary).toBe('string')
    expect(dracula.primary).toContain('oklch')

    // And RGB for text colors
    expect(typeof dracula.text).toBe('number')
    expect(dracula.text).toBe(0xf8f8f2)
  })

  test('nord theme has correct structure', () => {
    const nord = themes.nord

    expect(nord.name).toBe('nord')
    expect(typeof nord.primary).toBe('string')
  })

  test('catppuccin theme uses RGB values', () => {
    const catppuccin = themes.catppuccin

    expect(catppuccin.primary).toBe(0x89b4fa) // blue
    expect(catppuccin.background).toBe(0x1e1e2e) // base
  })

  test('switching between themes updates all colors', () => {
    // Start with terminal
    expect(theme.name).toBe('terminal')
    const terminalPrimary = theme.primary

    // Switch to gruvbox
    setTheme('gruvbox')
    expect(theme.name).toBe('gruvbox')
    expect(theme.primary).toBe(0x458588)
    expect(theme.primary).not.toBe(terminalPrimary)

    // Switch to tokyo night
    setTheme('tokyoNight')
    expect(theme.name).toBe('tokyoNight')
    expect(theme.primary).toBe(0x7aa2f7)
  })
})

// =============================================================================
// RESOLVED THEME TESTS
// =============================================================================

describe('Theme - resolvedTheme', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('resolvedTheme is a derived signal', () => {
    expect(resolvedTheme.value).toBeDefined()
  })

  test('resolvedTheme has all colors resolved to RGBA', () => {
    const resolved = resolvedTheme.value

    expect(resolved.primary).toHaveProperty('r')
    expect(resolved.primary).toHaveProperty('g')
    expect(resolved.primary).toHaveProperty('b')
    expect(resolved.primary).toHaveProperty('a')

    expect(resolved.success).toHaveProperty('r')
    expect(resolved.text).toHaveProperty('r')
    expect(resolved.background).toHaveProperty('r')
  })

  test('resolvedTheme updates when theme changes', () => {
    const initialPrimary = { ...resolvedTheme.value.primary }

    setTheme('catppuccin')

    const newPrimary = resolvedTheme.value.primary

    expect(newPrimary).not.toEqual(initialPrimary)
  })
})

// =============================================================================
// ANSI CODE GENERATION TESTS
// =============================================================================

describe('Theme - ANSI Code Generation', () => {
  test('toAnsiFg null returns reset code', () => {
    const code = toAnsiFg(null)

    expect(code).toBe('\x1b[39m')
  })

  test('toAnsiFg ANSI index (0-7) returns standard fg code', () => {
    const code = toAnsiFg(1) // red

    expect(code).toBe('\x1b[31m') // 30 + 1
  })

  test('toAnsiFg ANSI index (8-15) returns bright fg code', () => {
    const code = toAnsiFg(12) // bright blue

    expect(code).toBe('\x1b[94m') // 90 + (12-8)
  })

  test('toAnsiFg RGB returns 24-bit color code', () => {
    const code = toAnsiFg(0xff0000)

    expect(code).toBe('\x1b[38;2;255;0;0m')
  })

  test('toAnsiBg null returns reset code', () => {
    const code = toAnsiBg(null)

    expect(code).toBe('\x1b[49m')
  })

  test('toAnsiBg ANSI index returns standard bg code', () => {
    const code = toAnsiBg(2) // green

    expect(code).toBe('\x1b[42m') // 40 + 2
  })

  test('toAnsiBg RGB returns 24-bit bg code', () => {
    const code = toAnsiBg(0x00ff00)

    expect(code).toBe('\x1b[48;2;0;255;0m')
  })
})

// =============================================================================
// EDGE CASES TESTS
// =============================================================================

describe('Theme - Edge Cases', () => {
  beforeEach(resetTheme)
  afterEach(resetTheme)

  test('resolveColor handles 0 as ANSI black', () => {
    const color = resolveColor(0)

    expect(isAnsiColor(color)).toBe(true)
    expect(color.g).toBe(0) // ANSI black index
  })

  test('resolveColor handles 255 as ANSI color', () => {
    const color = resolveColor(255)

    expect(isAnsiColor(color)).toBe(true)
    expect(color.g).toBe(255)
  })

  test('resolveColor handles 256+ as RGB', () => {
    const color = resolveColor(256)

    // 256 = 0x000100 = RGB(0, 1, 0)
    expect(color.r).toBe(0)
    expect(color.g).toBe(1)
    expect(color.b).toBe(0)
  })

  test('partial theme update preserves other properties', () => {
    setTheme('dracula')
    const draculaSecondary = theme.secondary

    // Partial update only changes primary
    setTheme({ primary: 0x123456 })

    expect(theme.primary).toBe(0x123456)
    expect(theme.secondary).toBe(draculaSecondary)
  })

  test('variantStyle handles all variant types', () => {
    const variants: Variant[] = [
      'default',
      'primary',
      'secondary',
      'tertiary',
      'accent',
      'success',
      'warning',
      'error',
      'info',
      'muted',
      'surface',
      'elevated',
      'ghost',
      'outline',
    ]

    for (const variant of variants) {
      const style = getVariantStyle(variant)
      expect(style).toBeDefined()
      expect(style.fg).toBeDefined()
      expect(style.bg).toBeDefined()
      expect(style.border).toBeDefined()
      expect(style.borderFocus).toBeDefined()
    }
  })

  test('theme count matches themes object', () => {
    const names = getThemeNames()
    const themeCount = Object.keys(themes).length

    expect(names.length).toBe(themeCount)
  })
})
