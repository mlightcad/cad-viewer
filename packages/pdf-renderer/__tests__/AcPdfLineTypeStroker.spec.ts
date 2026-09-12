import {
  isComplexLineType,
  walkLineType
} from '../src/linetype/AcPdfLineTypeStroker'

describe('AcPdfLineTypeStroker', () => {
  it('detects complex pattern elements', () => {
    expect(
      isComplexLineType([{ elementLength: 5, elementTypeFlag: 0 }])
    ).toBe(false)
    expect(
      isComplexLineType([
        { elementLength: 5, elementTypeFlag: 0 },
        { elementLength: -2, elementTypeFlag: 2 }
      ])
    ).toBe(true)
  })

  it('walks dash-gap-shape along a polyline', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      [
        { elementLength: 4, elementTypeFlag: 0 },
        { elementLength: -2, elementTypeFlag: 0 },
        { elementLength: 2, elementTypeFlag: 4 }
      ],
      1
    )
    expect(result.strokes.length).toBeGreaterThan(0)
    expect(result.shapes.length).toBeGreaterThan(0)
    expect(result.shapes[0].x).toBeGreaterThan(0)
  })
})
