import { PDF_FALLBACK_LAYER } from '../src/pdfOptionalContent'
import {
  detectPdfImportPaperTone,
  extractPdfImportSubpaths,
  PDF_IMPORT_FOREGROUND_COLOR,
  PDF_PT_TO_MM,
  type PdfImportOps,
  type PdfImportViewport,
  remapPdfImportColor} from '../src/pdfVectorImport'

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
  paintImageXObject: 43,
  paintInlineImageXObject: 44
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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
    const { subpaths } = extractPdfImportSubpaths(
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

  test('keeps the stroke color that painted a path', () => {
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [OPS.setStrokeRGBColor, OPS.moveTo, OPS.lineTo, OPS.stroke],
        argsArray: [['#00ff00'], [0, 0], [10, 0], []]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].color).toBe('#00ff00')
  })

  test('uses the fill color for a fill and restores it with q/Q', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0
    ])
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.save,
          OPS.setFillRGBColor,
          OPS.restore,
          OPS.constructPath
        ],
        argsArray: [[], ['#0000ff'], [], [OPS.fill, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].color).toBe(PDF_IMPORT_FOREGROUND_COLOR)
  })

  test('can keep paper-black colors when remapping is disabled', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0
    ])
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [OPS.constructPath],
        argsArray: [[OPS.stroke, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map(),
      undefined,
      { remapContrastInk: false }
    )

    expect(subpaths[0].color).toBe('#000000')
  })

  test('remaps contrast ink to ACI 7 foreground by paper tone', () => {
    expect(remapPdfImportColor('#000000', 'light')).toBe(
      PDF_IMPORT_FOREGROUND_COLOR
    )
    expect(remapPdfImportColor('#ffffff', 'dark')).toBe(
      PDF_IMPORT_FOREGROUND_COLOR
    )
    expect(remapPdfImportColor('#ffffff', 'light')).toBe('#ffffff')
    expect(remapPdfImportColor('#000000', 'dark')).toBe('#000000')
    expect(remapPdfImportColor('#00ff00', 'light')).toBe('#00ff00')
    // Rich "charcoal" black from Illustrator/InDesign CMYK conversion.
    expect(remapPdfImportColor('#2c2e35', 'light')).toBe(
      PDF_IMPORT_FOREGROUND_COLOR
    )
    expect(remapPdfImportColor('#000080', 'light')).toBe('#000080')
    expect(
      detectPdfImportPaperTone([
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff'
      ])
    ).toBe('dark')
    // White fills plus black linework ⇒ still light paper (do not drop ink).
    expect(
      detectPdfImportPaperTone([
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#ffffff',
        '#000000'
      ])
    ).toBe('light')
    expect(detectPdfImportPaperTone(['#000000', '#000000'])).toBe('light')

    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0
    ])
    const { subpaths, texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.constructPath,
          OPS.beginText,
          OPS.setFont,
          OPS.setTextMatrix,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          [OPS.stroke, [stream], null],
          [],
          ['F1', 10],
          [new Float32Array([1, 0, 0, 1, 0, 0])],
          [[{ unicode: 'A', width: 500 }]],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].color).toBe(PDF_IMPORT_FOREGROUND_COLOR)
    expect(texts[0].color).toBe(PDF_IMPORT_FOREGROUND_COLOR)
  })

  test('applies Form XObject matrix between Begin and End', () => {
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.paintFormXObjectBegin!,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke,
          OPS.paintFormXObjectEnd!
        ],
        argsArray: [
          [new Float32Array([1, 0, 0, 1, 50, 0]), [0, 0, 100, 100]],
          [0, 0],
          [10, 0],
          [],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths[0].points[0].x).toBeCloseTo(mm(50))
    expect(subpaths[0].points[1].x).toBeCloseTo(mm(60))
  })

  test('keeps Form End restore separate from nested q/Q', () => {
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.setStrokeRGBColor,
          OPS.paintFormXObjectBegin!,
          OPS.save,
          OPS.setStrokeRGBColor,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke,
          OPS.restore,
          OPS.paintFormXObjectEnd!,
          OPS.moveTo,
          OPS.lineTo,
          OPS.stroke
        ],
        argsArray: [
          ['#00ff00'],
          [new Float32Array([1, 0, 0, 1, 50, 0]), [0, 0, 100, 100]],
          [],
          ['#0000ff'],
          [0, 0],
          [10, 0],
          [],
          [],
          [],
          [0, 0],
          [10, 0],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(2)
    expect(subpaths[0].color).toBe('#0000ff')
    expect(subpaths[0].points[0].x).toBeCloseTo(mm(50))
    // After Form End, outer green stroke and identity CTM are restored even
    // though the form nested a q/Q pair on the graphics stack.
    expect(subpaths[1].color).toBe('#00ff00')
    expect(subpaths[1].points[0].x).toBeCloseTo(mm(0))
  })

  test('approximates PDF curveTo3 (y) with end-point second control', () => {
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [OPS.moveTo, OPS.curveTo3, OPS.stroke],
        argsArray: [
          [0, 0],
          [10, 20, 30, 0],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map(),
      undefined,
      { remapContrastInk: false }
    )

    expect(subpaths).toHaveLength(1)
    const pts = subpaths[0].points
    expect(pts[0]).toEqual({ x: mm(0), y: mm(0) })
    expect(pts[pts.length - 1]).toEqual({ x: mm(30), y: mm(0) })
    // Mid samples bend toward the first control (10, 20), not flat on y=0.
    expect(pts.some(p => p.y > mm(5))).toBe(true)
  })

  test('applies setHScale to AcDbText widthFactor', () => {
    const { texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.beginText,
          OPS.setFont,
          OPS.setHScale,
          OPS.setTextMatrix,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          [],
          ['F1', 10],
          [50],
          [new Float32Array([1, 0, 0, 1, 0, 0])],
          [[{ unicode: 'A', width: 500 }]],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(texts).toHaveLength(1)
    expect(texts[0].widthFactor).toBeCloseTo(0.5)
    expect(texts[0].height).toBeCloseTo(mm(10))
  })

  test('treats rawFillPath like fill and closes the subpath', () => {
    const stream = new Float32Array([
      DRAW_MOVE_TO,
      0,
      0,
      DRAW_LINE_TO,
      10,
      0,
      DRAW_LINE_TO,
      10,
      10
    ])
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [OPS.setFillRGBColor, OPS.constructPath],
        argsArray: [['#0000ff'], [OPS.rawFillPath!, [stream], null]]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(1)
    expect(subpaths[0].color).toBe('#0000ff')
    const pts = subpaths[0].points
    expect(pts[0]).toEqual(pts[pts.length - 1])
  })

  test('does not invent entities from an unpainted leftover path', () => {
    const { subpaths } = extractPdfImportSubpaths(
      {
        fnArray: [OPS.moveTo, OPS.lineTo],
        argsArray: [
          [0, 0],
          [10, 0]
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(0)
  })

  test('imports a showText run on the glyph baseline', () => {
    const { subpaths, texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.setFillRGBColor,
          OPS.beginText,
          OPS.setFont,
          OPS.setTextMatrix,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          ['#ff0000'],
          [],
          ['F1', 10],
          [new Float32Array([1, 0, 0, 1, 10, 20])],
          [[{ unicode: 'A', width: 500, isSpace: false }]],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(subpaths).toHaveLength(0)
    expect(texts).toHaveLength(1)
    expect(texts[0].text).toBe('A')
    expect(texts[0].color).toBe('#ff0000')
    expect(texts[0].position).toEqual({ x: mm(10), y: mm(20) })
    expect(texts[0].height).toBeCloseTo(mm(10))
    expect(texts[0].rotation).toBeCloseTo(0)
    expect(texts[0].widthFactor).toBeCloseTo(1)
  })

  test('records image paints with their unit-square placement', () => {
    const inline = { width: 2, height: 2, data: new Uint8ClampedArray(12) }
    const { images } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.save,
          OPS.transform,
          OPS.paintImageXObject!,
          OPS.restore,
          OPS.save,
          OPS.transform,
          OPS.paintInlineImageXObject!,
          OPS.restore
        ],
        argsArray: [
          null,
          [100, 0, 0, 50, 10, 20],
          ['img_p0_1', 640, 320],
          null,
          null,
          // 90° rotation: image x axis points up the page.
          [0, 30, -30, 0, 200, 100],
          [inline],
          null
        ]
      },
      OPS,
      yUpViewport(600),
      new Map()
    )

    expect(images).toHaveLength(2)
    expect(images![0].objId).toBe('img_p0_1')
    const first = images![0].toCad
    expect(first.a).toBeCloseTo(mm(100))
    expect(first.b).toBeCloseTo(0)
    expect(first.c).toBeCloseTo(0)
    expect(first.d).toBeCloseTo(mm(50))
    expect(first.e).toBeCloseTo(mm(10))
    expect(first.f).toBeCloseTo(mm(20))

    expect(images![1].inline).toBe(inline)
    const second = images![1].toCad
    expect(second.a).toBeCloseTo(0)
    expect(second.b).toBeCloseTo(mm(30))
    expect(second.c).toBeCloseTo(-mm(30))
    expect(second.d).toBeCloseTo(0)
    expect(second.e).toBeCloseTo(mm(200))
    expect(second.f).toBeCloseTo(mm(100))
  })

  test('scales Td / TD / T* offsets by the text matrix', () => {
    // Tm scales text space by 12, so `0 -1.5 Td` moves 18 pt down, not 1.5.
    const { texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.beginText,
          OPS.setFont,
          OPS.setTextMatrix,
          OPS.showText,
          OPS.moveText,
          OPS.showText,
          OPS.setLeadingMoveText,
          OPS.showText,
          OPS.nextLine,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          [],
          ['F1', 1],
          [new Float32Array([12, 0, 0, 12, 100, 500])],
          [[{ unicode: 'A', width: 500 }]],
          [2, -1.5],
          [[{ unicode: 'B', width: 500 }]],
          [0, -1],
          [[{ unicode: 'C', width: 500 }]],
          [],
          [[{ unicode: 'D', width: 500 }]],
          []
        ]
      },
      OPS,
      yUpViewport(600),
      new Map()
    )

    expect(texts.map(t => t.text)).toEqual(['A', 'B', 'C', 'D'])
    expect(texts[0].position.x).toBeCloseTo(mm(100))
    expect(texts[0].position.y).toBeCloseTo(mm(500))
    expect(texts[1].position.x).toBeCloseTo(mm(124))
    expect(texts[1].position.y).toBeCloseTo(mm(482))
    expect(texts[2].position.x).toBeCloseTo(mm(124))
    expect(texts[2].position.y).toBeCloseTo(mm(470))
    expect(texts[3].position.x).toBeCloseTo(mm(124))
    expect(texts[3].position.y).toBeCloseTo(mm(458))
  })

  test('skips invisible text and rotates with the text matrix', () => {
    const { texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.beginText,
          OPS.setFont,
          OPS.setTextRenderingMode,
          OPS.showText,
          OPS.setTextRenderingMode,
          OPS.setTextMatrix,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          [],
          ['F1', 10],
          [3],
          [[{ unicode: 'hidden', width: 100 }]],
          [0],
          [new Float32Array([0, 1, -1, 0, 0, 0])],
          [[{ unicode: 'Up', width: 200 }]],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(texts).toHaveLength(1)
    expect(texts[0].text).toBe('Up')
    expect(texts[0].rotation).toBeCloseTo(Math.PI / 2)
    expect(texts[0].height).toBeCloseTo(mm(10))
    expect(texts[0].position).toEqual({ x: mm(0), y: mm(0) })
  })

  test('restores text state with q/Q but keeps the text matrix', () => {
    const { texts } = extractPdfImportSubpaths(
      {
        fnArray: [
          OPS.setFont,
          OPS.beginText,
          OPS.setTextMatrix,
          OPS.save,
          OPS.setFont,
          OPS.showText,
          OPS.restore,
          OPS.showText,
          OPS.endText
        ],
        argsArray: [
          ['F1', 10],
          [],
          [new Float32Array([1, 0, 0, 1, 0, 0])],
          [],
          ['F1', 20],
          [[{ unicode: 'Big', width: 100 }]],
          [],
          [[{ unicode: 'Small', width: 100 }]],
          []
        ]
      },
      OPS,
      yUpViewport(100),
      new Map()
    )

    expect(texts).toHaveLength(2)
    expect(texts[0].text).toBe('Big')
    expect(texts[0].height).toBeCloseTo(mm(20))
    expect(texts[1].text).toBe('Small')
    expect(texts[1].height).toBeCloseTo(mm(10))
  })
})

