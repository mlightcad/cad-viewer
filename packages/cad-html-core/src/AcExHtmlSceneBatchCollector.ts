import {
  AcTrBatchedLine,
  AcTrBatchedLine2,
  AcTrBatchedMesh,
  AcTrBatchedPoint,
  getMaterialMetadata,
  getSceneDrawableUserData,
  isBatchGeometryActive,
  isBatchGeometryVisible,
  isHighlightCloneDrawable,
  isHighlightOverlayDescendant
} from '@mlightcad/three-renderer'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import {
  acexHtmlBakePlainDrawableSlice,
  acexHtmlCompactIndexedSlice,
  acexHtmlCopyFloat32Range,
  acexHtmlCopyUint32Range,
  acexHtmlExportPlainDrawableSlice,
  acexHtmlOmitNonFinitePrimitives,
  acexHtmlReadBatchWorldOffset,
  acexHtmlRebasePlainDrawableSliceAroundCentroid
} from './AcExHtmlBatchBuffers'
import {
  acexHtmlEncodeTextureForExport,
  acexHtmlExportUvsForPositionSlice,
  acexHtmlIsTransparentImagePlaceholder
} from './AcExHtmlMeshTextureExport'
import {
  acexHtmlComputeLineDistancesForSegments,
  acexHtmlExportVertexAttributeSlice,
  acexHtmlExtractGradientFill,
  acexHtmlExtractHatchPattern,
  acexHtmlExtractLinePattern,
  acexHtmlRebaseHatchPatternToLocalOffset,
  acexHtmlTransformHatchPatternToWorldSpace
} from './AcExHtmlPatternSnapshot'
import type { AcExHtmlLineBatch, AcExHtmlMeshBatch } from './AcExHtmlSnapshotTypes'

/** Slice of buffer geometry exported for HTML snapshot batches. */
export interface AcExHtmlBufferGeometrySlice {
  /**
   * Flat vertex positions `[x0, y0, z0, …]` honoring the geometry draw range.
   */
  positions: Float32Array
  /**
   * Optional index buffer referencing vertices in {@link AcExHtmlBufferGeometrySlice.positions}.
   */
  indices?: Uint32Array
}

/** Result of {@link acexHtmlCollectBatchesFromObject3D}. */
export interface AcExHtmlCollectedBatches {
  /** Line segment batches extracted from the subtree. */
  lineBatches: AcExHtmlLineBatch[]
  /** Mesh and point batches extracted from the subtree. */
  meshBatches: AcExHtmlMeshBatch[]
}

/** Per-slot geometry range metadata from {@link AcTrBatchedExportSource}. */
type AcTrPackedGeometryInfo = {
  flags: number
  vertexStart: number
  vertexCount: number
  indexStart?: number
  indexCount?: number
}

/**
 * Clamps a draw-range start offset to a valid element index.
 *
 * @internal
 */
function clampRangeStart(start: number, total: number): number {
  if (!Number.isFinite(start) || start < 0) {
    return 0
  }
  return Math.min(Math.floor(start), total)
}

/**
 * Resolves how many elements to copy from a buffer attribute or index array.
 *
 * Three.js batched geometries use `{ start: 0, count: Infinity }` until
 * `optimize()` / `_syncDrawRange()` runs; treating that as a literal count
 * overflows JS arrays during HTML export.
 *
 * @internal
 */
function resolveRangeCount(
  drawCount: number,
  total: number,
  start: number
): number {
  const available = Math.max(0, total - start)
  if (!Number.isFinite(drawCount) || drawCount <= 0) {
    return available
  }
  return Math.min(Math.floor(drawCount), available)
}

/**
 * Extracts the actively used portion of a batched buffer geometry,
 * respecting `geometry.drawRange` when set.
 *
 * @param geometry - THREE buffer geometry (often from `AcTrBatchedLine` / `AcTrBatchedMesh`).
 * @returns Position (and optional index) arrays ready for snapshot packing.
 */
