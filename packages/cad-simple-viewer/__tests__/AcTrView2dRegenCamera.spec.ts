jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: { getActiveInputBox: jest.fn(() => null) }
}))

jest.mock('three/examples/jsm/libs/stats.module', () => ({
  __esModule: true,
  default: class StatsMock {}
}))

import { AcTrMTextRenderer, AcTrRenderer } from '@mlightcad/three-renderer'

import { AcTrView2d } from '../src/view'
import { AcTrLayoutView } from '../src/view/AcTrLayoutView'
import { AcTrLayoutViewManager } from '../src/view/AcTrLayoutViewManager'

const MODEL_ID = 'model'
const PAPER_ID = 'paper'

/**
 * Internal state of {@link AcTrView2d} touched by `clear()`. The view is built
 * with `Object.create` instead of running the DOM-heavy constructor.
 */
interface ViewInternals {
  _width: number
  _height: number
  _renderer: AcTrRenderer
  _scene: {
    activeLayoutBtrId: string
    modelSpaceBtrId: string
    clear: jest.Mock
    addEmptyLayout: jest.Mock
  }
  _layoutViewManager: AcTrLayoutViewManager
  _regenCameras: Map<string, unknown>
  _viewportRepairOwnerIds: Set<string>
  _missedImages: Map<string, unknown>
  _initializedLayouts: Set<string>
  _externallyFramedLayouts: Set<string>
  _loadingLayouts: Set<string>
  _isDirty: boolean
  abortConversion: jest.Mock
  createLayoutViewIfNeeded: (layoutBtrId: string) => AcTrLayoutView
}

function createBareView() {
  const view = Object.create(AcTrView2d.prototype) as AcTrView2d
  const internals = view as unknown as ViewInternals
  internals._width = 800
  internals._height = 600
  internals._renderer = {
    domElement: {},
    dispose: jest.fn(),
    resetDrawOrderZ: jest.fn()
  } as unknown as AcTrRenderer
  internals._scene = {
    activeLayoutBtrId: MODEL_ID,
    modelSpaceBtrId: MODEL_ID,
    clear: jest.fn(),
    addEmptyLayout: jest.fn()
  }
  internals._layoutViewManager = new AcTrLayoutViewManager()
  internals._regenCameras = new Map()
  internals._viewportRepairOwnerIds = new Set()
  internals._missedImages = new Map()
  internals._initializedLayouts = new Set()
  internals._externallyFramedLayouts = new Set()
  internals._loadingLayouts = new Set()
  internals._isDirty = false
  internals.abortConversion = jest.fn()
  return { view, internals }
}

function addLayoutView(
  internals: ViewInternals,
  layoutBtrId: string,
  center: { x: number; y: number },
  zoom: number
) {
  const layoutView = new AcTrLayoutView(
    internals._renderer,
    layoutBtrId,
    internals._width,
    internals._height
  )
  layoutView.flyTo(center, zoom)
  internals._layoutViewManager.add(layoutView)
  internals._initializedLayouts.add(layoutBtrId)
  return layoutView
}

function cameraOf(layoutView: AcTrLayoutView | undefined) {
  const camera = layoutView!.internalCamera
  return { x: camera.position.x, y: camera.position.y, zoom: camera.zoom }
}

/**
 * Regression for the drawing jumping out of the viewport after toggling
 * LWDISPLAY (and every other REGEN-style redraw): `clear()` replaces all
 * layout views, so the camera snapped back to the origin at zoom 1 while the
 * regen never framed the drawing again.
 */
describe('AcTrView2d regen keeps layout cameras', () => {
  beforeEach(() => {
    jest
      .spyOn(AcTrMTextRenderer.getInstance(), 'resetMeshGlyphBatch')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('restores the active layout camera after clearForRegen', () => {
    const { view, internals } = createBareView()
    const before = addLayoutView(
      internals,
      MODEL_ID,
      { x: 125000, y: -48000 },
      0.002
    )
    internals._layoutViewManager.activeLayoutBtrId = MODEL_ID

    view.clearForRegen()

    const after = internals._layoutViewManager.activeLayoutView
    expect(after).toBeDefined()
    expect(after).not.toBe(before)
    expect(cameraOf(after)).toEqual({ x: 125000, y: -48000, zoom: 0.002 })
    // Already framed: a later layout switch must not re-run initial zoom.
    expect(internals._initializedLayouts.has(MODEL_ID)).toBe(true)
  })

  it('restores other layout cameras when regen recreates their views', () => {
    const { view, internals } = createBareView()
    addLayoutView(internals, MODEL_ID, { x: 10, y: 20 }, 0.5)
    addLayoutView(internals, PAPER_ID, { x: 300, y: 200 }, 3)
    internals._layoutViewManager.activeLayoutBtrId = MODEL_ID

    view.clearForRegen()
    expect(internals._layoutViewManager.has(PAPER_ID)).toBe(false)

    // Regen replays layouts through `addLayout` -> createLayoutViewIfNeeded.
    const paperView = internals.createLayoutViewIfNeeded(PAPER_ID)
    expect(cameraOf(paperView)).toEqual({ x: 300, y: 200, zoom: 3 })
    expect(internals._regenCameras.size).toBe(0)
  })

  it('still resets cameras on a plain clear (document open / close)', () => {
    const { view, internals } = createBareView()
    addLayoutView(internals, MODEL_ID, { x: 125000, y: -48000 }, 0.002)
    internals._layoutViewManager.activeLayoutBtrId = MODEL_ID

    view.clear()

    const after = internals._layoutViewManager.activeLayoutView
    expect(cameraOf(after)).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(internals._initializedLayouts.size).toBe(0)
  })
})
