import {
  type AcDbDatabase,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbLinetypeTableRecord,
  AcDbTextStyleTableRecord,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint2d,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import type { PdfRecognizedShape } from './recognition/pdfCurveRecognition'
import { cubicAt, type PdfRecPoint } from './recognition/pdfRecGeometry'

/** Name prefix for linetypes created from PDF dash patterns. */
export const PDF_DASH_LINETYPE_PREFIX = 'PDF_DASH_'

/**
 * Returns the linetype for a dash pattern (alternating dash, gap lengths in
 * drawing units), creating it on first use. Equal patterns share one record.
 */
export function acapPdfEnsureDashLinetype(
  db: AcDbDatabase,
  pattern: number[]
): string {
  const key = pattern.map(n => n.toFixed(4)).join('_')
  const name = `${PDF_DASH_LINETYPE_PREFIX}${hashString(key)}`
  const table = db.tables.linetypeTable
  if (table.has(name)) return name
  // CAD linetype: positive = dash (pen down), negative = gap (pen up).
  const elements = pattern.map((length, i) => ({
    elementLength:
      i % 2 === 0 ? Math.max(length, 1e-6) : -Math.max(length, 1e-6),
    elementTypeFlag: 0
  }))
  table.add(
    new AcDbLinetypeTableRecord({
      name,
      description: `PDF dash ${pattern.map(n => n.toFixed(2)).join(',')}`,
      totalPatternLength: elements.reduce(
        (sum, e) => sum + Math.abs(e.elementLength),
        0
      ),
      pattern: elements
    })
  )
  return name
}

function hashString(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

/**
 * Hatch loop for a closed shape, or `undefined` for open ones (lines, arcs,
 * open polylines and splines).
 */
export function acapPdfShapeToLoop(
  shape: PdfRecognizedShape
): AcGeLoop2d | undefined {
  const loop = new AcGeLoop2d()
  switch (shape.kind) {
    case 'circle':
      loop.add(
        new AcGeCircArc2d(
          { x: shape.center.x, y: shape.center.y },
          shape.radius,
          0,
          Math.PI * 2,
          false
        )
      )
      return loop
    case 'ellipse': {
      const full =
        Math.abs(shape.endAngle - shape.startAngle - Math.PI * 2) < 1e-9
      if (!full) return undefined
      const major = Math.hypot(shape.majorAxis.x, shape.majorAxis.y)
      loop.add(
        new AcGeEllipseArc2d(
          { x: shape.center.x, y: shape.center.y, z: 0 },
          major,
          major * shape.radiusRatio,
          0,
          Math.PI * 2,
          false,
          Math.atan2(shape.majorAxis.y, shape.majorAxis.x)
        )
      )
      return loop
    }
    case 'polyline': {
      if (!shape.closed || shape.vertices.length < 3) return undefined
      const v = shape.vertices
      for (let i = 0; i < v.length; i++) {
        const a = v[i]
        const b = v[(i + 1) % v.length]
        if (Math.abs(a.bulge) > 1e-12) {
          loop.add(
            new AcGeCircArc2d({ x: a.x, y: a.y }, { x: b.x, y: b.y }, a.bulge)
          )
        } else {
          loop.add(
            new AcGeLine2d(new AcGePoint2d(a.x, a.y), new AcGePoint2d(b.x, b.y))
          )
        }
      }
      return loop
    }
    case 'spline': {
      // Closed Bezier chain: sample each cubic into the loop.
      const c = shape.controlPoints
      if (c.length < 4) return undefined
      const first = c[0]
      const last = c[c.length - 1]
      if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-6)
        return undefined
      const points: PdfRecPoint[] = [first]
      for (let i = 0; i + 3 < c.length; i += 3) {
        for (let k = 1; k <= 8; k++) {
          points.push(cubicAt(c[i], c[i + 1], c[i + 2], c[i + 3], k / 8))
        }
      }
      for (let i = 0; i < points.length - 1; i++) {
        loop.add(
          new AcGeLine2d(
            new AcGePoint2d(points[i].x, points[i].y),
            new AcGePoint2d(points[i + 1].x, points[i + 1].y)
          )
        )
      }
      return loop
    }
    default:
      return undefined
  }
}

/**
 * Solid hatch over the given loops (even-odd, so inner loops are holes).
 *
 * @returns The hatch, or `undefined` when no loop is closed.
 */
export function acapPdfCreateSolidHatch(
  db: AcDbDatabase,
  loops: AcGeLoop2d[]
): AcDbHatch | undefined {
  if (loops.length === 0) return undefined
  const hatch = new AcDbHatch()
  // patternName needs a database context.
  hatch.database = db
  hatch.patternName = HATCH_PATTERN_SOLID
  hatch.patternType = AcDbHatchPatternType.Predefined
  hatch.isSolidFill = true
  for (const loop of loops) hatch.add(loop)
  return hatch
}

/**
 * Font family from a PDF font name: drops the subset tag (`ABCDEF+`) and
 * weight / style suffixes (`Arial-BoldMT` → `Arial`, `Arial,Bold` → `Arial`).
 */
export function acapPdfFontFamily(name: string): string {
  let family = name.replace(/^[A-Z]{6}\+/, '').split(',')[0]
  family = family.replace(
    /[- ](Bold|Italic|Oblique|BoldItalic|BoldOblique|Regular|Roman|Light|Medium|Semibold|Black|Book)+(MT|PS|PSMT)?$/i,
    ''
  )
  family = family.replace(/(PSMT|MT|PS)$/, '')
  return family.trim() || name
}

/** Prefix of text styles created for PDF fonts. */
export const PDF_TEXT_STYLE_PREFIX = 'PDF_'

/**
 * Returns the `PDF_<family>` text style for a font family, creating it on
 * first use with that family as its (TrueType) font.
 */
export function acapPdfEnsureTextStyle(
  db: AcDbDatabase,
  family: string
): string {
  const name = `${PDF_TEXT_STYLE_PREFIX}${family}`.replace(
    /[;=<>`\\,|*?":/]/g,
    '_'
  )
  const table = db.tables.textStyleTable
  if (table.has(name)) return name
  table.add(
    new AcDbTextStyleTableRecord({
      name,
      standardFlag: 0,
      fixedTextHeight: 0,
      widthFactor: 1,
      obliqueAngle: 0,
      textGenerationFlag: 0,
      lastHeight: 2.5,
      font: family,
      bigFont: '',
      extendedFont: family
    })
  )
  return name
}
