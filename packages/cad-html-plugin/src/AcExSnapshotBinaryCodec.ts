import { readLineBatch, readMeshBatch, writeLineBatch, writeMeshBatch } from './AcExBatchBinaryCodec'
import { AcExBinaryReader, AcExBinaryWriter } from './AcExBinaryIO'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExLayoutSnapshot,
  type AcExLineBatch,
  type AcExMeshBatch,
  type AcExSnapshot
} from './AcExSnapshotTypes'

const MAGIC = 0x58454341 // 'ACEX' little-endian

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

  const writer = new AcExBinaryWriter()
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
  const reader = new AcExBinaryReader(bytes)
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

function writeLayout(writer: AcExBinaryWriter, layout: AcExLayoutSnapshot): void {
  writer.writeString(layout.btrId)
  writer.writeString(layout.name)
  writer.writeU8(layout.isModelSpace ? 1 : 0)
  writer.writeJson(layout.osnap ?? null)
  writer.writeJson(layout.viewports ?? null)

  writer.writeU32(layout.lineBatches.length)
  for (const batch of layout.lineBatches) {
    writeLineBatch(writer, batch)
  }

  writer.writeU32(layout.meshBatches.length)
  for (const batch of layout.meshBatches) {
    writeMeshBatch(writer, batch)
  }
}

function readLayout(reader: AcExBinaryReader): AcExLayoutSnapshot {
  const btrId = reader.readString()
  const name = reader.readString()
  const isModelSpace = reader.readU8() !== 0
  const osnapValue = reader.readJson<AcExLayoutSnapshot['osnap'] | null>()
  const osnap = osnapValue ?? undefined
  const viewportsValue = reader.readJson<
    AcExLayoutSnapshot['viewports'] | null
  >()
  const viewports = viewportsValue ?? undefined

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

  return {
    btrId,
    name,
    isModelSpace,
    lineBatches,
    meshBatches,
    osnap,
    viewports
  }
}
