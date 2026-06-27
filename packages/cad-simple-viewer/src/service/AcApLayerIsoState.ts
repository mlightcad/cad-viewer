import { AcDbLayerTableRecord } from '@mlightcad/data-model'

import { LAYER_LOCKED_FLAG } from './types'

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
 * Captures the layer state relevant to isolation.
 *
 * @param layer - Layer table record to snapshot.
 * @returns Off, frozen, and locked flags for the layer.
 */
export function getLayerIsoState(
  layer: AcDbLayerTableRecord
): AcApLayerIsoLayerState {
  return {
    isOff: layer.isOff,
    isFrozen: layer.isFrozen,
    isLocked: ((layer.standardFlags ?? 0) & LAYER_LOCKED_FLAG) !== 0
  }
}

/**
 * Compares two isolation layer states for equality.
 *
 * @param a - First layer state.
 * @param b - Second layer state.
 * @returns `true` when off, frozen, and locked flags match.
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
