/**
 * @jest-environment jsdom
 */
import { AcGePoint2d } from '@mlightcad/data-model'

import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'
import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import { AcApUcsIconController } from '../src/view/AcApUcsIconController'
import { AcApUcsIconOverlay } from '../src/view/AcApUcsIconOverlay'

const mockGetIconSettings = jest.fn()
const mockGetIconAppearance = jest.fn()
const mockGetDisplayFrame = jest.fn()
const mockGetActiveFrame = jest.fn()
const mockIsWorldFrame = jest.fn()
const mockSetDisplayPreviewFrame = jest.fn()
const mockApplyFrame = jest.fn()
const mockTryGetInstance = jest.fn()

jest.mock('../src/service/AcApUcsService', () => ({
  AcApUcsService: {
    getIconSettings: () => mockGetIconSettings(),
    getIconAppearance: () => mockGetIconAppearance(),
    getDisplayFrame: () => mockGetDisplayFrame(),
    getActiveFrame: () => mockGetActiveFrame(),
    isWorldFrame: (...args: unknown[]) => mockIsWorldFrame(...args),
    setDisplayPreviewFrame: (...args: unknown[]) =>
      mockSetDisplayPreviewFrame(...args),
    applyFrame: (...args: unknown[]) => mockApplyFrame(...args),
    events: {
      ucsChanged: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    }
  }
}))

jest.mock('../src/app/AcApDocManager', () => ({
  AcApDocManager: {
    tryGetInstance: () => mockTryGetInstance()
  }
}))

jest.mock('../src/editor/grip/AcEdGripAppearance', () => ({
  readGripAppearance: () => ({
    size: 8,
    colorCss: '#0080ff',
    hotColorCss: '#ff0000'
  }),
  applyGripAppearanceToHost: jest.fn()
}))

const mockRubberBandStart = jest.fn()
const mockRubberBandSetBasePoint = jest.fn()
const mockRubberBandUpdate = jest.fn()
const mockRubberBandDispose = jest.fn()

jest.mock('../src/editor/input/ui/AcEdRubberBand', () => ({
  AcEdRubberBand: jest.fn().mockImplementation(() => {
    const baseLine = document.createElement('div')
    baseLine.style.borderTop = '1px dashed var(--ml-ui-canvas-line, #0f0)'
    const container = document.createElement('div')
    container.appendChild(baseLine)
    return {
      get element() {
        return container
      },
      start: (...args: unknown[]) => {
        mockRubberBandStart(...args)
        document.body.appendChild(container)
      },
      setBasePoint: (...args: unknown[]) => mockRubberBandSetBasePoint(...args),
      update: (...args: unknown[]) => mockRubberBandUpdate(...args),
      dispose: () => {
        mockRubberBandDispose()
        container.remove()
      }
    }
  })
}))

function worldFrame() {
  const point = (x: number, y: number, z: number) => {
    const self = {
      x,
      y,
      z,
      clone: () => point(x, y, z)
    }
    return self
  }
  return {
    origin: point(0, 0, 0),
    xAxis: point(1, 0, 0),
    yAxis: point(0, 1, 0)
  }
}

function createView(
  extras: Partial<{
    resolveOverlayGripPoint: jest.Mock
    clearOverlayGripOsnap: jest.Mock
  }> = {}
): AcEdBaseView {
  const resolveOverlayGripPoint =
    extras.resolveOverlayGripPoint ??
    jest.fn((cursor: { x: number; y: number }) => cursor)
  const clearOverlayGripOsnap = extras.clearOverlayGripOsnap ?? jest.fn()
  return {
    width: 800,
    height: 600,
    activeLayoutView: {},
    editor: { isActive: false },
    selectionSet: { count: 0, clear: jest.fn() },
    container: document.createElement('div'),
    worldToScreen: (p: { x: number; y: number }) =>
      new AcGePoint2d(400 + p.x, 300 - p.y),
    canvasToContainer: (p: { x: number; y: number }) =>
      new AcGePoint2d(p.x, p.y),
    viewportToCanvas: (p: { x: number; y: number }) =>
      new AcGePoint2d(p.x, p.y),
    screenToWorld: (p: { x: number; y: number }) =>
      new AcGePoint2d(p.x - 400, 300 - p.y),
    resolveOverlayGripPoint,
    clearOverlayGripOsnap
  } as unknown as AcEdBaseView
}

function createController(
  view: AcEdBaseView,
  overlay: AcApUcsIconOverlay,
  host: HTMLElement
) {
  // Mirror AcTrView2d host hooks (controller no longer imports DocManager).
  return new AcApUcsIconController(view, overlay, host, {
    canWrite: () => {
      const doc = mockTryGetInstance()?.curDocument
      return !!doc && doc.openMode >= AcEdOpenMode.Write
    },
    getDatabase: () => mockTryGetInstance()?.curDocument?.database
  })
}

