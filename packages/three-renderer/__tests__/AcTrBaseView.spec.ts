import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderer } from '../src/renderer'
import { AcTrBaseView } from '../src/viewport/AcTrBaseView'

class TestView extends AcTrBaseView {
  get frustum() {
    return this._frustum
  }
}

function createMockRenderer(): AcTrRenderer {
  return {
    domElement: {} as HTMLCanvasElement,
    render: jest.fn()
  } as unknown as AcTrRenderer
}

function getVisibleWorldExtents(camera: THREE.OrthographicCamera) {
  const worldWidth = (camera.right - camera.left) / camera.zoom
  const worldHeight = (camera.top - camera.bottom) / camera.zoom

  return {
    worldWidth,
    worldHeight,
    minX: camera.position.x - worldWidth / 2,
    maxX: camera.position.x + worldWidth / 2,
    minY: camera.position.y - worldHeight / 2,
    maxY: camera.position.y + worldHeight / 2
  }
}

describe('AcTrBaseView camera fitting', () => {
  it('initializes frustum from view height', () => {
    const view = new TestView(createMockRenderer(), 800, 600)

    expect(view.frustum).toBe(300)
    expect(view.internalCamera.top).toBe(300)
    expect(view.internalCamera.bottom).toBe(-300)
    expect(view.internalCamera.right).toBe(400)
    expect(view.internalCamera.left).toBe(-400)
  })

  it('applyExportCamera fits bounds to export pixel dimensions', () => {
    const view = new TestView(createMockRenderer(), 1280, 720)
    const bounds = new AcGeBox2d(
      new AcGePoint2d(10, 20),
      new AcGePoint2d(110, 70)
    )

    view.applyExportCamera(bounds, 800, 400)

    const visible = getVisibleWorldExtents(view.internalCamera)

    expect(view.internalCamera.position.x).toBeCloseTo(60)
    expect(view.internalCamera.position.y).toBeCloseTo(45)
    expect(visible.worldWidth).toBeCloseTo(100, 5)
    expect(visible.worldHeight).toBeCloseTo(50, 5)
    expect(visible.minX).toBeCloseTo(10, 5)
    expect(visible.maxX).toBeCloseTo(110, 5)
    expect(visible.minY).toBeCloseTo(20, 5)
    expect(visible.maxY).toBeCloseTo(70, 5)
  })

  it('applyExportCamera leaves OrbitControls target unchanged', () => {
    const view = new TestView(createMockRenderer(), 800, 600)
    const orbitTarget = (
      view as unknown as {
        _cameraControls: { target: { x: number; y: number; z: number } }
      }
    )._cameraControls.target
    orbitTarget.x = 12
    orbitTarget.y = 34
    orbitTarget.z = 0

    view.applyExportCamera(
      new AcGeBox2d(new AcGePoint2d(0, 0), new AcGePoint2d(100, 100)),
      512,
      512
    )

    expect(orbitTarget.x).toBe(12)
    expect(orbitTarget.y).toBe(34)
    expect(orbitTarget.z).toBe(0)
  })

  it('zoomTo matches min(width/fitWidth, height/fitHeight) when frustum is height/2', () => {
    const view = new TestView(createMockRenderer(), 800, 600)
    const bounds = new AcGeBox2d(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(200, 100)
    )
    const margin = 1.1
    const fitWidth = 200 * margin
    const fitHeight = 100 * margin
    const expectedScale = Math.min(800 / fitWidth, 600 / fitHeight)

    view.zoomTo(bounds, margin)

    expect(view.internalCamera.zoom).toBeCloseTo(expectedScale, 8)

    const visible = getVisibleWorldExtents(view.internalCamera)
    expect(visible.worldWidth).toBeGreaterThanOrEqual(fitWidth - 1e-6)
    expect(visible.worldHeight).toBeGreaterThanOrEqual(fitHeight - 1e-6)
    expect(visible.worldWidth / visible.worldHeight).toBeCloseTo(800 / 600, 8)
  })

  it('zoomTo centers on the box center', () => {
    const view = new TestView(createMockRenderer(), 800, 600)
    const bounds = new AcGeBox2d(
      new AcGePoint2d(10, 20),
      new AcGePoint2d(110, 70)
    )

    view.zoomTo(bounds, 1)

    expect(view.internalCamera.position.x).toBeCloseTo(60)
    expect(view.internalCamera.position.y).toBeCloseTo(45)
  })

  it('applyExportCamera uses export aspect rather than view aspect', () => {
    const view = new TestView(createMockRenderer(), 1600, 900)
    const bounds = new AcGeBox2d(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(100, 100)
    )

    view.applyExportCamera(bounds, 400, 800)

    const visible = getVisibleWorldExtents(view.internalCamera)
    expect(visible.worldWidth / visible.worldHeight).toBeCloseTo(0.5, 8)
    expect(visible.worldWidth).toBeCloseTo(100, 5)
    expect(visible.worldHeight).toBeCloseTo(200, 5)
  })
})
