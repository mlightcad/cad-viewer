/** @jest-environment jsdom */

import {
  ACAP_OVERLAY_ARROW_WCS,
  ACAP_OVERLAY_STROKE_WCS,
  acapOverlayArrowSize,
  acapOverlayDash,
  acapScaledOverlayArrowSize,
  acapScaledOverlayLineWidth,
  acapSeedOverlaySizesFromWcs
} from '../src/command/overlay/AcApOverlayDrawUtil'
import type { AcEdBaseView } from '../src/editor'

function mockView(ppu: number): AcEdBaseView {
  return {
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * ppu,
      y: p.y * ppu
    }),
    internalCamera: { zoom: 2 }
  } as unknown as AcEdBaseView
}

describe('AcApOverlayDrawUtil WCS stroke', () => {
  it('uses re-seeded dataset when explicit strokeWidthWcs is omitted', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')

    acapSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.2,
      canvases: [canvas]
    })
    expect(canvas.dataset[ACAP_OVERLAY_STROKE_WCS]).toBe('0.2')

    // Simulate style edit: seed new WCS, then redraw without stale constructor WCS.
    acapSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.4,
      canvases: [canvas]
    })
    expect(acapScaledOverlayLineWidth(2.5, canvas, view)).toBe(4)

    // Explicit stale WCS would overwrite the seeded dataset (the bug we fixed).
    expect(acapScaledOverlayLineWidth(2.5, canvas, view, 0.2)).toBe(2)
    expect(canvas.dataset[ACAP_OVERLAY_STROKE_WCS]).toBe('0.2')
  })

  it('uses a 1px hairline and clears stored WCS when base width is 0', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    canvas.dataset[ACAP_OVERLAY_STROKE_WCS] = '0.4'

    expect(acapScaledOverlayLineWidth(0, canvas, view, 0.4)).toBe(1)
    expect(canvas.dataset[ACAP_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('clears stored stroke WCS when seeding a hairline overlay', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    canvas.dataset[ACAP_OVERLAY_STROKE_WCS] = '0.4'

    acapSeedOverlaySizesFromWcs(view, {
      strokeScreenPx: 0,
      canvases: [canvas]
    })
    expect(canvas.dataset[ACAP_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('seeds element baseZoom only from matched text screen/WCS pair', () => {
    const view = mockView(10)
    const el = {
      scaleWithView: true,
      baseZoom: undefined as number | undefined
    }
    const canvas = document.createElement('canvas')

    acapSeedOverlaySizesFromWcs(view, {
      fontSizePx: 13,
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      elements: [el as never],
      canvases: [canvas]
    })
    expect(el.baseZoom).toBeUndefined()
    expect(canvas.dataset[ACAP_OVERLAY_STROKE_WCS]).toBe('0.4')

    acapSeedOverlaySizesFromWcs(view, {
      fontSizePx: 13,
      textHeightWcs: 1.3,
      elements: [el as never]
    })
    // base = (13 * 2) / (1.3 * 10) = 2
    expect(el.baseZoom).toBe(2)
  })
})

describe('AcApOverlayDrawUtil arrow and dash scale', () => {
  it('scales arrow head with the view-synced stroke', () => {
    expect(acapOverlayArrowSize(2, 2)).toBe(12)
    expect(acapOverlayArrowSize(4, 2)).toBe(24)
    expect(acapOverlayArrowSize(2.5, 2.5)).toBe(12)
  })

  it('scales dash pattern with the view-synced stroke', () => {
    expect(acapOverlayDash(2, 2)).toEqual([8, 5])
    expect(acapOverlayDash(4, 2)).toEqual([16, 10])
  })

  it('keeps a 12px arrow for hairline strokes', () => {
    expect(acapOverlayArrowSize(1, 0)).toBe(12)
  })

  it('scales distance arrows in WCS independently of hairline stroke', () => {
    const canvas = document.createElement('canvas')
    expect(acapScaledOverlayArrowSize(canvas, mockView(10))).toBe(12)
    expect(Number(canvas.dataset[ACAP_OVERLAY_ARROW_WCS])).toBeCloseTo(1.2)
    expect(acapScaledOverlayArrowSize(canvas, mockView(5))).toBeCloseTo(6)
  })

  it('seeds cloud lobe WCS from the stroke screen/WCS pair', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    acapSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset.overlayCloudWcs).toBe('1.28')

    acapSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.8,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset.overlayCloudWcs).toBe('2.56')
  })
})
