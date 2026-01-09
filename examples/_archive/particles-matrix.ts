/**
 * TUI Framework - Matrix Rain Particle Demo
 *
 * Showcases:
 * - Reactive-on-demand rendering (no fixed FPS!)
 * - Smooth animation via signal updates
 * - Efficient row-based rendering
 *
 * Press Q to quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, text, box, keyboard, BorderStyle } from '../index'
import type { RGBA } from '../src/types'

// Matrix characters
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'

// Colors
const BRIGHT_GREEN: RGBA = { r: 0, g: 255, b: 70, a: 255 }
const DARK_GREEN: RGBA = { r: 0, g: 80, b: 30, a: 255 }
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 }

// Terminal size (leave room for border + header)
const WIDTH = Math.min(process.stdout.columns || 80, 100) - 2  // -2 for left/right borders
const HEIGHT = (process.stdout.rows || 24) - 4  // -4 for top/bottom borders + header

// Grid state - one signal per row (efficient!)
const rows: ReturnType<typeof signal<string>>[] = []
for (let y = 0; y < HEIGHT; y++) {
  rows[y] = signal(' '.repeat(WIDTH))
}

// Drop state
interface Drop {
  x: number
  y: number
  speed: number
  length: number
  chars: string[]
}

const NUM_DROPS = Math.floor(WIDTH / 2)
const drops: Drop[] = []

function randomChar(): string {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
}

function createDrop(): Drop {
  const length = 4 + Math.floor(Math.random() * 12)
  return {
    x: Math.floor(Math.random() * WIDTH),
    y: -length - Math.floor(Math.random() * HEIGHT),
    speed: 0.3 + Math.random() * 0.8,
    length,
    chars: Array.from({ length }, randomChar),
  }
}

// Initialize drops
for (let i = 0; i < NUM_DROPS; i++) {
  drops.push(createDrop())
}

// Stats
const fps = signal(0)
const cellsPerFrame = signal(0)
let frameCount = 0
let lastFpsTime = Date.now()

// Build row strings
function buildRows(): string[] {
  // Start with empty grid
  const grid: string[][] = []
  for (let y = 0; y < HEIGHT; y++) {
    grid[y] = Array(WIDTH).fill(' ')
  }

  // Draw all drops
  for (const drop of drops) {
    for (let i = 0; i < drop.length; i++) {
      const y = Math.floor(drop.y) - i
      if (y >= 0 && y < HEIGHT && drop.x >= 0 && drop.x < WIDTH) {
        grid[y][drop.x] = drop.chars[i]
      }
    }
  }

  // Convert to strings
  return grid.map(row => row.join(''))
}

// Physics update
function updatePhysics() {
  let updates = 0

  // Move drops
  for (const drop of drops) {
    drop.y += drop.speed

    // Random char mutation
    if (Math.random() < 0.2) {
      const idx = Math.floor(Math.random() * drop.chars.length)
      drop.chars[idx] = randomChar()
    }

    // Reset when off screen
    if (drop.y - drop.length > HEIGHT) {
      Object.assign(drop, createDrop())
    }
  }

  // Rebuild all rows
  const newRows = buildRows()
  for (let y = 0; y < HEIGHT; y++) {
    if (rows[y].value !== newRows[y]) {
      rows[y].value = newRows[y]
      updates++
    }
  }

  cellsPerFrame.value = updates

  // FPS
  frameCount++
  const now = Date.now()
  if (now - lastFpsTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFpsTime = now
  }
}

async function main() {
  const cleanup = await mount(() => {
    box({
      width: WIDTH + 4,  // content + padding + borders
      height: HEIGHT + 4,  // content + header + borders
      border: BorderStyle.ROUNDED,
      borderColor: DARK_GREEN,
      bg: BLACK,
      padding: 1,
      flexDirection: 'column',
      children: () => {
        // Header
        text({
          content: derived(() => `MATRIX | Drops:${NUM_DROPS} | Rows/frame:${cellsPerFrame.value} | FPS:${fps.value} | [Q]uit`),
          fg: BRIGHT_GREEN,
          width: WIDTH,
          height: 1,
        })

        // Render each row
        for (let y = 0; y < HEIGHT; y++) {
          text({
            content: rows[y],
            fg: BRIGHT_GREEN,
            width: WIDTH,
            height: 1,
          })
        }
      }
    })
  })

  // Input handling
  keyboard.onKey((event) => {
    const key = event.key.toLowerCase()
    if (key === 'q' || (event.modifiers?.ctrl && key === 'c')) {
      clearInterval(loop)
      cleanup().then(() => {
        console.log('\x1b[?25h')
        process.exit(0)
      })
    }
  })

  // Animation loop
  const loop = setInterval(updatePhysics, 50)  // 20fps physics
}

main().catch(console.error)
