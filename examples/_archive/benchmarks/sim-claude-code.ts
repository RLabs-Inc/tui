/**
 * Claude Code Simulator
 *
 * Simulates a realistic Claude Code-like interface:
 * - Streaming text with cursor
 * - Tool calls appearing
 * - Progress indicator
 *
 * Uses inline mode (no fullscreen), no mouse
 * Press Ctrl+C to quit
 */

import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../../index'

// Streaming text
const streamingText = signal('')
const isStreaming = signal(true)
const cursorVisible = signal(true)
const currentTool = signal('')
const tokenCount = signal(0)
const phase = signal(0)  // 0=intro, 1=reading, 2=analyzing, 3=writing, 4=done

// Phases of the simulation
const phases = [
  { tool: '', text: "I'll help you refactor that function. Let me analyze it first." },
  { tool: 'Read', text: "Reading src/utils.ts..." },
  { tool: '', text: "I can see the function uses several anti-patterns:\n• Mutation of input parameters\n• Magic numbers without constants\n• Missing error handling\n\nLet me refactor it:" },
  { tool: 'Edit', text: "Applying changes to src/utils.ts..." },
  { tool: '', text: "Done! The function is now:\n• Pure (no mutations)\n• Type-safe\n• Well-documented" },
]

async function main() {
  // Use inline mode, no mouse
  const cleanup = await mount(() => {
    box({
      width: '100%',
      flexDirection: 'column',
      children: () => {
        // Status line
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({
              content: derived(() => isStreaming.value ? '● Claude' : '○ Claude'),
              fg: derived(() => isStreaming.value ? Colors.GREEN : Colors.GRAY)
            })
            text({
              content: derived(() => `${tokenCount.value} tokens`),
              fg: Colors.GRAY
            })
          }
        })

        // Tool indicator (when active)
        box({
          visible: derived(() => currentTool.value !== ''),
          flexDirection: 'row',
          gap: 1,
          children: () => {
            text({ content: '  ◆', fg: Colors.YELLOW })
            text({ content: currentTool, fg: Colors.YELLOW })
          }
        })

        // Streaming content
        box({
          flexDirection: 'row',
          children: () => {
            text({ content: '  ', fg: Colors.GRAY })
            text({ content: streamingText, fg: Colors.WHITE })
            text({
              content: derived(() => cursorVisible.value && isStreaming.value ? '█' : ' '),
              fg: Colors.CYAN
            })
          }
        })

        // Empty line for spacing
        text({ content: '' })
      }
    })
  }, { mode: 'inline', mouse: false })

  // Cursor blink
  const cursorInterval = setInterval(() => {
    cursorVisible.value = !cursorVisible.value
  }, 400)

  // Streaming simulation
  let phaseIndex = 0
  let charIndex = 0

  const streamInterval = setInterval(() => {
    if (phaseIndex >= phases.length) {
      isStreaming.value = false
      clearInterval(streamInterval)
      clearInterval(cursorInterval)
      cleanup().then(() => process.exit(0))
      return
    }

    const currentPhase = phases[phaseIndex]!

    // Update tool if changed
    if (phase.value !== phaseIndex) {
      phase.value = phaseIndex
      currentTool.value = currentPhase.tool
      charIndex = 0
      if (currentPhase.tool) {
        streamingText.value = ''
      }
    }

    // Stream characters
    if (charIndex < currentPhase.text.length) {
      streamingText.value = currentPhase.text.slice(0, ++charIndex)
      tokenCount.value++
    } else {
      // Phase complete, move to next
      phaseIndex++
      // Small pause between phases
      streamingText.value += '\n\n'
    }
  }, 25)

  // Exit on Ctrl+C
  keyboard.onKey('c', (event) => {
    if (event.modifiers?.ctrl) {
      clearInterval(streamInterval)
      clearInterval(cursorInterval)
      cleanup().then(() => process.exit(0))
    }
  })
}

main()
