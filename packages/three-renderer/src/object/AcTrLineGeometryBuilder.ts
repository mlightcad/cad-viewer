import {
  AcGeArea2d,
  AcGeIndexNode,
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGiSubEntityTraits,
  acdbDrawTessellateOptions
} from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../util'
import { AcTrPolygon } from './AcTrPolygon'

/** Which batch container the built line geometry should append into. */
export type AcTrLineGeometryKind = 'basic' | 'fat'

/** Entity kind for generalized direct-batch metadata. */
export type AcTrDirectEntityKind = 'lineBasic' | 'lineFat' | 'point' | 'mesh'

/**
 * Local-space geometry ready for {@link AcTrBatchedGroup} append or
 * wrapping in an {@link AcTrLine} drawable.
 */
export interface AcTrBuiltLineGeometry {
  kind: AcTrLineGeometryKind
  geometry: THREE.BufferGeometry | LineSegmentsGeometry
  worldOffset: THREE.Vector3
  wcsBbox: THREE.Box3
  material: THREE.Material
}

/** Built geometry for any direct-batch entity kind. */
export interface AcTrBuiltDirectGeometry {
  kind: AcTrDirectEntityKind
  geometry: THREE.BufferGeometry | LineSegmentsGeometry
  worldOffset: THREE.Vector3
  wcsBbox: THREE.Box3
  material: THREE.Material
  /** Point entities only — world position for bbox intersection. */
  position?: AcGePoint3dLike
}

/** Generalized direct-batch entity metadata (line, point, mesh). */
export interface AcTrDirectEntityMeta extends AcTrBuiltDirectGeometry {
  objectId: string
  ownerId: string
  layerName: string
  visible: boolean
}

const _point = /*@__PURE__*/ new THREE.Vector3()
const _dummyDisposeMaterial = /*@__PURE__*/ new THREE.MeshBasicMaterial()

/**
 * Maximum boundary vertex count (after dropping the duplicated closing vertex)
 * that still qualifies for the single-loop fill fast path. SOLID / TRACE are
 * always four (or fewer) corner points.
 */
const SMALL_FILL_LOOP_MAX_POINTS = 4
/**
 * Smallest |signed area| accepted by the single-loop fill fast path, in
 * squared drawing units. Smaller values fall back to THREE.Shape + earcut.
 */
const SMALL_FILL_LOOP_MIN_AREA = 1e-9
/** Relative tolerance when matching a triangulation against the loop area. */
const SMALL_FILL_LOOP_AREA_EPSILON = 1e-9

/**
 * Counters for the direct-batch fill fast path.
 *
 * Read by tests and A/B benchmarks to prove whether a fill skipped
 * `THREE.Shape` + earcut or fell back to it. Never used for rendering.
 */
export interface AcTrAreaBuildStats {
  /** Builds served by the single-loop (≤ 4 point) fan triangulation. */
  smallLoopFastPath: number
  /** Builds that fell back to `THREE.Shape` + earcut. */
  generalPath: number
}

const _areaBuildStats: AcTrAreaBuildStats = {
  smallLoopFastPath: 0,
  generalPath: 0
}

/** Returns a snapshot of the fill-build counters. */
export function getAreaBuildStats(): AcTrAreaBuildStats {
  return { ..._areaBuildStats }
}

/** Resets the fill-build counters. */
export function resetAreaBuildStats(): void {
  _areaBuildStats.smallLoopFastPath = 0
  _areaBuildStats.generalPath = 0
}

/**
 * Test-only seam: forces {@link buildAreaGeometry} to ignore the single-loop
 * fast path so equivalence tests can build the same area through the general
 * `THREE.Shape` + earcut path with identical traits. Never set by production
 * code.
 */
let _forceGeneralAreaPath = false

/** Enables or disables the forced general fill path (tests only). */
export function setForceGeneralAreaPath(force: boolean): void {
  _forceGeneralAreaPath = force
}

/**
 * Geometry produced by the single-loop fill fast path, in WCS coordinates.
 * (Anchor rebasing is done later in {@link buildAreaGeometry}, same as the
 * general path so both paths describe identical WCS triangles.)
 */
interface AcTrSmallFillLoopGeometry {
  /** Deduplicated boundary vertices in WCS drawing coordinates. */
  points: THREE.Vector2[]
  /** Triangle vertex indices into {@link points}. */
  indices: number[]
}

