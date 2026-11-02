import type { AcDbDatabase, AcDbEntity } from '@mlightcad/data-model'

/** `standardFlags` bit for a locked layer (DXF group 70, bit 4). */
export const LAYER_LOCKED_FLAG = 0x04

/** `standardFlags` bit for a frozen layer (DXF group 70, bit 1). */
export const LAYER_FROZEN_FLAG = 0x01

/**
 * Returns whether an entity cannot be edited because its layer is locked.
 *
 * Same logic as `isEntityOnLockedLayer` in
 * `cad-simple-viewer/src/service/AcApLockedLayer.ts`; keep the two in sync.
 * Reads the flag bit directly instead of `isLocked`, matching the viewer:
 * some data-model releases do not clear the bit through the `isLocked` setter.
 * Missing entities or layers count as unlocked.
 *
 * @param db - Database that owns the layer table.
 * @param entity - Entity to test.
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
