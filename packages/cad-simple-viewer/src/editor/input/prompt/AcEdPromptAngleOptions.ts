import { AcGePoint3d } from '@mlightcad/data-model'

import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Options for prompting the user to enter an angle, similar to
 * AutoCAD .NET `PromptAngleOptions`.
 *
 * Supports a base point, default angle, keywords, and various validation flags.
 */
export class AcEdPromptAngleOptions extends AcEdPromptOptions<number> {
  private _basePoint?: AcGePoint3d
  private _useBasePoint: boolean = false
  private _useDashedLine: boolean = false
  private _useAngleBase: boolean = false
  private _defaultValue: number = 0
  private _useDefaultValue: boolean = false
  private _allowZero: boolean = true
  private _allowNegative: boolean = false

  /**
   * Constructs a new `AcEdPromptAngleOptions` with a given prompt message.
   * @param message - The prompt message shown to the user.
   */
  constructor(message: string) {
    super(message)
  }

  /**
   * Gets or sets the base point for the angle prompt.
   * Corresponds to `PromptAngleOptions.BasePoint`.
   */
  get basePoint(): AcGePoint3d | undefined {
    return this._basePoint
  }
  set basePoint(point: AcGePoint3d | undefined) {
    if (!this.isReadOnly) {
      if (point == null) {
        this._basePoint = point
      } else {
        this._basePoint = this._basePoint
          ? this._basePoint.copy(point)
          : new AcGePoint3d(point)
      }
    }
  }

  /**
   * Gets or sets whether to use the base point for the prompt.
   * When true, the prompt may render a dashed line from the base point to the cursor.
   * Corresponds to `PromptAngleOptions.UseBasePoint`.
   */
  get useBasePoint(): boolean {
    return this._useBasePoint
  }
  set useBasePoint(flag: boolean) {
    if (!this.isReadOnly) {
      this._useBasePoint = flag
    }
  }

  /**
   * Gets or sets whether a dashed line should indicate the base point.
   * Corresponds to `PromptAngleOptions.UseDashedLine`.
   */
  get useDashedLine(): boolean {
    return this._useDashedLine
  }
  set useDashedLine(flag: boolean) {
    if (!this.isReadOnly) {
      this._useDashedLine = flag
    }
  }

  /**
   * Gets or sets whether the base "angle base" should be used.
   * Corresponds to `PromptAngleOptions.UseAngleBase`.
   */
  get useAngleBase(): boolean {
    return this._useAngleBase
  }
  set useAngleBase(flag: boolean) {
    if (!this.isReadOnly) {
      this._useAngleBase = flag
    }
  }

  /**
   * Gets or sets the default angle value (in degrees or radians, depending on your implementation).
   * This is used when the user presses ENTER, if `useDefaultValue` is true.
   * Corresponds to `PromptAngleOptions.DefaultValue`.
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
   * Gets or sets whether the default value is used when the user presses ENTER.
   * Corresponds to `PromptAngleOptions.UseDefaultValue`.
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
   * Gets or sets whether zero-valued angles are accepted.
   * Corresponds to `PromptAngleOptions.AllowZero`.
   */
  get allowZero(): boolean {
    return this._allowZero
  }
  set allowZero(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowZero = flag
    }
  }

  /**
   * Gets or sets whether negative-valued angles are accepted.
   * While not always documented directly on `PromptAngleOptions`, numerical prompts in AutoCAD
   * often support negative input via a similar property. (Analogous to PromptNumericalOptions)
   */
  get allowNegative(): boolean {
    return this._allowNegative
  }
  set allowNegative(flag: boolean) {
    if (!this.isReadOnly) {
      this._allowNegative = flag
    }
  }
}
