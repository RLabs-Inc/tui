/**
 * TUI Framework - Color Utilities
 *
 * All color parsing, conversion, and manipulation.
 * Uses Bun.color() for parsing CSS colors and ANSI conversion.
 * Includes OKLCH support for perceptually uniform color manipulation.
 */

import type { RGBA, CellAttrs } from './index'
import { Attr } from './index'

// =============================================================================
// Color Presets
// =============================================================================

export const Colors = {
  BLACK: { r: 0, g: 0, b: 0, a: 255 } as RGBA,
  WHITE: { r: 255, g: 255, b: 255, a: 255 } as RGBA,
  RED: { r: 255, g: 0, b: 0, a: 255 } as RGBA,
  GREEN: { r: 0, g: 255, b: 0, a: 255 } as RGBA,
  BLUE: { r: 0, g: 0, b: 255, a: 255 } as RGBA,
  YELLOW: { r: 255, g: 255, b: 0, a: 255 } as RGBA,
  CYAN: { r: 0, g: 255, b: 255, a: 255 } as RGBA,
  MAGENTA: { r: 255, g: 0, b: 255, a: 255 } as RGBA,
  GRAY: { r: 128, g: 128, b: 128, a: 255 } as RGBA,
  TRANSPARENT: { r: 0, g: 0, b: 0, a: 0 } as RGBA,
} as const

/**
 * Terminal default color marker.
 * When used, the renderer emits reset code instead of color.
 * Uses a: 255 so it's treated as "visible" (not transparent).
 * The r: -1 marker is how we identify it as "use terminal default".
 */
export const TERMINAL_DEFAULT: RGBA = { r: -1, g: -1, b: -1, a: 255 }

export function isTerminalDefault(color: RGBA): boolean {
  return color.r === -1 && color.g === -1 && color.b === -1
}

/**
 * ANSI color marker.
 * When r = -2, the `g` field contains the ANSI color index (0-255).
 * The renderer will output proper ANSI escape codes that respect
 * the user's terminal color palette.
 *
 * - 0-7: Standard colors (black, red, green, yellow, blue, magenta, cyan, white)
 * - 8-15: Bright colors
 * - 16-231: 6x6x6 color cube
 * - 232-255: Grayscale
 */
export function ansiColor(index: number): RGBA {
  return { r: -2, g: index, b: 0, a: 255 }
}

export function isAnsiColor(color: RGBA): boolean {
  return color.r === -2
}

export function getAnsiIndex(color: RGBA): number {
  return color.g
}

// =============================================================================
// Color Creation
// =============================================================================

/** Create an RGBA color */
export function rgba(r: number, g: number, b: number, a: number = 255): RGBA {
  return { r, g, b, a }
}

// =============================================================================
// Color Parsing - Bun.color() integration
// =============================================================================

/**
 * Parse any color input to RGBA.
 * Supports: hex, rgb(), rgba(), hsl(), CSS names, oklch(), etc.
 */
export function parseColor(input: string | number | RGBA): RGBA {
  // Already RGBA
  if (typeof input === 'object' && 'r' in input) {
    return { r: input.r, g: input.g, b: input.b, a: input.a ?? 255 }
  }

  // Integer color (0xRRGGBB)
  if (typeof input === 'number') {
    return {
      r: (input >> 16) & 0xff,
      g: (input >> 8) & 0xff,
      b: input & 0xff,
      a: 255,
    }
  }

  const trimmed = input.trim().toLowerCase()

  // Handle special values
  if (!trimmed || trimmed === 'transparent') {
    return Colors.TRANSPARENT
  }
  if (trimmed === 'inherit' || trimmed === 'initial' || trimmed === 'currentcolor') {
    return TERMINAL_DEFAULT
  }

  // OKLCH - Bun.color() doesn't support yet, parse manually
  if (trimmed.startsWith('oklch(')) {
    return parseOklch(trimmed) ?? Colors.MAGENTA
  }

  // Use Bun.color() for everything else
  const result = Bun.color(input, '{rgba}')
  if (result) {
    return {
      r: Math.round(result.r),
      g: Math.round(result.g),
      b: Math.round(result.b),
      a: Math.round((result.a ?? 1) * 255),
    }
  }

  // Fallback to magenta (visible error indicator)
  return Colors.MAGENTA
}

