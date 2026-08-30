import {
  MEASURE_ANGLE_ARC_RADIUS_FRACTION,
  measureAngleArcRadiusWcs
} from '../src/command/measure/AcApMeasureAngleArc'

describe('measureAngleArcRadiusWcs', () => {
  it('uses 30% of the shorter world-space arm', () => {
    expect(
      measureAngleArcRadiusWcs(
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 0, y: 10 }
      )
    ).toBe(10 * MEASURE_ANGLE_ARC_RADIUS_FRACTION)
    expect(MEASURE_ANGLE_ARC_RADIUS_FRACTION).toBe(0.3)
  })

  it('does not apply a screen-pixel minimum', () => {
    expect(
      measureAngleArcRadiusWcs(
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 }
      )
    ).toBeCloseTo(1.2)
  })
})
