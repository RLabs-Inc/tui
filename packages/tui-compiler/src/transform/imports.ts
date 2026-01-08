/**
 * TUI Compiler - Auto Import Detection
 *
 * Detects what needs to be imported based on usage.
 * Users never write imports - we handle it.
 */

// =============================================================================
// SIGNALS PACKAGE IMPORTS
// =============================================================================

export const SIGNALS_PRIMITIVES = new Set([
  // Core
  'signal',
  'state',
  'derived',
  'effect',
  'bind',
  // Advanced
  'linkedSignal',
  'createSelector',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
  // Utilities
  'batch',
  'untrack',
  'peek',
  'flushSync',
  'tick',
  'unwrap',
  // Collections
  'ReactiveMap',
  'ReactiveSet',
  // Context
  'setContext',
  'getContext',
])

// =============================================================================
// TUI PRIMITIVES
// =============================================================================

export const TUI_PRIMITIVES = new Set([
  // Components
  'box',
  'text',
  'input',
  'select',
  'progress',
  'canvas',
  // API
  'mount',
  // State
  'keyboard',
  'mouse',
  'focus',
  'scroll',
  'cursor',
  'theme',
  // Types
  'Colors',
  'BorderStyle',
  'Attr',
])

// =============================================================================
// IMPORT COLLECTOR
// =============================================================================

export interface ImportCollector {
  signals: Set<string>
  tui: Set<string>
  components: Map<string, string>  // name -> path
}

export function createImportCollector(): ImportCollector {
  return {
    signals: new Set(),
    tui: new Set(),
    components: new Map(),
  }
}

/**
 * Check if an identifier is a signals primitive
 */
export function isSignalsPrimitive(name: string): boolean {
  return SIGNALS_PRIMITIVES.has(name)
}

/**
 * Check if an identifier is a TUI primitive
 */
export function isTuiPrimitive(name: string): boolean {
  return TUI_PRIMITIVES.has(name)
}

/**
 * Check if a tag name is a built-in TUI component
 */
export function isBuiltinComponent(tag: string): boolean {
  return ['box', 'text', 'input', 'select', 'progress', 'canvas'].includes(tag)
}

/**
 * Check if a tag is a user component (PascalCase)
 */
export function isUserComponent(tag: string): boolean {
  return /^[A-Z]/.test(tag)
}

/**
 * Analyze script content for used identifiers
 */
export function analyzeScriptImports(content: string): Set<string> {
  const used = new Set<string>()

  // Match function calls and identifiers
  const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\(|<)/g
  let match

  while ((match = identifierRegex.exec(content)) !== null) {
    const name = match[1]!
    if (isSignalsPrimitive(name) || isTuiPrimitive(name)) {
      used.add(name)
    }
  }

  // Also check for standalone identifiers (not just function calls)
  const allPrimitives = [...SIGNALS_PRIMITIVES, ...TUI_PRIMITIVES]
  for (const primitive of allPrimitives) {
    if (content.includes(primitive)) {
      // Verify it's not part of a larger word
      const regex = new RegExp(`\\b${primitive}\\b`)
      if (regex.test(content)) {
        used.add(primitive)
      }
    }
  }

  return used
}

/**
 * Generate import statements
 */
export interface GenerateImportsOptions {
  signalsPath?: string
  tuiPath?: string
}

export function generateImports(
  collector: ImportCollector,
  options: GenerateImportsOptions = {}
): string {
  const signalsPath = options.signalsPath ?? '@rlabs-inc/signals'
  const tuiPath = options.tuiPath ?? 'tui'  // Default to local package

  const lines: string[] = []

  // Signals imports
  if (collector.signals.size > 0) {
    const imports = Array.from(collector.signals).sort()
    lines.push(`import { ${imports.join(', ')} } from '${signalsPath}'`)
  }

  // TUI imports
  if (collector.tui.size > 0) {
    const imports = Array.from(collector.tui).sort()
    lines.push(`import { ${imports.join(', ')} } from '${tuiPath}'`)
  }

  // Component imports
  for (const [name, path] of collector.components) {
    lines.push(`import ${name} from '${path}'`)
  }

  if (lines.length > 0) {
    lines.push('') // Empty line after imports
  }

  return lines.join('\n')
}
