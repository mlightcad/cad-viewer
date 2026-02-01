import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'

import { AcEdOpenMode } from '../editor/view'

/**
 * Options for opening a CAD database.
 *
 * This interface extends the base options from the data model but replaces
 * the `readOnly` property with a `mode` property that provides more granular
 * access control.
 *
 * @example
 * ```typescript
 * const options: AcApOpenDatabaseOptions = {
 *   mode: AcEdOpenMode.Write,
 *   fontLoader: myFontLoader
 * };
 * ```
 */
export interface AcApOpenDatabaseOptions
  extends Omit<AcDbOpenDatabaseOptions, 'readOnly'> {
  /**
   * The access mode for opening the database.
   * Higher value modes are compatible with lower value modes.
   * - Read (0): Read-only access
   * - Review (4): Review access, compatible with Read
   * - Write (8): Full read/write access, compatible with Review and Read
   */
  mode?: AcEdOpenMode
}
