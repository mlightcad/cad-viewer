/**
 * PDF operator-list → CAD polyline conversion, without pdfjs-dist.
 *
 * PDF.js numeric op codes are passed in so unit tests can exercise packed
 * `constructPath` streams, CTM save/restore, and layer assignment without
 * loading the PDF worker.
 */

import { getPdfMarkedContentTarget } from './pdfOptionalContent'

/** 1 PDF point in mm (1 pt = 1/72 inch = 25.4/72 mm) */
export const PDF_PT_TO_MM = 25.4 / 72

/** Bezier approximation resolution (line segments per curve) */
const BEZIER_STEPS = 8

/** 2D point in model-space millimeters. */
export type PdfImportPoint = { x: number; y: number }

/**
 * One exact path segment in model-space millimeters.
 *
 * Affine maps keep Bezier curves Bezier, so control points transformed
 * through the CTM and viewport describe the page curve exactly. Quadratic
 * curves are degree-elevated to cubics.
 */
export type PdfImportSegment =
  | { kind: 'line'; p0: PdfImportPoint; p1: PdfImportPoint }
  | {
      kind: 'cubic'
      p0: PdfImportPoint
      p1: PdfImportPoint
      p2: PdfImportPoint
      p3: PdfImportPoint
    }

export interface PdfImportViewport {
  height: number
  convertToViewportPoint(x: number, y: number): number[]
}

/**
 * PDF.js `OPS` codes the importer understands. Values come from the loaded
 * pdfjs-dist build; tests supply their own distinct integers.
 */
export interface PdfImportOps {
  save: number
  restore: number
  transform: number
  beginMarkedContent: number
  beginMarkedContentProps: number
  endMarkedContent: number
  constructPath: number
  moveTo: number
  lineTo: number
  curveTo: number
  curveTo2: number
  curveTo3: number
  rectangle: number
  closePath: number
  closeStroke: number
  closeFillStroke: number
  closeEOFillStroke: number
  stroke: number
  fill: number
  eoFill: number
  fillStroke: number
  eoFillStroke: number
  endPath: number
  /**
   * PDF.js internal fill used for Type3 / mask path compilation. Treat like
   * {@link PdfImportOps.fill} when present in a packed `constructPath`.
   */
  rawFillPath?: number
  setStrokeRGBColor: number
  setFillRGBColor: number
  beginText: number
  endText: number
  setFont: number
  setTextMatrix: number
  moveText: number
  setLeadingMoveText: number
  nextLine: number
  setLeading: number
  setCharSpacing: number
  setWordSpacing: number
  setHScale: number
  setTextRise: number
  setTextRenderingMode: number
  showText: number
  /** Line width (`w`). Optional so older op tables still type-check. */
  setLineWidth?: number
  /** Dash pattern (`d`): args `[dashArray, phase]`. */
  setDash?: number
  /** Form XObject begin — args typically `[matrix, bbox]`. */
  paintFormXObjectBegin?: number
  paintFormXObjectEnd?: number
}

/**
 * Sentinel colour: CAD ACI 7 (AutoCAD “foreground” / auto-contrast).
 *
 * Renders white on a dark CAD canvas and black on a light one.
 */
export const PDF_IMPORT_FOREGROUND_COLOR = 'foreground'

/**
 * PDF page paper tone used when remapping contrast ink.
 *
 * - `light` — typical white paper (black ink → ACI 7)
 * - `dark` — black / dark paper (white ink → ACI 7)
 * - `auto` — infer from the dominant near-black vs near-white paint colours
 */
export type PdfImportPaperTone = 'light' | 'dark' | 'auto'

/**
 * Options for {@link extractPdfImportSubpaths}.
 *
 * PDF ink that matches the opposite of the page paper would vanish on the
 * wrong CAD background if stored as fixed RGB. Contrast ink is mapped to
 * {@link PDF_IMPORT_FOREGROUND_COLOR} (ACI 7) instead.
 */
export interface PdfImportExtractOptions {
  /**
   * Remap paper-contrast ink (black on light paper, white on dark paper) to
   * ACI 7. Default: `true`.
   */
  remapContrastInk?: boolean
  /**
   * Assumed PDF paper tone. Default: `'auto'`.
   */
  paperTone?: PdfImportPaperTone
  /**
   * @deprecated Use {@link PdfImportExtractOptions.remapContrastInk}.
   * When `false`, disables contrast remapping.
   */
  remapDarkColors?: boolean
}

/**
 * Channel ceiling for near-black ink. All RGB components must be below this
 * so CAD primaries (`#0000ff`, …) are not treated as paper black. High
 * enough for the "rich black" design tools emit after CMYK conversion
 * (e.g. `#2c2e35`), which is unreadable on a dark CAD canvas.
 */
const PDF_PAPER_BLACK_CHANNEL = 64

/**
 * Channel floor for near-white ink (dark-paper drawings).
 */
const PDF_PAPER_WHITE_CHANNEL = 208

function parseCssRgb(
  color: string | undefined
): { r: number; g: number; b: number } | undefined {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return undefined
  const value = Number.parseInt(color.slice(1), 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  }
}

