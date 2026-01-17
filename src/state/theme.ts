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
import {
  parseColor,
  TERMINAL_DEFAULT,
  ansiColor,
  isAnsiColor,
  adjustLightnessForContrast,
} from '../types/color'

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

  /**
   * Catppuccin Mocha - soothing pastel theme (most popular variant).
   */
  catppuccin: {
    name: 'catppuccin',
    description: 'Catppuccin Mocha theme',
    primary: 0x89b4fa, // blue
    secondary: 0xcba6f7, // mauve
    tertiary: 0x94e2d5, // teal
    accent: 0xf9e2af, // yellow
    success: 0xa6e3a1, // green
    warning: 0xf9e2af, // yellow
    error: 0xf38ba8, // red
    info: 0x89dceb, // sky
    text: 0xcdd6f4, // text
    textMuted: 0x6c7086, // overlay0
    textDim: 0x585b70, // surface2
    textDisabled: 0x45475a, // surface0
    textBright: 0xffffff,
    background: 0x1e1e2e, // base
    backgroundMuted: 0x313244, // surface0
    surface: 0x45475a, // surface1
    overlay: 0x181825, // mantle
    border: 0x6c7086, // overlay0
    borderFocus: 0x89b4fa, // blue
  },

  /**
   * Gruvbox Dark - retro groove color scheme.
   */
  gruvbox: {
    name: 'gruvbox',
    description: 'Gruvbox Dark theme',
    primary: 0x458588, // blue
    secondary: 0xb16286, // purple
    tertiary: 0x689d6a, // aqua
    accent: 0xd79921, // yellow
    success: 0x98971a, // green
    warning: 0xd79921, // yellow
    error: 0xcc241d, // red
    info: 0x458588, // blue
    text: 0xebdbb2, // fg
    textMuted: 0xa89984, // gray
    textDim: 0x928374, // gray
    textDisabled: 0x665c54, // bg3
    textBright: 0xfbf1c7, // fg0
    background: 0x282828, // bg
    backgroundMuted: 0x3c3836, // bg1
    surface: 0x504945, // bg2
    overlay: 0x1d2021, // bg0_h
    border: 0x665c54, // bg3
    borderFocus: 0xfe8019, // orange
  },

  /**
   * Tokyo Night - clean, dark theme inspired by Tokyo city lights.
   */
  tokyoNight: {
    name: 'tokyoNight',
    description: 'Tokyo Night theme',
    primary: 0x7aa2f7, // blue
    secondary: 0xbb9af7, // purple
    tertiary: 0x7dcfff, // cyan
    accent: 0xe0af68, // yellow
    success: 0x9ece6a, // green
    warning: 0xe0af68, // yellow
    error: 0xf7768e, // red
    info: 0x7dcfff, // cyan
    text: 0xa9b1d6, // fg
    textMuted: 0x565f89, // comment
    textDim: 0x414868, // dark3
    textDisabled: 0x3b4261, // dark2
    textBright: 0xc0caf5, // fg_bright
    background: 0x1a1b26, // bg
    backgroundMuted: 0x24283b, // bg_highlight
    surface: 0x414868, // dark3
    overlay: 0x16161e, // bg_dark
    border: 0x414868, // dark3
    borderFocus: 0x7aa2f7, // blue
  },

  /**
   * One Dark - Atom's iconic dark theme.
   */
  oneDark: {
    name: 'oneDark',
    description: 'One Dark (Atom) theme',
    primary: 0x61afef, // blue
    secondary: 0xc678dd, // purple
    tertiary: 0x56b6c2, // cyan
    accent: 0xe5c07b, // yellow
    success: 0x98c379, // green
    warning: 0xe5c07b, // yellow
    error: 0xe06c75, // red
    info: 0x56b6c2, // cyan
    text: 0xabb2bf, // fg
    textMuted: 0x5c6370, // comment
    textDim: 0x4b5263, // gutter
    textDisabled: 0x3e4451, // guide
    textBright: 0xffffff,
    background: 0x282c34, // bg
    backgroundMuted: 0x21252b, // bg_dark
    surface: 0x3e4451, // guide
    overlay: 0x1e2127, // bg_darker
    border: 0x3e4451, // guide
    borderFocus: 0x61afef, // blue
  },

  /**
   * Rosé Pine - all natural pine, faux fur and a bit of soho vibes.
   */
  rosePine: {
    name: 'rosePine',
    description: 'Rosé Pine theme',
    primary: 0x9ccfd8, // foam
    secondary: 0xc4a7e7, // iris
    tertiary: 0x31748f, // pine
    accent: 0xf6c177, // gold
    success: 0x31748f, // pine
    warning: 0xf6c177, // gold
    error: 0xeb6f92, // love
    info: 0x9ccfd8, // foam
    text: 0xe0def4, // text
    textMuted: 0x908caa, // subtle
    textDim: 0x6e6a86, // muted
    textDisabled: 0x524f67, // highlight_med
    textBright: 0xffffff,
    background: 0x191724, // base
    backgroundMuted: 0x1f1d2e, // surface
    surface: 0x26233a, // overlay
    overlay: 0x16141f, // nc
    border: 0x524f67, // highlight_med
    borderFocus: 0xebbcba, // rose
  },

  /**
   * Kanagawa - theme inspired by Katsushika Hokusai's famous wave painting.
   */
  kanagawa: {
    name: 'kanagawa',
    description: 'Kanagawa wave theme',
    primary: 0x7e9cd8, // crystalBlue
    secondary: 0x957fb8, // oniViolet
    tertiary: 0x7aa89f, // waveAqua2
    accent: 0xdca561, // carpYellow
    success: 0x98bb6c, // springGreen
    warning: 0xdca561, // carpYellow
    error: 0xc34043, // autumnRed
    info: 0x7fb4ca, // springBlue
    text: 0xdcd7ba, // fujiWhite
    textMuted: 0x727169, // fujiGray
    textDim: 0x54546d, // sumiInk4
    textDisabled: 0x363646, // sumiInk3
    textBright: 0xffffff,
    background: 0x1f1f28, // sumiInk1
    backgroundMuted: 0x2a2a37, // sumiInk2
    surface: 0x363646, // sumiInk3
    overlay: 0x16161d, // sumiInk0
    border: 0x54546d, // sumiInk4
    borderFocus: 0x7e9cd8, // crystalBlue
  },

  /**
   * Everforest - comfortable green-tinted theme.
   */
  everforest: {
    name: 'everforest',
    description: 'Everforest theme',
    primary: 0x7fbbb3, // aqua
    secondary: 0xd699b6, // purple
    tertiary: 0x83c092, // green
    accent: 0xdbbc7f, // yellow
    success: 0xa7c080, // green
    warning: 0xdbbc7f, // yellow
    error: 0xe67e80, // red
    info: 0x7fbbb3, // aqua
    text: 0xd3c6aa, // fg
    textMuted: 0x9da9a0, // grey1
    textDim: 0x859289, // grey0
    textDisabled: 0x5c6a72, // bg5
    textBright: 0xfdf6e3,
    background: 0x2d353b, // bg_dim
    backgroundMuted: 0x343f44, // bg1
    surface: 0x3d484d, // bg3
    overlay: 0x272e33, // bg0
    border: 0x5c6a72, // bg5
    borderFocus: 0xa7c080, // green
  },

  /**
   * Night Owl - designed with accessibility in mind.
   */
  nightOwl: {
    name: 'nightOwl',
    description: 'Night Owl theme',
    primary: 0x82aaff, // blue
    secondary: 0xc792ea, // purple
    tertiary: 0x7fdbca, // cyan
    accent: 0xffcb6b, // yellow
    success: 0xaddb67, // green
    warning: 0xffcb6b, // yellow
    error: 0xef5350, // red
    info: 0x7fdbca, // cyan
    text: 0xd6deeb, // fg
    textMuted: 0x637777, // comment
    textDim: 0x5f7e97, // lineHighlight
    textDisabled: 0x3b4252, // guide
    textBright: 0xffffff,
    background: 0x011627, // bg
    backgroundMuted: 0x0b2942, // bg_light
    surface: 0x1d3b53, // selection
    overlay: 0x010e1a, // bg_dark
    border: 0x5f7e97, // lineHighlight
    borderFocus: 0x82aaff, // blue
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
 * - 0-255 → ANSI color marker (respects terminal palette!)
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

  // ANSI colors (0-255) - return marker so renderer uses terminal's palette!
  if (color >= 0 && color <= 255) {
    return ansiColor(color)
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

// =============================================================================
// EASY THEME ACCESS - `t.primary` instead of `resolvedTheme.value.primary`
// =============================================================================

/**
 * Easy access to theme colors as reactive deriveds.
 *
 * Usage:
 * ```ts
 * import { t } from 'tui/theme'
 *
 * box({
 *   borderColor: t.primary,  // Reactive! Updates when theme changes
 *   fg: t.text,
 *   bg: t.surface,
 * })
 * ```
 *
 * Each property is a derived that resolves the theme color to RGBA.
 * Pass directly to component props - bind() handles the rest.
 */
export const t = {
  // Main palette
  primary: derived(() => resolveColor(theme.primary)),
  secondary: derived(() => resolveColor(theme.secondary)),
  tertiary: derived(() => resolveColor(theme.tertiary)),
  accent: derived(() => resolveColor(theme.accent)),

  // Semantic
  success: derived(() => resolveColor(theme.success)),
  warning: derived(() => resolveColor(theme.warning)),
  error: derived(() => resolveColor(theme.error)),
  info: derived(() => resolveColor(theme.info)),

  // Text
  text: derived(() => resolveColor(theme.text)),
  textMuted: derived(() => resolveColor(theme.textMuted)),
  textDim: derived(() => resolveColor(theme.textDim)),
  textDisabled: derived(() => resolveColor(theme.textDisabled)),
  textBright: derived(() => resolveColor(theme.textBright)),

  // Backgrounds
  bg: derived(() => resolveColor(theme.background)),
  bgMuted: derived(() => resolveColor(theme.backgroundMuted)),
  surface: derived(() => resolveColor(theme.surface)),
  overlay: derived(() => resolveColor(theme.overlay)),

  // Borders
  border: derived(() => resolveColor(theme.border)),
  borderFocus: derived(() => resolveColor(theme.borderFocus)),
}

// =============================================================================
// VARIANT DEFINITIONS
// =============================================================================

/**
 * Variant style definitions.
 * Each variant defines colors for different component states.
 */
export type Variant =
  | 'default'
  | 'primary' | 'secondary' | 'tertiary' | 'accent'
  | 'success' | 'warning' | 'error' | 'info'
  | 'muted' | 'surface' | 'elevated'
  | 'ghost' | 'outline'

export interface VariantStyle {
  fg: RGBA
  bg: RGBA
  border: RGBA
  borderFocus: RGBA
}

/**
 * Get a foreground color with proper contrast against the background.
 *
 * For ANSI colors (terminal theme): Returns the desired fg as-is, trusting
 * the standard ANSI color pairings and terminal's contrast handling.
 *
 * For RGB colors (custom themes): Adjusts the fg lightness using OKLCH
 * to ensure WCAG AA contrast (4.5:1 ratio).
 */
function getContrastFg(desiredFg: RGBA, bg: RGBA): RGBA {
  // If background is ANSI, trust terminal's color handling
  if (isAnsiColor(bg)) {
    return desiredFg
  }

  // If foreground is ANSI but background is RGB, also trust it
  // (mixed case, probably intentional)
  if (isAnsiColor(desiredFg)) {
    return desiredFg
  }

  // Both are RGB - ensure proper contrast using OKLCH
  return adjustLightnessForContrast(desiredFg, bg, 4.5)
}

/**
 * Get variant styles resolved to RGBA.
 * Returns colors based on variant name and current theme.
 *
 * For terminal theme (ANSI colors): Uses standard ANSI pairings.
 * For custom themes (RGB colors): Calculates proper OKLCH contrast.
 */
export function getVariantStyle(variant: Variant): VariantStyle {
  const resolved = resolvedTheme.value

  switch (variant) {
    case 'primary':
      return {
        fg: getContrastFg(resolved.textBright, resolved.primary),
        bg: resolved.primary,
        border: resolved.primary,
        borderFocus: resolved.accent,
      }
    case 'secondary':
      return {
        fg: getContrastFg(resolved.textBright, resolved.secondary),
        bg: resolved.secondary,
        border: resolved.secondary,
        borderFocus: resolved.accent,
      }
    case 'tertiary':
      return {
        fg: getContrastFg(resolved.textBright, resolved.tertiary),
        bg: resolved.tertiary,
        border: resolved.tertiary,
        borderFocus: resolved.accent,
      }
    case 'accent':
      return {
        fg: getContrastFg({ r: 0, g: 0, b: 0, a: 255 }, resolved.accent),
        bg: resolved.accent,
        border: resolved.accent,
        borderFocus: resolved.primary,
      }
    case 'success':
      return {
        fg: getContrastFg(resolved.textBright, resolved.success),
        bg: resolved.success,
        border: resolved.success,
        borderFocus: resolved.accent,
      }
    case 'warning':
      return {
        fg: getContrastFg({ r: 0, g: 0, b: 0, a: 255 }, resolved.warning),
        bg: resolved.warning,
        border: resolved.warning,
        borderFocus: resolved.accent,
      }
    case 'error':
      return {
        fg: getContrastFg(resolved.textBright, resolved.error),
        bg: resolved.error,
        border: resolved.error,
        borderFocus: resolved.accent,
      }
    case 'info':
      return {
        fg: getContrastFg(resolved.textBright, resolved.info),
        bg: resolved.info,
        border: resolved.info,
        borderFocus: resolved.accent,
      }
    case 'muted':
      return {
        fg: resolved.textMuted,
        bg: resolved.surface,
        border: resolved.border,
        borderFocus: resolved.borderFocus,
      }
    case 'surface':
      return {
        fg: resolved.text,
        bg: resolved.surface,
        border: resolved.border,
        borderFocus: resolved.borderFocus,
      }
    case 'elevated':
      return {
        fg: getContrastFg(resolved.textBright, resolved.surface),
        bg: resolved.surface,
        border: resolved.primary,
        borderFocus: resolved.borderFocus,
      }
    case 'ghost':
      return {
        fg: resolved.text,
        bg: TERMINAL_DEFAULT,
        border: TERMINAL_DEFAULT,
        borderFocus: resolved.borderFocus,
      }
    case 'outline':
      return {
        fg: resolved.primary,
        bg: TERMINAL_DEFAULT,
        border: resolved.primary,
        borderFocus: resolved.borderFocus,
      }
    case 'default':
    default:
      return {
        fg: resolved.text,
        bg: resolved.background,
        border: resolved.border,
        borderFocus: resolved.borderFocus,
      }
  }
}

/**
 * Reactive variant style derived.
 * Use when you need styles to update with theme changes.
 */
export function variantStyle(variant: Variant) {
  return derived(() => getVariantStyle(variant))
}
