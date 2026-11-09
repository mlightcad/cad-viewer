import { resolveAcApPdfImportOptions } from '../src/AcApPdfImportOptions'
import {
  buildPdfImportShapes,
  orderPdfImportPaints,
  type PdfImportShapeItem
} from '../src/pdfImportShapes'
import {
  extractPdfImportSubpaths,
  PDF_PT_TO_MM,
  type PdfImportOps,
  type PdfImportViewport
} from '../src/pdfVectorImport'
import { buildPdfFormBlocks } from '../src/recognition/pdfFormBlocks'

const OPS: PdfImportOps = {
  save: 1,
  restore: 2,
  transform: 3,
  beginMarkedContent: 4,
  beginMarkedContentProps: 5,
  endMarkedContent: 6,
  constructPath: 7,
  moveTo: 8,
  lineTo: 9,
  curveTo: 10,
  curveTo2: 11,
  curveTo3: 12,
  rectangle: 13,
  closePath: 14,
  closeStroke: 15,
  closeFillStroke: 16,
  closeEOFillStroke: 17,
  stroke: 18,
  fill: 19,
  eoFill: 20,
  fillStroke: 21,
  eoFillStroke: 22,
  endPath: 23,
  setStrokeRGBColor: 24,
  setFillRGBColor: 25,
  beginText: 26,
  endText: 27,
  setFont: 28,
  setTextMatrix: 29,
  moveText: 30,
  setLeadingMoveText: 31,
  nextLine: 32,
  setLeading: 33,
  setCharSpacing: 34,
  setWordSpacing: 35,
  setHScale: 36,
  setTextRise: 37,
  setTextRenderingMode: 38,
  showText: 39,
  rawFillPath: 40,
  paintFormXObjectBegin: 41,
  paintFormXObjectEnd: 42,
  setLineWidth: 43
}

const MOVE = 0
const LINE = 1
const CURVE = 2
const QUAD = 3
const CLOSE = 4

const viewport: PdfImportViewport = {
  height: 800,
  convertToViewportPoint(x, y) {
    return [x, 800 - y]
  }
}

/** Packed PDF.js stream for a circle as four 90° cubics. */
function circleStream(cx: number, cy: number, r: number): number[] {
  const k = 0.5522847498 * r
  return [
    MOVE,
    cx + r,
    cy,
    CURVE,
    cx + r,
    cy + k,
    cx + k,
    cy + r,
    cx,
    cy + r,
    CURVE,
    cx - k,
    cy + r,
    cx - r,
    cy + k,
    cx - r,
    cy,
    CURVE,
    cx - r,
    cy - k,
    cx - k,
    cy - r,
    cx,
    cy - r,
    CURVE,
    cx + k,
    cy - r,
    cx + r,
    cy - k,
    cx + r,
    cy,
    CLOSE
  ]
}

function strokePath(stream: number[]) {
  return [OPS.stroke, [new Float64Array(stream)], null]
}

