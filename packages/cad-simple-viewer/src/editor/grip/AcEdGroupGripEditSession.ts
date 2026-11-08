import {
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApDocManager } from '../../app'
import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * Drag session for the group center grip: translates the group's member
 * entities (not necessarily the entire selection set).
 */
export class AcEdGroupGripEditSession {
  private readonly _view: AcEdBaseView
  private readonly _entities: AcDbEntity[]
  private readonly _baseWcs: AcGePoint3dLike
  private readonly _onEnd: () => void

  private _boundMouseMove = (e: MouseEvent) => this.onMouseMove(e)
  private _boundMouseUp = (e: MouseEvent) => this.onMouseUp(e)
  private _boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)

  constructor(
    view: AcEdBaseView,
    entities: AcDbEntity[],
    baseWcs: AcGePoint3dLike,
    onEnd: () => void
  ) {
    this._view = view
    this._entities = entities
    this._baseWcs = { x: baseWcs.x, y: baseWcs.y, z: baseWcs.z ?? 0 }
    this._onEnd = onEnd

    document.addEventListener('mousemove', this._boundMouseMove)
    document.addEventListener('mouseup', this._boundMouseUp)
    document.addEventListener('keydown', this._boundKeyDown)
  }

  private resolveWcs(e: MouseEvent): AcGePoint3dLike {
    const canvas = this._view.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    const wcs = this._view.screenToWorld(canvas)
    return { x: wcs.x, y: wcs.y, z: 0 }
  }

  private onMouseMove(_e: MouseEvent) {
    // Live multi-entity preview is handled on commit; grips stay hidden
    // during the drag (see AcEdGripManager.hideEntriesForDrag).
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return
    const wcs = this.resolveWcs(e)
    const displacement = new AcGePoint3d(
      wcs.x - this._baseWcs.x,
      wcs.y - this._baseWcs.y,
      (wcs.z ?? 0) - (this._baseWcs.z ?? 0)
    )
    if (
      Math.abs(displacement.x) > 1e-12 ||
      Math.abs(displacement.y) > 1e-12 ||
      Math.abs(displacement.z) > 1e-12
    ) {
      const doc = AcApDocManager.instance.curDocument
      // Must go through entityService so transform runs inside a database
      // edit (entityModified → renderer refresh + undo).
      doc.entityService.translateEntities(this._entities, displacement)
    }
    this.finish()
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    this.cancel()
  }

  cancel() {
    this.finish()
  }

  private finish() {
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mouseup', this._boundMouseUp)
    document.removeEventListener('keydown', this._boundKeyDown)
    this._onEnd()
  }
}
