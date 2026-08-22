import * as THREE from 'three'

/** Buffer attribute name storing the packed geometry slot id per vertex/instance. */
export const BATCH_SLOT_ID_ATTRIBUTE = 'slotId'

/**
 * Returns true when `geometry` is a Three.js instanced buffer geometry.
 *
 * Line2 batches (`LineSegmentsGeometry`) store one record per segment as an
 * instance. `slotId` must be an {@link THREE.InstancedBufferAttribute} on
 * those geometries or the shader reads template-vertex ids instead of
 * per-segment roles.
 */
function isInstancedSlotIdGeometry(geometry: THREE.BufferGeometry) {
  if (
    (geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry ===
    true
  ) {
    return true
  }
  // LineSegmentsGeometry always has per-segment instanceStart, even when a
  // test double does not set `isInstancedBufferGeometry`.
  return geometry.hasAttribute('instanceStart')
}

/**
 * Allocates a `slotId` buffer of at least `capacity` entries.
 *
 * @param capacity - Minimum number of vertex or instance entries required.
 * @param instanced - When true, allocate an instanced attribute.
 * @returns The new attribute.
 */
function createSlotIdAttribute(capacity: number, instanced: boolean) {
  if (instanced) {
    return new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
  }
  return new THREE.Float32BufferAttribute(capacity, 1)
}

/**
 * Ensures the batch geometry owns a `slotId` float attribute with at least
 * `capacity` entries.
 *
 * @param geometry - Combined batch geometry receiving slot id attributes.
 * @param capacity - Minimum number of vertex or instance entries required.
 * @returns The existing or newly allocated `slotId` buffer attribute.
 */
export function ensureSlotIdAttribute(
  geometry: THREE.BufferGeometry,
  capacity: number
) {
  const instanced = isInstancedSlotIdGeometry(geometry)
  const existing = geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE) as
    | THREE.BufferAttribute
    | THREE.InstancedBufferAttribute
    | undefined
  if (existing) {
    if (existing.count >= capacity) {
      return existing
    }
    const next = createSlotIdAttribute(capacity, instanced)
    ;(next.array as Float32Array).set(
      (existing.array as Float32Array).subarray(0, existing.count)
    )
    geometry.setAttribute(BATCH_SLOT_ID_ATTRIBUTE, next)
    return next
  }

  const attribute = createSlotIdAttribute(capacity, instanced)
  geometry.setAttribute(BATCH_SLOT_ID_ATTRIBUTE, attribute)
  return attribute
}

/**
 * Writes one slot id across a contiguous vertex/instance range.
 *
 * @param geometry - Combined batch geometry whose `slotId` attribute is updated.
 * @param start - First vertex or instance index in the range.
 * @param count - Number of consecutive entries to write.
 * @param slotId - Packed geometry slot id stored in each entry.
 */
export function writeSlotIdRange(
  geometry: THREE.BufferGeometry,
  start: number,
  count: number,
  slotId: number
) {
  if (count <= 0) {
    return
  }

  const attribute = ensureSlotIdAttribute(geometry, start + count)
  const array = attribute.array as Float32Array
  array.fill(slotId, start, start + count)
  attribute.addUpdateRange(start, count)
  attribute.needsUpdate = true
}
