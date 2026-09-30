/** @jest-environment jsdom */

import {
  acexClampMeasureBadgeFontSize,
  acexEstimateMeasureBadgeWidthPx,
  acexMeasureBadgeChromePx,
  acexScreenAngleBadgeRefLengthPx,
  acexScreenArcLengthPx,
  acexScreenAreaBadgeRefLengthPx
} from '../src/AcExMeasureBadgeFont'

const originalGetContext = HTMLCanvasElement.prototype.getContext

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
})

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
})

describe('acexClampMeasureBadgeFontSize', () => {
  it('keeps the preferred size when the capsule fits in half the segment', () => {
    const text = '12.34'
    const fontSize = 13
    const width = acexEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = width * 2 + 20
    expect(acexClampMeasureBadgeFontSize(text, fontSize, linePx)).toBe(fontSize)
  })

  it('shrinks the font so the capsule is at most half the segment', () => {
    const text = '1234.567 m'
    const fontSize = 24
    const preferredWidth = acexEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = preferredWidth * 0.6
    const clamped = acexClampMeasureBadgeFontSize(text, fontSize, linePx)
    expect(clamped).toBeLessThan(fontSize)
    const clampedWidth = acexEstimateMeasureBadgeWidthPx(text, clamped)
    expect(clampedWidth).toBeLessThanOrEqual(linePx * 0.5 + 0.5)
  })

  it('scales capsule chrome with font size', () => {
    const at12 = acexMeasureBadgeChromePx(12)
    const at6 = acexMeasureBadgeChromePx(6)
    expect(at6).toBeLessThan(at12)
    expect(at6).toBeCloseTo(at12 / 2, 5)
  })

  it('returns a minimal size when the segment is empty', () => {
    expect(acexClampMeasureBadgeFontSize('1', 13, 0.5)).toBe(1)
  })
})

const identity = (p: { x: number; y: number }) => p

describe('acex screen badge reference lengths', () => {
  it('uses half the shorter angle arm (arc radius)', () => {
    expect(
      acexScreenAngleBadgeRefLengthPx(
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
      acexScreenArcLengthPx(worldToScreen, { x: 0, y: 0 }, 10, Math.PI * 10)
    ).toBeCloseTo(Math.PI * 20, 5)
  })

  it('uses the shorter of min edge and twice centroid-to-edge for area', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
    expect(acexScreenAreaBadgeRefLengthPx(identity, square)).toBe(100)
  })
})