// =============================================================================
// OKLCH Support
// =============================================================================

/**
 * Parse OKLCH color string.
 * Format: oklch(L C H) or oklch(L C H / A)
 * - L: Lightness 0-1 (or 0%-100%)
 * - C: Chroma 0-0.4 roughly
 * - H: Hue 0-360 degrees
 */
function parseOklch(value: string): RGBA | null {
  const match = value.match(/^oklch\s*\(\s*([^)]+)\s*\)$/)
  if (!match) return null

  const parts = match[1]!.split(/[\s/]+/).filter(Boolean)
  if (parts.length < 3) return null

  // Parse L (lightness)
  let l = parseFloat(parts[0]!)
  if (parts[0]!.endsWith('%')) {
    l = parseFloat(parts[0]!) / 100
  }

  // Parse C (chroma)
  const c = parseFloat(parts[1]!)

  // Parse H (hue)
  let h = parseFloat(parts[2]!)
  if (parts[2]!.endsWith('rad')) {
    h = parseFloat(parts[2]!) * (180 / Math.PI)
  } else if (parts[2]!.endsWith('turn')) {
    h = parseFloat(parts[2]!) * 360
  }

  // Parse A (alpha) if present
  let a = 255
  if (parts.length > 3) {
    const alphaValue = parseFloat(parts[3]!)
    a = parts[3]!.endsWith('%')
      ? Math.round((alphaValue / 100) * 255)
      : Math.round(alphaValue * 255)
  }

  if (isNaN(l) || isNaN(c) || isNaN(h)) return null

  const rgb = oklchToRgb(l, c, h)
  return { ...rgb, a }
}

/**
 * Create an RGBA color from OKLCH values.
 * Perfect for perceptually uniform gradients!
 *
 * @param l Lightness (0-1)
 * @param c Chroma (0-0.4 roughly, 0.15 is good for vivid colors)
 * @param h Hue (0-360 degrees)
 * @param a Alpha (0-255, default 255)
 *
 * @example
 * // Beautiful rainbow gradient
 * for (let x = 0; x < width; x++) {
 *   const hue = (x / width) * 360;
 *   const color = oklch(0.7, 0.15, hue);
 *   // Use color...
 * }
 */
export function oklch(l: number, c: number, h: number, a: number = 255): RGBA {
  const rgb = oklchToRgb(l, c, h)
  return { ...rgb, a }
}

/**
 * Convert OKLCH to RGB.
 * Based on CSS Color Level 4 specification.
 */
function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  // OKLCH to OKLab
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  // OKLab to linear sRGB via LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b

  const lCubed = l_ * l_ * l_
  const mCubed = m_ * m_ * m_
  const sCubed = s_ * s_ * s_

  const rLinear = +4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.7076147010 * sCubed

  // Linear sRGB to sRGB (gamma correction)
  const toSrgb = (x: number) => {
    if (x <= 0.0031308) return x * 12.92
    return 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  }

  return {
    r: Math.round(Math.max(0, Math.min(255, toSrgb(rLinear) * 255))),
    g: Math.round(Math.max(0, Math.min(255, toSrgb(gLinear) * 255))),
    b: Math.round(Math.max(0, Math.min(255, toSrgb(bLinear) * 255))),
  }
}

/**
 * Convert RGB to OKLCH.
 * Inverse of oklchToRgb. Used for color manipulation while preserving perceptual uniformity.
 *
 * @returns { l: lightness (0-1), c: chroma (0-~0.4), h: hue (0-360) }
 */
