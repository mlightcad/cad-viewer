import {
  AcDbDimension,
  acdbDisposeDimBlock,
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcEdPreviewJig } from '../../editor/input/AcEdPreviewJig.js'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView.js'
import { acapStretchLayoutDeltaToEntitySpace } from './acapStretchCoords.js'

/** Temporary block name for dimension stretch previews. */
export const ACAP_STRETCH_DIM_PREVIEW_BLOCK = '*USTRETCHDIM'

/**
 * One entity participating in a STRETCH preview.
 */
export interface AcApStretchPreviewTarget {
  entity: AcDbEntity
  indices: number[]
  fullyEnclosed: boolean
  /**
   * Paper-space viewport the model entity was selected through, when the
   * active layout is a paper layout. Used to map layout displacement into
   * model WCS for preview.
   */
  viewportId?: AcDbObjectId
}

interface AcApStretchPreviewPair {
  target: AcApStretchPreviewTarget
  sourceClone: AcDbEntity
}

/**
 * Preview jig for STRETCH: clones each target and applies
 * {@link AcDbEntity.subMoveStretchPointsAt} or a whole-entity translation.
 */
export class AcApStretchPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcEdBaseView
  private readonly _basePoint: AcGePoint3d
  private readonly _pairs: AcApStretchPreviewPair[]
  private _previewEntities: AcDbEntity[] = []
  private _usesDimPreviewBlock = false

  constructor(
    view: AcEdBaseView,
    targets: AcApStretchPreviewTarget[],
    basePoint: AcGePoint3dLike
  ) {
    super(view)
    this._view = view
    this._basePoint = new AcGePoint3d(basePoint)
    this._pairs = []
    for (const target of targets) {
      const sourceClone = target.entity.clone()
      if (!sourceClone) continue
      this._pairs.push({ target, sourceClone })
    }
  }

  get entity(): AcDbEntity | null {
    return this._previewEntities[0] ?? null
  }

  update(point: AcGePoint3dLike) {
    this.clearPreview()

    const layoutDelta = {
      x: point.x - this._basePoint.x,
      y: point.y - this._basePoint.y,
      z: (point.z ?? 0) - (this._basePoint.z ?? 0)
    }

    const previews: AcDbEntity[] = []
    for (const { target, sourceClone } of this._pairs) {
      const preview = sourceClone.clone()
      if (!preview) continue

      const stretchCount = preview.subGetStretchPoints().length
      if (stretchCount === 0) continue

      const offset = acapStretchLayoutDeltaToEntitySpace(
        this._view,
        target.viewportId,
        this._basePoint,
        layoutDelta
      )
      const moveWhole =
        target.fullyEnclosed || target.indices.length >= stretchCount

      if (moveWhole) {
        preview.transformBy(
          new AcGeMatrix3d().makeTranslation(offset.x, offset.y, offset.z ?? 0)
        )
      } else if (target.indices.length > 0) {
        preview.subMoveStretchPointsAt(target.indices, offset)
      } else {
        continue
      }

      if (preview instanceof AcDbDimension) {
        preview.recomputeDimBlock(ACAP_STRETCH_DIM_PREVIEW_BLOCK)
        this._usesDimPreviewBlock = true
      }
      previews.push(preview)
    }
    this._previewEntities = previews
  }

  override render(): void {
    if (this._previewEntities.length > 0) {
      this._view.addTransientEntity(this._previewEntities)
    }
  }

  override end(): void {
    this.clearPreview()
    if (this._usesDimPreviewBlock) {
      const database = this._pairs[0]?.target.entity.database
      if (database) {
        acdbDisposeDimBlock(database, ACAP_STRETCH_DIM_PREVIEW_BLOCK)
      }
      this._usesDimPreviewBlock = false
    }
  }

  private clearPreview() {
    for (const entity of this._previewEntities) {
      this._view.removeTransientEntity(entity.objectId)
    }
    this._previewEntities = []
  }
}
