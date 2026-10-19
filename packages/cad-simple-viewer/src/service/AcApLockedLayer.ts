import {
  AcDbDatabase,
  AcDbEntity,
  AcDbLayerTableRecord,
  AcDbObjectId
} from '@mlightcad/data-model'

import { LAYER_LOCKED_FLAG } from './types'

/**
 * `@mlightcad/data-model` ORs `isLocked = false` with 0, so bit 4 stays set.
 * Replace the setter until the data-model release clears the bit itself.
 */
function installIsLockedSetterFix(): void {
  const proto = AcDbLayerTableRecord.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'isLocked')
  if (!desc?.get || !desc.set || desc.configurable === false) return

  Object.defineProperty(proto, 'isLocked', {
    configurable: true,
    enumerable: desc.enumerable ?? false,
    get: desc.get,
    set(this: AcDbLayerTableRecord, value: boolean) {
      const flags = this.standardFlags ?? 0
      this.standardFlags = value
        ? flags | LAYER_LOCKED_FLAG
        : flags & ~LAYER_LOCKED_FLAG
    }
  })
}

installIsLockedSetterFix()

/**
 * Returns whether an entity's layer is locked.
 *
 * Missing entities or layer records are treated as unlocked.
 *
 * @param db - Drawing database that owns the layer table.
 * @param entity - Entity whose layer name is checked.
 */
export function isEntityOnLockedLayer(
  db: AcDbDatabase | undefined,
  entity: Pick<AcDbEntity, 'layer'> | undefined | null
): boolean {
  const layerName = entity?.layer
  if (!db || !layerName) return false
  const layer = db.tables?.layerTable?.getAt(layerName)
  if (!layer) return false
  return ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
}

/**
 * Drops ids whose entities sit on a locked layer.
 *
 * Ids that cannot be resolved are kept so callers can still report them as missing.
 *
 * @param db - Drawing database used to resolve entities and layers.
 * @param ids - Candidate entity ids.
 */
export function excludeLockedLayerIds(
  db: AcDbDatabase | undefined,
  ids: AcDbObjectId[]
): { ids: AcDbObjectId[]; lockedCount: number } {
  if (!db || ids.length === 0) return { ids, lockedCount: 0 }
  const blockTable = db.tables?.blockTable
  if (!blockTable?.getEntityById) return { ids, lockedCount: 0 }

  const kept: AcDbObjectId[] = []
  let lockedCount = 0
  for (const id of ids) {
    const entity = blockTable.getEntityById(id)
    if (entity && isEntityOnLockedLayer(db, entity)) {
      lockedCount++
      continue
    }
    kept.push(id)
  }
  return { ids: kept, lockedCount }
}
