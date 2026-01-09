/**
 * TUI Framework - Input Test
 *
 * Interactive test for keyboard and mouse handling.
 * Press keys, move mouse, click around - see what we capture!
 *
 * Press 'q' or Ctrl+C to exit.
 */

import { effect } from '@rlabs-inc/signals'
import { keyboard, lastEvent, lastKey } from '../src/state/keyboard'
import { mouse, lastMouseEvent, mouseX, mouseY, isMouseDown } from '../src/state/mouse'

// ANSI helpers
const ESC = '\x1b'
const CSI = `${ESC}[`
const clearScreen = () => process.stdout.write(`${CSI}2J${CSI}H`)
const moveTo = (x: number, y: number) => process.stdout.write(`${CSI}${y};${x}H`)
const hideCursor = () => process.stdout.write(`${CSI}?25l`)
const showCursor = () => process.stdout.write(`${CSI}?25h`)

// Colors
const green = (s: string) => `${CSI}32m${s}${CSI}0m`
const cyan = (s: string) => `${CSI}36m${s}${CSI}0m`
const yellow = (s: string) => `${CSI}33m${s}${CSI}0m`
const dim = (s: string) => `${CSI}2m${s}${CSI}0m`
const bold = (s: string) => `${CSI}1m${s}${CSI}0m`

let running = true
let eventLog: string[] = []

function addLog(msg: string) {
  eventLog.unshift(msg)
  if (eventLog.length > 8) eventLog.pop()
}

function render() {
  // Don't clear - just update specific areas

  // Header
  moveTo(1, 1)
  process.stdout.write(green('╔════════════════════════════════════════════════════════════════╗'))
  moveTo(1, 2)
  process.stdout.write(green('║') + bold('           TUI Framework - Input Test                         ') + green('║'))
  moveTo(1, 3)
  process.stdout.write(green('║') + dim('           Press keys, move mouse, click around!               ') + green('║'))
  moveTo(1, 4)
  process.stdout.write(green('║') + dim('           Press q or Ctrl+C to exit                           ') + green('║'))
  moveTo(1, 5)
  process.stdout.write(green('╚════════════════════════════════════════════════════════════════╝'))

  // Keyboard section
  moveTo(1, 7)
  process.stdout.write(cyan('⌨️  KEYBOARD                                                      '))
  moveTo(1, 8)
  process.stdout.write('─'.repeat(66))

  const key = lastEvent.value
  moveTo(1, 9)
  if (key) {
    process.stdout.write(`Key: ${yellow(key.key.padEnd(15))} State: ${key.state.padEnd(10)}              `)
  } else {
    process.stdout.write(dim('Waiting for key press...                                         '))
  }

  moveTo(1, 10)
  if (key) {
    const mods: string[] = []
    if (key.modifiers.ctrl) mods.push('Ctrl')
    if (key.modifiers.alt) mods.push('Alt')
    if (key.modifiers.shift) mods.push('Shift')
    if (key.modifiers.meta) mods.push('Meta')
    process.stdout.write(`Modifiers: ${mods.length ? yellow(mods.join(' + ').padEnd(30)) : dim('none'.padEnd(30))}          `)
  } else {
    process.stdout.write('                                                                  ')
  }

  // Mouse section
  moveTo(1, 13)
  process.stdout.write(cyan('🖱️  MOUSE                                                         '))
  moveTo(1, 14)
  process.stdout.write('─'.repeat(66))

  const mx = mouseX.value
  const my = mouseY.value
  const down = isMouseDown.value
  const mouseEvt = lastMouseEvent.value

  moveTo(1, 15)
  process.stdout.write(`Position: ${yellow(`(${mx}, ${my})`.padEnd(15))} Button Down: ${down ? '●' : '○'}                `)

  moveTo(1, 16)
  if (mouseEvt) {
    process.stdout.write(`Last: ${yellow(mouseEvt.action.padEnd(8))} Button: ${String(mouseEvt.button).padEnd(3)}                        `)
    if (mouseEvt.scroll) {
      moveTo(1, 17)
      process.stdout.write(`Scroll: ${mouseEvt.scroll.direction} (delta: ${mouseEvt.scroll.delta})                                  `)
    } else {
      moveTo(1, 17)
      process.stdout.write('                                                                  ')
    }
  } else {
    process.stdout.write(dim('Waiting for mouse event...                                       '))
    moveTo(1, 17)
    process.stdout.write('                                                                  ')
  }

  // Event log
  moveTo(1, 20)
  process.stdout.write(cyan('📋 EVENT LOG                                                      '))
  moveTo(1, 21)
  process.stdout.write('─'.repeat(66))

  for (let i = 0; i < 8; i++) {
    moveTo(1, 22 + i)
    const log = eventLog[i] || ''
    process.stdout.write(dim(log.padEnd(66)))
  }

  // Hint
  moveTo(1, 31)
  process.stdout.write(dim('Try: Arrow keys, Tab, F1-F12, mouse wheel, click & drag          '))
}

async function main() {
  // Setup
  hideCursor()
  clearScreen()

  console.log('Initializing input handlers...')

  // Initialize keyboard - it auto-enables raw mode
  keyboard.initialize(() => {
    showCursor()
    clearScreen()
    console.log('Goodbye!')
  })

  // Enable mouse reporting
  mouse.enable()

  // React to keyboard events
  keyboard.on((event) => {
    // Check for quit
    if (event.key === 'q' && !event.modifiers.ctrl) {
      running = false
      return true
    }

    addLog(`KEY: ${event.key}${event.modifiers.ctrl ? ' +Ctrl' : ''}${event.modifiers.alt ? ' +Alt' : ''}${event.modifiers.shift ? ' +Shift' : ''}`)
    render()
  })

  // React to mouse events - use handlers instead of effect to avoid signal tracking leak
  // (If we used effect + render(), the effect would track keyboard signals too via render())
  mouse.onMouseDown((evt) => {
    addLog(`MOUSE: down at (${evt.x},${evt.y}) btn:${evt.button}`)
    render()
  })

  mouse.onMouseUp((evt) => {
    addLog(`MOUSE: up at (${evt.x},${evt.y}) btn:${evt.button}`)
    render()
  })

  mouse.onClick((evt) => {
    addLog(`MOUSE: click at (${evt.x},${evt.y}) btn:${evt.button}`)
    render()
  })

  mouse.onScroll((evt) => {
    const dir = evt.scroll?.direction ?? 'unknown'
    addLog(`MOUSE: scroll ${dir} at (${evt.x},${evt.y})`)
    render()
  })

  // Initial render
  render()

  // Keep running until quit
  while (running) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Cleanup
  mouse.disable()
  keyboard.cleanup()
}

main().catch((err) => {
  showCursor()
  console.error('Error:', err)
  process.exit(1)
})
