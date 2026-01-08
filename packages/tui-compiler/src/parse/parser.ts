/**
 * TUI Compiler - Parser
 *
 * Transforms tokens into an AST.
 * Clean, direct, good error messages.
 */

import { tokenize, type Token, type TokenType } from './lexer'
import {
  type TuiFile,
  type ScriptBlock,
  type TemplateNode,
  type Element,
  type Attribute,
  type TextNode,
  type ExpressionNode,
  type IfBlock,
  type EachBlock,
  type AwaitBlock,
  type Fragment,
  type Slot,
  type SourceLocation,
  createLocation,
  createPosition,
} from './ast'
import { ErrorBuilder, type CompilerError } from '../utils/errors'

// =============================================================================
// PARSER
// =============================================================================

export class Parser {
  private tokens: Token[]
  private pos: number = 0
  private errors: ErrorBuilder
  private filename: string
  private source: string

  constructor(source: string, filename: string = 'input.tui') {
    this.source = source
    this.filename = filename
    this.tokens = tokenize(source)
    this.errors = new ErrorBuilder(filename, source)
  }

  parse(): TuiFile {
    const start = this.position()

    let script: ScriptBlock | null = null
    const template: TemplateNode[] = []

    while (!this.isEOF()) {
      // Script block
      if (this.check('ScriptStart')) {
        script = this.parseScriptBlock()
        continue
      }

      // Template content
      const node = this.parseTemplateNode()
      if (node) {
        template.push(node)
      }
    }

    return {
      type: 'TuiFile',
      script,
      template,
      loc: createLocation(start, this.position()),
    }
  }

  // ===========================================================================
  // SCRIPT BLOCK
  // ===========================================================================

  private parseScriptBlock(): ScriptBlock {
    const start = this.position()
    const langToken = this.consume('ScriptStart')
    const lang = langToken.value === 'ts' ? 'ts' : 'js'

    let content = ''
    if (this.check('ScriptContent')) {
      content = this.consume('ScriptContent').value
    }

    this.expect('ScriptEnd')

    return {
      type: 'ScriptBlock',
      lang,
      content,
      imports: [], // Will be analyzed later
      exports: [], // Will be analyzed later
      loc: createLocation(start, this.position()),
    }
  }

  // ===========================================================================
  // TEMPLATE NODES
  // ===========================================================================

  private parseTemplateNode(): TemplateNode | null {
    // Skip whitespace-only text between elements
    if (this.check('Text')) {
      const text = this.peek().value
      if (text.trim() === '') {
        this.advance()
        return null
      }
    }

    // Fragment
    if (this.check('FragmentOpen')) {
      return this.parseFragment()
    }

    // Control flow blocks
    if (this.check('BlockOpen')) {
      return this.parseBlock()
    }

    // Expression
    if (this.check('Expression')) {
      return this.parseExpression()
    }

    // Element
    if (this.check('TagOpen')) {
      return this.parseElement()
    }

    // Text
    if (this.check('Text')) {
      return this.parseText()
    }

    // Skip unknown tokens
    if (!this.isEOF()) {
      this.advance()
    }

    return null
  }

  // ===========================================================================
  // ELEMENTS
  // ===========================================================================

  private parseElement(): Element | Slot {
    const start = this.position()

    this.consume('TagOpen')
    const tagToken = this.consume('TagName')
    const tag = tagToken.value

    const attributes = this.parseAttributes()

    // Handle <slot> elements specially
    if (tag === 'slot') {
      return this.parseSlotElement(start, attributes)
    }

    // Self-closing
    if (this.check('TagSelfClose')) {
      this.consume('TagSelfClose')
      return {
        type: 'Element',
        tag,
        attributes,
        children: [],
        selfClosing: true,
        loc: createLocation(start, this.position()),
      }
    }

    // Opening tag close
    this.expect('TagClose')

    // Children
    const children = this.parseChildren(tag)

    // Closing tag
    if (this.check('TagEnd')) {
      this.consume('TagEnd')
      const closingTag = this.consume('TagName').value
      if (closingTag !== tag) {
        throw this.errors.unexpectedToken(
          `</${tag}>`,
          `</${closingTag}>`,
          this.peek().loc
        )
      }
      this.expect('TagClose')
    }

    return {
      type: 'Element',
      tag,
      attributes,
      children,
      selfClosing: false,
      loc: createLocation(start, this.position()),
    }
  }

