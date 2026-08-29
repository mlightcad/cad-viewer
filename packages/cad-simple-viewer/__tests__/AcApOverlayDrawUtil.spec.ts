/** @jest-environment jsdom */

import {
  ACAP_OVERLAY_STROKE_WCS,
  acapOverlayArrowSize,
  acapOverlayDash,
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

  it('seeds cloud lobe WCS from the stroke screen/WCS pair', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    acapSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset.overlayCloudWcs).toBe('1.28')
  })
})
