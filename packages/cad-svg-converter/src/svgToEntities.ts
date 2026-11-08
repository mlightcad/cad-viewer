import {
  AcCmColor,
  AcCmTransparency,
  AcDbCircle,
  type AcDbDatabase,
  AcDbEllipse,
  type AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbLine,
  AcDbLinetypeTableRecord,
  AcDbPolyline,
  AcDbText,
  AcDbTextHorizontalMode,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d,
  AcGiLineWeight,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import type {
  AcDbSvgModel,
  AcDbSvgPoint,
  AcDbSvgPrimitive,
  AcDbSvgStyle
} from './svgTypes'

const LINE_WEIGHTS: AcGiLineWeight[] = [
  AcGiLineWeight.LineWeight000,
  AcGiLineWeight.LineWeight005,
  AcGiLineWeight.LineWeight009,
  AcGiLineWeight.LineWeight013,
  AcGiLineWeight.LineWeight015,
  AcGiLineWeight.LineWeight018,
  AcGiLineWeight.LineWeight020,
  AcGiLineWeight.LineWeight025,
  AcGiLineWeight.LineWeight030,
  AcGiLineWeight.LineWeight035,
  AcGiLineWeight.LineWeight040,
  AcGiLineWeight.LineWeight050,
  AcGiLineWeight.LineWeight053,
  AcGiLineWeight.LineWeight060,
  AcGiLineWeight.LineWeight070,
  AcGiLineWeight.LineWeight080,
  AcGiLineWeight.LineWeight090,
  AcGiLineWeight.LineWeight100,
  AcGiLineWeight.LineWeight106,
  AcGiLineWeight.LineWeight120,
  AcGiLineWeight.LineWeight140,
  AcGiLineWeight.LineWeight158,
  AcGiLineWeight.LineWeight200,
  AcGiLineWeight.LineWeight211
]

/**
 * Converts parsed SVG primitives into AcDb entities.
 *
 * @param model - Intermediate SVG model (Y-up).
 * @param db - Optional database used to register dasharray linetypes.
 */
export function acdbSvgModelToEntities(
  model: AcDbSvgModel,
  db?: AcDbDatabase
): AcDbEntity[] {
  const entities: AcDbEntity[] = []
  for (const prim of model.primitives) {
    switch (prim.kind) {
      case 'line': {
        if (!hasStroke(prim.style)) break
        const line = new AcDbLine(
          new AcGePoint3d(prim.start.x, prim.start.y, 0),
          new AcGePoint3d(prim.end.x, prim.end.y, 0)
        )
        applyStrokeStyle(line, prim.style, db)
        entities.push(line)
        break
      }
      case 'polyline': {
        if (prim.points.length < 2) break
        if (hasFill(prim.style) && prim.closed) {
          const hatch = createPolylineHatch(
            prim.points,
            prim.style,
            db,
            prim.bulges
          )
          if (hatch) entities.push(hatch)
        }
        if (hasStroke(prim.style)) {
          const stroke = createPolylineStroke(prim, db)
          if (stroke) entities.push(stroke)
        }
        break
      }
      case 'circle': {
        if (prim.radius <= 0) break
        if (hasFill(prim.style)) {
          const hatch = createCircleHatch(
            prim.center,
            prim.radius,
            prim.style,
            db
          )
          if (hatch) entities.push(hatch)
        }
        if (hasStroke(prim.style)) {
          const circle = new AcDbCircle(
            new AcGePoint3d(prim.center.x, prim.center.y, 0),
            prim.radius
          )
          applyStrokeStyle(circle, prim.style, db)
          entities.push(circle)
        }
        break
      }
      case 'ellipse': {
        let major = prim.rx
        let minor = prim.ry
        let rotation = prim.rotation
        if (minor > major) {
          const tmp = major
          major = minor
          minor = tmp
          rotation += Math.PI / 2
        }
        if (major <= 0 || minor <= 0) break
        if (hasFill(prim.style)) {
          const hatch = createEllipseHatch(
            prim.center,
            major,
            minor,
            rotation,
            prim.style,
            db
          )
          if (hatch) entities.push(hatch)
        }
        if (hasStroke(prim.style)) {
          const majorAxis = new AcGeVector3d(
            Math.cos(rotation),
            Math.sin(rotation),
            0
          )
          const ellipse = new AcDbEllipse(
            new AcGePoint3d(prim.center.x, prim.center.y, 0),
            AcGeVector3d.Z_AXIS,
            majorAxis,
            major,
            minor,
            0,
            Math.PI * 2
          )
          applyStrokeStyle(ellipse, prim.style, db)
          entities.push(ellipse)
        }
        break
      }
      case 'text': {
        if (!prim.text || prim.height <= 0) break
        // Text is invisible when fill is none and stroke is none.
        if (!hasFill(prim.style) && !hasStroke(prim.style)) break
        const text = new AcDbText()
        text.textString = prim.text
        text.position = new AcGePoint3d(prim.position.x, prim.position.y, 0)
        text.height = prim.height
        text.rotation = prim.rotation
        applyTextAnchor(text, prim.style, prim.position)
        applyTextColor(text, prim.style)
        // Prefer fill opacity; fall back to stroke when fill is none.
        const textChannel = hasFill(prim.style) ? 'fill' : 'stroke'
        applyTransparency(text, channelOpacity(prim.style, textChannel))
        entities.push(text)
        break
      }
    }
  }
  return entities
}

function hasStroke(style: AcDbSvgStyle): boolean {
  return !!style.stroke && style.stroke !== 'none'
}

function hasFill(style: AcDbSvgStyle): boolean {
  return !!style.fill && style.fill !== 'none'
}

function createPolylineStroke(
  prim: Extract<AcDbSvgPrimitive, { kind: 'polyline' }>,
  db?: AcDbDatabase
): AcDbEntity | undefined {
  if (prim.points.length === 2 && !prim.closed && !prim.bulges) {
    const line = new AcDbLine(
      new AcGePoint3d(prim.points[0].x, prim.points[0].y, 0),
      new AcGePoint3d(prim.points[1].x, prim.points[1].y, 0)
    )
    applyStrokeStyle(line, prim.style, db)
    return line
  }
  const poly = new AcDbPolyline()
  for (let i = 0; i < prim.points.length; i++) {
    const bulge = prim.bulges?.[i] ?? 0
    poly.addVertexAt(
      i,
      new AcGePoint2d(prim.points[i].x, prim.points[i].y),
      bulge
    )
  }
  poly.closed = prim.closed
  applyStrokeStyle(poly, prim.style, db)
  return poly
}

function createPolylineHatch(
  points: AcDbSvgPoint[],
  style: AcDbSvgStyle,
  db: AcDbDatabase | undefined,
  bulges?: number[]
): AcDbHatch | undefined {
  if (points.length < 3) return undefined
  const loop = new AcGeLoop2d()
  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    const bulge = bulges?.[i] ?? 0
    if (Math.abs(bulge) > 1e-12) {
      loop.add(
        new AcGeCircArc2d(
          { x: start.x, y: start.y },
          { x: end.x, y: end.y },
          bulge
        )
      )
    } else {
      loop.add(
        new AcGeLine2d(
          new AcGePoint2d(start.x, start.y),
          new AcGePoint2d(end.x, end.y)
        )
      )
    }
  }
  return createSolidHatch(loop, style, db)
}

