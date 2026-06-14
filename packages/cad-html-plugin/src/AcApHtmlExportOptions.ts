import type { AcTrView2d } from '@mlightcad/cad-simple-viewer'

import type { AcExInitialViewMode, AcExViewState } from './AcExSnapshotTypes'

/** Matches the offline HTML viewer orthographic half-height in world units. */
const HTML_VIEWER_CAMERA_FRUSTUM = 400

/**
 * User-configurable options for HTML export (`chtml` and CLI).
 */
export interface AcApHtmlExportOptions {
  /**
   * When `true`, off/frozen layers are converted and written into the snapshot.
   * Defaults to `true` for backward compatibility with pre-option HTML export.
   */
  exportInvisibleLayers?: boolean
  /**
   * Initial framing when the exported HTML is opened. Defaults to `'fit'`.
   */
  initialView?: AcExInitialViewMode
}

/**
 * Resolves export options with package defaults.
 */
export function resolveAcApHtmlExportOptions(
  options: AcApHtmlExportOptions = {}
): Required<AcApHtmlExportOptions> {
  return {
    exportInvisibleLayers: options.exportInvisibleLayers !== false,
    initialView: options.initialView ?? 'fit'
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
