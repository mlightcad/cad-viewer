jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: { getActiveInputBox: jest.fn(() => null) }
}))

jest.mock('three/examples/jsm/libs/stats.module', () => ({
  __esModule: true,
  default: class StatsMock {}
}))

jest.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
  CSS2DRenderer: class CSS2DRendererMock {}
}))

import { AcDbCircle, AcGePoint3d } from '@mlightcad/data-model'

import { AcTrView2d } from '../src/view/AcTrView2d'

/**
 * Internal state of {@link AcTrView2d} that `addTransientEntity` touches.
 * The view is built with `Object.create` to skip the DOM-heavy constructor.
 */
interface ViewInternals {
  _renderer: {
    showLineWeight: boolean
    forceShowLineWeight: boolean
    context: { skipMeshGlyphInstancing: boolean }
  }
  _scene: { addTransientEntity: jest.Mock }
  _convertEpoch: number
  _transientDrawGeneration: Map<string, number>
  _transientSkipMeshGlyphDepth: number
  _isDirty: boolean
  drawEntity: jest.Mock
}

function createBareView(showLineWeight: boolean) {
  const view = Object.create(AcTrView2d.prototype) as AcTrView2d
  const internals = view as unknown as ViewInternals
  const renderer = {
    showLineWeight,
    forceShowLineWeight: false,
    context: { skipMeshGlyphInstancing: false }
  }
  const lineWeightAtDraw: boolean[] = []
  internals._renderer = renderer
  internals._scene = { addTransientEntity: jest.fn() }
  internals._convertEpoch = 0
  internals._transientDrawGeneration = new Map()
  internals._transientSkipMeshGlyphDepth = 0
  internals._isDirty = false
  internals.drawEntity = jest.fn(() => {
    lineWeightAtDraw.push(
      renderer.showLineWeight || renderer.forceShowLineWeight
    )
    return {
      objectId: '',
      userData: {},
      syncDraw: jest.fn(),
      dispose: jest.fn()
    }
  })
  return { view, internals, lineWeightAtDraw }
}

function createPreviewEntity() {
  const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
  // Empty id keeps the test away from the MTEXT glyph instance bookkeeping.
  circle.objectId = ''
  return circle
}

/**
 * Jig previews (PASTECLIP, MOVE, COPY, grip edits, ...) show drawing
 * entities, so they must use the same lineweight display as the drawing:
 * with LWDISPLAY off a pasted block used to preview with fat lines.
 */
describe('AcTrView2d transient previews and LWDISPLAY', () => {
  it('draws previews with 1px lines while LWDISPLAY is off', () => {
    const { view, internals, lineWeightAtDraw } = createBareView(false)

    view.addTransientEntity(createPreviewEntity())

    expect(lineWeightAtDraw).toEqual([false])
    expect(internals._scene.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(internals._renderer.forceShowLineWeight).toBe(false)
  })

  it('draws previews with lineweights while LWDISPLAY is on', () => {
    const { view, lineWeightAtDraw } = createBareView(true)

    view.addTransientEntity(createPreviewEntity())

    expect(lineWeightAtDraw).toEqual([true])
  })
})
