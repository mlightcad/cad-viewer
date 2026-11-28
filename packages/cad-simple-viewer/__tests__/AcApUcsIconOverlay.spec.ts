/**
 * @jest-environment jsdom
 */
import { AcGePoint2d } from '@mlightcad/data-model'

import { ML_UI_Z_CANVAS_HTML_OVERLAY } from '../src/editor/global/AcEdUiLayout'
import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import { AcApUcsIconOverlay } from '../src/view/AcApUcsIconOverlay'

const mockDisplayFrame = {
  origin: { x: 0, y: 0, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  yAxis: { x: 0, y: 1, z: 0 }
}

jest.mock('../src/service/AcApUcsService', () => ({
  AcApUcsService: {
    getIconSettings: () => ({
      on: true,
      atOrigin: true,
      applyToAllActiveViewports: false,
      allowSelectingIcon: false
    }),
    getIconAppearance: () => ({
      sizePercent: 50,
      lineWidth: 1,
      modelColorIndex: 7,
      layoutColorIndex: 7,
      applySingleColor: false
    }),
    getDisplayFrame: () => ({
      origin: { ...mockDisplayFrame.origin },
      xAxis: { ...mockDisplayFrame.xAxis },
      yAxis: { ...mockDisplayFrame.yAxis }
    }),
    getActiveFrame: () => ({
      origin: { ...mockDisplayFrame.origin },
      xAxis: { ...mockDisplayFrame.xAxis },
      yAxis: { ...mockDisplayFrame.yAxis }
    }),
    isWorldFrame: () =>
      mockDisplayFrame.xAxis.x === 1 &&
      mockDisplayFrame.xAxis.y === 0 &&
      mockDisplayFrame.yAxis.x === 0 &&
      mockDisplayFrame.yAxis.y === 1
  }
}))

function createView(options: {
  hasLayoutView: boolean
  worldToScreen?: (p: { x: number; y: number }) => AcGePoint2d
}): AcEdBaseView {
  const worldToScreen =
    options.worldToScreen ??
    ((p: { x: number; y: number }) => new AcGePoint2d(p.x, -p.y))
  // Inverse of the default worldToScreen for axis sample length.
  const screenToWorld = (p: { x: number; y: number }) =>
    new AcGePoint2d(p.x - 400, 300 - p.y)
  return {
    width: 800,
    height: 600,
    activeLayoutView: options.hasLayoutView ? {} : undefined,
    worldToScreen,
    screenToWorld,
    canvasToContainer: (p: { x: number; y: number }) =>
      new AcGePoint2d(p.x, p.y)
  } as unknown as AcEdBaseView
}

describe('AcApUcsIconOverlay', () => {
  test('stays below the floating command line in the stacking order', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)
    const el = host.querySelector('.ml-ucs-icon') as HTMLElement

    expect(el.style.zIndex).toBe(String(ML_UI_Z_CANVAS_HTML_OVERLAY))
    overlay.dispose()
    host.remove()
  })

  test('hides when the view has no active layout camera', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)
    const el = host.querySelector('.ml-ucs-icon') as HTMLElement

    overlay.update(createView({ hasLayoutView: false }))

    expect(el.style.display).toBe('none')
    overlay.dispose()
    host.remove()
  })

  test('draws world +Y toward screen up when layout camera is present', () => {
    mockDisplayFrame.xAxis = { x: 1, y: 0, z: 0 }
    mockDisplayFrame.yAxis = { x: 0, y: 1, z: 0 }
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)

    overlay.update(
      createView({
        hasLayoutView: true,
        // Camera-like mapping: WCS +Y → smaller screen Y (up).
        worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
      })
    )

    const lines = host.querySelectorAll('.ml-ucs-icon line')
    const yLine = lines[1] as SVGLineElement
    const y1 = Number(yLine.getAttribute('y1'))
    const y2 = Number(yLine.getAttribute('y2'))
    expect(y2).toBeLessThan(y1)
    overlay.dispose()
    host.remove()
  })

  test('draws rotated UCS axes when UCSFOLLOW is off (view untwisted)', () => {
    // 90° UCS: X → WCS +Y, Y → WCS −X. Untwisted view → icon X points screen-up.
    mockDisplayFrame.xAxis = { x: 0, y: 1, z: 0 }
    mockDisplayFrame.yAxis = { x: -1, y: 0, z: 0 }
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)

    overlay.update(
      createView({
        hasLayoutView: true,
        worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
      })
    )

    const g = overlay.geometry!
    const x = { x: g.xTip.x - g.origin.x, y: g.xTip.y - g.origin.y }
    // Screen up is −Y; UCS X along WCS +Y projects upward.
    expect(Math.abs(x.x)).toBeLessThan(Math.abs(x.y))
    expect(x.y).toBeLessThan(0)

    overlay.dispose()
    host.remove()
    mockDisplayFrame.xAxis = { x: 1, y: 0, z: 0 }
    mockDisplayFrame.yAxis = { x: 0, y: 1, z: 0 }
  })

  test('keeps tips and axis labels inside the icon box for any orientation', () => {
    // Left/down axes used to clip past the old lower-left origin layout.
    mockDisplayFrame.xAxis = { x: -1, y: 0, z: 0 }
    mockDisplayFrame.yAxis = { x: 0, y: -1, z: 0 }
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)

    overlay.update(
      createView({
        hasLayoutView: true,
        worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
      })
    )

    const g = overlay.geometry!
    const margin = 1
    expect(g.xTip.x).toBeGreaterThanOrEqual(g.left + margin)
    expect(g.xTip.x).toBeLessThanOrEqual(g.left + g.size - margin)
    expect(g.xTip.y).toBeGreaterThanOrEqual(g.top + margin)
    expect(g.xTip.y).toBeLessThanOrEqual(g.top + g.size - margin)
    expect(g.yTip.x).toBeGreaterThanOrEqual(g.left + margin)
    expect(g.yTip.x).toBeLessThanOrEqual(g.left + g.size - margin)
    expect(g.yTip.y).toBeGreaterThanOrEqual(g.top + margin)
    expect(g.yTip.y).toBeLessThanOrEqual(g.top + g.size - margin)

    const xLabel = host.querySelector(
      '.ml-ucs-icon text'
    ) as SVGTextElement
    const lx = Number(xLabel.getAttribute('x'))
    const ly = Number(xLabel.getAttribute('y'))
    expect(lx).toBeGreaterThanOrEqual(margin)
    expect(lx).toBeLessThanOrEqual(g.size - margin)
    expect(ly).toBeGreaterThanOrEqual(margin)
    expect(ly).toBeLessThanOrEqual(g.size - margin)

    overlay.dispose()
    host.remove()
    mockDisplayFrame.xAxis = { x: 1, y: 0, z: 0 }
    mockDisplayFrame.yAxis = { x: 0, y: 1, z: 0 }
  })

  test('exposes hit geometry and hit-tests near the triad origin', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)

    overlay.update(
      createView({
        hasLayoutView: true,
        worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
      })
    )

    const geometry = overlay.geometry
    expect(geometry).not.toBeNull()
    expect(overlay.hitTest(geometry!.origin.x, geometry!.origin.y)).toBe(true)
    expect(overlay.hitTest(0, 0)).toBe(false)
    // Axis hover is tighter than the bounding-box selection hit.
    expect(
      overlay.hitTestAxes(geometry!.origin.x, geometry!.origin.y)
    ).toBe(true)
    expect(overlay.hitTestAxes(geometry!.xTip.x, geometry!.xTip.y)).toBe(true)
    expect(overlay.hitTestAxes(geometry!.yTip.x, geometry!.yTip.y)).toBe(true)
    // Far corner of the triad box — still a box hit, but not on an axis.
    const cornerX = geometry!.left + geometry!.size - 1
    const cornerY = geometry!.top + 1
    expect(overlay.hitTest(cornerX, cornerY)).toBe(true)
    expect(overlay.hitTestAxes(cornerX, cornerY)).toBe(false)

    overlay.dispose()
    host.remove()
  })

  test('axis length matches AutoCAD size mapping (edge * percent / 1000)', () => {
    // Default 50 on a 600 px shorter edge → 30 px axes (not half of that).
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)
    const view = createView({
      hasLayoutView: true,
      worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
    })
    overlay.update(view)

    const g = overlay.geometry!
    const axisLen = Math.hypot(g.xTip.x - g.origin.x, g.xTip.y - g.origin.y)
    expect(axisLen).toBeCloseTo(30, 0)

    overlay.dispose()
    host.remove()
  })

  test('hover/selected recolor to AutoCAD greenish-gold without SVG filters', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)
    const view = createView({
      hasLayoutView: true,
      worldToScreen: p => new AcGePoint2d(400 + p.x, 300 - p.y)
    })
    overlay.update(view)

    const lines = host.querySelectorAll('.ml-ucs-icon line')
    const xLine = lines[0] as SVGLineElement
    const yLine = lines[1] as SVGLineElement
    expect(xLine.getAttribute('stroke')).toBe('#e53935')
    expect(yLine.getAttribute('stroke')).toBe('#43a047')

    overlay.setVisualState('hover')
    expect(overlay.element.classList.contains('ml-ucs-icon--hover')).toBe(true)
    // Axis-aligned strokes must keep a real stroke (no filter that clips
    // zero-height/width objectBoundingBox lines into invisibility).
    expect(xLine.getAttribute('filter')).toBeNull()
    expect(yLine.getAttribute('filter')).toBeNull()
    expect(xLine.getAttribute('stroke')).toBe('#c9c43a')
    expect(yLine.getAttribute('stroke')).toBe('#c9c43a')

    overlay.setVisualState('selected')
    expect(xLine.getAttribute('stroke')).toBe('#c9c43a')

    overlay.setVisualState('normal')
    expect(xLine.getAttribute('stroke')).toBe('#e53935')
    expect(yLine.getAttribute('stroke')).toBe('#43a047')

    overlay.dispose()
    host.remove()
  })

  test('keeps X and Y screen axes perpendicular on large-scale views', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)

    // 1 WCS unit ≪ 1 CSS pixel — the old unit-length sample collapsed both
    // axes into floating-point noise and drew them on top of each other.
    const scale = 1e-6
    const view = {
      width: 800,
      height: 600,
      activeLayoutView: {},
      worldToScreen: (p: { x: number; y: number }) =>
        new AcGePoint2d(400 + p.x * scale, 300 - p.y * scale),
      screenToWorld: (p: { x: number; y: number }) =>
        new AcGePoint2d((p.x - 400) / scale, (300 - p.y) / scale),
      canvasToContainer: (p: { x: number; y: number }) =>
        new AcGePoint2d(p.x, p.y)
    } as unknown as AcEdBaseView
    overlay.update(view)

    const g = overlay.geometry!
    const x = {
      x: g.xTip.x - g.origin.x,
      y: g.xTip.y - g.origin.y
    }
    const y = {
      x: g.yTip.x - g.origin.x,
      y: g.yTip.y - g.origin.y
    }
    const cross = x.x * y.y - x.y * y.x
    expect(Math.abs(cross)).toBeGreaterThan(0.5)

    overlay.dispose()
    host.remove()
  })

  test('does not touch the DOM when the view is unchanged between frames', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const overlay = new AcApUcsIconOverlay(host)
    let offsetX = 400
    const view = createView({
      hasLayoutView: true,
      worldToScreen: p => new AcGePoint2d(offsetX + p.x, 300 - p.y)
    })
    overlay.update(view)

    const records: MutationRecord[] = []
    const observer = new MutationObserver(m => records.push(...m))
    observer.observe(host, { subtree: true, attributes: true })

    // update() runs on every animation frame; identical frames must be no-ops.
    overlay.update(view)
    overlay.update(view)
    await Promise.resolve()
    expect(records.concat(observer.takeRecords())).toHaveLength(0)

    offsetX = 420
    overlay.update(view)
    await Promise.resolve()
    expect(records.concat(observer.takeRecords()).length).toBeGreaterThan(0)

    observer.disconnect()
    overlay.dispose()
    host.remove()
  })
})
