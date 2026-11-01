/** @jest-environment jsdom */

import './helpers/installTextCodecs'

import {
  ACEX_COORDINATE_BADGE_LIFT_EM,
  ACEX_COORDINATE_BADGE_REF_FONT_PX
} from '@mlightcad/cad-html-core'

import {
  ACEX_OVERLAY_ARROW_WCS,
  ACEX_OVERLAY_BASE_ZOOM,
  ACEX_OVERLAY_CLOUD_WCS,
  ACEX_OVERLAY_STROKE_WCS,
  acexOverlayTransform,
  acexOverlayViewScale,
  acexPixelsPerWorldUnit,
  acexPositionWcsOverlay,
  acexResetOverlayViewScale,
  acexScaledCanvasLineWidth,
  acexScaledOverlayArrowSize,
  acexSeedOverlaySizesFromWcs
} from '../src/AcExHtmlOverlayDom'

/** Mirrors the plugin's three-decimal CSS rounding. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

describe('AcExHtmlOverlayDom', () => {
  it('anchors view scale on first layout and scales with zoom', () => {
    const el = document.createElement('div')
    el.className = 'mlcad-measure-badge'

    expect(acexOverlayViewScale(2, el)).toBe(1)
    expect(acexOverlayViewScale(4, el)).toBe(2)
    expect(acexOverlayTransform(el, 2)).toBe('translate(-50%, -50%) scale(2)')
  })

  it('resets the zoom anchor when the overlay moves in world space', () => {
    const el = document.createElement('div')
    acexOverlayViewScale(2, el)
    acexResetOverlayViewScale(el)
    expect(acexOverlayViewScale(3, el)).toBe(1)
  })

  it('scales the coordinate bubble lift with the view so it stays off the point', () => {
    const badge = document.createElement('div')
    badge.className = 'mlcad-measure-badge mlcad-measure-badge--coordinate'

    // The reference lift is 16px at the 13px badge font size.
    expect(
      ACEX_COORDINATE_BADGE_LIFT_EM * ACEX_COORDINATE_BADGE_REF_FONT_PX
    ).toBeCloseTo(16, 1)

    expect(acexOverlayTransform(badge, 1)).toBe(
      `translate(-50%, calc(-50% - ${ACEX_COORDINATE_BADGE_LIFT_EM}em))`
    )
    // Lift grows with the capsule; a px lift would not, and the bubble would
    // drift into the point as the camera zooms in.
    expect(acexOverlayTransform(badge, 2)).toBe(
      `translate(-50%, calc(-50% - ${round3(ACEX_COORDINATE_BADGE_LIFT_EM * 2)}em)) scale(2)`
    )
    expect(acexOverlayTransform(badge, 0.5)).toBe(
      `translate(-50%, calc(-50% - ${round3(ACEX_COORDINATE_BADGE_LIFT_EM * 0.5)}em)) scale(0.5)`
    )
  })

  it('keeps the coordinate lift proportional to the badge font size', () => {
    const badge = document.createElement('div')
    badge.className = 'mlcad-measure-badge mlcad-measure-badge--coordinate'
    // em units make the gap track the capsule's own em-based padding/radius,
    // so a text-height change cannot revive the drift at 1x zoom.
    const transform = acexOverlayTransform(badge, 1)
    expect(transform).toContain('em')
    expect(transform).not.toContain('px')
  })

  it('keeps other measure badges centered without a lift', () => {
    const badge = document.createElement('div')
    badge.className = 'mlcad-measure-badge'
    expect(acexOverlayTransform(badge, 3)).toBe(
      'translate(-50%, -50%) scale(3)'
    )
  })

  it('positions WCS overlays in root-local coordinates', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const el = document.createElement('div')
    el.className = 'mlcad-markup-dot'
    root.appendChild(el)

    acexPositionWcsOverlay(
      el,
      { x: 120, y: 80 },
      new DOMRect(20, 10, 400, 300),
      2
    )

    expect(el.style.left).toBe('100px')
    expect(el.style.top).toBe('70px')
    expect(el.style.transform).toBe('translate(-50%, -50%)')
  })

  it('scales canvas stroke width with zoom (legacy path)', () => {
    const canvas = document.createElement('canvas')
    expect(acexScaledCanvasLineWidth(2, canvas, 2)).toBe(2)
    expect(acexScaledCanvasLineWidth(2, canvas, 4)).toBe(4)
  })

  it('scales canvas stroke width with WCS via wcsToScreen', () => {
    const canvas = document.createElement('canvas')
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })
    expect(acexPixelsPerWorldUnit(wcsToScreen)).toBe(10)

    const width = acexScaledCanvasLineWidth(2, canvas, 1, {
      strokeWidthWcs: 0.25,
      wcsToScreen
    })
    expect(width).toBe(2.5)

    const width2 = acexScaledCanvasLineWidth(2, canvas, 1, {
      strokeWidthWcs: 0.25,
      wcsToScreen: (wcs: { x: number; y: number }) => ({
        x: wcs.x * 20,
        y: wcs.y * 20
      })
    })
    expect(width2).toBe(5)
  })

  it('uses a 1px hairline and clears stored WCS when base width is 0', () => {
    const canvas = document.createElement('canvas')
    canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = '0.4'
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })

    expect(
      acexScaledCanvasLineWidth(0, canvas, 1, {
        strokeWidthWcs: 0.4,
        wcsToScreen
      })
    ).toBe(1)
    expect(canvas.dataset[ACEX_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('clears stored stroke WCS when seeding a hairline overlay', () => {
    const canvas = document.createElement('canvas')
    canvas.dataset[ACEX_OVERLAY_STROKE_WCS] = '0.4'
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })

    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      strokeScreenPx: 0,
      canvases: [canvas]
    })
    expect(canvas.dataset[ACEX_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('honors re-seeded stroke WCS when explicit width is omitted', () => {
    const canvas = document.createElement('canvas')
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })

    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      strokeWidthWcs: 0.2,
      canvases: [canvas]
    })
    expect(canvas.dataset[ACEX_OVERLAY_STROKE_WCS]).toBe('0.2')

    // Stale constructor WCS would overwrite; omit so dataset wins after style edit.
    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      strokeWidthWcs: 0.4,
      canvases: [canvas]
    })
    const width = acexScaledCanvasLineWidth(2, canvas, 2, { wcsToScreen })
    expect(width).toBe(4)
  })

  it('seeds DOM baseZoom only from matched text screen/WCS pair', () => {
    const el = document.createElement('div')
    const canvas = document.createElement('canvas')
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })

    // Font size without textHeightWcs must not pair with stroke WCS.
    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      fontSizePx: 13,
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      elements: [el],
      canvases: [canvas]
    })
    expect(el.dataset[ACEX_OVERLAY_BASE_ZOOM]).toBeUndefined()
    expect(canvas.dataset[ACEX_OVERLAY_STROKE_WCS]).toBe('0.4')
    expect(canvas.dataset[ACEX_OVERLAY_CLOUD_WCS]).toBe('1.28')

    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      strokeWidthWcs: 0.8,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset[ACEX_OVERLAY_CLOUD_WCS]).toBe('2.56')

    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      fontSizePx: 13,
      textHeightWcs: 1.3,
      elements: [el]
    })
    // base = (13 * 2) / (1.3 * 10) = 2
    expect(el.dataset[ACEX_OVERLAY_BASE_ZOOM]).toBe('2')
  })

  it('scales overlay endpoint grips with zoom', () => {
    const el = document.createElement('div')
    el.className = 'mlcad-markup-dot ml-html-grip'
    acexPositionWcsOverlay(el, { x: 10, y: 10 }, new DOMRect(0, 0, 100, 100), 2)
    acexPositionWcsOverlay(el, { x: 10, y: 10 }, new DOMRect(0, 0, 100, 100), 4)
    expect(el.style.transform).toBe('translate(-50%, -50%) scale(2)')
  })

  it('seeds view-scale on overlay grips from WCS text size', () => {
    const grip = document.createElement('div')
    grip.className = 'mlcad-measure-dot'
    const badge = document.createElement('div')
    const wcsToScreen = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })
    acexSeedOverlaySizesFromWcs(2, wcsToScreen, {
      fontSizePx: 13,
      textHeightWcs: 1.3,
      arrowSizeWcs: 1.2,
      elements: [grip, badge],
      canvases: [grip]
    })
    expect(grip.dataset[ACEX_OVERLAY_BASE_ZOOM]).toBe('2')
    expect(badge.dataset[ACEX_OVERLAY_BASE_ZOOM]).toBe('2')
    expect(grip.style.fontSize).toBe('13px')
    expect(grip.dataset[ACEX_OVERLAY_ARROW_WCS]).toBe('1.2')
  })

  it('freezes committed distance arrows as WCS on first paint', () => {
    const canvas = document.createElement('canvas')
    const at10 = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })
    const at5 = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 5,
      y: wcs.y * 5
    })
    expect(acexScaledOverlayArrowSize(canvas, at10)).toBe(12)
    expect(Number(canvas.dataset[ACEX_OVERLAY_ARROW_WCS])).toBeCloseTo(1.2)
    expect(acexScaledOverlayArrowSize(canvas, at5)).toBeCloseTo(6)
  })

  it('uses imported arrowSizeWcs instead of seeding from screen pixels', () => {
    const canvas = document.createElement('canvas')
    const at10 = (wcs: { x: number; y: number }) => ({
      x: wcs.x * 10,
      y: wcs.y * 10
    })
    expect(acexScaledOverlayArrowSize(canvas, at10, 2.4)).toBeCloseTo(24)
    expect(canvas.dataset[ACEX_OVERLAY_ARROW_WCS]).toBe('2.4')
  })
})