/** True when every channel is near black (paper ink on white PDF). */
export function isPdfNearBlackColor(color: string | undefined): boolean {
  const rgb = parseCssRgb(color)
  if (!rgb) return false
  return (
    rgb.r < PDF_PAPER_BLACK_CHANNEL &&
    rgb.g < PDF_PAPER_BLACK_CHANNEL &&
    rgb.b < PDF_PAPER_BLACK_CHANNEL
  )
}

/** True when every channel is near white (paper ink on dark PDF). */
export function isPdfNearWhiteColor(color: string | undefined): boolean {
  const rgb = parseCssRgb(color)
  if (!rgb) return false
  return (
    rgb.r > PDF_PAPER_WHITE_CHANNEL &&
    rgb.g > PDF_PAPER_WHITE_CHANNEL &&
    rgb.b > PDF_PAPER_WHITE_CHANNEL
  )
}

/**
 * Infers PDF paper tone from painted colours.
 *
 * Dark paper is rare; bias toward light so white fills on a normal CAD PDF
 * do not leave near-black linework unmapped (and invisible on a dark canvas).
 * Only classify as dark when near-white ink dominates and near-black is absent.
 */
export function detectPdfImportPaperTone(
  colors: Iterable<string | undefined>
): 'light' | 'dark' {
  let nearBlack = 0
  let nearWhite = 0
  for (const color of colors) {
    if (isPdfNearBlackColor(color)) nearBlack++
    else if (isPdfNearWhiteColor(color)) nearWhite++
  }
  if (nearBlack === 0 && nearWhite >= 8) return 'dark'
  return 'light'
}

/**
 * Maps PDF contrast ink to ACI 7 (`foreground`) based on paper tone.
 *
 * - Light paper + near-black → {@link PDF_IMPORT_FOREGROUND_COLOR}
 * - Dark paper + near-white → {@link PDF_IMPORT_FOREGROUND_COLOR}
 * - Other colours kept as lowercase `#rrggbb`
 */
export function remapPdfImportColor(
  color: string | undefined,
  paperTone: 'light' | 'dark' = 'light'
): string | undefined {
  if (!color) return color
  if (color === PDF_IMPORT_FOREGROUND_COLOR) return color
  if (!parseCssRgb(color)) return color
  if (paperTone === 'light' && isPdfNearBlackColor(color)) {
    return PDF_IMPORT_FOREGROUND_COLOR
  }
  if (paperTone === 'dark' && isPdfNearWhiteColor(color)) {
    return PDF_IMPORT_FOREGROUND_COLOR
  }
  return color.toLowerCase()
}

/**
 * Applies contrast-ink remapping to an extracted page.
 *
 * When `paperTone` is `'auto'`, tone is detected from the raw colours first.
 */
export function applyPdfImportContrastColors(
  content: PdfImportPageContent,
  options?: Pick<
    PdfImportExtractOptions,
    'remapContrastInk' | 'remapDarkColors' | 'paperTone'
  >
): PdfImportPageContent {
  const enabled =
    options?.remapContrastInk !== false && options?.remapDarkColors !== false
  if (!enabled) return content

  const requested = options?.paperTone ?? 'auto'
  const tone =
    requested === 'auto'
      ? detectPdfImportPaperTone([
          ...content.subpaths.map(s => s.color),
          ...content.texts.map(t => t.color)
        ])
      : requested

  return {
    subpaths: content.subpaths.map(subpath => ({
      ...subpath,
      color: remapPdfImportColor(subpath.color, tone),
      ...(subpath.fillColor
        ? { fillColor: remapPdfImportColor(subpath.fillColor, tone) }
        : {})
    })),
    texts: content.texts.map(text => ({
      ...text,
      color: remapPdfImportColor(text.color, tone)
    }))
  }
}

export interface PdfImportOperatorList {
  fnArray: ArrayLike<number>
  argsArray: ArrayLike<unknown>
}

export interface PdfImportedSubpath {
  /** Flattened outline (curves sampled with a fixed step count). */
  points: PdfImportPoint[]
  /**
   * Exact segments of the same subpath. Consumers that recover arcs,
   * circles, ellipses or splines should prefer these over {@link points}.
   */
  segments?: PdfImportSegment[]
  /** True when the subpath was painted by a fill operator. */
  filled?: boolean
  /**
   * True when the paint also stroked the outline (`B`, `b`, ...). Unset for
   * plain strokes, which are always outlines.
   */
  stroked?: boolean
  /** Fill colour of a filled subpath (`#rrggbb` or foreground). */
  fillColor?: string
  /**
   * Subpaths painted by one operator share this number, so an even-odd fill
   * with holes can become one hatch with several loops.
   */
  paintGroup?: number
  /** Stroke width in millimeters, when the PDF set a positive width. */
  lineWidth?: number
  /**
   * Stroke dash pattern in millimeters (alternating dash, gap), when the
   * PDF stroked this subpath dashed. Always an even number of entries.
   */
  dashPattern?: number[]
  /**
   * Index into {@link PdfImportPageContent.formInstances} when the subpath
   * was drawn inside a top-level Form XObject.
   */
  formInstance?: number
  layerName?: string
  /**
   * Paint colour: `#rrggbb`, or {@link PDF_IMPORT_FOREGROUND_COLOR} after
   * contrast remapping.
   */
  color?: string
}

