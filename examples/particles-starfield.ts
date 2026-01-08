/**
 * TUI Framework - Starfield Particle Demo
 *
 * Classic starfield flying through space effect.
 * Shows reactive-on-demand rendering - no wasted frames!
 *
 * Press Q to quit, +/- to change speed
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, text, box, keyboard, BorderStyle } from '../index'
import type { RGBA } from '../src/types'

// Terminal size
const WIDTH = Math.min(process.stdout.columns || 80, 120)
const HEIGHT = (process.stdout.rows || 24) - 3
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2

// Colors by depth (far = dim, close = bright)
const STAR_COLORS: RGBA[] = [
  { r: 50, g: 50, b: 70, a: 255 },    // Far - dim
  { r: 100, g: 100, b: 130, a: 255 },
  { r: 150, g: 150, b: 180, a: 255 },
  { r: 200, g: 200, b: 230, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 }, // Close - bright
]

const STAR_CHARS = ['.', '·', '•', '*', '★']
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 }
const CYAN: RGBA = { r: 0, g: 200, b: 200, a: 255 }

// Star interface
interface Star {
  x: number  // 3D position
  y: number
  z: number
}

// Stars
const NUM_STARS = 200
const stars: Star[] = []

function createStar(farAway = false): Star {
  const angle = Math.random() * Math.PI * 2
  const distance = Math.random() * 50 + 10
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    z: farAway ? Math.random() * 100 + 50 : Math.random() * 100,
  }
}

for (let i = 0; i < NUM_STARS; i++) {
  stars.push(createStar(true))
}

// Grid - one signal per row
const rows: ReturnType<typeof signal<string>>[] = []
for (let y = 0; y < HEIGHT; y++) {
  rows[y] = signal(' '.repeat(WIDTH))
}

// Stats & controls
const fps = signal(0)
const speed = signal(2)
const starCount = signal(NUM_STARS)
let frameCount = 0
let lastFpsTime = Date.now()

// Project 3D to 2D
function project(star: Star): { x: number; y: number; depth: number } | null {
  if (star.z <= 0) return null

  const scale = 60 / star.z
  const x = Math.floor(CENTER_X + star.x * scale)
  const y = Math.floor(CENTER_Y + star.y * scale * 0.5) // Aspect ratio correction
  const depth = Math.min(4, Math.floor((100 - star.z) / 20))

  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null
  return { x, y, depth }
}

// Physics update
function updatePhysics() {
  // Clear grid
  const grid: string[][] = []
  for (let y = 0; y < HEIGHT; y++) {
    grid[y] = Array(WIDTH).fill(' ')
  }

  // Update and draw stars
  for (const star of stars) {
    // Move toward viewer
    star.z -= speed.value

    // Reset if passed viewer
    if (star.z <= 0) {
      Object.assign(star, createStar(true))
      star.z = 100
    }

    // Project and draw
    const proj = project(star)
    if (proj) {
      grid[proj.y][proj.x] = STAR_CHARS[proj.depth]
    }
  }

  // Update row signals
  for (let y = 0; y < HEIGHT; y++) {
    const newRow = grid[y].join('')
    if (rows[y].value !== newRow) {
      rows[y].value = newRow
    }
  }

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
      width: WIDTH + 2,
      height: HEIGHT + 3,
      border: BorderStyle.ROUNDED,
      borderColor: CYAN,
      bg: BLACK,
      flexDirection: 'column',
      children: () => {
        // Header
        text({
          content: derived(() => ` STARFIELD | Stars:${starCount.value} | Speed:${speed.value} | FPS:${fps.value} | [+/-] Speed [Q]uit `),
          fg: CYAN,
          width: WIDTH,
          height: 1,
        })

        // Render stars
        for (let y = 0; y < HEIGHT; y++) {
          text({
            content: rows[y],
            fg: STAR_COLORS[2],  // Mid brightness
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
    if (key === '+' || key === '=') {
      speed.value = Math.min(10, speed.value + 1)
    }
    if (key === '-' || key === '_') {
      speed.value = Math.max(1, speed.value - 1)
    }
  })

  // Animation loop
  const loop = setInterval(updatePhysics, 33)  // ~30fps
}

main().catch(console.error)
