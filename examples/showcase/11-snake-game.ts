/**
 * TUI Framework - Snake Game
 *
 * A classic snake game demonstrating:
 * - Game loop with setInterval
 * - Reactive state for game logic
 * - Keyboard input for direction control
 * - Collision detection (walls and self)
 * - Score tracking and high score
 * - Pause/resume and restart functionality
 * - Dynamic board rendering with derived values
 *
 * Controls:
 *   Arrow keys / WASD - Change direction
 *   P - Pause/Resume
 *   R - Restart game
 *   Q - Quit
 *
 * Run with: bun run examples/showcase/11-snake-game.ts
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, t, BorderStyle, Attr } from '../../index'

// =============================================================================
// GAME CONSTANTS
// =============================================================================

const BOARD_WIDTH = 30
const BOARD_HEIGHT = 15
const TICK_MS = 150 // Game speed (lower = faster)

// Characters for rendering
const CHAR_EMPTY = ' '
const CHAR_SNAKE_HEAD = '@'
const CHAR_SNAKE_BODY = 'O'
const CHAR_FOOD = '*'
const CHAR_BORDER_H = '-'
const CHAR_BORDER_V = '|'
const CHAR_CORNER = '+'

// Direction vectors
type Direction = 'up' | 'down' | 'left' | 'right'
const DIRECTIONS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

// Opposite directions (can't reverse into yourself)
const OPPOSITES: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

// =============================================================================
// GAME TYPES
// =============================================================================

interface Point {
  x: number
  y: number
}

type GameState = 'playing' | 'paused' | 'gameover'

// =============================================================================
// GAME LOGIC
// =============================================================================

/** Create a random position on the board */
function randomPosition(exclude: Point[] = []): Point {
  let attempts = 0
  while (attempts < 1000) {
    const pos = {
      x: Math.floor(Math.random() * BOARD_WIDTH),
      y: Math.floor(Math.random() * BOARD_HEIGHT),
    }
    const isExcluded = exclude.some(p => p.x === pos.x && p.y === pos.y)
    if (!isExcluded) return pos
    attempts++
  }
  // Fallback - just return something
  return { x: 0, y: 0 }
}

/** Create initial snake at center of board */
function createInitialSnake(): Point[] {
  const centerX = Math.floor(BOARD_WIDTH / 2)
  const centerY = Math.floor(BOARD_HEIGHT / 2)
  return [
    { x: centerX, y: centerY },     // Head
    { x: centerX - 1, y: centerY }, // Body
    { x: centerX - 2, y: centerY }, // Tail
  ]
}

/** Check if two points are the same */
function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/** Check if a point is within bounds */
function inBounds(p: Point): boolean {
  return p.x >= 0 && p.x < BOARD_WIDTH && p.y >= 0 && p.y < BOARD_HEIGHT
}

/** Check if snake collides with itself */
function selfCollision(snake: Point[]): boolean {
  const [head, ...body] = snake
  return body.some(segment => samePoint(head, segment))
}

