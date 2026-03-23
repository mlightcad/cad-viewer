import { AcDbDatabase } from './AcDbDatabase'
import { AcDbSymbolTable } from './AcDbSymbolTable'
import { AcDbViewportTableRecord } from './AcDbViewportTableRecord'

/**
 * Symbol table for viewport table records.
 *
 * This class manages viewport table records which represent viewport configurations
 * within AutoCAD. Viewports define how the drawing is displayed in different
 * areas of the screen or paper space, including zoom levels, pan positions,
 * and other display properties.
 *
 * @example
 * ```typescript
 * const viewportTable = new AcDbViewportTable(database);
 * const viewport = viewportTable.getAt('*Active');
 * ```
 */
export class AcDbViewportTable extends AcDbSymbolTable<AcDbViewportTableRecord> {
  /**
   * Creates a new AcDbViewportTable instance.
   *
   * @param db - The database this viewport table belongs to
   *
   * @example
   * ```typescript
   * const viewportTable = new AcDbViewportTable(database);
   * ```
   */
  constructor(db: AcDbDatabase) {
    super(db)
  }
}
