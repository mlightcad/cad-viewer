import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import {
  AcDbLine,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d,
  log
} from '@mlightcad/data-model'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type { PDFOperatorList } from 'pdfjs-dist/types/src/display/api'

import {
  collectPdfOcgLayers,
  getPdfOcgIdFromMarkedContentArgs,
  PDF_FALLBACK_LAYER,
  type PdfOcgLayerInfo,
  type PdfOptionalContentConfigLike
} from './pdfOptionalContent'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** 1 PDF point in mm (1 pt = 1/72 inch = 25.4/72 mm) */
const PT_TO_MM = 25.4 / 72

/** Bezier approximation resolution (line segments per curve) */
const BEZIER_STEPS = 8

/** 2D point in PDF user space before conversion to model-space mm. */
type Point2 = { x: number; y: number }

type PdfVectorEntity = AcDbPolyline | AcDbLine

type LayeredSubpath = {
  points: Point2[]
  layerName?: string
}

/**
 * Converts a PDF file into CAD entities appended to the current document's
 * model space.
 */
export class AcApPdfImportConvertor {
  /**
   * Prompts the user to pick a PDF file and imports vector geometry.
   *
   * @param context - Application context for the target document
   */
  importFromFilePicker(context: AcApContext): Promise<void> {
    return new Promise(resolve => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.pdf'
      input.style.display = 'none'
      document.body.appendChild(input)

      let settled = false

      const finish = () => {
        if (settled) return
        settled = true
        input.remove()
        resolve()
      }

      input.addEventListener(
        'change',
        async () => {
          try {
            const file = input.files?.[0]
            if (!file) return
            const buffer = await file.arrayBuffer()
            await this.convert(context, buffer)
          } finally {
            finish()
          }
        },
        { once: true }
      )

      input.addEventListener('cancel', finish, { once: true })
      input.click()
    })
  }
  async convert(context: AcApContext, data: ArrayBuffer, pageNumber = 1) {
    try {
      const pdf = await pdfjsLib.getDocument({ data }).promise
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })

      const operatorList = await page.getOperatorList()
      const optionalContentConfig = (await pdf.getOptionalContentConfig({
        intent: 'display'
      })) as PdfOptionalContentConfigLike

      const ocgLayers = collectPdfOcgLayers(
        operatorList,
        pdfjsLib.OPS.beginMarkedContentProps,
        optionalContentConfig
      )

      // Preserve the pre-OCG flat-import behavior for PDFs without optional
      // content. Only create a fallback layer when the page actually contains
      // OCGs and some vector geometry lives outside them.
      const fallbackLayerName =
        ocgLayers.size > 0 ? PDF_FALLBACK_LAYER : undefined

      const entities = this.extractEntities(
        operatorList,
        viewport,
        ocgLayers,
        fallbackLayerName
      )

      if (entities.length === 0) {
        log.warn('[PdfImport] No vector geometry found in PDF page.')
        return
      }

      const usedLayerNames = new Set<string>()
      for (const entity of entities) {
        if (entity.layer) {
          usedLayerNames.add(entity.layer)
        }
      }

      const layerService = context.doc.layerService
      if (usedLayerNames.size > 0) {
        layerService.createLayers([...usedLayerNames])
      }

      for (const layerInfo of ocgLayers.values()) {
        if (!usedLayerNames.has(layerInfo.layerName)) continue
        layerService.setLayerOn(layerInfo.layerName, layerInfo.visible)
      }

      const modelSpace = context.doc.database.tables.blockTable.modelSpace
      for (const entity of entities) {
        modelSpace.appendEntity(entity)
      }

      log.info(
        `[PdfImport] Imported ${entities.length} entities across ${usedLayerNames.size} CAD layer(s).`
      )
    } catch (err) {
      log.error('[PdfImport] Failed to import PDF:', err)
    }
  }

  private extractEntities(
    opList: PDFOperatorList,
    viewport: {
      height: number
      convertToViewportPoint(x: number, y: number): number[]
    },
    ocgLayers: ReadonlyMap<string, PdfOcgLayerInfo>,
    fallbackLayerName?: string
  ): PdfVectorEntity[] {
    const { OPS } = pdfjsLib
    const { fnArray, argsArray } = opList
    const result: PdfVectorEntity[] = []

    // PDF.js 5.x normally packs path construction into OPS.constructPath.
    // The packed stream uses DrawOPS values from PDF.js shared/util:
    // moveTo=0, lineTo=1, curveTo=2, quadraticCurveTo=3, closePath=4.
    const DRAW_MOVE_TO = 0
    const DRAW_LINE_TO = 1
    const DRAW_CURVE_TO = 2
    const DRAW_QUADRATIC_CURVE_TO = 3
    const DRAW_CLOSE_PATH = 4

    let subpaths: LayeredSubpath[] = []
    let current: Point2[] = []
    let currentPathLayerName = fallbackLayerName
    let activeLayerName = fallbackLayerName
    const markedContentLayerStack: Array<string | undefined> = []

    let curX = 0
    let curY = 0

    type PdfMatrix = [number, number, number, number, number, number]

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
      for (const subpath of subpaths) {
        const entity = this.subpathToEntity(subpath.points, subpath.layerName)
        if (entity) result.push(entity)
      }
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
        x: viewportX * PT_TO_MM,
        y: (viewport.height - viewportY) * PT_TO_MM
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

    const quadraticCurveTo = (
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
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
          case OPS.moveTo:
            moveTo(take(), take())
            break

          case DRAW_LINE_TO:
          case OPS.lineTo:
            lineTo(take(), take())
            break

          case DRAW_CURVE_TO:
          case OPS.curveTo:
            curveTo(take(), take(), take(), take(), take(), take())
            break

          case DRAW_QUADRATIC_CURVE_TO:
            quadraticCurveTo(take(), take(), take(), take())
            break

          case OPS.curveTo2:
            curveTo(curX, curY, take(), take(), take(), take())
            break

          case OPS.curveTo3: {
            const x1 = take()
            const y1 = take()
            const x3 = take()
            const y3 = take()
            curveTo(x1, y1, x3, y3, x3, y3)
            break
          }

          case OPS.rectangle:
            rectangle(take(), take(), take(), take())
            break

          case DRAW_CLOSE_PATH:
          case OPS.closePath:
            closePath()
            break
        }
      }
    }

    const finishConstructPath = (paintOp: number) => {
      switch (paintOp) {
        case OPS.stroke:
        case OPS.closeStroke:
        case OPS.fill:
        case OPS.eoFill:
        case OPS.fillStroke:
        case OPS.eoFillStroke:
        case OPS.closeFillStroke:
        case OPS.closeEOFillStroke:
          commit()
          break

        case OPS.endPath:
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

      if (fn === OPS.save) {
        ctmStack.push(cloneMatrix(ctm))
        continue
      }

      if (fn === OPS.restore) {
        const restored = ctmStack.pop()
        if (restored) {
          ctm = restored
        }
        continue
      }

      if (fn === OPS.transform) {
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

      if (fn === OPS.beginMarkedContent) {
        markedContentLayerStack.push(activeLayerName)
        continue
      }

      if (fn === OPS.beginMarkedContentProps) {
        markedContentLayerStack.push(activeLayerName)

        const ocgId = getPdfOcgIdFromMarkedContentArgs(rawArgs)
        if (ocgId) {
          activeLayerName = ocgLayers.get(ocgId)?.layerName ?? fallbackLayerName
        }
        continue
      }

      if (fn === OPS.endMarkedContent) {
        activeLayerName = markedContentLayerStack.pop() ?? fallbackLayerName
        continue
      }

      switch (fn) {
        case OPS.constructPath: {
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

        case OPS.moveTo: {
          const args = rawArgs as number[]
          moveTo(args[0], args[1])
          break
        }

        case OPS.lineTo: {
          const args = rawArgs as number[]
          lineTo(args[0], args[1])
          break
        }

        case OPS.curveTo: {
          const args = rawArgs as number[]
          curveTo(args[0], args[1], args[2], args[3], args[4], args[5])
          break
        }

        case OPS.curveTo2: {
          const args = rawArgs as number[]
          curveTo(curX, curY, args[0], args[1], args[2], args[3])
          break
        }

        case OPS.curveTo3: {
          const args = rawArgs as number[]
          curveTo(args[0], args[1], args[2], args[3], args[2], args[3])
          break
        }

        case OPS.rectangle: {
          const args = rawArgs as number[]
          rectangle(args[0], args[1], args[2], args[3])
          break
        }

        case OPS.closePath:
          closePath()
          break

        case OPS.closeStroke:
        case OPS.closeFillStroke:
        case OPS.closeEOFillStroke:
          closePath()
          commit()
          break

        case OPS.stroke:
        case OPS.fill:
        case OPS.eoFill:
        case OPS.fillStroke:
        case OPS.eoFillStroke:
          commit()
          break

        case OPS.endPath:
          discard()
          break
      }
    }

    commit()
    return result
  }
  private subpathToEntity(
    pts: Point2[],
    layerName?: string
  ): PdfVectorEntity | null {
    if (pts.length < 2) return null

    if (pts.length === 2) {
      const line = new AcDbLine(
        new AcGePoint3d(pts[0].x, pts[0].y, 0),
        new AcGePoint3d(pts[1].x, pts[1].y, 0)
      )
      if (layerName) {
        line.layer = layerName
      }
      return line
    }

    const poly = new AcDbPolyline()
    if (layerName) {
      poly.layer = layerName
    }

    for (let i = 0; i < pts.length; i++) {
      poly.addVertexAt(i, new AcGePoint2d(pts[i].x, pts[i].y))
    }

    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y

    if (Math.sqrt(dx * dx + dy * dy) < 1e-6) {
      poly.closed = true
    }

    return poly
  }
}

/**
 * Approximates a cubic Bأ©zier curve as a polyline.
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param steps - Number of line segments to generate
 * @returns Sampled points along the curve (excluding `p0`)
 */
function cubicBezier(
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
  steps: number
): Point2[] {
  const pts: Point2[] = []

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
