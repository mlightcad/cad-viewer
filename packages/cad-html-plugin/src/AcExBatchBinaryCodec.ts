import type { AcExBinaryReader, AcExBinaryWriter } from './AcExBinaryIO'
import type { AcExLineBatch, AcExMeshBatch } from './AcExSnapshotTypes'

/** Optional line-batch feature flags (append-only; never renumber). */
export const F_LINE_INDICES = 1
export const F_LINE_PATTERN = 2
export const F_LINE_DISTANCES = 4
export const F_LINE_WIDTH = 8
export const F_LINE_RENDER_ORDER = 16
/** Text/point glyph strokes — display only; skip hybrid OSNAP. */
export const F_LINE_EXCLUDE_OSNAP = 32

/** Optional mesh-batch feature flags (append-only; never renumber). */
export const F_MESH_INDICES = 1
export const F_MESH_HATCH = 2
export const F_MESH_GRADIENT_FILL = 4
export const F_MESH_GRADIENT_POS = 8
export const F_MESH_SIDE = 16
export const F_MESH_POINTS = 32
export const F_MESH_RENDER_ORDER = 64
/** v4: uvs + embedded raster texture (IMAGE / OLE). */
export const F_MESH_TEXTURE = 128

/**
 * Rough uncompressed payload size for chunk-size budgeting.
 * Includes geometry buffers plus a small fixed overhead for headers/strings.
 */
export function estimateLineBatchBytes(batch: AcExLineBatch): number {
  let size = 256 + batch.positions.byteLength
  if (batch.indices) size += batch.indices.byteLength
  if (batch.lineDistances) size += batch.lineDistances.byteLength
  if (batch.linePattern) size += 64 + batch.linePattern.pattern.length * 8
  return size
}

/**
 * Rough uncompressed payload size for chunk-size budgeting.
 */
export function estimateMeshBatchBytes(batch: AcExMeshBatch): number {
  let size = 256 + batch.positions.byteLength
  if (batch.indices) size += batch.indices.byteLength
  if (batch.gradientPositions) size += batch.gradientPositions.byteLength
  if (batch.uvs) size += batch.uvs.byteLength
  if (batch.texture) size += batch.texture.bytes.byteLength + 64
  if (batch.hatchPattern) size += 128
  if (batch.gradientFill) size += 64
  return size
}

/** Writes one {@link AcExLineBatch} with length-prefixed buffers and feature flags. */
export function writeLineBatch(
  writer: AcExBinaryWriter,
  batch: AcExLineBatch
): void {
  writer.writeString(batch.layer)
  writer.writeU32(batch.color >>> 0)
  writer.writeF64(batch.offset[0]!)
  writer.writeF64(batch.offset[1]!)
  writer.writeF64(batch.offset[2]!)
  writer.writeFloat32Array(batch.positions)

  let flags = 0
  if (batch.indices && batch.indices.length > 0) flags |= F_LINE_INDICES
  if (batch.linePattern) flags |= F_LINE_PATTERN
  if (batch.lineDistances && batch.lineDistances.length > 0) {
    flags |= F_LINE_DISTANCES
  }
  if (batch.lineWidth != null && batch.lineWidth > 0) {
    flags |= F_LINE_WIDTH
  }
  if (batch.renderOrder != null && batch.renderOrder !== 0) {
    flags |= F_LINE_RENDER_ORDER
  }
  if (batch.excludeFromOsnap) {
    flags |= F_LINE_EXCLUDE_OSNAP
  }
  writer.writeU8(flags)

  if (flags & F_LINE_INDICES) {
    writer.writeUint32Array(batch.indices!)
  }
  if (flags & F_LINE_PATTERN) {
    writer.writeJson(batch.linePattern!)
  }
  if (flags & F_LINE_DISTANCES) {
    writer.writeFloat32Array(batch.lineDistances!)
  }
  if (flags & F_LINE_WIDTH) {
    writer.writeF32(batch.lineWidth!)
  }
  if (flags & F_LINE_RENDER_ORDER) {
    writer.writeI32(batch.renderOrder!)
  }
}

