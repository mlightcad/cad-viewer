import { AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * Per-sub-geometry metadata stored in batched objects.
 *
 * These fields are copied into each batched geometry record and are later used
 * by hit-testing / highlighting workflows.
 */
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

export interface AcTrBatchGeometryState {
  /** Lazily computed per-geometry bounds used for culling/hit tests. */
  boundingBox: THREE.Box3 | null
  /** Whether this geometry slot is active (not deleted). */
  active: boolean
  /** Per-geometry visibility toggle. */
  visible: boolean
}

/**
 * Common geometry range/state information for non-indexed batched primitives.
 */
export type AcTrVertexBatchGeometryInfo = AcTrBatchGeometryUserData &
  AcTrBatchGeometryState & {
    /** Start offset in packed vertex/segment buffer. */
    vertexStart: number
    /** Actual used vertex/segment count in this slot. */
    vertexCount: number
    /** Reserved capacity for future updates without relocation. */
    reservedVertexCount: number
  }

/**
 * Geometry range/state information for indexed batched primitives.
 */
export type AcTrIndexedBatchGeometryInfo = AcTrVertexBatchGeometryInfo & {
  /** Start offset in packed index buffer. */
  indexStart: number
  /** Actual used index count in this slot. */
  indexCount: number
  /** Reserved index capacity for future updates without relocation. */
  reservedIndexCount: number
}

/**
 * Backward-compatible alias used by existing line/mesh batching code.
 */
export type AcTrBatchedGeometryInfo = AcTrIndexedBatchGeometryInfo

/**
 * Ascending sort comparator for reusable geometry ids.
 */
export function ascIdSort(a: number, b: number) {
  return a - b
}

/**
 * Copies attribute data from `src` into `target` at `targetOffset`.
 *
 * Falls back to per-component copy for incompatible array layouts and uses
 * fast typed-array block copy when both attributes share the same array type.
 */
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

/**
 * Safely copies `src` typed-array contents into `target`.
 *
 * The copy is capped to `Math.min(src.length, target.length)` and supports
 * different array constructors (for example index upsize from `Uint16Array`
 * to `Uint32Array`).
 */
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
