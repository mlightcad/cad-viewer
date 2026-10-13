/** @jest-environment jsdom */

type Ent = Record<string, unknown>

const mockSelection = { clear: jest.fn(), add: jest.fn() }
const mockZoomTo = jest.fn()
const mockSwitchLayout = jest.fn((id: string) => {
  mockView.activeLayoutBtrId = id
})
const mockMarkInitialized = jest.fn()
const mockView = {
  activeLayoutBtrId: 'layout-a',
  zoomTo: (...args: unknown[]) => mockZoomTo(...args),
  selectionSet: mockSelection,
  isLayoutInitialized: () => false,
  markLayoutAsInitialized: (id: string) => mockMarkInitialized(id),
  waitUntilIdle: () => Promise.resolve(true)
}
let entities: Ent[] = []
/** Per-layout entities; layouts not listed here fall back to `entities`. */
let layoutEntities: Record<string, Ent[]> = {}
/** Layout objects exposed by the database (empty: no layout table). */
let layouts: Array<{ layoutName: string; tabOrder: number; id: string }> = []
const mockDoc = {
  database: {
    objects: {
      layout: {
        newIterator: () =>
          layouts.map(l => ({
            layoutName: l.layoutName,
            tabOrder: l.tabOrder,
            blockTableRecordId: l.id
          }))
      }
    },
    tables: {
      layerTable: { getAt: () => undefined },
      blockTable: {
        getIdAt: (id: string) => {
          const list = layoutEntities[id] ?? entities
          return {
            newIterator: () => list,
            getIdAt: (entityId: string) =>
              list.find(e => e.objectId === entityId)
          }
        }
      }
    }
  }
}
let hasDocument = true

jest.mock('@mlightcad/cad-simple-viewer', () => {
  const { createCadSimpleViewerMock } = require('./helpers/mockCadSimpleViewer')
  const { acapNavigateToFindHit } = jest.requireActual(
    '../../cad-simple-viewer/src/find/AcApFindNavigator'
  )
  return createCadSimpleViewerMock({
    acapNavigateToFindHit,
    AcApDocManager: {
      instance: {
        get curView() {
          return hasDocument ? mockView : undefined
        },
        get curDocument() {
          return hasDocument ? mockDoc : undefined
        }
      }
    },
    AcApI18n: {
      t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
      mergeLocaleMessage: jest.fn()
    }
  })
})

// The real data-model bundle needs TextDecoder, which jsdom does not provide.
jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: (id: string) => mockSwitchLayout(id)
    }
  }),
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
  }
}))

import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import { AcUiI18n, acuiRegisterSimpleUiI18n } from '../src/i18n'
import { AcUiFindPaletteView } from '../src/ui/AcUiFindPaletteView'

function text(id: string, textString: string, x: number): Ent {
  return {
    objectId: id,
    dxfTypeName: 'TEXT',
    textString,
    layer: 'NOTES',
    position: { x, y: 0 },
    geometricExtents: { min: { x, y: 0 }, max: { x: x + 4, y: 1 } }
  }
}

function createView() {
  acuiRegisterSimpleUiI18n()
  const view = new AcUiFindPaletteView({
    editor: AcApDocManager.instance,
    i18n: new AcUiI18n()
  })
  document.body.appendChild(view.element)
  return view
}

const rows = (view: AcUiFindPaletteView) =>
  Array.from(view.element.querySelectorAll<HTMLElement>('.ml-ex-ui-find-row'))
const status = (view: AcUiFindPaletteView) =>
  view.element.querySelector('.ml-ex-ui-find-status')?.textContent

