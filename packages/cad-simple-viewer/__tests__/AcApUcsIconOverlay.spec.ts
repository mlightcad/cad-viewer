/**
 * @jest-environment jsdom
 */
import { AcGePoint2d } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import { AcApUcsIconOverlay } from '../src/view/AcApUcsIconOverlay'

jest.mock('../src/service/AcApUcsService', () => ({
  AcApUcsService: {
    getIconSettings: () => ({
      on: true,
      atOrigin: true,
      applyToAllActiveViewports: false,
      allowSelectingIcon: false
    }),
    getActiveFrame: () => ({
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 }
    }),
    isWorldFrame: () => true
  }
}))

function createView(options: {
  hasLayoutView: boolean
  worldToScreen?: (p: { x: number; y: number }) => AcGePoint2d
}): AcEdBaseView {
  const worldToScreen =
    options.worldToScreen ??
    ((p: { x: number; y: number }) => new AcGePoint2d(p.x, -p.y))
  return {
    width: 800,
    height: 600,
    activeLayoutView: options.hasLayoutView ? {} : undefined,
    worldToScreen
  } as unknown as AcEdBaseView
}

describe('AcApUcsIconOverlay', () => {
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

    const yLine = host.querySelector(
      '.ml-ucs-icon line:nth-child(2)'
    ) as SVGLineElement
    const y1 = Number(yLine.getAttribute('y1'))
    const y2 = Number(yLine.getAttribute('y2'))
    expect(y2).toBeLessThan(y1)
    overlay.dispose()
    host.remove()
  })
})
