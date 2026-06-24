import {
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * Manages batched entity preview overlays for command jigs.
 *
 * Used by MOVE, ROTATE, COPY, and similar modify jigs. When batch preview
 * creation succeeds, the overlay reuses GPU-resident geometry and is updated
 * each frame via {@link AcEdBaseView.updateEntityPreview}. When creation
 * fails, callers fall back to legacy transient entity clones.
 *
 * Pass `copyCount` of `1` (default) for a single transformed preview, or a
 * larger value for COPY array previews with independent placements.
 */
export class AcEdBatchedPreview {
  /**
   * Preview handle ids returned by {@link AcEdBaseView.createEntityPreview}.
   *
   * @private
   */
  private readonly _handleIds: string[] = []

  /**
   * Whether this instance is driving batched GPU-resident previews.
   *
   * When `false`, callers should use the legacy transient-entity preview path.
   */
  readonly useBatchPreview: boolean

  /**
   * Number of preview overlays managed by this instance.
   *
   * Zero when no previews were requested at construction time.
   */
  readonly copyCount: number

  /**
   * Creates one or more batched preview overlays for the given entities.
   *
   * Batch preview is disabled when `copyCount` is zero, the view cannot
   * create batch previews, or any individual overlay fails to initialize.
   * On partial failure, all successfully created overlays are disposed
   * before returning.
   *
   * @param view - View that owns preview creation and scene updates
   * @param entityIds - Object ids of entities to include in each overlay
   * @param copyCount - Number of overlays to create (default `1`)
   */
  constructor(
    view: AcEdBaseView,
    entityIds: AcDbObjectId[],
    copyCount = 1
  ) {
    this.copyCount = Math.max(0, copyCount)
    if (this.copyCount === 0 || entityIds.length === 0) {
      this.useBatchPreview = false
      return
    }

    for (let i = 0; i < this.copyCount; i++) {
      const handleId = view.createEntityPreview(entityIds)
      if (!handleId) {
        this._handleIds.forEach(id => view.removeEntityPreview(id))
        this._handleIds.length = 0
        this.useBatchPreview = false
        return
      }
      this._handleIds.push(handleId)
      view.updateEntityPreview(handleId, new AcGeMatrix3d())
    }
    this.useBatchPreview = this._handleIds.length === this.copyCount
  }

  /**
   * Applies a world-space transform to the single preview overlay.
   *
   * No-op when batch preview was not created, has been disposed, or
   * {@link copyCount} is not `1`.
   *
   * @param view - View that owns the preview overlay
   * @param matrix - World transform to apply to the preview geometry
   */
  updateMatrix(view: AcEdBaseView, matrix: AcGeMatrix3d): void {
    if (!this.useBatchPreview || this._handleIds.length !== 1) {
      return
    }
    view.updateEntityPreview(this._handleIds[0], matrix)
  }

  /**
   * Updates the world-space placement of every copy overlay.
   *
   * Each overlay receives a translation matrix derived from `displacement`,
   * scaled by its copy factor and optional fit mode via
   * {@link scaleCopyDisplacement}. No-op when {@link useBatchPreview} is `false`.
   *
   * @param view - View that owns the preview overlays
   * @param displacement - Base displacement from the copy base point to the
   *   current cursor position
   * @param fitMode - When `true`, scales displacements so the last copy lands
   *   on the cursor (`factor / copyCount`); otherwise uses full multiples
   */
  updatePlacements(
    view: AcEdBaseView,
    displacement: AcGePoint3dLike,
    fitMode: boolean
  ): void {
    if (!this.useBatchPreview) {
      return
    }

    this._handleIds.forEach((handleId, index) => {
      const factor = index + 1
      const scaled = scaleCopyDisplacement(
        displacement,
        factor,
        this.copyCount,
        fitMode
      )
      view.updateEntityPreview(
        handleId,
        new AcGeMatrix3d().makeTranslation(scaled.x, scaled.y, scaled.z)
      )
    })
  }

  /**
   * Removes every batched preview overlay and clears internal handles.
   *
   * Safe to call multiple times. After disposal, update methods are no-ops.
   *
   * @param view - View that owns the preview overlays
   */
  dispose(view: AcEdBaseView): void {
    this._handleIds.forEach(handleId => view.removeEntityPreview(handleId))
    this._handleIds.length = 0
  }
}

/**
 * Scales a copy preview displacement for one array index.
 *
 * Computes the world-space offset for copy factor `factor` along a COPY array
 * preview. In fit mode, displacements are distributed evenly between the base
 * point and the cursor so the final copy reaches the cursor exactly.
 *
 * @param displacement - Base displacement from the copy base point to the
 *   current cursor position
 * @param factor - One-based copy index (`1` for the first copy, `2` for the
 *   second, and so on)
 * @param copyCount - Total number of copies in the array preview
 * @param fitMode - When `true`, scales by `factor / copyCount`; otherwise
 *   scales by `factor`
 * @returns Scaled displacement as a new {@link AcGePoint3d}
 */
export function scaleCopyDisplacement(
  displacement: AcGePoint3dLike,
  factor: number,
  copyCount: number,
  fitMode: boolean
): AcGePoint3d {
  const scale = fitMode && copyCount > 0 ? factor / copyCount : factor
  return new AcGePoint3d(
    displacement.x * scale,
    displacement.y * scale,
    displacement.z * scale
  )
}