/** One PDF text-showing run, placed on the glyph baseline. */
export interface PdfImportedText {
  text: string
  position: PdfImportPoint
  /** Advance width of the run along the baseline, in millimeters. */
  width?: number
  /**
   * PDF.js font resource id (`setFont` argument). Resolve the font name
   * through `page.commonObjs`.
   */
  fontId?: string
  /** CAD text height in millimeters. */
  height: number
  /** Rotation in radians, counterclockwise from +X. */
  rotation: number
  widthFactor: number
  layerName?: string
  /**
   * Fill (or stroke-only) colour: `#rrggbb`, or
   * {@link PDF_IMPORT_FOREGROUND_COLOR} after contrast remapping.
   */
  color?: string
}

/**
 * One top-level Form XObject paint. PDF.js inlines form content and does not
 * say which form it was, so repeated forms are recognized by comparing the
 * geometry of instances in form-local coordinates.
 */
export interface PdfImportFormInstance {
  /**
   * Affine map from form space to model-space millimeters:
   * `x' = a·x + c·y + e`, `y' = b·x + d·y + f`.
   */
  toCad: { a: number; b: number; c: number; d: number; e: number; f: number }
}

export interface PdfImportPageContent {
  subpaths: PdfImportedSubpath[]
  texts: PdfImportedText[]
  /** Top-level Form XObject paints, referenced by subpath `formInstance`. */
  formInstances?: PdfImportFormInstance[]
}

type PdfMatrix = [number, number, number, number, number, number]

/**
 * Converts one page operator list into model-space subpaths.
 *
 * Coordinates are mapped through the content-stream CTM and then the PDF.js
 * viewport. PDF.js bakes a pure translation `q cm ... Q` into `constructPath`
 * and removes that `transform` op, so this function applies only the
 * transforms that remain in the operator list.
 *
 * @param fallbackLayerName - Layer for geometry outside a single OCG. Omit it
 * for PDFs with no optional content so entities stay on the current layer.
 */