function createCircleHatch(
  center: AcDbSvgPoint,
  radius: number,
  style: AcDbSvgStyle,
  db: AcDbDatabase | undefined
): AcDbHatch | undefined {
  const loop = new AcGeLoop2d()
  loop.add(
    new AcGeCircArc2d(
      { x: center.x, y: center.y },
      radius,
      0,
      Math.PI * 2,
      false
    )
  )
  return createSolidHatch(loop, style, db)
}

function createEllipseHatch(
  center: AcDbSvgPoint,
  major: number,
  minor: number,
  rotation: number,
  style: AcDbSvgStyle,
  db: AcDbDatabase | undefined
): AcDbHatch | undefined {
  const loop = new AcGeLoop2d()
  loop.add(
    new AcGeEllipseArc2d(
      { x: center.x, y: center.y, z: 0 },
      major,
      minor,
      0,
      Math.PI * 2,
      false,
      rotation
    )
  )
  return createSolidHatch(loop, style, db)
}

function createSolidHatch(
  loop: AcGeLoop2d,
  style: AcDbSvgStyle,
  db: AcDbDatabase | undefined
): AcDbHatch | undefined {
  // AcDbHatch.patternName requires a working/database context.
  if (!db) return undefined
  const hatch = new AcDbHatch()
  hatch.database = db
  hatch.patternName = HATCH_PATTERN_SOLID
  hatch.patternType = AcDbHatchPatternType.Predefined
  hatch.isSolidFill = true
  hatch.add(loop)
  applyFillStyle(hatch, style)
  return hatch
}

