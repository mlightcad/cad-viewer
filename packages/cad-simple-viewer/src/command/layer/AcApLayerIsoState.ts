import { AcDbLayerTableRecord } from '@mlightcad/data-model'

/**
 * Layer flags that can be changed by `LAYISO` and restored by `LAYUNISO`.
 */
export interface AcApLayerIsoLayerState {
  /** Whether the layer is turned off. */
  isOff: boolean

  /** Whether the layer is frozen. */
  isFrozen: boolean

  /** Whether the layer is locked. */
  isLocked: boolean
}

/**
 * Before/after snapshot for one layer affected by `LAYISO`.
 */
export interface AcApLayerIsoLayerSnapshot {
  /** Layer name at the time the snapshot was captured. */
  name: string

  /** Layer state before `LAYISO` changed it. */
  before: AcApLayerIsoLayerState

  /** Layer state immediately after `LAYISO` finished. */
  isolated: AcApLayerIsoLayerState
}

/**
 * Snapshot for the most recent `LAYISO` command.
 */
export interface AcApLayerIsoSnapshot {
  /** Current layer before `LAYISO` ran. */
  currentLayerBefore: string

  /** Current layer immediately after `LAYISO` finished. */
  currentLayerAfter: string

  /** Layers whose state changed during `LAYISO`. */
  layers: AcApLayerIsoLayerSnapshot[]
}

/**
 * Stores the most recent `LAYISO` snapshot for `LAYUNISO`.
 */
export class AcApLayerIsoState {
  private static _snapshot: AcApLayerIsoSnapshot | undefined

  /**
   * Replaces the previous isolation snapshot.
   *
   * @param snapshot - Snapshot captured by the latest `LAYISO` run.
   */
  static set(snapshot: AcApLayerIsoSnapshot) {
    this._snapshot = snapshot
  }

  /**
   * Consumes the current snapshot so `LAYUNISO` behaves as a one-shot restore.
   *
   * @returns Latest isolation snapshot, or `undefined` if `LAYISO` has not run.
   */
  static consume() {
    const snapshot = this._snapshot
    this._snapshot = undefined
    return snapshot
  }
}

/**
 * Captures the layer state relevant to isolation.
 *
 * @param layer - Layer table record to inspect.
 * @returns Snapshot of visibility, freeze, and lock flags.
 */
export function getLayerIsoState(
  layer: AcDbLayerTableRecord
): AcApLayerIsoLayerState {
  return {
    isOff: layer.isOff,
    isFrozen: layer.isFrozen,
    isLocked: layer.isLocked
  }
}

/**
 * Compares two isolation layer states.
 *
 * @param a - First state.
 * @param b - Second state.
 * @returns `true` when all tracked flags match.
 */
export function isSameLayerIsoState(
  a: AcApLayerIsoLayerState,
  b: AcApLayerIsoLayerState
) {
  return (
    a.isOff === b.isOff &&
    a.isFrozen === b.isFrozen &&
    a.isLocked === b.isLocked
  )
}
