import {
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { createRotationMatrix } from '../util/AcApGeTransform'
import { acapRunServiceEdit, ENTITY_EDIT_LABEL } from './AcApServiceEdit'

/**
 * Options for {@link AcApEntityService.cloneAndTransform}.
 */
export interface AcApCloneAndTransformOptions {
  /** Append clones to model space. Default `true`. */
  append?: boolean
}

/**
 * Result of moving entities to the current layer (`LAYMCUR` semantics).
 */
export interface AcApMoveToCurrentLayerResult {
  /** Number of entities whose layer was changed. */
  changedCount: number
  /** Number of entities already on the current layer. */
  alreadyCurrent: number
  /** Number of entity ids that could not be resolved or opened. */
  missing: number
  /** `true` when the current layer does not exist in the layer table. */
  currentLayerMissing: boolean
}

/**
 * Centralizes entity mutations for modify commands and non-command callers.
 *
 * Provides geometric transforms, cloning, erasure, layer reassignment,
 * and undo-wrapped edit helpers against a single {@link AcDbDatabase}.
 */
export class AcApEntityService {
  private readonly db: AcDbDatabase

  /**
   * Creates an entity service bound to a database.
   *
   * @param db - Database whose entities will be mutated.
   */
  constructor(db: AcDbDatabase) {
    this.db = db
  }

  /**
   * Returns entity instances for the given object ids.
   *
   * @param ids - Entity object ids to look up.
   * @returns Entities that exist in the block table.
   */
  getEntitiesByIds(ids: AcDbObjectId[]): AcDbEntity[] {
    return ids
      .map(id => this.db.tables.blockTable.getEntityById(id))
      .filter((entity): entity is AcDbEntity => !!entity)
  }

  /**
   * Applies a transform matrix to entities opened for write.
   *
   * @param entities - Entities to transform.
   * @param matrix - Transform to apply via {@link AcDbEntity.transformBy}.
   * @returns Number of entities successfully transformed.
   */
  transformEntities(entities: AcDbEntity[], matrix: AcGeMatrix3d): number {
    let count = 0
    entities.forEach(entity => {
      const opened = this.db.openEntityForWrite(entity)
      if (!opened) return
      opened.transformBy(matrix)
      count++
    })
    return count
  }

  /**
   * Translates entities by a displacement vector.
   *
   * @param entities - Entities to move.
   * @param displacement - Translation vector in WCS.
   * @returns Number of entities successfully translated.
   */
  translateEntities(
    entities: AcDbEntity[],
    displacement: AcGePoint3dLike
  ): number {
    const matrix = new AcGeMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      displacement.z
    )
    return this.transformEntities(entities, matrix)
  }

  /**
   * Rotates entities around a base point.
   *
   * @param entities - Entities to rotate.
   * @param basePoint - Rotation origin in WCS.
   * @param angleRad - Rotation angle in radians.
   * @returns Number of entities successfully rotated.
   */
  rotateEntities(
    entities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    angleRad: number
  ): number {
    const matrix = createRotationMatrix(basePoint, angleRad)
    return this.transformEntities(entities, matrix)
  }

  /**
   * Clones entities, transforms them, and optionally appends to model space.
   *
   * @param sourceEntities - Entities to clone.
   * @param matrix - Transform applied to each clone.
   * @param options - Append behavior.
   * @returns Transformed clone instances.
   */
  cloneAndTransform(
    sourceEntities: AcDbEntity[],
    matrix: AcGeMatrix3d,
    options: AcApCloneAndTransformOptions = {}
  ): AcDbEntity[] {
    const append = options.append ?? true
    const clones = sourceEntities
      .map(entity => entity.clone())
      .filter((entity): entity is AcDbEntity => !!entity)

    clones.forEach(entity => entity.transformBy(matrix))

    if (append && clones.length > 0) {
      this.db.tables.blockTable.modelSpace.appendEntity(clones)
    }

    return clones
  }

  /**
   * Erases entities by object id.
   *
   * @param objectIds - Entity ids to erase.
   * @returns Number of entities successfully erased.
   */
  eraseEntities(objectIds: AcDbObjectId[]): number {
    let count = 0
    objectIds.forEach(objectId => {
      const entity = this.db.openEntityForWrite(objectId)
      if (!entity) return
      entity.erase()
      count++
    })
    return count
  }

  /**
   * Moves entities to the current layer (`CLAYER`).
   *
   * @param objectIds - Entity ids to reassign.
   * @returns Counts of changed, skipped, and missing entities.
   */
  moveEntitiesToCurrentLayer(
    objectIds: AcDbObjectId[]
  ): AcApMoveToCurrentLayerResult {
    const currentLayerName = this.db.clayer?.trim()
    const currentLayer = currentLayerName
      ? this.db.tables.layerTable.getAt(currentLayerName)
      : undefined

    if (!currentLayer) {
      return {
        changedCount: 0,
        alreadyCurrent: 0,
        missing: 0,
        currentLayerMissing: true
      }
    }

    let changedCount = 0
    let alreadyCurrent = 0
    let missing = 0

    new Set(objectIds).forEach(objectId => {
      const entity = this.db.tables.blockTable.getEntityById(objectId)
      if (!entity) {
        missing++
        return
      }

      if (entity.layer === currentLayer.name) {
        alreadyCurrent++
        return
      }

      const opened = this.db.openEntityForWrite(objectId)
      if (!opened) {
        missing++
        return
      }

      opened.layer = currentLayer.name
      changedCount++
    })

    return { changedCount, alreadyCurrent, missing, currentLayerMissing: false }
  }

  /**
   * Copies display traits from one entity to another.
   *
   * Copies layer, color, linetype, line weight, linetype scale, transparency,
   * and visibility.
   *
   * @param source - Entity to copy traits from.
   * @param target - Entity to receive traits.
   */
  static copyDisplayTraits(source: AcDbEntity, target: AcDbEntity): void {
    target.layer = source.layer
    target.color = source.color.clone()
    target.lineType = source.lineType
    target.lineWeight = source.lineWeight
    target.linetypeScale = source.linetypeScale
    target.transparency = source.transparency
    target.visibility = source.visibility
  }

  /**
   * Runs an entity edit with undo when outside a command transaction.
   *
   * @param label - Undo group label.
   * @param fn - Mutation callback.
   */
  runEdit(label: string, fn: () => void): void {
    acapRunServiceEdit(this.db, label, fn)
  }

  /**
   * Runs an entity edit with the default entity undo label.
   *
   * @param fn - Mutation callback.
   */
  runEntityEdit(fn: () => void): void {
    acapRunServiceEdit(this.db, ENTITY_EDIT_LABEL, fn)
  }
}
