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
}

export interface PdfImportOperatorList {
  fnArray: ArrayLike<number>
  argsArray: ArrayLike<unknown>
}

export interface PdfImportedSubpath {
  points: PdfImportPoint[]
  layerName?: string
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
): PdfImportedSubpath[] {
  const { fnArray, argsArray } = opList
  const result: PdfImportedSubpath[] = []

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
  const ctmStack: PdfMatrix[] = []

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

  const commit = () => {
    flush()
    result.push(...subpaths)
    subpaths = []
  }

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
        commit()
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
      ctmStack.push(cloneMatrix(ctm))
      continue
    }

    if (fn === ops.restore) {
      const restored = ctmStack.pop()
      if (restored) {
        ctm = restored
      }
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
        commit()
        break

      case ops.stroke:
      case ops.fill:
      case ops.eoFill:
      case ops.fillStroke:
      case ops.eoFillStroke:
        commit()
        break

      case ops.endPath:
        discard()
        break
    }
  }

  commit()
  return result
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
