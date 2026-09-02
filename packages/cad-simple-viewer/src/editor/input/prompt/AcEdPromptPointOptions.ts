import { AcGePoint3d } from '@mlightcad/data-model'

import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Represents options for prompting the user to select a point, similar to
 * AutoCAD .NET `PromptPointOptions` and `PromptCornerOptions`.
 *
 * Supports specifying a base point, keywords, and how the message is displayed.
 */
export class AcEdPromptPointOptions extends AcEdPromptOptions<AcGePoint3d> {
  private _basePoint?: AcGePoint3d
  private _useBasePoint: boolean = false
  private _useDashedLine: boolean = false
  private _allowNone: boolean = false
  private _disableOSnap: boolean = false
  private _showConfirmedPointMark?: boolean
  private _defaultValue?: AcGePoint3d
  private _useDefaultValue: boolean = false

  /**
   * Constructs a new `AcEdPromptPointOptions` with a given prompt message.
   * @param message - The message to show to the user in the prompt.
   */
  constructor(message: string, globalKeywords?: string) {
    super(message, globalKeywords)
  }

  /**
   * Gets or sets the default point used when the user presses ENTER without
   * picking or typing a point, if {@link useDefaultValue} is true.
   *
   * AutoCAD .NET `PromptPointOptions` does not expose this property; it is
   * provided here so commands can show and accept defaults such as `<0,0>`.
   */
  get defaultValue(): AcGePoint3d | undefined {
    return this._defaultValue
  }
  set defaultValue(point: AcGePoint3d | undefined) {
    if (!this.isReadOnly) {
      if (point == null) {
        this._defaultValue = point
      } else {
        this._defaultValue = this._defaultValue
          ? this._defaultValue.copy(point)
          : new AcGePoint3d(point)
      }
    }
  }

  /**
   * Gets or sets whether {@link defaultValue} should be used when the user
   * presses ENTER without providing other input.
   */
  get useDefaultValue(): boolean {
    return this._useDefaultValue
  }
  set useDefaultValue(flag: boolean) {
    if (!this.isReadOnly) {
      this._useDefaultValue = flag
    }
  }

  override getDefaultValueDisplayText(): string | undefined {
    if (!this._useDefaultValue || !this._defaultValue) return undefined
    const { x, y, z } = this._defaultValue
    return z === 0 ? `${x},${y}` : `${x},${y},${z}`
  }

  /**
   * Gets or sets the base point used for relative selection.
   * In AutoCAD .NET, this is `PromptPointOptions.BasePoint`.
   * When `useBasePoint` is true, a rubber-band line will be drawn from the base point to the cursor.
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
   * Gets or sets whether the base point should be used when prompting the next point.
   * In AutoCAD .NET, this is `PromptPointOptions.UseBasePoint`.
   * If true, the prompt will display a visual line from the base point to the cursor.
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
   * Corresponds to `PromptPointOptions.UseDashedLine`.
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
   * Gets or sets whether the user is allowed to press Enter to specify no point.
   * Corresponds to `PromptPointOptions.AllowNone` in AutoCAD .NET.
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
   * Gets or sets whether object snap should be disabled for this point prompt.
   */
  get disableOSnap(): boolean {
    return this._disableOSnap
  }
  set disableOSnap(flag: boolean) {
    if (!this.isReadOnly) {
      this._disableOSnap = flag
    }
  }

  /**
   * Gets or sets whether a plus-shaped mark should remain at each confirmed
   * point for the rest of the command (similar to acquired center ticks).
   *
   * - `undefined` (default): show on phone/pad UI, hide on desktop.
   * - `true` / `false`: override the platform default.
   *
   * Useful on touch devices where short taps skip the jig preview and users
   * otherwise cannot see points they have already picked.
   */
  get showConfirmedPointMark(): boolean | undefined {
    return this._showConfirmedPointMark
  }
  set showConfirmedPointMark(flag: boolean | undefined) {
    if (!this.isReadOnly) {
      this._showConfirmedPointMark = flag
    }
  }
}
