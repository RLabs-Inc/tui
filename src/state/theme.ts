/**
 * TUI Framework - Reactive Theme System
 *
 * Semantic colors with OKLCH support and terminal default fallbacks.
 * The theme is reactive - changing colors triggers re-render.
 *
 * Color values:
 * - null/undefined: Use terminal's default color (respects user's terminal theme)
 * - 0-15: ANSI color index (respects terminal's color palette)
 * - 16-255: Extended 256-color palette
 * - 0x100+: RGB color (0xRRGGBB format)
 * - string: CSS color parsed via parseColor()
 *
 * The DEFAULT theme uses terminal colors so the UI matches the user's terminal.
 * Custom themes (Dracula, Nord, etc.) override with specific RGB values.
 */

import { state, derived } from '@rlabs-inc/signals'
import type { RGBA } from '../types'
import { parseColor, TERMINAL_DEFAULT } from '../types/color'

// =============================================================================
// THEME COLOR TYPE
// =============================================================================

/**
 * Theme color can be:
 * - null: Terminal default
 * - number 0-15: ANSI color index
 * - number 16-255: Extended palette
 * - number > 255: RGB (0xRRGGBB)
 * - string: CSS color (hex, rgb, oklch, etc.)
 */
export type ThemeColor = null | number | string

// =============================================================================
// REACTIVE THEME STATE
// =============================================================================

/**
 * The theme object - all properties are reactive.
 * Changing any color triggers dependent deriveds/effects.
 *
 * Default values use ANSI indices to respect terminal color schemes.
 */
export const theme = state({
  // =========================================================================
  // MAIN PALETTE - Using ANSI colors that respect terminal theme
  // =========================================================================

  /** Primary brand color - ANSI bright blue (12) */
  primary: 12 as ThemeColor,

  /** Secondary accent - ANSI bright magenta (13) */
  secondary: 13 as ThemeColor,

  /** Tertiary color - ANSI bright cyan (14) */
  tertiary: 14 as ThemeColor,

  /** Accent for highlights - ANSI bright yellow (11) */
  accent: 11 as ThemeColor,

  // =========================================================================
  // SEMANTIC COLORS
  // =========================================================================

  /** Success/positive - ANSI green (2) */
  success: 2 as ThemeColor,

  /** Warning/caution - ANSI yellow (3) */
  warning: 3 as ThemeColor,

  /** Error/danger - ANSI red (1) */
  error: 1 as ThemeColor,

  /** Informational - ANSI cyan (6) */
  info: 6 as ThemeColor,

  // =========================================================================
  // TEXT COLORS
  // =========================================================================

  /** Primary text - terminal default */
  text: null as ThemeColor,

  /** Muted text - ANSI bright black/gray (8) */
  textMuted: 8 as ThemeColor,

  /** Dimmed text - same as muted */
  textDim: 8 as ThemeColor,

  /** Disabled text */
  textDisabled: 8 as ThemeColor,

  /** Bright/emphasized text - ANSI bright white (15) */
  textBright: 15 as ThemeColor,

  // =========================================================================
  // BACKGROUND COLORS
  // =========================================================================

  /** Primary background - terminal default */
  background: null as ThemeColor,

  /** Muted background - terminal default (let terminal handle it) */
  backgroundMuted: null as ThemeColor,

  /** Surface (cards, panels) - terminal default */
  surface: null as ThemeColor,

  /** Overlay (modals) - terminal default */
  overlay: null as ThemeColor,

  // =========================================================================
  // BORDER COLORS
  // =========================================================================

  /** Default border - ANSI white (7) */
  border: 7 as ThemeColor,

  /** Focused border - primary color */
  borderFocus: 12 as ThemeColor,

  // =========================================================================
  // METADATA
  // =========================================================================

  name: 'terminal',
  description: 'Uses terminal default colors',
})

// =============================================================================
// THEME PRESETS
// =============================================================================

