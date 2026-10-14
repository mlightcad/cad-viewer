import type { AcTrView2d } from '@mlightcad/cad-simple-viewer'

import type { AcApHtmlExpiryDays } from './AcExHtmlAccess'
import {
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES
} from './AcExPackageTypes'
import type {
  AcExInitialViewMode,
  AcExViewerMode,
  AcExViewState
} from './AcExSnapshotTypes'

export type { AcApHtmlExpiryDays } from './AcExHtmlAccess'

/** Matches the offline HTML viewer orthographic half-height in world units. */
const HTML_VIEWER_CAMERA_FRUSTUM = 400

/** Default max geometry chunk size expressed in mebibytes (2 MiB). */
export const ACEX_DEFAULT_CHUNK_SIZE_MIB =
  ACEX_DEFAULT_CHUNK_MAX_BYTES / (1024 * 1024)

/** Minimum allowed geometry chunk size in mebibytes for multi-file export. */
export const ACEX_MIN_CHUNK_SIZE_MIB = 1

/** Maximum allowed geometry chunk size in mebibytes for multi-file export. */
export const ACEX_MAX_CHUNK_SIZE_MIB = 64

/**
 * HTML export packaging mode.
 *
 * - `single` — one self-contained `.html` (default). Small drawings embed a
 *   monolithic ACEX snapshot; large drawings embed progressive ACEC chunks.
 * - `multi` — multi-file ACEX package zipped as one `.zip` download; unzip before hosting.
 */
export type AcApHtmlExportFormat = 'single' | 'multi'

/**
 * User-configurable options for HTML export (`-chtml`, dialog, and CLI).
 */
export interface AcApHtmlExportOptions {
  /**
   * Packaging mode. Defaults to `'single'`.
   * Password and expiry apply only to `'single'`.
   * Chunk size and compression apply only to `'multi'`.
   */
  exportFormat?: AcApHtmlExportFormat
  /**
   * When `true`, off/frozen layers are converted and written into the snapshot.
   * Defaults to `true` for backward compatibility with pre-option HTML export.
   */
  exportInvisibleLayers?: boolean
  /**
   * When `true`, paper-space layouts are converted and written into the snapshot.
   * When `false`, only model space is exported, the offline toolbar omits the
   * layout switcher, and the viewer can release CPU geometry after the first
   * draw. Defaults to `true`.
   */
  exportLayouts?: boolean
  /**
   * Initial framing when the exported HTML is opened. Defaults to `'fit'`.
   */
  initialView?: AcExInitialViewMode
  /**
   * Offline viewer capability profile. `'view'` omits OSNAP data, measurement,
   * and markup UI for a smaller, faster HTML file. Defaults to `'measure'`.
   */
  viewerMode?: AcExViewerMode
  /**
   * How long the exported HTML remains valid. Defaults to `'never'`.
   * Use `'custom'` with {@link AcApHtmlExportOptions.expiresAt} for an absolute time.
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'multi'`.
   */
  expiryDays?: AcApHtmlExpiryDays
  /**
   * Absolute expiry timestamp (Unix ms). Used when {@link AcApHtmlExportOptions.expiryDays}
   * is `'custom'`. Ignored for relative periods and `'never'`.
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'multi'`.
   */
  expiresAt?: number | null
  /**
   * Optional password required to open the exported HTML. When set, the snapshot
   * or each embedded progressive chunk is AES-GCM encrypted.
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'multi'`.
   */
  password?: string
  /**
   * Max uncompressed ACEC bytes per geometry chunk for multi-file packages.
   * Defaults to {@link ACEX_DEFAULT_CHUNK_MAX_BYTES} (~2 MiB).
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'single'`.
   */
  maxChunkBytes?: number
  /**
   * When `true` (default), multi-file package chunks are gzip-compressed
   * (`.acex.gz` / `.osnap.gz`). When `false`, raw ACEC/ACEO bytes are written.
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'single'`.
   */
  compressChunks?: boolean
}

/**
 * Converts a mebibyte chunk-size setting to uncompressed byte budget.
 */
