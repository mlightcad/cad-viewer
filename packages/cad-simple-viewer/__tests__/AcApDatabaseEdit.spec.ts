import { AcDbDatabase } from '@mlightcad/data-model'

import { eventBus } from '../src/editor/global/eventBus'
import {
  acapNotifyUndoStackChanged,
  acapRunDatabaseEdit
} from '../src/util/AcApDatabaseEdit'

jest.mock('../src/editor/global/eventBus', () => ({
  eventBus: {
    emit: jest.fn()
  }
}))

function createDatabase(options?: { isRecording?: boolean }) {
  const db = new AcDbDatabase()

  db.transactionManager.isRecording = jest.fn(
    () => options?.isRecording ?? false
  ) as never
  db.transactionManager.runUndoable = jest.fn(
    (_label: string, fn: () => void) => {
      fn()
    }
  ) as never

  return db
}

describe('AcApDatabaseEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('acapNotifyUndoStackChanged emits undo-stack-changed', () => {
    acapNotifyUndoStackChanged()
    expect(eventBus.emit).toHaveBeenCalledWith('undo-stack-changed', {})
  })

  test('acapRunDatabaseEdit skips nested undo marks while recording', () => {
    const db = createDatabase({ isRecording: true })
    const fn = jest.fn()

    acapRunDatabaseEdit(db, 'Color', fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(db.transactionManager.runUndoable).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('acapRunDatabaseEdit creates an undo mark and notifies listeners', () => {
    const db = createDatabase({ isRecording: false })
    const fn = jest.fn()

    acapRunDatabaseEdit(db, 'Color', fn)

    expect(db.transactionManager.runUndoable).toHaveBeenCalledWith(
      'Color',
      expect.any(Function)
    )
    expect(fn).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledWith('undo-stack-changed', {})
  })
})