describe('PDF import segments and shapes', () => {
  test('keeps exact cubic segments and recovers a circle', () => {
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.setLineWidth!, OPS.constructPath],
        argsArray: [[0.72], strokePath(circleStream(100, 200, 36))]
      },
      OPS,
      viewport,
      new Map()
    )
    expect(content.subpaths).toHaveLength(1)
    const subpath = content.subpaths[0]
    expect(subpath.segments?.map(s => s.kind)).toEqual([
      'cubic',
      'cubic',
      'cubic',
      'cubic'
    ])
    expect(subpath.lineWidth).toBeCloseTo(0.72 * PDF_PT_TO_MM, 6)

    const { items, stats } = buildPdfImportShapes(
      content,
      resolveAcApPdfImportOptions()
    )
    expect(stats.circle).toBe(1)
    const shape = items[0].shape
    expect(shape.kind).toBe('circle')
    if (shape.kind !== 'circle') return
    expect(shape.center.x).toBeCloseTo(100 * PDF_PT_TO_MM, 3)
    expect(shape.center.y).toBeCloseTo(200 * PDF_PT_TO_MM, 3)
    expect(shape.radius).toBeCloseTo(36 * PDF_PT_TO_MM, 3)
  })

  test('falls back to flattened polylines when curve recognition is off', () => {
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [strokePath(circleStream(100, 200, 36))]
      },
      OPS,
      viewport,
      new Map()
    )
    const { items } = buildPdfImportShapes(
      content,
      resolveAcApPdfImportOptions({ recognizeCurves: false })
    )
    expect(items).toHaveLength(1)
    expect(items[0].shape.kind).toBe('polyline')
  })

  test('applies insertion point and scale to recovered shapes', () => {
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [strokePath(circleStream(72, 72, 72))]
      },
      OPS,
      viewport,
      new Map()
    )
    const { items } = buildPdfImportShapes(
      content,
      resolveAcApPdfImportOptions({
        insertionPoint: { x: 1000, y: 500 },
        scale: 10
      })
    )
    const shape = items[0].shape
    expect(shape.kind).toBe('circle')
    if (shape.kind !== 'circle') return
    expect(shape.center.x).toBeCloseTo(1000 + 254, 2)
    expect(shape.center.y).toBeCloseTo(500 + 254, 2)
    expect(shape.radius).toBeCloseTo(254, 2)
  })

  test('drops exact duplicate outlines painted twice', () => {
    const rect = [MOVE, 0, 0, LINE, 50, 0, LINE, 50, 20, LINE, 0, 20, CLOSE]
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath, OPS.constructPath],
        argsArray: [
          [OPS.fill, [new Float64Array(rect)], null],
          strokePath(rect)
        ]
      },
      OPS,
      viewport,
      new Map()
    )
    expect(content.subpaths).toHaveLength(2)
    expect(content.subpaths[0].filled).toBe(true)
    const { items, stats } = buildPdfImportShapes(
      content,
      resolveAcApPdfImportOptions()
    )
    expect(items).toHaveLength(1)
    expect(stats.duplicates).toBe(1)
    // The kept outline remembers both paints (for fill hatches).
    expect(items[0].filled).toBe(true)
    expect(items[0].stroked).toBe(true)
  })

  test('continues from the subpath start after closePath', () => {
    // "m l l h l S": after `h` the current point is the subpath start.
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [
          strokePath([
            MOVE,
            0,
            0,
            LINE,
            10,
            0,
            LINE,
            10,
            10,
            CLOSE,
            LINE,
            0,
            30
          ])
        ]
      },
      OPS,
      viewport,
      new Map()
    )
    expect(content.subpaths).toHaveLength(2)
    const tail = content.subpaths[1].segments?.[0]
    expect(tail?.p0.x).toBeCloseTo(0, 9)
    expect(tail?.p0.y).toBeCloseTo(0, 9)
  })

  test('degree-elevates quadratic curves into exact cubic segments', () => {
    const content = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [strokePath([MOVE, 0, 0, QUAD, 50, 100, 100, 0])]
      },
      OPS,
      viewport,
      new Map()
    )
    const segment = content.subpaths[0].segments?.[0]
    expect(segment?.kind).toBe('cubic')
    if (segment?.kind !== 'cubic') return
    expect(segment.p1.x).toBeCloseTo((100 / 3) * PDF_PT_TO_MM, 6)
    expect(segment.p1.y).toBeCloseTo((200 / 3) * PDF_PT_TO_MM, 6)
    expect(segment.p3.x).toBeCloseTo(100 * PDF_PT_TO_MM, 6)
  })
})

describe('Form XObject blocks', () => {
  /** A 10×10 square with a circle: one "symbol" in form space. */
  const symbolOps = () => [
    [
      OPS.constructPath,
      strokePath([MOVE, 0, 0, LINE, 10, 0, LINE, 10, 10, LINE, 0, 10, CLOSE])
    ],
    [OPS.constructPath, strokePath(circleStream(5, 5, 3))]
  ]

  function paintForm(matrix: number[], body: Array<[number, unknown]>) {
    return [
      [OPS.paintFormXObjectBegin!, [matrix, [0, 0, 10, 10]]],
      ...body,
      [OPS.paintFormXObjectEnd!, []]
    ] as Array<[number, unknown]>
  }

  function extract(ops: Array<[number, unknown]>) {
    return extractPdfImportSubpaths(
      { fnArray: ops.map(o => o[0]), argsArray: ops.map(o => o[1]) },
      OPS,
      viewport,
      new Map()
    )
  }

  test('groups identical form paints into one block with transforms', () => {
    const content = extract([
      ...paintForm(
        [1, 0, 0, 1, 100, 100],
        symbolOps() as Array<[number, unknown]>
      ),
      ...paintForm(
        [0, 1, -1, 0, 300, 100],
        symbolOps() as Array<[number, unknown]>
      ),
      // A different form drawn once stays plain geometry.
      ...paintForm(
        [1, 0, 0, 1, 500, 100],
        [[OPS.constructPath, strokePath([MOVE, 0, 0, LINE, 20, 0])]]
      )
    ])
    expect(content.formInstances).toHaveLength(3)

    const { blocks, consumed } = buildPdfFormBlocks(content)
    expect(blocks).toHaveLength(1)
    expect(consumed.size).toBe(4)
    const [block] = blocks
    expect(block.shapes.map(s => s.shape.kind).sort()).toEqual([
      'circle',
      'polyline'
    ])
    const circle = block.shapes.find(s => s.shape.kind === 'circle')!.shape
    if (circle.kind !== 'circle') return
    // Definition keeps model-space millimeters (first instance scale 1).
    expect(circle.radius).toBeCloseTo(3 * PDF_PT_TO_MM, 6)

    const [first, second] = block.references
    expect(first.scaleX).toBeCloseTo(1, 9)
    expect(first.scaleY).toBeCloseTo(1, 9)
    expect(first.rotation).toBeCloseTo(0, 9)
    expect(first.position.x).toBeCloseTo(100 * PDF_PT_TO_MM, 6)
    expect(second.rotation).toBeCloseTo(Math.PI / 2, 9)
    expect(second.position.x).toBeCloseTo(300 * PDF_PT_TO_MM, 6)

    // Definition point mapped by the second reference lands on the page.
    const c = circle.center
    const cos = Math.cos(second.rotation)
    const sin = Math.sin(second.rotation)
    const x = second.position.x + (c.x * cos - c.y * sin) * second.scaleX
    const expected = (300 - 5) * PDF_PT_TO_MM
    expect(x).toBeCloseTo(expected, 6)
  })

  test('skips forms painted only once or with shear', () => {
    const content = extract([
      ...paintForm([1, 0, 0, 1, 0, 0], symbolOps() as Array<[number, unknown]>),
      ...paintForm(
        [1, 0, 0.5, 1, 200, 0],
        symbolOps() as Array<[number, unknown]>
      )
    ])
    expect(buildPdfFormBlocks(content).blocks).toHaveLength(0)
  })
})

