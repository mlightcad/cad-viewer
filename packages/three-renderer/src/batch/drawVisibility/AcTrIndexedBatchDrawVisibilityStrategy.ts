import * as THREE from 'three'

import { AcTrBatchDrawVisibilityStrategy } from './AcTrBatchDrawVisibilityStrategy'
import type { AcTrBatchDrawVisibilityInfo } from './AcTrBatchDrawVisibilityTypes'

/**
 * Draw-visibility strategy for indexed line and mesh batches.
 */
export class AcTrIndexedBatchDrawVisibilityStrategy extends AcTrBatchDrawVisibilityStrategy {
  collapse(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const indexAttr = geometry.getIndex()
    if (!indexAttr || info.indexStart == null || info.indexStart < 0) {
      return false
    }

    const array = indexAttr.array
    const indexStart = info.indexStart
    const indexCount = info.indexCount ?? 0
    if (indexCount <= 0) {
      return false
    }

    const vertexStart = info.vertexStart

    if (!info.hiddenDrawSnapshot) {
      info.hiddenDrawSnapshot = {
        indices: this.copyTypedArraySlice(array, indexStart, indexCount)
      }
    }

    for (let i = indexStart; i < indexStart + indexCount; i++) {
      array[i] = vertexStart
    }
    indexAttr.needsUpdate = true
    return true
  }

  restore(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const snapshot = info.hiddenDrawSnapshot?.indices
    const indexAttr = geometry.getIndex()
    if (
      !snapshot ||
      !indexAttr ||
      info.indexStart == null ||
      info.indexStart < 0
    ) {
      return false
    }

    indexAttr.array.set(snapshot, info.indexStart)
    indexAttr.needsUpdate = true
    delete info.hiddenDrawSnapshot
    return true
  }
}
