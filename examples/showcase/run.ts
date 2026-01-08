/**
 * TUI Showcase Runner
 *
 * Run any .tui showcase component:
 *   bun run examples/showcase/run.ts Counter              # fullscreen + mouse
 *   bun run examples/showcase/run.ts Counter inline       # inline, no mouse
 *   bun run examples/showcase/run.ts ThemeShowcase
 *   bun run examples/showcase/run.ts FlexboxDemo
 *   bun run examples/showcase/run.ts Dashboard
 */

// Register the .tui compiler plugin
import { plugin } from 'bun'
import { tuiPlugin } from '@rlabs-inc/tui-compiler/plugin'

plugin(tuiPlugin)

// Get component name and mode from args
const componentName = process.argv[2] || 'Counter'
const modeArg = process.argv[3]
const validComponents = ['Counter', 'ThemeShowcase', 'FlexboxDemo', 'Dashboard']

if (!validComponents.includes(componentName)) {
  console.log('Usage: bun run examples/showcase/run.ts <component> [inline]')
  console.log('Available components:', validComponents.join(', '))
  console.log('')
  console.log('Modes:')
  console.log('  (default)  fullscreen with mouse')
  console.log('  inline     inline without mouse')
  process.exit(1)
}

// Determine mode: fullscreen + mouse, or inline - mouse
const mode = modeArg === 'inline' ? 'inline' : 'fullscreen'
const mouse = mode === 'fullscreen'  // mouse only in fullscreen

// Dynamic import the component
const { mount, keyboard } = await import('tui')

// Import and run the component
const componentPath = `./${componentName}.tui`
const Component = (await import(componentPath)).default

const cleanup = await mount(() => {
  Component({})
}, { mode, mouse })

// Exit handler
keyboard.onKey('q', () => cleanup().then(() => process.exit(0)))
keyboard.onKey('Q', () => cleanup().then(() => process.exit(0)))
