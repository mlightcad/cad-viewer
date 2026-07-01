import * as THREE from 'three'

/** Buffer attribute name storing the packed geometry slot id per vertex/instance. */
export const BATCH_SLOT_ID_ATTRIBUTE = 'slotId'

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
  const existing = geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE) as
    | THREE.BufferAttribute
    | undefined
  if (existing) {
    if (existing.count >= capacity) {
      return existing
    }
    const next = new THREE.Float32BufferAttribute(capacity, 1)
    next.array.set(existing.array.subarray(0, existing.count))
    geometry.setAttribute(BATCH_SLOT_ID_ATTRIBUTE, next)
    return next
  }

  const attribute = new THREE.Float32BufferAttribute(capacity, 1)
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
