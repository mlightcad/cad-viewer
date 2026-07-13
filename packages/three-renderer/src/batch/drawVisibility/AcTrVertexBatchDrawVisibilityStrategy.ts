import * as THREE from 'three'

import { AcTrBatchDrawVisibilityStrategy } from './AcTrBatchDrawVisibilityStrategy'
import type { AcTrBatchDrawVisibilityInfo } from './AcTrBatchDrawVisibilityTypes'

/**
 * Draw-visibility strategy for non-indexed vertex batches (lines/points).
 */
export class AcTrVertexBatchDrawVisibilityStrategy extends AcTrBatchDrawVisibilityStrategy {
  collapse(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const positionAttr = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (!positionAttr || info.vertexCount <= 0) {
      return false
    }

    const array = positionAttr.array as Float32Array
    const itemSize = positionAttr.itemSize
    const start = info.vertexStart
    const count = info.vertexCount
    const baseOffset = start * itemSize

    if (!info.hiddenDrawSnapshot) {
      info.hiddenDrawSnapshot = {
        positions: array.slice(baseOffset, baseOffset + count * itemSize)
      }
    }

    if (count === 1) {
      for (let c = 0; c < itemSize; c++) {
        array[baseOffset + c] = Number.NaN
      }
    } else {
      const x = array[baseOffset]
      const y = array[baseOffset + 1]
      const z = array[baseOffset + 2]

      for (let vertex = start; vertex < start + count; vertex++) {
        const offset = vertex * itemSize
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
      }
    }

    positionAttr.needsUpdate = true
    return true
  }

  restore(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const snapshot = info.hiddenDrawSnapshot?.positions
    const positionAttr = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (!snapshot || !positionAttr || info.vertexCount <= 0) {
      return false
    }

    const array = positionAttr.array as Float32Array
    const itemSize = positionAttr.itemSize
    array.set(snapshot, info.vertexStart * itemSize)
    positionAttr.needsUpdate = true
    delete info.hiddenDrawSnapshot
    return true
  }
}
