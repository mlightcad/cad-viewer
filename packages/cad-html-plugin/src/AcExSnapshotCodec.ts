import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'

import { ACEX_SNAPSHOT_VERSION, type AcExSnapshotV1 } from './AcExSnapshotTypes'

const SNAPSHOT_MIME = 'application/vnd.mlightcad.acex-snapshot+json'

/**
 * Serializes a snapshot to a gzip-compressed base64 string for HTML embedding.
 *
 * @param snapshot - Snapshot to encode; {@link AcExSnapshotV1.version} must match
 *   {@link ACEX_SNAPSHOT_VERSION}.
 * @returns Base64-encoded gzip payload (no data-URL prefix).
 * @throws When the snapshot version is unsupported.
 */
export function encodeSnapshot(snapshot: AcExSnapshotV1): string {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }
  const json = JSON.stringify(snapshot)
  const compressed = gzipSync(strToU8(json))
  return uint8ToBase64(compressed)
}

/**
 * Parses a gzip-compressed base64 snapshot payload from an exported HTML file.
 *
 * @param payload - Base64 text from the snapshot `<script>` element body.
 * @returns Parsed {@link AcExSnapshotV1} object.
 * @throws When decompression, JSON parsing, or version validation fails.
 */
export function decodeSnapshot(payload: string): AcExSnapshotV1 {
  const bytes = base64ToUint8(payload.trim())
  const json = strFromU8(gunzipSync(bytes))
  const snapshot = JSON.parse(json) as AcExSnapshotV1
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }
  return snapshot
}

/**
 * MIME type stored on the snapshot `<script type="…">` attribute
 * (before the `+gzip;base64` suffix added by {@link packHtml}).
 */
export function snapshotMimeType(): string {
  return SNAPSHOT_MIME
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