describe('extractPdfImportSubpaths clip paths', () => {
  const DRAW_M = 0
  const DRAW_L = 1
  const CLIP_OPS = (): PdfImportOps => ({ ...OPS, clip: 50, eoClip: 51 })
  const viewport: PdfImportViewport = {
    height: 100,
    convertToViewportPoint(x, y) {
      return [x, 100 - y]
    }
  }

  test('records a W n clip and tags strokes painted under it', () => {
    const ops = CLIP_OPS()
    const content = extractPdfImportSubpaths(
      {
        fnArray: [
          ops.save,
          ops.rectangle,
          ops.clip!,
          ops.endPath,
          ops.moveTo,
          ops.lineTo,
          ops.stroke,
          ops.restore,
          ops.moveTo,
          ops.lineTo,
          ops.stroke
        ],
        argsArray: [
          [],
          [0, 0, 100, 50],
          [],
          [],
          [10, 10],
          [90, 40],
          [],
          [],
          [0, 0],
          [10, 0],
          []
        ]
      },
      ops,
      viewport,
      new Map()
    )

    // The clip path itself is not geometry.
    expect(content.subpaths).toHaveLength(2)
    expect(content.subpaths[0].clipPath).toBe(0)
    // Q restores the clip of the outer graphics state.
    expect(content.subpaths[1].clipPath).toBeUndefined()
    expect(content.clipPaths).toHaveLength(1)
    expect(content.clipPaths![0]).toHaveLength(1)
    expect(content.clipPaths![0][0]).toHaveLength(4)
  })

  test('captures a clip from a packed constructPath', () => {
    const ops = CLIP_OPS()
    const clipStream = new Float32Array([
      DRAW_M,
      0,
      0,
      DRAW_L,
      50,
      0,
      DRAW_L,
      50,
      50,
      DRAW_L,
      0,
      50
    ])
    const lineStream = new Float32Array([DRAW_M, 5, 5, DRAW_L, 45, 45])
    const content = extractPdfImportSubpaths(
      {
        fnArray: [ops.eoClip!, ops.constructPath, ops.constructPath],
        argsArray: [
          [],
          [ops.endPath, [clipStream], null],
          [ops.stroke, [lineStream], null]
        ]
      },
      ops,
      viewport,
      new Map()
    )

    expect(content.subpaths).toHaveLength(1)
    expect(content.subpaths[0].clipPath).toBe(0)
    expect(content.clipPaths![0][0]).toHaveLength(4)
  })
})