/** Render the game board as a string */
function renderBoard(snake: Point[], food: Point, gameState: GameState): string {
  // Create empty grid
  const grid: string[][] = []
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    grid.push(new Array(BOARD_WIDTH).fill(CHAR_EMPTY))
  }

  // Place food
  if (inBounds(food)) {
    grid[food.y][food.x] = CHAR_FOOD
  }

  // Place snake (body first, then head so head overwrites if overlapping)
  for (let i = snake.length - 1; i >= 0; i--) {
    const segment = snake[i]
    if (inBounds(segment)) {
      grid[segment.y][segment.x] = i === 0 ? CHAR_SNAKE_HEAD : CHAR_SNAKE_BODY
    }
  }

  // Build the board string with borders
  const lines: string[] = []

  // Top border
  lines.push(CHAR_CORNER + CHAR_BORDER_H.repeat(BOARD_WIDTH) + CHAR_CORNER)

  // Game rows
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    lines.push(CHAR_BORDER_V + grid[y].join('') + CHAR_BORDER_V)
  }

  // Bottom border
  lines.push(CHAR_CORNER + CHAR_BORDER_H.repeat(BOARD_WIDTH) + CHAR_CORNER)

  // Game over overlay
  if (gameState === 'gameover') {
    const midY = Math.floor(BOARD_HEIGHT / 2) + 1 // +1 for top border
    const gameOverText = ' GAME OVER '
    const padLen = Math.floor((BOARD_WIDTH - gameOverText.length) / 2)
    lines[midY] = CHAR_BORDER_V + ' '.repeat(padLen) + gameOverText + ' '.repeat(BOARD_WIDTH - padLen - gameOverText.length) + CHAR_BORDER_V
  }

  return lines.join('\n')
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // Game state signals
  const snake = signal<Point[]>(createInitialSnake())
  const food = signal<Point>(randomPosition(snake.value))
  const direction = signal<Direction>('right')
  const nextDirection = signal<Direction>('right') // Buffer for direction changes
  const gameState = signal<GameState>('playing')
  const score = signal(0)
  const highScore = signal(0)

  // Derived values
  const boardDisplay = derived(() => renderBoard(snake.value, food.value, gameState.value))
  const scoreDisplay = derived(() => `Score: ${score.value}`)
  const highScoreDisplay = derived(() => `High: ${highScore.value}`)
  const statusDisplay = derived(() => {
    switch (gameState.value) {
      case 'playing': return 'PLAYING'
      case 'paused': return 'PAUSED'
      case 'gameover': return 'GAME OVER'
    }
  })
  const statusColor = derived(() => {
    switch (gameState.value) {
      case 'playing': return t.success.value
      case 'paused': return t.warning.value
      case 'gameover': return t.error.value
    }
  })

  // Game tick function
  function gameTick() {
    if (gameState.value !== 'playing') return

    // Apply buffered direction
    direction.value = nextDirection.value

    // Calculate new head position
    const currentSnake = snake.value
    const head = currentSnake[0]
    const dir = DIRECTIONS[direction.value]
    const newHead: Point = {
      x: head.x + dir.x,
      y: head.y + dir.y,
    }

    // Check wall collision
    if (!inBounds(newHead)) {
      gameState.value = 'gameover'
      if (score.value > highScore.value) {
        highScore.value = score.value
      }
      return
    }

    // Create new snake with new head
    const newSnake = [newHead, ...currentSnake]

    // Check self collision (before removing tail)
    if (selfCollision(newSnake)) {
      gameState.value = 'gameover'
      if (score.value > highScore.value) {
        highScore.value = score.value
      }
      return
    }

    // Check food collision
    if (samePoint(newHead, food.value)) {
      // Eat food - keep the tail (snake grows)
      score.value += 10
      // Spawn new food
      food.value = randomPosition(newSnake)
    } else {
      // No food - remove tail (snake moves)
      newSnake.pop()
    }

    snake.value = newSnake
  }

  // Reset game function
  function resetGame() {
    snake.value = createInitialSnake()
    food.value = randomPosition(snake.value)
    direction.value = 'right'
    nextDirection.value = 'right'
    score.value = 0
    gameState.value = 'playing'
  }

  // Try to change direction (with validation)
  function tryChangeDirection(newDir: Direction) {
    // Can't change if paused or game over
    if (gameState.value !== 'playing') return

    // Can't reverse direction
    if (OPPOSITES[newDir] === direction.value) return

    nextDirection.value = newDir
  }

  // Start game loop
  let gameInterval: ReturnType<typeof setInterval> | null = null

  function startGameLoop() {
    if (gameInterval) return
    gameInterval = setInterval(gameTick, TICK_MS)
  }

  function stopGameLoop() {
    if (gameInterval) {
      clearInterval(gameInterval)
      gameInterval = null
    }
  }

  // Start the game
  startGameLoop()

  // Mount the UI
  const cleanup = await mount(() => {
    // Main container
    box({
      padding: 1,
      gap: 1,
      children: () => {
        // Header
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: BOARD_WIDTH + 2, // +2 for borders
          children: () => {
            text({ content: 'SNAKE GAME', fg: t.primary, attrs: Attr.BOLD })
            text({ content: statusDisplay, fg: statusColor })
          },
        })

        // Score row
        box({
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: BOARD_WIDTH + 2,
          children: () => {
            text({ content: scoreDisplay, fg: t.success })
            text({ content: highScoreDisplay, fg: t.warning })
          },
        })

        // Game board
        box({
          border: BorderStyle.NONE,
          children: () => {
            // The board display - reactive text that updates each tick
            text({
              content: boardDisplay,
              fg: t.text,
            })
          },
        })

        // Legend
        box({
          flexDirection: 'row',
          gap: 3,
          marginTop: 1,
          children: () => {
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: CHAR_SNAKE_HEAD, fg: t.success })
                text({ content: 'Head', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: CHAR_SNAKE_BODY, fg: t.success })
                text({ content: 'Body', fg: t.textMuted })
              },
            })
            box({
              flexDirection: 'row',
              gap: 1,
              children: () => {
                text({ content: CHAR_FOOD, fg: t.error })
                text({ content: 'Food', fg: t.textMuted })
              },
            })
          },
        })

        // Controls help
        box({
          border: BorderStyle.SINGLE,
          borderColor: t.textDim,
          padding: 1,
          marginTop: 1,
          width: BOARD_WIDTH + 2,
          children: () => {
            text({ content: 'Controls', fg: t.textMuted, marginBottom: 1 })

            box({
              flexDirection: 'row',
              justifyContent: 'space-between',
              children: () => {
                // Movement
                box({
                  children: () => {
                    text({ content: 'Move:', fg: t.textMuted })
                    text({ content: 'Arrow Keys / WASD', fg: t.text })
                  },
                })

                // Actions
                box({
                  gap: 0,
                  children: () => {
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[P]', fg: t.warning })
                        text({ content: 'Pause', fg: t.textMuted })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[R]', fg: t.info })
                        text({ content: 'Restart', fg: t.textMuted })
                      },
                    })
                    box({
                      flexDirection: 'row',
                      gap: 1,
                      children: () => {
                        text({ content: '[Q]', fg: t.error })
                        text({ content: 'Quit', fg: t.textMuted })
                      },
                    })
                  },
                })
              },
            })
          },
        })
      },
    })
  }, { mode: 'fullscreen', mouse: false })

  // ===========================================================================
  // KEYBOARD HANDLERS
  // ===========================================================================

  // Movement - Arrow keys
  keyboard.onKey('ArrowUp', () => tryChangeDirection('up'))
  keyboard.onKey('ArrowDown', () => tryChangeDirection('down'))
  keyboard.onKey('ArrowLeft', () => tryChangeDirection('left'))
  keyboard.onKey('ArrowRight', () => tryChangeDirection('right'))

  // Movement - WASD
  keyboard.onKey(['w', 'W'], () => tryChangeDirection('up'))
  keyboard.onKey(['s', 'S'], () => tryChangeDirection('down'))
  keyboard.onKey(['a', 'A'], () => tryChangeDirection('left'))
  keyboard.onKey(['d', 'D'], () => tryChangeDirection('right'))

  // Pause/Resume
  keyboard.onKey(['p', 'P', ' '], () => {
    if (gameState.value === 'playing') {
      gameState.value = 'paused'
    } else if (gameState.value === 'paused') {
      gameState.value = 'playing'
    }
  })

  // Restart
  keyboard.onKey(['r', 'R'], () => {
    resetGame()
  })

  // Quit
  keyboard.onKey(['q', 'Q', 'Escape'], () => {
    stopGameLoop()
    cleanup()
  })
}

// Run the game
main().catch(console.error)
