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

/** Compresses a snapshot binary payload with gzip for HTML export. */
export function compressSnapshotBinary(
  data: Uint8Array
): AcExCompressedSnapshotBinary {
  return {
    bytes: gzipSync(data),
    compression: ACEX_SNAPSHOT_COMPRESSION
  }
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
