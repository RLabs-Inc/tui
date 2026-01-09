/**
 * Test: Does text update trigger layout recomputation?
 */
import { signal } from '@rlabs-inc/signals'
import { box, text } from '../src/primitives'
import { resetRegistry } from '../src/engine/registry'
import { resetAllArrays } from '../src/engine/arrays'
import { resetTitanArrays } from '../src/pipeline/layout/titan-engine'
import { layoutDerived, terminalWidth, terminalHeight } from '../src/pipeline/layout'
import { frameBufferDerived } from '../src/pipeline/frameBuffer'

function cleanupAll(): void {
  resetRegistry()
  resetAllArrays()
  resetTitanArrays()
}

cleanupAll()
terminalWidth.value = 100
terminalHeight.value = 50

const textContent = signal('Initial text')

// Create a component
const cleanup = box({
  width: 50,
  height: 10,
  children: () => {
    text({ content: textContent })
  }
})

// Initial read
layoutDerived.value
frameBufferDerived.value
console.log('Initial layout computed')

// Now let's see if text change triggers layout
console.log('\n--- Changing text content (same length) ---')

for (let i = 0; i < 5; i++) {
  const signalStart = Bun.nanoseconds()
  textContent.value = `Updated_${i}`
  const signalTime = Bun.nanoseconds() - signalStart
  
  // Force read deriveds
  const layoutStart = Bun.nanoseconds()
  const layout = layoutDerived.value
  const layoutTime = Bun.nanoseconds() - layoutStart
  
  const fbStart = Bun.nanoseconds()
  const fb = frameBufferDerived.value
  const fbTime = Bun.nanoseconds() - fbStart
  
  console.log(`Update ${i}: signal=${(signalTime/1000).toFixed(1)}μs, layout=${(layoutTime/1000).toFixed(1)}μs, fb=${(fbTime/1000).toFixed(1)}μs`)
}

console.log('\n--- Now test with 1000 components ---')
cleanupAll()

const signals: ReturnType<typeof signal<string>>[] = []
for (let i = 0; i < 1000; i++) {
  const s = signal(`Row ${i}`)
  signals.push(s)
  box({
    width: 50,
    height: 3,
    children: () => {
      text({ content: s })
    }
  })
}

// Initial computation
layoutDerived.value
frameBufferDerived.value

console.log('Created 1000 components')

// Single text update
const updateStart = Bun.nanoseconds()
signals[0].value = 'Row 0X'
const updateTime = Bun.nanoseconds() - updateStart

const layoutStart = Bun.nanoseconds()
layoutDerived.value
const layoutTime = Bun.nanoseconds() - layoutStart

const fbStart = Bun.nanoseconds()
frameBufferDerived.value
const fbTime = Bun.nanoseconds() - fbStart

console.log(`\nSingle text change with 1000 components:`)
console.log(`  Signal update: ${(updateTime/1000).toFixed(1)}μs`)
console.log(`  Layout read:   ${(layoutTime/1000).toFixed(1)}μs (should be ~1μs if cached)`)
console.log(`  FB read:       ${(fbTime/1000).toFixed(1)}μs`)
console.log(`  TOTAL:         ${((updateTime + layoutTime + fbTime)/1000).toFixed(1)}μs`)

if (layoutTime > 100000) {
  console.log('\n⚠️  LAYOUT IS RECOMPUTING ON TEXT CHANGE!')
  console.log('   This breaks fine-grained reactivity.')
} else {
  console.log('\n✅ Layout is cached. Fine-grained reactivity working.')
}

cleanupAll()
