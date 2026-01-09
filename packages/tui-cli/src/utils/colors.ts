/**
 * Terminal colors using Bun's built-in color API
 *
 * - Automatically respects NO_COLOR environment variable
 * - Automatically detects terminal color support (16, 256, or 16m colors)
 * - Uses semantic colors that work with any terminal theme
 */

const RESET = '\x1b[0m'

// Helper to wrap text with ANSI color
function colorize(text: string, color: string): string {
  const ansi = Bun.color(color, 'ansi')
  if (!ansi) return text
  return `${ansi}${text}${RESET}`
}

// Style helpers
function bold(text: string): string {
  return `\x1b[1m${text}${RESET}`
}

function dim(text: string): string {
  return `\x1b[2m${text}${RESET}`
}

function italic(text: string): string {
  return `\x1b[3m${text}${RESET}`
}

function underline(text: string): string {
  return `\x1b[4m${text}${RESET}`
}

// Semantic color helpers that work with any terminal theme
export const c = {
  // Emphasis
  bold,
  dim,
  italic,
  underline,

  // Semantic colors using Bun.color for automatic terminal detection
  success: (s: string) => colorize(s, '#22c55e'),  // Green
  error: (s: string) => colorize(s, '#ef4444'),    // Red
  warning: (s: string) => colorize(s, '#eab308'),  // Yellow
  info: (s: string) => colorize(s, '#06b6d4'),     // Cyan
  accent: (s: string) => colorize(s, '#a855f7'),   // Purple

  // Muted text (gray)
  muted: (s: string) => colorize(s, '#6b7280'),

  // Bright variants
  brightGreen: (s: string) => colorize(s, '#4ade80'),
  brightCyan: (s: string) => colorize(s, '#22d3ee'),
  brightYellow: (s: string) => colorize(s, '#facc15'),
  brightMagenta: (s: string) => colorize(s, '#c084fc'),

  // Custom color
  color: (s: string, color: string) => colorize(s, color),
}

// Symbols that work in most terminals
export const symbols = {
  check: '\u2714',      // ✔
  cross: '\u2718',      // ✘
  arrow: '\u276F',      // ❯
  bullet: '\u25CF',     // ●
  line: '\u2500',       // ─
  corner: '\u2514',     // └
  tee: '\u251C',        // ├
  vertical: '\u2502',   // │
  star: '\u2605',       // ★
  sparkle: '\u2728',    // ✨
}

// Strip ANSI codes for length calculation
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

// Box drawing for beautiful output
export function box(content: string[], options: { title?: string; padding?: number } = {}): string {
  const padding = options.padding ?? 1
  const maxWidth = Math.max(...content.map(l => stripAnsi(l).length), stripAnsi(options.title ?? '').length)
  const width = maxWidth + padding * 2

  const horizontal = symbols.line.repeat(width + 2)
  const empty = `${symbols.vertical}${' '.repeat(width + 2)}${symbols.vertical}`
  const pad = ' '.repeat(padding)

  const lines: string[] = []

  // Top border with optional title
  if (options.title) {
    const titleText = options.title
    const strippedTitle = stripAnsi(titleText)
    const leftPad = Math.floor((width + 2 - strippedTitle.length) / 2)
    const rightPad = width + 2 - strippedTitle.length - leftPad
    lines.push(`\u256D${symbols.line.repeat(leftPad)}${titleText}${symbols.line.repeat(rightPad)}\u256E`)
  } else {
    lines.push(`\u256D${horizontal}\u256E`)
  }

  // Top padding
  for (let i = 0; i < padding; i++) lines.push(empty)

  // Content
  for (const line of content) {
    const stripped = stripAnsi(line)
    const rightPad = width - stripped.length - padding
    lines.push(`${symbols.vertical}${pad}${line}${' '.repeat(Math.max(0, rightPad) + padding)}${symbols.vertical}`)
  }

  // Bottom padding
  for (let i = 0; i < padding; i++) lines.push(empty)

  // Bottom border
  lines.push(`\u2570${horizontal}\u256F`)

  return lines.join('\n')
}

// Spinner frames
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// Progress bar
export function progressBar(percent: number, width = 20): string {
  const filled = Math.round(width * percent)
  const empty = width - filled
  return `${c.success('\u2588'.repeat(filled))}${c.muted('\u2591'.repeat(empty))}`
}