describe('AcUiFindPaletteView', () => {
  beforeEach(() => {
    entities = [text('t1', 'Alpha beta', 10), text('t2', 'beta GAMMA', 20)]
    layoutEntities = {}
    layouts = []
    hasDocument = true
    mockView.activeLayoutBtrId = 'layout-a'
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
  })

  it('shows a hint before any search and does not scan on construction', () => {
    const view = createView()
    expect(status(view)).toBe('findPalette.hint')
    expect(rows(view)).toHaveLength(0)
    view.destroy()
  })

  it('lists matches with type, layer and location labels', () => {
    const view = createView()
    view.search('BETA')
    expect(rows(view)).toHaveLength(2)
    expect(
      rows(view)[0].querySelector('.ml-ex-ui-find-meta')?.textContent
    ).toBe('findPalette.kind.text · NOTES · (10, 0)')
    expect(status(view)).toBe('findPalette.count')
    view.destroy()
  })

  it('reports when nothing matches', () => {
    const view = createView()
    view.search('zzz')
    expect(rows(view)).toHaveLength(0)
    expect(status(view)).toBe('findPalette.noResults')
    view.destroy()
  })

  it('reports a missing document instead of throwing', () => {
    hasDocument = false
    const view = createView()
    view.search('x')
    expect(status(view)).toBe('findPalette.noDocument')
    view.destroy()
  })

  it('zooms to the hit and selects only that entity on row click', () => {
    const view = createView()
    view.search('gamma')
    rows(view)[0].click()

    expect(mockZoomTo).toHaveBeenCalledTimes(1)
    const [box] = mockZoomTo.mock.calls[0]
    expect(box.min.x).toBeLessThan(20)
    expect(box.max.x).toBeGreaterThan(24)
    expect(mockSelection.clear).toHaveBeenCalledTimes(1)
    expect(mockSelection.add).toHaveBeenCalledWith('t2')
    expect(rows(view)[0].classList.contains('is-selected')).toBe(true)
    view.destroy()
  })

  it('steps through results with Enter and Shift+Enter', () => {
    const view = createView()
    const input = view.element.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement
    input.value = 'beta'
    const press = (shiftKey = false) =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey, bubbles: true })
      )

    press() // first Enter searches and goes to the first hit
    expect(mockSelection.add).toHaveBeenLastCalledWith('t1')
    press() // next
    expect(mockSelection.add).toHaveBeenLastCalledWith('t2')
    press() // wraps
    expect(mockSelection.add).toHaveBeenLastCalledWith('t1')
    press(true) // previous wraps backwards
    expect(mockSelection.add).toHaveBeenLastCalledWith('t2')
    view.destroy()
  })

  it('re-runs the search instead of navigating when the layout changed (current layout only)', () => {
    const view = createView()
    view.search('beta', false, 'layout')
    mockView.activeLayoutBtrId = 'layout-b'
    entities = [text('t9', 'beta only here', 0)]
    rows(view)[0].click()

    expect(mockZoomTo).not.toHaveBeenCalled()
    expect(mockSelection.add).not.toHaveBeenCalled()
    expect(rows(view)).toHaveLength(1)
    view.destroy()
  })

  it('does not touch the view for blank queries', () => {
    const view = createView()
    view.search('   ')
    expect(status(view)).toBe('findPalette.hint')
    expect(mockSelection.clear).not.toHaveBeenCalled()
    view.destroy()
  })

  describe('whole drawing (default) vs current layout only', () => {
    const flush = () => new Promise(resolve => setTimeout(resolve, 0))
    const layoutOnly = (view: AcUiFindPaletteView) =>
      view.element.querySelector<HTMLInputElement>(
        'input[data-find-scope="layout"]'
      )!

    beforeEach(() => {
      layouts = [
        { layoutName: 'Model', tabOrder: 0, id: 'layout-a' },
        { layoutName: 'Planta', tabOrder: 1, id: 'layout-b' },
        { layoutName: 'Alçados', tabOrder: 2, id: 'layout-c' }
      ]
      layoutEntities = {
        'layout-a': [text('a1', 'Sala Técnica 01', 10)],
        'layout-b': [text('b1', 'Legenda: sala técnica 01', 30)],
        'layout-c': [text('c1', 'Alçado Norte', 50), text('c2', 'sala', 60)]
      }
    })

    it('searches every layout by default and names the layout of each hit', () => {
      const view = createView()
      expect(layoutOnly(view).checked).toBe(false)
      view.search('sala')

      expect(view.hits.map(h => [h.layoutName, h.entityId])).toEqual([
        ['Model', 'a1'],
        ['Planta', 'b1'],
        ['Alçados', 'c2']
      ])
      const badges = Array.from(
        view.element.querySelectorAll('.ml-ex-ui-find-layout')
      ).map(el => el.textContent)
      expect(badges).toEqual(['Model', 'Planta', 'Alçados'])
      expect(status(view)).toBe('findPalette.countLayouts')
      view.destroy()
    })

    it('finds accented text of a layout that is not the active one', () => {
      const view = createView()
      view.search('alcado')
      expect(view.hits.map(h => [h.layoutName, h.entityId])).toEqual([
        ['Alçados', 'c1']
      ])
      view.destroy()
    })

    it('limits the search to the active layout when "Current layout only" is checked', () => {
      const view = createView()
      view.search('sala')
      expect(view.hits).toHaveLength(3)

      const toggle = layoutOnly(view)
      toggle.checked = true
      toggle.dispatchEvent(new Event('change'))

      expect(view.scope).toBe('layout')
      expect(view.hits.map(h => [h.layoutName, h.entityId])).toEqual([
        ['Model', 'a1']
      ])

      toggle.checked = false
      toggle.dispatchEvent(new Event('change'))
      expect(view.hits).toHaveLength(3)
      view.destroy()
    })

    it('shows a scope-specific hint before the first search', () => {
      const view = createView()
      expect(status(view)).toBe('findPalette.hint')
      const toggle = layoutOnly(view)
      toggle.checked = true
      toggle.dispatchEvent(new Event('change'))
      expect(status(view)).toBe('findPalette.hintLayout')
      view.destroy()
    })

    it('activates the layout of a cross-layout hit, then zooms and selects it', async () => {
      const view = createView()
      view.search('sala')
      rows(view)[2].click()

      // Layout is switched immediately, zoom/select wait for the scene.
      expect(mockSwitchLayout).toHaveBeenCalledWith('layout-c')
      expect(mockMarkInitialized).toHaveBeenCalledWith('layout-c')
      expect(mockZoomTo).not.toHaveBeenCalled()
      await flush()

      expect(mockView.activeLayoutBtrId).toBe('layout-c')
      expect(mockZoomTo).toHaveBeenCalledTimes(1)
      const [box] = mockZoomTo.mock.calls[0]
      expect(box.min.x).toBeLessThan(60)
      expect(box.max.x).toBeGreaterThan(64)
      expect(mockSelection.add).toHaveBeenCalledWith('c2')
      expect(rows(view)[2].classList.contains('is-selected')).toBe(true)
      view.destroy()
    })

    it('does not switch layout for a hit in the active layout', () => {
      const view = createView()
      view.search('sala')
      rows(view)[0].click()
      expect(mockSwitchLayout).not.toHaveBeenCalled()
      expect(mockSelection.add).toHaveBeenCalledWith('a1')
      view.destroy()
    })

    it('keeps drawing-wide results valid after the layout changes', async () => {
      const view = createView()
      view.search('sala')
      mockView.activeLayoutBtrId = 'layout-b'
      rows(view)[0].click() // Model hit while Planta is active
      expect(mockSwitchLayout).toHaveBeenCalledWith('layout-a')
      await flush()
      expect(mockSelection.add).toHaveBeenCalledWith('a1')
      expect(rows(view)).toHaveLength(3)
      view.destroy()
    })

    it('steps through hits of several layouts with Enter', async () => {
      const view = createView()
      const input = view.element.querySelector(
        'input[type="search"]'
      ) as HTMLInputElement
      input.value = 'sala'
      const press = () =>
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        )
      press()
      await flush()
      expect(mockSelection.add).toHaveBeenLastCalledWith('a1')
      press()
      await flush()
      expect(mockView.activeLayoutBtrId).toBe('layout-b')
      expect(mockSelection.add).toHaveBeenLastCalledWith('b1')
      view.destroy()
    })
  })
})