export function rgbToOklch(color: RGBA): { l: number; c: number; h: number } {
  // sRGB to linear sRGB (inverse gamma)
  const toLinear = (x: number) => {
    const s = x / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }

  const rLinear = toLinear(color.r)
  const gLinear = toLinear(color.g)
  const bLinear = toLinear(color.b)

  // Linear sRGB to LMS (cone responses)
  const l = 0.4122214708 * rLinear + 0.5363325363 * gLinear + 0.0514459929 * bLinear
  const m = 0.2119034982 * rLinear + 0.6806995451 * gLinear + 0.1073969566 * bLinear
  const s = 0.0883024619 * rLinear + 0.2817188376 * gLinear + 0.6299787005 * bLinear

  // LMS to OKLab (cube root for perceptual linearity)
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  // OKLab to OKLCH (polar coordinates)
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360

  return { l: L, c, h }
}

/**
 * Adjust OKLCH lightness to achieve minimum contrast ratio against a background.
 * Preserves hue and chroma while adjusting only lightness.
 *
 * @param fg Foreground color to adjust
 * @param bg Background color
 * @param minRatio Minimum contrast ratio (WCAG AA = 4.5, AAA = 7)
 * @returns Adjusted foreground color as RGBA
 */
export function adjustLightnessForContrast(fg: RGBA, bg: RGBA, minRatio: number = 4.5): RGBA {
  const bgOklch = rgbToOklch(bg)
  let fgOklch = rgbToOklch(fg)

  // Calculate current contrast
  const getContrast = (fgL: number): number => {
    const fgRgb = oklchToRgb(fgL, fgOklch.c, fgOklch.h)
    const fgRgba = { ...fgRgb, a: 255 }
    return contrastRatio(fgRgba, bg)
  }

  let currentRatio = getContrast(fgOklch.l)

  // If already sufficient, return original
  if (currentRatio >= minRatio) {
    return fg
  }

  // Determine direction: if bg is dark, go lighter; if bg is light, go darker
  const direction = bgOklch.l > 0.5 ? -1 : 1
  let newL = fgOklch.l

  // Binary search for the right lightness
  let step = 0.25
  for (let i = 0; i < 20 && currentRatio < minRatio; i++) {
    newL = Math.max(0, Math.min(1, newL + direction * step))
    currentRatio = getContrast(newL)

    // If we overshot, reverse and halve step
    if (currentRatio >= minRatio) {
      // Found a valid lightness, but let's fine-tune to not over-adjust
      const testL = newL - direction * step * 0.5
      if (getContrast(testL) >= minRatio) {
        newL = testL
        currentRatio = getContrast(newL)
      }
    }
    step *= 0.6
  }

  // Convert back to RGB
  const adjusted = oklchToRgb(newL, fgOklch.c, fgOklch.h)
  return { ...adjusted, a: fg.a }
}

/**
 * Calculate contrast ratio between two colors (WCAG formula).
 */
function contrastRatio(fg: RGBA, bg: RGBA): number {
  const lumFg = relativeLuminance(fg)
  const lumBg = relativeLuminance(bg)
  const lighter = Math.max(lumFg, lumBg)
  const darker = Math.min(lumFg, lumBg)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Calculate relative luminance per WCAG 2.1.
 */
function relativeLuminance(color: RGBA): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b)
}

// =============================================================================
// Color Comparison
// =============================================================================

/** Check if two colors are equal */
export function rgbaEqual(a: RGBA, b: RGBA): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a
}

// =============================================================================
// Color Blending
// =============================================================================

/** Blend src over dst (standard alpha compositing) */
export function rgbaBlend(src: RGBA, dst: RGBA): RGBA {
  if (src.a === 255) return src
  if (src.a === 0) return dst

  const srcA = src.a / 255
  const dstA = dst.a / 255
  const outA = srcA + dstA * (1 - srcA)

  if (outA === 0) return Colors.TRANSPARENT

  return {
    r: Math.round((src.r * srcA + dst.r * dstA * (1 - srcA)) / outA),
    g: Math.round((src.g * srcA + dst.g * dstA * (1 - srcA)) / outA),
    b: Math.round((src.b * srcA + dst.b * dstA * (1 - srcA)) / outA),
    a: Math.round(outA * 255),
  }
}

/** Linear interpolation between two colors */
export function rgbaLerp(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: Math.round(a.a + (b.a - a.a) * t),
  }
}

