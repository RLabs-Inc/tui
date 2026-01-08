/**
 * TUI Compiler - Lexer
 *
 * Tokenizes .tui source code into a stream of tokens.
 * Handles: <script>, template elements, expressions, control flow.
 *
 * Clean, direct, no defensive code.
 */

import { createPosition, type Position, type SourceLocation } from './ast'

// =============================================================================
// TOKEN TYPES
// =============================================================================

export type TokenType =
  // Structure
  | 'ScriptStart'       // <script> or <script lang="ts">
  | 'ScriptEnd'         // </script>
  | 'ScriptContent'     // Content inside script
  // Template
  | 'TagOpen'           // <
  | 'TagClose'          // >
  | 'TagSelfClose'      // />
  | 'TagEnd'            // </
  | 'TagName'           // box, text, etc.
  | 'AttributeName'     // width, variant, etc.
  | 'AttributeEquals'   // =
  | 'AttributeValue'    // "value" or 'value'
  | 'AttributeExpr'     // {expression}
  | 'Spread'            // {...props}
  | 'Shorthand'         // {name}
  // Directives
  | 'BindDirective'     // bind:name
  | 'OnDirective'       // on:event
  // Text and expressions
  | 'Text'              // Plain text content
  | 'ExpressionStart'   // {
  | 'ExpressionEnd'     // }
  | 'Expression'        // Content inside {}
  // Control flow
  | 'BlockOpen'         // {#
  | 'BlockContinue'     // {:
  | 'BlockClose'        // {/
  | 'BlockKeyword'      // if, each, await
  | 'BlockExpression'   // Condition or expression after keyword
  // Fragment
  | 'FragmentOpen'      // <>
  | 'FragmentClose'     // </>
  // Special
  | 'Whitespace'
  | 'EOF'

// =============================================================================
// TOKEN
// =============================================================================

export interface Token {
  type: TokenType
  value: string
  loc: SourceLocation
}

// =============================================================================
// LEXER STATE
// =============================================================================

type LexerMode = 'template' | 'script' | 'tag' | 'attribute'