export const themes = {
  /**
   * Terminal default - uses ANSI colors to respect user's terminal theme.
   * This should be the default for most applications.
   */
  terminal: {
    name: 'terminal',
    description: 'Uses terminal default colors',
    primary: 12, // bright blue
    secondary: 13, // bright magenta
    tertiary: 14, // bright cyan
    accent: 11, // bright yellow
    success: 2, // green
    warning: 3, // yellow
    error: 1, // red
    info: 6, // cyan
    text: null,
    textMuted: 8,
    textDim: 8,
    textDisabled: 8,
    textBright: 15,
    background: null,
    backgroundMuted: null,
    surface: null,
    overlay: null,
    border: 7,
    borderFocus: 12,
  },

  /**
   * Dracula - dark theme with vivid colors.
   * Uses OKLCH for perceptually uniform colors.
   */
  dracula: {
    name: 'dracula',
    description: 'Dracula dark theme',
    primary: 'oklch(0.75 0.15 300)', // purple
    secondary: 'oklch(0.75 0.2 340)', // pink
    tertiary: 'oklch(0.85 0.12 200)', // cyan
    accent: 'oklch(0.9 0.15 100)', // yellow
    success: 'oklch(0.8 0.2 140)', // green
    warning: 'oklch(0.9 0.15 100)', // yellow
    error: 'oklch(0.7 0.25 25)', // red
    info: 'oklch(0.85 0.12 200)', // cyan
    text: 0xf8f8f2,
    textMuted: 0x6272a4,
    textDim: 0x6272a4,
    textDisabled: 0x44475a,
    textBright: 0xffffff,
    background: 0x282a36,
    backgroundMuted: 0x343746,
    surface: 0x44475a,
    overlay: 0x21222c,
    border: 0x6272a4,
    borderFocus: 0xbd93f9,
  },

  /**
   * Nord - arctic, bluish colors.
   */
  nord: {
    name: 'nord',
    description: 'Nord arctic theme',
    primary: 'oklch(0.8 0.08 210)', // frost cyan
    secondary: 'oklch(0.7 0.08 230)', // frost blue
    tertiary: 'oklch(0.6 0.1 250)', // frost dark blue
    accent: 'oklch(0.7 0.12 50)', // aurora orange
    success: 'oklch(0.75 0.1 130)', // aurora green
    warning: 'oklch(0.85 0.1 90)', // aurora yellow
    error: 'oklch(0.65 0.15 20)', // aurora red
    info: 'oklch(0.8 0.08 210)', // frost cyan
    text: 0xd8dee9,
    textMuted: 0x4c566a,
    textDim: 0x4c566a,
    textDisabled: 0x3b4252,
    textBright: 0xeceff4,
    background: 0x2e3440,
    backgroundMuted: 0x3b4252,
    surface: 0x434c5e,
    overlay: 0x2e3440,
    border: 0x4c566a,
    borderFocus: 0x88c0d0,
  },

  /**
   * Monokai - vibrant syntax-highlighting inspired theme.
   */
  monokai: {
    name: 'monokai',
    description: 'Monokai vibrant theme',
    primary: 'oklch(0.65 0.25 350)', // pink
    secondary: 'oklch(0.85 0.25 125)', // green
    tertiary: 'oklch(0.7 0.2 300)', // purple
    accent: 'oklch(0.75 0.18 60)', // orange
    success: 'oklch(0.85 0.25 125)', // green
    warning: 'oklch(0.75 0.18 60)', // orange
    error: 'oklch(0.65 0.25 350)', // pink
    info: 'oklch(0.8 0.12 220)', // blue
    text: 0xf8f8f2,
    textMuted: 0x75715e,
    textDim: 0x75715e,
    textDisabled: 0x49483e,
    textBright: 0xffffff,
    background: 0x272822,
    backgroundMuted: 0x3e3d32,
    surface: 0x49483e,
    overlay: 0x1e1f1c,
    border: 0x75715e,
    borderFocus: 0xf92672,
  },

  /**
   * Solarized Dark - precision color scheme.
   */
  solarized: {
    name: 'solarized',
    description: 'Solarized Dark theme',
    primary: 0x268bd2, // blue
    secondary: 0x2aa198, // cyan
    tertiary: 0x859900, // green
    accent: 0xcb4b16, // orange
    success: 0x859900, // green
    warning: 0xb58900, // yellow
    error: 0xdc322f, // red
    info: 0x268bd2, // blue
    text: 0x839496, // base0
    textMuted: 0x586e75, // base01
    textDim: 0x586e75,
    textDisabled: 0x073642, // base02
    textBright: 0x93a1a1, // base1
    background: 0x002b36, // base03
    backgroundMuted: 0x073642, // base02
    surface: 0x073642,
    overlay: 0x002b36,
    border: 0x586e75,
    borderFocus: 0x268bd2,
  },
}

