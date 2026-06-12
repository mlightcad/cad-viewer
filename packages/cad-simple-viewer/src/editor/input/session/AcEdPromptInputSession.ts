import { AcEdKeywordHandler } from '../handler/AcEdKeywordHandler'
import { AcEdPromptKeywordOptions } from '../prompt/AcEdPromptKeywordOptions'
import { AcEdCommandLine } from '../ui/AcEdCommandLine'
import { AcEdInputSession } from './AcEdInputSession'

/**
 * Resolution mode for mixed command-line prompt sessions.
 *
 * - `geometric`: try coordinate/numeric parsing first, then keywords
 * - `string`: try keywords first, then accept arbitrary string input
 * - `keyword`: keywords only (same as {@link AcEdKeywordSession})
 */
export type AcEdPromptInputMode = 'geometric' | 'string' | 'keyword'

/**
 * Result produced by a mixed prompt-input session.
 */
export type AcEdPromptInputResult<T> =
  | { kind: 'value'; value: T }
  | { kind: 'keyword'; keyword: string }
  | { kind: 'none' }

/**
 * Interactive command-line session that accepts geometric or textual prompt
 * input together with optional keywords, using AutoCAD-style precedence rules.
 */
export class AcEdPromptInputSession<T> extends AcEdInputSession<
  AcEdPromptInputResult<T>
> {
  private keywordHandler?: AcEdKeywordHandler

  /**
   * @param cli - Command-line UI adapter
   * @param options - Keyword prompt options used for rendering and keyword parsing
   * @param parseValue - Parser for the prompt's primary value type
   * @param mode - Precedence rules between data and keyword resolution
   * @param allowNone - Whether empty Enter is accepted as `none`
   * @param allowTyping - Whether typed input is accepted
   */
  constructor(
    private cli: AcEdCommandLine,
    private options: AcEdPromptKeywordOptions,
    private parseValue: (text: string) => T | null,
    private mode: AcEdPromptInputMode,
    private allowNone: boolean,
    private allowTyping: boolean = true
  ) {
    super()
    if (this.options.keywords.count > 0) {
      this.keywordHandler = new AcEdKeywordHandler(this.options)
    }
  }

  protected onStart(): void {
    this.cli.clearInput()
    this.cli.setInputReadOnly(!this.allowTyping)
    this.cli.renderKeywordPrompt(this.options, kw =>
      this.finish({ kind: 'keyword', keyword: kw })
    )
    this.cli.focusInput()
  }

  handleEnter(value: string): boolean {
    if (!this.allowTyping) return true

    if (!value.trim()) {
      const defaultKeyword = this.options.keywords.default
      if (defaultKeyword?.enabled) {
        this.finish({ kind: 'keyword', keyword: defaultKeyword.globalName })
        return true
      }
      if (this.allowNone) {
        this.finish({ kind: 'none' })
        return true
      }
      return false
    }

    if (this.mode === 'keyword') {
      return this.tryResolveKeyword(value)
    }

    if (this.mode === 'string') {
      if (this.tryResolveKeyword(value)) return true
      const parsed = this.parseValue(value)
      if (parsed !== null) {
        this.finish({ kind: 'value', value: parsed })
        return true
      }
      return false
    }

    const parsed = this.parseValue(value)
    if (parsed !== null) {
      this.finish({ kind: 'value', value: parsed })
      return true
    }

    return this.tryResolveKeyword(value)
  }

  handleEscape(): void {
    this.finish({ kind: 'none' })
  }

  protected cleanup(): void {
    this.cli.setInputReadOnly(false)
    this.cli.clear()
  }

  private tryResolveKeyword(value: string): boolean {
    if (!this.keywordHandler) return false
    const parsed = this.keywordHandler.parse(value)
    if (parsed === null) return false
    this.finish({ kind: 'keyword', keyword: parsed })
    return true
  }
}