/**
 * Extracts the boundary of a hole-free small loop (≤ 4 distinct points) so it
 * can be triangulated directly instead of going through THREE.Shape + earcut +
 * a temporary {@link AcTrPolygon}.
 *
 * Returns `null` whenever the area is not provably equivalent to the general
 * path:
 * - more than one loop, or any nested loop (a hole);
 * - more than {@link SMALL_FILL_LOOP_MAX_POINTS} distinct points (curved or
 *   densely tessellated boundaries, where earcut decides the triangulation);
 * - fewer than three distinct points, a non-finite coordinate, or a
 *   degenerate (self-overlapping / zero-area) loop.
 *
 * The general path remains the fallback for every rejected case.
 *
 * @param pointBoundaries - All boundary loops of the area, in WCS.
 * @param hierarchy - Loop hierarchy returned by {@link AcGeArea2d.buildHierarchy}.
 * @returns Triangle indices into the deduplicated boundary vertices, or `null`
 *   to use the general path.
 */
function buildSmallFillLoopGeometry(
  pointBoundaries: AcGePoint2dLike[][],
  hierarchy: AcGeIndexNode
): AcTrSmallFillLoopGeometry | null {
  if (pointBoundaries.length !== 1 || hierarchy.children.length !== 1) {
    return null
  }
  const root = hierarchy.children[0]
  // A child loop is a hole: only earcut may generate keyholes for it.
  if (!root || root.children.length !== 0) {
    return null
  }
  const loop = pointBoundaries[root.index] ?? pointBoundaries[0]
  if (!loop) {
    return null
  }

  const points: THREE.Vector2[] = []
  for (let i = 0; i < loop.length; i++) {
    const point = loop[i]
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return null
    }
    // Closed loops repeat their first vertex; a repeated corner adds nothing.
    if (points.length > 0 && isSamePoint2d(points[points.length - 1], point)) {
      continue
    }
    points.push(new THREE.Vector2(point.x, point.y))
  }
  while (
    points.length > 1 &&
    isSamePoint2d(points[0], points[points.length - 1])
  ) {
    points.pop()
  }
  if (points.length < 3 || points.length > SMALL_FILL_LOOP_MAX_POINTS) {
    return null
  }

  const area = signedArea2d(points)
  if (Math.abs(area) < SMALL_FILL_LOOP_MIN_AREA) {
    return null
  }
  // Self-intersecting loops (bow-ties) get no triangles from earcut; any
  // triangulation would fill the crossing lobes instead. Only earcut decides.
  if (hasSelfIntersection(points)) {
    return null
  }
  // A 3-point loop has exactly one triangulation; a 4-point loop has two and
  // only one of them is valid when the quad is concave. Pick the one whose
  // signed triangle areas add up to the polygon's signed area.
  const indices = triangulateSmallLoop(points, area)
  if (!indices) {
    return null
  }

  return { points, indices }
}

/**
 * Triangulates a simple 3- or 4-point loop.
 *
 * Vertices are listed in loop order, so the only fan that can be wrong is the
 * 4-point one: for a concave quad the diagonal `0→2` covers area outside the
 * polygon while `1→3` is the correct one. Comparing the signed area sum with
 * the loop's own signed area selects the correct split without any
 * point-in-polygon test.
 *
 * @returns Index triplets, or `null` when no triangulation covers the loop.
 */
function triangulateSmallLoop(
  points: THREE.Vector2[],
  area: number
): number[] | null {
  const count = points.length
  const splits =
    count === 3
      ? [[0, 1, 2]]
      : [
          [0, 1, 2, 0, 2, 3],
          [0, 1, 3, 1, 2, 3]
        ]
  const tolerance = Math.abs(area) * SMALL_FILL_LOOP_AREA_EPSILON
  for (const split of splits) {
    let sum = 0
    for (let i = 0; i < split.length; i += 3) {
      sum += signedTriangleArea2d(
        points[split[i]],
        points[split[i + 1]],
        points[split[i + 2]]
      )
    }
    if (Math.abs(sum - area) <= tolerance) {
      return split
    }
  }
  return null
}

/** Signed area of one triangle in the same shoelace orientation as a loop. */
function signedTriangleArea2d(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2
): number {
  return ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5
}

/** Compares two 2-D points exactly; fill boundaries carry no tolerance. */
function isSamePoint2d(a: AcGePoint2dLike, b: AcGePoint2dLike): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Signed shoelace area of an open point list, translated by the first vertex
 * first so large drawing coordinates keep their precision.
 */
