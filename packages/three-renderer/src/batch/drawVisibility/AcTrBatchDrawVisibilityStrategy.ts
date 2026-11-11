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
   * Flags the changed part of an attribute for upload.
   *
   * The range must be recorded, not only `needsUpdate`: batches record their
   * appended ranges with `addUpdateRange`, and while any range is pending
   * three.js uploads just the recorded ranges. A slot change without its own
   * range then stays on the CPU, so a hidden entity kept drawing until a
   * later full upload (e.g. the next toggle).
   *
   * @param attr - Attribute whose array was written.
   * @param start - First changed array element.
   * @param count - Number of changed array elements.
   */
  protected markChanged(
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    start: number,
    count: number
  ) {
    if (attr instanceof THREE.BufferAttribute) {
      attr.addUpdateRange(start, count)
    } else {
      // Interleaved ranges address the shared buffer: upload all of it.
      attr.data.clearUpdateRanges()
    }
    attr.needsUpdate = true
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
