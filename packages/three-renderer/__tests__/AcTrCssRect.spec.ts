import {
  acTrCssRectToWcsBox,
  acTrCssTopLeftRectToGl,
  acTrIntersectCssRects,
  acTrWcsBoxToCssRect
} from '../src/viewport/AcTrCssRect'

describe('AcTrCssRect', () => {
  it('converts CSS top-left rectangles to WebGL bottom-left', () => {
    expect(
      acTrCssTopLeftRectToGl({ x: 8, y: 8, width: 128, height: 128 }, 600)
    ).toEqual({ x: 8, y: 464, width: 128, height: 128 })
  })

  it('intersects rectangles and rejects empty overlap', () => {
    expect(
      acTrIntersectCssRects(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 50, width: 100, height: 100 }
      )
    ).toEqual({ x: 50, y: 50, width: 50, height: 50 })
    expect(
      acTrIntersectCssRects(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 }
      )
    ).toBeNull()
  })

  it('maps a world box onto a screen rect and back', () => {
    const viewBox = { min: { x: 0, y: 0 }, max: { x: 100, y: 50 } }
    const screen = { x: 10, y: 20, width: 200, height: 100 }
    const css = acTrWcsBoxToCssRect(
      { min: { x: 25, y: 10 }, max: { x: 75, y: 40 } },
      viewBox,
      screen
    )
    expect(css.x).toBeCloseTo(60)
    expect(css.width).toBeCloseTo(100)
    expect(css.height).toBeCloseTo(60)
    expect(css.y).toBeCloseTo(40)

    const roundTrip = acTrCssRectToWcsBox(css, viewBox, screen)
    expect(roundTrip.minX).toBeCloseTo(25)
    expect(roundTrip.maxX).toBeCloseTo(75)
    expect(roundTrip.minY).toBeCloseTo(10)
    expect(roundTrip.maxY).toBeCloseTo(40)
  })
})
