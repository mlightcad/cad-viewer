/**
 * Splits oversized layer line/mesh batches so HTML package chunks stay under
 * {@link ACEX_MAX_GEOMETRY_BATCH_BYTES} and can paint progressively.
 *
 * @packageDocumentation
 */

import {
  estimateLineBatchBytes,
  estimateMeshBatchBytes
} from './AcExBatchBinaryCodec'
import { ACEX_MAX_GEOMETRY_BATCH_BYTES } from './AcExPackageTypes'
import type { AcExLineBatch, AcExMeshBatch } from './AcExSnapshotTypes'

/** Fixed per-batch header allowance used when budgeting piece size. */
const BATCH_HEADER_BYTES = 256

/**
 * Splits one line batch into pieces that each stay near `maxBytes`.
 *
 * Small batches are returned unchanged. Indexed and non-indexed layouts are
 * both preserved; vertex attributes (`lineDistances`) are remapped with the
 * vertices they belong to.
 */
export function splitLineBatch(
  batch: AcExLineBatch,
  maxBytes: number = ACEX_MAX_GEOMETRY_BATCH_BYTES
): AcExLineBatch[] {
  if (!(maxBytes > 0) || estimateLineBatchBytes(batch) <= maxBytes) {
    return [batch]
  }

  if (batch.indices && batch.indices.length >= 2) {
    return splitIndexedLineBatch(batch, maxBytes)
  }
  return splitSequentialLineBatch(batch, maxBytes)
}

/**
 * Splits one mesh/point batch into pieces that each stay near `maxBytes`.
 *
 * Textured IMAGE/OLE batches are not split (the bitmap cannot be painted in
 * fragments without duplicating the texture in every chunk).
 */
export function splitMeshBatch(
  batch: AcExMeshBatch,
  maxBytes: number = ACEX_MAX_GEOMETRY_BATCH_BYTES
): AcExMeshBatch[] {
  if (batch.texture) {
    return [batch]
  }
  if (!(maxBytes > 0) || estimateMeshBatchBytes(batch) <= maxBytes) {
    return [batch]
  }

  if (batch.points) {
    return splitPointMeshBatch(batch, maxBytes)
  }
  if (!batch.indices || batch.indices.length < 3) {
    return splitPointOrUnindexedMeshBatch(batch, maxBytes)
  }
  return splitIndexedMeshBatch(batch, maxBytes)
}

function linePatternOverhead(batch: AcExLineBatch): number {
  return batch.linePattern ? 64 + batch.linePattern.pattern.length * 8 : 0
}

function meshStyleOverhead(batch: AcExMeshBatch): number {
  return (batch.hatchPattern ? 128 : 0) + (batch.gradientFill ? 64 : 0)
}

function maxPrimitivesPerPiece(
  maxBytes: number,
  extraBytes: number,
  bytesPerPrimitive: number
): number {
  const budget = maxBytes - BATCH_HEADER_BYTES - extraBytes
  if (budget < bytesPerPrimitive) {
    return 1
  }
  return Math.max(1, Math.floor(budget / bytesPerPrimitive))
}

function splitSequentialLineBatch(
  batch: AcExLineBatch,
  maxBytes: number
): AcExLineBatch[] {
  const hasDistances = (batch.lineDistances?.length ?? 0) >= 2
  const bytesPerSegment = 24 + (hasDistances ? 8 : 0)
  const maxSegments = maxPrimitivesPerPiece(
    maxBytes,
    linePatternOverhead(batch),
    bytesPerSegment
  )
  const totalSegments = (batch.positions.length / 6) | 0
  if (totalSegments <= 1) {
    return [batch]
  }

  const pieces: AcExLineBatch[] = []
  for (let start = 0; start < totalSegments; start += maxSegments) {
    const count = Math.min(maxSegments, totalSegments - start)
    const posStart = start * 6
    const piece: AcExLineBatch = {
      layer: batch.layer,
      color: batch.color,
      offset: batch.offset,
      positions: batch.positions.slice(posStart, posStart + count * 6)
    }
    copyLineStyle(batch, piece)
    if (hasDistances && batch.lineDistances) {
      const distStart = start * 2
      piece.lineDistances = batch.lineDistances.slice(
        distStart,
        distStart + count * 2
      )
    }
    pieces.push(piece)
  }
  return pieces.length > 0 ? pieces : [batch]
}

