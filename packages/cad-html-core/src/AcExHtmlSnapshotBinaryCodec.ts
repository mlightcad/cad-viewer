import { strFromU8 } from 'fflate'

import { acexHtmlReadLineBatch, acexHtmlReadMeshBatch, acexHtmlWriteLineBatch, acexHtmlWriteMeshBatch } from './AcExHtmlBatchBinaryCodec'
import { AcExHtmlBinaryReader, AcExHtmlBinaryWriter } from './AcExHtmlBinaryIO'
import {
  ACEO_OSNAP_MAGIC,
  acexHtmlDecodeOsnapCatalogBinary,
  acexHtmlEncodeOsnapCatalogBinary
} from './AcExHtmlOsnapCatalogCodec'
import {
  ACEX_SNAPSHOT_VERSION,
  type AcExHtmlExtents,
  type AcExHtmlLayoutSnapshot,
  type AcExHtmlLineBatch,
  type AcExHtmlMeshBatch,
  type AcExHtmlSnapshot
} from './AcExHtmlSnapshotTypes'

const MAGIC = 0x58454341 // 'ACEX' little-endian

/**
 * Serializes a snapshot to a compact binary byte array.
 *
 * Metadata and small JSON-friendly fields are length-prefixed UTF-8 JSON;
 * geometry buffers are stored as raw {@link Float32Array} / {@link Uint32Array} bytes.
 * Layout OSNAP catalogs use uncompressed ACEO (same schema as package sidecars).
 *
 * @param snapshot - Snapshot to encode; {@link AcExHtmlSnapshot.version} must match
 *   {@link ACEX_SNAPSHOT_VERSION}.
 */
export function acexHtmlEncodeSnapshotBinary(snapshot: AcExHtmlSnapshot): Uint8Array {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }

  const writer = new AcExHtmlBinaryWriter()
  writer.writeU32(MAGIC)
  writer.writeU8(ACEX_SNAPSHOT_VERSION)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)

  // Keep the viewport JSON slot as a bare array/null (v4 wire shape) so older
  // runtimes keep paper-space scissors. Carry saved views and per-layout fit
  // boxes in meta instead.
  writer.writeJson(metaWithLayoutViews(snapshot))
  writer.writeJson(snapshot.layers)
  writer.writeString(snapshot.activeLayoutBtrId)
  writer.writeU32(snapshot.layouts.length)

  for (const layout of snapshot.layouts) {
    writeLayout(writer, layout)
  }

  return writer.toUint8Array()
}

/**
 * Parses a binary snapshot byte array produced by {@link acexHtmlEncodeSnapshotBinary}.
 */
export function acexHtmlDecodeSnapshotBinary(bytes: Uint8Array): AcExHtmlSnapshot {
  const reader = new AcExHtmlBinaryReader(bytes)
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

  const meta = reader.readJson<
    AcExHtmlSnapshot['meta'] & {
      savedViews?: Record<string, AcExHtmlExtents>
      fitExtents?: Record<string, AcExHtmlExtents>
    }
  >()
  const layers = reader.readJson<AcExHtmlSnapshot['layers']>()
  const activeLayoutBtrId = reader.readString()
  const layoutCount = reader.readU32()
  const layouts: AcExHtmlLayoutSnapshot[] = []
  for (let i = 0; i < layoutCount; i++) {
    layouts.push(readLayout(reader))
  }
  applyLayoutViewsFromMeta(layouts, meta.savedViews, meta.fitExtents)

  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta,
    layers,
    layouts,
    activeLayoutBtrId
  }
}

function metaWithLayoutViews(snapshot: AcExHtmlSnapshot): AcExHtmlSnapshot['meta'] {
  const savedViews: NonNullable<AcExHtmlSnapshot['meta']['savedViews']> = {
    ...(snapshot.meta.savedViews ?? {})
  }
  const fitExtents: NonNullable<AcExHtmlSnapshot['meta']['fitExtents']> = {
    ...(snapshot.meta.fitExtents ?? {})
  }
  for (const layout of snapshot.layouts) {
    if (layout.savedView) {
      savedViews[layout.btrId] = layout.savedView
    }
    if (layout.fitExtents) {
      fitExtents[layout.btrId] = layout.fitExtents
    }
  }
  const hasSavedViews = Object.keys(savedViews).length > 0
  const hasFitExtents = Object.keys(fitExtents).length > 0
  if (!hasSavedViews && !hasFitExtents) {
    if (snapshot.meta.savedViews == null && snapshot.meta.fitExtents == null) {
      return snapshot.meta
    }
    const { savedViews: _s, fitExtents: _f, ...rest } = snapshot.meta
    return rest
  }
  const {
    savedViews: _omitSaved,
    fitExtents: _omitFit,
    ...rest
  } = snapshot.meta
  return {
    ...rest,
    ...(hasSavedViews ? { savedViews } : {}),
    ...(hasFitExtents ? { fitExtents } : {})
  }
}