export function acexHtmlExportBufferGeometrySlice(
  geometry: THREE.BufferGeometry
): AcExHtmlBufferGeometrySlice {
  const positionAttr = geometry.getAttribute('position') as
    | THREE.BufferAttribute
    | undefined
  if (!positionAttr) {
    return { positions: new Float32Array(0) }
  }

  const drawRange = geometry.drawRange
  const array = positionAttr.array as ArrayLike<number>
  const itemSize = positionAttr.itemSize
  const indexAttr = geometry.getIndex()

  if (indexAttr) {
    const positions = acexHtmlCopyFloat32Range(array, 0, positionAttr.count * itemSize)
    const indexArray = indexAttr.array
    const indexStart = clampRangeStart(drawRange.start, indexAttr.count)
    const indexCount = resolveRangeCount(
      drawRange.count,
      indexAttr.count,
      indexStart
    )
    const indices = acexHtmlCopyUint32Range(indexArray, indexStart, indexCount)
    return acexHtmlCompactIndexedSlice(positions, indices)
  }

  const vertexStart = clampRangeStart(drawRange.start, positionAttr.count)
  const vertexCount = resolveRangeCount(
    drawRange.count,
    positionAttr.count,
    vertexStart
  )
  const positions = acexHtmlCopyFloat32Range(
    array,
    vertexStart * itemSize,
    vertexCount * itemSize
  )
  return { positions }
}

/** Batched object that exposes packed geometry slot metadata for HTML export. */
type AcTrBatchedExportSource = {
  mappingStats: { count: number }
  getGeometryRangeAt(geometryId: number): AcTrPackedGeometryInfo
}

function shouldExportBatchedSlot(info: AcTrPackedGeometryInfo): boolean {
  return isBatchGeometryActive(info.flags) && isBatchGeometryVisible(info.flags)
}

/**
 * Text/point glyph batches are bucketed with `bboxIntersectionCheck` so their
 * stroke vertices are not used for CAD-style object snap.
 */
function batchedLineExcludesFromOsnap(
  batch: AcTrBatchedExportSource
): boolean {
  const { count } = batch.mappingStats
  for (let geometryId = 0; geometryId < count; geometryId++) {
    let info: AcTrPackedGeometryInfo & { bboxIntersectionCheck?: boolean }
    try {
      info = batch.getGeometryRangeAt(geometryId) as AcTrPackedGeometryInfo & {
        bboxIntersectionCheck?: boolean
      }
    } catch {
      continue
    }
    if (!shouldExportBatchedSlot(info)) continue
    if (info.bboxIntersectionCheck) {
      return true
    }
  }
  return false
}

function drawableExcludesFromOsnap(object: THREE.Object3D): boolean {
  return getSceneDrawableUserData(object).bboxIntersectionCheck === true
}

/**
 * Exports only active geometry data from a batched line/mesh/point buffer,
 * skipping reserved padding and inactive (deleted) slots.
 */
export function acexHtmlExportActiveBatchedSlice(
  batch: AcTrBatchedExportSource,
  geometry: THREE.BufferGeometry
): AcExHtmlBufferGeometrySlice {
  const positionAttr = geometry.getAttribute('position') as
    | THREE.BufferAttribute
    | undefined
  if (!positionAttr) {
    return { positions: new Float32Array(0) }
  }

  const itemSize = positionAttr.itemSize
  const positionArray = positionAttr.array as ArrayLike<number>
  const indexAttr = geometry.getIndex()
  const { count } = batch.mappingStats

  if (indexAttr) {
    const positions = acexHtmlCopyFloat32Range(
      positionArray,
      0,
      positionAttr.count * itemSize
    )
    const indexArray = indexAttr.array

    let totalIndices = 0
    const ranges: Array<{ start: number; count: number }> = []
    for (let geometryId = 0; geometryId < count; geometryId++) {
      let info: AcTrPackedGeometryInfo
      try {
        info = batch.getGeometryRangeAt(geometryId)
      } catch {
        continue
      }
      const indexStart = info.indexStart ?? 0
      const indexCount = info.indexCount ?? 0
      if (!shouldExportBatchedSlot(info) || indexCount <= 0) {
        continue
      }
      ranges.push({ start: indexStart, count: indexCount })
      totalIndices += indexCount
    }

    if (totalIndices === 0) {
      return { positions: new Float32Array(0) }
    }

    const activeIndices = new Uint32Array(totalIndices)
    let offset = 0
    for (const range of ranges) {
      for (let i = 0; i < range.count; i++) {
        activeIndices[offset++] = indexArray[range.start + i]!
      }
    }

    return acexHtmlCompactIndexedSlice(positions, activeIndices)
  }

  let totalFloats = 0
  const ranges: Array<{ start: number; floatCount: number }> = []
  for (let geometryId = 0; geometryId < count; geometryId++) {
    let info: AcTrPackedGeometryInfo
    try {
      info = batch.getGeometryRangeAt(geometryId)
    } catch {
      continue
    }
    if (!shouldExportBatchedSlot(info) || info.vertexCount <= 0) {
      continue
    }
    const floatCount = info.vertexCount * itemSize
    ranges.push({
      start: info.vertexStart * itemSize,
      floatCount
    })
    totalFloats += floatCount
  }

  if (totalFloats === 0) {
    return { positions: new Float32Array(0) }
  }

  const positions = new Float32Array(totalFloats)
  let offset = 0
  if (positionArray instanceof Float32Array) {
    for (const range of ranges) {
      positions.set(
        positionArray.subarray(range.start, range.start + range.floatCount),
        offset
      )
      offset += range.floatCount
    }
  } else {
    for (const range of ranges) {
      for (let i = 0; i < range.floatCount; i++) {
        positions[offset++] = positionArray[range.start + i]!
      }
    }
  }

  return { positions }
}

