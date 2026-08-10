import {
  AcGeArea2d,
  AcGePoint3dLike,
  AcGiSubEntityTraits
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
  const indices =
    maxVertexCount * 2 > 65535
      ? new Uint32Array(maxVertexCount * 2)
      : new Uint16Array(maxVertexCount * 2)

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

  const polygon = new AcTrPolygon(area, traits, context)
  const meshGeometries: THREE.BufferGeometry[] = []
  let resolvedMaterial: THREE.Material | undefined

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

  let geometry: THREE.BufferGeometry
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
