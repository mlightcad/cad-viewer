import { AcEdKeywordHandler } from '../handler/AcEdKeywordHandler'
import { AcEdPromptKeywordOptions } from '../prompt/AcEdPromptKeywordOptions'
import { AcEdCommandLine } from '../ui/AcEdCommandLine'
import { AcEdInputSession } from './AcEdInputSession'

/**
 * Interactive keyword-input session bound to the command line.
 *
 * This session is responsible for:
 * - Rendering the keyword prompt UI
 * - Applying Enter/Escape behavior for keyword picking
 * - Handling default-keyword and `AllowNone` semantics on empty Enter
 * - Restoring command-line input state when the session ends
 *
 * The resolved session value is always a string:
 * - keyword global name when a keyword is selected
 * - empty string when the prompt ends as "none"/cancel path
 */
export class AcEdKeywordSession extends AcEdInputSession<string> {
  /**
   * Keyword parser/validator shared by Enter handling.
   *
   * It maps user input (display/local/global/alias) to canonical
   * global keyword names and rejects invalid text.
   */
  private handler: AcEdKeywordHandler

  /**
   * Creates a keyword session instance.
   *
   * @param cli - Command-line UI adapter used to render prompt and control input state
   * @param options - Keyword prompt options (message, keyword set, default, `allowNone`)
   * @param allowTyping - When false, typed input is disabled and only clickable keywords are accepted
   */
  constructor(
    private cli: AcEdCommandLine,
    private options: AcEdPromptKeywordOptions,
    private allowTyping: boolean = true
  ) {
    super()
    this.handler = new AcEdKeywordHandler(options)
  }

  /**
   * Initializes session UI state.
   *
   * Behavior:
   * - Clears any stale command-line input text
   * - Sets input read-only depending on `allowTyping`
   * - Renders clickable keyword prompt
   * - Focuses command-line input for immediate interaction
   */
  protected onStart(): void {
    this.cli.clearInput()
    this.cli.setInputReadOnly(!this.allowTyping)
    this.cli.renderKeywordPrompt(this.options, kw => this.finish(kw))
    this.cli.focusInput()
  }

  /**
   * Handles Enter key input for this keyword session.
   *
   * Resolution order:
   * 1. If typing is disabled, Enter is treated as consumed.
   * 2. Empty input:
   *    - use default keyword when present and enabled
   *    - otherwise resolve empty string when `allowNone` is true
   *    - otherwise reject as invalid (session remains active)
   * 3. Non-empty input:
   *    - parse as keyword via {@link AcEdKeywordHandler}
   *    - resolve parsed global keyword when valid
   *    - reject when invalid
   *
   * @param value - Raw text currently typed in command-line input
   * @returns `true` when Enter is consumed; `false` when input is invalid
   */
  handleEnter(value: string): boolean {
    if (!this.allowTyping) return true
    if (!value.trim()) {
      const defaultKeyword = this.options.keywords.default
      if (defaultKeyword?.enabled) {
        this.finish(defaultKeyword.globalName)
        return true
      }
      if (this.options.allowNone) {
        this.finish('')
        return true
      }
      return false
    }
    const parsed = this.handler.parse(value)
    if (parsed !== null) {
      this.finish(parsed)
      return true
    }
    return false
  }

  /**
   * Handles Escape key for this session.
   *
   * Escape resolves the session with an empty string, which the caller
   * interprets as cancel/none depending on prompt context.
   */
  handleEscape(): void {
    this.finish('')
  }

  /**
   * Restores command-line state after session completion.
   *
   * This always:
   * - Re-enables input editing
   * - Clears prompt/input visuals from command line
   */
  protected cleanup(): void {
    this.cli.setInputReadOnly(false)
    this.cli.clear()
  }
}