describe('dash patterns and fills', () => {
  const OPS_D: PdfImportOps = { ...OPS, setDash: 44 }

  test('records dash patterns in mm, scaled by the CTM and reset by Q', () => {
    const content = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS_D.save,
          OPS_D.transform,
          OPS_D.setDash!,
          OPS_D.constructPath,
          OPS_D.restore,
          OPS_D.constructPath
        ],
        argsArray: [
          [],
          [2, 0, 0, 2, 0, 0],
          [[3], 0],
          strokePath([MOVE, 0, 0, LINE, 50, 0]),
          [],
          strokePath([MOVE, 0, 10, LINE, 50, 10])
        ]
      },
      OPS_D,
      viewport,
      new Map()
    )
    // [3] repeats as 3 on, 3 off; CTM scale 2.
    expect(content.subpaths[0].dashPattern).toEqual([
      6 * PDF_PT_TO_MM,
      6 * PDF_PT_TO_MM
    ])
    expect(content.subpaths[1].dashPattern).toBeUndefined()
  })

  test('marks fill + stroke paints and groups even-odd fill subpaths', () => {
    const OPS_F = { ...OPS_D }
    const ring = [
      ...[MOVE, 0, 0, LINE, 40, 0, LINE, 40, 40, LINE, 0, 40, CLOSE],
      ...[MOVE, 10, 10, LINE, 30, 10, LINE, 30, 30, LINE, 10, 30, CLOSE]
    ]
    const content = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS_F.setFillRGBColor,
          OPS_F.constructPath,
          OPS_F.constructPath
        ],
        argsArray: [
          ['#ff0000'],
          [OPS_F.eoFill, [new Float64Array(ring)], null],
          [
            OPS_F.fillStroke,
            [
              new Float64Array([
                MOVE,
                100,
                0,
                LINE,
                120,
                0,
                LINE,
                110,
                20,
                CLOSE
              ])
            ],
            null
          ]
        ]
      },
      OPS_F,
      viewport,
      new Map()
    )
    const [outer, inner, triangle] = content.subpaths
    expect(outer.filled).toBe(true)
    expect(outer.stroked).toBeUndefined()
    expect(outer.fillColor).toBe('#ff0000')
    expect(inner.paintGroup).toBe(outer.paintGroup)
    expect(triangle.stroked).toBe(true)
    expect(triangle.paintGroup).not.toBe(outer.paintGroup)
  })
})

describe('orderPdfImportPaints', () => {
  const line = (x: number): PdfImportShapeItem['shape'] => ({
    kind: 'line',
    start: { x, y: 0 },
    end: { x, y: 1 }
  })
  const stroke = (x: number): PdfImportShapeItem => ({ shape: line(x) })
  const fill = (
    x: number,
    paintGroup: number,
    stroked = false
  ): PdfImportShapeItem => ({
    shape: line(x),
    filled: true,
    stroked,
    paintGroup
  })

  test('keeps each fill where the PDF painted it', () => {
    // Teal box, white glyph drawn on it, then an outline over both.
    const box = fill(0, 1)
    const glyphA = fill(1, 2)
    const glyphB = fill(2, 2)
    const outline = stroke(3)
    const paints = orderPdfImportPaints([box, glyphA, glyphB, outline], true)
    expect(paints).toEqual([
      { kind: 'fill', items: [box] },
      { kind: 'fill', items: [glyphA, glyphB] },
      { kind: 'shape', item: outline }
    ])
  })

  test('keeps the outline of a filled and stroked area above its fill', () => {
    const area = fill(0, 1, true)
    expect(orderPdfImportPaints([area], true)).toEqual([
      { kind: 'fill', items: [area] },
      { kind: 'shape', item: area }
    ])
  })

  test('imports fills as outlines when fill hatches are off', () => {
    const area = fill(0, 1)
    expect(orderPdfImportPaints([area], false)).toEqual([
      { kind: 'shape', item: area }
    ])
  })
})
