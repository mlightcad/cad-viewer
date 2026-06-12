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

  it('parses relative cartesian coordinates', () => {
    expect(
      pointHandler.parseCommandLine('@10,5', {
        referencePoint: { x: 100, y: 200 }
      })
    ).toEqual({ x: 110, y: 205, z: 0 })
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

  it('parses rubber-band distance along cursor direction', () => {
    const point = pointHandler.parseCommandLine('10', {
      referencePoint: { x: 0, y: 0 },
      cursorPoint: { x: 0, y: 5 }
    })
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
  })

  it('returns null for ambiguous keyword-like point tokens', () => {
    expect(pointHandler.parseCommandLine('C')).toBeNull()
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