export function acexChunkSizeMiBToBytes(miB: number): number {
  return Math.floor(miB) * 1024 * 1024
}

/**
 * Converts an uncompressed byte budget to a mebibyte setting for prompts/UI.
 */
export function acexChunkSizeBytesToMiB(bytes: number): number {
  return Math.max(
    ACEX_MIN_CHUNK_SIZE_MIB,
    Math.round(bytes / (1024 * 1024))
  )
}

/**
 * Clamps a multi-file geometry chunk size to the supported mebibyte range.
 */
export function clampAcApHtmlChunkSizeMiB(miB: number): number {
  if (!Number.isFinite(miB)) {
    return ACEX_DEFAULT_CHUNK_SIZE_MIB
  }
  return Math.min(
    ACEX_MAX_CHUNK_SIZE_MIB,
    Math.max(ACEX_MIN_CHUNK_SIZE_MIB, Math.floor(miB))
  )
}

/**
 * Resolves export options with package defaults.
 */
export function resolveAcApHtmlExportOptions(
  options: AcApHtmlExportOptions = {}
): Required<
  Omit<AcApHtmlExportOptions, 'password' | 'expiryDays' | 'expiresAt'>
> & {
  expiryDays: AcApHtmlExpiryDays
  expiresAt: number | null
  password: string
} {
  const exportFormat: AcApHtmlExportFormat =
    options.exportFormat === 'multi' ? 'multi' : 'single'
  const maxChunkBytes =
    exportFormat === 'multi'
      ? acexChunkSizeMiBToBytes(
          clampAcApHtmlChunkSizeMiB(
            options.maxChunkBytes != null
              ? acexChunkSizeBytesToMiB(options.maxChunkBytes)
              : ACEX_DEFAULT_CHUNK_SIZE_MIB
          )
        )
      : ACEX_DEFAULT_CHUNK_MAX_BYTES
  return {
    exportFormat,
    exportInvisibleLayers: options.exportInvisibleLayers !== false,
    exportLayouts: options.exportLayouts !== false,
    initialView: options.initialView ?? 'fit',
    viewerMode: options.viewerMode ?? 'measure',
    expiryDays: exportFormat === 'multi' ? 'never' : (options.expiryDays ?? 'never'),
    expiresAt: exportFormat === 'multi' ? null : (options.expiresAt ?? null),
    password: exportFormat === 'multi' ? '' : (options.password?.trim() ?? ''),
    maxChunkBytes,
    compressChunks:
      exportFormat === 'multi' ? options.compressChunks !== false : true
  }
}

/**
 * Package-builder knobs derived from resolved multi-file export options.
 */
export function resolveAcApHtmlPackageBuildOptions(
  options: Pick<AcApHtmlExportOptions, 'maxChunkBytes' | 'compressChunks'>
): {
  maxChunkBytes: number
  maxBatchBytes: number
  maxOsnapChunkBytes: number
  compressChunks: boolean
} {
  const maxChunkBytes = options.maxChunkBytes ?? ACEX_DEFAULT_CHUNK_MAX_BYTES
  const compressChunks = options.compressChunks !== false
  const maxOsnapChunkBytes = Math.max(
    64 * 1024,
    Math.floor(
      (maxChunkBytes * ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES) /
        ACEX_DEFAULT_CHUNK_MAX_BYTES
    )
  )
  return {
    maxChunkBytes,
    // Keep batch pieces in sync with the chunk budget so oversized layers split
    // at the same threshold users configure for package chunks.
    maxBatchBytes: maxChunkBytes,
    maxOsnapChunkBytes,
    compressChunks
  }
}

/**
 * Captures the active 2D view as camera state understood by the offline viewer.
 */
export function captureAcApHtmlViewState(view: AcTrView2d): AcExViewState {
  const layoutView = view.activeLayoutView
  const center = layoutView.center
  const zoomMain = layoutView.trCamera.zoom
  const height = Math.max(layoutView.height, 1)
  const zoom = (zoomMain * (2 * HTML_VIEWER_CAMERA_FRUSTUM)) / height

  return {
    centerX: center.x,
    centerY: center.y,
    zoom
  }
}
