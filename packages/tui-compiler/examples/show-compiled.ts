/**
 * Show what a .tui file compiles to
 */

import { compile } from '../src'

const source = await Bun.file('./Counter.tui').text()

console.log('='.repeat(60))
console.log('SOURCE (.tui file):')
console.log('='.repeat(60))
console.log(source)

console.log('\n' + '='.repeat(60))
console.log('COMPILED OUTPUT (TypeScript):')
console.log('='.repeat(60))

const result = compile(source, { filename: 'Counter.tui' })
console.log(result.code)

console.log('\n' + '='.repeat(60))
console.log('AUTO-DETECTED IMPORTS:')
console.log('='.repeat(60))
console.log('Signals:', result.imports.signals)
console.log('TUI:', result.imports.tui)
