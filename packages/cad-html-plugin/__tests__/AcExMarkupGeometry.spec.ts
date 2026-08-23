import {
  acExComputeLeaderTipOnShape,
  acExHitTestMarkupShapeOutline,
  acExIsAttachableShapeMarkup,
  acExMarkupShapeOutlineFromGeometry
} from '../src/AcExMarkupGeometry'
import type { AcExMarkupGeometry } from '../src/AcExMarkupTypes'

const identity = (point: { x: number; y: number }) => point

describe('acExComputeLeaderTipOnShape', () => {
  it('places tip on circle perimeter toward the cursor', () => {
    const tip = acExComputeLeaderTipOnShape(
      { kind: 'circle', center: { x: 0, y: 0 }, radius: 10 },
      { x: 100, y: 0 }
    )
    expect(tip.x).toBeCloseTo(10)
    expect(tip.y).toBeCloseTo(0)
  })

  it('places tip on AABB edge for rect/cloud', () => {
    const tip = acExComputeLeaderTipOnShape(
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

describe('acExIsAttachableShapeMarkup', () => {
  it('is true only for cloud/rect/circle without a callout', () => {
    expect(
      acExIsAttachableShapeMarkup({
        type: 'rect',
        corner1: { x: 0, y: 0 },
        corner2: { x: 10, y: 10 }
      })
    ).toBe(true)
    expect(
      acExIsAttachableShapeMarkup({
        type: 'circle',
        center: { x: 0, y: 0 },
        radius: 4,
        callout: { tip: { x: 4, y: 0 }, anchor: { x: 10, y: 0 } }
      })
    ).toBe(false)
  })
})

describe('acExHitTestMarkupShapeOutline', () => {
  const threshold = 4

  it('hits a rect outer frame but not the interior', () => {
    const geometry: AcExMarkupGeometry = {
      type: 'rect',
      corner1: { x: 0, y: 0 },
      corner2: { x: 40, y: 20 }
    }
    expect(
      acExHitTestMarkupShapeOutline(geometry, 20, 0, threshold, identity)
    ).toBe(true)
    expect(
      acExHitTestMarkupShapeOutline(geometry, 20, 10, threshold, identity)
    ).toBe(false)
  })

  it('hits a circle circumference but not the center', () => {
    const geometry: AcExMarkupGeometry = {
      type: 'circle',
      center: { x: 0, y: 0 },
      radius: 20
    }
    expect(
      acExHitTestMarkupShapeOutline(geometry, 20, 0, threshold, identity)
    ).toBe(true)
    expect(
      acExHitTestMarkupShapeOutline(geometry, 0, 0, threshold, identity)
    ).toBe(false)
  })
})

describe('acExMarkupShapeOutlineFromGeometry', () => {
  it('maps cloud geometry to an AABB outline', () => {
    expect(
      acExMarkupShapeOutlineFromGeometry({
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
