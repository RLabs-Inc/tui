/**
 * Debug intrinsic height calculation - writes to file to not break terminal
 */
import { writeFileSync } from 'fs'
import { signal, derived } from '@rlabs-inc/signals'
import { mount, box, text, Colors, BorderStyle } from '../index'
import { layoutDerived } from '../src/pipeline/layout'
import { getAllocatedIndices } from '../src/engine/registry'
import * as core from '../src/engine/arrays/core'
import * as textArrays from '../src/engine/arrays/text'
import { unwrap } from '@rlabs-inc/signals'

const counter = signal(0)
const visible = signal(true)
const width = signal(20)
const color = signal(Colors.WHITE)
const doubled = derived(() => counter.value * 2)
const isEven = derived(() => counter.value % 2 === 0)

await mount(() => {
  box({
    width: 70,
    padding: 1,
    bg: Colors.BLACK,
    children: () => {
      text({ content: 'REACTIVITY TEST', fg: Colors.CYAN })
      text({ content: '─'.repeat(68), fg: Colors.GRAY })
      text({ content: 'Signal (number):', fg: Colors.WHITE })
      box({ flexDirection: 'row', gap: 2, children: () => { text({ content: 'counter:', fg: Colors.GRAY }); text({ content: counter, fg: Colors.GREEN }) }})
      text({ content: '' })
      text({ content: 'Derived Values:', fg: Colors.WHITE })
      box({ gap: 1, children: () => {
        box({ flexDirection: 'row', gap: 2, children: () => { text({ content: 'doubled:', fg: Colors.GRAY }); text({ content: doubled, fg: Colors.YELLOW }) }})
        box({ flexDirection: 'row', gap: 2, children: () => { text({ content: 'isEven:', fg: Colors.GRAY }); text({ content: 'YES', fg: Colors.GREEN }) }})
      }})
      text({ content: '' })
      text({ content: 'Function Getters:', fg: Colors.WHITE })
      box({ gap: 1, children: () => {
        text({ content: 'Counter is 0', fg: Colors.CYAN })
        text({ content: 'Doubled is 0', fg: Colors.MAGENTA })
        text({ content: 'Counter mod 5 = 0', fg: Colors.YELLOW })
      }})
      text({ content: '' })
      text({ content: 'Reactive Color:', fg: Colors.WHITE })
      box({ flexDirection: 'row', gap: 2, children: () => { text({ content: 'This text color changes', fg: color }); box({ width: 10, height: 2, bg: color, children: () => text({ content: 'BG too!' }) }) }})
      text({ content: '' })
      text({ content: 'Reactive Width:', fg: Colors.WHITE })
      box({ width: width, height: 3, border: BorderStyle.SINGLE, borderColor: Colors.GREEN, children: () => { text({ content: 'width: 20', fg: Colors.GREEN }) }})
      text({ content: '' })
      text({ content: 'Reactive Visibility:', fg: Colors.WHITE })
      box({ flexDirection: 'row', gap: 2, children: () => { text({ content: 'Status:', fg: Colors.GRAY }); text({ content: 'VISIBLE', fg: Colors.GREEN }) }})
      box({ width: 30, height: 3, border: 1, borderColor: Colors.YELLOW, visible: visible, children: () => { text({ content: 'I appear and disappear!', fg: Colors.YELLOW }) }})
      text({ content: '' })
      text({ content: 'Complex Expression:', fg: Colors.WHITE })
      text({ content: 'At tick 0, doubled=0, which is even', fg: Colors.CYAN })
      text({ content: '' })
      text({ content: 'Press Q to exit', fg: Colors.GRAY })
    },
  })
}, { mode: 'inline', mouse: false })

const layout = layoutDerived.value
const indices = getAllocatedIndices()

const lines: string[] = []
lines.push(`contentHeight: ${layout.contentHeight}`)
lines.push(``)
lines.push(`All components:`)
for (const i of indices) {
  const type = core.componentType[i]
  const y = layout.y[i] ?? 0
  const h = layout.height[i] ?? 0
  const parent = unwrap(core.parentIndex[i]) ?? -1
  const typeName = type === 1 ? 'BOX' : type === 2 ? 'TEXT' : 'OTHER'
  let content = ''
  if (type === 2) {
    const raw = unwrap(textArrays.textContent[i])
    content = raw != null ? String(raw).substring(0, 30) : ''
  }
  lines.push(`  [${i}] ${typeName} parent=${parent} y=${y} h=${h} ${content ? `"${content}"` : ''}`)
}

writeFileSync('/tmp/debug-intrinsic.txt', lines.join('\n'))
console.log('Debug written to /tmp/debug-intrinsic.txt')
process.exit(0)
