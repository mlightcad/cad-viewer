import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcEdSelectionTransformPreviewJig } from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * MOVE preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export class AcApMovePreviewJig extends AcEdSelectionTransformPreviewJig<AcGePoint3dLike> {
  private _basePoint: AcGePoint3d

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike
  ) {
    super(view, sourceEntities)
    this._basePoint = new AcGePoint3d(basePoint)
  }

  protected buildTransforms(point: AcGePoint3dLike) {
    const displacement = new AcGePoint3d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      point.z - this._basePoint.z
    )
    const matrix = new AcGeMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      displacement.z
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [{ entity: { objectId: '' } as AcDbEntity, copyFactor: 1 }]
    return targets.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
