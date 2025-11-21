import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Options for prompting the user to enter a string, similar to
 * AutoCAD .NET `PromptStringOptions`.
 *
 * Allows configuration of whether spaces are permitted, default values,
 * and whether the default should be used when the user presses ENTER.
 */
export class AcEdPromptStringOptions extends AcEdPromptOptions<string> {
  private _allowSpaces: boolean = true
  private _allowEmpty: boolean = false
  private _maxLength?: number
  private _defaultValue: string = ''
  private _useDefaultValue: boolean = false

  /**
   * Constructs a new `AcEdPromptStringOptions` with a given prompt message.
   * @param message - The message shown to the user when prompting for a string.
   */
  constructor(message: string) {
    super(message)
  }

  /**
   * Gets or sets whether spaces are allowed in the input string.
   * If `false`, pressing the spacebar may terminate the input (depending on implementation).
   * Corresponds to `PromptStringOptions.AllowSpaces` in AutoCAD .NET.
   */
  get allowSpaces(): boolean {
    return this._allowSpaces
  }
  set allowSpaces(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowSpaces = flag
    }
  }

  /**
   * When true, an empty string is considered valid input.
   * Default: `false` — empty string is not allowed.
   */
  get allowEmpty(): boolean {
    return this._allowEmpty
  }
  set allowEmpty(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowEmpty = flag
    }
  }

  /**
   * Maximum allowed number of characters in the input string.
   * If `undefined`, there is no length restriction.
   */
  get maxLength(): number | undefined {
    return this._maxLength
  }
  set maxLength(value: number | undefined) {
    if (!this.isReadOnly) {
      this._maxLength = value
    }
  }

  /**
   * Gets or sets the default string value.
   * This value may be used if the user presses ENTER, depending on `useDefaultValue`.
   * Corresponds to `PromptStringOptions.DefaultValue` in AutoCAD .NET.
   */
  get defaultValue(): string {
    return this._defaultValue
  }
  set defaultValue(val: string) {
    if (!this.isReadOnly) {
      this._defaultValue = val
    }
  }

  /**
   * Gets or sets whether the default value should be used when the user presses ENTER
   * without entering any other input.
   * Corresponds to `PromptStringOptions.UseDefaultValue` in AutoCAD .NET.
   */
  get useDefaultValue(): boolean {
    return this._useDefaultValue
  }
  set useDefaultValue(flag: boolean) {
    if (!this.isReadOnly) {
      this._useDefaultValue = flag
    }
  }
}
