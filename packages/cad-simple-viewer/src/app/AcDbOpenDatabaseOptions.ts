import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'

import { AcEdOpenMode } from '../editor/view'

/**
 * Controls how the view is framed immediately after a document opens.
 */
export enum AcApOpenViewMode {
  /** Poll converted geometry and frame the full drawing (`zoomToFitDrawing`). */
  Extents = 'extents',
  /** Restore AutoCAD's saved view (layout limits, VPORT `*ACTIVE`, EXTMIN/EXTMAX). */
  Saved = 'saved'
}

/**
 * Options for opening a CAD database.
 *
 * This interface extends the base options from the data model but replaces
 * the `readOnly` property with a `mode` property that provides more granular
 * access control.
 *
 * Inherits {@link AcDbOpenDatabaseOptions.drawNoPlotLayers} from the data model.
 * {@link AcApDocManager} defaults it to `false` (web viewer semantics) when omitted.
 *
 * @example
 * ```typescript
 * const options: AcApOpenDatabaseOptions = {
 *   mode: AcEdOpenMode.Write,
 *   fontLoader: myFontLoader
 * };
 * ```
 */
export interface AcApOpenDatabaseOptions extends Omit<
  AcDbOpenDatabaseOptions,
  'readOnly'
> {
  /**
   * The access mode for opening the database.
   * Higher value modes are compatible with lower value modes.
   * - Read (0): Read-only access
   * - Review (4): Review access, compatible with Read
   * - Write (8): Full read/write access, compatible with Review and Read
   */
  mode?: AcEdOpenMode
  /**
   * Whether to render entities incrementally while a drawing is opening.
   *
   * When `true`, entity conversion is deferred across event-loop turns so
   * geometry appears progressively and the camera can reframe as batches
   * land. When `false` (default), conversion still runs asynchronously but the
   * canvas is not redrawn until every entity is converted; zoom-to-fit also
   * waits for conversion to finish.
   */
  progressiveRendering?: boolean

  /**
   * How to frame the view when the document finishes opening.
   *
   * When omitted, Read and Review modes use {@link AcApOpenViewMode.Extents};
   * Write mode uses {@link AcApOpenViewMode.Saved} (AutoCAD VPORT behavior).
   */
  openViewMode?: AcApOpenViewMode
}
