/**
 * Turns extracted PDF page content into placed, de-duplicated CAD shape
 * descriptors. Pure data in, pure data out: entity construction happens in
 * `AcApPdfImportConvertor` so this stage stays unit-testable.
 */

import type { AcApResolvedPdfImportOptions } from './AcApPdfImportOptions'
import type {
  PdfImportedSubpath,
  PdfImportPageContent,
  PdfImportPoint,
  PdfImportSegment
} from './pdfVectorImport'
import {
  type PdfRecognizedShape,
  recognizePdfCurves
} from './recognition/pdfCurveRecognition'

/** One shape ready to become a CAD entity. */
export interface PdfImportShapeItem {
  shape: PdfRecognizedShape
  layerName?: string
  color?: string
  /** Stroke width in millimeters (unscaled paper width). */
  lineWidth?: number
}

/** Shape counts, for logging and tests. */
export type PdfImportShapeStats = Record<PdfRecognizedShape['kind'], number> & {
  duplicates: number
}

/** Result of {@link buildPdfImportShapes}. */
export interface PdfImportShapeResult {
  items: PdfImportShapeItem[]
  stats: PdfImportShapeStats
}

/**
 * Recognizes, places and de-duplicates every subpath of a page.
 *
 * @param content - Extracted page content (texts are ignored here).
 * @param options - Resolved import options (placement, recognition, dedup).
 */
export function buildPdfImportShapes(
  content: Pick<PdfImportPageContent, 'subpaths'>,
  options: AcApResolvedPdfImportOptions
): PdfImportShapeResult {
  const stats: PdfImportShapeStats = {
    line: 0,
    circle: 0,
    arc: 0,
    ellipse: 0,
    polyline: 0,
    spline: 0,
    duplicates: 0
  }
  const items: PdfImportShapeItem[] = []
  const seen = new Set<string>()
  const place = createPlacement(options)

  for (const subpath of content.subpaths) {
    for (const shape of subpathShapes(subpath, options)) {
      const placed = place(shape)
      if (options.removeDuplicates) {
        const key = `${subpath.layerName ?? ''}|${subpath.color ?? ''}|${shapeKey(placed)}`
        if (seen.has(key)) {
          stats.duplicates++
          continue
        }
        seen.add(key)
      }
      stats[placed.kind]++
      items.push({
        shape: placed,
        layerName: subpath.layerName,
        color: subpath.color,
        lineWidth: subpath.lineWidth
      })
    }
  }
  return { items, stats }
}

function subpathShapes(
  subpath: PdfImportedSubpath,
  options: AcApResolvedPdfImportOptions
): PdfRecognizedShape[] {
  if (options.recognizeCurves) {
    const segments = subpath.segments ?? segmentsFromPoints(subpath.points)
    return recognizePdfCurves(segments, options.curveRecognition)
  }
  return [flatShape(subpath.points)]
}

/** Earlier-release behaviour: 2 points → line, otherwise a polyline. */
function flatShape(points: PdfImportPoint[]): PdfRecognizedShape {
  if (points.length === 2) {
    return { kind: 'line', start: points[0], end: points[1] }
  }
  const first = points[0]
  const last = points[points.length - 1]
  const closed = Math.hypot(first.x - last.x, first.y - last.y) < 1e-6
  const verts = closed ? points.slice(0, -1) : points
  return {
    kind: 'polyline',
    vertices: verts.map(p => ({ x: p.x, y: p.y, bulge: 0 })),
    closed
  }
}

function segmentsFromPoints(points: PdfImportPoint[]): PdfImportSegment[] {
  const out: PdfImportSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    out.push({ kind: 'line', p0: points[i], p1: points[i + 1] })
  }
  return out
}

function createPlacement(options: AcApResolvedPdfImportOptions) {
  const { scale, insertionPoint } = options
  const identity =
    scale === 1 && insertionPoint.x === 0 && insertionPoint.y === 0
  const pt = (p: PdfImportPoint): PdfImportPoint => ({
    x: insertionPoint.x + p.x * scale,
    y: insertionPoint.y + p.y * scale
  })
  return (shape: PdfRecognizedShape): PdfRecognizedShape => {
    if (identity) return shape
    switch (shape.kind) {
      case 'line':
        return { ...shape, start: pt(shape.start), end: pt(shape.end) }
      case 'circle':
      case 'arc':
        return {
          ...shape,
          center: pt(shape.center),
          radius: shape.radius * scale
        }
      case 'ellipse':
        return {
          ...shape,
          center: pt(shape.center),
          majorAxis: {
            x: shape.majorAxis.x * scale,
            y: shape.majorAxis.y * scale
          }
        }
      case 'polyline':
        return {
          ...shape,
          vertices: shape.vertices.map(v => ({ ...pt(v), bulge: v.bulge }))
        }
      case 'spline':
        return { ...shape, controlPoints: shape.controlPoints.map(pt) }
    }
  }
}

const KEY_PRECISION = 1e4

function k(value: number) {
  return Math.round(value * KEY_PRECISION)
}

function pk(p: PdfImportPoint) {
  return `${k(p.x)},${k(p.y)}`
}

function shapeKey(shape: PdfRecognizedShape): string {
  switch (shape.kind) {
    case 'line': {
      // Direction does not matter for a duplicate line.
      const a = pk(shape.start)
      const b = pk(shape.end)
      return `L${a < b ? `${a};${b}` : `${b};${a}`}`
    }
    case 'circle':
      return `C${pk(shape.center)};${k(shape.radius)}`
    case 'arc':
      return `A${pk(shape.center)};${k(shape.radius)};${k(shape.startAngle)};${k(shape.endAngle)}`
    case 'ellipse':
      return `E${pk(shape.center)};${pk(shape.majorAxis)};${k(shape.radiusRatio)};${k(shape.startAngle)};${k(shape.endAngle)}`
    case 'polyline':
      return `P${shape.closed ? 1 : 0}${shape.vertices
        .map(v => `${pk(v)}/${k(v.bulge)}`)
        .join(';')}`
    case 'spline':
      return `S${shape.controlPoints.map(pk).join(';')}`
  }
}
