import type { AcDbDatabase } from '@mlightcad/data-model'

import {
  bindOverlayHistory,
  getMarkupHistory,
  getSessionUndo
} from '../src/command/markup/AcApMarkupHistory'

function mockDb(options: {
  canUndo?: boolean
  undo?: boolean
  canRedo?: boolean
  redo?: boolean
}): AcDbDatabase {
  return {
    transactionManager: {
      canUndo: () => options.canUndo ?? false,
      undo: () => options.undo ?? false,
      canRedo: () => options.canRedo ?? false,
      redo: () => options.redo ?? false
    }
  } as unknown as AcDbDatabase
}

describe('AcApSessionUndo fallback', () => {
  beforeEach(() => {
    getMarkupHistory().clear()
    getSessionUndo().clear()
    bindOverlayHistory(undefined)
    jest.restoreAllMocks()
  })

  it('returns false when leftover markup undo fails', () => {
    jest.spyOn(getMarkupHistory(), 'undo').mockReturnValue(false)
    expect(getSessionUndo().undo(mockDb({ canUndo: true, undo: false }))).toBe(
      false
    )
  })

  it('returns false when leftover db undo reports canUndo but undo fails', () => {
    expect(getSessionUndo().undo(mockDb({ canUndo: true, undo: false }))).toBe(
      false
    )
  })

  it('returns false when leftover markup redo fails', () => {
    jest.spyOn(getMarkupHistory(), 'redo').mockReturnValue(false)
    expect(getSessionUndo().redo(mockDb({ canRedo: true, redo: false }))).toBe(
      false
    )
  })

  it('returns false when leftover db redo reports canRedo but redo fails', () => {
    expect(getSessionUndo().redo(mockDb({ canRedo: true, redo: false }))).toBe(
      false
    )
  })

  it('returns db when leftover db undo succeeds', () => {
    expect(getSessionUndo().undo(mockDb({ canUndo: true, undo: true }))).toBe(
      'db'
    )
  })

  it('returns overlay when leftover overlay undo succeeds', () => {
    bindOverlayHistory({
      canUndo: () => true,
      canRedo: () => false,
      undo: () => true,
      redo: () => false,
      clearRedo: () => {},
      clear: () => {}
    })
    expect(getSessionUndo().undo(mockDb({}))).toBe('overlay')
  })

  it('returns false when leftover overlay undo fails', () => {
    bindOverlayHistory({
      canUndo: () => true,
      canRedo: () => false,
      undo: () => false,
      redo: () => false,
      clearRedo: () => {},
      clear: () => {}
    })
    expect(getSessionUndo().undo(mockDb({ canUndo: true, undo: false }))).toBe(
      false
    )
  })
})
