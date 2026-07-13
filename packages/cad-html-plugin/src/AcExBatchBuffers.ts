import * as THREE from 'three'

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

const _worldOffset = /*@__PURE__*/ { x: 0, y: 0, z: 0 }

/**
 * Reads the world-space translation stored separately from rebased vertex data.
 *
 * Renderer drawables keep float32-friendly local geometry and place the entity in
 * WCS via the object transform (or batch {@link AcTrBatchedLine.position}).
 * Nested no-batch subtrees (MTEXT, block-like placement roots) carry insertion
 * on ancestors, so the translation must come from {@link THREE.Object3D.matrixWorld}.
 */
export function readBatchWorldOffset(
  object: THREE.Object3D
): [number, number, number] {
  object.updateMatrixWorld(true)
  const position = object.matrixWorld.elements
  _worldOffset.x = position[12]!
  _worldOffset.y = position[13]!
  _worldOffset.z = position[14]!
  return [_worldOffset.x, _worldOffset.y, _worldOffset.z]
}

/** Minimal geometry slice used while rebasing plain drawables for HTML export. */
export interface AcExPlainDrawableSlice {
  positions: Float32Array
  indices?: Uint32Array
}

/**
 * Applies a world matrix to every vertex in a geometry slice using double precision.
 */
export function bakePlainDrawableSlice(
  slice: AcExPlainDrawableSlice,
  matrix: THREE.Matrix4
): AcExPlainDrawableSlice {
  const elements = matrix.elements
  const source = slice.positions
  if (source.length === 0) {
    return { positions: new Float32Array(0), indices: slice.indices }
  }

  const transformed = new Float32Array(source.length)
  for (let i = 0; i < source.length; i += 3) {
    const x = source[i]!
    const y = source[i + 1]!
    const z = source[i + 2]!
    transformed[i] =
      elements[0]! * x + elements[4]! * y + elements[8]! * z + elements[12]!
    transformed[i + 1] =
      elements[1]! * x + elements[5]! * y + elements[9]! * z + elements[13]!
    transformed[i + 2] =
      elements[2]! * x + elements[6]! * y + elements[10]! * z + elements[14]!
  }

  return {
    positions: transformed,
    indices: slice.indices ? new Uint32Array(slice.indices) : undefined
  }
}

/**
 * Rebases a world-space slice around its axis-aligned center so HTML playback can
 * keep float32-friendly local vertices with a separate float64 origin.
 */
export function rebasePlainDrawableSliceAroundCentroid(
  slice: AcExPlainDrawableSlice
): { slice: AcExPlainDrawableSlice; offset: [number, number, number] } {
  const source = slice.positions
  if (source.length < 3) {
    return { slice, offset: [0, 0, 0] }
  }

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (let i = 0; i < source.length; i += 3) {
    const x = source[i]!
    const y = source[i + 1]!
    const z = source[i + 2]!
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }

  const offset: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  ]
  const rebased = new Float32Array(source.length)
  for (let i = 0; i < source.length; i += 3) {
    rebased[i] = source[i]! - offset[0]
    rebased[i + 1] = source[i + 1]! - offset[1]
    rebased[i + 2] = source[i + 2]! - offset[2]
  }

  return {
    slice: {
      positions: rebased,
      indices: slice.indices ? new Uint32Array(slice.indices) : undefined
    },
    offset
  }
}

/**
 * Converts one plain scene-graph drawable into the local+offset representation
 * expected by the offline HTML viewer.
 *
 * Pattern-fill meshes stay world-baked with a zero offset so their hatch pattern
 * metadata (transformed via `bakedWorldMatrix`) stays aligned with the fill boundary.
 */
export function exportPlainDrawableSlice(
  object: THREE.Object3D,
  slice: AcExPlainDrawableSlice,
  options: { preserveWorldSpaceForPatternFill?: boolean } = {}
): { slice: AcExPlainDrawableSlice; offset: [number, number, number] } {
  object.updateMatrixWorld(true)
  const worldSlice = bakePlainDrawableSlice(slice, object.matrixWorld)

  if (options.preserveWorldSpaceForPatternFill) {
    return { slice: worldSlice, offset: [0, 0, 0] }
  }

  return rebasePlainDrawableSliceAroundCentroid(worldSlice)
}
