jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: { getActiveInputBox: jest.fn(() => null) }
}))

jest.mock('three/examples/jsm/libs/stats.module', () => ({
  __esModule: true,
  default: class StatsMock {}
}))

// Load the view barrel first so its circular imports settle in order.
import '../src/view'

import * as THREE from 'three'

import { AcEdViewMode } from '../src/editor/view/AcEdViewMode'
import { AcTrLayoutView } from '../src/view/AcTrLayoutView'

/** Layout view built without the WebGL-heavy constructor. */
function createBareLayoutView() {
  const view = Object.create(AcTrLayoutView.prototype) as AcTrLayoutView
  const controls = { mouseButtons: {}, update: jest.fn() }
  ;(view as unknown as { _cameraControls: typeof controls })._cameraControls =
    controls
  return { view, controls }
}

describe('AcTrLayoutView.mode', () => {
  it('pans with the middle button in selection mode', () => {
    const { view, controls } = createBareLayoutView()
    view.mode = AcEdViewMode.SELECTION
    expect(controls.mouseButtons).toEqual({ MIDDLE: THREE.MOUSE.PAN })
  })

  it('keeps middle-button pan in pan mode', () => {
    const { view, controls } = createBareLayoutView()
    view.mode = AcEdViewMode.PAN
    expect(controls.mouseButtons).toEqual({
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.PAN
    })
    expect(view.mode).toBe(AcEdViewMode.PAN)
  })
})
