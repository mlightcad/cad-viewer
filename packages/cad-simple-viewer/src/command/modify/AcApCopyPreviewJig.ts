import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { scaleCopyDisplacement } from '../../editor/input/AcEdBatchPreview'
import { AcEdSelectionTransformPreviewJig } from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * COPY preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. Array previews create one
 * overlay per copy placement, each with its own translation matrix. The legacy
 * transient clone path publishes once and then updates transforms only.
 */
export class AcApCopyPreviewJig extends AcEdSelectionTransformPreviewJig<AcGePoint3dLike> {
  private _basePoint: AcGePoint3d
  private _fitMode: boolean

  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    copyCount = 1,
    fitMode = false
  ) {
    super(view, sourceEntities, Math.max(0, copyCount))
    this._basePoint = new AcGePoint3d(basePoint)
    this._fitMode = fitMode
  }

  override update(point: AcGePoint3dLike) {
    const displacement = new AcGePoint3d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      point.z - this._basePoint.z
    )

    if (this.batchPreview.useBatchPreview && this.copyCount > 1) {
      this.batchPreview.updatePlacements(
        this._view,
        displacement,
        this._fitMode
      )
      return
    }

    super.update(point)
  }

  protected buildTransforms(point: AcGePoint3dLike) {
    const displacement = new AcGePoint3d(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      point.z - this._basePoint.z
    )
    const targets =
      this.previewEntries.length > 0
        ? this.previewEntries
        : [{ entity: { objectId: '' } as AcDbEntity, copyFactor: 1 }]
    return targets.map(entry => {
      const scaled = scaleCopyDisplacement(
        displacement,
        entry.copyFactor,
        this.copyCount,
        this._fitMode
      )
      return {
        objectId: entry.entity.objectId,
        matrix: new AcGeMatrix3d().makeTranslation(
          scaled.x,
          scaled.y,
          scaled.z
        )
      }
    })
  }
}
