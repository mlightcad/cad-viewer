import {
  readLineBatch,
  readMeshBatch,
  writeLineBatch,
  writeMeshBatch
} from './AcExBatchBinaryCodec'
import { AcExBinaryReader, AcExBinaryWriter } from './AcExBinaryIO'
import { compressSnapshotBinary, decompressSnapshotBinary } from './AcExSnapshotCompression'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExLineBatch,
  type AcExMeshBatch
} from './AcExSnapshotTypes'

/** Magic for ACEC geometry chunks (`ACEC` little-endian). */
export const ACEC_CHUNK_MAGIC = 0x43454341

/** Hard cap on line/mesh batch count inside one ACEC chunk. */
export const ACEX_MAX_BATCHES_PER_CHUNK = 100_000

/**
 * Uncompressed geometry chunk: batches for one layout slice.
 * Schema version matches {@link ACEX_SNAPSHOT_VERSION}.
 */
export interface AcExGeometryChunk {
  /** Snapshot / batch schema version. */
  version: typeof ACEX_SNAPSHOT_VERSION
  /** Layout BTR id these batches belong to. */
  layoutBtrId: string
  lineBatches: AcExLineBatch[]
  meshBatches: AcExMeshBatch[]
}

/**
 * Encodes an uncompressed ACEC geometry chunk.
 */
export function encodeChunkBinary(chunk: AcExGeometryChunk): Uint8Array {
  if (chunk.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported chunk version: ${chunk.version}`)
  }

  const writer = new AcExBinaryWriter()
  writer.writeU32(ACEC_CHUNK_MAGIC)
  writer.writeU8(ACEX_SNAPSHOT_VERSION)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeString(chunk.layoutBtrId)

  writer.writeU32(chunk.lineBatches.length)
  for (const batch of chunk.lineBatches) {
    writeLineBatch(writer, batch)
  }

  writer.writeU32(chunk.meshBatches.length)
  for (const batch of chunk.meshBatches) {
    writeMeshBatch(writer, batch)
  }

  return writer.toUint8Array()
}

/**
 * Decodes an uncompressed ACEC geometry chunk.
 */
export function decodeChunkBinary(bytes: Uint8Array): AcExGeometryChunk {
  const reader = new AcExBinaryReader(bytes)
  const magic = reader.readU32()
  if (magic !== ACEC_CHUNK_MAGIC) {
    throw new Error('Invalid chunk magic')
  }

  const version = reader.readU8()
  reader.readU8()
  reader.readU8()
  reader.readU8()
  if (version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported chunk version: ${version}`)
  }

  const layoutBtrId = reader.readString()
  const lineBatchCount = reader.readU32()
  if (lineBatchCount > ACEX_MAX_BATCHES_PER_CHUNK) {
    throw new Error('Chunk line batch count exceeds limit')
  }
  const lineBatches: AcExLineBatch[] = []
  for (let i = 0; i < lineBatchCount; i++) {
    lineBatches.push(readLineBatch(reader))
  }

  const meshBatchCount = reader.readU32()
  if (meshBatchCount > ACEX_MAX_BATCHES_PER_CHUNK) {
    throw new Error('Chunk mesh batch count exceeds limit')
  }
  const meshBatches: AcExMeshBatch[] = []
  for (let i = 0; i < meshBatchCount; i++) {
    meshBatches.push(readMeshBatch(reader))
  }

  return {
    version: ACEX_SNAPSHOT_VERSION,
    layoutBtrId,
    lineBatches,
    meshBatches
  }
}

/** Encodes and gzip-compresses a geometry chunk (`.acex.gz` payload). */
export function encodeChunkGzip(chunk: AcExGeometryChunk): {
  uncompressed: Uint8Array
  compressed: Uint8Array
} {
  const uncompressed = encodeChunkBinary(chunk)
  const compressed = compressSnapshotBinary(uncompressed).bytes
  return { uncompressed, compressed }
}

/** Gunzips and decodes a `.acex.gz` geometry chunk payload. */
export function decodeChunkGzip(compressed: Uint8Array): AcExGeometryChunk {
  return decodeChunkBinary(decompressSnapshotBinary(compressed))
}