function appendSegmentFromAttribute(
  target: number[],
  attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  segmentIndex: number
) {
  target.push(
    attr.getX(segmentIndex),
    attr.getY(segmentIndex),
    attr.getZ(segmentIndex)
  )
}

/**
 * Extracts active wide-line segment data from a batched `LineSegments2` buffer.
 * Each segment is exported as `[startX, startY, startZ, endX, endY, endZ]`.
 */
export function acexHtmlExportActiveBatchedLine2Slice(
  batch: AcTrBatchedExportSource,
  geometry: THREE.BufferGeometry
): AcExHtmlBufferGeometrySlice {
  const startAttr = geometry.getAttribute('instanceStart') as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined
  const endAttr = geometry.getAttribute('instanceEnd') as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined
  if (!startAttr || !endAttr) {
    return { positions: new Float32Array(0) }
  }

  const { count } = batch.mappingStats
  const activeFloats: number[] = []

  for (let geometryId = 0; geometryId < count; geometryId++) {
    let info: AcTrPackedGeometryInfo
    try {
      info = batch.getGeometryRangeAt(geometryId)
    } catch {
      continue
    }
    if (!shouldExportBatchedSlot(info) || info.vertexCount <= 0) {
      continue
    }
    const segmentStart = info.vertexStart
    const segmentEnd = segmentStart + info.vertexCount
    for (let segment = segmentStart; segment < segmentEnd; segment++) {
      appendSegmentFromAttribute(activeFloats, startAttr, segment)
      appendSegmentFromAttribute(activeFloats, endAttr, segment)
    }
  }

  return { positions: new Float32Array(activeFloats) }
}

function resolveLineSegments2SegmentCount(
  geometry: THREE.BufferGeometry,
  segmentCapacity: number
): number {
  const instanced = geometry as THREE.InstancedBufferGeometry
  const instanceCount = instanced.instanceCount
  if (Number.isFinite(instanceCount) && instanceCount >= 0) {
    return Math.min(Math.floor(instanceCount), segmentCapacity)
  }

  const drawRange = geometry.drawRange
  const rangeStart = clampRangeStart(drawRange.start, segmentCapacity)
  return resolveRangeCount(drawRange.count, segmentCapacity, rangeStart)
}

function exportLineSegments2Slice(
  geometry: THREE.BufferGeometry
): AcExHtmlBufferGeometrySlice {
  const startAttr = geometry.getAttribute('instanceStart') as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined
  const endAttr = geometry.getAttribute('instanceEnd') as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined
  if (!startAttr || !endAttr || startAttr.count === 0) {
    return { positions: new Float32Array(0) }
  }

  const segmentCount = resolveLineSegments2SegmentCount(
    geometry,
    startAttr.count
  )
  if (segmentCount <= 0) {
    return { positions: new Float32Array(0) }
  }

  const activeFloats: number[] = []
  for (let segment = 0; segment < segmentCount; segment++) {
    const start = [
      startAttr.getX(segment),
      startAttr.getY(segment),
      startAttr.getZ(segment)
    ]
    const end = [
      endAttr.getX(segment),
      endAttr.getY(segment),
      endAttr.getZ(segment)
    ]
    if (
      !start.every(Number.isFinite) ||
      !end.every(Number.isFinite)
    ) {
      continue
    }
    activeFloats.push(start[0]!, start[1]!, start[2]!, end[0]!, end[1]!, end[2]!)
  }
  return { positions: new Float32Array(activeFloats) }
}

/**
 * Whether a drawable under `root` should be written into the snapshot.
 *
 * Inactive layouts set the layout group's `visible` flag to false while paper
 * space is showing. Export walks each layer root explicitly, so ancestors
 * outside that root must not drop geometry. Objects hidden inside the root
 * (and hidden ancestors between the drawable and the root) are still skipped.
 */
