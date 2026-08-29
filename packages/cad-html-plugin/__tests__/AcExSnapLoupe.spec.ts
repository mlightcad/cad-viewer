import {
  acExCssRectToWcsBox,
  acExCssTopLeftRectToGl,
  acExIntersectCssRects,
  acExWcsBoxToCssRect
} from '../src/AcExCssRect'
import { acExLoupeLocalFromCanvasDelta } from '../src/AcExSnapLoupe'
import { AcExTouchPointSession } from '../src/AcExTouchPointSession'

describe('AcExCssRect', () => {
  it('converts CSS top-left rectangles to WebGL bottom-left', () => {
    expect(
      acExCssTopLeftRectToGl({ x: 8, y: 8, width: 128, height: 128 }, 600)
    ).toEqual({ x: 8, y: 464, width: 128, height: 128 })
  })

  it('maps a world box onto a screen rect and back', () => {
    const viewBox = { minX: 0, minY: 0, maxX: 100, maxY: 50 }
    const screen = { x: 10, y: 20, width: 200, height: 100 }
    const css = acExWcsBoxToCssRect(
      { minX: 25, minY: 10, maxX: 75, maxY: 40 },
      viewBox,
      screen
    )
    expect(css.x).toBeCloseTo(60)
    expect(css.width).toBeCloseTo(100)
    expect(css.height).toBeCloseTo(60)
    const roundTrip = acExCssRectToWcsBox(css, viewBox, screen)
    expect(roundTrip.minX).toBeCloseTo(25)
    expect(roundTrip.maxY).toBeCloseTo(40)
    expect(acExIntersectCssRects(screen, { x: 0, y: 0, width: 5, height: 5 })).toBeNull()
  })
})

describe('AcExTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('defers the loupe until the long-press timer and commits on end', () => {
    const onLongPress = jest.fn()
    const session = new AcExTouchPointSession()
    session.start(7, 1, 2, onLongPress, 350)
    expect(session.end()).toBe('commit')
    session.start(7, 1, 2, onLongPress, 350)
    jest.advanceTimersByTime(350)
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(session.end()).toBe('commit')
  })
})

describe('acExLoupeLocalFromCanvasDelta', () => {
  it('scales canvas deltas by the loupe zoom about the center', () => {
    expect(acExLoupeLocalFromCanvasDelta(2, 4, 128, 3)).toEqual({
      x: 70,
      y: 76
    })
  })
})
