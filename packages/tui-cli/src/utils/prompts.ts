/**
 * Simple interactive prompts without external dependencies
 *
 * Uses raw mode to capture key presses for a smooth experience
 */

import { c, symbols } from './colors'

const stdin = process.stdin
const stdout = process.stdout

// Read a line of input
export async function text(options: {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | true
}): Promise<string> {
  const { message, placeholder, defaultValue, validate } = options

  // Print prompt
  stdout.write(`${c.success(symbols.arrow)} ${c.bold(message)}`)
  if (defaultValue) {
    stdout.write(` ${c.muted(`(${defaultValue})`)}`)
  }
  stdout.write(': ')

  if (placeholder && !defaultValue) {
    stdout.write(c.muted(placeholder))
    stdout.write('\x1b[' + placeholder.length + 'D') // Move cursor back
  }

  return new Promise((resolve) => {
    let buffer = ''
    let placeholderCleared = false

    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.removeListener('data', onData)
      stdin.pause()
    }

    const onData = (data: Buffer) => {
      const char = data.toString()
      const code = data[0]

      // Clear placeholder on first input
      if (!placeholderCleared && placeholder && buffer === '') {
        stdout.write('\x1b[' + placeholder.length + 'D')
        stdout.write(' '.repeat(placeholder.length))
        stdout.write('\x1b[' + placeholder.length + 'D')
        placeholderCleared = true
      }

      // Enter
      if (code === 13) {
        stdout.write('\n')
        const result = buffer || defaultValue || ''

        // Validate
        if (validate) {
          const validationResult = validate(result)
          if (validationResult !== true) {
            stdout.write(`${c.error(symbols.cross)} ${validationResult}\n`)
            stdout.write(`${c.success(symbols.arrow)} ${c.bold(message)}: `)
            buffer = ''
            return
          }
        }

        cleanup()
        resolve(result)
        return
      }

      // Ctrl+C
      if (code === 3) {
        stdout.write('\n')
        cleanup()
        process.exit(1)
      }

      // Backspace
      if (code === 127) {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1)
          stdout.write('\b \b')
        }
        return
      }

      // Printable characters
      if (code >= 32 && code < 127) {
        buffer += char
        stdout.write(char)
      }
    }

    stdin.resume()
    stdin.setRawMode(true)
    stdin.on('data', onData)
  })
}

// Select from options
export async function select<T extends string>(options: {
  message: string
  options: { value: T; label: string; hint?: string }[]
}): Promise<T> {
  const { message, options: choices } = options
  let selectedIndex = 0

  const render = () => {
    // Clear previous render
    stdout.write('\x1b[?25l') // Hide cursor

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i]
      const isSelected = i === selectedIndex
      const prefix = isSelected ? c.success(symbols.arrow) : ' '
      const label = isSelected ? c.bold(choice.label) : choice.label
      const hint = choice.hint ? c.muted(` ${choice.hint}`) : ''

      stdout.write(`  ${prefix} ${label}${hint}\n`)
    }
  }

  stdout.write(`${c.success(symbols.arrow)} ${c.bold(message)}\n`)
  render()

  return new Promise((resolve) => {
    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.removeListener('data', onData)
      stdin.pause()
      stdout.write('\x1b[?25h') // Show cursor
    }

    const onData = (data: Buffer) => {
      const code = data[0]

      // Ctrl+C
      if (code === 3) {
        stdout.write('\n')
        cleanup()
        process.exit(1)
      }

      // Up arrow or k
      if ((data[0] === 27 && data[1] === 91 && data[2] === 65) || code === 107) {
        selectedIndex = (selectedIndex - 1 + choices.length) % choices.length
        // Move cursor up and re-render
        stdout.write(`\x1b[${choices.length}A`)
        render()
        return
      }

      // Down arrow or j
      if ((data[0] === 27 && data[1] === 91 && data[2] === 66) || code === 106) {
        selectedIndex = (selectedIndex + 1) % choices.length
        // Move cursor up and re-render
        stdout.write(`\x1b[${choices.length}A`)
        render()
        return
      }

      // Enter
      if (code === 13) {
        cleanup()
        // Clear the options
        stdout.write(`\x1b[${choices.length}A`)
        for (let i = 0; i < choices.length; i++) {
          stdout.write('\x1b[2K\n')
        }
        stdout.write(`\x1b[${choices.length}A`)
        stdout.write(`  ${c.muted(symbols.check)} ${choices[selectedIndex].label}\n`)
        resolve(choices[selectedIndex].value)
        return
      }
    }

    stdin.resume()
    stdin.setRawMode(true)
    stdin.on('data', onData)
  })
}

// Confirm yes/no
export async function confirm(options: {
  message: string
  defaultValue?: boolean
}): Promise<boolean> {
  const { message, defaultValue = true } = options
  const hint = defaultValue ? c.muted('[Y/n]') : c.muted('[y/N]')

  stdout.write(`${c.success(symbols.arrow)} ${c.bold(message)} ${hint} `)

  return new Promise((resolve) => {
    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.removeListener('data', onData)
      stdin.pause()
    }

    const onData = (data: Buffer) => {
      const char = data.toString().toLowerCase()
      const code = data[0]

      // Ctrl+C
      if (code === 3) {
        stdout.write('\n')
        cleanup()
        process.exit(1)
      }

      // Enter (use default)
      if (code === 13) {
        stdout.write(defaultValue ? 'Yes' : 'No')
        stdout.write('\n')
        cleanup()
        resolve(defaultValue)
        return
      }

      // Y
      if (char === 'y') {
        stdout.write('Yes\n')
        cleanup()
        resolve(true)
        return
      }

      // N
      if (char === 'n') {
        stdout.write('No\n')
        cleanup()
        resolve(false)
        return
      }
    }

    stdin.resume()
    stdin.setRawMode(true)
    stdin.on('data', onData)
  })
}

// Spinner
export function spinner(message: string): { stop: (finalMessage?: string) => void } {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  let stopped = false

  stdout.write('\x1b[?25l') // Hide cursor

  const interval = setInterval(() => {
    if (stopped) return
    stdout.write(`\r${c.info(frames[i])} ${message}`)
    i = (i + 1) % frames.length
  }, 80)

  return {
    stop: (finalMessage?: string) => {
      stopped = true
      clearInterval(interval)
      stdout.write('\r\x1b[K') // Clear line
      if (finalMessage) {
        stdout.write(`${c.success(symbols.check)} ${finalMessage}\n`)
      }
      stdout.write('\x1b[?25h') // Show cursor
    }
  }
}
