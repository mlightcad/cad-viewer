import { strFromU8 } from 'fflate'

import { readLineBatch, readMeshBatch, writeLineBatch, writeMeshBatch } from './AcExBatchBinaryCodec'
import { AcExBinaryReader, AcExBinaryWriter } from './AcExBinaryIO'
import {
  ACEO_OSNAP_MAGIC,
  decodeOsnapCatalogBinary,
  encodeOsnapCatalogBinary
} from './AcExOsnapCatalogCodec'
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
 * Layout OSNAP catalogs use uncompressed ACEO (same schema as package sidecars).
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

  // Keep the viewport JSON slot as a bare array/null (v4 wire shape) so older
  // runtimes keep paper-space scissors. Carry saved views in meta instead.
  writer.writeJson(metaWithSavedViews(snapshot))
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

  const meta = reader.readJson<AcExSnapshot['meta'] & { savedViews?: Record<string, AcExLayoutSnapshot['savedView']> }>()
  const layers = reader.readJson<AcExSnapshot['layers']>()
  const activeLayoutBtrId = reader.readString()
  const layoutCount = reader.readU32()
  const layouts: AcExLayoutSnapshot[] = []
  for (let i = 0; i < layoutCount; i++) {
    layouts.push(readLayout(reader))
  }
  applySavedViewsFromMeta(layouts, meta.savedViews)

  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta,
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function metaWithSavedViews(snapshot: AcExSnapshot): AcExSnapshot['meta'] {
  const savedViews: NonNullable<AcExSnapshot['meta']['savedViews']> = {
    ...(snapshot.meta.savedViews ?? {})
  }
  for (const layout of snapshot.layouts) {
    if (layout.savedView) {
      savedViews[layout.btrId] = layout.savedView
    }
  }
  if (Object.keys(savedViews).length === 0) {
    if (snapshot.meta.savedViews == null) {
      return snapshot.meta
    }
    const { savedViews: _omit, ...rest } = snapshot.meta
    return rest
  }
  return { ...snapshot.meta, savedViews }
}

function applySavedViewsFromMeta(
  layouts: AcExLayoutSnapshot[],
  savedViews: Record<string, AcExLayoutSnapshot['savedView']> | undefined
): void {
  if (!savedViews) return
  for (const layout of layouts) {
    if (layout.savedView) continue
    const saved = savedViews[layout.btrId]
    if (saved) {
      layout.savedView = saved
    }
  }
}

function writeLayout(writer: AcExBinaryWriter, layout: AcExLayoutSnapshot): void {
  writer.writeString(layout.btrId)
  writer.writeString(layout.name)
  writer.writeU8(layout.isModelSpace ? 1 : 0)
  writeLayoutOsnap(writer, layout.osnap)
  // Bare array/null — must stay v4-compatible with older viewer runtimes.
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

function writeLayoutOsnap(
  writer: AcExBinaryWriter,
  osnap: AcExLayoutSnapshot['osnap']
): void {
  if (!osnap || osnap.primitives.length === 0) {
    writer.writeU32(0)
    return
  }
  const bytes = encodeOsnapCatalogBinary(osnap)
  writer.writeU32(bytes.length)
  writer.writeBytes(bytes)
}

function readLayout(reader: AcExBinaryReader): AcExLayoutSnapshot {
  const btrId = reader.readString()
  const name = reader.readString()
  const isModelSpace = reader.readU8() !== 0
  const osnap = readLayoutOsnap(reader)
  // Accept bare arrays/null (current) and a short-lived object form that also
  // nested savedView beside viewports during development of this feature.
  const viewports = readLayoutViewports(reader.readJson<unknown>())

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

/**
 * Accepts legacy/current bare viewport arrays/null and an object `{ viewports }`
 * form so mismatched mid-development snapshots still decode.
 */
function readLayoutViewports(raw: unknown): AcExLayoutSnapshot['viewports'] {
  if (raw == null) {
    return undefined
  }
  if (Array.isArray(raw)) {
    return raw as AcExLayoutSnapshot['viewports']
  }
  if (typeof raw === 'object') {
    const record = raw as {
      viewports?: AcExLayoutSnapshot['viewports'] | null
    }
    return record.viewports ?? undefined
  }
  return undefined
}

/**
 * Reads a layout OSNAP payload: ACEO bytes, empty, or legacy UTF-8 JSON.
 */
function readLayoutOsnap(
  reader: AcExBinaryReader
): AcExLayoutSnapshot['osnap'] {
  const length = reader.readU32()
  if (length === 0) {
    return undefined
  }
  const bytes = reader.readBytes(length)
  if (isAceoPayload(bytes)) {
    return decodeOsnapCatalogBinary(bytes)
  }
  // Legacy monolithic ACEX stored osnap as length-prefixed JSON (`null` / object).
  const text = strFromU8(bytes)
  if (text.length === 0 || text === 'null') {
    return undefined
  }
  return JSON.parse(text) as AcExLayoutSnapshot['osnap']
}

function isAceoPayload(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  const magic =
    bytes[0]! |
    (bytes[1]! << 8) |
    (bytes[2]! << 16) |
    (bytes[3]! << 24)
  return (magic >>> 0) === ACEO_OSNAP_MAGIC
}
