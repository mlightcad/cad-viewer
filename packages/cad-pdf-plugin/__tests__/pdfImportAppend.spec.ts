import {
  AcDbDatabase,
  AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import { acapPdfAppendEntities } from '../src/pdfImportAppend'

function createDb() {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function createLines(count: number) {
  const lines: AcDbLine[] = []
  for (let i = 0; i < count; i++) {
    lines.push(new AcDbLine(new AcGePoint3d(i, 0, 0), new AcGePoint3d(i, 1, 0)))
  }
  return lines
}

function modelSpaceCount(db: AcDbDatabase) {
  return [...db.tables.blockTable.modelSpace.newIterator()].length
}

/** Records the size of every `entityAppended` notification. */
function trackAppendBatches(db: AcDbDatabase) {
  const sizes: number[] = []
  db.events.entityAppended.addEventListener(args => {
    const entity = args.entity as AcDbEntity | AcDbEntity[]
    sizes.push(Array.isArray(entity) ? entity.length : 1)
  })
  return sizes
}

describe('acapPdfAppendEntities', () => {
  it('commits large imports in chunks inside one undo record', () => {
    const db = createDb()
    const before = modelSpaceCount(db)
    const tm = db.transactionManager
    const sizes = trackAppendBatches(db)

    // Same setup as AcEdCommand.trigger for an undoable command.
    tm.startUndoMark('PDFIMPORT')
    tm.startTransaction()
    acapPdfAppendEntities(
      db.tables.blockTable.modelSpace,
      createLines(2500),
      1000
    )
    expect(tm.hasTransaction()).toBe(true)
    tm.commitTransaction()
    tm.endUndoMark()

    expect(modelSpaceCount(db)).toBe(before + 2500)
    // One giant commit sent every entity in a single event, which overflowed
    // `push(...entities)` in the view for page-sized PDFs.
    expect(sizes).toEqual([1000, 1000, 500])

    expect(tm.undo()).toBe(true)
    expect(modelSpaceCount(db)).toBe(before)
    expect(tm.undo()).toBe(false)
  })

  it('appends in chunks when no transaction is active', () => {
    const db = createDb()
    const before = modelSpaceCount(db)
    const sizes = trackAppendBatches(db)

    acapPdfAppendEntities(
      db.tables.blockTable.modelSpace,
      createLines(1200),
      500
    )

    expect(db.transactionManager.hasTransaction()).toBe(false)
    expect(modelSpaceCount(db)).toBe(before + 1200)
    expect(sizes).toEqual([500, 500, 200])
  })
})
