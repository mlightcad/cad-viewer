import {
  AcTrBatchedLine,
  AcTrBatchedMesh,
  AcTrBatchedPoint,
  getMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import type { AcExLineBatch, AcExMeshBatch } from './AcExSnapshotTypes'

/** Slice of buffer geometry exported for HTML snapshot batches. */
export interface AcExBufferGeometrySlice {
  /**
   * Flat vertex positions `[x0, y0, z0, …]` honoring the geometry draw range.
   */
  positions: number[]
  /**
   * Optional index buffer referencing vertices in {@link AcExBufferGeometrySlice.positions}.
   */
  indices?: number[]
}

/** Result of {@link collectBatchesFromObject3D}. */
export interface AcExCollectedBatches {
  /** Line segment batches extracted from the subtree. */
  lineBatches: AcExLineBatch[]
  /** Mesh and point batches extracted from the subtree. */
  meshBatches: AcExMeshBatch[]
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
    return { positions: [] }
  }

  const drawRange = geometry.drawRange
  const vertexStart = drawRange.start ?? 0
  const vertexCount =
    drawRange.count > 0 ? drawRange.count : positionAttr.count - vertexStart

  const positions: number[] = []
  const array = positionAttr.array as Float32Array
  const itemSize = positionAttr.itemSize
  const startIndex = vertexStart * itemSize
  const endIndex = (vertexStart + vertexCount) * itemSize
  for (let i = startIndex; i < endIndex; i++) {
    positions.push(array[i]!)
  }

  const indexAttr = geometry.getIndex()
  if (indexAttr) {
    const indices: number[] = []
    const indexArray = indexAttr.array
    const indexStart = drawRange.start ?? 0
    const indexCount =
      drawRange.count > 0 ? drawRange.count : indexAttr.count - indexStart
    for (let i = indexStart; i < indexStart + indexCount; i++) {
      indices.push(indexArray[i]!)
    }
    return { positions, indices }
  }

  return { positions }
}

function readMaterialStyle(material: THREE.Material): {
  color: number
  layer: string
} {
  const meta = getMaterialMetadata(material)
  const layer = meta.layer ?? '0'
  const mat = material as THREE.MeshBasicMaterial & {
    color?: THREE.Color
  }
  const color =
    mat.color != null
      ? mat.color.getHex()
      : ((meta as { color?: number }).color ?? 0xffffff)
  return { color, layer }
}

function readWorldOffset(object: THREE.Object3D): [number, number, number] {
  const p = object.position
  return [p.x, p.y, p.z]
}

function exportBatchedLine(batch: AcTrBatchedLine): AcExLineBatch | undefined {
  const slice = exportBufferGeometrySlice(batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer } = readMaterialStyle(batch.material as THREE.Material)
  return {
    layer,
    color,
    offset: readWorldOffset(batch),
    ...slice
  }
}

function exportBatchedMesh(batch: AcTrBatchedMesh): AcExMeshBatch | undefined {
  const slice = exportBufferGeometrySlice(batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer } = readMaterialStyle(batch.material as THREE.Material)
  return {
    layer,
    color,
    offset: readWorldOffset(batch),
    ...slice
  }
}

function exportBatchedPoint(
  batch: AcTrBatchedPoint
): AcExMeshBatch | undefined {
  const slice = exportBufferGeometrySlice(batch.geometry)
  if (slice.positions.length === 0) {
    return undefined
  }
  const { color, layer } = readMaterialStyle(batch.material as THREE.Material)
  return {
    layer,
    color,
    offset: readWorldOffset(batch),
    ...slice
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
      const { color, layer } = readMaterialStyle(material)
      lineBatches.push({
        layer,
        color,
        offset: readWorldOffset(child),
        ...slice
      })
    } else if (
      child instanceof THREE.Mesh &&
      !(child instanceof AcTrBatchedMesh)
    ) {
      const slice = exportBufferGeometrySlice(child.geometry)
      if (slice.positions.length === 0) return
      const material = child.material as THREE.Material
      const { color, layer } = readMaterialStyle(material)
      meshBatches.push({
        layer,
        color,
        offset: readWorldOffset(child),
        ...slice
      })
    }
  })

  return { lineBatches, meshBatches }
}