function applyFillStyle(entity: AcDbEntity, style: AcDbSvgStyle) {
  if (style.fill && style.fill !== 'none') {
    const color = new AcCmColor()
    color.setRGBFromCss(style.fill)
    entity.color = color
  }
  applyTransparency(entity, channelOpacity(style, 'fill'))
}

function applyStrokeStyle(
  entity: AcDbEntity,
  style: AcDbSvgStyle,
  db?: AcDbDatabase
) {
  if (style.stroke && style.stroke !== 'none') {
    const color = new AcCmColor()
    color.setRGBFromCss(style.stroke)
    entity.color = color
  }
  if (style.strokeWidth != null && style.strokeWidth > 0) {
    // Treat SVG user units as hundredths of a millimeter (best-effort).
    const target = Math.round(style.strokeWidth * 100)
    let best = AcGiLineWeight.LineWeight000
    let bestDist = Infinity
    for (const lw of LINE_WEIGHTS) {
      const d = Math.abs(lw - target)
      if (d < bestDist) {
        bestDist = d
        best = lw
      }
    }
    entity.lineWeight = best
  }
  if (style.strokeDasharray && style.strokeDasharray.length > 0 && db) {
    entity.lineType = ensureDashLinetype(db, style.strokeDasharray)
  }
  applyTransparency(entity, channelOpacity(style, 'stroke'))
}

function applyTextColor(entity: AcDbEntity, style: AcDbSvgStyle) {
  const paint =
    style.fill && style.fill !== 'none'
      ? style.fill
      : style.stroke && style.stroke !== 'none'
        ? style.stroke
        : undefined
  if (!paint) return
  const color = new AcCmColor()
  color.setRGBFromCss(paint)
  entity.color = color
}

function applyTextAnchor(
  text: AcDbText,
  style: AcDbSvgStyle,
  position: AcDbSvgPoint
) {
  const anchor = style.textAnchor ?? 'start'
  if (anchor === 'middle') {
    text.horizontalMode = AcDbTextHorizontalMode.CENTER
    text.alignmentPoint = new AcGePoint3d(position.x, position.y, 0)
  } else if (anchor === 'end') {
    text.horizontalMode = AcDbTextHorizontalMode.RIGHT
    text.alignmentPoint = new AcGePoint3d(position.x, position.y, 0)
  }
}

function channelOpacity(
  style: AcDbSvgStyle,
  channel: 'fill' | 'stroke'
): number {
  const base = style.opacity ?? 1
  const channelOp =
    channel === 'fill' ? (style.fillOpacity ?? 1) : (style.strokeOpacity ?? 1)
  return clamp01(base * channelOp)
}

function applyTransparency(entity: AcDbEntity, opacity: number) {
  if (opacity >= 1 - 1e-9) return
  const t = new AcCmTransparency()
  t.percentage = Math.round((1 - clamp01(opacity)) * 100)
  entity.transparency = t
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function ensureDashLinetype(db: AcDbDatabase, dasharray: number[]): string {
  const key = dasharray.map(n => n.toFixed(4)).join('_')
  const name = `SVG_DASH_${hashString(key)}`
  const table = db.tables.linetypeTable
  if (table.has(name)) return name

  // CAD linetype: positive = dash (pen down), negative = gap (pen up).
  const pattern = dasharray.map((len, i) => ({
    elementLength: i % 2 === 0 ? Math.max(len, 1e-6) : -Math.max(len, 1e-6),
    elementTypeFlag: 0
  }))
  const total = pattern.reduce((s, p) => s + Math.abs(p.elementLength), 0)
  table.add(
    new AcDbLinetypeTableRecord({
      name,
      description: `SVG dash ${dasharray.join(',')}`,
      totalPatternLength: total,
      pattern
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
