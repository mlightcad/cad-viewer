import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

export interface AcTrBatchGeometryUserData {
  objectId?: string
  /**
   * This flag is true for points and texts
   */
  bboxIntersectionCheck?: boolean
  /**
   * Record position for point only
   */
  position?: AcGePoint3dLike
}

export type AcTrBatchedGeometryInfo = AcTrBatchGeometryUserData & {
  // geometry information
  vertexStart: number
  vertexCount: number
  reservedVertexCount: number

  indexStart: number
  indexCount: number
  reservedIndexCount: number

  // state
  boundingBox: THREE.Box3 | null
  active: boolean
  visible: boolean
}

export function ascIdSort(a: number, b: number) {
  return a - b
}

// copies data from attribute "src" into "target" starting at "targetOffset"
export function copyAttributeData(
  src: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  target: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  targetOffset: number = 0
) {
  const itemSize = target.itemSize
  if (
    (src as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute ||
    src.array.constructor !== target.array.constructor
  ) {
    // use the component getters and setters if the array data cannot
    // be copied directly
    const vertexCount = src.count
    for (let i = 0; i < vertexCount; i++) {
      for (let c = 0; c < itemSize; c++) {
        target.setComponent(i + targetOffset, c, src.getComponent(i, c))
      }
    }
  } else {
    // faster copy approach using typed array set function
    target.array.set(src.array, targetOffset * itemSize)
  }

  target.needsUpdate = true
}

// safely copies array contents to a potentially smaller array
export function copyArrayContents(
  src: THREE.TypedArray,
  target: THREE.TypedArray
) {
  if (src.constructor !== target.constructor) {
    // if arrays are of a different type (eg due to index size increasing) then data must be per-element copied
    const len = Math.min(src.length, target.length)
    for (let i = 0; i < len; i++) {
      target[i] = src[i]
    }
  } else {
    // if the arrays use the same data layout we can use a fast block copy
    const len = Math.min(src.length, target.length)
    // @ts-expect-error no good way to remove this type error
    target.set(new src.constructor(src.buffer, 0, len))
  }
}