function splitIndexedLineBatch(
  batch: AcExLineBatch,
  maxBytes: number
): AcExLineBatch[] {
  const indices = batch.indices!
  const hasDistances = (batch.lineDistances?.length ?? 0) > 0
  // Worst case: two unique vertices per segment (no sharing).
  const bytesPerSegment = 24 + 8 + (hasDistances ? 8 : 0)
  const maxSegments = maxPrimitivesPerPiece(
    maxBytes,
    linePatternOverhead(batch),
    bytesPerSegment
  )
  const pieces: AcExLineBatch[] = []
  for (let i = 0; i + 1 < indices.length; ) {
    const indexCount = Math.min(maxSegments * 2, indices.length - i)
    const aligned = indexCount - (indexCount % 2)
    if (aligned < 2) break
    pieces.push(remapLineSlice(batch, i, aligned))
    i += aligned
  }
  return pieces.length > 0 ? pieces : [batch]
}

function remapLineSlice(
  batch: AcExLineBatch,
  indexStart: number,
  indexCount: number
): AcExLineBatch {
  const mapped = remapIndexedVertices(
    batch.positions,
    batch.indices!.subarray(indexStart, indexStart + indexCount),
    batch.lineDistances ? [batch.lineDistances] : [],
    [1]
  )
  const piece: AcExLineBatch = {
    layer: batch.layer,
    color: batch.color,
    offset: batch.offset,
    positions: mapped.positions,
    indices: mapped.indices
  }
  copyLineStyle(batch, piece)
  if (mapped.attributes[0] && mapped.attributes[0].length > 0) {
    piece.lineDistances = mapped.attributes[0]
  }
  return piece
}

function splitPointMeshBatch(
  batch: AcExMeshBatch,
  maxBytes: number
): AcExMeshBatch[] {
  if (batch.indices && batch.indices.length > 0) {
    return splitIndexedPointMeshBatch(batch, maxBytes)
  }
  return splitPointOrUnindexedMeshBatch(batch, maxBytes)
}

function splitIndexedPointMeshBatch(
  batch: AcExMeshBatch,
  maxBytes: number
): AcExMeshBatch[] {
  const indices = batch.indices!
  const bytesPerPoint =
    12 + 4 + (batch.uvs ? 8 : 0) + (batch.gradientPositions ? 8 : 0)
  const maxPoints = maxPrimitivesPerPiece(
    maxBytes,
    meshStyleOverhead(batch),
    bytesPerPoint
  )
  const pieces: AcExMeshBatch[] = []
  for (let i = 0; i < indices.length; ) {
    const count = Math.min(maxPoints, indices.length - i)
    if (count < 1) break
    pieces.push(remapMeshSlice(batch, i, count))
    i += count
  }
  return pieces.length > 0 ? pieces : [batch]
}

function splitPointOrUnindexedMeshBatch(
  batch: AcExMeshBatch,
  maxBytes: number
): AcExMeshBatch[] {
  const vertexCount = (batch.positions.length / 3) | 0
  if (vertexCount <= 1) {
    return [batch]
  }
  const bytesPerVertex =
    12 + (batch.uvs ? 8 : 0) + (batch.gradientPositions ? 8 : 0)
  const maxVertices = maxPrimitivesPerPiece(
    maxBytes,
    meshStyleOverhead(batch),
    bytesPerVertex
  )
  const group = batch.points ? 1 : 3
  const alignedMax = Math.max(group, maxVertices - (maxVertices % group))
  const pieces: AcExMeshBatch[] = []
  for (let start = 0; start < vertexCount; start += alignedMax) {
    const count = Math.min(alignedMax, vertexCount - start)
    const alignedCount = count - (count % group)
    if (alignedCount < group) break
    pieces.push(sliceMeshVertices(batch, start, alignedCount))
  }
  return pieces.length > 0 ? pieces : [batch]
}

function splitIndexedMeshBatch(
  batch: AcExMeshBatch,
  maxBytes: number
): AcExMeshBatch[] {
  const indices = batch.indices!
  const bytesPerTriangle =
    36 + 12 + (batch.uvs ? 24 : 0) + (batch.gradientPositions ? 24 : 0)
  const maxTriangles = maxPrimitivesPerPiece(
    maxBytes,
    meshStyleOverhead(batch),
    bytesPerTriangle
  )
  const pieces: AcExMeshBatch[] = []
  for (let i = 0; i + 2 < indices.length; ) {
    const indexCount = Math.min(maxTriangles * 3, indices.length - i)
    const aligned = indexCount - (indexCount % 3)
    if (aligned < 3) break
    pieces.push(remapMeshSlice(batch, i, aligned))
    i += aligned
  }
  return pieces.length > 0 ? pieces : [batch]
}

