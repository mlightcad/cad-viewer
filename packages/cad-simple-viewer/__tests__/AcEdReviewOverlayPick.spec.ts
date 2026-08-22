import { AcGeBox2d } from '@mlightcad/data-model'

import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { AcApMarkupStore, getMarkupStore } from '../src/command/markup/AcApMarkupStore'
import type { AcApMarkupRecord } from '../src/command/markup/AcApMarkupTypes'
import {
  collectReviewOverlayIdsByBox,
  trySelectReviewOverlay,
  trySelectReviewOverlaysByBox
} from '../src/view/AcEdReviewOverlayPick'
import type { AcTrView2d } from '../src/view/AcTrView2d'

acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: {} as never,
  history: {} as never,
  sessionUndo: {} as never
}))

function lineRecord(id = 'line-1'): AcApMarkupRecord {
  return {
    id,
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
  deselectAll?: jest.Mock
  hasSelection?: jest.Mock
}): AcTrView2d {
  return {
    selectionBoxSize: 3,
    activeLayoutBtrId: 'layout-a',
    isDirty: false,
    isHtmlDirty: false,
    worldToScreen: (point: { x: number; y: number }) => point,
    htmlTransientManager: {
      getGroup: (id: string) => ({ id, visible: true }),
      groupsOnLayer: () => [],
      deselectAll: ht.deselectAll ?? jest.fn(),
      hasSelection: ht.hasSelection ?? jest.fn(() => false),
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

describe('trySelectReviewOverlaysByBox', () => {
  beforeEach(() => {
    getMarkupStore().reset()
    getMarkupStore().upsert(lineRecord())
    getMarkupStore().upsert(lineRecord('line-2'))
    // Move line-2 far away
    getMarkupStore().updateGeometry('line-2', {
      type: 'line',
      start: { x: 500, y: 500 },
      end: { x: 600, y: 500 }
    })
  })

  afterEach(() => {
    getMarkupStore().reset()
  })

  it('collects overlays fully inside a window box', () => {
    const view = mockView({
      selectGroup: jest.fn(),
      deselectGroup: jest.fn()
    })
    const box = new AcGeBox2d()
      .expandByPoint({ x: -10, y: -10 })
      .expandByPoint({ x: 110, y: 10 })
    expect(collectReviewOverlayIdsByBox(view, box, 'window')).toEqual([
      'line-1'
    ])
  })

  it('collects overlays that intersect a crossing box', () => {
    const view = mockView({
      selectGroup: jest.fn(),
      deselectGroup: jest.fn()
    })
    const box = new AcGeBox2d()
      .expandByPoint({ x: 50, y: -5 })
      .expandByPoint({ x: 60, y: 5 })
    expect(collectReviewOverlayIdsByBox(view, box, 'crossing')).toEqual([
      'line-1'
    ])
    expect(collectReviewOverlayIdsByBox(view, box, 'window')).toEqual([])
  })

  it('selects matching overlays additively on box select', () => {
    const selectGroup = jest.fn(() => true)
    const view = mockView({ selectGroup, deselectGroup: jest.fn() })
    const box = new AcGeBox2d()
      .expandByPoint({ x: -10, y: -10 })
      .expandByPoint({ x: 110, y: 10 })

    expect(trySelectReviewOverlaysByBox(view, box, 'window', 'add')).toBe(true)
    expect(selectGroup).toHaveBeenCalledWith('line-1', false)
    expect(view.isHtmlDirty).toBe(true)
  })

  it('clears prior overlay selection on replace even when the box is empty', () => {
    const selectGroup = jest.fn(() => true)
    const deselectAll = jest.fn()
    const view = mockView({
      selectGroup,
      deselectGroup: jest.fn(),
      deselectAll,
      hasSelection: jest.fn(() => true)
    })
    const box = new AcGeBox2d()
      .expandByPoint({ x: 1000, y: 1000 })
      .expandByPoint({ x: 1100, y: 1100 })

    expect(trySelectReviewOverlaysByBox(view, box, 'window', 'replace')).toBe(
      true
    )
    expect(deselectAll).toHaveBeenCalled()
    expect(selectGroup).not.toHaveBeenCalled()
    expect(view.isHtmlDirty).toBe(true)
  })
})
