/**
 * TUI Framework - Primitives
 *
 * The building blocks for creating terminal UIs.
 * All primitives use bind() for reactive props - no effects needed!
 */

export { box } from './box'
export { text } from './text'
export { each } from './each'
export { show } from './show'
export { when } from './when'

// Types
export type { BoxProps, TextProps, Cleanup } from './types'
