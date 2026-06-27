import {
  AcDbDatabase,
  AcDbEntity,
  AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApAnnotation, AcApContext, AcApDocManager } from '../app'
import {
  AcEdOpenMode,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../editor'
import { AcApI18n } from '../i18n'
import { createRotationMatrix } from '../util/AcApGeTransform'
import { acapRunServiceEdit, ENTITY_EDIT_LABEL } from './AcApServiceEdit'

/**
 * Options for {@link AcApEntityService.resolveSelectedEntities}.
 */
export interface AcApResolveSelectedOptions {
  /** I18n `sysCmdPrompt` key used when prompting for a selection. */
  promptKey?: string
  /** When `true`, empty selection clears the selection set. Default `true`. */
  clearOnEmpty?: boolean
}

/**
 * Result of resolving selected entities from preselection or a prompt.
 */
export interface AcApResolveSelectedResult {
  /** Resolved entity instances. */
  entities: AcDbEntity[]
  /** Object ids corresponding to `entities`. */
  ids: AcDbObjectId[]
}

/**
 * Options for {@link AcApEntityService.cloneAndTransform}.
 */
export interface AcApCloneAndTransformOptions {
  /** Append clones to model space. Default `true`. */
  append?: boolean
  /** Add clones to the view before transaction commit. Default `false`. */
  notifyView?: boolean
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
 * Provides selection resolution, geometric transforms, cloning, erasure,
 * layer reassignment, and undo-wrapped edit helpers.
 */
export class AcApEntityService {
  /**
   * Resolves selected entities from preselection or an interactive prompt.
   *
   * In review mode, annotation entities are filtered from the selection.
   *
   * @param context - Application context with view, document, and editor access.
   * @param options - Prompt and empty-selection behavior.
   * @returns Resolved entities and ids, or `undefined` when nothing is selected.
   */
  static async resolveSelectedEntities(
    context: AcApContext,
    options: AcApResolveSelectedOptions = {}
  ): Promise<AcApResolveSelectedResult | undefined> {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)
    const blockTable = context.doc.database.tables.blockTable
    const clearOnEmpty = options.clearOnEmpty ?? true

    const selectionIds =
      selectionSet.count > 0
        ? selectionSet.ids
        : options.promptKey
          ? ((
              await AcApDocManager.instance.editor.getSelection(
                new AcEdPromptSelectionOptions(
                  AcApI18n.sysCmdPrompt(options.promptKey)
                )
              )
            ).value?.ids ?? [])
          : []

    if (selectionIds.length === 0) return undefined

    const ids =
      context.doc.openMode == AcEdOpenMode.Review
        ? annotation.filterAnnotationEntities(selectionIds)
        : selectionIds

    if (ids.length === 0) {
      if (clearOnEmpty) selectionSet.clear()
      return undefined
    }

    const entities = ids
      .map(id => blockTable.getEntityById(id))
      .filter((entity): entity is AcDbEntity => !!entity)

    if (entities.length === 0) {
      if (clearOnEmpty) selectionSet.clear()
      return undefined
    }

    return { entities, ids }
  }

  /**
   * Resolves entity ids from selection, supporting erase-style preselection handling.
   *
   * Uses the active selection set when non-empty; otherwise prompts with `promptKey`.
   * In review mode, annotation entities are filtered out.
   *
   * @param context - Application context with view, document, and editor access.
   * @param promptKey - I18n `sysCmdPrompt` key for the selection prompt.
   * @returns Resolved entity ids, or `undefined` when nothing is selected.
   */
  static async resolveSelectedIds(
    context: AcApContext,
    promptKey: string
  ): Promise<AcDbObjectId[] | undefined> {
    const selectionSet = context.view.selectionSet
    const annotation = new AcApAnnotation(context.doc.database)

    if (selectionSet.count > 0) {
      const ids =
        context.doc.openMode == AcEdOpenMode.Review
          ? annotation.filterAnnotationEntities(selectionSet.ids)
          : selectionSet.ids
      return ids.length > 0 ? ids : undefined
    }

    const options = new AcEdPromptSelectionOptions(
      AcApI18n.sysCmdPrompt(promptKey)
    )
    const selectionResult =
      await AcApDocManager.instance.editor.getSelection(options)
    if (
      selectionResult.status !== AcEdPromptStatus.OK ||
      !selectionResult.value ||
      selectionResult.value.count === 0
    ) {
      return undefined
    }

    let ids = selectionResult.value.ids
    if (context.doc.openMode == AcEdOpenMode.Review) {
      ids = annotation.filterAnnotationEntities(ids)
    }
    return ids.length > 0 ? ids : undefined
  }

  /**
   * Returns entity instances for the given object ids.
   *
   * @param db - Database used to resolve entities.
   * @param ids - Entity object ids to look up.
   * @returns Entities that exist in the block table.
   */
  static getEntitiesByIds(db: AcDbDatabase, ids: AcDbObjectId[]): AcDbEntity[] {
    return ids
      .map(id => db.tables.blockTable.getEntityById(id))
      .filter((entity): entity is AcDbEntity => !!entity)
  }

  /**
   * Applies a transform matrix to entities opened for write.
   *
   * @param db - Database used to open entities.
   * @param entities - Entities to transform.
   * @param matrix - Transform to apply via {@link AcDbEntity.transformBy}.
   * @returns Number of entities successfully transformed.
   */
  static transformEntities(
    db: AcDbDatabase,
    entities: AcDbEntity[],
    matrix: AcGeMatrix3d
  ): number {
    let count = 0
    entities.forEach(entity => {
      const opened = db.openEntityForWrite(entity)
      if (!opened) return
      opened.transformBy(matrix)
      count++
    })
    return count
  }

  /**
   * Translates entities by a displacement vector.
   *
   * @param db - Database used to open entities.
   * @param entities - Entities to move.
   * @param displacement - Translation vector in WCS.
   * @returns Number of entities successfully translated.
   */
  static translateEntities(
    db: AcDbDatabase,
    entities: AcDbEntity[],
    displacement: AcGePoint3dLike
  ): number {
    const matrix = new AcGeMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      displacement.z
    )
    return AcApEntityService.transformEntities(db, entities, matrix)
  }

  /**
   * Rotates entities around a base point.
   *
   * @param db - Database used to open entities.
   * @param entities - Entities to rotate.
   * @param basePoint - Rotation origin in WCS.
   * @param angleRad - Rotation angle in radians.
   * @returns Number of entities successfully rotated.
   */
  static rotateEntities(
    db: AcDbDatabase,
    entities: AcDbEntity[],
    basePoint: AcGePoint3dLike,
    angleRad: number
  ): number {
    const matrix = createRotationMatrix(basePoint, angleRad)
    return AcApEntityService.transformEntities(db, entities, matrix)
  }

  /**
   * Clones entities, transforms them, and optionally appends to model space.
   *
   * @param context - Application context with document and view access.
   * @param sourceEntities - Entities to clone.
   * @param matrix - Transform applied to each clone.
   * @param options - Append and view-notification behavior.
   * @returns Transformed clone instances (before or after append, depending on options).
   */
  static cloneAndTransform(
    context: AcApContext,
    sourceEntities: AcDbEntity[],
    matrix: AcGeMatrix3d,
    options: AcApCloneAndTransformOptions = {}
  ): AcDbEntity[] {
    const append = options.append ?? true
    const notifyView = options.notifyView ?? false
    const db = context.doc.database
    const clones = sourceEntities
      .map(entity => entity.clone())
      .filter((entity): entity is AcDbEntity => !!entity)

    clones.forEach(entity => entity.transformBy(matrix))

    if (append && clones.length > 0) {
      db.tables.blockTable.modelSpace.appendEntity(clones)
      if (notifyView) {
        clones.forEach(entity => context.view.addEntity(entity))
      }
    }

    return clones
  }

  /**
   * Erases entities by object id.
   *
   * @param db - Database used to open entities for write.
   * @param objectIds - Entity ids to erase.
   * @returns Number of entities successfully erased.
   */
  static eraseEntities(db: AcDbDatabase, objectIds: AcDbObjectId[]): number {
    let count = 0
    objectIds.forEach(objectId => {
      const entity = db.openEntityForWrite(objectId)
      if (!entity) return
      entity.erase()
      count++
    })
    return count
  }

  /**
   * Moves entities to the current layer (`CLAYER`).
   *
   * @param db - Database containing entities and the layer table.
   * @param objectIds - Entity ids to reassign.
   * @returns Counts of changed, skipped, and missing entities.
   */
  static moveEntitiesToCurrentLayer(
    db: AcDbDatabase,
    objectIds: AcDbObjectId[]
  ): AcApMoveToCurrentLayerResult {
    const currentLayerName = db.clayer?.trim()
    const currentLayer = currentLayerName
      ? db.tables.layerTable.getAt(currentLayerName)
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
      const entity = db.tables.blockTable.getEntityById(objectId)
      if (!entity) {
        missing++
        return
      }

      if (entity.layer === currentLayer.name) {
        alreadyCurrent++
        return
      }

      const opened = db.openEntityForWrite(objectId)
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
   * Computes the displacement vector from a base point to a target point.
   *
   * @param basePoint - Start point.
   * @param targetPoint - End point.
   * @returns `targetPoint - basePoint` as an {@link AcGePoint3d}.
   */
  static computeDisplacement(
    basePoint: AcGePoint3dLike,
    targetPoint: AcGePoint3dLike
  ): AcGePoint3d {
    return new AcGePoint3d(
      targetPoint.x - basePoint.x,
      targetPoint.y - basePoint.y,
      targetPoint.z - basePoint.z
    )
  }

  /**
   * Runs an entity edit with undo when outside a command transaction.
   *
   * @param db - Database to mutate.
   * @param label - Undo group label.
   * @param fn - Mutation callback.
   */
  static runEdit(db: AcDbDatabase, label: string, fn: () => void): void {
    acapRunServiceEdit(db, label, fn)
  }

  /**
   * Runs an entity edit with the default entity undo label.
   *
   * @param db - Database to mutate.
   * @param fn - Mutation callback.
   */
  static runEntityEdit(db: AcDbDatabase, fn: () => void): void {
    acapRunServiceEdit(db, ENTITY_EDIT_LABEL, fn)
  }
}
