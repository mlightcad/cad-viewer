jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: { getActiveInputBox: jest.fn(() => null) }
}))

jest.mock('three/examples/jsm/libs/stats.module', () => ({
  __esModule: true,
  default: class StatsMock {}
}))

import { AcTrRenderer } from '@mlightcad/three-renderer'

import { AcTrView2d } from '../src/view'

/**
 * Internal state of {@link AcTrView2d} touched by LWDISPLAY helpers.
 */
interface ViewInternals {
  _renderer: {
    showLineWeight: boolean
  }
  _scene: {
    applyShowLineWeight: jest.Mock
  }
  _lineWeightGeometryReady: boolean
  _isDirty: boolean
}

function createBareView(showLineWeight = false) {
  const view = Object.create(AcTrView2d.prototype) as AcTrView2d
  const internals = view as unknown as ViewInternals
  internals._renderer = {
    showLineWeight
  } as unknown as AcTrRenderer & { showLineWeight: boolean }
  internals._scene = {
    applyShowLineWeight: jest.fn()
  }
  internals._lineWeightGeometryReady = false
  internals._isDirty = false
  return { view, internals }
}

/**
 * Hybrid LWDISPLAY: keep cheap GL_LINES until the first enable, then flip
 * linewidth only so later toggles stay interactive.
 */
describe('AcTrView2d LWDISPLAY hybrid toggle', () => {
  it('requests a geometry upgrade the first time display turns on', () => {
    const { view, internals } = createBareView(false)

    expect(view.setShowLineWeight(true)).toBe(true)
    expect(internals._renderer.showLineWeight).toBe(true)
    expect(internals._scene.applyShowLineWeight).toHaveBeenCalledWith(true)
    expect(internals._isDirty).toBe(true)
  })

  it('does not request an upgrade after fat geometry is ready', () => {
    const { view, internals } = createBareView(false)
    view.markLineWeightGeometryReady()

    expect(view.setShowLineWeight(true)).toBe(false)
    expect(internals._scene.applyShowLineWeight).toHaveBeenCalledWith(true)

    expect(view.setShowLineWeight(false)).toBe(false)
    expect(internals._scene.applyShowLineWeight).toHaveBeenCalledWith(false)
    // Turning off must keep fat geometry so the next on stays cheap.
    expect(view.setShowLineWeight(true)).toBe(false)
  })

  it('reports an upgrade again after the ready flag is cleared for a new document', () => {
    const { view, internals } = createBareView(true)
    view.markLineWeightGeometryReady()
    expect(view.setShowLineWeight(true)).toBe(false)

    // Same reset `clear()` / `beginNewSession()` perform for a replacement doc.
    internals._lineWeightGeometryReady = false
    expect(view.setShowLineWeight(true)).toBe(true)
  })
})
