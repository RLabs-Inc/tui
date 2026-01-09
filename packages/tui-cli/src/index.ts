#!/usr/bin/env bun
/**
 * create-tui - Create TUI Framework applications
 *
 * Usage:
 *   bun create tui my-app
 *   bunx create-tui my-app
 *   npx create-tui my-app
 */

import { parseArgs } from 'util'
import { c, symbols } from './utils/colors'
import { create } from './commands/create'

const VERSION = '0.1.0'

const HELP = `
${c.bold('@rlabs-inc/create-tui')} ${c.muted(`v${VERSION}`)}

${c.dim('Create TUI Framework applications')}
${c.dim('The Terminal UI Framework for TypeScript/Bun')}

${c.bold('Usage:')}
  ${c.info('bunx @rlabs-inc/create-tui')} ${c.muted('<project-name>')}
  ${c.info('npx @rlabs-inc/create-tui')} ${c.muted('<project-name>')}

${c.bold('Options:')}
  ${c.muted('-h, --help')}       Show this help message
  ${c.muted('-v, --version')}    Show version

${c.bold('Examples:')}
  ${c.dim('$')} ${c.info('bunx @rlabs-inc/create-tui')} my-app
  ${c.dim('$')} ${c.info('bunx @rlabs-inc/create-tui')} dashboard

${c.muted('Documentation: https://github.com/rlabs-inc/tui')}
`

async function main() {
  try {
    const { values, positionals } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        template: { type: 'string', short: 't' },
      },
      allowPositionals: true,
      strict: false,
    })

    // Help flag
    if (values.help) {
      console.log(HELP)
      return
    }

    // Version flag
    if (values.version) {
      console.log(`${c.bold('@rlabs-inc/create-tui')} ${c.muted(`v${VERSION}`)}`)
      return
    }

    // Get project name from positional args
    const projectName = positionals[0]

    // Run create command (will prompt for name if not provided)
    await create({ projectName, template: values.template as string | undefined })

  } catch (error: any) {
    console.error(`${c.error(symbols.cross)} ${error.message}`)
    process.exit(1)
  }
}

main()
