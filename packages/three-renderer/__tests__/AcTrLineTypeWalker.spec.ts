import {
  isComplexLineType,
  walkLineType
} from '../src/linetype/AcTrLineTypeWalker'

describe('AcTrLineTypeWalker', () => {
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

  it('applies relative rotation and offsets for text elements', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      [
        { elementLength: 5, elementTypeFlag: 0 },
        {
          elementLength: -2,
          elementTypeFlag: 2,
          text: 'GAS',
          rotation: Math.PI / 2,
          offsetX: 0,
          offsetY: 1
        }
      ],
      1
    )
    expect(result.placements).toHaveLength(1)
    const p = result.placements[0]
    // Centered in the -2 text slot starting at 5 → mid at 6; no Y for text.
    expect(p.x).toBeCloseTo(6)
    expect(p.y).toBeCloseTo(0)
    expect(p.angle).toBeCloseTo(Math.PI / 2)
    expect(p.element.text).toBe('GAS')
  })

  it('applies shape offsetX/offsetY in the line-local frame', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      [
        { elementLength: 4, elementTypeFlag: 0 },
        {
          elementLength: -2,
          elementTypeFlag: 4,
          shapeNumber: 10,
          offsetX: 1,
          offsetY: 2
        }
      ],
      1
    )
    expect(result.placements.length).toBeGreaterThan(0)
    // Slot mid at 4 + 1 = 5; then +1 along X and +2 along Y.
    expect(result.placements[0].x).toBeCloseTo(6)
    expect(result.placements[0].y).toBeCloseTo(2)
  })

  it('does not wrap pen-up slot into the next pattern cycle', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 }
      ],
      [
        { elementLength: -1, elementTypeFlag: 0 },
        { elementLength: 4, elementTypeFlag: 0 },
        {
          elementLength: -2,
          elementTypeFlag: 2,
          text: 'A'
        }
      ],
      1
    )
    // First complex placement after gap(1)+dash(4): slot is only the text
    // element (2), mid at 5 + 1 = 6. Wrapping would also absorb the leading
    // gap and shift the label to 6.5.
    expect(result.placements[0].x).toBeCloseTo(6)
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
    // Tangent is PI; upright flips to 0.
    expect(result.placements[0].tangentAngle).toBeCloseTo(Math.PI)
    expect(result.placements[0].angle).toBeCloseTo(0)
  })

  it('uses absolute rotation when bit 1 is set', () => {
    const result = walkLineType(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      [
        {
          elementLength: -1,
          elementTypeFlag: 3, // text + absolute
          text: 'A',
          rotation: Math.PI / 4
        }
      ],
      1
    )
    expect(result.placements[0].angle).toBeCloseTo(Math.PI / 4)
    expect(result.placements[0].tangentAngle).toBeCloseTo(0)
  })
})
