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

  /**
   * Constructs a new `AcEdPromptPointOptions` with a given prompt message.
   * @param message - The message to show to the user in the prompt.
   */
  constructor(message: string) {
    super(message)
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
}
