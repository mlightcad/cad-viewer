import {
  AcDbEntity,
  AcDbObjectId,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { acapRunDatabaseEdit } from '../../util/AcApDatabaseEdit'
import { AcEdOsnapResolver } from '../input/AcEdOsnapResolver'
import { AcEdMarkerManager } from '../input/marker'
import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdGripPreviewJig } from './AcEdGripPreviewJig'

export interface AcEdGripEditTarget {
  entityId: AcDbObjectId
  gripIndex: number
  gripBaseWcs: AcGePoint3dLike
}

/**
 * Handles an in-progress grip drag: preview on move, commit or cancel on end.
 */
export class AcEdGripEditSession {
  private readonly _view: AcEdBaseView
  private readonly _entity: AcDbEntity
  private readonly _target: AcEdGripEditTarget
  private readonly _jig: AcEdGripPreviewJig
  private readonly _onEnd: () => void
  private readonly _osnapMarkerManager: AcEdMarkerManager

  private _boundMouseMove = (e: MouseEvent) => this.onMouseMove(e)
  private _boundMouseUp = (e: MouseEvent) => this.onMouseUp(e)
  private _boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)

  constructor(
    view: AcEdBaseView,
    entity: AcDbEntity,
    target: AcEdGripEditTarget,
    onEnd: () => void
  ) {
    this._view = view
    this._entity = entity
    this._target = target
    this._onEnd = onEnd
    this._osnapMarkerManager = new AcEdMarkerManager(view)
    this._jig = new AcEdGripPreviewJig(
      view,
      entity,
      target.gripIndex,
      target.gripBaseWcs
    )

    document.addEventListener('mousemove', this._boundMouseMove)
    document.addEventListener('mouseup', this._boundMouseUp)
    document.addEventListener('keydown', this._boundKeyDown)
  }

  onMouseMove(e: MouseEvent) {
    const wcs = this.resolveWcs(e)
    this._jig.update(wcs)
    this._jig.render()
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return
    const wcs = this.resolveWcs(e)
    const offset = this._jig.computeOffset(wcs)
    const db = this._entity.database
    acapRunDatabaseEdit(db, 'Grip Edit', () => {
      const entity = db.openEntityForWrite(this._entity)
      if (!entity) return
      entity.subMoveGripPointsAt([this._target.gripIndex], offset)
      entity.triggerModifiedEvent()
    })
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
    this._jig.end()
    this._osnapMarkerManager.clear()
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mouseup', this._boundMouseUp)
    document.removeEventListener('keydown', this._boundKeyDown)
    this._onEnd()
  }

  private resolveWcs(e: MouseEvent): AcGePoint3dLike {
    const canvasPos = this._view.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    const wcs = this._view.screenToWorld(canvasPos)
    const cursorWcs = { x: wcs.x, y: wcs.y, z: 0 }

    this._osnapMarkerManager.hideMarker()
    const snapPoint = this._view.osnapResolver.resolve({
      cursorWcs,
      lastPoint: this._target.gripBaseWcs
    })

    if (snapPoint) {
      this._osnapMarkerManager.showMarker(
        snapPoint,
        AcEdOsnapResolver.osnapModeToMarkerType(snapPoint.type)
      )
      return { x: snapPoint.x, y: snapPoint.y, z: snapPoint.z ?? 0 }
    }

    return cursorWcs
  }
}