// =============================================================================
// Color Modifiers
// =============================================================================

/** Dim a color (reduce brightness) */
export function dim(color: RGBA, factor: number = 0.5): RGBA {
  if (isTerminalDefault(color)) {
    return { r: 128, g: 128, b: 128, a: 255 }
  }
  return {
    r: Math.floor(color.r * factor),
    g: Math.floor(color.g * factor),
    b: Math.floor(color.b * factor),
    a: color.a,
  }
}

/** Brighten a color (increase brightness) */
export function brighten(color: RGBA, factor: number = 1.3): RGBA {
  if (isTerminalDefault(color)) {
    return Colors.WHITE
  }
  return {
    r: Math.min(255, Math.floor(color.r * factor)),
    g: Math.min(255, Math.floor(color.g * factor)),
    b: Math.min(255, Math.floor(color.b * factor)),
    a: color.a,
  }
}

// =============================================================================
// ANSI Escape Codes
// =============================================================================

/** ANSI escape code for foreground color */
export function toAnsiFg(color: RGBA): string {
  if (isTerminalDefault(color)) {
    return '\x1b[39m' // Reset to default foreground
  }
  if (isAnsiColor(color)) {
    const index = getAnsiIndex(color)
    // Standard colors 0-7
    if (index >= 0 && index <= 7) {
      return `\x1b[${30 + index}m`
    }
    // Bright colors 8-15
    if (index >= 8 && index <= 15) {
      return `\x1b[${90 + (index - 8)}m`
    }
    // Extended 256-color palette
    return `\x1b[38;5;${index}m`
  }
  return `\x1b[38;2;${color.r};${color.g};${color.b}m`
}

/** ANSI escape code for background color */
export function toAnsiBg(color: RGBA): string {
  if (isTerminalDefault(color)) {
    return '\x1b[49m' // Reset to default background
  }
  if (isAnsiColor(color)) {
    const index = getAnsiIndex(color)
    // Standard colors 0-7
    if (index >= 0 && index <= 7) {
      return `\x1b[${40 + index}m`
    }
    // Bright colors 8-15
    if (index >= 8 && index <= 15) {
      return `\x1b[${100 + (index - 8)}m`
    }
    // Extended 256-color palette
    return `\x1b[48;5;${index}m`
  }
  return `\x1b[48;2;${color.r};${color.g};${color.b}m`
}

/** ANSI escape codes for cell attributes */
export function toAnsiAttrs(attrs: CellAttrs): string {
  if (attrs === Attr.NONE) return ''

  const codes: number[] = []
  if (attrs & Attr.BOLD) codes.push(1)
  if (attrs & Attr.DIM) codes.push(2)
  if (attrs & Attr.ITALIC) codes.push(3)
  if (attrs & Attr.UNDERLINE) codes.push(4)
  if (attrs & Attr.BLINK) codes.push(5)
  if (attrs & Attr.INVERSE) codes.push(7)
  if (attrs & Attr.HIDDEN) codes.push(8)
  if (attrs & Attr.STRIKETHROUGH) codes.push(9)

  return codes.length > 0 ? `\x1b[${codes.join(';')}m` : ''
}

/** Reset all ANSI attributes */
export const ANSI_RESET = '\x1b[0m'

// =============================================================================
// Character Width (using Bun.stringWidth)
// =============================================================================

/**
 * Get display width of a string in terminal cells.
 * Handles emoji, CJK, combining marks correctly.
 */
export function stringWidth(str: string): number {
  return Bun.stringWidth(str)
}

/** Get display width of a single character */
export function charWidth(char: string | number): number {
  const str = typeof char === 'number' ? String.fromCodePoint(char) : char
  return Bun.stringWidth(str)
}

/** ANSI escape code pattern */
const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g

/** Strip ANSI escape codes from a string */
export function stripAnsi(str: string): string {
  // Use Bun's native if available, otherwise fallback to regex
  if (typeof Bun !== 'undefined' && typeof (Bun as any).stripANSI === 'function') {
    return (Bun as any).stripANSI(str)
  }
  return str.replace(ANSI_PATTERN, '')
}
