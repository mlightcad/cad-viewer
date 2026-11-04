import {
  type AcExHtmlBinaryEncoding,
  acexHtmlBytesToText,
  acexHtmlParseBinaryEncoding,
  acexHtmlTextToBytes} from './AcExHtmlBinaryText'
import {
  acexHtmlDecodeSnapshotBinary,
  acexHtmlEncodeSnapshotBinary
} from './AcExHtmlSnapshotBinaryCodec'
import {
  acexHtmlCompressSnapshotBinary,
  acexHtmlDecompressSnapshotBinary,
  type AcExHtmlEncodedSnapshot,
  type AcExHtmlSnapshotCompression} from './AcExHtmlSnapshotCompression'
import { ACEX_SNAPSHOT_VERSION, type AcExHtmlSnapshot } from './AcExHtmlSnapshotTypes'

const SNAPSHOT_MIME = 'application/vnd.mlightcad.acex-snapshot+binary'

export type { AcExHtmlEncodedSnapshot, AcExHtmlSnapshotCompression }

/**
 * Serializes a snapshot to a gzip-compressed base85 string for HTML embedding.
 *
 * @param snapshot - Snapshot to encode; {@link AcExHtmlSnapshot.version} must match
 *   {@link ACEX_SNAPSHOT_VERSION}.
 * @returns Base85 payload and the compression format written into the HTML.
 * @throws When the snapshot version is unsupported.
 */
export function acexHtmlEncodeSnapshot(snapshot: AcExHtmlSnapshot): AcExHtmlEncodedSnapshot {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }
  const binary = acexHtmlEncodeSnapshotBinary(snapshot)
  const compressed = acexHtmlCompressSnapshotBinary(binary)
  return {
    payload: acexHtmlBytesToText(compressed.bytes, 'base85'),
    compression: compressed.compression
  }
}

/**
 * Parses a gzip-compressed snapshot payload from an exported HTML file.
 *
 * @param payload - Text from the snapshot `<script>` element body.
 * @param encoding - Text encoding; defaults to `base85` (current export).
 *   Pass `base64` (or use {@link acexHtmlSnapshotPayloadToCompressedBytes} with the
 *   script MIME) for legacy HTML.
 * @returns Parsed {@link AcExHtmlSnapshot} object.
 * @throws When decompression, parsing, or version validation fails.
 */
export function acexHtmlDecodeSnapshot(
  payload: string,
  encoding: AcExHtmlBinaryEncoding = 'base85'
): AcExHtmlSnapshot {
  return acexHtmlDecodeSnapshotFromCompressedBytes(
    acexHtmlSnapshotPayloadToCompressedBytes(payload, encoding)
  )
}

/**
 * Decodes a gzip-compressed ACEX binary (no text encoding).
 * Prefer this when the runtime already retains compressed bytes for later
 * per-layout rehydration after CPU release.
 */
export function acexHtmlDecodeSnapshotFromCompressedBytes(
  compressed: Uint8Array
): AcExHtmlSnapshot {
  const binary = acexHtmlDecompressSnapshotBinary(compressed)
  return acexHtmlDecodeSnapshotBinary(binary)
}

/**
 * Converts a monolithic snapshot `<script>` body to gzip bytes.
 *
 * @param payload - Script text body.
 * @param encodingOrMime - Explicit encoding, or a script `type` MIME string.
 */
export function acexHtmlSnapshotPayloadToCompressedBytes(
  payload: string,
  encodingOrMime: AcExHtmlBinaryEncoding | string = 'base85'
): Uint8Array {
  const encoding: AcExHtmlBinaryEncoding =
    encodingOrMime === 'base64' || encodingOrMime === 'base85'
      ? encodingOrMime
      : acexHtmlParseBinaryEncoding(encodingOrMime)
  return acexHtmlTextToBytes(payload, encoding)
}

/**
 * MIME type stored on the snapshot `<script type="…">` attribute
 * (before the `+gzip;base85` suffix added by {@link acexHtmlPackHtml}).
 */
export function acexHtmlSnapshotMimeType(): string {
  return SNAPSHOT_MIME
}
