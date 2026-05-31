/**
 * Copies a contiguous span from an array-like source into a {@link Float32Array}.
 *
 * @internal
 */
export function copyFloat32Range(
  array: ArrayLike<number>,
  start: number,
  count: number
): Float32Array {
  if (count <= 0) {
    return new Float32Array(0)
  }
  const result = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = array[start + i]!
  }
  return result
}

/**
 * Copies a contiguous span from an array-like source into a {@link Uint32Array}.
 *
 * @internal
 */
export function copyUint32Range(
  array: ArrayLike<number>,
  start: number,
  count: number
): Uint32Array {
  if (count <= 0) {
    return new Uint32Array(0)
  }
  const result = new Uint32Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = array[start + i]!
  }
  return result
}

/**
 * Trims an indexed geometry slice to the vertex span referenced by {@link indices}.
 *
 * Batched mesh buffers pre-allocate capacity; export copies the full position
 * buffer but only a subset of indices. Unused tail vertices must not participate
 * in fallback triangulation when indices are missing during HTML playback.
 */
export function compactIndexedSlice(
  positions: Float32Array,
  indices: Uint32Array
): { positions: Float32Array; indices: Uint32Array } {
  if (indices.length === 0) {
    return { positions, indices }
  }

  let maxIndex = 0
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]!
    if (index > maxIndex) {
      maxIndex = index
    }
  }

  const vertexFloatCount = (maxIndex + 1) * 3
  if (vertexFloatCount >= positions.length) {
    return { positions, indices }
  }

  return {
    positions: copyFloat32Range(positions, 0, vertexFloatCount),
    indices
  }
}

/**
 * Converts one rebased local coordinate plus batch origin to WCS using double precision.
 *
 * Used by extent and legacy batch-based OSNAP paths so large origins are not
 * baked into {@link Float32Array} vertex buffers.
 */
export function toWcsCoord(local: number, origin: number): number {
  return local + origin
}
