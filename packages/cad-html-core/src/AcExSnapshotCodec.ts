import {
  type AcExHtmlBinaryEncoding,
  acExHtmlBytesToText,
  acExHtmlTextToBytes,
  parseAcExHtmlBinaryEncoding
} from './AcExHtmlBinaryText'
import {
  decodeSnapshotBinary,
  encodeSnapshotBinary
} from './AcExSnapshotBinaryCodec'
import {
  type AcExEncodedSnapshot,
  type AcExSnapshotCompression,
  compressSnapshotBinary,
  decompressSnapshotBinary
} from './AcExSnapshotCompression'
import { ACEX_SNAPSHOT_VERSION, type AcExSnapshot } from './AcExSnapshotTypes'

const SNAPSHOT_MIME = 'application/vnd.mlightcad.acex-snapshot+binary'

export type { AcExEncodedSnapshot, AcExSnapshotCompression }

/**
 * Serializes a snapshot to a gzip-compressed base85 string for HTML embedding.
 *
 * @param snapshot - Snapshot to encode; {@link AcExSnapshot.version} must match
 *   {@link ACEX_SNAPSHOT_VERSION}.
 * @returns Base85 payload and the compression format written into the HTML.
 * @throws When the snapshot version is unsupported.
 */
export function encodeSnapshot(snapshot: AcExSnapshot): AcExEncodedSnapshot {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }
  const binary = encodeSnapshotBinary(snapshot)
  const compressed = compressSnapshotBinary(binary)
  return {
    payload: acExHtmlBytesToText(compressed.bytes, 'base85'),
    compression: compressed.compression
  }
}

/**
 * Parses a gzip-compressed snapshot payload from an exported HTML file.
 *
 * @param payload - Text from the snapshot `<script>` element body.
 * @param encoding - Text encoding; defaults to `base85` (current export).
 *   Pass `base64` (or use {@link snapshotPayloadToCompressedBytes} with the
 *   script MIME) for legacy HTML.
 * @returns Parsed {@link AcExSnapshot} object.
 * @throws When decompression, parsing, or version validation fails.
 */
export function decodeSnapshot(
  payload: string,
  encoding: AcExHtmlBinaryEncoding = 'base85'
): AcExSnapshot {
  return decodeSnapshotFromCompressedBytes(
    snapshotPayloadToCompressedBytes(payload, encoding)
  )
}

/**
 * Decodes a gzip-compressed ACEX binary (no text encoding).
 * Prefer this when the runtime already retains compressed bytes for later
 * per-layout rehydration after CPU release.
 */
export function decodeSnapshotFromCompressedBytes(
  compressed: Uint8Array
): AcExSnapshot {
  const binary = decompressSnapshotBinary(compressed)
  return decodeSnapshotBinary(binary)
}

/**
 * Converts a monolithic snapshot `<script>` body to gzip bytes.
 *
 * @param payload - Script text body.
 * @param encodingOrMime - Explicit encoding, or a script `type` MIME string.
 */
export function snapshotPayloadToCompressedBytes(
  payload: string,
  encodingOrMime: AcExHtmlBinaryEncoding | string = 'base85'
): Uint8Array {
  const encoding: AcExHtmlBinaryEncoding =
    encodingOrMime === 'base64' || encodingOrMime === 'base85'
      ? encodingOrMime
      : parseAcExHtmlBinaryEncoding(encodingOrMime)
  return acExHtmlTextToBytes(payload, encoding)
}

/**
 * MIME type stored on the snapshot `<script type="…">` attribute
 * (before the `+gzip;base85` suffix added by {@link packHtml}).
 */
export function snapshotMimeType(): string {
  return SNAPSHOT_MIME
}
