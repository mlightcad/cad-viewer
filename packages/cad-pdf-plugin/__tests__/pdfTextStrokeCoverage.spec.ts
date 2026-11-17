import {
  AcCmColor,
  AcDbHatch,
  AcDbLine,
  AcDbPolyline,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acapPdfEntityIsGlyphOutlineTwin,
  acapPdfRemoveTextOutlineTwins,
  acapPdfTextCoversStrokeLine,
  acapPdfTextCoversStrokePoints,
  acapPdfTextStrokeBand
} from '../src/pdfTextStrokeCoverage'

function text(
  string: string,
  x: number,
  y: number,
  height: number,
  rotation = 0,
  widthFactor = 1
) {
  const entity = new AcDbText()
  entity.textString = string
  entity.position = new AcGePoint3d(x, y, 0)
  entity.height = height
  entity.rotation = rotation
  entity.widthFactor = widthFactor
  return entity
}

/** Closed polyline with enough vertices to count as a glyph outline. */
function glyphOutline(x: number, y: number, size: number) {
  const poly = new AcDbPolyline()
  const s = size
  const pts = [
    [x, y],
    [x + s * 0.3, y],
    [x + s, y],
    [x + s, y + s * 0.4],
    [x + s, y + s],
    [x + s * 0.4, y + s],
    [x, y + s],
    [x, y + s * 0.3]
  ]
  pts.forEach(([px, py], i) => poly.addVertexAt(i, new AcGePoint2d(px, py)))
  poly.closed = true
  poly.color = new AcCmColor()
  return poly
}

describe('pdfTextStrokeCoverage', () => {
  test('covers glyph-sized stroke points under a CJK text after capital-A height', () => {
    const entity = text('受控文件', 0, 0, 10)
    const band = acapPdfTextStrokeBand(entity)
    expect(
      acapPdfTextCoversStrokePoints(
        entity,
        [
          { x: 5, y: 5 },
          { x: 12, y: 5 },
          { x: 12, y: 14 },
          { x: 5, y: 14 }
        ],
        band
      )
    ).toBe(true)
  })

  test('matches mid-string outline lines, not only the start', () => {
    const entity = text('厦门瑞尔特卫浴科技股份有限公司', 0, 0, 10)
    expect(
      acapPdfTextCoversStrokeLine(entity, {
        position: { x: 80, y: 0 },
        height: 14,
        width: 14,
        rotation: 0,
        strokes: [
          {
            id: 'g',
            points: [
              { x: 80, y: 1 },
              { x: 90, y: 1 },
              { x: 90, y: 13 },
              { x: 80, y: 13 }
            ]
          }
        ]
      })
    ).toBe(true)
  })

  test('rejects open lines and arrowhead-sized hatches as glyph twins', () => {
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )
    expect(acapPdfEntityIsGlyphOutlineTwin(line)).toBe(false)

    const open = new AcDbPolyline()
    open.addVertexAt(0, new AcGePoint2d(0, 0))
    open.addVertexAt(1, new AcGePoint2d(5, 0))
    open.addVertexAt(2, new AcGePoint2d(5, 5))
    open.closed = false
    expect(acapPdfEntityIsGlyphOutlineTwin(open)).toBe(false)

    expect(acapPdfEntityIsGlyphOutlineTwin(glyphOutline(0, 0, 10))).toBe(true)
  })

  test('removeTextOutlineTwins drops closed glyph outlines but keeps leaders', () => {
    const native = text('受控文件', 0, 0, 10)
    const glyphs = [0, 1, 2, 3].map(i => glyphOutline(i * 14, 1, 12))
    const leader = new AcDbLine(
      new AcGePoint3d(5, 20, 0),
      new AcGePoint3d(5, 40, 0)
    )
    const kept = acapPdfRemoveTextOutlineTwins([native, ...glyphs, leader])
    expect(kept).toContain(native)
    expect(kept).toContain(leader)
    for (const glyph of glyphs) expect(kept).not.toContain(glyph)
  })

  test('removeTextOutlineTwins drops filled glyph hatches under text', () => {
    const native = text('AB', 0, 0, 10)
    const hatch = new AcDbHatch()
    const outline = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 1, 0)
    )
    const fillOutlines = new Map([
      [
        hatch,
        [
          [
            { x: 1, y: 1 },
            { x: 3, y: 0 },
            { x: 5, y: 1 },
            { x: 6, y: 4 },
            { x: 4, y: 7 },
            { x: 2, y: 7 },
            { x: 0, y: 4 }
          ]
        ]
      ]
    ])
    const companions = new Map([[hatch, [outline]]])
    const kept = acapPdfRemoveTextOutlineTwins(
      [native, hatch, outline],
      fillOutlines,
      companions
    )
    expect(kept).toEqual([native])
    expect(fillOutlines.has(hatch)).toBe(false)
    expect(companions.has(hatch)).toBe(false)
  })
})
