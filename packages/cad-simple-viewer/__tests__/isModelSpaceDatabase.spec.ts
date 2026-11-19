import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbObjectId
} from '@mlightcad/data-model'

import { isModelSpaceDatabase } from '../src/editor/global/AcEdUiColor'
import { AcApUcsService } from '../src/service/AcApUcsService'

/**
 * Number of `*Model_Space` records in the block table, looked up without
 * the lazily-creating `blockTable.modelSpace` getter.
 */
function modelSpaceRecordCount(db: AcDbDatabase) {
  let count = 0
  for (const btr of db.tables.blockTable.newIterator()) {
    if (AcDbBlockTableRecord.isModelSapceName(btr.name)) count++
  }
  return count
}

/**
 * Puts `db` into the state `AcDbDatabase.read()` leaves it in while the file
 * is still being parsed: tables cleared, no current space yet.
 */
function clearLikeRead(db: AcDbDatabase) {
  ;(db as unknown as { clear(): void }).clear()
}

describe('isModelSpaceDatabase', () => {
  test('is true for a fresh drawing in model space', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    expect(isModelSpaceDatabase(db)).toBe(true)
  })

  test('is false when a paper layout is current', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    let paperId: AcDbObjectId | undefined
    for (const btr of db.tables.blockTable.newIterator()) {
      if (btr.isPaperSapce) paperId = btr.objectId
    }
    expect(paperId).toBeDefined()
    db.currentSpaceId = paperId!
    expect(isModelSpaceDatabase(db)).toBe(false)
  })

  // The render loop (UCS icon overlay) calls this every frame, including
  // while a DWG is being read. Lazily creating *Model_Space there plants a
  // placeholder record with a generated handle; the converter then reuses it
  // by name instead of adding the file's own *Model_Space, so the Model
  // layout ends up on an id that `currentSpaceId = id` rejects.
  test('does not create *Model_Space while the database is being read', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    clearLikeRead(db)
    expect(modelSpaceRecordCount(db)).toBe(0)

    expect(isModelSpaceDatabase(db)).toBe(true)
    AcApUcsService.getActiveFrame(db)

    expect(modelSpaceRecordCount(db)).toBe(0)
  })
})
