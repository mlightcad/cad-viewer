import { gunzipSync, gzipSync } from 'fflate'

/** Snapshot payload compression stored on the HTML script `type` attribute. */
export const ACEX_SNAPSHOT_COMPRESSION = 'gzip' as const

/**
 * Hard cap on gunzip output for ACEX payloads (single-file snapshot or package
 * chunk). Rejects zip bombs after inflate; compressed input is also capped.
 *
 * Single-file HTML can exceed 64 MiB once geometry + analytic OSNAP are decoded
 * (large site plans). Package ACEC/ACEO chunks stay far below this; the cap is
 * sized for legitimate self-contained exports, not unbounded inflate.
 */
export const ACEX_MAX_DECOMPRESSED_BYTES = 512 * 1024 * 1024

/** Hard cap on compressed gzip bytes accepted before inflate. */
export const ACEX_MAX_COMPRESSED_BYTES = 256 * 1024 * 1024

export type AcExSnapshotCompression = typeof ACEX_SNAPSHOT_COMPRESSION

export interface AcExCompressedSnapshotBinary {
  bytes: Uint8Array
  compression: AcExSnapshotCompression
}

/** Result of {@link encodeSnapshot} for HTML packaging. */
export interface AcExEncodedSnapshot {
  payload: string
  compression: AcExSnapshotCompression
}

/**
 * Gzip implementation used by snapshot and chunk encoding.
 * Browsers keep fflate / {@link CompressionStream}. Node hosts (the headless
 * exporter) install `zlib` so chunk gzip runs on the libuv thread pool.
 */
export interface AcExSnapshotCompressor {
  gzipSync: (data: Uint8Array) => Uint8Array
  gzip: (data: Uint8Array) => Promise<Uint8Array>
}

let snapshotCompressor: AcExSnapshotCompressor | null = null

/**
 * Overrides gzip for snapshot and package-chunk encoding.
 * Pass `null` to restore the default fflate / {@link CompressionStream} path.
 */
export function setAcExSnapshotCompressor(
  compressor: AcExSnapshotCompressor | null
): void {
  snapshotCompressor = compressor
}

/** Compresses a snapshot binary payload with gzip for HTML export. */
export function compressSnapshotBinary(
  data: Uint8Array
): AcExCompressedSnapshotBinary {
  const bytes = snapshotCompressor
    ? snapshotCompressor.gzipSync(data)
    : gzipSync(data)
  return {
    bytes,
    compression: ACEX_SNAPSHOT_COMPRESSION
  }
}

/**
 * Async gzip so multiple chunk encodes can overlap.
 * Uses an installed compressor when present (Node `zlib`), otherwise the
 * browser {@link CompressionStream}, then sync {@link gzipSync}.
 */
export async function compressSnapshotBinaryAsync(
  data: Uint8Array
): Promise<AcExCompressedSnapshotBinary> {
  if (snapshotCompressor) {
    return {
      bytes: await snapshotCompressor.gzip(data),
      compression: ACEX_SNAPSHOT_COMPRESSION
    }
  }
  if (typeof CompressionStream === 'undefined') {
    return compressSnapshotBinary(data)
  }
  try {
    // Copy into a standalone ArrayBuffer — Blob rejects SharedArrayBuffer views.
    const copy = new Uint8Array(data.byteLength)
    copy.set(data)
    const stream = new Blob([copy])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    return {
      bytes,
      compression: ACEX_SNAPSHOT_COMPRESSION
    }
  } catch {
    return compressSnapshotBinary(data)
  }
}

/** True when `bytes` start with the gzip magic header (`1f 8b`). */
export function isGzipPayload(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

/** Decompresses a gzip snapshot binary payload from an exported HTML file. */
export function decompressSnapshotBinary(data: Uint8Array): Uint8Array {
  if (data.byteLength > ACEX_MAX_COMPRESSED_BYTES) {
    throw new Error('Compressed payload exceeds size limit')
  }
  const result = gunzipSync(data)
  if (result.byteLength > ACEX_MAX_DECOMPRESSED_BYTES) {
    throw new Error('Decompressed payload exceeds size limit')
  }
  return result
}
