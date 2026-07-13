import {
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcEdPreviewJig } from '../input/AcEdPreviewJig'
import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * Preview jig that applies {@link AcDbEntity.subMoveGripPointsAt} on a clone
 * while the user drags a grip handle.
 */
export class AcEdGripPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcEdBaseView
  private readonly _sourceClone: AcDbEntity
  private readonly _gripIndex: number
  private readonly _gripBaseWcs: AcGePoint3d
  private _previewEntity: AcDbEntity | null = null

  constructor(
    view: AcEdBaseView,
    entity: AcDbEntity,
    gripIndex: number,
    gripBaseWcs: AcGePoint3dLike
  ) {
    super(view)
    this._view = view
    const sourceClone = entity.clone()
    if (!sourceClone) {
      throw new Error('Failed to clone entity for grip preview.')
    }
    this._sourceClone = sourceClone
    this._gripIndex = gripIndex
    this._gripBaseWcs = new AcGePoint3d(gripBaseWcs)
  }

  get entity(): AcDbEntity | null {
    return this._previewEntity
  }

  update(point: AcGePoint3dLike) {
    if (this._previewEntity) {
      this._view.removeTransientEntity(this._previewEntity.objectId)
      this._previewEntity = null
    }

    const preview = this._sourceClone.clone()
    if (!preview) return

    preview.subMoveGripPointsAt([this._gripIndex], this.computeOffset(point))
    this._previewEntity = preview
  }

  computeOffset(point: AcGePoint3dLike): AcGeVector3d {
    return new AcGeVector3d(
      point.x - this._gripBaseWcs.x,
      point.y - this._gripBaseWcs.y,
      (point.z ?? 0) - (this._gripBaseWcs.z ?? 0)
    )
  }

  override render(): void {
    if (this._previewEntity) {
      this._view.addTransientEntity(this._previewEntity)
    }
  }

  override end(): void {
    if (this._previewEntity) {
      this._view.removeTransientEntity(this._previewEntity.objectId)
      this._previewEntity = null
    }
  }
}
