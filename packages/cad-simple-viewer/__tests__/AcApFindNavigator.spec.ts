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
      setCurrentLayoutBtrId: (...args: unknown[]) =>
        mockSetCurrentLayout(...args)
    }
  })
}))

import { acapNavigateToFindHit } from '../src/find/AcApFindNavigator'
import type { AcApFindLayoutHit } from '../src/find/findDrawing'

const selection = { clear: jest.fn(), add: jest.fn() }
const zoomTo = jest.fn()
let initialized = new Set<string>(['model'])
const markLayoutAsInitialized = jest.fn((id: string) => {
  initialized.add(id)
})
const waitUntilIdle = jest.fn((_timeoutMs?: number) => Promise.resolve(true))
const view = {
  activeLayoutBtrId: 'model',
  zoomTo: (...args: unknown[]) => zoomTo(...args),
  selectionSet: selection,
  isLayoutInitialized: (id: string) => initialized.has(id),
  markLayoutAsInitialized,
  waitUntilIdle
}
const knownLayouts = new Set(['model', 'planta'])
const editor = {
  curView: view,
  curDocument: {
    database: {
      tables: {
        blockTable: {
          getIdAt: (id: string) =>
            knownLayouts.has(id)
              ? {
                  getIdAt: () => ({
                    geometricExtents: {
                      min: { x: 0, y: 0 },
                      max: { x: 10, y: 2 }
                    }
                  })
                }
              : undefined
        }
      }
    }
  }
}

function hit(layoutId: string, entityId = 'e1'): AcApFindLayoutHit {
  return {
    entityId,
    textEntityId: entityId,
    kind: 'text',
    text: 'x',
    layer: '0',
    position: { x: 0, y: 0 },
    layoutId,
    layoutName: layoutId
  }
}

const nav = (
  h: AcApFindLayoutHit,
  options?: Parameters<typeof acapNavigateToFindHit>[2]
) => acapNavigateToFindHit(editor as never, h, options)

describe('acapNavigateToFindHit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    view.activeLayoutBtrId = 'model'
    initialized = new Set(['model'])
    mockSetCurrentLayout.mockImplementation((id: string) => {
      view.activeLayoutBtrId = id
      return true
    })
  })

  it('zooms and selects synchronously for a hit in the active layout', () => {
    const pending = nav(hit('model'))
    // Before any await: callers may ignore the promise.
    expect(zoomTo).toHaveBeenCalledTimes(1)
    expect(selection.clear).toHaveBeenCalledTimes(1)
    expect(selection.add).toHaveBeenCalledWith('e1')
    expect(mockSetCurrentLayout).not.toHaveBeenCalled()
    return expect(pending).resolves.toBe('navigated')
  })

  it('activates another layout, waits for idle, then zooms and selects', async () => {
    const result = await nav(hit('planta', 'p1'))
    expect(result).toBe('navigated')
    expect(mockSetCurrentLayout).toHaveBeenCalledWith(
      'planta',
      editor.curDocument.database
    )
    expect(waitUntilIdle).toHaveBeenCalled()
    expect(zoomTo).toHaveBeenCalledTimes(1)
    expect(selection.add).toHaveBeenCalledWith('p1')
    // Order: switch → idle → zoom.
    expect(mockSetCurrentLayout.mock.invocationCallOrder[0]).toBeLessThan(
      waitUntilIdle.mock.invocationCallOrder[0]
    )
    expect(waitUntilIdle.mock.invocationCallOrder[0]).toBeLessThan(
      zoomTo.mock.invocationCallOrder[0]
    )
  })

  it('suppresses the first-visit auto zoom of a layout it frames itself', async () => {
    await nav(hit('planta'))
    expect(markLayoutAsInitialized).toHaveBeenCalledWith('planta')
    expect(markLayoutAsInitialized.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetCurrentLayout.mock.invocationCallOrder[0]
    )
  })

  it('does not re-mark a layout that was already visited', async () => {
    initialized.add('planta')
    await nav(hit('planta'))
    expect(markLayoutAsInitialized).not.toHaveBeenCalled()
  })

  it('does not switch layouts when activateLayout is false', async () => {
    const result = await nav(hit('planta'), { activateLayout: false })
    expect(result).toBe('layout-mismatch')
    expect(mockSetCurrentLayout).not.toHaveBeenCalled()
    expect(zoomTo).not.toHaveBeenCalled()
    expect(selection.add).not.toHaveBeenCalled()
  })

  it('reports a layout that no longer exists', async () => {
    expect(await nav(hit('gone'))).toBe('layout-missing')
    expect(mockSetCurrentLayout).not.toHaveBeenCalled()
  })

  it('reports a layout switch the layout manager refused', async () => {
    mockSetCurrentLayout.mockImplementation(() => false)
    expect(await nav(hit('planta'))).toBe('layout-switch-failed')
    expect(zoomTo).not.toHaveBeenCalled()
  })

  it('drops a navigation superseded while waiting for the layout', async () => {
    let release: (v: boolean) => void = () => {}
    waitUntilIdle.mockImplementationOnce(
      () => new Promise<boolean>(resolve => (release = resolve))
    )
    const first = nav(hit('planta', 'p1'))
    const second = nav(hit('planta', 'p2'))
    release(true)
    expect(await first).toBe('stale')
    expect(await second).toBe('navigated')
    expect(selection.add).toHaveBeenCalledTimes(1)
    expect(selection.add).toHaveBeenCalledWith('p2')
  })

  it('reports a missing document or view', async () => {
    const result = await acapNavigateToFindHit(
      { curView: undefined, curDocument: undefined } as never,
      hit('model')
    )
    expect(result).toBe('no-document')
  })
})