function shouldExportPlainDrawable(
  object: THREE.Object3D,
  root: THREE.Object3D
): boolean {
  let node: THREE.Object3D | null = object
  while (node && node !== root) {
    if (node.visible === false) return false
    node = node.parent
  }
  return true
}

function readLineWidth(material: THREE.Material): number | undefined {
  if (material instanceof LineMaterial) {
    return material.linewidth
  }
  return undefined
}

function readExportMaterial(object: THREE.Object3D): THREE.Material {
  if ('material' in object) {
    const originalMaterial = (
      object.userData as {
        originalMaterial?: THREE.Material | THREE.Material[]
      }
    ).originalMaterial
    const material = originalMaterial ?? object.material
    if (Array.isArray(material)) {
      return material[0]!
    }
    return material as THREE.Material
  }
  return (object as THREE.Mesh).material as THREE.Material
}

function readMaterialStyle(material: THREE.Material): {
  color: number
  layer: string
  linePattern?: ReturnType<typeof acexHtmlExtractLinePattern>
  hatchPattern?: ReturnType<typeof acexHtmlExtractHatchPattern>
  gradientFill?: ReturnType<typeof acexHtmlExtractGradientFill>
  side?: number
} {
  const meta = getMaterialMetadata(material)
  const layer = meta.layer ?? '0'
  const mat = material as THREE.MeshBasicMaterial & {
    color?: THREE.Color
  }
  let color =
    mat.color != null
      ? mat.color.getHex()
      : ((meta as { color?: number }).color ?? 0xffffff)
  const linePattern = acexHtmlExtractLinePattern(material)
  const hatchPattern = acexHtmlExtractHatchPattern(material)
  const gradientFill = acexHtmlExtractGradientFill(material)
  if (
    material instanceof THREE.ShaderMaterial ||
    material.type === 'ShaderMaterial'
  ) {
    const shaderMaterial = material as THREE.ShaderMaterial
    const shaderColor = shaderMaterial.uniforms.u_color?.value as
      | THREE.Color
      | undefined
    if (shaderColor?.getHex) {
      color = shaderColor.getHex()
    } else if (gradientFill) {
      color = gradientFill.startColor
    }
  }
  const usesCustomFillShader = !!hatchPattern || !!gradientFill
  return {
    color,
    layer,
    linePattern,
    hatchPattern,
    gradientFill,
    side: usesCustomFillShader ? material.side : undefined
  }
}

/**
 * Resolves the snapshot `renderOrder` for a drawable.
 *
 * Prefer material `drawOrder` (set even on unbatched hatch meshes) and fall
 * back to `object.renderOrder` (set on batched meshes in `AcTrBatchedGroup`).
 * `0` is omitted so the default linework tier stays compact.
 */
function resolveExportedRenderOrder(
  object: THREE.Object3D,
  material: THREE.Material
): number | undefined {
  const fromMaterial = getMaterialMetadata(material).drawOrder
  const value = fromMaterial ?? object.renderOrder
  return value === 0 ? undefined : value
}

function assignRenderOrder(
  batch: { renderOrder?: number },
  object: THREE.Object3D,
  material: THREE.Material
): void {
  const renderOrder = resolveExportedRenderOrder(object, material)
  if (renderOrder != null) {
    batch.renderOrder = renderOrder
  }
}

function resolveExportedHatchPattern(
  object: THREE.Object3D,
  hatchPattern: ReturnType<typeof acexHtmlExtractHatchPattern> | undefined
): ReturnType<typeof acexHtmlExtractHatchPattern> {
  if (!hatchPattern) {
    return undefined
  }
  // Prefer the clone-time world matrix (geometry may already be baked and the
  // object pose reset). Otherwise use matrixWorld so origin-shifted live
  // patterned hatches keep pattern bases in the same frame as world-baked verts.
  const bakedWorldMatrix = (object.userData as { bakedWorldMatrix?: number[] })
    .bakedWorldMatrix
  if (bakedWorldMatrix && bakedWorldMatrix.length >= 16) {
    return acexHtmlTransformHatchPatternToWorldSpace(hatchPattern, bakedWorldMatrix)
  }
  object.updateMatrixWorld(true)
  return acexHtmlTransformHatchPatternToWorldSpace(
    hatchPattern,
    Array.from(object.matrixWorld.elements)
  )
}

function readWorldOffset(object: THREE.Object3D): [number, number, number] {
  return acexHtmlReadBatchWorldOffset(object)
}

function exportSceneDrawableSlice(
  object: THREE.Object3D,
  slice: AcExHtmlBufferGeometrySlice,
  options: { preserveWorldSpaceForPatternFill?: boolean } = {}
): AcExHtmlBufferGeometrySlice & { offset: [number, number, number] } {
  const exported = acexHtmlExportPlainDrawableSlice(object, slice, options)
  return {
    ...exported.slice,
    offset: exported.offset
  }
}

