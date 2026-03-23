import { AcDbDatabase } from './AcDbDatabase'
import { AcDbRegAppTableRecord } from './AcDbRegAppTableRecord'
import { AcDbSymbolTable } from './AcDbSymbolTable'

/**
 * Symbol table the symbol table for AcDbRegAppTableRecords, which represent registered application
 * names for Extended Entity Data within objects that reside in the drawing database.
 */
export class AcDbRegAppTable extends AcDbSymbolTable<AcDbRegAppTableRecord> {
  /**
   * Creates a new AcDbRegAppTable instance.
   *
   * @param db - The database this table belongs to
   */
  constructor(db: AcDbDatabase) {
    super(db)
  }
}