export function extractPdfImportSubpaths(
  opList: PdfImportOperatorList,
  ops: PdfImportOps,
  viewport: PdfImportViewport,
  ocgLayers: ReadonlyMap<string, { layerName: string }>,
  fallbackLayerName?: string,
  options?: PdfImportExtractOptions
): PdfImportPageContent {
  const { fnArray, argsArray } = opList
  const subpathResult: PdfImportedSubpath[] = []
  const formInstances: PdfImportFormInstance[] = []
  let currentFormInstance: number | undefined
  const textResult: PdfImportedText[] = []

  // PDF.js 5.x normally packs path construction into OPS.constructPath.
  // The packed stream uses DrawOPS values from PDF.js shared/util:
  // moveTo=0, lineTo=1, curveTo=2, quadraticCurveTo=3, closePath=4.
  const DRAW_MOVE_TO = 0
  const DRAW_LINE_TO = 1
  const DRAW_CURVE_TO = 2
  const DRAW_QUADRATIC_CURVE_TO = 3
  const DRAW_CLOSE_PATH = 4

  let subpaths: PdfImportedSubpath[] = []
  let current: PdfImportPoint[] = []
  let currentSegments: PdfImportSegment[] = []
  let currentPathLayerName = fallbackLayerName
  let activeLayerName = fallbackLayerName
  const markedContentLayerStack: Array<string | undefined> = []

  let curX = 0
  let curY = 0
  // Start of the current subpath in user space: `h` returns the current
  // point there, so a following `l` without `m` starts from it.
  let startX = 0
  let startY = 0

  let ctm: PdfMatrix = [1, 0, 0, 1, 0, 0]
  let fillColor = '#000000'
  let strokeColor = '#000000'
  let lineWidth = 1
  let dashArray: number[] = []
  // Text state parameters (Tf/Tc/Tw/Tz/TL/Tr/Ts) are graphics-state fields and
  // must round-trip with q/Q. Tm/Tlm and the text cursor are not.
  let fontSize = 0
  let fontId: string | undefined
  let textHScale = 1
  let textRise = 0
  let leading = 0
  let charSpacing = 0
  let wordSpacing = 0
  let textRenderingMode = 0
  type GraphicsStateSnapshot = {
    ctm: PdfMatrix
    fillColor: string
    strokeColor: string
    lineWidth: number
    dashArray: number[]
    fontSize: number
    fontId: string | undefined
    textHScale: number
    textRise: number
    leading: number
    charSpacing: number
    wordSpacing: number
    textRenderingMode: number
  }
  const snapshotGraphicsState = (): GraphicsStateSnapshot => ({
    ctm: cloneMatrix(ctm),
    fillColor,
    strokeColor,
    lineWidth,
    dashArray,
    fontSize,
    fontId,
    textHScale,
    textRise,
    leading,
    charSpacing,
    wordSpacing,
    textRenderingMode
  })
  const restoreGraphicsState = (restored: GraphicsStateSnapshot) => {
    ctm = restored.ctm
    fillColor = restored.fillColor
    strokeColor = restored.strokeColor
    lineWidth = restored.lineWidth
    dashArray = restored.dashArray
    fontSize = restored.fontSize
    fontId = restored.fontId
    textHScale = restored.textHScale
    textRise = restored.textRise
    leading = restored.leading
    charSpacing = restored.charSpacing
    wordSpacing = restored.wordSpacing
    textRenderingMode = restored.textRenderingMode
  }
  // q/Q stack — separate from Form XObject Begin/End so unbalanced save/restore
  // inside a form cannot pop the form entry (or vice versa).
  const graphicsStack: GraphicsStateSnapshot[] = []
  const formStack: GraphicsStateSnapshot[] = []

  let textMatrix: PdfMatrix = [1, 0, 0, 1, 0, 0]
  let textLineMatrix: PdfMatrix = [1, 0, 0, 1, 0, 0]
  let textX = 0
  let textY = 0

  const cloneMatrix = (matrix: PdfMatrix): PdfMatrix => [
    matrix[0],
    matrix[1],
    matrix[2],
    matrix[3],
    matrix[4],
    matrix[5]
  ]

  const multiplyMatrix = (left: PdfMatrix, right: PdfMatrix): PdfMatrix => [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5]
  ]

  const transformPoint = (x: number, y: number) => ({
    x: ctm[0] * x + ctm[2] * y + ctm[4],
    y: ctm[1] * x + ctm[3] * y + ctm[5]
  })

  const flush = () => {
    if (current.length > 1) {
      const subpath: PdfImportedSubpath = {
        points: current,
        segments: currentSegments,
        layerName: currentPathLayerName
      }
      if (currentFormInstance !== undefined) {
        subpath.formInstance = currentFormInstance
      }
      subpaths.push(subpath)
    }
    current = []
    currentSegments = []
    currentPathLayerName = activeLayerName
  }

  const samePoint = (a: PdfImportPoint, b: PdfImportPoint) =>
    a.x === b.x && a.y === b.y

  const closeOpenSubpaths = () => {
    // PDF fill/eoFill implicitly close each open subpath; pdf.js does not
    // always emit DrawOPS.closePath for plain fill paints.
    if (current.length > 0) {
      const first = current[0]
      const last = current[current.length - 1]
      if (!samePoint(first, last)) {
        current.push({ ...first })
        currentSegments.push({ kind: 'line', p0: last, p1: { ...first } })
      }
      flush()
    }
    for (const subpath of subpaths) {
      const pts = subpath.points
      if (pts.length < 2) continue
      const first = pts[0]
      const last = pts[pts.length - 1]
      if (!samePoint(first, last)) {
        pts.push({ ...first })
        subpath.segments?.push({ kind: 'line', p0: last, p1: { ...first } })
      }
    }
  }

  let paintCount = 0
  const commit = (
    color: string = strokeColor,
    filled = false,
    stroked = !filled
  ) => {
    flush()
    const width = stroked ? strokeWidthMm() : 0
    const dashes = stroked ? dashPatternMm() : undefined
    const group = paintCount++
    for (const subpath of subpaths) {
      const result: PdfImportedSubpath = { ...subpath, color }
      if (filled) {
        result.filled = true
        result.fillColor = fillColor
        result.paintGroup = group
        if (stroked) result.stroked = true
      }
      if (width > 0) result.lineWidth = width
      if (dashes) result.dashPattern = dashes
      subpathResult.push(result)
    }
    subpaths = []
  }

  // Dash lengths are in user space like the line width. PDF repeats an odd
  // array to even length ([3] means 3 on, 3 off). All-zero arrays are solid.
  const dashPatternMm = (): number[] | undefined => {
    if (dashArray.length === 0 || dashArray.every(v => !(v > 0))) {
      return undefined
    }
    const scale =
      Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])) * PDF_PT_TO_MM
    const even =
      dashArray.length % 2 === 0 ? dashArray : [...dashArray, ...dashArray]
    return even.map(v => Math.max(0, v) * scale)
  }

  // PDF line width is in user space; the CTM scales it to page points. Use
  // the geometric mean of the axis scales, which is exact for similarity
  // transforms and a reasonable average for skewed ones.
  const strokeWidthMm = () => {
    if (!(lineWidth > 0)) return 0
    const scale = Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]))
    return lineWidth * scale * PDF_PT_TO_MM
  }

  const isStrokePaint = (paintOp: number) =>
    paintOp === ops.stroke ||
    paintOp === ops.closeStroke ||
    paintOp === ops.fillStroke ||
    paintOp === ops.eoFillStroke ||
    paintOp === ops.closeFillStroke ||
    paintOp === ops.closeEOFillStroke

  const isFillPaint = (paintOp: number) =>
    paintOp === ops.fill ||
    paintOp === ops.eoFill ||
    paintOp === ops.fillStroke ||
    paintOp === ops.eoFillStroke ||
    paintOp === ops.closeFillStroke ||
    paintOp === ops.closeEOFillStroke ||
    (ops.rawFillPath !== undefined && paintOp === ops.rawFillPath)

  const paintColor = (paintOp: number): string => {
    if (
      paintOp === ops.fill ||
      paintOp === ops.eoFill ||
      (ops.rawFillPath !== undefined && paintOp === ops.rawFillPath)
    ) {
      return fillColor
    }
    return strokeColor
  }

  const discard = () => {
    current = []
    currentSegments = []
    subpaths = []
    currentPathLayerName = activeLayerName
  }

  const pagePointToCadPoint = (x: number, y: number) => {
    const transformed = transformPoint(x, y)
    const [viewportX, viewportY] = viewport.convertToViewportPoint(
      transformed.x,
      transformed.y
    )

    return {
      x: viewportX * PDF_PT_TO_MM,
      y: (viewport.height - viewportY) * PDF_PT_TO_MM
    }
  }

  const tx = (x: number, y: number) => pagePointToCadPoint(x, y).x
  const ty = (x: number, y: number) => pagePointToCadPoint(x, y).y

  const lastCadPoint = (): PdfImportPoint =>
    current.length > 0
      ? current[current.length - 1]
      : pagePointToCadPoint(curX, curY)

  const moveTo = (x: number, y: number) => {
    flush()
    curX = x
    curY = y
    startX = x
    startY = y
    currentPathLayerName = activeLayerName
    current = [{ x: tx(x, y), y: ty(x, y) }]
  }

  const lineTo = (x: number, y: number) => {
    const p0 = lastCadPoint()
    if (current.length === 0) current.push(p0)
    curX = x
    curY = y
    const p1 = pagePointToCadPoint(x, y)
    current.push(p1)
    currentSegments.push({ kind: 'line', p0, p1 })
  }

  const curveTo = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
    const p0 = lastCadPoint()
    if (current.length === 0) current.push(p0)
    const pts = cubicBezier(
      { x: curX, y: curY },
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y3 },
      BEZIER_STEPS
    )

    for (const point of pts) {
      current.push({ x: tx(point.x, point.y), y: ty(point.x, point.y) })
    }
    // Reuse the last sampled point as p3 so segments and points share the
    // exact same end coordinate.
    currentSegments.push({
      kind: 'cubic',
      p0,
      p1: pagePointToCadPoint(x1, y1),
      p2: pagePointToCadPoint(x2, y2),
      p3: current[current.length - 1]
    })

    curX = x3
    curY = y3
  }

  const quadraticCurveTo = (x1: number, y1: number, x2: number, y2: number) => {
    const p0 = lastCadPoint()
    if (current.length === 0) current.push(p0)
    // Degree elevation: a quadratic is the cubic with controls 2/3 of the way
    // from each end point toward the single quadratic control.
    const c1 = pagePointToCadPoint(
      curX + (2 / 3) * (x1 - curX),
      curY + (2 / 3) * (y1 - curY)
    )
    const c2 = pagePointToCadPoint(
      x2 + (2 / 3) * (x1 - x2),
      y2 + (2 / 3) * (y1 - y2)
    )
    for (let step = 1; step <= BEZIER_STEPS; step++) {
      const t = step / BEZIER_STEPS
      const mt = 1 - t
      const x = mt * mt * curX + 2 * mt * t * x1 + t * t * x2
      const y = mt * mt * curY + 2 * mt * t * y1 + t * t * y2
      current.push({ x: tx(x, y), y: ty(x, y) })
    }
    currentSegments.push({
      kind: 'cubic',
      p0,
      p1: c1,
      p2: c2,
      p3: current[current.length - 1]
    })

    curX = x2
    curY = y2
  }

  const closePath = () => {
    if (current.length > 0) {
      const first = current[0]
      const last = current[current.length - 1]
      current.push({ ...first })
      if (!samePoint(first, last)) {
        currentSegments.push({ kind: 'line', p0: last, p1: { ...first } })
      }
    }
    curX = startX
    curY = startY
    flush()
  }

  const rectangle = (x: number, y: number, width: number, height: number) => {
    moveTo(x, y)
    lineTo(x + width, y)
    lineTo(x + width, y + height)
    lineTo(x, y + height)
    closePath()
  }

  const isArrayLikePathData = (value: unknown) =>
    Array.isArray(value) || ArrayBuffer.isView(value)

  const processPackedPathStream = (stream: ArrayLike<unknown>) => {
    if (stream.length === 0 || stream[0] == null) return

    let index = 0
    const take = () => Number(stream[index++])

    while (index < stream.length) {
      const pathOp = Number(stream[index++])

      switch (pathOp) {
        case DRAW_MOVE_TO:
          moveTo(take(), take())
          break

        case DRAW_LINE_TO:
          lineTo(take(), take())
          break

        case DRAW_CURVE_TO:
          curveTo(take(), take(), take(), take(), take(), take())
          break

        case DRAW_QUADRATIC_CURVE_TO:
          quadraticCurveTo(take(), take(), take(), take())
          break

        case DRAW_CLOSE_PATH:
          closePath()
          break

        default:
          // Unknown DrawOPS — stop this stream so we do not desync
          // coordinates, but keep geometry already collected for paint.
          return
      }
    }
  }

  // Compatibility with older operator-list shapes where path operation codes
  // and coordinates were delivered as separate arrays.
  const processSplitPathStream = (
    pathOps: ArrayLike<unknown>,
    pathArgs: ArrayLike<unknown>
  ) => {
    let argIndex = 0
    const take = () => Number(pathArgs[argIndex++])

    for (let i = 0; i < pathOps.length; i++) {
      const pathOp = Number(pathOps[i])

      switch (pathOp) {
        case DRAW_MOVE_TO:
        case ops.moveTo:
          moveTo(take(), take())
          break

        case DRAW_LINE_TO:
        case ops.lineTo:
          lineTo(take(), take())
          break

        case DRAW_CURVE_TO:
        case ops.curveTo:
          curveTo(take(), take(), take(), take(), take(), take())
          break

        case DRAW_QUADRATIC_CURVE_TO:
          quadraticCurveTo(take(), take(), take(), take())
          break

        case ops.curveTo2:
          curveTo(curX, curY, take(), take(), take(), take())
          break

        case ops.curveTo3: {
          // PDF "y": second control coincides with the end point (x3, y3).
          const x1 = take()
          const y1 = take()
          const x3 = take()
          const y3 = take()
          curveTo(x1, y1, x3, y3, x3, y3)
          break
        }

        case ops.rectangle:
          rectangle(take(), take(), take(), take())
          break

        case DRAW_CLOSE_PATH:
        case ops.closePath:
          closePath()
          break
      }
    }
  }

  const finishConstructPath = (paintOp: number) => {
    if (paintOp === ops.endPath) {
      // PDF "n" ends the current path without painting it, commonly after
      // clipping. Do not create CAD entities from those paths.
      discard()
      return
    }

    if (
      paintOp === ops.stroke ||
      paintOp === ops.closeStroke ||
      paintOp === ops.fill ||
      paintOp === ops.eoFill ||
      paintOp === ops.fillStroke ||
      paintOp === ops.eoFillStroke ||
      paintOp === ops.closeFillStroke ||
      paintOp === ops.closeEOFillStroke ||
      (ops.rawFillPath !== undefined && paintOp === ops.rawFillPath)
    ) {
      if (isFillPaint(paintOp)) {
        closeOpenSubpaths()
      } else if (
        paintOp === ops.closeStroke ||
        paintOp === ops.closeFillStroke ||
        paintOp === ops.closeEOFillStroke
      ) {
        closePath()
      }
      commit(paintColor(paintOp), isFillPaint(paintOp), isStrokePaint(paintOp))
    } else {
      // Unrecognized paint op — drop the path rather than inventing a stroke
      // at EOF via a trailing commit.
      discard()
    }
  }

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const value = argsArray[i]
    const rawArgs = Array.isArray(value) ? (value as unknown[]) : []

    if (fn === ops.save) {
      graphicsStack.push(snapshotGraphicsState())
      continue
    }

    if (fn === ops.restore) {
      const restored = graphicsStack.pop()
      if (restored) restoreGraphicsState(restored)
      continue
    }

    if (fn === ops.setFillRGBColor) {
      const color = readCssColor(rawArgs[0])
      if (color) fillColor = color
      continue
    }

    if (ops.setDash !== undefined && fn === ops.setDash) {
      const list = asNumberList(rawArgs[0])
      dashArray = list
        ? Array.from(list, Number).filter(v => Number.isFinite(v))
        : []
      continue
    }

    if (ops.setLineWidth !== undefined && fn === ops.setLineWidth) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value) && value >= 0) lineWidth = value
      continue
    }

    if (fn === ops.setStrokeRGBColor) {
      const color = readCssColor(rawArgs[0])
      if (color) strokeColor = color
      continue
    }

    if (fn === ops.beginText) {
      textMatrix = [1, 0, 0, 1, 0, 0]
      textLineMatrix = [1, 0, 0, 1, 0, 0]
      textX = 0
      textY = 0
      continue
    }

    if (fn === ops.endText) {
      continue
    }

    if (fn === ops.setFont) {
      const size = Number(rawArgs[1])
      if (Number.isFinite(size)) fontSize = size
      if (typeof rawArgs[0] === 'string') fontId = rawArgs[0]
      continue
    }

    if (fn === ops.setTextMatrix) {
      const matrix = readMatrix(rawArgs)
      if (matrix) {
        textMatrix = matrix
        textLineMatrix = cloneMatrix(matrix)
        textX = 0
        textY = 0
      }
      continue
    }

    if (fn === ops.moveText) {
      moveTextLine(Number(rawArgs[0]), Number(rawArgs[1]))
      continue
    }

    if (fn === ops.setLeadingMoveText) {
      const ty = Number(rawArgs[1])
      leading = -ty
      moveTextLine(Number(rawArgs[0]), ty)
      continue
    }

    if (fn === ops.nextLine) {
      moveTextLine(0, -leading)
      continue
    }

    if (fn === ops.setLeading) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) leading = value
      continue
    }

    if (fn === ops.setCharSpacing) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) charSpacing = value
      continue
    }

    if (fn === ops.setWordSpacing) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) wordSpacing = value
      continue
    }

    if (fn === ops.setHScale) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) textHScale = value / 100
      continue
    }

    if (fn === ops.setTextRise) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) textRise = value
      continue
    }

    if (fn === ops.setTextRenderingMode) {
      const value = Number(rawArgs[0])
      if (Number.isFinite(value)) textRenderingMode = value
      continue
    }

    if (fn === ops.showText) {
      showGlyphs(rawArgs[0])
      continue
    }

    if (fn === ops.transform) {
      if (rawArgs.length >= 6) {
        const next: PdfMatrix = [
          Number(rawArgs[0]),
          Number(rawArgs[1]),
          Number(rawArgs[2]),
          Number(rawArgs[3]),
          Number(rawArgs[4]),
          Number(rawArgs[5])
        ]
        ctm = multiplyMatrix(ctm, next)
      }
      continue
    }

    if (fn === ops.beginMarkedContent) {
      markedContentLayerStack.push(activeLayerName)
      continue
    }

    if (fn === ops.beginMarkedContentProps) {
      markedContentLayerStack.push(activeLayerName)

      const target = getPdfMarkedContentTarget(rawArgs)
      if (target.kind === 'ocg') {
        activeLayerName = ocgLayers.get(target.id)?.layerName ?? fallbackLayerName
      } else if (target.kind === 'fallback') {
        activeLayerName = fallbackLayerName
      }
      continue
    }

    if (fn === ops.endMarkedContent) {
      activeLayerName = markedContentLayerStack.pop() ?? fallbackLayerName
      continue
    }

    if (
      ops.paintFormXObjectBegin !== undefined &&
      fn === ops.paintFormXObjectBegin
    ) {
      formStack.push(snapshotGraphicsState())
      const matrix = readMatrix(rawArgs)
      if (matrix) {
        ctm = multiplyMatrix(ctm, matrix)
      }
      if (formStack.length === 1) {
        // Sample the form-space → model-space map; both the CTM and the
        // viewport transform are affine.
        const o = pagePointToCadPoint(0, 0)
        const ux = pagePointToCadPoint(1, 0)
        const uy = pagePointToCadPoint(0, 1)
        formInstances.push({
          toCad: {
            a: ux.x - o.x,
            b: ux.y - o.y,
            c: uy.x - o.x,
            d: uy.y - o.y,
            e: o.x,
            f: o.y
          }
        })
        currentFormInstance = formInstances.length - 1
      }
      continue
    }

    if (
      ops.paintFormXObjectEnd !== undefined &&
      fn === ops.paintFormXObjectEnd
    ) {
      const restored = formStack.pop()
      if (restored) restoreGraphicsState(restored)
      if (formStack.length === 0) currentFormInstance = undefined
      continue
    }

    switch (fn) {
      case ops.constructPath: {
        const first = rawArgs[0]
        const second = rawArgs[1]

        if (isArrayLikePathData(first) && isArrayLikePathData(second)) {
          processSplitPathStream(
            first as ArrayLike<unknown>,
            second as ArrayLike<unknown>
          )
          break
        }

        const paintOp = Number(first)

        // PDF.js 5.x shape:
        // [paintOp, [Float32Array(DrawOPS + coordinates)], minMax]
        if (Array.isArray(second)) {
          for (const stream of second) {
            if (!isArrayLikePathData(stream)) continue
            processPackedPathStream(stream as ArrayLike<unknown>)
          }
        } else if (isArrayLikePathData(second)) {
          processPackedPathStream(second as ArrayLike<unknown>)
        }

        finishConstructPath(paintOp)
        break
      }

      case ops.moveTo: {
        const args = rawArgs as number[]
        moveTo(args[0], args[1])
        break
      }

      case ops.lineTo: {
        const args = rawArgs as number[]
        lineTo(args[0], args[1])
        break
      }

      case ops.curveTo: {
        const args = rawArgs as number[]
        curveTo(args[0], args[1], args[2], args[3], args[4], args[5])
        break
      }

      case ops.curveTo2: {
        const args = rawArgs as number[]
        curveTo(curX, curY, args[0], args[1], args[2], args[3])
        break
      }

      case ops.curveTo3: {
        // PDF "y": second control coincides with the end point.
        const args = rawArgs as number[]
        curveTo(args[0], args[1], args[2], args[3], args[2], args[3])
        break
      }

      case ops.rectangle: {
        const args = rawArgs as number[]
        rectangle(args[0], args[1], args[2], args[3])
        break
      }

      case ops.closePath:
        closePath()
        break

      case ops.closeStroke:
      case ops.closeFillStroke:
      case ops.closeEOFillStroke:
        closePath()
        if (isFillPaint(fn)) {
          closeOpenSubpaths()
        }
        commit(paintColor(fn), isFillPaint(fn), isStrokePaint(fn))
        break

      case ops.stroke:
        commit(paintColor(fn))
        break

      case ops.fill:
      case ops.eoFill:
      case ops.fillStroke:
      case ops.eoFillStroke:
        closeOpenSubpaths()
        commit(paintColor(fn), true, isStrokePaint(fn))
        break

      case ops.endPath:
        discard()
        break
    }
  }

  // Drop any path that never received a paint operator.
  discard()
  const content = applyPdfImportContrastColors(
    { subpaths: subpathResult, texts: textResult },
    options
  )
  if (formInstances.length > 0) content.formInstances = formInstances
  return content

  // Hoisted so the operator loop above can call them.
  function moveTextLine(tx: number, ty: number) {
    // Td offsets are in text space: Tlm' = [1 0 0 1 tx ty] × Tlm (row form),
    // so the shift applies before Tlm and is scaled by the font matrix.
    const shift: PdfMatrix = [1, 0, 0, 1, tx, ty]
    textLineMatrix = multiplyMatrix(textLineMatrix, shift)
    textMatrix = cloneMatrix(textLineMatrix)
    textX = 0
    textY = 0
  }

  function showGlyphs(glyphs: unknown) {
    const list = asNumberList(glyphs)
    if (!list) return

    let text = ''
    let advance = 0
    const widthAdvanceScale = fontSize * 0.001
    for (let index = 0; index < list.length; index++) {
      const glyph = list[index]
      if (typeof glyph === 'number') {
        // TJ spacing is in thousandths of a unit; a positive value moves left.
        advance += (-glyph * fontSize) / 1000
        continue
      }
      if (!glyph || typeof glyph !== 'object') continue
      const record = glyph as {
        unicode?: unknown
        fontChar?: unknown
        width?: unknown
        isSpace?: unknown
      }
      const unicode = typeof record.unicode === 'string' ? record.unicode : ''
      const fontChar =
        typeof record.fontChar === 'string' ? record.fontChar : ''
      text += unicode || fontChar
      const width = typeof record.width === 'number' ? record.width : 0
      const spacing = (record.isSpace ? wordSpacing : 0) + charSpacing
      advance += width * widthAdvanceScale + spacing
    }

    text = text.split('\u0000').join('')
    const paints = (textRenderingMode & 3) !== 3
    if (paints && fontSize !== 0 && text.length > 0) {
      const origin = textPointToCad(textX, textY + textRise)
      const alongX = textPointToCad(textX + textHScale, textY + textRise)
      const alongY = textPointToCad(textX, textY + textRise + fontSize)
      const dx = alongX.x - origin.x
      const dy = alongX.y - origin.y
      const height = Math.hypot(alongY.x - origin.x, alongY.y - origin.y)
      const unitY = fontSize > 0 ? height / fontSize : 0
      const widthFactor = unitY > 1e-9 ? Math.hypot(dx, dy) / unitY : textHScale
      const end = textPointToCad(textX + advance * textHScale, textY + textRise)
      if (height > 1e-9) {
        textResult.push({
          text,
          position: origin,
          width: Math.hypot(end.x - origin.x, end.y - origin.y),
          height,
          rotation: Math.atan2(dy, dx),
          widthFactor,
          layerName: activeLayerName,
          color: (textRenderingMode & 3) === 1 ? strokeColor : fillColor,
          ...(fontId !== undefined ? { fontId } : {})
        })
      }
    }
    textX += advance * textHScale
  }

  function textPointToCad(x: number, y: number) {
    const userX = textMatrix[0] * x + textMatrix[2] * y + textMatrix[4]
    const userY = textMatrix[1] * x + textMatrix[3] * y + textMatrix[5]
    return pagePointToCadPoint(userX, userY)
  }
}

