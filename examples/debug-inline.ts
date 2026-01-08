/**
 * Debug inline rendering issue - MATCHES 08-reactivity.ts structure
 */
import { signal, derived, effect } from '@rlabs-inc/signals'
import { mount, box, text, keyboard, Colors, BorderStyle } from '../index'
import { layoutDerived, terminalWidth, terminalHeight, renderMode } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'

async function main() {
  const counter = signal(0)
  const visible = signal(true)
  const width = signal(20)

  // Update counter every 500ms
  const interval = setInterval(() => {
    counter.value++
  }, 500)

  // Toggle visibility every 2s
  const visInterval = setInterval(() => {
    visible.value = !visible.value
  }, 2000)

  // Change width
  const widthInterval = setInterval(() => {
    width.value = 15 + (counter.value % 10) * 3
  }, 750)

  // Debug: Watch layout changes
  let lastContentHeight = -1
  const layoutWatch = effect(() => {
    const layout = layoutDerived.value
    const { buffer } = frameBufferDerived.value
    if (layout.contentHeight !== lastContentHeight) {
      console.error(`[HEIGHT CHANGE] contentHeight: ${lastContentHeight} → ${layout.contentHeight}, bufferHeight=${buffer.height}`)
      lastContentHeight = layout.contentHeight
    }
  })

  const cleanup = await mount(() => {
    box({
      width: 70,
      padding: 1,
      bg: Colors.BLACK,
      children: () => {
        text({ content: 'REACTIVITY TEST', fg: Colors.CYAN })
        text({ content: '─'.repeat(68), fg: Colors.GRAY })

        text({ content: 'Signal (number, updates every 500ms):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'counter:', fg: Colors.GRAY })
            text({ content: counter, fg: Colors.GREEN })
          },
        })

        text({ content: '' })
        text({ content: 'Reactive Width (changes every 750ms):', fg: Colors.WHITE })
        box({
          width: width,
          height: 3,
          border: BorderStyle.SINGLE,
          borderColor: Colors.GREEN,
          children: () => {
            text({ content: () => `width: ${width.value}`, fg: Colors.GREEN })
          },
        })

        text({ content: '' })
        text({ content: 'Reactive Visibility (toggles every 2s):', fg: Colors.WHITE })
        box({
          flexDirection: 'row',
          gap: 2,
          children: () => {
            text({ content: 'Status:', fg: Colors.GRAY })
            text({
              content: () => visible.value ? 'VISIBLE' : 'HIDDEN',
              fg: () => visible.value ? Colors.GREEN : Colors.RED,
            })
          },
        })
        box({
          width: 30,
          height: 3,
          border: 1,
          borderColor: Colors.YELLOW,
          visible: visible,
          children: () => {
            text({ content: 'I appear and disappear!', fg: Colors.YELLOW })
          },
        })

        text({ content: '' })
        text({ content: 'Press Q to exit', fg: Colors.GRAY })
      },
    })
  }, { mode: 'inline', mouse: false })

  keyboard.onKey('q', () => {
    clearInterval(interval)
    clearInterval(visInterval)
    clearInterval(widthInterval)
    layoutWatch()
    cleanup()
  })
  keyboard.onKey('Q', () => {
    clearInterval(interval)
    clearInterval(visInterval)
    clearInterval(widthInterval)
    layoutWatch()
    cleanup()
  })
}

main().catch(console.error)
