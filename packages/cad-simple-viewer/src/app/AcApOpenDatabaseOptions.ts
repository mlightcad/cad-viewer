import {
  AcCmColor,
  AcDbOpenDatabaseOptions
} from '@mlightcad/data-model'

import { AcEdOpenMode } from '../editor/view'

/**
 * Controls how the view is framed immediately after a document opens.
 */
export enum AcApOpenViewMode {
  /** Poll converted geometry and frame the full drawing (`zoomToFitDrawing`). */
  Extents = 'extents',
  /** Restore AutoCAD's saved view (layout limits or VPORT `*ACTIVE`). */
  Saved = 'saved'
}

/**
 * Open-time system-variable overrides.
 *
 * Extends {@link AcDbOpenDatabaseOptions.sysVars} so colour sysvars such as
 * `PAPERBKCOLOR` / `MODELBKCOLOR` can take an {@link AcCmColor} (for example
 * from {@link layoutBackgroundColorFromRgb}), not only number/boolean/string.
 */
export type AcApOpenSysVars = Record<
  string,
  number | boolean | string | AcCmColor
>

/**
 * Options for opening a CAD database.
 *
 * This interface extends the base options from the data model but replaces
 * the `readOnly` property with a `mode` property that provides more granular
 * access control.
 *
 * Inherits {@link AcDbOpenDatabaseOptions.drawNoPlotLayers} and
 * {@link AcDbOpenDatabaseOptions.circleSides} from the data model.
 * {@link AcApDocManager} defaults `drawNoPlotLayers` to `false`
 * (web viewer semantics) when omitted. When `circleSides` is omitted,
 * the data model uses draft quality (50).
 *
 * Use {@link sysVars} to override session/database system variables at open
 * time (for example `paperbkcolor` for the paper-space canvas background, or
 * `lwdisplay: false` to hide lineweights).
 *
 * Fonts are not loaded during database open. They are fetched on demand by
 * `@mlightcad/mtext-renderer` (`FontManager.lazyFontLoading`) while text is
 * drawn. Legacy open options `fontLoader` and `failOnFontLoadError` are no
 * longer part of this API (removed in data-model); if still passed at runtime
 * they are stripped with a warning in {@link AcApDocManager}.
 *
 * @example
 * ```typescript
 * import { layoutBackgroundColorFromRgb } from '@mlightcad/cad-simple-viewer'
 *
 * const options: AcApOpenDatabaseOptions = {
 *   mode: AcEdOpenMode.Write,
 *   sysVars: {
 *     lwdisplay: false,
 *     paperbkcolor: layoutBackgroundColorFromRgb(0x000000)
 *   }
 * }
 * ```
 */
export interface AcApOpenDatabaseOptions extends Omit<
  AcDbOpenDatabaseOptions,
  'readOnly' | 'sysVars'
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
   * Whether opening a drawing is progressive.
   *
   * This flag controls both stages of progressive rendering. The deprecated
   * {@link waitForTextGeometry} option used to control only the second stage
   * and is ignored.
   *
   * - `false` (default): conversion still runs asynchronously, but the canvas
   *   is not redrawn until every entity is converted, and the overlay stays
   *   up until convert **and** deferred glyph jobs are idle
   *   ({@link AcTrView2d.isProcessingEntities}). Zoom-to-fit also waits for
   *   conversion to finish.
   * - `true`: entity conversion yields across event-loop turns so geometry
   *   paints as batches land and the camera can reframe. The open-file
   *   overlay ("Rendering drawing ...") hides once entity convert finishes
   *   ({@link AcTrView2d.isConvertingEntities}). Deferred text / INSERT glyph
   *   geometry may still finalize afterward, and pan/zoom are already enabled.
   *
   * Export / CLI completeness is not controlled by this flag. Callers that
   * need fully drawable text (HTML/PDF/PNG, headless scripts) still wait via
   * {@link AcTrView2d.waitUntilIdle} /
   * {@link AcTrView2d.ensureEntitiesConvertedForExport}.
   */
  progressiveRendering?: boolean

  /**
   * @deprecated Ignored. Both stages of progressive rendering — mid-open
   * paints during entity convert, and whether the open overlay waits for
   * deferred text / INSERT glyph geometry — are controlled by
   * {@link progressiveRendering}.
   *
   * This option used to control only the text stage (`true` kept
   * "Rendering drawing ..." up until glyphs finished; `false` hid it when
   * entity convert finished) and was easy to confuse with
   * `progressiveRendering`. {@link AcApDocManager} strips it with a warning.
   */
  waitForTextGeometry?: boolean

  /**
   * How to frame the view when the document finishes opening.
   *
   * When omitted, Read and Review modes use {@link AcApOpenViewMode.Extents};
   * Write mode uses {@link AcApOpenViewMode.Saved} (AutoCAD VPORT behavior).
   */
  openViewMode?: AcApOpenViewMode

  /**
   * System variables to override when the database opens.
   *
   * Keys are system variable names (case-insensitive). Colour sysvars such as
   * `PAPERBKCOLOR` accept {@link AcCmColor}; see {@link AcApOpenSysVars}.
   */
  sysVars?: AcApOpenSysVars
}