function applyLayoutViewsFromMeta(
  layouts: AcExHtmlLayoutSnapshot[],
  savedViews: Record<string, AcExHtmlLayoutSnapshot['savedView']> | undefined,
  fitExtents: Record<string, AcExHtmlLayoutSnapshot['fitExtents']> | undefined
): void {
  if (!savedViews && !fitExtents) return
  for (const layout of layouts) {
    if (!layout.savedView) {
      const saved = savedViews?.[layout.btrId]
      if (saved) {
        layout.savedView = saved
      }
    }
    if (!layout.fitExtents) {
      const fitted = fitExtents?.[layout.btrId]
      if (fitted) {
        layout.fitExtents = fitted
      }
    }
  }
}

function writeLayout(writer: AcExHtmlBinaryWriter, layout: AcExHtmlLayoutSnapshot): void {
  writer.writeString(layout.btrId)
  writer.writeString(layout.name)
  writer.writeU8(layout.isModelSpace ? 1 : 0)
  writeLayoutOsnap(writer, layout.osnap)
  // Bare array/null — must stay v4-compatible with older viewer runtimes.
  writer.writeJson(layout.viewports ?? null)

  writer.writeU32(layout.lineBatches.length)
  for (const batch of layout.lineBatches) {
    acexHtmlWriteLineBatch(writer, batch)
  }

  writer.writeU32(layout.meshBatches.length)
  for (const batch of layout.meshBatches) {
    acexHtmlWriteMeshBatch(writer, batch)
  }
}

function writeLayoutOsnap(
  writer: AcExHtmlBinaryWriter,
  osnap: AcExHtmlLayoutSnapshot['osnap']
): void {
  if (!osnap || osnap.primitives.length === 0) {
    writer.writeU32(0)
    return
  }
  const bytes = acexHtmlEncodeOsnapCatalogBinary(osnap)
  writer.writeU32(bytes.length)
  writer.writeBytes(bytes)
}

function readLayout(reader: AcExHtmlBinaryReader): AcExHtmlLayoutSnapshot {
  const btrId = reader.readString()
  const name = reader.readString()
  const isModelSpace = reader.readU8() !== 0
  const osnap = readLayoutOsnap(reader)
  // Accept bare arrays/null (current) and a short-lived object form that also
  // nested savedView beside viewports during development of this feature.
  const viewports = readLayoutViewports(reader.readJson<unknown>())

  const lineBatchCount = reader.readU32()
  const lineBatches: AcExHtmlLineBatch[] = []
  for (let i = 0; i < lineBatchCount; i++) {
    lineBatches.push(acexHtmlReadLineBatch(reader))
  }

  const meshBatchCount = reader.readU32()
  const meshBatches: AcExHtmlMeshBatch[] = []
  for (let i = 0; i < meshBatchCount; i++) {
    meshBatches.push(acexHtmlReadMeshBatch(reader))
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
function readLayoutViewports(raw: unknown): AcExHtmlLayoutSnapshot['viewports'] {
  if (raw == null) {
    return undefined
  }
  if (Array.isArray(raw)) {
    return raw as AcExHtmlLayoutSnapshot['viewports']
  }
  if (typeof raw === 'object') {
    const record = raw as {
      viewports?: AcExHtmlLayoutSnapshot['viewports'] | null
    }
    return record.viewports ?? undefined
  }
  return undefined
}

/**
 * Reads a layout OSNAP payload: ACEO bytes, empty, or legacy UTF-8 JSON.
 */
function readLayoutOsnap(
  reader: AcExHtmlBinaryReader
): AcExHtmlLayoutSnapshot['osnap'] {
  const length = reader.readU32()
  if (length === 0) {
    return undefined
  }
  const bytes = reader.readBytes(length)
  if (isAceoPayload(bytes)) {
    return acexHtmlDecodeOsnapCatalogBinary(bytes)
  }
  // Legacy monolithic ACEX stored osnap as length-prefixed JSON (`null` / object).
  const text = strFromU8(bytes)
  if (text.length === 0 || text === 'null') {
    return undefined
  }
  return JSON.parse(text) as AcExHtmlLayoutSnapshot['osnap']
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
