import * as THREE from 'three'

import type {
  AcTrBatchDrawVisibilityInfo,
  AcTrBatchDrawVisibilityMode
} from './AcTrBatchDrawVisibilityTypes'

/**
 * Strategy interface for collapsing and restoring one batched geometry slot.
 */
export abstract class AcTrBatchDrawVisibilityStrategy {
  /**
   * Rewrites GPU buffers so the slot produces no visible pixels.
   */
  abstract collapse(
    geometry: THREE.BufferGeometry,
    info: AcTrBatchDrawVisibilityInfo
  ): boolean

  /**
   * Restores GPU buffers from the slot snapshot when available.
   */
  abstract restore(
    geometry: THREE.BufferGeometry,
    info: AcTrBatchDrawVisibilityInfo
  ): boolean

  /**
   * Applies one visibility transition to the slot draw buffers.
   */
  apply(
    geometry: THREE.BufferGeometry,
    info: AcTrBatchDrawVisibilityInfo,
    visible: boolean
  ): boolean {
    if (visible) {
      return this.restore(geometry, info)
    }
    return this.collapse(geometry, info)
  }

  /**
   * Copies one typed-array slice for snapshot storage.
   */
  protected copyTypedArraySlice(
    array: THREE.TypedArray,
    start: number,
    count: number
  ): THREE.TypedArray {
    const sliceCtor = array.constructor as {
      new (length: number): THREE.TypedArray
    }
    const slice = new sliceCtor(count)
    slice.set(array.subarray(start, start + count))
    return slice
  }
}

/**
 * Detects which draw-visibility strategy matches a packed batch geometry layout.
 */
export function resolveBatchDrawVisibilityMode(
  geometry: THREE.BufferGeometry
): AcTrBatchDrawVisibilityMode {
  if (
    geometry.getAttribute('instanceStart') &&
    geometry.getAttribute('instanceEnd')
  ) {
    return 'line2'
  }
  if (geometry.getIndex()) {
    return 'indexed'
  }
  return 'vertex'
}
