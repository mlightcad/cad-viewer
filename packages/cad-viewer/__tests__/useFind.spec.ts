const mockSetCurrentLayout = jest.fn()

jest.mock('@mlightcad/data-model', () => ({
  AcGePoint2d: class {
    constructor(
      public x: number,
      public y: number
    ) {}
  },
  AcGeBox2d: class {
    constructor(
      public min: { x: number; y: number },
      public max: { x: number; y: number }
    ) {}
  },
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: (id: string) => mockSetCurrentLayout(id)
    }
  })
}))

// Use the real search + navigation sources; only the viewer bundle is stubbed.
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  ...jest.requireActual('../../cad-simple-viewer/src/find'),
  ...jest.requireActual('../../cad-simple-viewer/src/find/AcApFindNavigator')
}))

import { useFind } from '../src/composable/useFind'

type Ent = Record<string, unknown>

const text = (id: string, textString: string, x = 0): Ent => ({
  objectId: id,
  dxfTypeName: 'TEXT',
  textString,
  layer: 'NOTES',
  position: { x, y: 0 },
  geometricExtents: { min: { x, y: 0 }, max: { x: x + 4, y: 1 } }
})

const layouts = [
  { layoutName: 'Model', tabOrder: 0, blockTableRecordId: 'btr-model' },
  { layoutName: 'Planta', tabOrder: 1, blockTableRecordId: 'btr-planta' }
]
const layoutEntities: Record<string, Ent[]> = {
  'btr-model': [text('m1', 'Sala Técnica 01', 10)],
  'btr-planta': [text('p1', 'Legenda: sala técnica 01', 30)]
}

const selection = { clear: jest.fn(), add: jest.fn() }
const zoomTo = jest.fn()
let hasDocument = true
const view = {
  activeLayoutBtrId: 'btr-model',
  zoomTo: (...args: unknown[]) => zoomTo(...args),
  selectionSet: selection,
  isLayoutInitialized: () => false,
  markLayoutAsInitialized: jest.fn(),
  waitUntilIdle: () => Promise.resolve(true)
}
const editor = {
  get curView() {
    return hasDocument ? view : undefined
  },
  get curDocument() {
    return hasDocument
      ? {
          database: {
            objects: { layout: { newIterator: () => layouts } },
            tables: {
              layerTable: { getAt: () => undefined },
              blockTable: {
                getIdAt: (id: string) => ({
                  newIterator: () => layoutEntities[id],
                  getIdAt: (entityId: string) =>
                    layoutEntities[id].find(e => e.objectId === entityId)
                })
              }
            }
          }
        }
      : undefined
  }
}

const create = () => useFind(editor as never)

describe('useFind', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasDocument = true
    view.activeLayoutBtrId = 'btr-model'
    mockSetCurrentLayout.mockImplementation((id: string) => {
      view.activeLayoutBtrId = id
      return true
    })
  })

  it('does not search until asked and starts in the whole-drawing scope', () => {
    const find = create()
    find.query.value = 'sala'
    expect(find.state.value).toBe('idle')
    expect(find.hits.value).toEqual([])
    expect(find.currentLayoutOnly.value).toBe(false)
    expect(find.scope.value).toBe('drawing')
  })

  it('searches every layout by default and tags hits with their layout', () => {
    const find = create()
    find.query.value = 'SALA'
    find.search()
    expect(find.state.value).toBe('done')
    expect(
      find.hits.value.map(h => [h.layoutName, h.layoutId, h.entityId])
    ).toEqual([
      ['Model', 'btr-model', 'm1'],
      ['Planta', 'btr-planta', 'p1']
    ])
    expect(find.layoutCount.value).toBe(2)
  })

  it('searches only the active layout when "current layout only" is set', () => {
    const find = create()
    find.query.value = 'sala'
    find.currentLayoutOnly.value = true
    find.search()
    expect(find.scope.value).toBe('layout')
    expect(find.hits.value.map(h => h.entityId)).toEqual(['m1'])

    view.activeLayoutBtrId = 'btr-planta'
    find.search()
    expect(find.hits.value.map(h => h.entityId)).toEqual(['p1'])
  })

  it('re-runs the last search when an option changes (refresh)', () => {
    const find = create()
    find.query.value = 'sala'
    find.refresh() // nothing searched yet
    expect(find.state.value).toBe('idle')
    find.search()
    expect(find.hits.value).toHaveLength(2)
    find.currentLayoutOnly.value = true
    find.refresh()
    expect(find.hits.value).toHaveLength(1)
    find.matchCase.value = true // "sala" does not match "Sala" case-sensitively
    find.refresh()
    expect(find.hits.value.map(h => h.entityId)).toEqual([])
  })

  it('reports a blank query as idle and a missing document', () => {
    const find = create()
    find.query.value = '  '
    find.search()
    expect(find.state.value).toBe('idle')
    hasDocument = false
    find.query.value = 'sala'
    find.search()
    expect(find.state.value).toBe('no-document')
  })

  it('navigates to a hit in the active layout without switching', async () => {
    const find = create()
    find.query.value = 'sala'
    find.search()
    await find.navigateTo(0)
    expect(mockSetCurrentLayout).not.toHaveBeenCalled()
    expect(find.activeIndex.value).toBe(0)
    expect(selection.add).toHaveBeenCalledWith('m1')
    expect(zoomTo).toHaveBeenCalledTimes(1)
  })

  it('activates the layout of a cross-layout hit, then zooms and selects it', async () => {
    const find = create()
    find.query.value = 'sala'
    find.search()
    await find.navigateTo(1)
    expect(mockSetCurrentLayout).toHaveBeenCalledWith('btr-planta')
    expect(view.activeLayoutBtrId).toBe('btr-planta')
    expect(selection.add).toHaveBeenCalledWith('p1')
    const [box] = zoomTo.mock.calls[0]
    expect(box.min.x).toBeLessThan(30)
    expect(box.max.x).toBeGreaterThan(34)
    expect(find.unavailableLayout.value).toBe('')
  })

  it('flags a layout that cannot be opened', async () => {
    const find = create()
    find.query.value = 'sala'
    find.search()
    mockSetCurrentLayout.mockImplementation(() => false)
    await find.navigateTo(1)
    expect(find.unavailableLayout.value).toBe('Planta')
    expect(selection.add).not.toHaveBeenCalled()
  })

  it('re-runs a current-layout search instead of navigating after a layout change', async () => {
    const find = create()
    find.query.value = 'sala'
    find.currentLayoutOnly.value = true
    find.search()
    view.activeLayoutBtrId = 'btr-planta'
    await find.navigateTo(0)
    expect(selection.add).not.toHaveBeenCalled()
    expect(find.hits.value.map(h => h.entityId)).toEqual(['p1'])
  })

  it('submit searches first, then steps forward and backward through hits', async () => {
    const find = create()
    find.query.value = 'sala'
    await find.submit()
    expect(selection.add).toHaveBeenLastCalledWith('m1')
    await find.submit()
    expect(view.activeLayoutBtrId).toBe('btr-planta')
    expect(selection.add).toHaveBeenLastCalledWith('p1')
    await find.submit() // wraps
    expect(selection.add).toHaveBeenLastCalledWith('m1')
    await find.submit(true) // backwards wraps
    expect(selection.add).toHaveBeenLastCalledWith('p1')
  })
})
