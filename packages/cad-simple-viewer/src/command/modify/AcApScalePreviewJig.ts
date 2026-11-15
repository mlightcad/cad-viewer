import {
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol
} from '@mlightcad/data-model'

import {
  AcEdSelectionStaticPreviewJig,
  AcEdSelectionTransformPreviewJig
} from '../../editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'
import { createScaleMatrix } from '../../util/AcApGeTransform'

/**
 * Static preview jig used while SCALE asks for supporting inputs such as the
 * reference length. It keeps the selection visible without mutating database
 * entities.
 */
export class AcApScaleStaticJig<T> extends AcEdSelectionStaticPreviewJig<T> {}

/**
 * SCALE preview jig.
 *
 * Like AutoCAD, the dragged scale factor is the cursor distance from the base
 * point divided by the reference length (`1` unless the `Reference` option
 * supplied another length). Degenerate factors (zero) are ignored so the
 * preview never collapses into a singular transform.
 */
export class AcApScalePreviewJig extends AcEdSelectionTransformPreviewJig<number> {
  private _basePoint: AcGePoint3d
  private _referenceLength: number
  private _lastFactor = 1

  /**
   * Creates a dynamic SCALE preview jig.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   * @param basePoint - Scale base point, which stays fixed.
   * @param referenceLength - Length that maps to a scale factor of `1`.
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    referenceLength = 1
  ) {
    super(view, sourceEntities)
    this._basePoint = new AcGePoint3d(basePoint)
    this._referenceLength = referenceLength
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
   * Converts the prompt value (a length) into a scale factor.
   *
   * @param length - Current length input from the editor prompt.
   * @returns Scale factor, or `undefined` when the factor is degenerate.
   */
  private toFactor(length: number): number | undefined {
    const factor = length / this._referenceLength
    if (!Number.isFinite(factor) || !AcGeTol.isPositive(factor)) {
      return undefined
    }
    return factor
  }

  /**
   * Applies the scale to the preview overlay or transient clone set.
   *
   * @param length - Current length input from the editor prompt.
   */
  override update(length: number) {
    const factor = this.toFactor(length)
    if (factor == null) return

    if (this.batchPreview.useBatchPreview) {
      if (AcGeTol.equalToZero(factor - this._lastFactor)) return
      this.batchPreview.updateMatrix(
        this._view,
        createScaleMatrix(this._basePoint, factor)
      )
      this._lastFactor = factor
      return
    }

    this._lastFactor = factor
    super.update(length)
  }

  protected buildTransforms(length: number) {
    const factor = this.toFactor(length) ?? this._lastFactor
    const matrix = createScaleMatrix(this._basePoint, factor)
    return this.previewEntries.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
