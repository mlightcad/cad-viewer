import {
  isComplexLineType,
  resolveLinetypeEmbeddedText,
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

  it('detects LibreDWG-web swapped DXF 74/75 as complex', () => {
    expect(
      isComplexLineType([
        { elementLength: 1.05, elementTypeFlag: 0 },
        {
          elementLength: -0.6,
          elementTypeFlag: 0,
          shapeNumber: 2,
          text: ' '
        },
        { elementLength: -0.6, elementTypeFlag: 0 }
      ])
    ).toBe(true)
  })

  it('normalizes LibreDWG-web swapped SHAPE (flag=code, shapeNumber=mask)', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      [
        { elementLength: 4, elementTypeFlag: 0 },
        {
          elementLength: -2,
          elementTypeFlag: 132,
          shapeNumber: 4
        },
        { elementLength: -1, elementTypeFlag: 0 }
      ],
      1
    )
    expect(result.placements.length).toBeGreaterThan(0)
    expect(result.placements[0].element.elementTypeFlag).toBe(4)
    expect(result.placements[0].element.shapeNumber).toBe(132)
  })

  it('walks LibreDWG-web swapped text dash into placements', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      [
        { elementLength: 1.05, elementTypeFlag: 0 },
        {
          elementLength: -0.6,
          elementTypeFlag: 0,
          shapeNumber: 2,
          text: 'VCP'
        },
        { elementLength: -0.6, elementTypeFlag: 0 }
      ],
      1
    )
    expect(result.placements.length).toBeGreaterThan(0)
    expect(result.placements[0].element.elementTypeFlag).toBe(2)
    expect(result.placements[0].element.text).toBe('VCP')
  })

  it('draws continuous when the line is shorter than one pattern cycle', () => {
    // WSP UL6A 6 inch: cycle 2.35; hatch-side segment length 2 (A5C59).
    const pattern = [
      { elementLength: 1.05, elementTypeFlag: 0 },
      {
        elementLength: -0.65,
        elementTypeFlag: 2,
        text: ' 6%%34 WSP UL6A',
        scale: 0.1
      },
      { elementLength: -0.65, elementTypeFlag: 0 }
    ]
    const short = walkLineType(
      [
        { x: -1, y: 0.5 },
        { x: 1, y: 0.5 }
      ],
      pattern,
      1
    )
    expect(short.placements).toHaveLength(0)
    expect(short.strokes).toHaveLength(1)
    expect(short.strokes[0]).toHaveLength(2)

    const longEnough = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 2.35, y: 0 }
      ],
      pattern,
      1
    )
    expect(longEnough.placements.length).toBeGreaterThan(0)
    expect(longEnough.strokes.length).toBeGreaterThan(0)
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
    expect(result.placements.length).toBeGreaterThan(0)
    expect(result.placements[0].x).toBeGreaterThan(0)
  })

  it('centers text in text slot plus following gaps and keeps upright', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      [
        { elementLength: 1.05, elementTypeFlag: 0 },
        {
          elementLength: -0.6,
          elementTypeFlag: 2,
          text: 'VCP',
          offsetX: -0.6,
          offsetY: -0.05,
          scale: 0.1
        },
        { elementLength: -0.6, elementTypeFlag: 0 }
      ],
      1
    )
    expect(result.placements.length).toBeGreaterThan(0)
    // Slot = 0.6 + 0.6 = 1.2, mid at 1.05 + 0.6 = 1.65; on path (no Y).
    expect(result.placements[0].x).toBeCloseTo(1.65)
    expect(result.placements[0].y).toBeCloseTo(0)
  })

  it('flips relative text upright when tangent would invert the label', () => {
    const result = walkLineType(
      [
        { x: 10, y: 0 },
        { x: 0, y: 0 }
      ],
      [
        {
          elementLength: -1,
          elementTypeFlag: 2,
          text: 'A',
          offsetY: 0
        }
      ],
      1
    )
    expect(result.placements[0].tangentAngle).toBeCloseTo(Math.PI)
    expect(result.placements[0].angle).toBeCloseTo(0)
  })

  it('falls back to description when pattern text is blank', () => {
    expect(
      resolveLinetypeEmbeddedText(' ', '6" VCP C700  - 6" VCP C700 - 6" V')
    ).toBe('6" VCP C700')
    expect(resolveLinetypeEmbeddedText('GAS', 'GAS  - GAS -')).toBe('GAS')
  })
})
