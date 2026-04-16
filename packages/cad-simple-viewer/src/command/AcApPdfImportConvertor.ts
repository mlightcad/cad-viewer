import {
  AcDbLine,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d,
  log
} from '@mlightcad/data-model'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFOperatorList } from 'pdfjs-dist/types/src/display/api'

import { AcApDocManager } from '../app'

// Configure pdf.js worker — use the bundled fake worker for browser builds
// without a separate worker file dependency.
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

/** 1 PDF point in mm (1 pt = 1/72 inch = 25.4/72 mm) */
const PT_TO_MM = 25.4 / 72

/** Bezier approximation resolution (line segments per curve) */
const BEZIER_STEPS = 8

type Point2 = { x: number; y: number }

/**
 * Converts a PDF file (ArrayBuffer) into CAD entities appended to the current
 * document's model space.
 *
 * Vector extraction strategy:
 * - PDF path operators (moveTo / lineTo / curveTo / closePath) → AcDbPolyline
 * - Individual line segments → AcDbLine
 * - Cubic bezier curves are approximated as polyline segments
 *
 * Fallback:
 * - If pdfjs fails or no vector paths are found, a warning is logged.
 *
 * Coordinate mapping:
 * - 1 PDF point ≈ 0.3528 mm → scaled to drawing mm units
 * - PDF origin is bottom-left, Y increases upward (same as CAD)
 */
export class AcApPdfImportConvertor {
  /**
   * Prompts the user to pick a PDF file, then imports the first page's vector
   * geometry into the current document.
   */
  importFromFilePicker() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      document.body.removeChild(input)
      if (!file) return
      const buffer = await file.arrayBuffer()
      await this.convert(buffer)
    })

    input.click()
  }

  /**
   * Converts the first page of a PDF ArrayBuffer into CAD entities.
   * @param data - Raw PDF bytes
   * @param pageNumber - 1-based page number (default: 1)
   */
  async convert(data: ArrayBuffer, pageNumber = 1) {
    try {
      const pdf = await pdfjsLib.getDocument({ data }).promise
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const pageHeight = viewport.height

      const operatorList = await page.getOperatorList()
      const entities = this.extractEntities(operatorList, pageHeight)

      if (entities.length === 0) {
        log.warn('[PdfImport] No vector paths found in PDF page.')
        return
      }

      const modelSpace =
        AcApDocManager.instance.curDocument.database.tables.blockTable
          .modelSpace

      for (const entity of entities) {
        modelSpace.appendEntity(entity)
      }

      log.info(`[PdfImport] Imported ${entities.length} entities from PDF.`)
    } catch (err) {
      log.error('[PdfImport] Failed to import PDF:', err)
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private extractEntities(
    opList: PDFOperatorList,
    pageHeight: number
  ): (AcDbPolyline | AcDbLine)[] {
    const { OPS } = pdfjsLib
    const { fnArray, argsArray } = opList
    const result: (AcDbPolyline | AcDbLine)[] = []

    // Current path accumulator
    let subpaths: Point2[][] = []
    let current: Point2[] = []
    let curX = 0
    let curY = 0

    const flush = () => {
      if (current.length > 1) subpaths.push(current)
      current = []
    }

    const commit = () => {
      flush()
      for (const sp of subpaths) {
        const entity = this.subpathToEntity(sp)
        if (entity) result.push(entity)
      }
      subpaths = []
    }

    // Flip Y: PDF origin is bottom-left with Y up; keep same orientation
    const tx = (x: number, _y: number) => x * PT_TO_MM
    const ty = (_x: number, y: number) => (pageHeight - y) * PT_TO_MM

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i]
      const args = argsArray[i] as number[]

      switch (fn) {
        case OPS.moveTo: {
          flush()
          curX = args[0]
          curY = args[1]
          current = [{ x: tx(curX, curY), y: ty(curX, curY) }]
          break
        }
        case OPS.lineTo: {
          curX = args[0]
          curY = args[1]
          current.push({ x: tx(curX, curY), y: ty(curX, curY) })
          break
        }
        case OPS.curveTo: {
          // Cubic bezier: P0=current, P1=(x1,y1), P2=(x2,y2), P3=(x3,y3)
          const [x1, y1, x2, y2, x3, y3] = args
          const pts = cubicBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x: x3, y: y3 },
            BEZIER_STEPS
          )
          for (const p of pts) {
            current.push({ x: tx(p.x, p.y), y: ty(p.x, p.y) })
          }
          curX = x3
          curY = y3
          break
        }
        case OPS.curveTo2: {
          // Cubic bezier where P1 = P0: (x2,y2,x3,y3)
          const [x2, y2, x3, y3] = args
          const pts = cubicBezier(
            { x: curX, y: curY },
            { x: curX, y: curY },
            { x: x2, y: y2 },
            { x: x3, y: y3 },
            BEZIER_STEPS
          )
          for (const p of pts) {
            current.push({ x: tx(p.x, p.y), y: ty(p.x, p.y) })
          }
          curX = x3
          curY = y3
          break
        }
        case OPS.curveTo3: {
          // Cubic bezier where P2 = P3: (x1,y1,x3,y3)
          const [x1, y1, x3, y3] = args
          const pts = cubicBezier(
            { x: curX, y: curY },
            { x: x1, y: y1 },
            { x: x3, y: y3 },
            { x: x3, y: y3 },
            BEZIER_STEPS
          )
          for (const p of pts) {
            current.push({ x: tx(p.x, p.y), y: ty(p.x, p.y) })
          }
          curX = x3
          curY = y3
          break
        }
        case OPS.closePath: {
          if (current.length > 0 && subpaths.length === 0) {
            // Close back to start of this subpath
            current.push({ ...current[0] })
          }
          flush()
          break
        }
        case OPS.stroke:
        case OPS.fill:
        case OPS.eoFill:
        case OPS.fillStroke:
        case OPS.eoFillStroke:
        case OPS.endPath: {
          commit()
          break
        }
      }
    }

    // Flush anything remaining
    commit()
    return result
  }

  private subpathToEntity(pts: Point2[]): AcDbPolyline | AcDbLine | null {
    if (pts.length < 2) return null

    if (pts.length === 2) {
      return new AcDbLine(
        new AcGePoint3d(pts[0].x, pts[0].y, 0),
        new AcGePoint3d(pts[1].x, pts[1].y, 0)
      )
    }

    const poly = new AcDbPolyline()
    for (let i = 0; i < pts.length; i++) {
      poly.addVertexAt(i, new AcGePoint2d(pts[i].x, pts[i].y))
    }

    // Check if closed (first ≈ last)
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

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

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