  private parseSlotElement(
    start: ReturnType<typeof this.position>,
    attributes: Attribute[]
  ): Slot {
    // Extract slot name from attributes
    let name: string | null = null
    for (const attr of attributes) {
      if (attr.type === 'StaticAttribute' && attr.name === 'name') {
        name = attr.value
        break
      }
    }

    // Check for self-closing or children (fallback content)
    let fallback: TemplateNode[] = []

    if (this.check('TagSelfClose')) {
      this.consume('TagSelfClose')
    } else {
      this.expect('TagClose')
      fallback = this.parseChildren('slot')

      // Consume closing tag
      if (this.check('TagEnd')) {
        this.consume('TagEnd')
        this.consume('TagName') // 'slot'
        this.expect('TagClose')
      }
    }

    return {
      type: 'Slot',
      name,
      fallback,
      loc: createLocation(start, this.position()),
    }
  }

  private parseAttributes(): Attribute[] {
    const attributes: Attribute[] = []

    while (!this.check('TagClose') && !this.check('TagSelfClose') && !this.isEOF()) {
      const attr = this.parseAttribute()
      if (attr) {
        attributes.push(attr)
      }
    }

    return attributes
  }

  private parseAttribute(): Attribute | null {
    const start = this.position()

    // Spread
    if (this.check('Spread')) {
      const token = this.consume('Spread')
      return {
        type: 'SpreadAttribute',
        expression: token.value,
        loc: createLocation(start, this.position()),
      }
    }

    // Shorthand
    if (this.check('Shorthand')) {
      const token = this.consume('Shorthand')
      return {
        type: 'ShorthandAttribute',
        name: token.value,
        loc: createLocation(start, this.position()),
      }
    }

    // Bind directive
    if (this.check('BindDirective')) {
      const token = this.consume('BindDirective')
      const name = token.value.slice(5) // Remove 'bind:'
      this.expect('AttributeEquals')

      let expression = ''
      if (this.check('AttributeExpr')) {
        expression = this.consume('AttributeExpr').value
      } else if (this.check('AttributeValue')) {
        expression = this.consume('AttributeValue').value
      }

      return {
        type: 'BindDirective',
        name,
        expression,
        loc: createLocation(start, this.position()),
      }
    }

    // Event directive
    if (this.check('OnDirective')) {
      const token = this.consume('OnDirective')
      const parts = token.value.slice(3).split(':') // Remove 'on:', split by ':'
      const name = parts[0]!
      const modifiers = parts.slice(1)

      this.expect('AttributeEquals')

      let handler = ''
      if (this.check('AttributeExpr')) {
        handler = this.consume('AttributeExpr').value
      } else if (this.check('AttributeValue')) {
        handler = this.consume('AttributeValue').value
      }

      return {
        type: 'EventDirective',
        name,
        handler,
        modifiers,
        loc: createLocation(start, this.position()),
      }
    }

    // Regular attribute
    if (this.check('AttributeName')) {
      const nameToken = this.consume('AttributeName')
      const name = nameToken.value

      // Boolean attribute (no value)
      if (!this.check('AttributeEquals')) {
        return {
          type: 'StaticAttribute',
          name,
          value: 'true',
          loc: createLocation(start, this.position()),
        }
      }

      this.consume('AttributeEquals')

      // Dynamic value
      if (this.check('AttributeExpr')) {
        const expr = this.consume('AttributeExpr').value
        return {
          type: 'DynamicAttribute',
          name,
          expression: expr,
          loc: createLocation(start, this.position()),
        }
      }

      // Static value
      if (this.check('AttributeValue')) {
        const value = this.consume('AttributeValue').value
        return {
          type: 'StaticAttribute',
          name,
          value,
          loc: createLocation(start, this.position()),
        }
      }
    }

    return null
  }

