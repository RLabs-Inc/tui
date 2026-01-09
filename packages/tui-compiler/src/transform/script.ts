/**
 * TUI Compiler - Script Transformer
 *
 * Analyzes and transforms the <script> block.
 * Detects imports, exports (props), and prepares for code generation.
 */

import type { ScriptBlock } from '../parse/ast'
import {
  type ImportCollector,
  analyzeScriptImports,
  isSignalsPrimitive,
  isTuiPrimitive,
} from './imports'

// =============================================================================
// SCRIPT ANALYSIS
// =============================================================================

export interface ScriptAnalysis {
  /** Original script content */
  content: string
  /** Language (js or ts) */
  lang: 'js' | 'ts'
  /** User-written imports (to preserve) */
  userImports: string[]
  /** User-written exports (props) */
  exports: PropExport[]
  /** Code after removing imports/exports */
  body: string
  /** Identifiers used that need auto-import */
  usedIdentifiers: Set<string>
}

export interface PropExport {
  name: string
  hasDefault: boolean
  defaultValue?: string
  type?: string
}

// =============================================================================
// ANALYZE SCRIPT
// =============================================================================

export function analyzeScript(
  script: ScriptBlock | null,
  imports: ImportCollector
): ScriptAnalysis {
  if (!script) {
    return {
      content: '',
      lang: 'ts',
      userImports: [],
      exports: [],
      body: '',
      usedIdentifiers: new Set(),
    }
  }

  const content = script.content
  const lines = content.split('\n')

  const userImports: string[] = []
  const exports: PropExport[] = []
  const bodyLines: string[] = []

  // Parse line by line
  for (const line of lines) {
    const trimmed = line.trim()

    // User imports
    if (trimmed.startsWith('import ')) {
      if (trimmed.includes('.tui')) {
        // Component import - extract and track
        const match = trimmed.match(/import\s+(\w+)\s+from\s+['"](.+\.tui)['"]/)
        if (match) {
          imports.components.set(match[1]!, match[2]!)
        }
      } else {
        // Preserve ALL user imports - don't strip anything the user wrote
        userImports.push(line)
      }
      continue
    }

    // Exports (props)
    if (trimmed.startsWith('export let ') || trimmed.startsWith('export const ')) {
      const prop = parseExport(trimmed)
      if (prop) {
        exports.push(prop)
        // Convert to regular declaration
        bodyLines.push(line.replace(/^(\s*)export\s+(let|const)/, '$1$2'))
      }
      continue
    }

    // Regular code
    bodyLines.push(line)
  }

  // Analyze used identifiers
  const body = bodyLines.join('\n')
  const usedIdentifiers = analyzeScriptImports(body)

  // Add to import collector
  for (const id of usedIdentifiers) {
    if (isSignalsPrimitive(id)) {
      imports.signals.add(id)
    } else if (isTuiPrimitive(id)) {
      imports.tui.add(id)
    }
  }

  return {
    content,
    lang: script.lang,
    userImports,
    exports,
    body,
    usedIdentifiers,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function parseExport(line: string): PropExport | null {
  // Match: export let name = default
  // Match: export let name: Type = default
  // Match: export let name: Type
  // Match: export const name = value

  const letMatch = line.match(
    /export\s+let\s+(\w+)(?:\s*:\s*([^=]+?))?(?:\s*=\s*(.+))?$/
  )

  if (letMatch) {
    return {
      name: letMatch[1]!,
      hasDefault: !!letMatch[3],
      defaultValue: letMatch[3]?.trim(),
      type: letMatch[2]?.trim(),
    }
  }

  const constMatch = line.match(
    /export\s+const\s+(\w+)(?:\s*:\s*([^=]+?))?(?:\s*=\s*(.+))?$/
  )

  if (constMatch) {
    return {
      name: constMatch[1]!,
      hasDefault: true,
      defaultValue: constMatch[3]?.trim(),
      type: constMatch[2]?.trim(),
    }
  }

  return null
}

/**
 * Generate props interface from exports
 */
export function generatePropsInterface(exports: PropExport[]): string {
  if (exports.length === 0) return ''

  const lines = ['interface Props {']

  for (const exp of exports) {
    const optional = exp.hasDefault ? '?' : ''
    const type = exp.type ?? 'any'
    lines.push(`  ${exp.name}${optional}: ${type}`)
  }

  lines.push('}')
  return lines.join('\n')
}

/**
 * Generate props destructuring
 */
export function generatePropsDestructure(exports: PropExport[]): string {
  if (exports.length === 0) return ''

  const parts = exports.map(exp => {
    if (exp.hasDefault && exp.defaultValue) {
      return `${exp.name} = ${exp.defaultValue}`
    }
    return exp.name
  })

  return `const { ${parts.join(', ')} } = props`
}
