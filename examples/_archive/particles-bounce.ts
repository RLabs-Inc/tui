/**
 * TUI Framework - Bouncing Balls Physics Demo
 *
 * Colorful balls bouncing with gravity and collision.
 * Shows reactive-on-demand rendering!
 *
 * Press Q to quit, SPACE to add balls
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, text, box, keyboard, BorderStyle } from '../index'
import type { RGBA } from '../src/types'

// Terminal size
const WIDTH = Math.min(process.stdout.columns || 80, 100)
const HEIGHT = (process.stdout.rows || 24) - 4

// Colors
const BALL_COLORS: RGBA[] = [
  { r: 255, g: 100, b: 100, a: 255 },  // Red
  { r: 100, g: 255, b: 100, a: 255 },  // Green
  { r: 100, g: 100, b: 255, a: 255 },  // Blue
  { r: 255, g: 255, b: 100, a: 255 },  // Yellow
  { r: 255, g: 100, b: 255, a: 255 },  // Magenta
  { r: 100, g: 255, b: 255, a: 255 },  // Cyan
  { r: 255, g: 180, b: 100, a: 255 },  // Orange
]
const BLACK: RGBA = { r: 10, g: 10, b: 20, a: 255 }
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 }

// Physics constants
const GRAVITY = 0.3
const BOUNCE = 0.8
const FRICTION = 0.99

// Ball interface
interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  color: RGBA
  char: string
}

const balls: Ball[] = []

function createBall(): Ball {
  const colorIndex = Math.floor(Math.random() * BALL_COLORS.length)
  return {
    x: Math.random() * (WIDTH - 4) + 2,
    y: Math.random() * 5 + 2,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 2,
    color: BALL_COLORS[colorIndex],
    char: ['●', '◉', '◎', '○', '◐', '◑'][Math.floor(Math.random() * 6)],
  }
}

// Start with some balls
for (let i = 0; i < 15; i++) {
  balls.push(createBall())
}

// Grid
const rows: ReturnType<typeof signal<string>>[] = []
for (let y = 0; y < HEIGHT; y++) {
  rows[y] = signal(' '.repeat(WIDTH))
}

// Stats
const fps = signal(0)
const ballCount = signal(balls.length)
const energy = signal(0)
let frameCount = 0
let lastFpsTime = Date.now()

// Physics update
function updatePhysics() {
  let totalEnergy = 0

  // Update balls
  for (const ball of balls) {
    // Apply gravity
    ball.vy += GRAVITY

    // Apply friction
    ball.vx *= FRICTION

    // Move
    ball.x += ball.vx
    ball.y += ball.vy

    // Bounce off walls
    if (ball.x <= 1) {
      ball.x = 1
      ball.vx = -ball.vx * BOUNCE
    }
    if (ball.x >= WIDTH - 2) {
      ball.x = WIDTH - 2
      ball.vx = -ball.vx * BOUNCE
    }

    // Bounce off floor/ceiling
    if (ball.y <= 1) {
      ball.y = 1
      ball.vy = -ball.vy * BOUNCE
    }
    if (ball.y >= HEIGHT - 1) {
      ball.y = HEIGHT - 1
      ball.vy = -ball.vy * BOUNCE
      // Extra friction on ground
      ball.vx *= 0.95
    }

    // Calculate energy for display
    totalEnergy += Math.abs(ball.vx) + Math.abs(ball.vy)
  }

  energy.value = Math.round(totalEnergy)

  // Clear and draw
  const grid: string[][] = []
  for (let y = 0; y < HEIGHT; y++) {
    grid[y] = Array(WIDTH).fill(' ')
  }

  // Draw balls
  for (const ball of balls) {
    const x = Math.round(ball.x)
    const y = Math.round(ball.y)
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
      grid[y][x] = ball.char
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
      height: HEIGHT + 4,
      border: BorderStyle.DOUBLE,
      borderColor: WHITE,
      bg: BLACK,
      flexDirection: 'column',
      children: () => {
        // Header
        text({
          content: derived(() => ` BOUNCING BALLS | Count:${ballCount.value} | Energy:${energy.value} | FPS:${fps.value} `),
          fg: WHITE,
          width: WIDTH,
          height: 1,
        })
        text({
          content: ' [SPACE] Add ball  [R] Reset  [Q] Quit ',
          fg: { r: 150, g: 150, b: 150, a: 255 },
          width: WIDTH,
          height: 1,
        })

        // Render
        for (let y = 0; y < HEIGHT; y++) {
          text({
            content: rows[y],
            fg: BALL_COLORS[y % BALL_COLORS.length],
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
    if (event.key === 'Space' || key === ' ') {
      balls.push(createBall())
      ballCount.value = balls.length
    }
    if (key === 'r') {
      balls.length = 0
      for (let i = 0; i < 15; i++) {
        balls.push(createBall())
      }
      ballCount.value = balls.length
    }
  })

  // Animation loop - 60fps physics!
  const loop = setInterval(updatePhysics, 16)
}

main().catch(console.error)