  private parseChildren(parentTag: string): TemplateNode[] {
    const children: TemplateNode[] = []

    while (!this.isEOF()) {
      // Check for closing tag
      if (this.check('TagEnd')) {
        break
      }

      // Check for block close (shouldn't happen in element children)
      if (this.check('BlockClose') || this.check('BlockContinue')) {
        break
      }

      const node = this.parseTemplateNode()
      if (node) {
        children.push(node)
      }
    }

    return children
  }

  // ===========================================================================
  // TEXT AND EXPRESSIONS
  // ===========================================================================

  private parseText(): TextNode {
    const start = this.position()
    const token = this.consume('Text')

    return {
      type: 'TextNode',
      value: token.value,
      raw: token.value,
      loc: createLocation(start, this.position()),
    }
  }

  private parseExpression(): ExpressionNode {
    const start = this.position()
    const token = this.consume('Expression')

    return {
      type: 'ExpressionNode',
      expression: token.value,
      inText: true,
      loc: createLocation(start, this.position()),
    }
  }

  // ===========================================================================
  // CONTROL FLOW BLOCKS
  // ===========================================================================

  private parseBlock(): TemplateNode {
    const start = this.position()
    this.consume('BlockOpen')
    const keyword = this.consume('BlockKeyword').value

    switch (keyword) {
      case 'if':
        return this.parseIfBlock(start)
      case 'each':
        return this.parseEachBlock(start)
      case 'await':
        return this.parseAwaitBlock(start)
      default:
        throw this.errors.invalidBlock(keyword, this.peek().loc)
    }
  }

  private parseIfBlock(start: ReturnType<typeof this.position>): IfBlock {
    const condition = this.check('BlockExpression')
      ? this.consume('BlockExpression').value
      : ''

    const consequent = this.parseBlockBody('if')

    let alternate: IfBlock | TemplateNode[] | null = null

    // Check for {:else if} or {:else}
    if (this.check('BlockContinue')) {
      this.consume('BlockContinue')
      const keyword = this.consume('BlockKeyword').value

      if (keyword === 'else') {
        // Check if it's {:else if}
        if (this.check('BlockKeyword')) {
          const nextKeyword = this.peek().value
          if (nextKeyword === 'if') {
            this.consume('BlockKeyword')
            alternate = this.parseIfBlock(this.position())
            alternate.isElseIf = true
            return {
              type: 'IfBlock',
              condition,
              consequent,
              alternate,
              isElseIf: false,
              loc: createLocation(start, this.position()),
            }
          }
        }

        // Check for expression (else if condition)
        if (this.check('BlockExpression')) {
          const elseCondition = this.consume('BlockExpression').value
          if (elseCondition.startsWith('if ')) {
            alternate = this.parseIfBlock(this.position())
            ;(alternate as IfBlock).condition = elseCondition.slice(3).trim()
            ;(alternate as IfBlock).isElseIf = true
            return {
              type: 'IfBlock',
              condition,
              consequent,
              alternate,
              isElseIf: false,
              loc: createLocation(start, this.position()),
            }
          }
        }

        // Plain {:else}
        alternate = this.parseBlockBody('if')
      }
    }

    // Consume {/if}
    if (this.check('BlockClose')) {
      this.consume('BlockClose')
      if (this.check('BlockKeyword')) {
        this.consume('BlockKeyword') // 'if'
      }
    }

    return {
      type: 'IfBlock',
      condition,
      consequent,
      alternate,
      isElseIf: false,
      loc: createLocation(start, this.position()),
    }
  }

  private parseEachBlock(start: ReturnType<typeof this.position>): EachBlock {
    const exprToken = this.check('BlockExpression')
      ? this.consume('BlockExpression').value
      : ''

    // Parse "items as item, index (key)"
    const asMatch = exprToken.match(/^(.+?)\s+as\s+(\w+)(?:\s*,\s*(\w+))?(?:\s*\((.+)\))?$/)

    let expression = exprToken
    let item = 'item'
    let index: string | null = null
    let key: string | null = null

    if (asMatch) {
      expression = asMatch[1]!.trim()
      item = asMatch[2]!
      index = asMatch[3] ?? null
      key = asMatch[4] ?? null
    }

    const body = this.parseBlockBody('each')

    let fallback: TemplateNode[] | null = null

    // Check for {:else}
    if (this.check('BlockContinue')) {
      this.consume('BlockContinue')
      const keyword = this.consume('BlockKeyword').value
      if (keyword === 'else') {
        fallback = this.parseBlockBody('each')
      }
    }

    // Consume {/each}
    if (this.check('BlockClose')) {
      this.consume('BlockClose')
      if (this.check('BlockKeyword')) {
        this.consume('BlockKeyword') // 'each'
      }
    }

    return {
      type: 'EachBlock',
      expression,
      item,
      index,
      key,
      body,
      fallback,
      loc: createLocation(start, this.position()),
    }
  }

