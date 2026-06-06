import {
  AcTrBatchedLine,
  AcTrBatchedMesh,
  AcTrBatchedPoint,
  getMaterialMetadata,
  isBatchGeometryActive,
  isBatchGeometryVisible
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  compactIndexedSlice,
  copyFloat32Range,
  copyUint32Range
} from './AcExBatchBuffers'
import {
  computeLineDistancesForSegments,
  exportLineDistanceSlice,
  exportVertexAttributeSlice,
  extractGradientFill,
  extractHatchPattern,
  extractLinePattern,
  transformHatchPatternToWorldSpace
} from './AcExPatternSnapshot'
import type { AcExLineBatch, AcExMeshBatch } from './AcExSnapshotTypes'

/** Slice of buffer geometry exported for HTML snapshot batches. */
export interface AcExBufferGeometrySlice {
  /**
   * Flat vertex positions `[x0, y0, z0, …]` honoring the geometry draw range.
   */
  positions: Float32Array
  /**
   * Optional index buffer referencing vertices in {@link AcExBufferGeometrySlice.positions}.
   */
  indices?: Uint32Array
}

/** Result of {@link collectBatchesFromObject3D}. */
export interface AcExCollectedBatches {
  /** Line segment batches extracted from the subtree. */
  lineBatches: AcExLineBatch[]
  /** Mesh and point batches extracted from the subtree. */
  meshBatches: AcExMeshBatch[]
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
export function exportBufferGeometrySlice(
  geometry: THREE.BufferGeometry
): AcExBufferGeometrySlice {
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
    const positions = copyFloat32Range(array, 0, positionAttr.count * itemSize)
    const indexArray = indexAttr.array
    const indexStart = clampRangeStart(drawRange.start, indexAttr.count)
    const indexCount = resolveRangeCount(
      drawRange.count,
      indexAttr.count,
      indexStart
    )
    const indices = copyUint32Range(indexArray, indexStart, indexCount)
    return compactIndexedSlice(positions, indices)
  }

  const vertexStart = clampRangeStart(drawRange.start, positionAttr.count)
  const vertexCount = resolveRangeCount(
    drawRange.count,
    positionAttr.count,
    vertexStart
  )
  const positions = copyFloat32Range(
    array,
    vertexStart * itemSize,
    vertexCount * itemSize
  )
  return { positions }
}

/** Per-slot geometry range metadata from {@link AcTrBatchedExportSource}. */
type AcTrPackedGeometryInfo = {
  flags: number
  vertexStart: number
  vertexCount: number
  indexStart?: number
  indexCount?: number
}

/** Batched object that exposes packed geometry slot metadata for HTML export. */
type AcTrBatchedExportSource = {
  mappingStats: { count: number }
  getGeometryRangeAt(geometryId: number): AcTrPackedGeometryInfo
}

/**
 * Exports only active geometry data from a batched line/mesh/point buffer,
 * skipping reserved padding and inactive (deleted) slots.
 */
export function exportActiveBatchedSlice(
  batch: AcTrBatchedExportSource,
  geometry: THREE.BufferGeometry
): AcExBufferGeometrySlice {
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
    const positions = copyFloat32Range(
      positionArray,
      0,
      positionAttr.count * itemSize
    )
    const indexArray = indexAttr.array
    const activeIndices: number[] = []

    for (let geometryId = 0; geometryId < count; geometryId++) {
      let info: AcTrPackedGeometryInfo
      try {
        info = batch.getGeometryRangeAt(geometryId)
      } catch {
        continue
      }
      const indexStart = info.indexStart ?? 0
      const indexCount = info.indexCount ?? 0
      if (
        !isBatchGeometryActive(info.flags) ||
        !isBatchGeometryVisible(info.flags) ||
        indexCount <= 0
      ) {
        continue
      }
      for (let i = 0; i < indexCount; i++) {
        activeIndices.push(indexArray[indexStart + i]!)
      }
    }

    if (activeIndices.length === 0) {
      return { positions: new Float32Array(0) }
    }

    return compactIndexedSlice(positions, new Uint32Array(activeIndices))
  }

  const activeFloats: number[] = []
  for (let geometryId = 0; geometryId < count; geometryId++) {
    let info: AcTrPackedGeometryInfo
    try {
      info = batch.getGeometryRangeAt(geometryId)
    } catch {
      continue
    }
    if (
      !isBatchGeometryActive(info.flags) ||
      !isBatchGeometryVisible(info.flags) ||
      info.vertexCount <= 0
    ) {
      continue
    }
    const start = info.vertexStart * itemSize
    const floatCount = info.vertexCount * itemSize
    for (let i = 0; i < floatCount; i++) {
      activeFloats.push(positionArray[start + i]!)
    }
  }

  return { positions: new Float32Array(activeFloats) }
}

