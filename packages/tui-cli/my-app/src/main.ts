/**
 * TUI Application Entry Point
 */

import '@rlabs-inc/tui-compiler/register'
import { mount, keyboard } from '@rlabs-inc/tui'
import App from './App.tui'

async function main() {
  // Mount the application
  const cleanup = await mount(() => {
    App()
  })

  // Handle exit
  keyboard.onKey((event) => {
    if (event.key === 'q' || (event.modifiers.ctrl && event.key === 'c')) {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
