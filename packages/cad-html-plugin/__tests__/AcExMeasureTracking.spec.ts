import { constrainToAcExTracking } from '../src/AcExMeasureTracking'

describe('constrainToAcExTracking', () => {
  const reference = { x: 0, y: 0 }

  it('returns the point unchanged when tracking is disabled', () => {
    const point = { x: 10, y: 3 }
    expect(
      constrainToAcExTracking(point, reference, {
        ortho: false,
        polar: false,
        polarAng: 90,
        angbase: 0,
        angdir: 0
      })
    ).toEqual(point)
  })

  it('locks to horizontal when ortho is enabled', () => {
    const point = { x: 10, y: 3 }
    expect(
      constrainToAcExTracking(point, reference, {
        ortho: true,
        polar: false,
        polarAng: 90,
        angbase: 0,
        angdir: 0
      })
    ).toEqual({ x: 10, y: 0 })
  })

  it('locks to vertical when ortho prefers Y', () => {
    const point = { x: 2, y: 10 }
    expect(
      constrainToAcExTracking(point, reference, {
        ortho: true,
        polar: false,
        polarAng: 90,
        angbase: 0,
        angdir: 0
      })
    ).toEqual({ x: 0, y: 10 })
  })

  it('snaps to 45° when polar tracking is enabled', () => {
    const point = { x: 10, y: 9 }
    const result = constrainToAcExTracking(point, reference, {
      ortho: false,
      polar: true,
      polarAng: 45,
      angbase: 0,
      angdir: 0
    })
    const angle = Math.atan2(result.y, result.x)
    expect(Math.abs(angle - Math.PI / 4)).toBeLessThan(0.01)
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(Math.hypot(10, 9), 5)
  })
})
