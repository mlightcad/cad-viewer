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
  if (array instanceof Float32Array) {
    return array.subarray(start, start + count).slice()
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

function vertexIsFinite(positions: Float32Array, vertex: number): boolean {
  const offset = vertex * 3
  return (
    Number.isFinite(positions[offset]!) &&
    Number.isFinite(positions[offset + 1]!) &&
    Number.isFinite(positions[offset + 2]!)
  )
}

/**
 * Drops primitives that reference a NaN or infinite vertex.
 *
 * One corrupt CAD vertex must not survive into a shared-block batch: the HTML
 * viewer's bounding sphere becomes non-finite and frustum culling hides every
 * INSERT that shares that template.
 *
 * @param primitiveVertexCount - 1 for points, 2 for line segments, 3 for triangles.
 */
export function omitNonFinitePrimitives(
  slice: AcExPlainDrawableSlice,
  primitiveVertexCount: 1 | 2 | 3
): AcExPlainDrawableSlice {
  const positions = slice.positions
  const vertexCount = (positions.length / 3) | 0
  if (vertexCount === 0 || primitiveVertexCount <= 0) {
    return slice
  }

  let anyNonFinite = false
  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i]!)) {
      anyNonFinite = true
      break
    }
  }
  if (!anyNonFinite) {
    return slice
  }

  const indices = slice.indices
  if (indices && indices.length > 0) {
    const kept: number[] = []
    for (
      let i = 0;
      i + primitiveVertexCount <= indices.length;
      i += primitiveVertexCount
    ) {
      let valid = true
      for (let k = 0; k < primitiveVertexCount; k++) {
        const vertex = indices[i + k]!
        if (
          vertex < 0 ||
          vertex >= vertexCount ||
          !vertexIsFinite(positions, vertex)
        ) {
          valid = false
          break
        }
      }
      if (!valid) continue
      for (let k = 0; k < primitiveVertexCount; k++) {
        kept.push(indices[i + k]!)
      }
    }
    if (kept.length === 0) {
      return { positions: new Float32Array(0) }
    }
    const remap = new Int32Array(vertexCount)
    remap.fill(-1)
    const packed: number[] = []
    const remapped = new Uint32Array(kept.length)
    for (let i = 0; i < kept.length; i++) {
      const previous = kept[i]!
      let next = remap[previous]!
      if (next < 0) {
        next = packed.length / 3
        remap[previous] = next
        const base = previous * 3
        packed.push(
          positions[base]!,
          positions[base + 1]!,
          positions[base + 2]!
        )
      }
      remapped[i] = next
    }
    return { positions: Float32Array.from(packed), indices: remapped }
  }

  const packed: number[] = []
  for (
    let vertex = 0;
    vertex + primitiveVertexCount <= vertexCount;
    vertex += primitiveVertexCount
  ) {
    let valid = true
    for (let k = 0; k < primitiveVertexCount; k++) {
      if (!vertexIsFinite(positions, vertex + k)) {
        valid = false
        break
      }
    }
    if (!valid) continue
    for (let k = 0; k < primitiveVertexCount; k++) {
      const base = (vertex + k) * 3
      packed.push(positions[base]!, positions[base + 1]!, positions[base + 2]!)
    }
  }
  if (packed.length === 0) {
    return { positions: new Float32Array(0) }
  }
  return { positions: Float32Array.from(packed) }
}

/**
 * Rebases a world-space slice around its axis-aligned center so HTML playback can
 * keep float32-friendly local vertices with a separate float64 origin.
 *
 * Non-finite coordinates are ignored while placing the origin and written as the
 * local origin so one corrupt vertex cannot make the whole batch's bounds NaN.
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
  let finiteVertices = 0

  for (let i = 0; i < source.length; i += 3) {
    const x = source[i]!
    const y = source[i + 1]!
    const z = source[i + 2]!
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      continue
    }
    finiteVertices++
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }

  if (finiteVertices === 0) {
    return {
      slice: { positions: new Float32Array(0) },
      offset: [0, 0, 0]
    }
  }

  const offset: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  ]
  const rebased = new Float32Array(source.length)
  for (let i = 0; i < source.length; i += 3) {
    const x = source[i]!
    const y = source[i + 1]!
    const z = source[i + 2]!
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      rebased[i] = 0
      rebased[i + 1] = 0
      rebased[i + 2] = 0
      continue
    }
    rebased[i] = x - offset[0]
    rebased[i + 1] = y - offset[1]
    rebased[i + 2] = z - offset[2]
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
 * Pattern-fill meshes follow the same centroid rebase as other plain meshes so
 * hatch shader sampling stays float32-precise. Callers must also rebase hatch
 * pattern bases with {@link rebaseHatchPatternToLocalOffset}.
 */
export function exportPlainDrawableSlice(
  object: THREE.Object3D,
  slice: AcExPlainDrawableSlice,
  _options: { preserveWorldSpaceForPatternFill?: boolean } = {}
): { slice: AcExPlainDrawableSlice; offset: [number, number, number] } {
  object.updateMatrixWorld(true)
  const worldSlice = bakePlainDrawableSlice(slice, object.matrixWorld)

  // Legacy option kept for call-site compatibility; pattern fills now rebase
  // like other meshes (world-baked verts + zero offset caused blocky hatches).
  return rebasePlainDrawableSliceAroundCentroid(worldSlice)
}