/** Reads one {@link AcExLineBatch}; unknown flag bits are ignored (reserved). */
export function readLineBatch(reader: AcExBinaryReader): AcExLineBatch {
  const layer = reader.readString()
  const color = reader.readU32()
  const offset: [number, number, number] = [
    reader.readF64(),
    reader.readF64(),
    reader.readF64()
  ]
  const positions = reader.readFloat32Array()
  const flags = reader.readU8()

  const batch: AcExLineBatch = { layer, color, offset, positions }
  if (flags & F_LINE_INDICES) {
    batch.indices = reader.readUint32Array()
  }
  if (flags & F_LINE_PATTERN) {
    batch.linePattern =
      reader.readJson<NonNullable<AcExLineBatch['linePattern']>>()
  }
  if (flags & F_LINE_DISTANCES) {
    batch.lineDistances = reader.readFloat32Array()
  }
  if (flags & F_LINE_WIDTH) {
    batch.lineWidth = reader.readF32()
  }
  if (flags & F_LINE_RENDER_ORDER) {
    batch.renderOrder = reader.readI32()
  }
  if (flags & F_LINE_EXCLUDE_OSNAP) {
    batch.excludeFromOsnap = true
  }
  return batch
}

/** Writes one {@link AcExMeshBatch} with length-prefixed buffers and feature flags. */
export function writeMeshBatch(
  writer: AcExBinaryWriter,
  batch: AcExMeshBatch
): void {
  writer.writeString(batch.layer)
  writer.writeU32(batch.color >>> 0)
  writer.writeF64(batch.offset[0]!)
  writer.writeF64(batch.offset[1]!)
  writer.writeF64(batch.offset[2]!)
  writer.writeFloat32Array(batch.positions)

  let flags = 0
  if (batch.indices && batch.indices.length > 0) flags |= F_MESH_INDICES
  if (batch.hatchPattern) flags |= F_MESH_HATCH
  if (batch.gradientFill) flags |= F_MESH_GRADIENT_FILL
  if (batch.gradientPositions && batch.gradientPositions.length > 0) {
    flags |= F_MESH_GRADIENT_POS
  }
  if (batch.side != null) flags |= F_MESH_SIDE
  if (batch.points) flags |= F_MESH_POINTS
  if (batch.renderOrder != null && batch.renderOrder !== 0) {
    flags |= F_MESH_RENDER_ORDER
  }
  if (
    batch.texture &&
    batch.texture.bytes.length > 0 &&
    batch.uvs &&
    batch.uvs.length >= 2
  ) {
    flags |= F_MESH_TEXTURE
  }
  writer.writeU8(flags)

  if (flags & F_MESH_INDICES) {
    writer.writeUint32Array(batch.indices!)
  }
  if (flags & F_MESH_HATCH) {
    writer.writeJson(batch.hatchPattern!)
  }
  if (flags & F_MESH_GRADIENT_FILL) {
    writer.writeJson(batch.gradientFill!)
  }
  if (flags & F_MESH_GRADIENT_POS) {
    writer.writeFloat32Array(batch.gradientPositions!)
  }
  if (flags & F_MESH_SIDE) {
    writer.writeU8(batch.side!)
  }
  if (flags & F_MESH_RENDER_ORDER) {
    writer.writeI32(batch.renderOrder!)
  }
  if (flags & F_MESH_TEXTURE) {
    writer.writeFloat32Array(batch.uvs!)
    writer.writeString(batch.texture!.mimeType || 'image/png')
    writer.writeU32(batch.texture!.bytes.byteLength)
    writer.writeBytes(batch.texture!.bytes)
  }
}

/** Reads one {@link AcExMeshBatch}; unknown flag bits are ignored (reserved). */
export function readMeshBatch(reader: AcExBinaryReader): AcExMeshBatch {
  const layer = reader.readString()
  const color = reader.readU32()
  const offset: [number, number, number] = [
    reader.readF64(),
    reader.readF64(),
    reader.readF64()
  ]
  const positions = reader.readFloat32Array()
  const flags = reader.readU8()

  const batch: AcExMeshBatch = { layer, color, offset, positions }
  if (flags & F_MESH_INDICES) {
    batch.indices = reader.readUint32Array()
  }
  if (flags & F_MESH_HATCH) {
    batch.hatchPattern =
      reader.readJson<NonNullable<AcExMeshBatch['hatchPattern']>>()
  }
  if (flags & F_MESH_GRADIENT_FILL) {
    batch.gradientFill =
      reader.readJson<NonNullable<AcExMeshBatch['gradientFill']>>()
  }
  if (flags & F_MESH_GRADIENT_POS) {
    batch.gradientPositions = reader.readFloat32Array()
  }
  if (flags & F_MESH_SIDE) {
    batch.side = reader.readU8()
  }
  if (flags & F_MESH_POINTS) {
    batch.points = true
  }
  if (flags & F_MESH_RENDER_ORDER) {
    batch.renderOrder = reader.readI32()
  }
  if (flags & F_MESH_TEXTURE) {
    batch.uvs = reader.readFloat32Array()
    const mimeType = reader.readString() || 'image/png'
    const byteLength = reader.readU32()
    batch.texture = {
      mimeType,
      bytes: reader.readBytes(byteLength)
    }
  }
  return batch
}
