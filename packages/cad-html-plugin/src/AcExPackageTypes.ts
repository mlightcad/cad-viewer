import {
  ACEX_SNAPSHOT_VERSION,
  type AcExLayerSnapshot,
  type AcExSnapshot,
  type AcExSnapshotVersion,
  type AcExViewportSnapshot
} from './AcExSnapshotTypes'

/** Current multi-file package / manifest protocol version. */
export const ACEX_PACKAGE_VERSION = 1 as const

export type AcExPackageVersion = typeof ACEX_PACKAGE_VERSION

/** Snapshot schema version embedded in package manifests (matches ACEX batches). */
export type AcExPackageSnapshotVersion = AcExSnapshotVersion

/** One gzip-compressed geometry chunk listed in the package manifest. */
export interface AcExPackageChunkRef {
  /** Stable chunk id (also used in the default file name). */
  id: string
  /** Relative URL from the manifest file (e.g. `chunks/L0-000.acex.gz`). */
  href: string
  /** Layout BTR id this chunk belongs to. */
  layoutBtrId: string
  /** Uncompressed ACEC byte length. */
  byteLength: number
  /** Gzip-compressed byte length. */
  compressedByteLength: number
  /** Number of line batches in this chunk. */
  lineBatchCount: number
  /** Number of mesh batches in this chunk. */
  meshBatchCount: number
  /** Optional content hash (hex SHA-256). Not required by the loader. */
  sha256?: string
}

/**
 * One gzip-compressed ACEO OSNAP chunk (measure mode).
 * Loaded after geometry so viewing does not wait on snap catalogs.
 */
export interface AcExPackageOsnapChunkRef {
  /** Stable chunk id (also used in the default file name). */
  id: string
  /** Relative URL from the manifest (e.g. `chunks/L0-osnap-000.osnap.gz`). */
  href: string
  /** Layout BTR id this chunk belongs to. */
  layoutBtrId: string
  /** Uncompressed ACEO byte length. */
  byteLength: number
  /** Gzip-compressed byte length. */
  compressedByteLength: number
  /** Number of analytic primitives in this chunk. */
  primitiveCount: number
  /** Optional content hash (hex SHA-256). Not required by the loader. */
  sha256?: string
}

/**
 * Layout directory entry in the package manifest.
 * Geometry and OSNAP catalogs live in referenced files, not inline.
 */
export interface AcExPackageLayoutRef {
  btrId: string
  name: string
  isModelSpace: boolean
  /** Paper-space viewports (model space omits this). */
  viewports?: AcExViewportSnapshot[]
  /** Geometry chunks for this layout, in paint order. */
  chunkIds: string[]
  /**
   * OSNAP chunk ids for this layout (measure mode).
   * Omitted when the layout has no analytic snap data.
   */
  osnapChunkIds?: string[]
}

/**
 * Versioned package manifest (`*.acex.json`).
 * Small JSON fetched first; geometry is loaded progressively from chunks.
 */
export interface AcExPackageManifest {
  /** Discriminator for package manifests. */
  format: 'acex-package'
  /** Package protocol version ({@link ACEX_PACKAGE_VERSION}). */
  packageVersion: AcExPackageVersion
  /** Batch / snapshot schema version ({@link ACEX_SNAPSHOT_VERSION}). */
  snapshotVersion: AcExPackageSnapshotVersion
  /** Document-level metadata (same shape as {@link AcExSnapshot.meta}). */
  meta: AcExSnapshot['meta']
  layers: AcExLayerSnapshot[]
  activeLayoutBtrId: string
  layouts: AcExPackageLayoutRef[]
  /** Flat geometry chunk list; layouts reference ids via {@link AcExPackageLayoutRef.chunkIds}. */
  chunks: AcExPackageChunkRef[]
  /**
   * Flat OSNAP chunk list (measure mode). Layouts reference ids via
   * {@link AcExPackageLayoutRef.osnapChunkIds}. Omitted or empty for view-only.
   */
  osnapChunks?: AcExPackageOsnapChunkRef[]
}

/** One file in a multi-file package before zipping for download. */
export interface AcExPackageFile {
  /** Path relative to the package root (forward slashes). */
  path: string
  /** File bytes (UTF-8 for text, raw for binary). */
  bytes: Uint8Array
}

/**
 * Complete multi-file package ready to zip or write to disk.
 */
export interface AcExPackageFiles {
  /** Shell HTML (`viewer.html`) with `#mlcad-package` config. */
  html: string
  /** Manifest object (also serialized as `*.acex.json`). */
  manifest: AcExPackageManifest
  /** Manifest file name at package root (e.g. `drawing.acex.json`). */
  manifestFileName: string
  /** All package files including HTML, manifest, and chunk `.acex.gz` files. */
  files: AcExPackageFile[]
}

/**
 * Default max uncompressed ACEC size per geometry chunk (~2 MiB).
 *
 * Gzip typically brings a 2 MiB slice down to well under 200 KiB. Smaller
 * slices cause too many inflate round-trips and slow first open.
 */
export const ACEX_DEFAULT_CHUNK_MAX_BYTES = 2 * 1024 * 1024

/**
 * Max uncompressed size of one line/mesh batch piece (~2 MiB).
 *
 * Scene collection packs by layer (and material), so a busy layer can be tens
 * of megabytes in a single batch. The packager splits those batches at this
 * threshold so each package chunk can download, inflate, and paint independently.
 * Kept in sync with {@link ACEX_DEFAULT_CHUNK_MAX_BYTES} so pieces are not cut
 * smaller than a chunk and then packed back together.
 */
export const ACEX_MAX_GEOMETRY_BATCH_BYTES = 2 * 1024 * 1024

/**
 * Default max estimated uncompressed ACEO size per OSNAP chunk (~512 KiB).
 * Large measure catalogs are split so hosts can fetch snap data in parallel.
 */
export const ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES = 512 * 1024

export { ACEX_SNAPSHOT_VERSION }

