import {
  AcDbAssocArrayActionBody,
  AcDbAssocArrayParameters,
  AcDbEntity,
  AcDbObjectId,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeMatrix3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext } from '../../../app/index.js'
import {
  acapArrayFirstItemIsIdentity,
  acapArrayWorldItemTransform
} from './AcApArrayWorldTransform.js'

/**
 * Returns whether newly created arrays should be associative
 * (`ARRAYASSOCIATIVITY`).
 */
export function acapArrayAssociativity(db: { /* AcDbDatabase */ }): boolean {
  const value = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.ARRAYASSOCIATIVITY,
    db as never
  )
  return value !== 0 && value !== false
}

export interface AcApArrayCommitResult {
  /** Ids of created array INSERT (associative) or loose clones. */
  createdIds: AcDbObjectId[]
  associative: boolean
}

/**
 * Commits an array: associative via {@link AcDbAssocArrayActionBody.createInstance},
 * or non-associative as independent transformed clones.
 */
export function acapCommitArray(
  context: AcApContext,
  sourceIds: readonly AcDbObjectId[],
  basePoint: AcGePoint3dLike,
  parameters: AcDbAssocArrayParameters,
  associative: boolean
): AcApArrayCommitResult {
  const db = context.doc.database
  const modelSpace = db.tables.blockTable.modelSpace

  if (associative) {
    const sources: AcDbEntity[] = []
    for (const id of sourceIds) {
      const entity = db.getObjectById(id)
      if (entity instanceof AcDbEntity) sources.push(entity)
    }
    // Drop source graphics before createInstance erases them.
    if (sources.length > 0) {
      context.view.removeEntity(sources)
    }
    let result: { arrayEntityId: AcDbObjectId }
    try {
      result = AcDbAssocArrayActionBody.createInstance(
        sourceIds,
        basePoint,
        parameters,
        db
      )
    } catch (error) {
      // The surrounding undo mark rolls the database back, but the scene
      // graphics were already dropped; put back the sources that still exist
      // so the drawing does not lose the selected objects.
      const remaining = sources.filter(
        source => db.getObjectById(source.objectId) === source
      )
      if (remaining.length > 0) context.view.addEntity(remaining)
      throw error
    }
    const entity = db.getObjectById(result.arrayEntityId)
    if (entity instanceof AcDbEntity) {
      context.view.addEntity(entity)
    }
    return { createdIds: [result.arrayEntityId], associative: true }
  }

  const createdIds: AcDbObjectId[] = []
  const sources: AcDbEntity[] = []
  for (const id of sourceIds) {
    const entity = db.getObjectById(id)
    if (entity instanceof AcDbEntity) sources.push(entity)
  }

  const keepSources = acapArrayFirstItemIsIdentity(parameters, basePoint)
  const pending: AcDbEntity[] = []
  for (const locator of parameters.getItemLocators()) {
    if (
      keepSources &&
      locator.itemIndex === 0 &&
      locator.rowIndex === 0 &&
      locator.levelIndex === 0
    ) {
      continue
    }
    // Same world wrap as live preview: item matrices are BTR-local to base.
    const matrix = acapArrayWorldItemTransform(parameters, locator, basePoint)
    for (const source of sources) {
      pending.push(source.getTransformedCopy(matrix))
    }
  }

  if (!keepSources && sources.length > 0) {
    // Item (0,0,0) moved/rotated — originals must not remain at the old pose.
    context.view.removeEntity(sources)
    for (const source of sources) {
      source.erase()
    }
  }

  for (const copy of pending) {
    modelSpace.appendEntity(copy)
    context.view.addEntity(copy)
    createdIds.push(copy.objectId)
  }

  return { createdIds, associative: false }
}

/**
 * Builds a pure translation matrix (helper for preview).
 */
export function acapArrayTranslationMatrix(
  x: number,
  y: number,
  z = 0
): AcGeMatrix3d {
  return AcGeMatrix3d.makeTranslation(x, y, z)
}
