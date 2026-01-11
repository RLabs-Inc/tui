/**
 * Test: Incremental Complexity
 *
 * Build up the reactive system step by step to find where it breaks:
 * 1. Simple effect reading a slot
 * 2. Derived reading a slot
 * 3. Effect reading derived reading slot
 * 4. Nested deriveds with slot
 * 5. Multiple slots
 * 6. Full simulation with layoutDerived
 */

import { signal, derived, effect, slotArray, flushSync } from '@rlabs-inc/signals'

// Track results
const results: Record<string, boolean> = {}

// Helper to run test without flushSync (async)
async function testAsync(name: string, test: () => Promise<boolean>): Promise<void> {
  try {
    const pass = await test()
    results[name] = pass
    console.log(`${pass ? '✅' : '❌'} ${name}`)
  } catch (err) {
    results[name] = false
    console.log(`❌ ${name} - Error: ${err}`)
  }
}

// Helper to wait for microtasks
const tick = () => new Promise(r => setTimeout(r, 10))

async function main() {
  console.log('=== Incremental Complexity Tests ===\n')

  // Test 1: Simple effect reading a slot directly
  await testAsync('1. Effect → SlotArray', async () => {
    const count = signal(0)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    const renders: string[] = []
    effect(() => { renders.push(arr[0]) })
    await tick()

    count.value = 1; await tick()
    count.value = 2; await tick()

    return renders.length === 3 && renders[2] === 'v:2'
  })

  // Test 2: Derived reading a slot
  await testAsync('2. Derived → SlotArray', async () => {
    const count = signal(0)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    const d = derived(() => arr[0])

    const renders: string[] = []
    effect(() => { renders.push(d.value) })
    await tick()

    count.value = 1; await tick()
    count.value = 2; await tick()

    return renders.length === 3 && renders[2] === 'v:2'
  })

  // Test 3: Effect → Derived → SlotArray with another derived in between
  await testAsync('3. Effect → Derived → (OtherDerived + SlotArray)', async () => {
    const count = signal(0)
    const otherSignal = signal('x')
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    const otherDerived = derived(() => otherSignal.value.toUpperCase())

    const mainDerived = derived(() => {
      const other = otherDerived.value  // Read another derived FIRST
      const content = arr[0]             // Then read slot
      return `${other}:${content}`
    })

    const renders: string[] = []
    effect(() => { renders.push(mainDerived.value) })
    await tick()

    count.value = 1; await tick()
    count.value = 2; await tick()

    return renders.length === 3 && renders[2] === 'X:v:2'
  })

  // Test 4: Effect → Derived that reads MANY signals → SlotArray
  await testAsync('4. Effect → Derived(manyDeps) → SlotArray', async () => {
    const count = signal(0)
    const sig1 = signal(1)
    const sig2 = signal(2)
    const sig3 = signal(3)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    const mainDerived = derived(() => {
      // Read many signals before the slot
      const s1 = sig1.value
      const s2 = sig2.value
      const s3 = sig3.value
      const content = arr[0]
      return `${s1}${s2}${s3}:${content}`
    })

    const renders: string[] = []
    effect(() => { renders.push(mainDerived.value) })
    await tick()

    count.value = 1; await tick()
    count.value = 2; await tick()

    return renders.length === 3 && renders[2] === '123:v:2'
  })

  // Test 5: Nested derived chain (like layoutDerived → frameBufferDerived)
  await testAsync('5. Effect → DerivedB → DerivedA → SlotArray', async () => {
    const count = signal(0)
    const tw = signal(80)
    const th = signal(24)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    // DerivedA (like layoutDerived)
    const derivedA = derived(() => {
      return { w: tw.value, h: th.value }
    })

    // DerivedB (like frameBufferDerived)
    const derivedB = derived(() => {
      const layout = derivedA.value
      const content = arr[0]
      return `${layout.w}x${layout.h}:${content}`
    })

    const renders: string[] = []
    effect(() => { renders.push(derivedB.value) })
    await tick()

    count.value = 1; await tick()
    count.value = 2; await tick()

    return renders.length === 3 && renders[2] === '80x24:v:2'
  })

  // Test 6: Multiple slots, nested deriveds, complex reads
  await testAsync('6. Complex: Multiple slots + nested deriveds', async () => {
    const count1 = signal(0)
    const count2 = signal(0)
    const tw = signal(80)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `c1:${count1.value}`)
    arr.setSource(1, () => `c2:${count2.value}`)

    const layoutDerived = derived(() => ({ w: tw.value }))

    const bufferDerived = derived(() => {
      const layout = layoutDerived.value
      const c1 = arr[0]
      const c2 = arr[1]
      return `${layout.w}|${c1}|${c2}`
    })

    const renders: string[] = []
    effect(() => { renders.push(bufferDerived.value) })
    await tick()

    count1.value = 1; await tick()
    count2.value = 1; await tick()

    // Now interleave updates
    count1.value = 2; await tick()
    count2.value = 2; await tick()

    return renders.length === 5 && renders[4] === '80|c1:2|c2:2'
  })

  // Test 7: Rapid updates (simulating setInterval)
  await testAsync('7. Rapid updates via setInterval', async () => {
    const count = signal(0)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `v:${count.value}`)

    const d = derived(() => arr[0])

    const renders: string[] = []
    effect(() => { renders.push(d.value) })
    await tick()

    // Simulate setInterval with rapid updates
    for (let i = 1; i <= 5; i++) {
      await new Promise(r => setTimeout(r, 50))
      count.value = i
    }
    await tick()

    return renders.length === 6 && renders[5] === 'v:5'
  })

  // Test 8: Effect re-runs after setInterval (simulating TUI)
  await testAsync('8. SetInterval with derived chain', async () => {
    const count = signal(0)
    const tw = signal(80)
    const arr = slotArray<string>('')
    arr.setSource(0, () => `Count: ${count.value}`)

    const layoutDerived = derived(() => ({ w: tw.value }))

    const frameBufferDerived = derived(() => {
      const layout = layoutDerived.value
      const content = arr[0]
      return { layout, content }
    })

    const renders: string[] = []
    let intervalId: NodeJS.Timeout
    let running = true

    effect(() => {
      const fb = frameBufferDerived.value
      renders.push(fb.content)
    })
    await tick()

    // Start setInterval
    intervalId = setInterval(() => {
      if (!running) return
      count.value++
    }, 100)

    // Let it run for 600ms (should get 6 increments)
    await new Promise(r => setTimeout(r, 650))
    running = false
    clearInterval(intervalId)
    await tick()

    console.error(`  [test8] renders=${renders.length}, last=${renders[renders.length-1]}`)

    // Should have initial + at least 5 updates
    return renders.length >= 6 && renders[renders.length - 1].includes('Count:')
  })

  // Summary
  console.log('\n=== Summary ===')
  const passed = Object.values(results).filter(v => v).length
  const total = Object.keys(results).length
  console.log(`Passed: ${passed}/${total}`)

  if (passed !== total) {
    console.log('\nFailed tests:')
    for (const [name, pass] of Object.entries(results)) {
      if (!pass) console.log(`  - ${name}`)
    }
    process.exit(1)
  }

  process.exit(0)
}

main()