// =============================================================================
// THEME FUNCTIONS
// =============================================================================

/**
 * Apply a theme preset or custom theme object.
 */
export function setTheme(
  themeNameOrObject: keyof typeof themes | Partial<typeof theme>
): void {
  if (typeof themeNameOrObject === 'string') {
    const preset = themes[themeNameOrObject]
    if (!preset) {
      console.error(`Theme '${themeNameOrObject}' not found`)
      return
    }
    Object.assign(theme, preset)
  } else {
    Object.assign(theme, themeNameOrObject)
  }
}

/**
 * Get list of available theme names.
 */
export function getThemeNames(): string[] {
  return Object.keys(themes)
}

// =============================================================================
// COLOR RESOLUTION
// =============================================================================

/**
 * Resolve a theme color to RGBA.
 *
 * Handles:
 * - null → TERMINAL_DEFAULT
 * - 0-15 → ANSI color approximation
 * - 16-255 → Extended palette approximation
 * - > 255 → RGB (0xRRGGBB)
 * - string → CSS color parsing (including OKLCH)
 */
export function resolveColor(color: ThemeColor): RGBA {
  if (color === null || color === undefined) {
    return TERMINAL_DEFAULT
  }

  if (typeof color === 'string') {
    return parseColor(color)
  }

  // ANSI 16 colors (0-15)
  if (color >= 0 && color <= 15) {
    return ansi16ToRgba(color)
  }

  // Extended 256 palette (16-255)
  if (color >= 16 && color <= 255) {
    return ansi256ToRgba(color)
  }

  // RGB value (0xRRGGBB)
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
    a: 255,
  }
}

/**
 * Convert ANSI 16-color index to approximate RGBA.
 * These are approximations - actual colors depend on terminal theme.
 */
function ansi16ToRgba(ansi: number): RGBA {
  const colors: RGBA[] = [
    { r: 0, g: 0, b: 0, a: 255 }, // 0: black
    { r: 170, g: 0, b: 0, a: 255 }, // 1: red
    { r: 0, g: 170, b: 0, a: 255 }, // 2: green
    { r: 170, g: 85, b: 0, a: 255 }, // 3: yellow
    { r: 0, g: 0, b: 170, a: 255 }, // 4: blue
    { r: 170, g: 0, b: 170, a: 255 }, // 5: magenta
    { r: 0, g: 170, b: 170, a: 255 }, // 6: cyan
    { r: 170, g: 170, b: 170, a: 255 }, // 7: white
    { r: 85, g: 85, b: 85, a: 255 }, // 8: bright black
    { r: 255, g: 85, b: 85, a: 255 }, // 9: bright red
    { r: 85, g: 255, b: 85, a: 255 }, // 10: bright green
    { r: 255, g: 255, b: 85, a: 255 }, // 11: bright yellow
    { r: 85, g: 85, b: 255, a: 255 }, // 12: bright blue
    { r: 255, g: 85, b: 255, a: 255 }, // 13: bright magenta
    { r: 85, g: 255, b: 255, a: 255 }, // 14: bright cyan
    { r: 255, g: 255, b: 255, a: 255 }, // 15: bright white
  ]
  return colors[ansi] || TERMINAL_DEFAULT
}