export class Lexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 0
  private mode: LexerMode = 'template'
  private tokens: Token[] = []

  constructor(source: string) {
    this.source = source
  }

  tokenize(): Token[] {
    while (!this.isEOF()) {
      this.scanToken()
    }

    this.addToken('EOF', '')
    return this.tokens
  }

  // ===========================================================================
  // MAIN SCANNER
  // ===========================================================================

  private scanToken(): void {
    // Check for script block first
    if (this.mode === 'template' && this.match('<script')) {
      this.scanScriptBlock()
      return
    }

    // In script mode, just accumulate until </script>
    if (this.mode === 'script') {
      this.scanScriptContent()
      return
    }

    // Template mode
    if (this.mode === 'template') {
      this.scanTemplateContent()
      return
    }

    // Tag mode (inside an opening tag)
    if (this.mode === 'tag') {
      this.scanTagContent()
      return
    }
  }

  // ===========================================================================
  // SCRIPT SCANNING
  // ===========================================================================

  private scanScriptBlock(): void {
    const start = this.position()

    // Consume <script
    this.advance(7) // '<script'

    // Check for lang attribute
    let lang: 'js' | 'ts' = 'js'
    this.skipWhitespace()

    if (this.match('lang=')) {
      this.advance(5)
      const quote = this.peek()
      if (quote === '"' || quote === "'") {
        this.advance(1)
        if (this.match('ts')) {
          lang = 'ts'
          this.advance(2)
        } else if (this.match('js')) {
          this.advance(2)
        }
        this.advance(1) // closing quote
      }
    }

    this.skipWhitespace()

    // Consume >
    if (this.peek() === '>') {
      this.advance(1)
    }

    this.addToken('ScriptStart', lang, start)
    this.mode = 'script'
  }

  private scanScriptContent(): void {
    const start = this.position()
    let content = ''

    while (!this.isEOF()) {
      if (this.match('</script>')) {
        // End of script
        if (content.trim()) {
          this.addToken('ScriptContent', content, start)
        }
        const endStart = this.position()
        this.advance(9) // </script>
        this.addToken('ScriptEnd', '</script>', endStart)
        this.mode = 'template'
        return
      }
      content += this.advance(1)
    }

    // Unclosed script
    if (content) {
      this.addToken('ScriptContent', content, start)
    }
  }

  // ===========================================================================
  // TEMPLATE SCANNING
  // ===========================================================================

  private scanTemplateContent(): void {
    // Check for fragment
    if (this.match('<>')) {
      this.addToken('FragmentOpen', '<>', this.position())
      this.advance(2)
      return
    }

    if (this.match('</>')) {
      this.addToken('FragmentClose', '</>', this.position())
      this.advance(3)
      return
    }

    // Check for control flow blocks
    if (this.match('{#')) {
      this.scanBlockOpen()
      return
    }

    if (this.match('{:')) {
      this.scanBlockContinue()
      return
    }

    if (this.match('{/')) {
      this.scanBlockClose()
      return
    }

    // Check for expression
    if (this.peek() === '{') {
      this.scanExpression()
      return
    }

    // Check for closing tag
    if (this.match('</')) {
      this.scanClosingTag()
      return
    }

    // Check for opening tag
    if (this.peek() === '<') {
      this.scanOpeningTag()
      return
    }

    // Plain text
    this.scanText()
  }

  // ===========================================================================
  // TAG SCANNING
  // ===========================================================================

  private scanOpeningTag(): void {
    const start = this.position()
    this.advance(1) // <
    this.addToken('TagOpen', '<', start)

    // Scan tag name
    const nameStart = this.position()
    let name = ''
    while (!this.isEOF() && this.isTagNameChar(this.peek())) {
      name += this.advance(1)
    }
    this.addToken('TagName', name, nameStart)

    this.mode = 'tag'
  }

  private scanClosingTag(): void {
    const start = this.position()
    this.advance(2) // </
    this.addToken('TagEnd', '</', start)

    // Scan tag name
    const nameStart = this.position()
    let name = ''
    while (!this.isEOF() && this.isTagNameChar(this.peek())) {
      name += this.advance(1)
    }
    this.addToken('TagName', name, nameStart)

    this.skipWhitespace()
    if (this.peek() === '>') {
      const closeStart = this.position()
      this.advance(1)
      this.addToken('TagClose', '>', closeStart)
    }
  }

  private scanTagContent(): void {
    this.skipWhitespace()

    // Self-closing />
    if (this.match('/>')) {
      this.addToken('TagSelfClose', '/>', this.position())
      this.advance(2)
      this.mode = 'template'
      return
    }

    // Closing >
    if (this.peek() === '>') {
      this.addToken('TagClose', '>', this.position())
      this.advance(1)
      this.mode = 'template'
      return
    }

    // Spread {...props}
    if (this.match('{...')) {
      this.scanSpread()
      return
    }

    // Shorthand {name}
    if (this.peek() === '{') {
      this.scanShorthandOrExpr()
      return
    }

    // Attribute
    this.scanAttribute()
  }

  private scanAttribute(): void {
    const start = this.position()
    let name = ''

    // Scan attribute name (may include : for directives)
    while (!this.isEOF() && (this.isTagNameChar(this.peek()) || this.peek() === ':')) {
      name += this.advance(1)
    }

    if (!name) return

    // Check for directives
    if (name.startsWith('bind:')) {
      this.addToken('BindDirective', name, start)
    } else if (name.startsWith('on:')) {
      this.addToken('OnDirective', name, start)
    } else {
      this.addToken('AttributeName', name, start)
    }

    this.skipWhitespace()

    // Check for =
    if (this.peek() === '=') {
      this.addToken('AttributeEquals', '=', this.position())
      this.advance(1)
      this.skipWhitespace()

      // Value
      if (this.peek() === '"' || this.peek() === "'") {
        this.scanAttributeString()
      } else if (this.peek() === '{') {
        this.scanAttributeExpression()
      }
    }
  }

  private scanAttributeString(): void {
    const start = this.position()
    const quote = this.advance(1)
    let value = ''

    while (!this.isEOF() && this.peek() !== quote) {
      value += this.advance(1)
    }

    if (this.peek() === quote) {
      this.advance(1)
    }

    this.addToken('AttributeValue', value, start)
  }

  private scanAttributeExpression(): void {
    const start = this.position()
    this.advance(1) // {

    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    this.addToken('AttributeExpr', expr, start)
  }

  private scanSpread(): void {
    const start = this.position()
    this.advance(4) // {...

    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    this.addToken('Spread', expr, start)
  }

  private scanShorthandOrExpr(): void {
    const start = this.position()
    this.advance(1) // {

    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    // If it's a simple identifier, it's a shorthand
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expr.trim())) {
      this.addToken('Shorthand', expr.trim(), start)
    } else {
      this.addToken('AttributeExpr', expr, start)
    }
  }

  // ===========================================================================
  // EXPRESSION AND TEXT SCANNING
  // ===========================================================================

  private scanExpression(): void {
    const start = this.position()
    this.advance(1) // {

    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    this.addToken('Expression', expr, start)
  }

  private scanText(): void {
    const start = this.position()
    let text = ''

    while (!this.isEOF()) {
      const ch = this.peek()

      // Stop at special characters
      if (ch === '<' || ch === '{') break

      text += this.advance(1)
    }

    if (text) {
      this.addToken('Text', text, start)
    }
  }

  // ===========================================================================
  // CONTROL FLOW BLOCKS
  // ===========================================================================

  private scanBlockOpen(): void {
    const start = this.position()
    this.advance(2) // {#
    this.addToken('BlockOpen', '{#', start)

    // Scan keyword
    const keywordStart = this.position()
    let keyword = ''
    while (!this.isEOF() && /[a-z]/.test(this.peek())) {
      keyword += this.advance(1)
    }
    this.addToken('BlockKeyword', keyword, keywordStart)

    // Scan expression until }
    this.skipWhitespace()
    const exprStart = this.position()
    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    if (expr.trim()) {
      this.addToken('BlockExpression', expr.trim(), exprStart)
    }
  }

  private scanBlockContinue(): void {
    const start = this.position()
    this.advance(2) // {:
    this.addToken('BlockContinue', '{:', start)

    // Scan keyword
    const keywordStart = this.position()
    let keyword = ''
    while (!this.isEOF() && /[a-z]/.test(this.peek())) {
      keyword += this.advance(1)
    }
    this.addToken('BlockKeyword', keyword, keywordStart)

    // Scan expression until }
    this.skipWhitespace()
    const exprStart = this.position()
    let expr = ''
    let depth = 1

    while (!this.isEOF() && depth > 0) {
      const ch = this.peek()
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth > 0) {
        expr += this.advance(1)
      } else {
        this.advance(1)
      }
    }

    if (expr.trim()) {
      this.addToken('BlockExpression', expr.trim(), exprStart)
    }
  }

  private scanBlockClose(): void {
    const start = this.position()
    this.advance(2) // {/
    this.addToken('BlockClose', '{/', start)

    // Scan keyword
    const keywordStart = this.position()
    let keyword = ''
    while (!this.isEOF() && /[a-z]/.test(this.peek())) {
      keyword += this.advance(1)
    }
    this.addToken('BlockKeyword', keyword, keywordStart)

    // Skip to }
    while (!this.isEOF() && this.peek() !== '}') {
      this.advance(1)
    }
    if (this.peek() === '}') {
      this.advance(1)
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private isEOF(): boolean {
    return this.pos >= this.source.length
  }

  private peek(offset: number = 0): string {
    return this.source[this.pos + offset] ?? ''
  }

  private match(str: string): boolean {
    return this.source.slice(this.pos, this.pos + str.length) === str
  }

  private advance(count: number = 1): string {
    let result = ''
    for (let i = 0; i < count && !this.isEOF(); i++) {
      const ch = this.source[this.pos]!
      result += ch
      this.pos++
      if (ch === '\n') {
        this.line++
        this.column = 0
      } else {
        this.column++
      }
    }
    return result
  }

  private skipWhitespace(): void {
    while (!this.isEOF() && /\s/.test(this.peek())) {
      this.advance(1)
    }
  }

  private isTagNameChar(ch: string): boolean {
    return /[a-zA-Z0-9_-]/.test(ch)
  }

  private position(): Position {
    return createPosition(this.line, this.column, this.pos)
  }

  private addToken(type: TokenType, value: string, start?: Position): void {
    const tokenStart = start ?? this.position()
    const tokenEnd = this.position()

    this.tokens.push({
      type,
      value,
      loc: {
        start: tokenStart,
        end: tokenEnd,
      },
    })
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source)
  return lexer.tokenize()
}
