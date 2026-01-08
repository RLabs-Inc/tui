/**
 * Simple Input Test - Run this interactively!
 *
 * Usage: bun run examples/input-simple.ts
 *
 * Press Ctrl+C to exit
 */

import { keyboard, lastEvent } from '../src/state/keyboard'
import { mouse, lastMouseEvent, mouseX, mouseY } from '../src/state/mouse'
import { effect } from '@rlabs-inc/signals'

console.log('🎮 TUI Input Test')
console.log('─'.repeat(50))
console.log('Press any key or move/click mouse')
console.log('Press Ctrl+C to exit')
console.log('─'.repeat(50))
console.log('')

// Initialize keyboard (auto-enables raw mode)
keyboard.initialize(() => {
  console.log('\n👋 Goodbye!')
})

// Enable mouse
mouse.enable()

// Track keyboard events
keyboard.on((event) => {
  const mods: string[] = []
  if (event.modifiers.ctrl) mods.push('Ctrl')
  if (event.modifiers.alt) mods.push('Alt')
  if (event.modifiers.shift) mods.push('Shift')
  if (event.modifiers.meta) mods.push('Meta')

  const modStr = mods.length ? ` [${mods.join('+')}]` : ''

  console.log(`⌨️  KEY: "${event.key}"${modStr} state=${event.state}`)
})

// Track mouse events
effect(() => {
  const evt = lastMouseEvent.value
  if (evt) {
    let msg = `🖱️  MOUSE: ${evt.action} at (${evt.x}, ${evt.y}) btn=${evt.button}`
    if (evt.scroll) {
      msg += ` scroll=${evt.scroll.direction}(${evt.scroll.amount})`
    }
    if (evt.ctrl) msg += ' +Ctrl'
    if (evt.alt) msg += ' +Alt'
    if (evt.shift) msg += ' +Shift'
    console.log(msg)
  }
})

console.log('✅ Input handlers ready!\n')