/**
 * Convert ANSI 256-color index to RGBA.
 */
function ansi256ToRgba(index: number): RGBA {
  // 0-15: Standard ANSI colors
  if (index < 16) {
    return ansi16ToRgba(index)
  }

  // 16-231: 6x6x6 color cube
  if (index < 232) {
    const n = index - 16
    const b = n % 6
    const g = Math.floor(n / 6) % 6
    const r = Math.floor(n / 36)
    return {
      r: r === 0 ? 0 : 55 + r * 40,
      g: g === 0 ? 0 : 55 + g * 40,
      b: b === 0 ? 0 : 55 + b * 40,
      a: 255,
    }
  }

  // 232-255: Grayscale (24 shades)
  const gray = (index - 232) * 10 + 8
  return { r: gray, g: gray, b: gray, a: 255 }
}

// =============================================================================
// ANSI CODE GENERATION
// =============================================================================

/**
 * Get ANSI escape code for a theme color (foreground).
 */
export function toAnsiFg(color: ThemeColor): string {
  if (color === null || color === undefined) {
    return '\x1b[39m' // Reset to terminal default
  }

  if (typeof color === 'string') {
    const rgba = parseColor(color)
    if (rgba.r === -1) return '\x1b[39m' // TERMINAL_DEFAULT
    return `\x1b[38;2;${rgba.r};${rgba.g};${rgba.b}m`
  }

  // ANSI 16 colors
  if (color >= 0 && color <= 7) {
    return `\x1b[${30 + color}m`
  }
  if (color >= 8 && color <= 15) {
    return `\x1b[${90 + (color - 8)}m`
  }

  // ANSI 256 colors
  if (color >= 16 && color <= 255) {
    return `\x1b[38;5;${color}m`
  }

  // RGB (0xRRGGBB)
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return `\x1b[38;2;${r};${g};${b}m`
}

/**
 * Get ANSI escape code for a theme color (background).
 */
export function toAnsiBg(color: ThemeColor): string {
  if (color === null || color === undefined) {
    return '\x1b[49m' // Reset to terminal default
  }

  if (typeof color === 'string') {
    const rgba = parseColor(color)
    if (rgba.r === -1) return '\x1b[49m' // TERMINAL_DEFAULT
    return `\x1b[48;2;${rgba.r};${rgba.g};${rgba.b}m`
  }

  // ANSI 16 colors
  if (color >= 0 && color <= 7) {
    return `\x1b[${40 + color}m`
  }
  if (color >= 8 && color <= 15) {
    return `\x1b[${100 + (color - 8)}m`
  }

  // ANSI 256 colors
  if (color >= 16 && color <= 255) {
    return `\x1b[48;5;${color}m`
  }

  // RGB (0xRRGGBB)
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return `\x1b[48;2;${r};${g};${b}m`
}

// =============================================================================
// RESOLVED THEME (derived)
// =============================================================================

/**
 * Get current theme colors resolved to RGBA.
 * This is a derived that updates when theme changes.
 * Use this when you need RGBA values (e.g., for blending).
 */
export const resolvedTheme = derived(() => ({
  primary: resolveColor(theme.primary),
  secondary: resolveColor(theme.secondary),
  tertiary: resolveColor(theme.tertiary),
  accent: resolveColor(theme.accent),
  success: resolveColor(theme.success),
  warning: resolveColor(theme.warning),
  error: resolveColor(theme.error),
  info: resolveColor(theme.info),
  text: resolveColor(theme.text),
  textMuted: resolveColor(theme.textMuted),
  textDim: resolveColor(theme.textDim),
  textDisabled: resolveColor(theme.textDisabled),
  textBright: resolveColor(theme.textBright),
  background: resolveColor(theme.background),
  backgroundMuted: resolveColor(theme.backgroundMuted),
  surface: resolveColor(theme.surface),
  overlay: resolveColor(theme.overlay),
  border: resolveColor(theme.border),
  borderFocus: resolveColor(theme.borderFocus),
}))
