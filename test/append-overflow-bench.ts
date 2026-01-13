/**
 * Append Mode Overflow Benchmark
 *
 * Simulates what happens when content exceeds viewport:
 * 1. Erase everything (clearTerminal or eraseDown)
 * 2. Write 2000 lines of content
 * 3. Measure total time
 *
 * This is what we'd do in append mode when active area > viewport
 */

import * as ansi from '../src/renderer/ansi'

const LINES = 2000
const LINE_CONTENT = 'Line XXX: Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

// Pre-generate all content
const content = Array.from({ length: LINES }, (_, i) =>
  LINE_CONTENT.replace('XXX', String(i + 1).padStart(4, ' '))
).join('\n')

const contentWithColors = Array.from({ length: LINES }, (_, i) =>
  `\x1b[32mLine ${String(i + 1).padStart(4, ' ')}\x1b[0m: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
).join('\n')

console.log('═══════════════════════════════════════════════════════════════')
console.log('  TUI - APPEND MODE OVERFLOW BENCHMARK')
console.log('  Simulates: erase everything + write 2000 lines')
console.log('═══════════════════════════════════════════════════════════════')
console.log('')

// Benchmark 1: Just string generation (baseline)
{
  const times: number[] = []
  for (let i = 0; i < 20; i++) {
    const start = performance.now()
    const output = Array.from({ length: LINES }, (_, i) =>
      LINE_CONTENT.replace('XXX', String(i + 1).padStart(4, ' '))
    ).join('\n')
    times.push(performance.now() - start)
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`String generation only: ${avg.toFixed(2)}ms avg`)
}

// Benchmark 2: Write to stdout (no erase, discard output)
{
  const times: number[] = []
  const devNull = Bun.file('/dev/null').writer()

  for (let i = 0; i < 20; i++) {
    const start = performance.now()
    devNull.write(content)
    devNull.flush()
    times.push(performance.now() - start)
  }
  devNull.end()
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`Write to /dev/null (no terminal): ${avg.toFixed(2)}ms avg`)
}

// Benchmark 3: Write with ANSI colors to /dev/null
{
  const times: number[] = []
  const devNull = Bun.file('/dev/null').writer()

  for (let i = 0; i < 20; i++) {
    const start = performance.now()
    devNull.write(contentWithColors)
    devNull.flush()
    times.push(performance.now() - start)
  }
  devNull.end()
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`Write with ANSI colors to /dev/null: ${avg.toFixed(2)}ms avg`)
}

// Benchmark 4: Actual terminal write (real world)
console.log('')
console.log('Now testing REAL terminal output (will flash):')
console.log('(Averaging 5 runs to minimize terminal variance)')
await Bun.sleep(500)

{
  const times: number[] = []

  for (let i = 0; i < 5; i++) {
    // Clear and move to top
    process.stdout.write('\x1b[2J\x1b[H')
    await Bun.sleep(10)

    const start = performance.now()
    process.stdout.write(content)
    times.push(performance.now() - start)

    await Bun.sleep(100)
  }

  // Clear screen after test
  process.stdout.write('\x1b[2J\x1b[H')

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  console.log(`Real terminal write (2000 lines): ${avg.toFixed(2)}ms avg (${min.toFixed(1)}-${max.toFixed(1)}ms range)`)
}

// Benchmark 5: Erase + Write (full overflow scenario)
{
  const times: number[] = []

  for (let i = 0; i < 5; i++) {
    await Bun.sleep(10)

    const start = performance.now()
    process.stdout.write('\x1b[2J\x1b[H') // Clear screen + home
    process.stdout.write(content)
    times.push(performance.now() - start)

    await Bun.sleep(100)
  }

  process.stdout.write('\x1b[2J\x1b[H')

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`Erase + Write (2000 lines): ${avg.toFixed(2)}ms avg`)
}

console.log('')
console.log('═══════════════════════════════════════════════════════════════')
console.log('  SUMMARY')
console.log('═══════════════════════════════════════════════════════════════')
console.log(`  At 2000 lines, if we can stay under ~16ms, we get 60fps`)
console.log(`  Under ~33ms gives us 30fps`)
console.log('')
