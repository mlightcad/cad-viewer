import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Options for prompting the user to enter a keyword,
 * similar to AutoCAD .NET `PromptKeywordOptions`.
 */
export class AcEdPromptKeywordOptions extends AcEdPromptOptions<string> {
  private _allowNone: boolean = false
  private _allowArbitraryInput: boolean = false

  /**
   * Constructs a new `AcEdPromptKeywordOptions` with a given prompt message.
   * @param message - The message shown to the user when prompting for a number.
   */
  constructor(message: string) {
    super(message)
  }

  /**
   * Gets or sets whether pressing ENTER alone (no input) is accepted.
   * Corresponds to `PromptKeywordOptions.AllowNone` in AutoCAD .NET API.
   */
  get allowNone(): boolean {
    return this._allowNone
  }
  set allowNone(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowNone = flag
    }
  }

  /**
   * Gets or sets whether arbitrary input is accepted.
   * If true, the prompt may allow strings or other input, depending on implementation.
   * Corresponds to `PromptKeywordOptions.AllowArbitraryInput` in AutoCAD .NET API.
   */
  get allowArbitraryInput(): boolean {
    return this._allowArbitraryInput
  }
  set allowArbitraryInput(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowArbitraryInput = flag
    }
  }
}