describe('AcApUcsIconController', () => {
  beforeEach(() => {
    mockRubberBandStart.mockClear()
    mockRubberBandSetBasePoint.mockClear()
    mockRubberBandUpdate.mockClear()
    mockRubberBandDispose.mockClear()
    mockSetDisplayPreviewFrame.mockClear()
    mockApplyFrame.mockClear()
    mockGetIconSettings.mockReturnValue({
      on: true,
      atOrigin: true,
      applyToAllActiveViewports: false,
      allowSelectingIcon: true
    })
    mockGetIconAppearance.mockReturnValue({
      sizePercent: 50,
      lineWidth: 1,
      modelColorIndex: 7,
      layoutColorIndex: 7,
      applySingleColor: false
    })
    mockGetDisplayFrame.mockReturnValue(worldFrame())
    mockGetActiveFrame.mockReturnValue(worldFrame())
    mockIsWorldFrame.mockReturnValue(true)
    mockTryGetInstance.mockReturnValue({
      curDocument: {
        openMode: AcEdOpenMode.Write,
        database: {}
      }
    })
  })

  test('disables icon hits while the editor is active (command picking)', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    ;(view.editor as { isActive: boolean }).isActive = true
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    controller.sync()

    expect(overlay.element.style.pointerEvents).toBe('none')

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('pointerdown on the icon shows three grip handles', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    controller.sync()

    expect(overlay.element.style.pointerEvents).toBe('auto')

    overlay.element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true })
    )

    const grips = host.querySelectorAll('.ml-grip-handle')
    expect(grips).toHaveLength(3)
    expect(controller.isSelected).toBe(true)
    expect(overlay.visualState).toBe('selected')

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('hover highlights only when the pointer is near an axis', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    controller.sync()
    const geometry = overlay.geometry!

    // Empty corner of the triad box — enter the container without hovering axes.
    overlay.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: geometry.left + geometry.size - 1,
        clientY: geometry.top + 1,
        bubbles: true
      })
    )
    expect(overlay.visualState).toBe('normal')

    // Mid-axis — hover should light up.
    const midX = (geometry.origin.x + geometry.xTip.x) / 2
    const midY = (geometry.origin.y + geometry.xTip.y) / 2
    overlay.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: midX,
        clientY: midY,
        bubbles: true
      })
    )
    expect(overlay.visualState).toBe('hover')

    overlay.element.dispatchEvent(
      new PointerEvent('pointerleave', { bubbles: true })
    )
    expect(overlay.visualState).toBe('normal')

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('trySelect fallback also creates grips', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    const geometry = overlay.geometry!
    expect(controller.trySelect(geometry.origin.x, geometry.origin.y)).toBe(
      true
    )
    expect(host.querySelectorAll('.ml-grip-handle')).toHaveLength(3)

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('click-drag commits on pointerup after moving past the threshold', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const resolveOverlayGripPoint = jest.fn(
      (cursor: { x: number; y: number }) => ({
        x: cursor.x + 10,
        y: cursor.y + 5
      })
    )
    const clearOverlayGripOsnap = jest.fn()
    const view = createView({ resolveOverlayGripPoint, clearOverlayGripOsnap })
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    overlay.element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true })
    )

    const grips = host.querySelectorAll('.ml-grip-handle')
    expect(grips).toHaveLength(3)
    grips[0].dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        bubbles: true,
        clientX: 400,
        clientY: 300,
        cancelable: true
      })
    )

    expect(mockRubberBandStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      expect.objectContaining({
        showBaseLineOnly: true,
        dashedBaseLine: true
      })
    )

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 450,
        clientY: 280,
        bubbles: true
      })
    )

    expect(resolveOverlayGripPoint).toHaveBeenCalled()
    expect(mockSetDisplayPreviewFrame).toHaveBeenCalled()
    // Origin rubber-band stays at the drag-start grip (no live re-anchor).
    expect(mockRubberBandSetBasePoint).not.toHaveBeenCalled()
    expect(mockRubberBandUpdate).toHaveBeenCalled()

    window.dispatchEvent(
      new PointerEvent('pointerup', { button: 0, clientX: 450, clientY: 280 })
    )
    expect(mockRubberBandDispose).toHaveBeenCalled()
    expect(clearOverlayGripOsnap).toHaveBeenCalled()
    expect(mockApplyFrame).toHaveBeenCalled()

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('origin grip click-then-pick commits on the second click', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    overlay.element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true })
    )

    const grips = host.querySelectorAll('.ml-grip-handle')
    grips[0].dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        bubbles: true,
        clientX: 400,
        clientY: 300,
        cancelable: true
      })
    )
    // Release without moving — enter AutoCAD click-to-place mode.
    window.dispatchEvent(
      new PointerEvent('pointerup', { button: 0, clientX: 400, clientY: 300 })
    )
    expect(mockApplyFrame).not.toHaveBeenCalled()

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 480,
        clientY: 260,
        bubbles: true
      })
    )
    expect(mockSetDisplayPreviewFrame).toHaveBeenCalled()

    window.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        clientX: 480,
        clientY: 260,
        bubbles: true,
        cancelable: true
      })
    )
    expect(mockApplyFrame).toHaveBeenCalled()

    controller.dispose()
    overlay.dispose()
    host.remove()
  })

  test('Enter commits an in-progress UCS icon grip place', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const view = createView()
    const overlay = new AcApUcsIconOverlay(host)
    overlay.update(view)

    const controller = createController(view, overlay, host)
    overlay.element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true })
    )
    host.querySelectorAll('.ml-grip-handle')[0].dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        bubbles: true,
        clientX: 400,
        clientY: 300,
        cancelable: true
      })
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', { button: 0, clientX: 400, clientY: 300 })
    )
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 470,
        clientY: 250,
        bubbles: true
      })
    )

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
    expect(mockApplyFrame).toHaveBeenCalled()

    controller.dispose()
    overlay.dispose()
    host.remove()
  })
})
