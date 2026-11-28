/** @jest-environment jsdom */

import { AcGePoint3d } from '@mlightcad/data-model'

import {
  acedComputeSessionMetrics
} from '../src/editor/input/ui/AcEdMobileSessionMetrics'
import { AcApUcsService } from '../src/service/AcApUcsService'

describe('acedComputeSessionMetrics', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns absolute X/Y when no base point is given', () => {
    expect(acedComputeSessionMetrics({ x: 10, y: 20 })).toEqual({
      hasBasePoint: false,
      length: 0,
      angleDeg: 0,
      dx: 0,
      dy: 0,
      x: 10,
      y: 20
    })
  })

  it('computes length, angle, and deltas from a base point', () => {
    const metrics = acedComputeSessionMetrics({ x: 40, y: 30 }, { x: 10, y: 30 })
    expect(metrics.hasBasePoint).toBe(true)
    expect(metrics.dx).toBe(30)
    expect(metrics.dy).toBe(0)
    expect(metrics.length).toBe(30)
    expect(metrics.angleDeg).toBe(0)
    expect(metrics.x).toBe(40)
    expect(metrics.y).toBe(30)
  })

  it('normalizes negative atan2 angles into 0–360', () => {
    const metrics = acedComputeSessionMetrics({ x: 10, y: 0 }, { x: 10, y: 10 })
    expect(metrics.dy).toBe(-10)
    expect(metrics.angleDeg).toBe(270)
  })

  it('reports absolute X/Y and deltas in the active UCS', () => {
    jest.spyOn(AcApUcsService, 'getActiveFrame').mockReturnValue({
      origin: new AcGePoint3d(10, 20, 0),
      xAxis: new AcGePoint3d(0, 1, 0),
      yAxis: new AcGePoint3d(-1, 0, 0)
    })

    // WCS (10, 20) is UCS origin → (0, 0); WCS (10, 50) is UCS (30, 0).
    expect(acedComputeSessionMetrics({ x: 10, y: 20 })).toMatchObject({
      x: 0,
      y: 0
    })
    const metrics = acedComputeSessionMetrics(
      { x: 10, y: 50 },
      { x: 10, y: 20 }
    )
    expect(metrics.dx).toBeCloseTo(30)
    expect(metrics.dy).toBeCloseTo(0)
    expect(metrics.angleDeg).toBeCloseTo(0)
    expect(metrics.x).toBeCloseTo(30)
    expect(metrics.y).toBeCloseTo(0)
  })
})
