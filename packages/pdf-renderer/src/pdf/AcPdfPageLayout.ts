import { AcGeBox2d } from '@mlightcad/data-model'

import {
  clampPageSize,
  drawingUnitsToPdfPoints,
  mmToPdfPoints,
  PDF_MAX_PAGE_SIZE,
  PDF_POINTS_PER_MM
} from '../AcPdfUnits'

export const A4_WIDTH_PT = 297 * PDF_POINTS_PER_MM
export const A4_HEIGHT_PT = 210 * PDF_POINTS_PER_MM

/** Padding as a fraction of each page edge (applied in PDF space). */
export const PDF_PAGE_PADDING_FRACTION = 0.02

/**
 * Absolute drawing-coordinate magnitude above which page content is rebased.
 *
 * PDF viewers (PDFium, Acrobat) evaluate content-stream numbers and the CTM
 * in float32. At this magnitude the ulp exceeds typical CAD feature sizes, so
 * strokes stair-step. Matches three-renderer's local-origin rebase threshold.
 */
export const PDF_REBASE_THRESHOLD = 1e6

/**
 * On-page error budget when rounding path coordinates, in PDF points.
 *
 * 0.01 pt is 1/7200 inch — below a device pixel at ordinary zoom, and still
 * sub-pixel at several thousand percent. Tighter rounding only adds digits
 * that Flate cannot share across endpoints.
 */
export const PDF_COORD_TOLERANCE_PT = 0.01

/**
 * Decimal places for drawing-space path coordinates at `scale`
 * (drawing units → PDF points).
 *
 * `String(number)` keeps binary float noise, often 10–12 fractional digits.
 * Viewers apply the page CTM in float32, so those tails never reach the
 * screen, and each unique tail defeats Flate. Rounding to the returned
 * number of places stays within {@link PDF_COORD_TOLERANCE_PT}. Zero means
 * round to the nearest drawing unit (the page scale is already ≤ the
 * tolerance). Capped at 8 so a huge upscale cannot reintroduce long tails;
 * the leftover error only shows up for sub-micron geometry stretched to
 * the page cap.
 */
export function pdfCoordinateDecimals(scale: number): number {
  const safe = Math.abs(scale)
  if (!(safe > 0) || !Number.isFinite(safe)) {
    return 4
  }
  const quantum = PDF_COORD_TOLERANCE_PT / safe
  if (quantum >= 1) {
    return 0
  }
  const places = Math.ceil(-Math.log10(quantum) - 1e-12)
  return Math.min(8, Math.max(0, places))
}

/**
 * Minimum stroke width in PDF points after the drawing→page CTM.
 *
 * CAD lineweights are millimetres in drawing space. On kilometre-scale
 * drawings the fitted CTM would otherwise collapse them (and 0-width
 * hairlines) below a device pixel.
 */
export const PDF_MIN_STROKE_PT = 0.35

export interface AcPdfPageLayoutInput {
  insunits: number
  paper?: 'extents' | { widthMm: number; heightMm: number }
  marginMm?: number
}

export interface AcPdfPageLayout {
  pageWidth: number
  pageHeight: number
  /** Drawing units → PDF points. */
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * Framing-box center used as the page-local origin when coordinates are large.
 *
 * Content is written relative to this origin and the same offset is folded
 * into the page CTM, so viewers only see small user-space numbers. Returns
 * `undefined` when the frame is empty or already float32-safe.
 */
export function pdfRebaseOrigin(
  bbox: AcGeBox2d
): { x: number; y: number } | undefined {
  if (bbox.isEmpty()) {
    return undefined
  }
  const maxAbs = Math.max(
    Math.abs(bbox.min.x),
    Math.abs(bbox.max.x),
    Math.abs(bbox.min.y),
    Math.abs(bbox.max.y)
  )
  if (!(maxAbs >= PDF_REBASE_THRESHOLD) || !Number.isFinite(maxAbs)) {
    return undefined
  }
  const x = (bbox.min.x + bbox.max.x) / 2
  const y = (bbox.min.y + bbox.max.y) / 2
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined
  }
  return { x, y }
}

/**
 * Maps a drawing-space point through the page CTM.
 */
export function mapDrawingToPage(
  layout: AcPdfPageLayout,
  x: number,
  y: number
): { x: number; y: number } {
  return {
    x: x * layout.scale + layout.offsetX,
    y: y * layout.scale + layout.offsetY
  }
}

/**
 * Chooses MediaBox and a uniform scale so the drawing extents (plus padding)
 * lie inside the page.
 *
 * FitExtents uses INSUNITS 1:1 mapping until Adobe's 14400-point page cap,
 * then scales down. World-space padding is never multiplied by an unclamped
 * 1:1 scale — that combination pushed kilometre-scale drawings completely
 * off the MediaBox.
 */
export function computePageLayout(
  bbox: AcGeBox2d,
  options: AcPdfPageLayoutInput
): AcPdfPageLayout {
  const naturalScale = drawingUnitsToPdfPoints(options.insunits)
  const marginPt = mmToPdfPoints(options.marginMm ?? 0)

  if (bbox.isEmpty()) {
    return {
      pageWidth: A4_WIDTH_PT,
      pageHeight: A4_HEIGHT_PT,
      scale: naturalScale,
      offsetX: marginPt,
      offsetY: marginPt
    }
  }

  const width = Math.max(bbox.max.x - bbox.min.x, 1e-6)
  const height = Math.max(bbox.max.y - bbox.min.y, 1e-6)

  if (options.paper && options.paper !== 'extents') {
    const pageWidth = clampPageSize(mmToPdfPoints(options.paper.widthMm))
    const pageHeight = clampPageSize(mmToPdfPoints(options.paper.heightMm))
    return fitToPage(
      bbox,
      width,
      height,
      pageWidth,
      pageHeight,
      marginPt,
      naturalScale,
      false
    )
  }

  const innerFrac = 1 - 2 * PDF_PAGE_PADDING_FRACTION
  let pageWidth = (width * naturalScale) / innerFrac + marginPt * 2
  let pageHeight = (height * naturalScale) / innerFrac + marginPt * 2
  const overflow = Math.max(
    pageWidth / PDF_MAX_PAGE_SIZE,
    pageHeight / PDF_MAX_PAGE_SIZE,
    1
  )
  pageWidth = clampPageSize(pageWidth / overflow)
  pageHeight = clampPageSize(pageHeight / overflow)

  return fitToPage(
    bbox,
    width,
    height,
    pageWidth,
    pageHeight,
    marginPt,
    naturalScale,
    true
  )
}

function fitToPage(
  bbox: AcGeBox2d,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
  marginPt: number,
  naturalScale: number,
  allowUpscale: boolean
): AcPdfPageLayout {
  const padX = Math.max(
    marginPt,
    (pageWidth - marginPt * 2) * PDF_PAGE_PADDING_FRACTION
  )
  const padY = Math.max(
    marginPt,
    (pageHeight - marginPt * 2) * PDF_PAGE_PADDING_FRACTION
  )
  const usableW = Math.max(pageWidth - padX * 2, 1e-6)
  const usableH = Math.max(pageHeight - padY * 2, 1e-6)
  let usedScale = Math.min(usableW / width, usableH / height)
  if (!allowUpscale) {
    usedScale = Math.min(usedScale, naturalScale)
  }

  const drawnW = width * usedScale
  const drawnH = height * usedScale
  return {
    pageWidth,
    pageHeight,
    scale: usedScale,
    offsetX: (pageWidth - drawnW) / 2 - bbox.min.x * usedScale,
    offsetY: (pageHeight - drawnH) / 2 - bbox.min.y * usedScale
  }
}