/**
 * Approximates a cubic Bezier curve as a polyline.
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param steps - Number of line segments to generate
 * @returns Sampled points along the curve (excluding `p0`)
 */
function readCssColor(value: unknown): string | undefined {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase()
  }
  return undefined
}

function readMatrix(rawArgs: unknown[]): PdfMatrix | undefined {
  // Text matrix ops pass six numbers (or one Float32Array). Form XObject
  // begin passes `[matrix, bbox]`, so prefer a nested 6-vector when present.
  const nested = asNumberList(rawArgs[0])
  const source =
    nested && nested.length >= 6
      ? nested
      : rawArgs.length >= 6
        ? rawArgs
        : undefined
  if (!source || source.length < 6) return undefined
  return [
    Number(source[0]),
    Number(source[1]),
    Number(source[2]),
    Number(source[3]),
    Number(source[4]),
    Number(source[5])
  ]
}

function asNumberList(value: unknown): ArrayLike<unknown> | undefined {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return value as ArrayLike<unknown>
  }
  return undefined
}

function cubicBezier(
  p0: PdfImportPoint,
  p1: PdfImportPoint,
  p2: PdfImportPoint,
  p3: PdfImportPoint,
  steps: number
): PdfImportPoint[] {
  const pts: PdfImportPoint[] = []

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    const x =
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x
    const y =
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y

    pts.push({ x, y })
  }

  return pts
}
