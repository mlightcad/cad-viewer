import { AcGePoint3d } from '@mlightcad/data-model'

import { AcEdPromptNumericalOptions } from './AcEdPromptNumericalOptions'

/**
 * Options for prompting the user to input a distance, similar to
 * AutoCAD .NET `PromptDistanceOptions`.
 *
 * Supports a base point, default distance, 2D projection, dashed-line preview, and keywords.
 */
export class AcEdPromptDistanceOptions extends AcEdPromptNumericalOptions {
  private _basePoint?: AcGePoint3d
  private _useBasePoint: boolean = true
  private _useDashedLine: boolean = true
  private _only2d: boolean = true

  /**
   * Constructs a new `AcEdPromptDistanceOptions` with a prompt message.
   * @param message - The message shown to the user in the prompt.
   */
  constructor(message: string) {
    super(message)
    this.allowNegative = false
  }

  /**
   * Gets or sets the base point for the distance prompt.
   * Corresponds to `PromptDistanceOptions.BasePoint`.
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
   * Gets or sets whether the base point should be used for the prompt.
   * When true, a rubber-band line from the base point to the cursor may be shown.
   * Corresponds to `PromptDistanceOptions.UseBasePoint`.
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
   * Gets or sets whether a dashed-line (“rubber band”) is drawn from the base point to the cursor.
   * Corresponds to `PromptDistanceOptions.UseDashedLine`.
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
   * Gets or sets whether the distance should be measured in 2D (projected into the current UCS).
   * If true, the returned distance is the 2D projection from the base point.
   * Corresponds to `PromptDistanceOptions.Only2d`.
   */
  get only2d(): boolean {
    return this._only2d
  }
  set only2d(flag: boolean) {
    if (!this.isReadOnly) {
      this._only2d = flag
    }
  }
}
