import {
  AcDbAssocArrayParameters,
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcEdBatchedPreview } from '../../../editor/input/AcEdBatchPreview.js'
import { AcEdBaseView } from '../../../editor/view/AcEdBaseView.js'
import {
  acapArrayFirstItemIsIdentity,
  acapArrayWorldItemTransform
} from './AcApArrayWorldTransform.js'

/**
 * Live ARRAY creation preview (AutoCAD-style, not gated by COMMANDPREVIEW).
 *
 * When the first item transform is identity, keeps the selected source entities
 * visible and draws one overlay per remaining item. When item (0,0,0) moves or
 * rotates (common for path arrays whose base is not on the path start), hides
 * the sources and overlays every item — otherwise "Exit" would jump from the
 * unmoved originals to the committed placement.
 *
 * Item matrices from {@link AcDbAssocArrayParameters} are defined in the
 * array-BTR frame (geometry relative to `basePoint`); preview composes
 * {@code T(base) · M · T(-base)} so they apply correctly to world-space
 * source entities.
 */
export class AcApArrayPreview {
  private readonly _view: AcEdBaseView
  private readonly _sourceIds: AcDbObjectId[]
  private readonly _sources: AcDbEntity[]
  private readonly _basePoint: AcGePoint3dLike
  private _batch: AcEdBatchedPreview | null = null
  /**
   * Set once batched overlays cannot be created (view without preview support,
   * missing entities, …). Without it every refresh retried the failed creation.
   */
  private _batchUnavailable = false
  private _placementCount = -1
  private _transientEntities: AcDbEntity[] = []
  /** Per-source scene visibility captured before the preview hid anything. */
  private readonly _sourceVisibility = new Map<AcDbObjectId, boolean>()
  private _sourcesHidden = false

  constructor(
    view: AcEdBaseView,
    sourceEntities: readonly AcDbEntity[],
    basePoint: AcGePoint3dLike
  ) {
    this._view = view
    this._sources = [...sourceEntities]
    this._sourceIds = sourceEntities.map(entity => entity.objectId)
    this._basePoint = { x: basePoint.x, y: basePoint.y, z: basePoint.z ?? 0 }
  }

  /**
   * Rebuilds / updates overlays to match `parameters`.
   */
  refresh(parameters: AcDbAssocArrayParameters): void {
    const keepSources = acapArrayFirstItemIsIdentity(
      parameters,
      this._basePoint
    )
    this.setSourcesVisible(keepSources)

    const matrices = this.worldItemTransforms(parameters, keepSources)
    if (matrices.length !== this._placementCount) {
      this.clearOverlays()
    }
    this._placementCount = matrices.length
    if (matrices.length === 0) return

    if (this.useTransientOverlay()) {
      this.clearTransient()
      this.publishTransientClones(matrices)
      return
    }

    if (!this._batch) {
      this._batch = new AcEdBatchedPreview(
        this._view,
        this._sourceIds,
        matrices.length
      )
      if (!this._batch.useBatchPreview) {
        this._batch = null
        this._batchUnavailable = true
        this.publishTransientClones(matrices)
        return
      }
    }
    this._batch.updateMatrices(this._view, matrices)
  }

  dispose(): void {
    this.restoreSourceVisibility()
    this.clearOverlays()
    this._placementCount = -1
  }

  /** True when overlays are drawn as transient clones instead of batch roots. */
  private useTransientOverlay(): boolean {
    return this._batchUnavailable && this._batch == null
  }

  private worldItemTransforms(
    parameters: AcDbAssocArrayParameters,
    keepSources: boolean
  ): AcGeMatrix3d[] {
    const matrices: AcGeMatrix3d[] = []
    for (const locator of parameters.getItemLocators()) {
      if (
        keepSources &&
        locator.itemIndex === 0 &&
        locator.rowIndex === 0 &&
        locator.levelIndex === 0
      ) {
        continue
      }
      matrices.push(
        acapArrayWorldItemTransform(parameters, locator, this._basePoint)
      )
    }
    return matrices
  }

  /**
   * Hides or restores the source entities.
   *
   * The original scene visibility of every source is captured before the first
   * hide so entities the user had already hidden (HIDEOBJECTS, visibility off)
   * are not forced back on when the preview ends.
   */
  private setSourcesVisible(visible: boolean): void {
    const hide = !visible
    if (hide === this._sourcesHidden) return
    this._sourcesHidden = hide

    if (hide) {
      for (const id of this._sourceIds) {
        this._sourceVisibility.set(
          id,
          this._view.getEntityVisible(id) ?? true
        )
      }
    }
    for (const id of this._sourceIds) {
      const target = hide ? false : (this._sourceVisibility.get(id) ?? true)
      this._view.setEntitySceneVisible(id, target)
    }
    if (!hide) this._sourceVisibility.clear()
  }

  private restoreSourceVisibility(): void {
    if (this._sourcesHidden) this.setSourcesVisible(true)
  }

  private publishTransientClones(matrices: readonly AcGeMatrix3d[]): void {
    for (const matrix of matrices) {
      for (const source of this._sources) {
        const copy = source.getTransformedCopy(matrix)
        this._transientEntities.push(copy)
      }
    }
    if (this._transientEntities.length > 0) {
      this._view.addTransientEntity(this._transientEntities)
    }
  }

  private clearOverlays(): void {
    this._batch?.dispose(this._view)
    this._batch = null
    this.clearTransient()
  }

  private clearTransient(): void {
    for (const entity of this._transientEntities) {
      this._view.removeTransientEntity(entity.objectId)
    }
    this._transientEntities = []
  }
}
