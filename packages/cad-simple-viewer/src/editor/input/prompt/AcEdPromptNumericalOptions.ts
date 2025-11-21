import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Options for prompting the user to enter a numerical value (integer, double, etc.),
 * similar to AutoCAD .NET `PromptNumericalOptions`.
 *
 * Supports default value, allowing zero / negative, and whether Enter (no input) is accepted.
 */
export class AcEdPromptNumericalOptions extends AcEdPromptOptions<number> {
  private _defaultValue: number = 0
  private _useDefaultValue: boolean = false
  private _allowNone: boolean = false
  private _allowArbitraryInput: boolean = false
  private _allowNegative: boolean = false
  private _allowZero: boolean = true

  /**
   * Constructs a new `AcEdPromptNumericalOptions` with a given prompt message.
   * @param message - The message shown to the user when prompting for a number.
   */
  constructor(message: string) {
    super(message)
  }

  /**
   * Gets or sets the default numerical value for the prompt.
   * This is used when the user presses ENTER without providing any other input.
   * In the .NET API, derived classes define the type-specific default value (e.g., integer, double).
   */
  get defaultValue(): number {
    return this._defaultValue
  }
  set defaultValue(val: number) {
    if (!this.isReadOnly) {
      this._defaultValue = val
    }
  }

  /**
   * Gets or sets whether the default value should be used when the user presses ENTER.
   * Corresponds to `PromptNumericalOptions.UseDefaultValue` in AutoCAD .NET API.
   */
  get useDefaultValue(): boolean {
    return this._useDefaultValue
  }
  set useDefaultValue(flag: boolean) {
    if (!this.isReadOnly) {
      this._useDefaultValue = flag
    }
  }

  /**
   * Gets or sets whether pressing ENTER alone (no input) is accepted.
   * Corresponds to `PromptNumericalOptions.AllowNone` in AutoCAD .NET API.
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
   * Gets or sets whether arbitrary (non-numeric) input is accepted.
   * If true, the prompt may allow strings or other input, depending on implementation.
   * Corresponds to `PromptNumericalOptions.AllowArbitraryInput` in AutoCAD .NET API.
   */
  get allowArbitraryInput(): boolean {
    return this._allowArbitraryInput
  }
  set allowArbitraryInput(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowArbitraryInput = flag
    }
  }

  /**
   * Gets or sets whether negative numeric values are allowed.
   * Corresponds to `PromptNumericalOptions.AllowNegative` in AutoCAD .NET API.
   */
  get allowNegative(): boolean {
    return this._allowNegative
  }
  set allowNegative(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowNegative = flag
    }
  }

  /**
   * Gets or sets whether zero is an acceptable numeric value.
   * Corresponds to `PromptNumericalOptions.AllowZero` in AutoCAD .NET API.
   */
  get allowZero(): boolean {
    return this._allowZero
  }
  set allowZero(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowZero = flag
    }
  }
}
