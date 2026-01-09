/**
 * TUI Compiler - Error Handling
 *
 * Beautiful, helpful error messages with source context.
 * Inspired by Rust's error messages - show exactly where the problem is.
 *
 * Great DX starts with great error messages.
 */

import type { SourceLocation, Position } from '../parse/ast'

// =============================================================================
// ERROR TYPES
// =============================================================================

export type ErrorCode =
  // Lexer errors
  | 'UNCLOSED_SCRIPT'
  | 'UNCLOSED_TAG'
  | 'UNCLOSED_EXPRESSION'
  | 'UNCLOSED_STRING'
  | 'INVALID_CHARACTER'
  // Parser errors
  | 'UNEXPECTED_TOKEN'
  | 'EXPECTED_TOKEN'
  | 'UNCLOSED_BLOCK'
  | 'INVALID_BLOCK'
  | 'MISSING_ATTRIBUTE_VALUE'
  | 'INVALID_DIRECTIVE'
  | 'DUPLICATE_ATTRIBUTE'
  // Semantic errors
  | 'UNKNOWN_COMPONENT'
  | 'INVALID_PROP'
  | 'MISSING_REQUIRED_PROP'
  | 'TYPE_MISMATCH'
  | 'INVALID_EXPRESSION'
  | 'UNDEFINED_VARIABLE'
  // General
  | 'INTERNAL_ERROR'

// =============================================================================
// COMPILER ERROR
// =============================================================================

export class CompilerError extends Error {
  code: ErrorCode
  loc: SourceLocation
  filename: string
  source: string
  hint?: string

  constructor(
    code: ErrorCode,
    message: string,
    loc: SourceLocation,
    filename: string,
    source: string,
    hint?: string
  ) {
    super(message)
    this.name = 'CompilerError'
    this.code = code
    this.loc = loc
    this.filename = filename
    this.source = source
    this.hint = hint
  }

  /**
   * Format the error with beautiful source context
   */
  format(): string {
    const lines: string[] = []

    // Header
    lines.push(``)
    lines.push(`\x1b[1m\x1b[31merror[${this.code}]\x1b[0m: ${this.message}`)
    lines.push(`  \x1b[2m-->\x1b[0m ${this.filename}:${this.loc.start.line}:${this.loc.start.column + 1}`)
    lines.push(``)

    // Source context
    const sourceLines = this.source.split('\n')
    const startLine = Math.max(1, this.loc.start.line - 2)
    const endLine = Math.min(sourceLines.length, this.loc.end.line + 2)

    const lineNumWidth = String(endLine).length

    for (let i = startLine; i <= endLine; i++) {
      const lineNum = String(i).padStart(lineNumWidth, ' ')
      const line = sourceLines[i - 1] ?? ''

      if (i >= this.loc.start.line && i <= this.loc.end.line) {
        // Error line
        lines.push(`\x1b[1m\x1b[34m${lineNum} |\x1b[0m ${line}`)

        // Underline
        const startCol = i === this.loc.start.line ? this.loc.start.column : 0
        const endCol = i === this.loc.end.line ? this.loc.end.column : line.length

        const padding = ' '.repeat(lineNumWidth + 3 + startCol)
        const underline = '\x1b[1m\x1b[31m' + '^'.repeat(Math.max(1, endCol - startCol)) + '\x1b[0m'
        lines.push(`${padding}${underline}`)
      } else {
        // Context line
        lines.push(`\x1b[2m${lineNum} |\x1b[0m ${line}`)
      }
    }

    // Hint
    if (this.hint) {
      lines.push(``)
      lines.push(`\x1b[1m\x1b[36mhint\x1b[0m: ${this.hint}`)
    }

    lines.push(``)
    return lines.join('\n')
  }

  override toString(): string {
    return this.format()
  }
}

// =============================================================================
// ERROR BUILDER
// =============================================================================

export class ErrorBuilder {
  private filename: string
  private source: string

  constructor(filename: string, source: string) {
    this.filename = filename
    this.source = source
  }

  error(
    code: ErrorCode,
    message: string,
    loc: SourceLocation,
    hint?: string
  ): CompilerError {
    return new CompilerError(code, message, loc, this.filename, this.source, hint)
  }

  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================

  unclosedScript(loc: SourceLocation): CompilerError {
    return this.error(
      'UNCLOSED_SCRIPT',
      'Unclosed <script> block',
      loc,
      'Add </script> to close the script block'
    )
  }

