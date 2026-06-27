import {
  AcDbDatabase,
  AcDbLayerTableRecord
} from '@mlightcad/data-model'

/** Bit mask for the global frozen flag in layer `standardFlags`. */
export const LAYER_FROZEN_FLAG = 0x01

/**
 * Opens a layer table record for write access through the database.
 *
 * @param db - Active drawing database.
 * @param layerOrName - Layer record or layer name to open.
 * @returns Writable layer record, or `undefined` if the layer does not exist.
 */
export function openLayerForWrite(
  db: AcDbDatabase,
  layerOrName: AcDbLayerTableRecord | string
): AcDbLayerTableRecord | undefined {
  const layer =
    typeof layerOrName === 'string'
      ? db.tables.layerTable.getAt(layerOrName)
      : layerOrName
  if (!layer) return undefined
  return db.openObjectForWrite<AcDbLayerTableRecord>(layer.objectId)
}

/**
 * Sets or clears the frozen bit on a layer's `standardFlags`.
 *
 * @param layer - Layer record to update.
 * @param frozen - Desired frozen state.
 */
export function setLayerFrozenState(
  layer: AcDbLayerTableRecord,
  frozen: boolean
) {
  const flags = layer.standardFlags ?? 0
  layer.standardFlags = frozen
    ? flags | LAYER_FROZEN_FLAG
    : flags & ~LAYER_FROZEN_FLAG
}
