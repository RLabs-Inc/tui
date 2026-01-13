/**
 * Simple test for renderToHistory
 */

import { mount, box, text, Colors, type AppendMountResult } from '../index'

async function main() {
  console.error('Starting test...')

  const result = await mount(() => {
    box({
      width: 40,
      padding: 1,
      children: () => {
        text({ content: 'Active content', fg: Colors.green })
      },
    })
  }, {
    mode: 'append',
    mouse: false,
  }) as AppendMountResult

  const { cleanup, renderToHistory } = result

  console.error('Mounted, now calling renderToHistory...')

  // Test renderToHistory
  renderToHistory(() => {
    box({
      width: 40,
      padding: 1,
      children: () => {
        text({ content: 'FROZEN MESSAGE 1', fg: Colors.cyan })
      },
    })
  })

  console.error('Called renderToHistory, sleeping...')

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 500))

  // Second freeze
  renderToHistory(() => {
    box({
      width: 40,
      padding: 1,
      children: () => {
        text({ content: 'FROZEN MESSAGE 2', fg: Colors.yellow })
      },
    })
  })

  console.error('Called renderToHistory again, cleaning up...')

  await new Promise(resolve => setTimeout(resolve, 5000))

  cleanup()
  console.error('Done! Scroll up to see if frozen messages are in terminal history.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
