import {
  type AcApHtmlExpiryDays,
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  type AcExInitialViewMode,
  type AcExViewerMode
} from '@mlightcad/cad-html-core'

/** Packaging mode for headless HTML export. */
export type AcExHtmlExportFormat = 'single' | 'multi'

/** Minimum allowed geometry chunk size in mebibytes for multi-file export. */
const ACEX_MIN_CHUNK_SIZE_MIB = 1

/** Maximum allowed geometry chunk size in mebibytes for multi-file export. */
const ACEX_MAX_CHUNK_SIZE_MIB = 64

const CHUNK_SIZE_MIB = 1024 * 1024

/**
 * Options shared by {@link exportDatabaseToHtml} and {@link exportFileToHtml}.
 */
export interface AcExHtmlExporterOptions {
  /**
   * Packaging mode. Defaults to `'single'`.
   * - `single` — one self-contained `.html`. Small drawings embed a monolithic
   *   ACEX snapshot; large drawings embed progressive ACEC chunks.
   * - `multi` — multi-file ACEX package. Written as one `.zip` unless
   *   {@link AcExHtmlExporterOptions.zipPackage} is `false`, in which case
   *   the package files are written into an output folder.
   * Password and expiry apply only to `'single'`.
   * Chunk size, chunk compression, and {@link AcExHtmlExporterOptions.zipPackage}
   * apply only to `'multi'`.
   */
  exportFormat?: AcExHtmlExportFormat
  exportInvisibleLayers?: boolean
  exportLayouts?: boolean
  initialView?: AcExInitialViewMode
  viewerMode?: AcExViewerMode
  /**
   * How long a single-file HTML remains valid. Defaults to `'never'`.
   * Ignored when {@link AcExHtmlExporterOptions.exportFormat} is `'multi'`.
   */
  expiryDays?: AcApHtmlExpiryDays
  /**
   * Absolute expiry timestamp (Unix ms) when {@link AcExHtmlExporterOptions.expiryDays}
   * is `'custom'`. Ignored for `'multi'`.
   */
  expiresAt?: number | null
  /**
   * Optional password for a single-file HTML. Ignored for `'multi'`.
   */
  password?: string
  /**
   * Max uncompressed bytes per geometry (ACEC) or OSNAP (ACEO) chunk for
   * multi-file packages. Clamped to 1–64 MiB. Defaults to ~2 MiB.
   * Ignored when {@link AcExHtmlExporterOptions.exportFormat} is `'single'`.
   */
  maxChunkBytes?: number
  /**
   * When `true` (default), multi-file package chunks are gzip-compressed
   * with Node `zlib` (`.acex.gz` / `.osnap.gz`). When `false`, raw ACEC/ACEO
   * bytes are written and the outer zip deflates them.
   * Ignored when {@link AcExHtmlExporterOptions.exportFormat} is `'single'`.
   */
  compressChunks?: boolean
  /**
   * When `true` (default), a multi-file export is written as one `.zip`.
   * When `false`, the zip members (`viewer.html`, `drawing.acex.json`,
   * geometry and OSNAP chunks) are written directly into the output folder
   * passed to {@link exportFileToHtml}. Ignored for `'single'`.
   * Independent of {@link AcExHtmlExporterOptions.compressChunks}, which
   * gzip-compresses chunk payloads either way.
   */
  zipPackage?: boolean
  /**
   * Drawing title stored in snapshot metadata / HTML `<title>`.
   * Defaults to the input file stem when exporting from a path.
   */
  title?: string
  /**
   * Local font library. Faces are read from disk instead of the CDN.
   * Accepts a folder of SHX/TTF/WOFF files, that folder when it contains
   * `fonts.json`, or a cad-data checkout (`…/cad-data`, faces in `fonts/`).
   * Catalog aliases (for example `宋体` → `simsun.woff`) are honored.
   * Takes precedence over {@link AcExHtmlExporterOptions.fontsUrl}.
   */
  fontsDir?: string
  /**
   * Override the remote font library base URL (`fonts.json` + face files).
   * Used when {@link AcExHtmlExporterOptions.fontsDir} is omitted. Defaults to
   * the public cad-data fonts folder on jsDelivr.
   */
  fontsUrl?: string
  /**
   * Override path/URL to `viewer-runtime.iife.js`. Defaults to the copy
   * shipped under this package's `runtime/` folder.
   */
  viewerRuntimePath?: string
  /** Logical viewport size used for line resolution / VPORT aspect. */
  width?: number
  height?: number
  /** Locale embedded in the snapshot (`en`, `zh`, …). Defaults to `en`. */
  locale?: string
}

export interface AcExHtmlExportResult {
  /**
   * `'html'` for single-file, `'zip'` for a zipped multi-file package,
   * `'directory'` when {@link AcExHtmlExporterOptions.zipPackage} is `false`.
   */
  kind: 'html' | 'zip' | 'directory'
  /** UTF-8 HTML when {@link AcExHtmlExportResult.kind} is `'html'`. */
  html?: string
  /** Zip bytes when {@link AcExHtmlExportResult.kind} is `'zip'`. */
  zipBytes?: Uint8Array
  /**
   * Package members when {@link AcExHtmlExportResult.kind} is `'directory'`.
   * Paths are relative to the output folder (`viewer.html`, `chunks/…`).
   */
  files?: ReadonlyArray<{ path: string; bytes: Uint8Array }>
  /**
   * Suggested download filename (`.html` / `.zip`), or the drawing stem when
   * the package is written as a directory.
   */
  fileName: string
}

/**
 * Package-builder knobs for multi-file export.
 * Geometry batch pieces and OSNAP catalogs use the same byte budget as
 * {@link AcExHtmlExporterOptions.maxChunkBytes}.
 */
export function resolveAcExHtmlPackageBuildOptions(
  options: Pick<AcExHtmlExporterOptions, 'maxChunkBytes' | 'compressChunks'> = {}
): {
  maxChunkBytes: number
  maxBatchBytes: number
  maxOsnapChunkBytes: number
  compressChunks: boolean
} {
  const maxChunkBytes = clampChunkBytes(options.maxChunkBytes)
  return {
    maxChunkBytes,
    maxBatchBytes: maxChunkBytes,
    maxOsnapChunkBytes: maxChunkBytes,
    compressChunks: options.compressChunks !== false
  }
}

function clampChunkBytes(bytes: number | undefined): number {
  if (bytes == null || !Number.isFinite(bytes)) {
    return ACEX_DEFAULT_CHUNK_MAX_BYTES
  }
  const miB = Math.max(
    ACEX_MIN_CHUNK_SIZE_MIB,
    Math.round(bytes / CHUNK_SIZE_MIB)
  )
  const clamped = Math.min(
    ACEX_MAX_CHUNK_SIZE_MIB,
    Math.max(ACEX_MIN_CHUNK_SIZE_MIB, Math.floor(miB))
  )
  return clamped * CHUNK_SIZE_MIB
}
