import type { AcTrView2d } from '@mlightcad/cad-simple-viewer'

import type { AcApHtmlExpiryDays } from './AcExHtmlAccess'
import type {
  AcExInitialViewMode,
  AcExViewerMode,
  AcExViewState
} from './AcExSnapshotTypes'

export type { AcApHtmlExpiryDays } from './AcExHtmlAccess'

/** Matches the offline HTML viewer orthographic half-height in world units. */
const HTML_VIEWER_CAMERA_FRUSTUM = 400

/**
 * HTML export packaging mode.
 *
 * - `single` — one self-contained `.html` with embedded snapshot (default).
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
   * payload is encrypted in the file.
   * Ignored when {@link AcApHtmlExportOptions.exportFormat} is `'multi'`.
   */
  password?: string
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
  return {
    exportFormat,
    exportInvisibleLayers: options.exportInvisibleLayers !== false,
    exportLayouts: options.exportLayouts !== false,
    initialView: options.initialView ?? 'fit',
    viewerMode: options.viewerMode ?? 'measure',
    expiryDays: exportFormat === 'multi' ? 'never' : (options.expiryDays ?? 'never'),
    expiresAt: exportFormat === 'multi' ? null : (options.expiresAt ?? null),
    password: exportFormat === 'multi' ? '' : (options.password?.trim() ?? '')
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
