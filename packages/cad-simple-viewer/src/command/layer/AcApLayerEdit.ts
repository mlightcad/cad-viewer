import { AcDbDatabase, AcDbLayerTableRecord } from '@mlightcad/data-model'

/** Bit mask for the global frozen flag in {@link AcDbLayerTableRecord.standardFlags}. */
export const LAYER_FROZEN_FLAG = 0x01

/** Bit mask for the locked flag in {@link AcDbLayerTableRecord.standardFlags}. */
export const LAYER_LOCKED_FLAG = 0x04

/**
 * Opens an existing layer table record for write through the active transaction.
 *
 * Symbol table records follow ObjectARX semantics: callers must open a record
 * with {@link AcDbDatabase.openObjectForWrite} before mutating it while a
 * transaction is recording changes.
 *
 * @param db - Database that owns the layer table.
 * @param layerOrName - Layer record or layer name to open.
 * @returns The opened layer record, or `undefined` when the layer does not exist.
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
 * Sets or clears the frozen bit in a layer's {@link AcDbLayerTableRecord.standardFlags}.
 *
 * Other standard flags on the record are preserved.
 *
 * @param layer - Layer record that is already open for write.
 * @param frozen - `true` to freeze the layer, `false` to thaw it.
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

/**
 * Sets or clears the locked bit in a layer's {@link AcDbLayerTableRecord.standardFlags}.
 *
 * Other standard flags on the record are preserved.
 *
 * @param layer - Layer record that is already open for write.
 * @param locked - `true` to lock the layer, `false` to unlock it.
 */
export function setLayerLockedState(
  layer: AcDbLayerTableRecord,
  locked: boolean
) {
  const flags = layer.standardFlags ?? 0
  layer.standardFlags = locked
    ? flags | LAYER_LOCKED_FLAG
    : flags & ~LAYER_LOCKED_FLAG
}

/**
 * Returns whether a layer is locked according to its standard flags.
 *
 * @param layer - Layer record to inspect.
 * @returns `true` when the locked bit is set in {@link AcDbLayerTableRecord.standardFlags}.
 */
export function isLayerLocked(layer: AcDbLayerTableRecord): boolean {
  return ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
}