function withTriangleIndices(
  slice: AcExHtmlBufferGeometrySlice
): AcExHtmlBufferGeometrySlice {
  if (slice.indices && slice.indices.length >= 3) {
    return slice
  }
  const vertexCount = (slice.positions.length / 3) | 0
  if (vertexCount < 3 || vertexCount % 3 !== 0) {
    return slice
  }
  const indices = new Uint32Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    indices[i] = i
  }
  return { ...slice, indices }
}

function buildMeshBatch(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  object: THREE.Object3D,
  slice: AcExHtmlBufferGeometrySlice,
  offset: [number, number, number],
  triangleList = false
): AcExHtmlMeshBatch | undefined {
  if (triangleList) {
    slice = withTriangleIndices(slice)
  }
  const style = readMaterialStyle(material)
  const worldHatchPattern = resolveExportedHatchPattern(
    object,
    style.hatchPattern
  )
  const hatchPattern = worldHatchPattern
    ? acexHtmlRebaseHatchPatternToLocalOffset(worldHatchPattern, offset)
    : undefined
  const gradientPositions = style.gradientFill
    ? acexHtmlExportVertexAttributeSlice(geometry, 'gradientPosition')
    : undefined
  const batch: AcExHtmlMeshBatch = {
    layer: style.layer,
    color: style.color,
    offset,
    hatchPattern,
    gradientFill: style.gradientFill,
    gradientPositions,
    side: style.side,
    ...slice
  }

  const meshMaterial = material as THREE.MeshBasicMaterial
  if (meshMaterial.map) {
    const texture = acexHtmlEncodeTextureForExport(meshMaterial.map)
    const uvs = acexHtmlExportUvsForPositionSlice(geometry, slice.positions)
    if (!texture || !uvs) {
      // Prefer omitting a broken IMAGE/OLE frame over a solid white fill.
      return undefined
    }
    batch.texture = texture
    batch.uvs = uvs
    // Textured IMAGE/OLE meshes multiply by material color; keep white so the
    // PNG is shown at full intensity (matches live AcTrImage).
    batch.color = 0xffffff
    batch.side = THREE.DoubleSide
  }

  assignRenderOrder(batch, object, material)
  return batch
}

function exportBatchedLine2(
  batch: AcTrBatchedLine2
): AcExHtmlLineBatch | undefined {
  const slice = acexHtmlExportActiveBatchedLine2Slice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer } = readMaterialStyle(batch.material as THREE.Material)
  const lineWidth = readLineWidth(batch.material as THREE.Material)
  const exported: AcExHtmlLineBatch = {
    layer,
    color,
    offset: readWorldOffset(batch),
    lineWidth,
    ...slice
  }
  if (batchedLineExcludesFromOsnap(batch)) {
    exported.excludeFromOsnap = true
  }
  assignRenderOrder(exported, batch, batch.material as THREE.Material)
  return exported
}

function exportBatchedLine(batch: AcTrBatchedLine): AcExHtmlLineBatch | undefined {
  const slice = acexHtmlExportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer, linePattern } = readMaterialStyle(
    batch.material as THREE.Material
  )
  const lineDistances = linePattern
    ? acexHtmlComputeLineDistancesForSegments(slice.positions)
    : undefined
  const exported: AcExHtmlLineBatch = {
    layer,
    color,
    offset: readWorldOffset(batch),
    linePattern,
    lineDistances,
    ...slice
  }
  if (batchedLineExcludesFromOsnap(batch)) {
    exported.excludeFromOsnap = true
  }
  assignRenderOrder(exported, batch, batch.material as THREE.Material)
  return exported
}

function exportBatchedMesh(batch: AcTrBatchedMesh): AcExHtmlMeshBatch | undefined {
  const slice = acexHtmlExportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  return buildMeshBatch(
    batch.geometry,
    batch.material as THREE.Material,
    batch,
    slice,
    readWorldOffset(batch),
    true
  )
}

function exportBatchedPoint(
  batch: AcTrBatchedPoint
): AcExHtmlMeshBatch | undefined {
  const slice = acexHtmlExportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const mesh = buildMeshBatch(
    batch.geometry,
    batch.material as THREE.Material,
    batch,
    slice,
    readWorldOffset(batch)
  )
  if (!mesh) {
    return undefined
  }
  return {
    points: true,
    ...mesh
  }
}

