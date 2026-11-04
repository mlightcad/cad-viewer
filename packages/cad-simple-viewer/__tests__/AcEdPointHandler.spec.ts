import { AcEdDistanceHandler } from '../src/editor/input/handler/AcEdDistanceHandler'
import { AcEdPointHandler } from '../src/editor/input/handler/AcEdPointHandler'
import { AcEdPromptDistanceOptions } from '../src/editor/input/prompt/AcEdPromptDistanceOptions'
import { AcEdPromptPointOptions } from '../src/editor/input/prompt/AcEdPromptPointOptions'

describe('AcEdPointHandler.parseCommandLine', () => {
  const pointHandler = new AcEdPointHandler(new AcEdPromptPointOptions('point'))

  it('parses absolute cartesian coordinates', () => {
    expect(pointHandler.parseCommandLine('50,30')).toEqual({
      x: 50,
      y: 30,
      z: 0
    })
  })

  it('parses absolute cartesian coordinates with Z', () => {
    expect(pointHandler.parseCommandLine('50,30,10')).toEqual({
      x: 50,
      y: 30,
      z: 10
    })
  })

  it('parses whitespace-separated cartesian coordinates', () => {
    expect(pointHandler.parseCommandLine('50 30')).toEqual({
      x: 50,
      y: 30,
      z: 0
    })
  })

  it('parses relative cartesian coordinates', () => {
    expect(
      pointHandler.parseCommandLine('@10,5', {
        referencePoint: { x: 100, y: 200 }
      })
    ).toEqual({ x: 110, y: 205, z: 0 })
  })

  it('parses relative cartesian coordinates with Z', () => {
    expect(
      pointHandler.parseCommandLine('@10,5,3', {
        referencePoint: { x: 100, y: 200 }
      })
    ).toEqual({ x: 110, y: 205, z: 3 })
  })

  it('parses # absolute cartesian override', () => {
    expect(pointHandler.parseCommandLine('#3,4')).toEqual({
      x: 3,
      y: 4,
      z: 0
    })
  })

  it('parses # absolute polar override', () => {
    const point = pointHandler.parseCommandLine('#10<90')
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
    expect(point?.z).toBe(0)
  })

  it('parses * WCS absolute cartesian', () => {
    expect(pointHandler.parseCommandLine('*3,4')).toEqual({
      x: 3,
      y: 4,
      z: 0
    })
  })

  it('parses @* WCS relative cartesian', () => {
    expect(
      pointHandler.parseCommandLine('@*2,0', {
        referencePoint: { x: 10, y: 20 }
      })
    ).toEqual({ x: 12, y: 20, z: 0 })
  })

  it('parses #* absolute WCS cartesian', () => {
    expect(pointHandler.parseCommandLine('#*5,6')).toEqual({
      x: 5,
      y: 6,
      z: 0
    })
  })

  it('parses absolute polar coordinates', () => {
    const point = pointHandler.parseCommandLine('10<90')
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
  })

  it('parses relative polar coordinates', () => {
    const point = pointHandler.parseCommandLine('@10<0', {
      referencePoint: { x: 5, y: 5 }
    })
    expect(point).toEqual({ x: 15, y: 5, z: 0 })
  })

  it('parses absolute cylindrical coordinates', () => {
    const point = pointHandler.parseCommandLine('10<0,5')
    expect(point).toEqual({ x: 10, y: 0, z: 5 })
  })

  it('parses relative cylindrical coordinates', () => {
    const point = pointHandler.parseCommandLine('@4<90,2', {
      referencePoint: { x: 1, y: 2 }
    })
    expect(point?.x).toBeCloseTo(1, 5)
    expect(point?.y).toBeCloseTo(6, 5)
    expect(point?.z).toBe(2)
  })

  it('parses absolute spherical coordinates', () => {
    // distance 10, azimuth 0°, elevation 0° → (10, 0, 0)
    expect(pointHandler.parseCommandLine('10<0<0')).toEqual({
      x: 10,
      y: 0,
      z: 0
    })

    // distance 10, azimuth 0°, elevation 90° → (0, 0, 10)
    const up = pointHandler.parseCommandLine('10<0<90')
    expect(up?.x).toBeCloseTo(0, 5)
    expect(up?.y).toBeCloseTo(0, 5)
    expect(up?.z).toBeCloseTo(10, 5)
  })

  it('parses relative spherical coordinates', () => {
    const point = pointHandler.parseCommandLine('@10<0<0', {
      referencePoint: { x: 5, y: 5 }
    })
    expect(point).toEqual({ x: 15, y: 5, z: 0 })
  })

  it('parses rubber-band distance along cursor direction', () => {
    const point = pointHandler.parseCommandLine('10', {
      referencePoint: { x: 0, y: 0 },
      cursorPoint: { x: 0, y: 5 }
    })
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
  })

  it('rejects prefixed lone numbers', () => {
    const context = {
      referencePoint: { x: 0, y: 0 },
      cursorPoint: { x: 1, y: 0 }
    }
    expect(pointHandler.parseCommandLine('#10', context)).toBeNull()
    expect(pointHandler.parseCommandLine('@10', context)).toBeNull()
    expect(pointHandler.parseCommandLine('*10', context)).toBeNull()
  })

  it('rejects incomplete polar and cylindrical tokens', () => {
    expect(pointHandler.parseCommandLine('<90')).toBeNull()
    expect(pointHandler.parseCommandLine('10<')).toBeNull()
    expect(pointHandler.parseCommandLine('10<45,')).toBeNull()
    expect(pointHandler.parseCommandLine('10<,5')).toBeNull()
    expect(pointHandler.parseCommandLine('<<90')).toBeNull()
    expect(pointHandler.parseCommandLine('<0<45')).toBeNull()
  })

  it('adds relative Z to the reference Z', () => {
    expect(
      pointHandler.parseCommandLine('@0,0,5', {
        referencePoint: { x: 1, y: 2, z: 10 }
      })
    ).toEqual({ x: 1, y: 2, z: 15 })

    const cylindrical = pointHandler.parseCommandLine('@4<90,2', {
      referencePoint: { x: 1, y: 2, z: 10 }
    })
    expect(cylindrical?.x).toBeCloseTo(1, 5)
    expect(cylindrical?.y).toBeCloseTo(6, 5)
    expect(cylindrical?.z).toBe(12)
  })

  it('returns null for ambiguous keyword-like point tokens', () => {
    expect(pointHandler.parseCommandLine('C')).toBeNull()
  })

  it('returns null for relative entry without a reference point', () => {
    expect(pointHandler.parseCommandLine('@10,5')).toBeNull()
  })

  it('returns null for bare distance without rubber-band context', () => {
    expect(pointHandler.parseCommandLine('10')).toBeNull()
  })
})

describe('AcEdDistanceHandler.parseCommandLine', () => {
  it('delegates numeric parsing to parse', () => {
    const handler = new AcEdDistanceHandler(
      new AcEdPromptDistanceOptions('distance')
    )
    expect(handler.parseCommandLine('12.5')).toBe(12.5)
  })
})