function signedArea2d(points: THREE.Vector2[]): number {
  const origin = points[0]
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const p1 = points[j]
    const p2 = points[i]
    area +=
      (p1.x - origin.x) * (p2.y - origin.y) -
      (p2.x - origin.x) * (p1.y - origin.y)
  }
  return area * 0.5
}

/**
 * Returns whether the closed loop crosses itself.
 *
 * Only adjacent edges share an endpoint in a well-formed closed loop, so the
 * test walks every non-adjacent edge pair. Loops of three points cannot
 * self-intersect. Endpoint-touching is not reported here (it is handled by the
 * degenerate-area test); a proper crossing is.
 */
function hasSelfIntersection(points: THREE.Vector2[]): boolean {
  const count = points.length
  if (count < 4) {
    return false
  }
  for (let i = 0; i < count; i++) {
    const a = points[i]
    const b = points[(i + 1) % count]
    for (let j = i + 1; j < count; j++) {
      if ((j + 1) % count === i || j === (i + 1) % count) {
        continue
      }
      const c = points[j]
      const d = points[(j + 1) % count]
      if (segmentsProperlyIntersect(a, b, c, d)) {
        return true
      }
    }
  }
  return false
}

/** Orientation of `c` relative to the directed line `a`→`b`. */
function orientation2d(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2
): number {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

/** Returns whether segments `ab` and `cd` cross in their interiors. */
function segmentsProperlyIntersect(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  d: THREE.Vector2
): boolean {
  const d1 = orientation2d(a, b, c)
  const d2 = orientation2d(a, b, d)
  const d3 = orientation2d(c, d, a)
  const d4 = orientation2d(c, d, b)
  return d1 !== d2 && d3 !== d4
}

/**
 * Builds WCS-coordinate triangle geometry from a small fill loop.
 *
 * Vertices keep their WCS coordinates so the subsequent
 * `worldOffset`-driven rebase is identical to the general
 * {@link AcTrPolygon} path.
 */
function buildSmallFillLoopMesh(
  loop: AcTrSmallFillLoopGeometry
): THREE.BufferGeometry {
  const vertexCount = loop.points.length
  const positions = new Float32Array(vertexCount * 3)
  let offset = 0
  for (let i = 0; i < vertexCount; i++) {
    const point = loop.points[i]
    positions[offset++] = point.x
    positions[offset++] = point.y
    positions[offset++] = 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(
    new THREE.BufferAttribute(
      vertexCount > 65535 / 3
        ? Uint32Array.from(loop.indices)
        : Uint16Array.from(loop.indices),
      1
    )
  )
  return geometry
}

/**
 * Returns true for pattern-linetype shader materials that cannot direct-batch.
 * {@link LineMaterial} (wide lines) is allowed.
 *
 * @param material - Material resolved for the entity draw.
 * @returns `true` when the material is a non-`LineMaterial` shader and must
 *   fall back to the legacy drawable path.
 */
export function isDirectBatchRejectedMaterial(material: THREE.Material): boolean {
  return (
    material instanceof THREE.ShaderMaterial && !(material instanceof LineMaterial)
  )
}

/**
 * Builds rebased line geometry from world-space points and a resolved material.
 *
 * Vertices are stored relative to the point-cloud bounding-box center
 * (`worldOffset`) so float32 batch buffers stay precise. Fat lines
 * (`LineMaterial`) produce `LineSegmentsGeometry`; all other materials produce
 * indexed `BufferGeometry` for `THREE.LineSegments`.
 *
 * @param points - World-space polyline vertices (at least two).
 * @param material - Resolved line material; `LineMaterial` selects fat geometry.
 * @returns Built local-space geometry, or `null` when fewer than two points
 *   are provided.
 */
export function buildLineGeometry(
  points: AcGePoint3dLike[],
  material: THREE.Material
): AcTrBuiltLineGeometry | null {
  if (points.length < 2) {
    return null
  }

  const worldOffset = computeLocalOrigin(points)
  const maxVertexCount = points.length

  const wcsBbox = computeWcsBboxFromPoints(points)

  if (material instanceof LineMaterial) {
    const segmentPositions = new Float32Array((maxVertexCount - 1) * 6)
    for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      segmentPositions[pos++] = p1.x - worldOffset.x
      segmentPositions[pos++] = p1.y - worldOffset.y
      segmentPositions[pos++] = (p1.z ?? 0) - worldOffset.z
      segmentPositions[pos++] = p2.x - worldOffset.x
      segmentPositions[pos++] = p2.y - worldOffset.y
      segmentPositions[pos++] = (p2.z ?? 0) - worldOffset.z
    }

    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(segmentPositions)
    AcTrBufferGeometryUtil.safeComputeBoundingBox(
      geometry as unknown as THREE.BufferGeometry
    )
    AcTrBufferGeometryUtil.safeComputeBoundingSphere(
      geometry as unknown as THREE.BufferGeometry
    )
    return {
      kind: 'fat',
      geometry,
      worldOffset,
      wcsBbox,
      material
    }
  }

  const vertices = new Float32Array(maxVertexCount * 3)
  // Exactly one index pair per polyline edge. Allocating maxVertexCount*2 left a
  // trailing (0,0) pair (typed-array zero-fill) that became a phantom zero-length
  // segment after toNonIndexed / LineSegments pairing — visible as duplicate
  // verts in dashed-line batches (e.g. A4107 WSP connectors).
  const indexCount = (maxVertexCount - 1) * 2
  const indices =
    maxVertexCount * 2 > 65535
      ? new Uint32Array(indexCount)
      : new Uint16Array(indexCount)

  for (let i = 0, pos = 0; i < maxVertexCount; i++) {
    const point = points[i]
    vertices[pos++] = point.x - worldOffset.x
    vertices[pos++] = point.y - worldOffset.y
    vertices[pos++] = (point.z ?? 0) - worldOffset.z
  }
  for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
    indices[pos++] = i
    indices[pos++] = i + 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))

  return {
    kind: 'basic',
    geometry,
    worldOffset,
    wcsBbox,
    material
  }
}

