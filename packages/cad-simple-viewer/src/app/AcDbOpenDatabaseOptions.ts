import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'

import { AcEdOpenMode } from '../editor/view'

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
   * When `true` (default), entity conversion is deferred across event-loop
   * turns so geometry appears progressively and the camera can reframe as
   * batches land. When `false`, conversion still runs asynchronously but the
   * canvas is not redrawn until every entity is converted; zoom-to-fit also
   * waits for conversion to finish.
   */
  progressiveRendering?: boolean
}
