import { AcEdPromptNumericalOptions } from './AcEdPromptNumericalOptions'

/**
 * Options for prompting the user to enter an integer (whole number),
 * similar to AutoCAD .NET `PromptIntegerOptions`.
 *
 * Inherits common numeric‑prompt behavior from `AcEdPromptNumericalOptions`,
 * and adds integer-specific configuration for minimum and maximum allowed values.
 */
export class AcEdPromptIntegerOptions extends AcEdPromptNumericalOptions {
  private _lowerLimit?: number
  private _upperLimit?: number

  /**
   * Constructs a new `AcEdPromptIntegerOptions`.
   *
   * AutoCAD .NET provides multiple overloads.
   * This constructor supports the same idea by allowing:
   * - just a message, or
   * - a message + lower limit, or
   * - a message + lower + upper limit.
   *
   * @param message - The message displayed to the user when prompting for an integer.
   * @param lowerLimit - (optional) Minimum allowed integer value. Enables `useLowerLimit`.
   * @param upperLimit - (optional) Maximum allowed integer value. Enables `useUpperLimit`.
   */
  constructor(message: string, lowerLimit?: number, upperLimit?: number) {
    super(message)

    if (typeof lowerLimit === 'number') {
      this._lowerLimit = Math.floor(lowerLimit)
    }

    if (typeof upperLimit === 'number') {
      this._upperLimit = Math.ceil(upperLimit)
    }
  }

  /**
   * Gets or sets the minimum allowed integer value.
   * Corresponds to `PromptIntegerOptions.LowerLimit` in AutoCAD .NET API.
   */
  get lowerLimit(): number | undefined {
    return this._lowerLimit
  }

  set lowerLimit(val: number | undefined) {
    if (!this.isReadOnly) {
      this._lowerLimit = typeof val === 'number' ? Math.floor(val) : undefined
    }
  }

  /**
   * Gets or sets the maximum allowed integer value.
   * Corresponds to `PromptIntegerOptions.UpperLimit` in AutoCAD .NET API.
   */
  get upperLimit(): number | undefined {
    return this._upperLimit
  }

  set upperLimit(val: number | undefined) {
    if (!this.isReadOnly) {
      this._upperLimit = typeof val === 'number' ? Math.floor(val) : undefined
    }
  }
}
