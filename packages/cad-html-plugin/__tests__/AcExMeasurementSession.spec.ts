/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'
import * as THREE from 'three'

import { AcExHtmlI18n } from '../src/AcExHtmlI18n'
import type { AcExMeasureViewApi } from '../src/AcExMeasurement'

Object.assign(globalThis, { TextDecoder, TextEncoder })

// Value import after the polyfill: `@mlightcad/data-model` needs TextDecoder in jsdom.
const { AcExMeasureController } =
  require('../src/AcExMeasurement') as typeof import('../src/AcExMeasurement')

function createController() {
  const root = document.createElement('div')
  root.id = 'mlcad-root'
  document.body.appendChild(root)
  const statusEl = document.createElement('div')
  const view: AcExMeasureViewApi = {
    screenToWcs: (x, y) => new THREE.Vector2(x, y),
    wcsToScreen: wcs => ({ x: wcs.x, y: wcs.y }),
    render: () => undefined,
    getSnapCacheKey: () => 0,
    getCameraZoom: () => 1,
    resolvePoint: (clientX, clientY) => ({
      point: new THREE.Vector2(clientX, clientY),
      snap: null
    }),
    formatLength: value => String(value),
    formatAngle: value => String(value),
    zoomToExtents: () => undefined
  }
  const controller = new AcExMeasureController({
    root,
    i18n: new AcExHtmlI18n('en'),
    view,
    statusEl,
    getReadyStatus: () => 'Ready',
    onOsnapMarker: () => undefined
  })
  return { controller, root }
}

describe('AcExMeasureController session actions', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('discards an in-progress continuous measurement on cancelSession', () => {
    const { controller } = createController()
    controller.setMode('continuous')
    controller.handlePointerDown(0, 0)
    controller.handlePointerDown(10, 0)

    expect(controller.isActive).toBe(true)
    expect(controller.cancelSession()).toBe(true)
    expect(controller.isActive).toBe(false)
    expect(controller.list()).toHaveLength(0)
  })

  it('commits an in-progress continuous measurement on confirmSession', () => {
    const { controller } = createController()
    controller.setMode('continuous')
    controller.handlePointerDown(0, 0)
    controller.handlePointerDown(10, 0)

    expect(controller.confirmSession()).toBe(true)
    expect(controller.isActive).toBe(false)
    expect(controller.list()).toHaveLength(1)
  })
})
