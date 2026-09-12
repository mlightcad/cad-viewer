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
