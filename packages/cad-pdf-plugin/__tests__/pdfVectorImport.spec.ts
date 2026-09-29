import { PDF_FALLBACK_LAYER } from '../src/pdfOptionalContent'
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
  endPath: 23
}

const DRAW_MOVE_TO = 0
const DRAW_LINE_TO = 1

function yUpViewport(height: number): PdfImportViewport {
  return {
    height,
    convertToViewportPoint(x, y) {
      return [x, height - y]
    }
  }
}

/**
 * PDF.js page viewport for a 200×100 page rotated 90°.
 * transform = [0, 1, 1, 0, 0, 0], viewport height = 200.
 */
function rotated90Viewport(): PdfImportViewport {
  return {
    height: 200,
    convertToViewportPoint(x, y) {
      return [y, x]
    }
  }
}

function mm(value: number): number {
  return value * PDF_PT_TO_MM
}

describe('extractPdfImportSubpaths', () => {
  test('places packed constructPath geometry in model space', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0
    ])
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [[OPS.stroke, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(1)
    expect(subpaths[0].points[0]).toEqual({ x: mm(0), y: mm(0) })
    expect(subpaths[0].points[1]).toEqual({ x: mm(10), y: mm(0) })
    expect(subpaths[0].layerName).toBeUndefined()
  })

  test('does not import an unpainted clipping path', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0
    ])
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [[OPS.endPath, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(0)
  })

  test('applies a content-stream CTM and restores it', () => {
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.save,
          OPS.transform,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke,
          OPS.restore,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke
        ],
        argsArray: [
          [],
          [1, 0, 0, 1, 5, 0],
          [0, 0],
          [1, 0],
          [],
          [],
          [0, 0],
          [1, 0],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].points[0].x).toBeCloseTo(mm(5))
    expect(subpaths[1].points[0].x).toBeCloseTo(mm(0))
  })

  test('uses constructPath coordinates as-is when PDF.js already baked a translation', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      10,
      0,
      DRAW_LINE_TO,
      20,
      0
    ])
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [[OPS.stroke, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].points[0].x).toBeCloseTo(mm(10))
    expect(subpaths[0].points[1].x).toBeCloseTo(mm(20))
  })

  test('flips a rotated viewport back to CAD y-up', () => {
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [OPS.moveTo, OPS.lineTo, OPS.stroke],
        argsArray: [
          [0, 0],
          [200, 0],
          []
        ]
      },
      OPS,
      rotated90Viewport(),
      new Map()
    )

    expect(subpaths[0].points[0]).toEqual({ x: mm(0), y: mm(200) })
    expect(subpaths[0].points[1]).toEqual({ x: mm(0), y: mm(0) })
  })

  test('assigns OCG geometry and leaves other vectors on the fallback layer', () => {
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.beginMarkedContentProps,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke,
          OPS.endMarkedContent,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke
        ],
        argsArray: [
          ['OC', { type: 'OCG', id: 'walls' }],
          [0, 0],
          [1, 0],
          [],
          [],
          [0, 1],
          [1, 1],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map([['walls', { layerName: 'A_WALL' }]]),
      PDF_FALLBACK_LAYER
    )

    expect(subpaths.map(subpath => subpath.layerName)).toEqual([
      'A_WALL',
      PDF_FALLBACK_LAYER
    ])
  })

  test('puts a multi-group OCMD on the fallback layer', () => {
    const subpaths = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.beginMarkedContentProps,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke,
          OPS.endMarkedContent
        ],
        argsArray: [
          ['OC', { type: 'OCMD', ids: ['walls', 'doors'], policy: 'AnyOn' }],
          [0, 0],
          [1, 0],
          [],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map([['walls', { layerName: 'A_WALL' }]]),
      PDF_FALLBACK_LAYER
    )

    expect(subpaths[0].layerName).toBe(PDF_FALLBACK_LAYER)
  })
})