/**
 * GPU-instanced block leaf produced by {@link AcTrSharedGeometryBatch}.
 * Geometry stays in template space; each INSERT is one column of `instanceMatrix`.
 */
type InstancedExportDrawable = THREE.Object3D & {
  isInstancedMesh: true
  instanceMatrix: THREE.InstancedBufferAttribute
  count: number
  geometry: THREE.BufferGeometry
}

const _instanceMatrix = /*@__PURE__*/ new THREE.Matrix4()
const _instanceWorld = /*@__PURE__*/ new THREE.Matrix4()
const _instancePose = /*@__PURE__*/ new THREE.Object3D()
_instancePose.matrixAutoUpdate = false

function isInstancedExportDrawable(
  object: THREE.Object3D
): object is InstancedExportDrawable {
  const candidate = object as Partial<InstancedExportDrawable>
  return (
    candidate.isInstancedMesh === true &&
    candidate.instanceMatrix != null &&
    typeof candidate.count === 'number' &&
    candidate.geometry != null
  )
}

/**
 * Selection overlays for shared block geometry sit in the batch, not in the
 * highlight group, so the usual overlay filters do not see them.
 *
 * Prefer {@link isHighlightCloneDrawable} (`transientHighlight`) for current
 * overlays; this keeps a back-compat path for older scenes that only set
 * `sharesTemplateGeometry` + `renderOrder`.
 */
function isSharedTemplateHighlight(object: THREE.Object3D): boolean {
  if (object.renderOrder < 10000) return false
  if ((object as { isInstancedMesh?: boolean }).isInstancedMesh === true) {
    return false
  }
  return getSceneDrawableUserData(object).sharesTemplateGeometry === true
}

/** Hidden and deleted slots are stored as a zero scale matrix. */
function isUsableInstanceMatrix(matrix: THREE.Matrix4): boolean {
  const e = matrix.elements
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(e[i]!)) return false
  }
  const sx = Math.hypot(e[0]!, e[1]!, e[2]!)
  const sy = Math.hypot(e[4]!, e[5]!, e[6]!)
  const sz = Math.hypot(e[8]!, e[9]!, e[10]!)
  return sx + sy + sz >= 1e-8
}

/**
 * Bakes every visible INSERT of one shared template into a single world-space
 * slice, then rebases around the centroid.
 */
function expandInstancedGeometry(
  object: InstancedExportDrawable,
  primitiveVertexCount: 1 | 2 | 3
):
  | {
      slice: AcExHtmlBufferGeometrySlice
      offset: [number, number, number]
    }
  | undefined {
  const template = acexHtmlOmitNonFinitePrimitives(
    acexHtmlExportBufferGeometrySlice(object.geometry),
    primitiveVertexCount
  )
  const floatsPerInstance = template.positions.length
  if (floatsPerInstance === 0) return undefined

  object.updateMatrixWorld(true)
  const array = object.instanceMatrix.array as Float32Array
  const indexCount = template.indices?.length ?? 0
  let visible = 0
  for (let i = 0; i < object.count; i++) {
    _instanceMatrix.fromArray(array, i * 16)
    if (isUsableInstanceMatrix(_instanceMatrix)) visible++
  }
  if (visible === 0) return undefined

  const positions = new Float32Array(visible * floatsPerInstance)
  const indices =
    template.indices != null ? new Uint32Array(visible * indexCount) : undefined
  const vertexCount = floatsPerInstance / 3
  let slot = 0
  for (let i = 0; i < object.count; i++) {
    _instanceMatrix.fromArray(array, i * 16)
    if (!isUsableInstanceMatrix(_instanceMatrix)) continue
    _instanceWorld.multiplyMatrices(object.matrixWorld, _instanceMatrix)
    const baked = acexHtmlBakePlainDrawableSlice(template, _instanceWorld)
    positions.set(baked.positions, slot * floatsPerInstance)
    if (indices && baked.indices) {
      const base = slot * vertexCount
      for (let k = 0; k < baked.indices.length; k++) {
        indices[slot * indexCount + k] = baked.indices[k]! + base
      }
    }
    slot++
  }

  const rebased = acexHtmlRebasePlainDrawableSliceAroundCentroid(
    acexHtmlOmitNonFinitePrimitives(
      { positions, indices },
      primitiveVertexCount
    )
  )
  if (rebased.slice.positions.length === 0) return undefined
  return { slice: rebased.slice, offset: rebased.offset }
}

function meshNeedsPerInstanceExport(material: THREE.Material): boolean {
  const style = readMaterialStyle(material)
  const mapped = material as THREE.MeshBasicMaterial
  return !!(style.hatchPattern || style.gradientFill || mapped.map)
}

