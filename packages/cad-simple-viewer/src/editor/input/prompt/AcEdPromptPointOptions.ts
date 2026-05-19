import { AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcEdPromptOptions } from './AcEdPromptOptions'

export interface AcEdPromptPointDistanceInputOptions {
  getDistance(point: AcGePoint3dLike): number
  resolvePoint(distance: number, referencePoint: AcGePoint3dLike): AcGePoint3dLike | null
}

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
  private _resolvePoint?: (point: AcGePoint3dLike) => AcGePoint3dLike
  private _distanceInput?: AcEdPromptPointDistanceInputOptions

  /**
   * Constructs a new `AcEdPromptPointOptions` with a given prompt message.
   * @param message - The message to show to the user in the prompt.
   */
  constructor(message: string, globalKeywords?: string) {
    super(message, globalKeywords)
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

  get resolvePoint():
    | ((point: AcGePoint3dLike) => AcGePoint3dLike)
    | undefined {
    return this._resolvePoint
  }
  set resolvePoint(
    resolver: ((point: AcGePoint3dLike) => AcGePoint3dLike) | undefined
  ) {
    if (!this.isReadOnly) {
      this._resolvePoint = resolver
    }
  }

  get distanceInput(): AcEdPromptPointDistanceInputOptions | undefined {
    return this._distanceInput
  }
  set distanceInput(
    options: AcEdPromptPointDistanceInputOptions | undefined
  ) {
    if (!this.isReadOnly) {
      this._distanceInput = options
    }
  }
}
