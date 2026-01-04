import { AcEdKeywordHandler } from '../handler/AcEdKeywordHandler'
import { AcEdPromptKeywordOptions } from '../prompt/AcEdPromptKeywordOptions'
import { AcEdCommandLine } from '../ui/AcEdCommandLine'
import { AcEdInputSession } from './AcEdInputSession'

export class AcEdKeywordSession extends AcEdInputSession<string> {
  private handler: AcEdKeywordHandler

  constructor(
    private cli: AcEdCommandLine,
    private options: AcEdPromptKeywordOptions
  ) {
    super()
    this.handler = new AcEdKeywordHandler(options)
  }

  protected onStart(): void {
    this.cli.clearInput()
    this.cli.renderKeywordPrompt(this.options, kw => this.finish(kw))
    this.cli.focusInput()
  }

  handleEnter(value: string): boolean {
    const parsed = this.handler.parse(value)
    if (parsed !== null) {
      this.finish(parsed)
      return true
    }
    return false
  }

  handleEscape(): void {
    this.finish('')
  }

  protected cleanup(): void {
    this.cli.clearPrompt()
    this.cli.clearInput()
  }
}
