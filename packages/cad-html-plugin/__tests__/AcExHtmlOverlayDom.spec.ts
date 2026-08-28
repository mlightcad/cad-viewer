/** @jest-environment jsdom */

import {
  acExOverlayTransform,
  acExOverlayViewScale,
  acExPositionWcsOverlay,
  acExResetOverlayViewScale,
  acExScaledCanvasLineWidth
} from '../src/AcExHtmlOverlayDom'

describe('AcExHtmlOverlayDom', () => {
  it('anchors view scale on first layout and scales with zoom', () => {
    const el = document.createElement('div')
    el.className = 'mlcad-measure-badge'

    expect(acExOverlayViewScale(2, el)).toBe(1)
    expect(acExOverlayViewScale(4, el)).toBe(2)
    expect(acExOverlayTransform(el, 2)).toBe(
      'translate(-50%, -50%) scale(2)'
    )
  })

  it('resets the zoom anchor when the overlay moves in world space', () => {
    const el = document.createElement('div')
    acExOverlayViewScale(2, el)
    acExResetOverlayViewScale(el)
    expect(acExOverlayViewScale(3, el)).toBe(1)
  })

  it('positions WCS overlays in root-local coordinates', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const el = document.createElement('div')
    el.className = 'mlcad-markup-dot'
    root.appendChild(el)

    acExPositionWcsOverlay(
      el,
      { x: 120, y: 80 },
      new DOMRect(20, 10, 400, 300),
      2
    )

    expect(el.style.left).toBe('100px')
    expect(el.style.top).toBe('70px')
    expect(el.style.transform).toBe('translate(-50%, -50%)')
  })

  it('scales canvas stroke width with zoom', () => {
    const canvas = document.createElement('canvas')
    expect(acExScaledCanvasLineWidth(2, canvas, 2)).toBe(2)
    expect(acExScaledCanvasLineWidth(2, canvas, 4)).toBe(4)
  })
})