function forEachVisibleInstanceMatrix(
  object: InstancedExportDrawable,
  visit: (matrixWorld: THREE.Matrix4) => void
): void {
  object.updateMatrixWorld(true)
  const array = object.instanceMatrix.array as Float32Array
  for (let i = 0; i < object.count; i++) {
    _instanceMatrix.fromArray(array, i * 16)
    if (!isUsableInstanceMatrix(_instanceMatrix)) continue
    _instanceWorld.multiplyMatrices(object.matrixWorld, _instanceMatrix)
    visit(_instanceWorld)
  }
}

function pushInstancedLine(
  object: InstancedExportDrawable,
  lineBatches: AcExHtmlLineBatch[]
): void {
  const expanded = expandInstancedGeometry(object, 2)
  if (!expanded) return
  const material = readExportMaterial(object)
  const { color, layer, linePattern } = readMaterialStyle(material)
  const lineDistances = linePattern
    ? acexHtmlComputeLineDistancesForSegments(expanded.slice.positions)
    : undefined
  const exported: AcExHtmlLineBatch = {
    layer,
    color,
    offset: expanded.offset,
    linePattern,
    lineDistances,
    ...expanded.slice
  }
  if (drawableExcludesFromOsnap(object)) {
    exported.excludeFromOsnap = true
  }
  assignRenderOrder(exported, object, material)
  lineBatches.push(exported)
}

function pushInstancedMesh(
  object: InstancedExportDrawable,
  meshBatches: AcExHtmlMeshBatch[],
  asPoints: boolean
): void {
  const material = readExportMaterial(object)
  if (!asPoints && acexHtmlIsTransparentImagePlaceholder(material)) return

  if (!asPoints && meshNeedsPerInstanceExport(material)) {
    const template = acexHtmlOmitNonFinitePrimitives(
      acexHtmlExportBufferGeometrySlice(object.geometry),
      3
    )
    if (template.positions.length === 0) return
    forEachVisibleInstanceMatrix(object, matrixWorld => {
      const baked = acexHtmlOmitNonFinitePrimitives(
        acexHtmlBakePlainDrawableSlice(template, matrixWorld),
        3
      )
      if (baked.positions.length === 0) return
      const rebased = acexHtmlRebasePlainDrawableSliceAroundCentroid(baked)
      _instancePose.matrix.copy(matrixWorld)
      _instancePose.matrixWorld.copy(matrixWorld)
      _instancePose.matrixWorldNeedsUpdate = false
      const mesh = buildMeshBatch(
        object.geometry,
        material,
        _instancePose,
        rebased.slice,
        rebased.offset,
        true
      )
      if (mesh) meshBatches.push(mesh)
    })
    return
  }

  const expanded = expandInstancedGeometry(object, asPoints ? 1 : 3)
  if (!expanded) return
  const mesh = buildMeshBatch(
    object.geometry,
    material,
    object,
    expanded.slice,
    expanded.offset,
    !asPoints
  )
  if (!mesh) return
  meshBatches.push(asPoints ? { ...mesh, points: true } : mesh)
}

function isExportLineSegments2(object: THREE.Object3D): object is LineSegments2 {
  const candidate = object as THREE.Object3D & { isLineSegments2?: boolean }
  return (
    object instanceof LineSegments2 ||
    candidate.isLineSegments2 === true ||
    object.type === 'LineSegments2'
  )
}

function isExportLineSegments(
  object: THREE.Object3D
): object is THREE.LineSegments {
  const candidate = object as THREE.Object3D & { isLineSegments?: boolean }
  return (
    object instanceof THREE.LineSegments ||
    candidate.isLineSegments === true ||
    object.type === 'LineSegments'
  )
}

function isExportMesh(object: THREE.Object3D): object is THREE.Mesh {
  const candidate = object as THREE.Object3D & {
    isMesh?: boolean
    isInstancedMesh?: boolean
  }
  return (
    object instanceof THREE.Mesh ||
    candidate.isMesh === true ||
    candidate.isInstancedMesh === true ||
    object.type === 'Mesh'
  )
}

/**
 * Walks a THREE object subtree and collects line/mesh batches for HTML export.
 * Recognizes `AcTrBatchedLine`, `AcTrBatchedLine2`, `AcTrBatchedMesh`,
 * `AcTrBatchedPoint`, plain `THREE.LineSegments` / `LineSegments2` / `THREE.Mesh`
 * nodes, and GPU-instanced block leaves (`instanceMatrix` on lines, meshes,
 * and points).
 *
 * @param root - Layout or scene root to traverse.
 * @returns Batches grouped by geometry kind, ready to attach to {@link AcExHtmlLayoutSnapshot}.
 */