  private parseAwaitBlock(start: ReturnType<typeof this.position>): AwaitBlock {
    const expression = this.check('BlockExpression')
      ? this.consume('BlockExpression').value
      : ''

    const pending = this.parseBlockBody('await')

    let value: string | null = null
    let fulfilled: TemplateNode[] = []
    let error: string | null = null
    let rejected: TemplateNode[] = []

    // Check for {:then value}
    if (this.check('BlockContinue')) {
      this.consume('BlockContinue')
      const keyword = this.consume('BlockKeyword').value

      if (keyword === 'then') {
        if (this.check('BlockExpression')) {
          value = this.consume('BlockExpression').value.trim()
        }
        fulfilled = this.parseBlockBody('await')
      }
    }

    // Check for {:catch error}
    if (this.check('BlockContinue')) {
      this.consume('BlockContinue')
      const keyword = this.consume('BlockKeyword').value

      if (keyword === 'catch') {
        if (this.check('BlockExpression')) {
          error = this.consume('BlockExpression').value.trim()
        }
        rejected = this.parseBlockBody('await')
      }
    }

    // Consume {/await}
    if (this.check('BlockClose')) {
      this.consume('BlockClose')
      if (this.check('BlockKeyword')) {
        this.consume('BlockKeyword') // 'await'
      }
    }

    return {
      type: 'AwaitBlock',
      expression,
      pending,
      value,
      fulfilled,
      error,
      rejected,
      loc: createLocation(start, this.position()),
    }
  }

  private parseBlockBody(blockType: string): TemplateNode[] {
    const body: TemplateNode[] = []

    while (!this.isEOF()) {
      // End of block
      if (this.check('BlockClose') || this.check('BlockContinue')) {
        break
      }

      const node = this.parseTemplateNode()
      if (node) {
        body.push(node)
      }
    }

    return body
  }

  // ===========================================================================
  // FRAGMENT
  // ===========================================================================

  private parseFragment(): Fragment {
    const start = this.position()
    this.consume('FragmentOpen')

    const children: TemplateNode[] = []

    while (!this.check('FragmentClose') && !this.isEOF()) {
      const node = this.parseTemplateNode()
      if (node) {
        children.push(node)
      }
    }

    this.expect('FragmentClose')

    return {
      type: 'Fragment',
      children,
      loc: createLocation(start, this.position()),
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private isEOF(): boolean {
    return this.pos >= this.tokens.length || this.peek().type === 'EOF'
  }

  private peek(offset: number = 0): Token {
    const idx = this.pos + offset
    if (idx >= this.tokens.length) {
      return {
        type: 'EOF',
        value: '',
        loc: {
          start: createPosition(1, 0, 0),
          end: createPosition(1, 0, 0),
        },
      }
    }
    return this.tokens[idx]!
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isEOF()) {
      this.pos++
    }
    return this.tokens[this.pos - 1]!
  }

  private consume(type: TokenType): Token {
    if (!this.check(type)) {
      throw this.errors.unexpectedToken(
        type,
        this.peek().type,
        this.peek().loc
      )
    }
    return this.advance()
  }

  private expect(type: TokenType): void {
    if (!this.check(type)) {
      throw this.errors.expectedToken(type, this.peek().loc)
    }
    this.advance()
  }

  private position(): ReturnType<typeof createPosition> {
    return this.peek().loc.start
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export function parse(source: string, filename?: string): TuiFile {
  const parser = new Parser(source, filename)
  return parser.parse()
}
