/** Bit mask for the global frozen flag in layer `standardFlags`. */
export const LAYER_FROZEN_FLAG = 0x01

/** Bit mask for the locked flag in layer `standardFlags`. */
export const LAYER_LOCKED_FLAG = 0x04

/**
 * Options for {@link AcApLayerService.setLayerOn} and
 * {@link AcApLayerService.setLayerFrozen}.
 */
export interface AcApSetLayerOnOptions {
  /**
   * When turning off or freezing the current layer, switch `CLAYER` to another
   * layer first.
   *
   * - CLI commands default to `false` and skip the current layer in batch ops.
   * - UI callers ({@link AcApLayerStore}, Vue `useLayers`) default to `true`
   *   so the user can hide or freeze the active layer without leaving drawing
   *   on a hidden/frozen layer.
   */
  switchCurrentLayer?: boolean
}

/**
 * Options for batch layer on/off and freeze/thaw operations.
 */
export interface AcApSetLayersVisibilityOptions {
  /**
   * Skip turning off or freezing the current layer.
   * Default `true`.
   */
  skipCurrentLayer?: boolean
}

/**
 * Isolation mode for the `LAYISO` command.
 *
 * - `Off` — non-isolated layers are turned off.
 * - `LockAndFade` — non-isolated layers are locked only. The viewer does not
 *   apply a visual fade; the keyword matches AutoCAD for parity. Users are
 *   notified via `jig.layiso.lockFadeFallback` when this mode is selected.
 */
export type AcApLayerIsolationMode = 'Off' | 'LockAndFade'

/**
 * Result of isolating layers via `LAYISO`.
 */
export interface AcApLayerIsolateResult {
  /** Names of layers that were isolated (kept visible). */
  layerNames: string[]

  /** Number of layers whose on, frozen, or locked state changed. */
  affectedLayerCount: number
}

/**
 * Snapshot of a deleted entity used by `LAYDEL` session undo.
 */
export interface AcApLaydelEntitySnapshot {
  /** Object id of the block table record that owned the entity. */
  ownerId: import('@mlightcad/data-model').AcDbObjectId

  /** Object id of the erased entity. */
  objectId: import('@mlightcad/data-model').AcDbObjectId

  /** Cloned entity data for restoration. */
  entity: import('@mlightcad/data-model').AcDbEntity
}

/**
 * Result of attempting to delete a layer.
 *
 * On success, includes the deleted layer record and entity snapshots for undo.
 * On failure, includes a reason code and the requested layer name.
 */
export type AcApDeleteLayerResult =
  | {
      /** Operation succeeded. */
      ok: true
      /** Name of the deleted layer. */
      layerName: string
      /** Cloned layer table record before removal. */
      layer: import('@mlightcad/data-model').AcDbLayerTableRecord
      /** Entity snapshots removed with the layer. */
      entities: AcApLaydelEntitySnapshot[]
    }
  | {
      /** Operation failed. */
      ok: false
      /**
       * Failure reason:
       * - `not_found` — layer does not exist.
       * - `layer_0` — layer `0` cannot be deleted.
       * - `current_layer` — current layer cannot be deleted.
       */
      reason: 'not_found' | 'layer_0' | 'current_layer'
      /** Name of the layer that could not be deleted. */
      layerName: string
    }

/**
 * Outcome of entity-driven layer operations (`LAYFRZ`, `LAYOFF`, `LAYLCK`, etc.).
 */
export type AcApLayerByEntityResult =
  | {
      /** Operation succeeded. */
      ok: true
      /** Name of the affected layer. */
      layerName: string
      /** Frozen state before the operation, when applicable. */
      previousFrozen?: boolean
      /** Off state before the operation, when applicable. */
      previousOff?: boolean
      /** Locked state before the operation, when applicable. */
      previousLocked?: boolean
    }
  | {
      /** Operation failed or was a no-op. */
      ok: false
      /**
       * Failure reason:
       * - `invalid_selection` — entity id does not resolve to a layer.
       * - `layer_not_found` — entity layer is missing from the layer table.
       * - `cannot_change_current` — current layer cannot be changed.
       * - `already_frozen` / `already_off` / `already_locked` / `already_unlocked`.
       */
      reason:
        | 'invalid_selection'
        | 'layer_not_found'
        | 'cannot_change_current'
        | 'already_frozen'
        | 'already_off'
        | 'already_locked'
        | 'already_unlocked'
      /** Name of the layer involved, when known. */
      layerName?: string
    }
