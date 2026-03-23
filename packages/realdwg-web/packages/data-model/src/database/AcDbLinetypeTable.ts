import { AcDbDatabase } from './AcDbDatabase'
import { AcDbLinetypeTableRecord } from './AcDbLinetypeTableRecord'
import { AcDbSymbolTable } from './AcDbSymbolTable'

/**
 * Symbol table for linetype table records.
 *
 * This class manages linetype table records which represent line types within a
 * drawing database. Line types define the pattern of dashes, dots, and spaces
 * used to display lines and curves in the drawing.
 *
 * @example
 * ```typescript
 * const linetypeTable = new AcDbLinetypeTable(database);
 * const linetype = linetypeTable.getAt('Continuous');
 * ```
 */
export class AcDbLinetypeTable extends AcDbSymbolTable<AcDbLinetypeTableRecord> {
  /**
   * Creates a new AcDbLinetypeTable instance.
   *
   * @param db - The database this linetype table belongs to
   *
   * @example
   * ```typescript
   * const linetypeTable = new AcDbLinetypeTable(database);
   * ```
   */
  constructor(db: AcDbDatabase) {
    super(db)
  }
}
