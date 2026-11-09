import { resolveAcApPdfImportOptions } from '../src/AcApPdfImportOptions'
import { buildPdfImportShapes } from '../src/pdfImportShapes'
import {
  extractPdfImportSubpaths,
  PDF_PT_TO_MM,
  type PdfImportOps,
  type PdfImportViewport
} from '../src/pdfVectorImport'

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