  unclosedTag(tag: string, loc: SourceLocation): CompilerError {
    return this.error(
      'UNCLOSED_TAG',
      `Unclosed <${tag}> tag`,
      loc,
      `Add </${tag}> to close the tag, or use self-closing syntax: <${tag} />`
    )
  }

  unclosedExpression(loc: SourceLocation): CompilerError {
    return this.error(
      'UNCLOSED_EXPRESSION',
      'Unclosed expression',
      loc,
      'Add } to close the expression'
    )
  }

  unexpectedToken(expected: string, got: string, loc: SourceLocation): CompilerError {
    return this.error(
      'UNEXPECTED_TOKEN',
      `Expected ${expected}, got ${got}`,
      loc
    )
  }

  expectedToken(expected: string, loc: SourceLocation): CompilerError {
    return this.error(
      'EXPECTED_TOKEN',
      `Expected ${expected}`,
      loc
    )
  }

  unclosedBlock(block: string, loc: SourceLocation): CompilerError {
    return this.error(
      'UNCLOSED_BLOCK',
      `Unclosed {#${block}} block`,
      loc,
      `Add {/${block}} to close the block`
    )
  }

  invalidBlock(block: string, loc: SourceLocation): CompilerError {
    return this.error(
      'INVALID_BLOCK',
      `Unknown block type: ${block}`,
      loc,
      'Valid blocks are: if, each, await'
    )
  }

  invalidDirective(directive: string, loc: SourceLocation): CompilerError {
    return this.error(
      'INVALID_DIRECTIVE',
      `Invalid directive: ${directive}`,
      loc,
      'Valid directives are: bind:, on:'
    )
  }

  duplicateAttribute(name: string, loc: SourceLocation): CompilerError {
    return this.error(
      'DUPLICATE_ATTRIBUTE',
      `Duplicate attribute: ${name}`,
      loc,
      'Each attribute can only appear once per element'
    )
  }

  unknownComponent(name: string, loc: SourceLocation): CompilerError {
    return this.error(
      'UNKNOWN_COMPONENT',
      `Unknown component: ${name}`,
      loc,
      `Did you forget to import it? Add: import ${name} from './${name}.tui'`
    )
  }

  invalidExpression(expression: string, reason: string, loc: SourceLocation): CompilerError {
    return this.error(
      'INVALID_EXPRESSION',
      `Invalid expression: ${reason}`,
      loc,
      `Expression: ${expression}`
    )
  }

  undefinedVariable(name: string, loc: SourceLocation): CompilerError {
    return this.error(
      'UNDEFINED_VARIABLE',
      `Undefined variable: ${name}`,
      loc,
      'Make sure to declare the variable in the <script> block'
    )
  }

  internal(message: string, loc: SourceLocation): CompilerError {
    return this.error(
      'INTERNAL_ERROR',
      `Internal compiler error: ${message}`,
      loc,
      'This is a bug in the compiler. Please report it.'
    )
  }
}

// =============================================================================
// WARNING
// =============================================================================

export interface Warning {
  code: string
  message: string
  loc: SourceLocation
  hint?: string
}

export class WarningCollector {
  private filename: string
  private source: string
  private warnings: Warning[] = []

  constructor(filename: string, source: string) {
    this.filename = filename
    this.source = source
  }

  warn(code: string, message: string, loc: SourceLocation, hint?: string): void {
    this.warnings.push({ code, message, loc, hint })
  }

  getWarnings(): Warning[] {
    return this.warnings
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0
  }

  format(): string {
    return this.warnings.map(w => this.formatWarning(w)).join('\n')
  }

  private formatWarning(warning: Warning): string {
    const lines: string[] = []

    lines.push(`\x1b[1m\x1b[33mwarning[${warning.code}]\x1b[0m: ${warning.message}`)
    lines.push(`  \x1b[2m-->\x1b[0m ${this.filename}:${warning.loc.start.line}:${warning.loc.start.column + 1}`)

    if (warning.hint) {
      lines.push(`  \x1b[1m\x1b[36mhint\x1b[0m: ${warning.hint}`)
    }

    return lines.join('\n')
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a location from line/column (1-indexed line, 0-indexed column)
 */
export function loc(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
): SourceLocation {
  return {
    start: { line: startLine, column: startColumn, offset: 0 },
    end: { line: endLine, column: endColumn, offset: 0 },
  }
}

/**
 * Format an error for console output
 */
export function formatError(error: CompilerError): string {
  return error.format()
}

/**
 * Pretty print multiple errors
 */
export function formatErrors(errors: CompilerError[]): string {
  return errors.map(e => e.format()).join('\n')
}
