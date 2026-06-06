import * as THREE from 'three'

import { AcTrBatchDrawVisibilityStrategy } from './AcTrBatchDrawVisibilityStrategy'
import type { AcTrBatchDrawVisibilityInfo } from './AcTrBatchDrawVisibilityTypes'

/**
 * Draw-visibility strategy for wide-line `LineSegments2` batches.
 */
export class AcTrLine2BatchDrawVisibilityStrategy extends AcTrBatchDrawVisibilityStrategy {
  collapse(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const startAttr = geometry.getAttribute('instanceStart') as
      | THREE.BufferAttribute
      | undefined
    const endAttr = geometry.getAttribute('instanceEnd') as
      | THREE.BufferAttribute
      | undefined
    if (!startAttr || !endAttr || info.vertexCount <= 0) {
      return false
    }

    const startArray = startAttr.array as Float32Array
    const endArray = endAttr.array as Float32Array
    const segmentStart = info.vertexStart
    const segmentCount = info.vertexCount

    if (!info.hiddenDrawSnapshot) {
      info.hiddenDrawSnapshot = {
        instanceStart: startArray.slice(
          segmentStart * 3,
          (segmentStart + segmentCount) * 3
        ),
        instanceEnd: endArray.slice(
          segmentStart * 3,
          (segmentStart + segmentCount) * 3
        )
      }
    }

    for (
      let segment = segmentStart;
      segment < segmentStart + segmentCount;
      segment++
    ) {
      const offset = segment * 3
      endArray[offset] = startArray[offset]
      endArray[offset + 1] = startArray[offset + 1]
      endArray[offset + 2] = startArray[offset + 2]
    }

    endAttr.needsUpdate = true
    return true
  }

  restore(geometry: THREE.BufferGeometry, info: AcTrBatchDrawVisibilityInfo) {
    const snapshot = info.hiddenDrawSnapshot
    const startAttr = geometry.getAttribute('instanceStart') as
      | THREE.BufferAttribute
      | undefined
    const endAttr = geometry.getAttribute('instanceEnd') as
      | THREE.BufferAttribute
      | undefined
    if (
      !snapshot?.instanceStart ||
      !snapshot.instanceEnd ||
      !startAttr ||
      !endAttr
    ) {
      return false
    }

    const segmentStart = info.vertexStart
    startAttr.array.set(snapshot.instanceStart, segmentStart * 3)
    endAttr.array.set(snapshot.instanceEnd, segmentStart * 3)
    startAttr.needsUpdate = true
    endAttr.needsUpdate = true
    delete info.hiddenDrawSnapshot
    return true
  }
}