/**
 * Builds rebased single-vertex point geometry for {@link AcTrBatchedPoint}.
 *
 * The position attribute is a single `(0,0,0)` vertex; the world location is
 * carried by `worldOffset` / `position` so batch float32 buffers stay precise.
 *
 * @param point - World-space point location.
 * @param material - Resolved point material.
 * @returns Built point geometry with a tiny WCS bbox around `point`.
 */
export function buildPointGeometry(
  point: AcGePoint3dLike,
  material: THREE.Material
): AcTrBuiltDirectGeometry {
  const worldOffset = new THREE.Vector3(point.x, point.y, point.z ?? 0)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0], 3)
  )
  const epsilon = 1e-6
  const z = point.z ?? 0
  const wcsBbox = new THREE.Box3(
    new THREE.Vector3(point.x - epsilon, point.y - epsilon, z - epsilon),
    new THREE.Vector3(point.x + epsilon, point.y + epsilon, z + epsilon)
  )
  return {
    kind: 'point',
    geometry,
    worldOffset,
    wcsBbox,
    material,
    position: point
  }
}

/**
 * Builds rebased mesh geometry from a solid or gradient hatch area.
 *
 * Patterned hatches (definition lines without gradient) return `null`.
 * A temporary {@link AcTrPolygon} is built and disposed; mesh materials from
 * the style manager are preserved by swapping dummy geometry/material first.
 *
 * @param area - Filled/hatched 2-D area in drawing coordinates.
 * @param traits - Sub-entity traits used for fill style and material lookup.
 * @param context - Render context providing the style manager.
 * @returns Built mesh geometry ready for direct batch append, or `null` when
 *   the hatch is patterned, empty, or merge/bbox computation fails.
 */
