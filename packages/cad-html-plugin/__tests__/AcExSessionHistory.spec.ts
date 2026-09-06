/**
 * Unit tests for {@link AcExSessionHistory}.
 */

import {
  AcExSessionHistory,
  createAcExSessionHistory
} from '../src/AcExSessionHistory'

describe('AcExSessionHistory', () => {
  it('records markup edits and undoes/redoes chronologically with measure', () => {
    const history = createAcExSessionHistory()
    let markups = [{ id: 'a' }]
    let measures = [{ id: 'm1' }]

    history.attachMarkup({
      snapshot: () => structuredClone(markups),
      restore: next => {
        markups = structuredClone(next)
      }
    })
    history.attachMeasure({
      snapshot: () => structuredClone(measures),
      restore: next => {
        measures = structuredClone(next)
      }
    })

    history.runMarkup('add', () => {
      markups = [...markups, { id: 'b' }]
    })
    history.runMeasure('add', () => {
      measures = [...measures, { id: 'm2' }]
    })

    expect(history.canUndo()).toBe(true)
    expect(history.undo()).toBe('measure')
    expect(measures).toEqual([{ id: 'm1' }])
    expect(markups).toEqual([{ id: 'a' }, { id: 'b' }])

    expect(history.undo()).toBe('markup')
    expect(markups).toEqual([{ id: 'a' }])

    expect(history.redo()).toBe('markup')
    expect(markups).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(history.redo()).toBe('measure')
    expect(measures).toEqual([{ id: 'm1' }, { id: 'm2' }])
  })

  it('ignores no-op mutations', () => {
    const history = new AcExSessionHistory()
    const records = [{ id: 'a' }]
    history.attachMarkup({
      snapshot: () => structuredClone(records),
      restore: () => undefined
    })
    history.runMarkup('noop', () => undefined)
    expect(history.canUndo()).toBe(false)
  })

  it('captures in-place markup edits', () => {
    const history = createAcExSessionHistory()
    let markups = [{ id: 'a', x: 0 }]
    history.attachMarkup({
      snapshot: () => structuredClone(markups),
      restore: next => {
        markups = structuredClone(next)
      }
    })
    history.beginMarkupCapture()
    markups = [{ id: 'a', x: 10 }]
    history.commitMarkupCapture('move')
    expect(history.canUndo()).toBe(true)
    history.undo()
    expect(markups).toEqual([{ id: 'a', x: 0 }])
  })
})
