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
}

export interface PdfImportOperatorList {
  fnArray: ArrayLike<number>
  argsArray: ArrayLike<unknown>
}

export interface PdfImportedSubpath {
  points: PdfImportPoint[]
  layerName?: string
  /** `#rrggbb` from the stroke or fill color that painted this path. */
  color?: string
}

/** One PDF text-showing run, placed on the glyph baseline. */
export interface PdfImportedText {
  text: string
  position: PdfImportPoint
  /** CAD text height in millimeters. */
  height: number
  /** Rotation in radians, counterclockwise from +X. */
  rotation: number
  widthFactor: number
  layerName?: string
  /** `#rrggbb` fill color, or the stroke color for stroke-only text. */
  color?: string
}

export interface PdfImportPageContent {
  subpaths: PdfImportedSubpath[]
  texts: PdfImportedText[]
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
  fallbackLayerName?: string
): PdfImportPageContent {
  const { fnArray, argsArray } = opList
  const subpathResult: PdfImportedSubpath[] = []
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
  let currentPathLayerName = fallbackLayerName
  let activeLayerName = fallbackLayerName
  const markedContentLayerStack: Array<string | undefined> = []

  let curX = 0
  let curY = 0

  let ctm: PdfMatrix = [1, 0, 0, 1, 0, 0]
  let fillColor = '#000000'
  let strokeColor = '#000000'
  // Text state parameters (Tf/Tc/Tw/Tz/TL/Tr/Ts) are graphics-state fields and
  // must round-trip with q/Q. Tm/Tlm and the text cursor are not.
  let fontSize = 0
  let textHScale = 1
  let textRise = 0
  let leading = 0
  let charSpacing = 0
  let wordSpacing = 0
  let textRenderingMode = 0
  const graphicsStack: Array<{
    ctm: PdfMatrix
    fillColor: string
    strokeColor: string
    fontSize: number
    textHScale: number
    textRise: number
    leading: number
    charSpacing: number
    wordSpacing: number
    textRenderingMode: number
  }> = []

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
      subpaths.push({
        points: current,
        layerName: currentPathLayerName
      })
    }
    current = []
    currentPathLayerName = activeLayerName
  }

  const commit = (color: string = strokeColor) => {
    flush()
    for (const subpath of subpaths) {
      subpathResult.push({ ...subpath, color })
    }
    subpaths = []
  }

  const paintColor = (paintOp: number) =>
    paintOp === ops.fill || paintOp === ops.eoFill ? fillColor : strokeColor

  const discard = () => {
    current = []
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

  const moveTo = (x: number, y: number) => {
    flush()
    curX = x
    curY = y
    currentPathLayerName = activeLayerName
    current = [{ x: tx(x, y), y: ty(x, y) }]
  }

  const lineTo = (x: number, y: number) => {
    curX = x
    curY = y
    current.push({ x: tx(x, y), y: ty(x, y) })
  }

  const curveTo = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => {
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

    curX = x3
    curY = y3
  }

  const quadraticCurveTo = (x1: number, y1: number, x2: number, y2: number) => {
    for (let step = 1; step <= BEZIER_STEPS; step++) {
      const t = step / BEZIER_STEPS
      const mt = 1 - t
      const x = mt * mt * curX + 2 * mt * t * x1 + t * t * x2
      const y = mt * mt * curY + 2 * mt * t * y1 + t * t * y2
      current.push({ x: tx(x, y), y: ty(x, y) })
    }

    curX = x2
    curY = y2
  }

  const closePath = () => {
    if (current.length > 0) {
      current.push({ ...current[0] })
    }
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
          // Avoid consuming coordinates with an unknown DrawOPS value.
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
    switch (paintOp) {
      case ops.stroke:
      case ops.closeStroke:
      case ops.fill:
      case ops.eoFill:
      case ops.fillStroke:
      case ops.eoFillStroke:
      case ops.closeFillStroke:
      case ops.closeEOFillStroke:
        commit(paintColor(paintOp))
        break

      case ops.endPath:
        // PDF "n" ends the current path without painting it, commonly after
        // clipping. Do not create CAD entities from those paths.
        discard()
        break
    }
  }

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const value = argsArray[i]
    const rawArgs = Array.isArray(value) ? (value as unknown[]) : []

    if (fn === ops.save) {
      graphicsStack.push({
        ctm: cloneMatrix(ctm),
        fillColor,
        strokeColor,
        fontSize,
        textHScale,
        textRise,
        leading,
        charSpacing,
        wordSpacing,
        textRenderingMode
      })
      continue
    }

    if (fn === ops.restore) {
      const restored = graphicsStack.pop()
      if (restored) {
        ctm = restored.ctm
        fillColor = restored.fillColor
        strokeColor = restored.strokeColor
        fontSize = restored.fontSize
        textHScale = restored.textHScale
        textRise = restored.textRise
        leading = restored.leading
        charSpacing = restored.charSpacing
        wordSpacing = restored.wordSpacing
        textRenderingMode = restored.textRenderingMode
      }
      continue
    }

    if (fn === ops.setFillRGBColor) {
      const color = readCssColor(rawArgs[0])
      if (color) fillColor = color
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
        commit(paintColor(fn))
        break

      case ops.stroke:
      case ops.fill:
      case ops.eoFill:
      case ops.fillStroke:
      case ops.eoFillStroke:
        commit(paintColor(fn))
        break

      case ops.endPath:
        discard()
        break
    }
  }

  commit()
  return { subpaths: subpathResult, texts: textResult }

  // Hoisted so the operator loop above can call them.
  function moveTextLine(tx: number, ty: number) {
    const shift: PdfMatrix = [1, 0, 0, 1, tx, ty]
    textLineMatrix = multiplyMatrix(shift, textLineMatrix)
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
      if (height > 1e-9) {
        textResult.push({
          text,
          position: origin,
          height,
          rotation: Math.atan2(dy, dx),
          widthFactor,
          layerName: activeLayerName,
          color: (textRenderingMode & 3) === 1 ? strokeColor : fillColor
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
  const nested =
    rawArgs.length === 1 ? asNumberList(rawArgs[0]) : undefined
  const source = nested && nested.length >= 6 ? nested : rawArgs
  if (source.length < 6) return undefined
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