function sliceMeshVertices(
  batch: AcExMeshBatch,
  vertexStart: number,
  vertexCount: number
): AcExMeshBatch {
  const posStart = vertexStart * 3
  const piece: AcExMeshBatch = {
    layer: batch.layer,
    color: batch.color,
    offset: batch.offset,
    positions: batch.positions.slice(posStart, posStart + vertexCount * 3)
  }
    copyMeshStyle(batch, piece)
    if (batch.uvs) {
    piece.uvs = batch.uvs.slice(vertexStart * 2, (vertexStart + vertexCount) * 2)
  }
  if (batch.gradientPositions) {
    piece.gradientPositions = batch.gradientPositions.slice(
      vertexStart * 2,
      (vertexStart + vertexCount) * 2
    )
  }
  return piece
}

function remapMeshSlice(
  batch: AcExMeshBatch,
  indexStart: number,
  indexCount: number
): AcExMeshBatch {
  const extras: Float32Array[] = []
  const strides: number[] = []
  if (batch.uvs) {
    extras.push(batch.uvs)
    strides.push(2)
  }
  if (batch.gradientPositions) {
    extras.push(batch.gradientPositions)
    strides.push(2)
  }
  const mapped = remapIndexedVertices(
    batch.positions,
    batch.indices!.subarray(indexStart, indexStart + indexCount),
    extras,
    strides
  )
  const piece: AcExMeshBatch = {
    layer: batch.layer,
    color: batch.color,
    offset: batch.offset,
    positions: mapped.positions,
    indices: mapped.indices
  }
  copyMeshStyle(batch, piece)
  let attr = 0
  if (batch.uvs) {
    piece.uvs = mapped.attributes[attr++]
  }
  if (batch.gradientPositions) {
    piece.gradientPositions = mapped.attributes[attr]
  }
  return piece
}

function remapIndexedVertices(
  positions: Float32Array,
  indices: Uint32Array,
  extras: Float32Array[],
  strides: number[]
): {
  positions: Float32Array
  indices: Uint32Array
  attributes: Float32Array[]
} {
  const remap = new Map<number, number>()
  const newPositions: number[] = []
  const newIndices = new Uint32Array(indices.length)
  const newExtras: number[][] = extras.map(() => [])

  for (let i = 0; i < indices.length; i++) {
    const oldIndex = indices[i]!
    let mapped = remap.get(oldIndex)
    if (mapped == null) {
      mapped = remap.size
      remap.set(oldIndex, mapped)
      const src = oldIndex * 3
      newPositions.push(
        positions[src] ?? 0,
        positions[src + 1] ?? 0,
        positions[src + 2] ?? 0
      )
      for (let a = 0; a < extras.length; a++) {
        const stride = strides[a]!
        const extra = extras[a]!
        const base = oldIndex * stride
        for (let k = 0; k < stride; k++) {
          newExtras[a]!.push(extra[base + k] ?? 0)
        }
      }
    }
    newIndices[i] = mapped
  }

  return {
    positions: Float32Array.from(newPositions),
    indices: newIndices,
    attributes: newExtras.map(values => Float32Array.from(values))
  }
}

function copyLineStyle(from: AcExLineBatch, to: AcExLineBatch): void {
  if (from.linePattern) to.linePattern = from.linePattern
  if (from.lineWidth != null) to.lineWidth = from.lineWidth
  if (from.renderOrder != null) to.renderOrder = from.renderOrder
  if (from.excludeFromOsnap) to.excludeFromOsnap = true
}

function copyMeshStyle(from: AcExMeshBatch, to: AcExMeshBatch): void {
  if (from.hatchPattern) to.hatchPattern = from.hatchPattern
  if (from.gradientFill) to.gradientFill = from.gradientFill
  if (from.side != null) to.side = from.side
  if (from.renderOrder != null) to.renderOrder = from.renderOrder
  if (from.points) to.points = true
}
