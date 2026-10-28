import { AcDbDatabase, AcDbLine, AcGePoint3d } from '@mlightcad/data-model'

import {
  AcApMarkupHistory,
  AcApSessionUndo,
  getSessionUndo
} from '../src/command/markup/AcApMarkupHistory'
import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import { acapRunDatabaseEdit } from '../src/util/AcApDatabaseEdit'

acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: {
    forgetPublished() {}
  } as never,
  history: new AcApMarkupHistory(),
  sessionUndo: new AcApSessionUndo()
}))

/**
 * Builds the database edit that a draw command produces. Uses the application
 * helper so session undo bookkeeping is updated exactly like a real command.
 */
function createShape(db: AcDbDatabase, label: string, y: number) {
  acapRunDatabaseEdit(db, label, () => {
    db.tables.blockTable.modelSpace.appendEntity(
      new AcDbLine(new AcGePoint3d(0, y, 0), new AcGePoint3d(10, y, 0))
    )
  })
}

describe('AcApSessionUndo database redo', () => {
  it('restores both shapes across two consecutive redo operations', () => {
    const db = new AcDbDatabase()
    getSessionUndo().clear()

    const before = new Set(
      [...db.tables.blockTable.modelSpace.newIterator()].map(e => e.objectId)
    )

    createShape(db, 'Shape A', 0)
    createShape(db, 'Shape B', 10)
    expect(db.transactionManager.canUndo()).toBe(true)

    // Undo twice: both shapes disappear and two redo steps remain.
    expect(getSessionUndo().undo(db)).toBe('db')
    expect(getSessionUndo().undo(db)).toBe('db')
    expect(
      [...db.tables.blockTable.modelSpace.newIterator()].map(e => e.objectId)
    ).toEqual([...before])
    expect(getSessionUndo().canRedo(db)).toBe(true)

    // First redo: Shape A comes back and another redo must still be available.
    expect(getSessionUndo().redo(db)).toBe('db')
    expect(getSessionUndo().canRedo(db)).toBe(true)

    // Second redo: Shape B is restored as well.
    expect(getSessionUndo().redo(db)).toBe('db')
    expect(getSessionUndo().canRedo(db)).toBe(false)
    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(
      before.size + 2
    )
  })

  it('drops pending redo steps when a new shape is created', () => {
    const db = new AcDbDatabase()
    getSessionUndo().clear()

    createShape(db, 'Shape A', 0)
    createShape(db, 'Shape B', 10)

    expect(getSessionUndo().undo(db)).toBe('db')
    expect(getSessionUndo().canRedo(db)).toBe(true)

    createShape(db, 'Shape C', 20)

    expect(getSessionUndo().canRedo(db)).toBe(false)
  })
})
