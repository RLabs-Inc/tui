/**
 * TUI Compiler - Bun Plugin
 *
 * Register this plugin to enable .tui file imports.
 *
 * Usage:
 *   import { tuiPlugin } from '@rlabs-inc/tui-compiler/plugin'
 *   Bun.plugin(tuiPlugin)
 *
 * Or in bunfig.toml:
 *   preload = ["@rlabs-inc/tui-compiler/register"]
 */

import type { BunPlugin } from 'bun'
import { compile } from './generate/codegen'
import { formatError, CompilerError } from './utils/errors'

// =============================================================================
// PLUGIN OPTIONS
// =============================================================================

export interface TuiPluginOptions {
  /** Development mode - extra checks and debugging */
  dev?: boolean
  /** Generate source maps */
  sourcemap?: boolean
  /** Custom file extensions to handle (default: ['.tui']) */
  extensions?: string[]
  /** Path to TUI framework root (for computing relative imports) */
  tuiRoot?: string
}

// =============================================================================
// PLUGIN
// =============================================================================

export function createTuiPlugin(options: TuiPluginOptions = {}): BunPlugin {
  const extensions = options.extensions ?? ['.tui']
  const extensionPattern = extensions.map(e => e.replace('.', '\\.')).join('|')
  const filter = new RegExp(`(${extensionPattern})$`)

  return {
    name: 'tui-compiler',

    setup(build) {
      build.onLoad({ filter }, async ({ path: filePath }) => {
        try {
          // Read source file
          const source = await Bun.file(filePath).text()

          // Compile
          const result = compile(source, {
            filename: filePath,
            dev: options.dev,
            sourcemap: options.sourcemap,
            tuiImportPath: options.tuiRoot,  // Uses @rlabs-inc/tui by default
          })

          // Log warnings in dev mode
          if (options.dev && result.warnings.length > 0) {
            console.warn(`[TUI] Warnings in ${filePath}:`)
            for (const warning of result.warnings) {
              console.warn(`  ${warning}`)
            }
          }

          return {
            contents: result.code,
            loader: 'tsx',
          }
        } catch (error) {
          // Format compiler errors nicely
          if (error instanceof CompilerError) {
            console.error(formatError(error))
            throw new Error(`Failed to compile ${filePath}`)
          }

          // Re-throw other errors
          throw error
        }
      })
    },
  }
}

// =============================================================================
// DEFAULT PLUGIN INSTANCE
// =============================================================================

export const tuiPlugin = createTuiPlugin()

// =============================================================================
// REGISTER HELPER
// =============================================================================

/**
 * Register the plugin globally.
 * Call this once at application startup or use in bunfig.toml preload.
 */
export function register(options?: TuiPluginOptions): void {
  const { plugin } = require('bun')
  plugin(createTuiPlugin(options))
}
