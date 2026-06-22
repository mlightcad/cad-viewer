import { AcDbOpenMode } from '@mlightcad/data-model'

import { eventBus } from '../src/editor/global/eventBus'
import {
  acapNotifyUndoStackChanged,
  acapOpenEntityForRead,
  acapOpenEntityForWrite,
  acapRunDatabaseEdit
} from '../src/util/AcApDatabaseEdit'

jest.mock('../src/editor/global/eventBus', () => ({
  eventBus: {
    emit: jest.fn()
  }
}))

function createDatabase(options?: {
  isRecording?: boolean
  transactionEntity?: unknown
  fallbackEntity?: unknown
}) {
  const transaction = {
    getObject: jest.fn((_id: string, mode: AcDbOpenMode) => {
      if (options?.transactionEntity && mode === AcDbOpenMode.kForWrite) {
        return options.transactionEntity
      }
      if (options?.transactionEntity && mode === AcDbOpenMode.kForRead) {
        return options.transactionEntity
      }
      return undefined
    })
  }

  return {
    getObjectById: jest.fn(() => options?.fallbackEntity),
    transactionManager: {
      isRecording: jest.fn(() => options?.isRecording ?? false),
      currentTransaction: jest.fn(() =>
        options?.transactionEntity || options?.isRecording ? transaction : null
      ),
      runUndoable: jest.fn((_label: string, fn: () => void) => {
        fn()
      })
    }
  }
}

describe('AcApDatabaseEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('acapNotifyUndoStackChanged emits undo-stack-changed', () => {
    acapNotifyUndoStackChanged()
    expect(eventBus.emit).toHaveBeenCalledWith('undo-stack-changed', {})
  })

  test('acapOpenEntityForWrite prefers the active transaction', () => {
    const entity = { objectId: 'line-1' }
    const db = createDatabase({ transactionEntity: entity })

    expect(acapOpenEntityForWrite(db as never, 'line-1')).toBe(entity)
    expect(db.getObjectById).not.toHaveBeenCalled()
  })

  test('acapOpenEntityForRead opens with kForRead through the active transaction', () => {
    const entity = { objectId: 'line-1' }
    const db = createDatabase({ transactionEntity: entity })
    const transaction = db.transactionManager.currentTransaction()

    expect(acapOpenEntityForRead(db as never, 'line-1')).toBe(entity)
    expect(transaction?.getObject).toHaveBeenCalledWith(
      'line-1',
      AcDbOpenMode.kForRead
    )
  })

  test('acapOpenEntityForWrite falls back to database lookup', () => {
    const entity = { objectId: 'line-1' }
    const db = createDatabase({ fallbackEntity: entity })

    expect(acapOpenEntityForWrite(db as never, 'line-1')).toBe(entity)
    expect(db.getObjectById).toHaveBeenCalled()
  })

  test('acapRunDatabaseEdit skips nested undo marks while recording', () => {
    const db = createDatabase({ isRecording: true })
    const fn = jest.fn()

    acapRunDatabaseEdit(db as never, 'Color', fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(db.transactionManager.runUndoable).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('acapRunDatabaseEdit creates an undo mark and notifies listeners', () => {
    const db = createDatabase({ isRecording: false })
    const fn = jest.fn()

    acapRunDatabaseEdit(db as never, 'Color', fn)

    expect(db.transactionManager.runUndoable).toHaveBeenCalledWith(
      'Color',
      expect.any(Function)
    )
    expect(fn).toHaveBeenCalledTimes(1)
    expect(eventBus.emit).toHaveBeenCalledWith('undo-stack-changed', {})
  })
})
