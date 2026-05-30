/**
 * Applies a world-space offset to a flat XYZ {@link Float32Array} position buffer.
 *
 * @param positions - Local-space vertex buffer (`itemSize` 3).
 * @param offset - Translation added to every vertex.
 * @returns A new buffer with the offset baked in.
 */
export function applyOffsetToPositions(
  positions: Float32Array,
  offset: [number, number, number]
): Float32Array {
  const result = new Float32Array(positions.length)
  const [ox, oy, oz] = offset
  for (let i = 0; i < positions.length; i += 3) {
    result[i] = positions[i]! + ox
    result[i + 1] = positions[i + 1]! + oy
    result[i + 2] = positions[i + 2]! + oz
  }
  return result
}

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
