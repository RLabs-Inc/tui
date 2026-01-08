/**
 * TUI Compiler - Auto Registration
 *
 * Import this file to automatically register the TUI compiler plugin.
 *
 * Usage in bunfig.toml:
 *   preload = ["@rlabs-inc/tui-compiler/register"]
 *
 * Or at the top of your entry file:
 *   import '@rlabs-inc/tui-compiler/register'
 */

import { register } from './plugin'

// Auto-register with default options
register({
  dev: process.env.NODE_ENV !== 'production',
})