export function acexHtmlCollectBatchesFromObject3D(
  root: THREE.Object3D
): AcExHtmlCollectedBatches {
  const lineBatches: AcExHtmlLineBatch[] = []
  const meshBatches: AcExHtmlMeshBatch[] = []

  root.traverse(child => {
    if (
      isHighlightOverlayDescendant(child) ||
      isHighlightCloneDrawable(child) ||
      isSharedTemplateHighlight(child)
    ) {
      return
    }
    if (isInstancedExportDrawable(child)) {
      if (!shouldExportPlainDrawable(child, root)) return
      if ((child as unknown as THREE.Points).isPoints === true) {
        pushInstancedMesh(child, meshBatches, true)
      } else if (isExportLineSegments(child) && !isExportLineSegments2(child)) {
        pushInstancedLine(child, lineBatches)
      } else if (isExportMesh(child) && !isExportLineSegments2(child)) {
        pushInstancedMesh(child, meshBatches, false)
      }
      return
    }
    if (child instanceof AcTrBatchedLine) {
      const batch = exportBatchedLine(child)
      if (batch) lineBatches.push(batch)
      return
    }
    if (child instanceof AcTrBatchedLine2) {
      const batch = exportBatchedLine2(child)
      if (batch) lineBatches.push(batch)
      return
    }
    if (child instanceof AcTrBatchedMesh) {
      const batch = exportBatchedMesh(child)
      if (batch) meshBatches.push(batch)
      return
    }
    if (child instanceof AcTrBatchedPoint) {
      const batch = exportBatchedPoint(child)
      if (batch) meshBatches.push(batch)
      return
    }
    if (isExportLineSegments2(child)) {
      if (!shouldExportPlainDrawable(child, root)) return
      const rawSlice = exportLineSegments2Slice(child.geometry)
      if (rawSlice.positions.length === 0) return
      const material = readExportMaterial(child)
      const { color, layer } = readMaterialStyle(material)
      const { offset, ...slice } = exportSceneDrawableSlice(child, rawSlice)
      const exported: AcExHtmlLineBatch = {
        layer,
        color,
        offset,
        lineWidth: readLineWidth(material),
        ...slice
      }
      if (drawableExcludesFromOsnap(child)) {
        exported.excludeFromOsnap = true
      }
      assignRenderOrder(exported, child, material)
      lineBatches.push(exported)
    } else if (isExportLineSegments(child) && !(child instanceof AcTrBatchedLine)) {
      if (!shouldExportPlainDrawable(child, root)) return
      const rawSlice = acexHtmlOmitNonFinitePrimitives(
        acexHtmlExportBufferGeometrySlice(child.geometry),
        2
      )
      if (rawSlice.positions.length === 0) return
      const material = readExportMaterial(child)
      const { color, layer, linePattern } = readMaterialStyle(material)
      const { offset, ...slice } = exportSceneDrawableSlice(child, rawSlice)
      const lineDistances = linePattern
        ? acexHtmlComputeLineDistancesForSegments(slice.positions)
        : undefined
      const exported: AcExHtmlLineBatch = {
        layer,
        color,
        offset,
        linePattern,
        lineDistances,
        ...slice
      }
      if (drawableExcludesFromOsnap(child)) {
        exported.excludeFromOsnap = true
      }
      assignRenderOrder(exported, child, material)
      lineBatches.push(exported)
    } else if (
      isExportMesh(child) &&
      !isExportLineSegments2(child) &&
      !(child instanceof AcTrBatchedMesh)
    ) {
      if (!shouldExportPlainDrawable(child, root)) return
      const material = readExportMaterial(child)
      if (acexHtmlIsTransparentImagePlaceholder(material)) return
      const rawSlice = acexHtmlOmitNonFinitePrimitives(
        acexHtmlExportBufferGeometrySlice(child.geometry),
        3
      )
      if (rawSlice.positions.length === 0) return
      // Pattern fills rebase like other meshes; hatch bases are shifted to the
      // same local offset in buildMeshBatch (world-baked verts caused blocky
      // hatch shaders at large survey coordinates).
      const { offset, ...slice } = exportSceneDrawableSlice(child, rawSlice)
      const mesh = buildMeshBatch(
        child.geometry,
        material,
        child,
        slice,
        offset,
        true
      )
      if (mesh) meshBatches.push(mesh)
    }
  })

  return { lineBatches, meshBatches }
}
