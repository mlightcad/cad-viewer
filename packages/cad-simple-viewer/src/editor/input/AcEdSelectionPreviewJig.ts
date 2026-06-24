import {
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d
} from '@mlightcad/data-model'

import { AcEdBaseView } from '../view/AcEdBaseView'
import { AcEdBatchedPreview } from './AcEdBatchPreview'
import { AcEdPreviewJig } from './AcEdPreviewJig'

/**
 * One transient preview clone paired with its copy-array factor.
 */
export interface AcEdSelectionPreviewEntry {
  entity: AcDbEntity
  copyFactor: number
}

/**
 * Transform description applied to one transient preview entity.
 */
export interface AcEdSelectionPreviewTransform {
  objectId: AcDbObjectId
  matrix: AcGeMatrix3d
}

/**
 * Static preview jig for selected entities.
 *
 * Keeps cloned source entities visible while prompts that do not modify
 * geometry are active (for example ROTATE base-point or reference-point input).
 */
export class AcEdSelectionStaticPreviewJig<T> extends AcEdPreviewJig<T> {
  protected readonly _view: AcEdBaseView
  protected readonly batchPreview: AcEdBatchedPreview
  protected readonly previewEntities: AcDbEntity[]
  private _transientsPublished = false

  /**
   * Creates a static transient preview for the given source entities.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   */
  constructor(view: AcEdBaseView, sourceEntities: AcDbEntity[]) {
    super(view)
    this._view = view
    this.batchPreview = new AcEdBatchedPreview(
      view,
      sourceEntities.map(entity => entity.objectId)
    )
    this.previewEntities = this.batchPreview.useBatchPreview
      ? []
      : sourceEntities
          .map(entity => entity.clone())
          .filter((entity): entity is AcDbEntity => !!entity)
  }

  /**
   * Accepts prompt updates without changing geometry because this preview is static.
   *
   * @param _value - Prompt value supplied by the editor, ignored by this jig.
   */
  update(_value: T) {
    // Static preview only.
  }

  /**
   * Adds the cloned entities to the view as transient preview graphics.
   */
  override render(): void {
    if (this.batchPreview.useBatchPreview) return
    if (this.previewEntities.length === 0) return
    if (this._transientsPublished) return
    this._view.addTransientEntity(this.previewEntities)
    this._transientsPublished = true
  }

  /**
   * Removes every transient preview entity from the view.
   */
  override end(): void {
    this.batchPreview.dispose(this._view)
    this.previewEntities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
  }
}

/**
 * Transform preview jig for a set of selected entities.
 *
 * Reuses GPU-resident batched geometry when possible. The legacy transient
 * clone path publishes once and then updates transforms only.
 */
export abstract class AcEdSelectionTransformPreviewJig<
  T
> extends AcEdPreviewJig<T> {
  protected readonly _view: AcEdBaseView
  protected readonly batchPreview: AcEdBatchedPreview
  protected readonly previewEntries: AcEdSelectionPreviewEntry[]
  protected readonly copyCount: number
  private _transientsPublished = false
  private _lastTransforms: AcEdSelectionPreviewTransform[] = []

  /**
   * Creates a transform preview jig for the given source entities.
   *
   * @param view - Active editor view that renders transient entities.
   * @param sourceEntities - Original entities cloned for preview display.
   * @param copyCount - Number of copy placements for array previews (default `1`).
   */
  constructor(
    view: AcEdBaseView,
    sourceEntities: AcDbEntity[],
    copyCount = 1
  ) {
    super(view)
    this._view = view
    this.copyCount = copyCount
    this.batchPreview = new AcEdBatchedPreview(
      view,
      sourceEntities.map(entity => entity.objectId),
      copyCount
    )
    this.previewEntries = this.batchPreview.useBatchPreview
      ? []
      : AcEdSelectionTransformPreviewJig.createPreviewEntries(
          sourceEntities,
          copyCount
        )
  }

  /**
   * Flat list of transient preview entities derived from {@link previewEntries}.
   */
  protected get previewEntities(): AcDbEntity[] {
    return this.previewEntries.map(entry => entry.entity)
  }

  /**
   * Builds world-space transforms for every transient preview entity.
   *
   * @param value - Current prompt input sampled by the editor.
   */
  protected abstract buildTransforms(
    value: T
  ): AcEdSelectionPreviewTransform[]

  /**
   * Applies the latest transform to batch overlays or caches transforms for
   * the transient clone path.
   *
   * Subclasses with `copyCount > 1` batch previews should override this method
   * and call {@link AcEdBatchedPreview.updatePlacements} when appropriate.
   *
   * @param value - Current prompt input sampled by the editor.
   */
  update(value: T): void {
    const transforms = this.buildTransforms(value)
    if (this.batchPreview.useBatchPreview) {
      if (this.copyCount === 1 && transforms.length > 0) {
        this.batchPreview.updateMatrix(this._view, transforms[0].matrix)
      }
      return
    }
    this._lastTransforms = transforms
  }

  /**
   * Publishes transient clones once and applies the latest cached transforms.
   */
  override render(): void {
    if (this.batchPreview.useBatchPreview) return
    if (this.previewEntries.length === 0) return

    if (!this._transientsPublished) {
      this._view.addTransientEntity(this.previewEntities)
      this._transientsPublished = true
    }

    if (this._lastTransforms.length > 0) {
      this._view.updateTransientPreviewTransforms(this._lastTransforms)
    }
  }

  /**
   * Disposes batch overlays and removes transient preview entities.
   */
  override end(): void {
    this.batchPreview.dispose(this._view)
    this.previewEntities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
  }

  /**
   * Clones source entities for transient preview rendering.
   *
   * @param sourceEntities - Database entities selected for preview.
   * @param copyCount - Number of array placements to clone.
   */
  private static createPreviewEntries(
    sourceEntities: AcDbEntity[],
    copyCount: number
  ): AcEdSelectionPreviewEntry[] {
    const entries: AcEdSelectionPreviewEntry[] = []
    for (let factor = 1; factor <= copyCount; factor++) {
      sourceEntities
        .map(entity => entity.clone())
        .filter((entity): entity is AcDbEntity => !!entity)
        .forEach(entity => {
          entries.push({ entity, copyFactor: factor })
        })
    }
    return entries
  }
}
