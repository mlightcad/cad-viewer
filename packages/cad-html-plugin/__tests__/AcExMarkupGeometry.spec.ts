import {
  acexComputeLeaderTipOnShape,
  acexHitTestMarkupShapeOutline,
  acexIsAttachableShapeMarkup,
  acexMarkupBounds,
  acexMarkupFocusExtents,
  acexMarkupShapeOutlineFromGeometry,
  acexOverlayArrowSize
} from '../src/AcExMarkupGeometry'
import type { AcExMarkupGeometry } from '../src/AcExMarkupTypes'

const identity = (point: { x: number; y: number }) => point

describe('AcExComputeLeaderTipOnShape', () => {
  it('places tip on circle perimeter toward the cursor', () => {
    const tip = acexComputeLeaderTipOnShape(
      { kind: 'circle', center: { x: 0, y: 0 }, radius: 10 },
      { x: 100, y: 0 }
    )
    expect(tip.x).toBeCloseTo(10)
    expect(tip.y).toBeCloseTo(0)
  })

  it('places tip on AABB edge for rect/cloud', () => {
    const tip = acexComputeLeaderTipOnShape(
      {
        kind: 'rect',
        corner1: { x: -5, y: -2 },
        corner2: { x: 5, y: 2 }
      },
      { x: 50, y: 0 }
    )
    expect(tip.x).toBeCloseTo(5)
    expect(tip.y).toBeCloseTo(0)
  })
})

describe('AcExIsAttachableShapeMarkup', () => {
  it('is true only for cloud/rect/circle without a callout', () => {
    expect(
      acexIsAttachableShapeMarkup({
        type: 'rect',
        corner1: { x: 0, y: 0 },
        corner2: { x: 10, y: 10 }
      })
    ).toBe(true)
    expect(
      acexIsAttachableShapeMarkup({
        type: 'circle',
        center: { x: 0, y: 0 },
        radius: 4,
        callout: { tip: { x: 4, y: 0 }, anchor: { x: 10, y: 0 } }
      })
    ).toBe(false)
  })
})

describe('AcExHitTestMarkupShapeOutline', () => {
  const threshold = 4

  it('hits a rect outer frame but not the interior', () => {
    const geometry: AcExMarkupGeometry = {
      type: 'rect',
      corner1: { x: 0, y: 0 },
      corner2: { x: 40, y: 20 }
    }
    expect(
      acexHitTestMarkupShapeOutline(geometry, 20, 0, threshold, identity)
    ).toBe(true)
    expect(
      acexHitTestMarkupShapeOutline(geometry, 20, 10, threshold, identity)
    ).toBe(false)
  })

  it('hits a circle circumference but not the center', () => {
    const geometry: AcExMarkupGeometry = {
      type: 'circle',
      center: { x: 0, y: 0 },
      radius: 20
    }
    expect(
      acexHitTestMarkupShapeOutline(geometry, 20, 0, threshold, identity)
    ).toBe(true)
    expect(
      acexHitTestMarkupShapeOutline(geometry, 0, 0, threshold, identity)
    ).toBe(false)
  })
})

describe('AcExMarkupShapeOutlineFromGeometry', () => {
  it('maps cloud geometry to an AABB outline', () => {
    expect(
      acexMarkupShapeOutlineFromGeometry({
        type: 'cloud',
        corner1: { x: 1, y: 2 },
        corner2: { x: 3, y: 4 }
      })
    ).toEqual({
      kind: 'cloud',
      corner1: { x: 1, y: 2 },
      corner2: { x: 3, y: 4 }
    })
  })
})

describe('AcExMarkupBounds', () => {
  it('unions a cloud AABB with its attached leader and text-box anchor', () => {
    expect(
      acexMarkupBounds({
        type: 'cloud',
        corner1: { x: 0, y: 0 },
        corner2: { x: 20, y: 10 },
        callout: { tip: { x: 20, y: 5 }, anchor: { x: 80, y: 40 } }
      })
    ).toEqual({ minX: 0, minY: 0, maxX: 80, maxY: 40 })
  })

  it('includes both callout leader tip and text-box anchor', () => {
    expect(
      acexMarkupBounds({
        type: 'callout',
        tip: { x: 0, y: 0 },
        anchor: { x: 100, y: -30 }
      })
    ).toEqual({ minX: 0, minY: -30, maxX: 100, maxY: 0 })
  })
})

describe('AcExMarkupFocusExtents', () => {
  it('unions geometry with overlay client rectangles', () => {
    expect(
      acexMarkupFocusExtents(
        {
          type: 'callout',
          tip: { x: 0, y: 0 },
          anchor: { x: 10, y: 0 }
        },
        [{ left: 100, top: 20, right: 180, bottom: 60 }],
        (clientX, clientY) => ({ x: clientX / 10, y: -clientY / 10 })
      )
    ).toEqual({ minX: 0, minY: -6, maxX: 18, maxY: 0 })
  })
})

describe('AcExOverlayArrowSize', () => {
  it('scales arrow heads with stroke width', () => {
    expect(acexOverlayArrowSize(2, 2)).toBe(12)
    expect(acexOverlayArrowSize(4, 2)).toBe(24)
  })

  it('keeps a 12px arrow for hairline strokes', () => {
    expect(acexOverlayArrowSize(1, 0)).toBe(12)
  })
})
