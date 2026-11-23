import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbDimension,
  AcDbEntity,
  AcDbEntityRuntimeProperty,
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import {
  createRotationMatrix,
  createScaleMatrix
} from '../util/AcApGeTransform.js'
import { isEntityOnLockedLayer } from './AcApLockedLayer.js'
import { acapRunServiceEdit, ENTITY_EDIT_LABEL } from './AcApServiceEdit.js'

/**
 * Options for {@link AcApEntityService.cloneAndTransform}.
 */
export interface AcApCloneAndTransformOptions {
  /**
   * Append each clone to its source entity's owner block table record
   * (model space, paper space, or another BTR). Falls back to model space
   * when the owner cannot be resolved. Default `true`.
   */
  append?: boolean
  /**
   * Regenerate the anonymous blocks of transformed dimensions. Default `false`.
   * See {@link AcApTransformOptions.regenerateDimensions}.
   */
  regenerateDimensions?: boolean
}

/**
 * Options for {@link AcApEntityService.transformEntities}.
 */
export interface AcApTransformOptions {
  /**
   * Regenerate the anonymous `*D` block of every transformed dimension, like
   * AutoCAD after SCALE: the cached block would otherwise scale its text and
   * arrowheads together with the definition points, while AutoCAD keeps them
   * at their dimension-style (DIMSCALE) size. Default `false`.
   */
  regenerateDimensions?: boolean
}

/**
 * Regenerates the dimension block of `entity` when it is a dimension.
 */
function regenerateDimension(entity: AcDbEntity) {
  if (entity instanceof AcDbDimension) entity.recomputeDimBlock()
}

/** Undo label for property palette edits. */
const ENTITY_PROPERTY_EDIT_LABEL = 'Properties'

/**
 * Finds a property (writable or not) of `entity` by group and name.
 */
function findEntityProperty(
  entity: AcDbEntity,
  groupName: string,
  propertyName: string
): AcDbEntityRuntimeProperty | undefined {
  return entity.properties.groups
    .find(group => group.groupName === groupName)
    ?.properties.find(property => property.name === propertyName)
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
   * @param options - Post-transform behavior.
   * @returns Number of entities successfully transformed.
   */
  transformEntities(
    entities: AcDbEntity[],
    matrix: AcGeMatrix3d,
    options: AcApTransformOptions = {}
  ): number {
    return this.runEntityEdit(() => {
      let count = 0
      entities.forEach(entity => {
        if (isEntityOnLockedLayer(this.db, entity)) return
        const opened = this.db.openEntityForWrite(entity)
        if (!opened) return
        opened.transformBy(matrix)
        if (options.regenerateDimensions) regenerateDimension(opened)
        count++
      })
      return count
    })
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
   * Uniformly scales entities around a base point. Dimensions get their
   * blocks regenerated so text and arrowheads keep their style size, like
   * AutoCAD SCALE.
   *
   * @param entities - Entities to scale.
   * @param basePoint - Scale origin in WCS, which stays fixed.
   * @param factor - Uniform scale factor (must be positive).
   * @returns Number of entities successfully scaled.
   */
  scaleEntities(
    entities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    factor: number
  ): number {
    const matrix = createScaleMatrix(basePoint, factor)
    return this.transformEntities(entities, matrix, {
      regenerateDimensions: true
    })
  }

  /**
   * Clones entities, transforms them, and optionally appends each clone to
   * its source's owner block table record (not always model space).
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
    const clones: AcDbEntity[] = []
    const sourcesForClones: AcDbEntity[] = []
    for (const entity of sourceEntities) {
      const clone = entity.getTransformedCopy(matrix)
      if (!clone) continue
      if (options.regenerateDimensions) regenerateDimension(clone)
      clones.push(clone)
      sourcesForClones.push(entity)
    }

    if (append && clones.length > 0) {
      const modelSpace = this.db.tables.blockTable.modelSpace
      const byOwner = new Map<AcDbBlockTableRecord, AcDbEntity[]>()
      for (let i = 0; i < clones.length; i++) {
        const owner = this.db.getObjectById(sourcesForClones[i].ownerId)
        const space =
          owner instanceof AcDbBlockTableRecord ? owner : modelSpace
        const bucket = byOwner.get(space)
        if (bucket) {
          bucket.push(clones[i])
        } else {
          byOwner.set(space, [clones[i]])
        }
      }
      for (const [space, entities] of byOwner) {
        space.appendEntity(entities)
      }
    }

    return clones
  }

  /**
   * Erases entities by object id. Unknown ids and entities on locked layers
   * are skipped.
   *
   * The entities are removed from each block in one pass: erasing them one
   * by one scans the block for every entity, which takes many seconds when
   * thousands of strokes are erased from a large drawing.
   *
   * @param objectIds - Entity ids to erase.
   * @returns Number of entities successfully erased.
   */
  eraseEntities(objectIds: AcDbObjectId[]): number {
    return this.runEntityEdit(() => {
      const blockTable = this.db.tables?.blockTable
      if (!blockTable) return 0
      const erasable: AcDbObjectId[] = []
      new Set(objectIds).forEach(objectId => {
        const existing = blockTable.getEntityById(objectId)
        if (!existing || isEntityOnLockedLayer(this.db, existing)) return
        const entity = this.db.openEntityForWrite(objectId)
        if (!entity) return
        if (isEntityOnLockedLayer(this.db, entity)) return
        erasable.push(objectId)
      })
      if (erasable.length === 0) return 0
      // `blockTable.removeEntity` stops at the first block that removed any
      // entity, so ask every block for the ids it owns.
      for (const block of blockTable.newIterator()) {
        block.removeEntity(erasable)
      }
      return erasable.length
    })
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

      if (isEntityOnLockedLayer(this.db, entity)) return

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
   * Sets one property-palette property on entities, as one undoable edit.
   *
   * The property is looked up by group and name in each entity's
   * {@link AcDbEntity.properties}, so the same edit applies to a mixed
   * selection. Entities on locked layers, entities without that property and
   * read-only properties are skipped. Dimensions get their block regenerated
   * after a non-general property changes, like after a grip edit.
   *
   * @param objectIds - Entities to change.
   * @param groupName - Property group, e.g. `general` or `geometry`.
   * @param propertyName - Property name within the group.
   * @param value - New value, of the type the property declares.
   * @returns Number of entities changed.
   */
  setEntityProperty(
    objectIds: AcDbObjectId[],
    groupName: string,
    propertyName: string,
    value: unknown
  ): number {
    return this.runEdit(ENTITY_PROPERTY_EDIT_LABEL, () => {
      let count = 0
      new Set(objectIds).forEach(objectId => {
        const existing = this.db.tables.blockTable.getEntityById(objectId)
        if (!existing || isEntityOnLockedLayer(this.db, existing)) return
        if (!findEntityProperty(existing, groupName, propertyName)) return
        const entity = this.db.openEntityForWrite(objectId)
        if (!entity) return
        const property = findEntityProperty(entity, groupName, propertyName)
        if (!property?.accessor.set) return
        property.accessor.set(value)
        if (groupName !== 'general') regenerateDimension(entity)
        count++
      })
      return count
    })
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
   * @returns The value returned by `fn`.
   */
  runEdit<T>(label: string, fn: () => T): T {
    return acapRunServiceEdit(this.db, label, fn)
  }

  /**
   * Runs an entity edit with the default entity undo label.
   *
   * @param fn - Mutation callback.
   * @returns The value returned by `fn`.
   */
  runEntityEdit<T>(fn: () => T): T {
    return acapRunServiceEdit(this.db, ENTITY_EDIT_LABEL, fn)
  }
}
