import { strFromU8, strToU8 } from 'fflate'

import {
  ACEX_SNAPSHOT_VERSION,
  type AcExLayoutSnapshot,
  type AcExLineBatch,
  type AcExMeshBatch,
  type AcExSnapshot
} from './AcExSnapshotTypes'

const MAGIC = 0x58454341 // 'ACEX' little-endian

const F_LINE_INDICES = 1
const F_LINE_PATTERN = 2
const F_LINE_DISTANCES = 4
const F_LINE_WIDTH = 8

const F_MESH_INDICES = 1
const F_MESH_HATCH = 2
const F_MESH_GRADIENT_FILL = 4
const F_MESH_GRADIENT_POS = 8
const F_MESH_SIDE = 16
const F_MESH_POINTS = 32

/**
 * Serializes a snapshot to a compact binary byte array.
 *
 * Metadata and small JSON-friendly fields are length-prefixed UTF-8 JSON;
 * geometry buffers are stored as raw {@link Float32Array} / {@link Uint32Array} bytes.
 *
 * @param snapshot - Snapshot to encode; {@link AcExSnapshot.version} must match
 *   {@link ACEX_SNAPSHOT_VERSION}.
 */
export function encodeSnapshotBinary(snapshot: AcExSnapshot): Uint8Array {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }

  const writer = new BinaryWriter()
  writer.writeU32(MAGIC)
  writer.writeU8(ACEX_SNAPSHOT_VERSION)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)

  writer.writeJson(snapshot.meta)
  writer.writeJson(snapshot.layers)
  writer.writeString(snapshot.activeLayoutBtrId)
  writer.writeU32(snapshot.layouts.length)

  for (const layout of snapshot.layouts) {
    writeLayout(writer, layout)
  }

  return writer.toUint8Array()
}

/**
 * Parses a binary snapshot byte array produced by {@link encodeSnapshotBinary}.
 */
export function decodeSnapshotBinary(bytes: Uint8Array): AcExSnapshot {
  const reader = new BinaryReader(bytes)
  const magic = reader.readU32()
  if (magic !== MAGIC) {
    throw new Error('Invalid snapshot magic')
  }

  const version = reader.readU8()
  reader.readU8()
  reader.readU8()
  reader.readU8()
  if (version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${version}`)
  }

  const meta = reader.readJson<AcExSnapshot['meta']>()
  const layers = reader.readJson<AcExSnapshot['layers']>()
  const activeLayoutBtrId = reader.readString()
  const layoutCount = reader.readU32()
  const layouts: AcExLayoutSnapshot[] = []
  for (let i = 0; i < layoutCount; i++) {
    layouts.push(readLayout(reader))
  }

  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta,
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function writeLayout(writer: BinaryWriter, layout: AcExLayoutSnapshot): void {
  writer.writeString(layout.btrId)
  writer.writeString(layout.name)
  writer.writeU8(layout.isModelSpace ? 1 : 0)
  writer.writeJson(layout.osnap ?? null)

  writer.writeU32(layout.lineBatches.length)
  for (const batch of layout.lineBatches) {
    writeLineBatch(writer, batch)
  }

  writer.writeU32(layout.meshBatches.length)
  for (const batch of layout.meshBatches) {
    writeMeshBatch(writer, batch)
  }
}

function readLayout(reader: BinaryReader): AcExLayoutSnapshot {
  const btrId = reader.readString()
  const name = reader.readString()
  const isModelSpace = reader.readU8() !== 0
  const osnapValue = reader.readJson<AcExLayoutSnapshot['osnap'] | null>()
  const osnap = osnapValue ?? undefined

  const lineBatchCount = reader.readU32()
  const lineBatches: AcExLineBatch[] = []
  for (let i = 0; i < lineBatchCount; i++) {
    lineBatches.push(readLineBatch(reader))
  }

  const meshBatchCount = reader.readU32()
  const meshBatches: AcExMeshBatch[] = []
  for (let i = 0; i < meshBatchCount; i++) {
    meshBatches.push(readMeshBatch(reader))
  }

  return { btrId, name, isModelSpace, lineBatches, meshBatches, osnap }
}

function writeLineBatch(writer: BinaryWriter, batch: AcExLineBatch): void {
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
}

function readLineBatch(reader: BinaryReader): AcExLineBatch {
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
  return batch
}

function writeMeshBatch(writer: BinaryWriter, batch: AcExMeshBatch): void {
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
}

function readMeshBatch(reader: BinaryReader): AcExMeshBatch {
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
  return batch
}

class BinaryWriter {
  private readonly chunks: Uint8Array[] = []
  private length = 0

  writeU8(value: number): void {
    const chunk = new Uint8Array(1)
    chunk[0] = value & 0xff
    this.chunks.push(chunk)
    this.length += 1
  }

  writeU32(value: number): void {
    const chunk = new Uint8Array(4)
    new DataView(chunk.buffer).setUint32(0, value >>> 0, true)
    this.chunks.push(chunk)
    this.length += 4
  }

  writeF32(value: number): void {
    const chunk = new Uint8Array(4)
    new DataView(chunk.buffer).setFloat32(0, value, true)
    this.chunks.push(chunk)
    this.length += 4
  }

  writeF64(value: number): void {
    const chunk = new Uint8Array(8)
    new DataView(chunk.buffer).setFloat64(0, value, true)
    this.chunks.push(chunk)
    this.length += 8
  }

  writeBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes)
    this.length += bytes.length
  }

  writeString(value: string): void {
    const bytes = strToU8(value)
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  writeJson(value: unknown): void {
    this.writeString(JSON.stringify(value))
  }

  writeFloat32Array(array: Float32Array): void {
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    )
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  writeUint32Array(array: Uint32Array): void {
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    )
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.length)
    let offset = 0
    for (const chunk of this.chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }
}

class BinaryReader {
  private offset = 0

  constructor(private readonly bytes: Uint8Array) {}

  readU8(): number {
    return this.bytes[this.offset++]!
  }

  readU32(): number {
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4
    )
    const value = view.getUint32(0, true)
    this.offset += 4
    return value
  }

  readF32(): number {
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4
    )
    const value = view.getFloat32(0, true)
    this.offset += 4
    return value
  }

  readF64(): number {
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      8
    )
    const value = view.getFloat64(0, true)
    this.offset += 8
    return value
  }

  readBytes(length: number): Uint8Array {
    const slice = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  readString(): string {
    const length = this.readU32()
    if (length === 0) {
      return ''
    }
    return strFromU8(this.readBytes(length))
  }

  readJson<T>(): T {
    const text = this.readString()
    if (text.length === 0) {
      throw new Error('Expected JSON payload')
    }
    return JSON.parse(text) as T
  }

  readFloat32Array(): Float32Array {
    const byteLength = this.readU32()
    if (byteLength === 0) {
      return new Float32Array(0)
    }
    const bytes = this.readBytes(byteLength)
    const buffer = new ArrayBuffer(byteLength)
    new Uint8Array(buffer).set(bytes)
    return new Float32Array(buffer)
  }

  readUint32Array(): Uint32Array {
    const byteLength = this.readU32()
    if (byteLength === 0) {
      return new Uint32Array(0)
    }
    const bytes = this.readBytes(byteLength)
    const buffer = new ArrayBuffer(byteLength)
    new Uint8Array(buffer).set(bytes)
    return new Uint32Array(buffer)
  }
}
