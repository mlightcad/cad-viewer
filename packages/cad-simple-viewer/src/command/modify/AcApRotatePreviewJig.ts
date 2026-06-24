import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol
} from '@mlightcad/data-model'

import {
  AcEdSelectionStaticPreviewJig,
  AcEdSelectionTransformPreviewJig
} from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * Builds a world-space rotation matrix around a given base point.
 *
 * @param basePoint - Rotation origin.
 * @param angleRad - Rotation angle in radians.
 * @returns Composite transform that rotates around `basePoint`.
 */
export function createRotationMatrix(
  basePoint: AcGePoint3dLike,
  angleRad: number
) {
  return new AcGeMatrix3d()
    .makeTranslation(basePoint.x, basePoint.y, basePoint.z)
    .multiply(new AcGeMatrix3d().makeRotationZ(angleRad))
    .multiply(
      new AcGeMatrix3d().makeTranslation(
        -basePoint.x,
        -basePoint.y,
        -basePoint.z
      )
    )
}

/**
 * Static preview jig used while ROTATE asks for supporting inputs such as
 * reference points. It keeps cloned source entities visible without mutating
 * database entities.
 */
export class AcApRotateStaticJig<T> extends AcEdSelectionStaticPreviewJig<T> {}

/**
 * ROTATE preview jig.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export class AcApRotatePreviewJig extends AcEdSelectionTransformPreviewJig<number> {
  private _basePoint: AcGePoint3d
  private _lastAngleRad = 0
  private _referenceAngleDeg: number

  /**
   * Creates a dynamic ROTATE preview jig.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   * @param basePoint - Rotation base point.
   * @param referenceAngleDeg - Reference angle in degrees used for reference-based rotation prompts.
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    referenceAngleDeg = 0
  ) {
    super(view, sourceEntities)
    this._basePoint = new AcGePoint3d(basePoint)
    this._referenceAngleDeg = referenceAngleDeg
  }

  /**
   * Gets the first transient preview entity required by the jig API.
   *
   * @returns First preview entity, or `null` when cloning failed.
   */
  get entity() {
    return this.previewEntities[0] ?? null
  }

  /**
   * Applies rotation to the preview overlay or transient clone set.
   *
   * @param angleDeg - Current angle input in degrees from the editor prompt.
   */
  override update(angleDeg: number) {
    const angleRad = ((angleDeg - this._referenceAngleDeg) * Math.PI) / 180

    if (this.batchPreview.useBatchPreview) {
      if (AcGeTol.equalToZero(angleRad - this._lastAngleRad)) return
      this.batchPreview.updateMatrix(
        this._view,
        createRotationMatrix(this._basePoint, angleRad)
      )
      this._lastAngleRad = angleRad
      return
    }

    this._lastAngleRad = angleRad
    super.update(angleDeg)
  }

  protected buildTransforms(angleDeg: number) {
    const angleRad = ((angleDeg - this._referenceAngleDeg) * Math.PI) / 180
    const matrix = createRotationMatrix(this._basePoint, angleRad)
    return this.previewEntries.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
