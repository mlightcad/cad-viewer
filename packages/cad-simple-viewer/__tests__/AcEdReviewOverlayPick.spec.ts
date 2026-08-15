import { getMarkupStore } from '../src/command/markup/AcApMarkupStore'
import type { AcApMarkupRecord } from '../src/command/markup/AcApMarkupTypes'
import { trySelectReviewOverlay } from '../src/view/AcEdReviewOverlayPick'
import type { AcTrView2d } from '../src/view/AcTrView2d'

function lineRecord(): AcApMarkupRecord {
  return {
    id: 'line-1',
    type: 'line',
    layoutId: 'layout-a',
    style: { color: '#ff0000' },
    comment: '',
    status: 'open',
    author: 'alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    geometry: { type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
  }
}

function mockView(ht: {
  selectGroup: jest.Mock
  deselectGroup: jest.Mock
}): AcTrView2d {
  return {
    selectionBoxSize: 3,
    activeLayoutBtrId: 'layout-a',
    isDirty: false,
    isHtmlDirty: false,
    worldToScreen: (point: { x: number; y: number }) => point,
    htmlTransientManager: {
      getGroup: () => ({ id: 'line-1', visible: true }),
      groupsOnLayer: () => [],
      ...ht
    }
  } as unknown as AcTrView2d
}

describe('trySelectReviewOverlay', () => {
  beforeEach(() => {
    getMarkupStore().reset()
    getMarkupStore().upsert(lineRecord())
  })

  afterEach(() => {
    getMarkupStore().reset()
  })

  it('does not consume a miss, so CAD picking can proceed', () => {
    const selectGroup = jest.fn(() => true)
    const deselectGroup = jest.fn(() => true)
    const view = mockView({ selectGroup, deselectGroup })

    expect(trySelectReviewOverlay(view, 50, 40, 'add')).toBe(false)
    expect(selectGroup).not.toHaveBeenCalled()
    expect(deselectGroup).not.toHaveBeenCalled()
    expect(view.isDirty).toBe(false)
    expect(view.isHtmlDirty).toBe(false)
  })

  it('consumes an additive hit only when the overlay is newly selected', () => {
    const selectGroup = jest.fn(() => true)
    const view = mockView({ selectGroup, deselectGroup: jest.fn() })

    expect(trySelectReviewOverlay(view, 50, 0, 'add')).toBe(true)
    expect(selectGroup).toHaveBeenCalledWith('line-1', false)
    expect(view.isDirty).toBe(false)
    expect(view.isHtmlDirty).toBe(true)

    selectGroup.mockReturnValue(false)
    view.isHtmlDirty = false
    expect(trySelectReviewOverlay(view, 50, 0, 'add')).toBe(false)
    expect(view.isHtmlDirty).toBe(false)
  })

  it('lets Shift-remove fall through when the overlay was not selected', () => {
    const deselectGroup = jest.fn(() => false)
    const view = mockView({ selectGroup: jest.fn(), deselectGroup })

    expect(trySelectReviewOverlay(view, 50, 0, 'remove')).toBe(false)
    expect(deselectGroup).toHaveBeenCalledWith('line-1')
    expect(view.isDirty).toBe(false)
    expect(view.isHtmlDirty).toBe(false)
  })

  it('consumes Shift-remove when the overlay is deselected', () => {
    const deselectGroup = jest.fn(() => true)
    const view = mockView({ selectGroup: jest.fn(), deselectGroup })

    expect(trySelectReviewOverlay(view, 50, 0, 'remove')).toBe(true)
    expect(view.isDirty).toBe(false)
    expect(view.isHtmlDirty).toBe(true)
  })

  it('always consumes a replace click on a hit overlay', () => {
    const selectGroup = jest.fn(() => false)
    const view = mockView({ selectGroup, deselectGroup: jest.fn() })

    expect(trySelectReviewOverlay(view, 50, 0, 'replace')).toBe(true)
    expect(selectGroup).toHaveBeenCalledWith('line-1', true)
    expect(view.isDirty).toBe(false)
    expect(view.isHtmlDirty).toBe(true)
  })
})
