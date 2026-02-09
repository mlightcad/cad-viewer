import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'

/**
 * Base command for revision commands.
 */
export class AcApBaseRevCmd extends AcEdCommand {
  /**
   * The layer name for revision
   */
  private _revisionLayer?: string
  /**
   * The previous current layer
   */
  private _previousLayer?: string
  /**
   * The previous current entity color
   */
  private _previousCecolor?: string
  /**
   * The previous current entity line weight
   */
  private _previousCelweight?: AcGiLineWeight
  /**
   * The flag whether to show entity draw style toolbar
   */
  private _isShowEntityDrawStyleToolbar: boolean

  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
    this._isShowEntityDrawStyleToolbar = true
  }

  /**
   * Returns true if it is to show entity draw style toolbar
   */
  get isShowEntityDrawStyleToolbar() {
    return this._isShowEntityDrawStyleToolbar
  }
  set isShowEntityDrawStyleToolbar(value: boolean) {
    this._isShowEntityDrawStyleToolbar = value
  }

  protected onCommandWillStart(context: AcApContext) {
    const db = context.doc.database
    const annotation = new AcApAnnotation(db)
    this._previousLayer = db.clayer
    this._previousCecolor = db.cecolor.toString()
    this._previousCelweight = db.celweight
    this._revisionLayer = annotation.getAnnotationLayer()
    db.clayer = this._revisionLayer
  }

  protected onCommandEnded(context: AcApContext) {
    const db = context.doc.database
    if (this._previousLayer) db.clayer = this._previousLayer
    if (this._previousCecolor)
      db.cecolor =
        AcCmColor.fromString(this._previousCecolor) ?? new AcCmColor()
    if (this._previousCelweight) db.celweight = this._previousCelweight
    this._previousLayer = undefined
    this._revisionLayer = undefined
  }
}