function readMaterialStyle(material: THREE.Material): {
  color: number
  layer: string
  linePattern?: ReturnType<typeof extractLinePattern>
  hatchPattern?: ReturnType<typeof extractHatchPattern>
  gradientFill?: ReturnType<typeof extractGradientFill>
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
  const linePattern = extractLinePattern(material)
  const hatchPattern = extractHatchPattern(material)
  const gradientFill = extractGradientFill(material)
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

function resolveExportedHatchPattern(
  object: THREE.Object3D,
  hatchPattern: ReturnType<typeof extractHatchPattern> | undefined
): ReturnType<typeof extractHatchPattern> {
  if (!hatchPattern) {
    return undefined
  }
  const bakedWorldMatrix = (object.userData as { bakedWorldMatrix?: number[] })
    .bakedWorldMatrix
  if (!bakedWorldMatrix || bakedWorldMatrix.length < 16) {
    return hatchPattern
  }
  return transformHatchPatternToWorldSpace(hatchPattern, bakedWorldMatrix)
}

function readWorldOffset(object: THREE.Object3D): [number, number, number] {
  // Batched geometry is rebased: vertices are local and object.position is the origin.
  const p = object.position
  return [p.x, p.y, p.z]
}

function buildMeshBatch(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  object: THREE.Object3D,
  slice: AcExBufferGeometrySlice
): AcExMeshBatch {
  const style = readMaterialStyle(material)
  const hatchPattern = resolveExportedHatchPattern(object, style.hatchPattern)
  const gradientPositions = style.gradientFill
    ? exportVertexAttributeSlice(geometry, 'gradientPosition')
    : undefined
  return {
    layer: style.layer,
    color: style.color,
    offset: readWorldOffset(object),
    hatchPattern,
    gradientFill: style.gradientFill,
    gradientPositions,
    side: style.side,
    ...slice
  }
}

function exportBatchedLine(batch: AcTrBatchedLine): AcExLineBatch | undefined {
  const slice = exportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer, linePattern } = readMaterialStyle(
    batch.material as THREE.Material
  )
  const lineDistances = linePattern
    ? computeLineDistancesForSegments(slice.positions)
    : undefined
  return {
    layer,
    color,
    offset: readWorldOffset(batch),
    linePattern,
    lineDistances,
    ...slice
  }
}

function exportBatchedMesh(batch: AcTrBatchedMesh): AcExMeshBatch | undefined {
  const slice = exportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  return buildMeshBatch(
    batch.geometry,
    batch.material as THREE.Material,
    batch,
    slice
  )
}

function exportBatchedPoint(
  batch: AcTrBatchedPoint
): AcExMeshBatch | undefined {
  const slice = exportActiveBatchedSlice(batch, batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  return {
    points: true,
    ...buildMeshBatch(
      batch.geometry,
      batch.material as THREE.Material,
      batch,
      slice
    )
  }
}

/**
 * Walks a THREE object subtree and collects line/mesh batches for HTML export.
 * Recognizes `AcTrBatchedLine`, `AcTrBatchedMesh`, `AcTrBatchedPoint`, and plain
 * `THREE.LineSegments` / `THREE.Mesh` nodes.
 *
 * @param root - Layout or scene root to traverse.
 * @returns Batches grouped by geometry kind, ready to attach to {@link AcExLayoutSnapshot}.
 */
export function collectBatchesFromObject3D(
  root: THREE.Object3D
): AcExCollectedBatches {
  const lineBatches: AcExLineBatch[] = []
  const meshBatches: AcExMeshBatch[] = []

  root.traverse(child => {
    if (child instanceof AcTrBatchedLine) {
      const batch = exportBatchedLine(child)
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
    if (
      child instanceof THREE.LineSegments &&
      !(child instanceof AcTrBatchedLine)
    ) {
      const slice = exportBufferGeometrySlice(child.geometry)
      if (slice.positions.length === 0) return
      const material = child.material as THREE.Material
      const { color, layer, linePattern } = readMaterialStyle(material)
      const lineDistances = linePattern
        ? (exportLineDistanceSlice(child.geometry) ??
          computeLineDistancesForSegments(slice.positions))
        : undefined
      lineBatches.push({
        layer,
        color,
        offset: readWorldOffset(child),
        linePattern,
        lineDistances,
        ...slice
      })
    } else if (
      child instanceof THREE.Mesh &&
      !(child instanceof AcTrBatchedMesh)
    ) {
      const slice = exportBufferGeometrySlice(child.geometry)
      if (slice.positions.length === 0) return
      meshBatches.push(
        buildMeshBatch(
          child.geometry,
          child.material as THREE.Material,
          child,
          slice
        )
      )
    }
  })

  return { lineBatches, meshBatches }
}
