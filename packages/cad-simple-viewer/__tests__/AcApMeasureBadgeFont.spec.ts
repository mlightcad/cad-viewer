/** @jest-environment jsdom */

import {
  acapClampMeasureBadgeFontSize,
  acapEstimateMeasureBadgeWidthPx,
  acapMeasureBadgeChromePx,
  acapScaleMeasureOverlayPx,
  acapScreenAngleBadgeRefLengthPx,
  acapScreenArcLengthPx,
  acapScreenAreaBadgeRefLengthPx
} from '../src/util/AcApMeasureBadgeFont'

const originalGetContext = HTMLCanvasElement.prototype.getContext

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
})

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
})

describe('acapClampMeasureBadgeFontSize', () => {
  it('keeps the preferred size when the capsule fits in half the segment', () => {
    const text = '12.34'
    const fontSize = 13
    const width = acapEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = width * 2 + 20
    expect(acapClampMeasureBadgeFontSize(text, fontSize, linePx)).toBe(fontSize)
  })

  it('shrinks the font so the capsule is at most half the segment', () => {
    const text = '1234.567 m'
    const fontSize = 24
    const preferredWidth = acapEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = preferredWidth * 0.6
    const clamped = acapClampMeasureBadgeFontSize(text, fontSize, linePx)
    expect(clamped).toBeLessThan(fontSize)
    const clampedWidth = acapEstimateMeasureBadgeWidthPx(text, clamped)
    expect(clampedWidth).toBeLessThanOrEqual(linePx * 0.5 + 0.5)
  })

  it('scales capsule chrome with font size', () => {
    const at13 = acapMeasureBadgeChromePx(13)
    const at6_5 = acapMeasureBadgeChromePx(6.5)
    expect(at6_5).toBeLessThan(at13)
    expect(at6_5).toBeCloseTo(at13 / 2, 5)
  })

  it('returns a minimal size when the segment is empty', () => {
    expect(acapClampMeasureBadgeFontSize('1', 13, 0.5)).toBe(1)
  })
})

describe('acapScaleMeasureOverlayPx', () => {
  it('scales arrows with the font clamp ratio', () => {
    expect(acapScaleMeasureOverlayPx(12, 13, 13)).toBe(12)
    expect(acapScaleMeasureOverlayPx(12, 13, 6.5)).toBeCloseTo(6, 5)
  })
})

const identity = (p: { x: number; y: number }) => p

describe('acap screen badge reference lengths', () => {
  it('uses half the shorter angle arm (arc radius)', () => {
    expect(
      acapScreenAngleBadgeRefLengthPx(
        identity,
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 40 }
      )
    ).toBe(20)
  })

  it('scales arc length by screen radius ratio', () => {
    const worldToScreen = (p: { x: number; y: number }) => ({
      x: p.x * 2,
      y: p.y * 2
    })
    expect(
      acapScreenArcLengthPx(worldToScreen, { x: 0, y: 0 }, 10, Math.PI * 10)
    ).toBeCloseTo(Math.PI * 20, 5)
  })

  it('uses the shorter of min edge and twice centroid-to-edge for area', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
    // Centroid is (50,50); nearest edge distance is 50; 2× = 100; min edge = 100.
    expect(acapScreenAreaBadgeRefLengthPx(identity, square)).toBe(100)
  })
})
