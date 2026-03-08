import { AcGeBox2d } from '@mlightcad/data-model'

import { AcEdPromptOptions } from './AcEdPromptOptions'

/**
 * Represents prompt options for selecting a rectangular box (two corners).
 */
export class AcEdPromptBoxOptions extends AcEdPromptOptions<AcGeBox2d> {
  private _secondCornerMessage: string
  private _useBasePoint: boolean = false
  private _useDashedLine: boolean = false

  constructor(firstCornerMessage: string, secondCornerMessage: string) {
    super(firstCornerMessage)
    this._secondCornerMessage = secondCornerMessage
  }

  get firstCornerMessage(): string {
    return this.message
  }

  set firstCornerMessage(value: string) {
    if (!this.isReadOnly) {
      this.message = value
    }
  }

  get secondCornerMessage(): string {
    return this._secondCornerMessage
  }

  set secondCornerMessage(value: string) {
    if (!this.isReadOnly) {
      this._secondCornerMessage = value
    }
  }

  get useBasePoint(): boolean {
    return this._useBasePoint
  }

  set useBasePoint(flag: boolean) {
    if (!this.isReadOnly) {
      this._useBasePoint = flag
    }
  }

  get useDashedLine(): boolean {
    return this._useDashedLine
  }

  set useDashedLine(flag: boolean) {
    if (!this.isReadOnly) {
      this._useDashedLine = flag
    }
  }
}
