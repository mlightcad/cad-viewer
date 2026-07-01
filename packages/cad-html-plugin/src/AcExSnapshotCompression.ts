import { gunzipSync,gzipSync } from 'fflate'

/** Snapshot payload compression stored on the HTML script `type` attribute. */
export const ACEX_SNAPSHOT_COMPRESSION = 'gzip' as const

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
  return gunzipSync(data)
}
