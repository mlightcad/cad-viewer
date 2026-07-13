import * as THREE from 'three'

import {
  isBatchGeometryActive,
  isBatchGeometryVisible
} from '../AcTrBatchedGeometryInfo'
import {
  AcTrBatchDrawVisibilityStrategy,
  resolveBatchDrawVisibilityMode
} from './AcTrBatchDrawVisibilityStrategy'
import type {
  AcTrBatchDrawVisibilityInfo,
  AcTrBatchDrawVisibilityMode
} from './AcTrBatchDrawVisibilityTypes'
import { AcTrIndexedBatchDrawVisibilityStrategy } from './AcTrIndexedBatchDrawVisibilityStrategy'
import { AcTrLine2BatchDrawVisibilityStrategy } from './AcTrLine2BatchDrawVisibilityStrategy'
import { AcTrVertexBatchDrawVisibilityStrategy } from './AcTrVertexBatchDrawVisibilityStrategy'

/**
 * Facade that routes batch slot visibility updates to geometry-layout strategies.
 */
class AcTrBatchDrawVisibility {
  private static readonly strategies: Record<
    AcTrBatchDrawVisibilityMode,
    AcTrBatchDrawVisibilityStrategy
  > = {
    indexed: new AcTrIndexedBatchDrawVisibilityStrategy(),
    vertex: new AcTrVertexBatchDrawVisibilityStrategy(),
    line2: new AcTrLine2BatchDrawVisibilityStrategy()
  }

  /**
   * Collapses or restores packed GPU geometry for one batch slot.
   */
  static apply(
    geometry: THREE.BufferGeometry,
    info: AcTrBatchDrawVisibilityInfo,
    visible: boolean,
    mode: AcTrBatchDrawVisibilityMode = resolveBatchDrawVisibilityMode(geometry)
  ): boolean {
    if (!isBatchGeometryActive(info.flags)) {
      return false
    }

    return AcTrBatchDrawVisibility.strategies[mode].apply(
      geometry,
      info,
      visible
    )
  }

  /**
   * Resolves the strategy instance for one packed geometry layout.
   */
  static getStrategy(
    geometry: THREE.BufferGeometry,
    mode?: AcTrBatchDrawVisibilityMode
  ): AcTrBatchDrawVisibilityStrategy {
    const resolvedMode = mode ?? resolveBatchDrawVisibilityMode(geometry)
    return AcTrBatchDrawVisibility.strategies[resolvedMode]
  }
}

/**
 * Collapses or restores packed GPU geometry for one batch slot so invisible
 * entities are skipped at draw time without removing the slot from the batch.
 */
export function applyBatchSlotDrawVisibility(
  geometry: THREE.BufferGeometry,
  info: AcTrBatchDrawVisibilityInfo,
  visible: boolean,
  mode?: AcTrBatchDrawVisibilityMode
): boolean {
  return AcTrBatchDrawVisibility.apply(geometry, info, visible, mode)
}

/**
 * Clears stale draw snapshots and re-collapses hidden slots after batch
 * compaction moves packed GPU buffer ranges.
 */
export function syncBatchDrawVisibilityAfterOptimize(
  geometry: THREE.BufferGeometry,
  geometryInfoList: AcTrBatchDrawVisibilityInfo[]
) {
  const mode = resolveBatchDrawVisibilityMode(geometry)

  for (const info of geometryInfoList) {
    if (!isBatchGeometryActive(info.flags)) {
      continue
    }

    delete info.hiddenDrawSnapshot

    if (!isBatchGeometryVisible(info.flags)) {
      applyBatchSlotDrawVisibility(geometry, info, false, mode)
    }
  }
}
