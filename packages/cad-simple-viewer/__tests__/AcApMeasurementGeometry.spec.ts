import {
  hitTestMeasurementGeometry,
  measurementGeometryBounds
} from '../src/command/measure/AcApMeasurementGeometry'
import type { AcApMeasurementGeometry } from '../src/command/measure/AcApMeasurementTypes'

const identity = (point: { x: number; y: number }) => point

describe('hitTestMeasurementGeometry', () => {
  const threshold = 4

  it('hits a distance measurement on the line', () => {
    const geometry: AcApMeasurementGeometry = {
      type: 'distance',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 }
    }
    expect(
      hitTestMeasurementGeometry(geometry, { x: 50, y: 1 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMeasurementGeometry(
        geometry,
        { x: 50, y: 20 },
        identity,
        threshold
      )
    ).toBe(false)
  })

  it('hits an angle measurement on an arm', () => {
    const geometry: AcApMeasurementGeometry = {
      type: 'angle',
      vertex: { x: 0, y: 0 },
      arm1: { x: 40, y: 0 },
      arm2: { x: 0, y: 40 }
    }
    expect(
      hitTestMeasurementGeometry(geometry, { x: 20, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMeasurementGeometry(
        geometry,
        { x: 30, y: 30 },
        identity,
        threshold
      )
    ).toBe(false)
  })

  it('hits an area measurement on the fill and the outline', () => {
    const geometry: AcApMeasurementGeometry = {
      type: 'area',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
        { x: 0, y: 30 }
      ]
    }
    expect(
      hitTestMeasurementGeometry(geometry, { x: 20, y: 15 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMeasurementGeometry(geometry, { x: 40, y: 15 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMeasurementGeometry(
        geometry,
        { x: 80, y: 15 },
        identity,
        threshold
      )
    ).toBe(false)
  })
})

describe('measurementGeometryBounds', () => {
  it('returns the AABB of a distance measurement', () => {
    const box = measurementGeometryBounds({
      type: 'distance',
      start: { x: 0, y: 10 },
      end: { x: 50, y: 0 }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(0)
    expect(box!.min.y).toBe(0)
    expect(box!.max.x).toBe(50)
    expect(box!.max.y).toBe(10)
  })

  it('uses the full circle AABB for an arc', () => {
    const box = measurementGeometryBounds({
      type: 'arc',
      center: { x: 0, y: 0 },
      radius: 25,
      start: { x: 25, y: 0 },
      end: { x: 0, y: 25 }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(-25)
    expect(box!.min.y).toBe(-25)
    expect(box!.max.x).toBe(25)
    expect(box!.max.y).toBe(25)
  })
})
