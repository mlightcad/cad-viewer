import {
  AcDbEntity,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeTol
} from '@mlightcad/data-model'

import {
  AcEdSelectionStaticPreviewJig,
  AcEdSelectionTransformPreviewJig
} from '../../editor/input/AcEdSelectionPreviewJig.js'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView.js'
import { createMirrorMatrix } from '../../util/AcApGeTransform.js'

/**
 * Static preview jig used while MIRROR asks for the first mirror-line point.
 * Keeps the selection visible without mutating database entities.
 */
export class AcApMirrorStaticJig<T> extends AcEdSelectionStaticPreviewJig<T> {}

/**
 * MIRROR preview jig.
 *
 * Reflects the selection about the line from the first mirror-line point to
 * the current cursor point. Degenerate (coincident) points keep the last
 * valid preview so the overlay never collapses.
 */
export class AcApMirrorPreviewJig extends AcEdSelectionTransformPreviewJig<AcGePoint3dLike> {
  private _firstPoint: AcGePoint3d
  private _lastSecondPoint: AcGePoint3d

  /**
   * Creates a dynamic MIRROR preview jig.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   * @param firstPoint - First point of the mirror line.
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    firstPoint: AcGePoint3dLike
  ) {
    super(view, sourceEntities)
    this._firstPoint = new AcGePoint3d(firstPoint)
    this._lastSecondPoint = new AcGePoint3d(
      firstPoint.x + 1,
      firstPoint.y,
      firstPoint.z ?? 0
    )
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
   * Returns a second mirror-line point that is not coincident with the first.
   */
  private resolveSecondPoint(point: AcGePoint3dLike): AcGePoint3d {
    const second = new AcGePoint3d(point)
    const dx = second.x - this._firstPoint.x
    const dy = second.y - this._firstPoint.y
    if (!AcGeTol.isPositive(Math.hypot(dx, dy))) {
      return this._lastSecondPoint.clone()
    }
    this._lastSecondPoint.copy(second)
    return second
  }

  /**
   * Applies the mirror to the preview overlay or transient clone set.
   *
   * @param point - Current second point of the mirror line.
   */
  override update(point: AcGePoint3dLike) {
    const second = this.resolveSecondPoint(point)
    const matrix = createMirrorMatrix(this._firstPoint, second)

    if (this.batchPreview.useBatchPreview) {
      this.batchPreview.updateMatrix(this._view, matrix)
      return
    }

    super.update(point)
  }

  protected buildTransforms(point: AcGePoint3dLike) {
    const second = this.resolveSecondPoint(point)
    const matrix = createMirrorMatrix(this._firstPoint, second)
    return this.previewEntries.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}
