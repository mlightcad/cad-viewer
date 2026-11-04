import {
  acexHtmlReadLineBatch,
  acexHtmlReadMeshBatch,
  acexHtmlWriteLineBatch,
  acexHtmlWriteMeshBatch
} from './AcExHtmlBatchBinaryCodec'
import { AcExHtmlBinaryReader, AcExHtmlBinaryWriter } from './AcExHtmlBinaryIO'
import {
  acexHtmlCompressSnapshotBinary,
  acexHtmlCompressSnapshotBinaryAsync,
  acexHtmlDecompressSnapshotBinary,
  acexHtmlIsGzipPayload
} from './AcExHtmlSnapshotCompression'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExHtmlLineBatch,
  type AcExHtmlMeshBatch
} from './AcExHtmlSnapshotTypes'

/** Magic for ACEC geometry chunks (`ACEC` little-endian). */
export const ACEC_CHUNK_MAGIC = 0x43454341

/** Hard cap on line/mesh batch count inside one ACEC chunk. */
export const ACEX_MAX_BATCHES_PER_CHUNK = 100_000

/**
 * Uncompressed geometry chunk: batches for one layout slice.
 * Schema version matches {@link ACEX_SNAPSHOT_VERSION}.
 */
export interface AcExHtmlGeometryChunk {
  /** Snapshot / batch schema version. */
  version: typeof ACEX_SNAPSHOT_VERSION
  /** Layout BTR id these batches belong to. */
  layoutBtrId: string
  lineBatches: AcExHtmlLineBatch[]
  meshBatches: AcExHtmlMeshBatch[]
}

/**
 * Encodes an uncompressed ACEC geometry chunk.
 */
export function acexHtmlEncodeChunkBinary(chunk: AcExHtmlGeometryChunk): Uint8Array {
  if (chunk.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported chunk version: ${chunk.version}`)
  }

  const writer = new AcExHtmlBinaryWriter()
  writer.writeU32(ACEC_CHUNK_MAGIC)
  writer.writeU8(ACEX_SNAPSHOT_VERSION)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeString(chunk.layoutBtrId)

  writer.writeU32(chunk.lineBatches.length)
  for (const batch of chunk.lineBatches) {
    acexHtmlWriteLineBatch(writer, batch)
  }

  writer.writeU32(chunk.meshBatches.length)
  for (const batch of chunk.meshBatches) {
    acexHtmlWriteMeshBatch(writer, batch)
  }

  return writer.toUint8Array()
}

/**
 * Decodes an uncompressed ACEC geometry chunk.
 */
export function acexHtmlDecodeChunkBinary(bytes: Uint8Array): AcExHtmlGeometryChunk {
  const reader = new AcExHtmlBinaryReader(bytes)
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
  const lineBatches: AcExHtmlLineBatch[] = []
  for (let i = 0; i < lineBatchCount; i++) {
    lineBatches.push(acexHtmlReadLineBatch(reader))
  }

  const meshBatchCount = reader.readU32()
  if (meshBatchCount > ACEX_MAX_BATCHES_PER_CHUNK) {
    throw new Error('Chunk mesh batch count exceeds limit')
  }
  const meshBatches: AcExHtmlMeshBatch[] = []
  for (let i = 0; i < meshBatchCount; i++) {
    meshBatches.push(acexHtmlReadMeshBatch(reader))
  }

  return {
    version: ACEX_SNAPSHOT_VERSION,
    layoutBtrId,
    lineBatches,
    meshBatches
  }
}

/** Encodes and gzip-compresses a geometry chunk (`.acex.gz` payload). */
export function acexHtmlEncodeChunkGzip(chunk: AcExHtmlGeometryChunk): {
  uncompressed: Uint8Array
  compressed: Uint8Array
} {
  const uncompressed = acexHtmlEncodeChunkBinary(chunk)
  const compressed = acexHtmlCompressSnapshotBinary(uncompressed).bytes
  return { uncompressed, compressed }
}

/** Async variant of {@link acexHtmlEncodeChunkGzip} for parallel package builds. */
export async function acexHtmlEncodeChunkGzipAsync(chunk: AcExHtmlGeometryChunk): Promise<{
  uncompressed: Uint8Array
  compressed: Uint8Array
}> {
  const uncompressed = acexHtmlEncodeChunkBinary(chunk)
  const compressed = (await acexHtmlCompressSnapshotBinaryAsync(uncompressed)).bytes
  return { uncompressed, compressed }
}

/** Gunzips and decodes a `.acex.gz` geometry chunk payload. */
export function acexHtmlDecodeChunkGzip(compressed: Uint8Array): AcExHtmlGeometryChunk {
  return acexHtmlDecodeChunkBinary(acexHtmlDecompressSnapshotBinary(compressed))
}

/**
 * Decodes a geometry chunk payload that may be gzip (`.acex.gz`) or raw ACEC
 * (`.acex`). Detection uses the gzip magic header so loaders stay extension-agnostic.
 */
export function acexHtmlDecodeChunkPayload(bytes: Uint8Array): AcExHtmlGeometryChunk {
  if (acexHtmlIsGzipPayload(bytes)) {
    return acexHtmlDecodeChunkGzip(bytes)
  }
  return acexHtmlDecodeChunkBinary(bytes)
}
