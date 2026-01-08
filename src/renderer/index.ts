/**
 * TUI Framework - Renderer Module
 *
 * The "blind" renderer - knows only about cells, not components.
 */

// Buffer utilities
export {
  createBuffer,
  cloneBuffer,
  getCell,
  setCell,
  cellEqual,
  fillRect,
  drawBorder,
  drawChar,
  drawText,
  drawTextCentered,
  drawTextRight,
  applyClipping,
  drawProgressBar,
  drawScrollbarV,
  drawScrollbarH,
} from './buffer'

// ANSI escape codes
export * as ansi from './ansi'

// Output and differential rendering
export {
  OutputBuffer,
  DiffRenderer,
  setupInlineMode,
  positionInlineMode,
  positionAppendMode,
  finalizeAppendMode,
} from './output'

// Input parsing
export { InputBuffer, type ParsedInput } from './input'