export function buildAreaGeometry(
  area: AcGeArea2d,
  traits: AcGiSubEntityTraits,
  context: AcTrRenderContext
): AcTrBuiltDirectGeometry | null {
  const style = traits.fillType
  if (!style.gradient && !!style.definitionLines?.length) {
    return null
  }

  // Solid single-loop fills (SOLID / TRACE quads, ≤ 4 corners) triangulate
  // directly, skipping THREE.Shape, earcut and the temporary AcTrPolygon.
  // Gradient fills and the test-only forced general path skip the probe —
  // they always use AcTrPolygon, and probing would only duplicate tessellation.
  //
  // Align tessellation with AcTrPolygon (same options, cached results) so both
  // paths see identical boundary points for equivalence testing. Two data-model
  // API shapes are supported:
  //   - modern: area.tessellate(options) + area.buildHierarchy(options)
  //   - legacy / test fakes: area.getPoints(segments) + area.buildHierarchy()
  //
  // When the modern API is probed and the fast path rejects the loop, pass the
  // tessellate-cached area into AcTrPolygon so the general path does not
  // tessellate a second time.
  let pointBoundaries: AcGePoint2dLike[][] | undefined
  let hierarchy: AcGeIndexNode | undefined
  let areaForGeneralPath: AcGeArea2d = area
  if (!style.gradient && !_forceGeneralAreaPath) {
    const tessellateOptions = acdbDrawTessellateOptions({ context })
    if (typeof (area as any).tessellate === 'function') {
      pointBoundaries = (area as any).tessellate(tessellateOptions)
      const areaCached = Object.create(area, {
        tessellate: { value: () => pointBoundaries }
      }) as AcGeArea2d
      hierarchy = (areaCached as any).buildHierarchy(tessellateOptions)
      areaForGeneralPath = areaCached
    } else if (typeof (area as any).getPoints === 'function') {
      pointBoundaries = (area as any).getPoints(100)
      hierarchy = (area as any).buildHierarchy()
    }
  }
  // If neither API exists (or the probe was skipped), fast-path variables stay
  // undefined and buildSmallFillLoopGeometry is not called — AcTrPolygon runs.

  const smallLoop =
    !pointBoundaries || !hierarchy
      ? null
      : buildSmallFillLoopGeometry(pointBoundaries, hierarchy)

  let geometry: THREE.BufferGeometry
  let resolvedMaterial: THREE.Material | undefined

  if (smallLoop) {
    _areaBuildStats.smallLoopFastPath++
    geometry = buildSmallFillLoopMesh(smallLoop)
    resolvedMaterial = context.styleManager.getFillMaterial(traits)
  } else {
    _areaBuildStats.generalPath++
    const polygon = new AcTrPolygon(areaForGeneralPath, traits, context)
    const meshGeometries: THREE.BufferGeometry[] = []

    polygon.traverse(object => {
      if (object instanceof THREE.Mesh && object.geometry) {
        meshGeometries.push(object.geometry.clone())
        if (!resolvedMaterial && object.material instanceof THREE.Material) {
          resolvedMaterial = object.material
        }
      }
    })

    polygon.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry = new THREE.BufferGeometry()
        object.material = _dummyDisposeMaterial
      }
    })
    polygon.dispose()

    if (meshGeometries.length === 0) {
      return null
    }

    if (meshGeometries.length === 1) {
      geometry = meshGeometries[0]
    } else {
      const merged = mergeGeometries(meshGeometries)
      if (!merged) {
        meshGeometries.forEach(item => item.dispose())
        return null
      }
      geometry = merged
      meshGeometries.forEach(item => item.dispose())
    }
  }

  const boundingBox = AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
  if (!boundingBox || boundingBox.isEmpty()) {
    geometry.dispose()
    return null
  }

  const wcsBbox = boundingBox.clone()
  const worldOffset = wcsBbox.getCenter(new THREE.Vector3())
  rebaseGeometryPositions(geometry, worldOffset)

  const gradientBounds = {
    minX: wcsBbox.min.x,
    minY: wcsBbox.min.y,
    maxX: wcsBbox.max.x,
    maxY: wcsBbox.max.y
  }
  const material =
    resolvedMaterial ??
    context.styleManager.getFillMaterial(traits, undefined, gradientBounds)

  return {
    kind: 'mesh',
    geometry,
    worldOffset,
    wcsBbox,
    material
  }
}

/**
 * Builds rebased line-segment geometry from packed vertex/index buffers.
 *
 * Filters out degenerate `(0,0)` index pairs, rebases positions to the
 * vertex-cloud bbox center, and selects fat (`lineFat`) or basic
 * (`lineBasic`) output based on whether `material` is a {@link LineMaterial}.
 *
 * @param array - Interleaved vertex attribute data (positions and optional
 *   extra components).
 * @param itemSize - Components per vertex in `array` (at least 3 for xyz).
 * @param indices - Index buffer pairing vertices into line segments.
 * @param material - Resolved line material; pattern shaders are rejected.
 * @returns Built local-space geometry, or `null` for pattern shader materials
 *   or when no valid segments / bbox remain.
 */
