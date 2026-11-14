import {
  AcDbEntity,
  AcDbObjectId,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { isEntityOnLockedLayer } from '../../service/AcApLockedLayer'
import { acapRunDatabaseEdit } from '../../util/AcApDatabaseEdit'
import { AcEdOsnapResolver } from '../input/AcEdOsnapResolver'
import { AcEdMarkerManager } from '../input/marker'
import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdGripPreviewJig } from './AcEdGripPreviewJig'

export interface AcEdGripEditTarget {
  entityId: AcDbObjectId
  gripIndex: number
  /** Grip base in the entity's native WCS (model space through a viewport). */
  gripBaseWcs: AcGePoint3dLike
  /**
   * Paper-space viewport the entity was selected through. When set, cursor
   * and osnap points are converted paper↔model around this viewport.
   */
  viewportId?: AcDbObjectId
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
    // Viewport-drilled entities live in model WCS; a paper-layout transient
    // would draw at the wrong place. Skip live preview and commit on mouseup.
    if (this._target.viewportId == null) {
      this._jig.render()
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return
    const wcs = this.resolveWcs(e)
    const offset = this._jig.computeOffset(wcs)
    const db = this._entity.database
    if (isEntityOnLockedLayer(db, this._entity)) {
      this.finish()
      return
    }
    acapRunDatabaseEdit(db, 'Grip Edit', () => {
      const entity = db.openEntityForWrite(this._entity)
      if (!entity || isEntityOnLockedLayer(db, entity)) return
      entity.subMoveGripPointsAt([this._target.gripIndex], offset)
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
    this._view.osnapResolver.clearAcquiredCenters()
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mouseup', this._boundMouseUp)
    document.removeEventListener('keydown', this._boundKeyDown)
    this._onEnd()
  }

  /**
   * Resolves the drag point in the entity's native WCS.
   *
   * The active layout camera yields paper WCS. For viewport drill-through
   * grips that must be compared against a model-space grip base, convert
   * paper→model (and feed osnap paper coords so its own mapper stays coherent).
   */
  private resolveWcs(e: MouseEvent): AcGePoint3dLike {
    const canvasPos = this._view.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    const paper = this._view.screenToWorld(canvasPos)
    const cursorPaper = { x: paper.x, y: paper.y, z: 0 }

    const mapper =
      this._target.viewportId != null
        ? this._view.getViewportCoordinateMapper(this._target.viewportId)
        : undefined

    const lastPaper = mapper
      ? (() => {
          const p = mapper.modelToPaper(this._target.gripBaseWcs)
          return { x: p.x, y: p.y, z: this._target.gripBaseWcs.z ?? 0 }
        })()
      : this._target.gripBaseWcs

    const snapPoint = this._view.osnapResolver.resolve({
      cursorWcs: cursorPaper,
      lastPoint: lastPaper
    })
    this._osnapMarkerManager.setHintMarkers(
      AcEdOsnapResolver.displayCenterMarks(
        this._view.osnapResolver.acquiredCenterMarks,
        snapPoint
      )
    )

    let paperResult: AcGePoint3dLike
    if (snapPoint) {
      this._osnapMarkerManager.showOrRepositionMarker(
        snapPoint,
        AcEdOsnapResolver.osnapModeToMarkerType(snapPoint.type)
      )
      paperResult = { x: snapPoint.x, y: snapPoint.y, z: snapPoint.z ?? 0 }
    } else {
      this._osnapMarkerManager.hideMarker()
      paperResult = cursorPaper
    }

    if (!mapper) return paperResult
    const model = mapper.paperToModel(paperResult)
    return { x: model.x, y: model.y, z: paperResult.z ?? 0 }
  }
}