export function buildLineSegmentsGeometry(
  array: Float32Array,
  itemSize: number,
  indices: Uint16Array,
  material: THREE.Material
): AcTrBuiltDirectGeometry | null {
  if (isDirectBatchRejectedMaterial(material)) {
    return null
  }

  const filteredIndices: number[] = []
  for (let i = 0; i < indices.length; i += 2) {
    const i1 = indices[i]
    const i2 = indices[i + 1]
    if (i1 === 0 && i2 === 0) {
      continue
    }
    filteredIndices.push(i1, i2)
  }
  if (filteredIndices.length < 2) {
    return null
  }

  const box = new THREE.Box3()
  for (let i = 0; i < array.length; i += itemSize) {
    box.expandByPoint(_point.set(array[i], array[i + 1], array[i + 2] ?? 0))
  }
  if (box.isEmpty()) {
    return null
  }

  const worldOffset = box.getCenter(new THREE.Vector3())
  const wcsBbox = box.clone()

  if (material instanceof LineMaterial) {
    const segmentCount = filteredIndices.length / 2
    const segmentPositions = new Float32Array(segmentCount * 6)
    for (let i = 0, pos = 0; i < segmentCount; i++) {
      const i1 = filteredIndices[i * 2]
      const i2 = filteredIndices[i * 2 + 1]
      const base1 = i1 * itemSize
      const base2 = i2 * itemSize
      segmentPositions[pos++] = array[base1] - worldOffset.x
      segmentPositions[pos++] = array[base1 + 1] - worldOffset.y
      segmentPositions[pos++] = (array[base1 + 2] ?? 0) - worldOffset.z
      segmentPositions[pos++] = array[base2] - worldOffset.x
      segmentPositions[pos++] = array[base2 + 1] - worldOffset.y
      segmentPositions[pos++] = (array[base2 + 2] ?? 0) - worldOffset.z
    }

    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(segmentPositions)
    AcTrBufferGeometryUtil.safeComputeBoundingBox(
      geometry as unknown as THREE.BufferGeometry
    )
    AcTrBufferGeometryUtil.safeComputeBoundingSphere(
      geometry as unknown as THREE.BufferGeometry
    )
    return {
      kind: 'lineFat',
      geometry,
      worldOffset,
      wcsBbox,
      material
    }
  }

  const rebased = new Float32Array(array.length)
  for (let i = 0; i < array.length; i += itemSize) {
    rebased[i] = array[i] - worldOffset.x
    rebased[i + 1] = array[i + 1] - worldOffset.y
    rebased[i + 2] = (array[i + 2] ?? 0) - worldOffset.z
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(rebased, itemSize)
  )
  geometry.setIndex(
    new THREE.BufferAttribute(new Uint16Array(filteredIndices), 1)
  )

  return {
    kind: 'lineBasic',
    geometry,
    worldOffset,
    wcsBbox,
    material
  }
}

/**
 * Subtracts `worldOffset` from every position attribute vertex in place and
 * refreshes the geometry bounding box / sphere.
 *
 * Used after merging hatch mesh geometries so the returned buffer is local to
 * the WCS bbox center (matching other direct-batch builders).
 *
 * @param geometry - Buffer whose `position` attribute is rewritten.
 * @param worldOffset - World-space origin to subtract from each vertex.
 */
function rebaseGeometryPositions(
  geometry: THREE.BufferGeometry,
  worldOffset: THREE.Vector3
) {
  const position = geometry.getAttribute('position')
  if (!position) {
    return
  }
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) - worldOffset.x,
      position.getY(i) - worldOffset.y,
      position.getZ(i) - worldOffset.z
    )
  }
  position.needsUpdate = true
  AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
  AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)
}

/**
 * Computes the bounding-box center of a world-space point cloud.
 *
 * The center is used as `worldOffset` when storing vertices in local
 * coordinates for float32 batch precision.
 *
 * @param points - World-space points to enclose.
 * @returns Center of the axis-aligned bounding box of `points`.
 */
function computeLocalOrigin(points: AcGePoint3dLike[]) {
  const box = new THREE.Box3()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    box.expandByPoint(_point.set(p.x, p.y, p.z ?? 0))
  }
  return box.getCenter(new THREE.Vector3())
}

/**
 * Computes the world-coordinate-system axis-aligned bounding box of a point
 * cloud.
 *
 * @param points - World-space points to enclose.
 * @returns A new {@link THREE.Box3} expanded by every point in `points`.
 */
function computeWcsBboxFromPoints(points: AcGePoint3dLike[]) {
  const box = new THREE.Box3()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    box.expandByPoint(_point.set(p.x, p.y, p.z ?? 0))
  }
  return box
}
