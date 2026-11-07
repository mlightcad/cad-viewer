import {
  AcCmColor,
  AcDbCircle,
  AcDbEllipse,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d,
  AcGiLineWeight
} from '@mlightcad/data-model'

import type { AcDbSvgModel, AcDbSvgStyle } from './svgTypes'

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
 */
export function acdbSvgModelToEntities(model: AcDbSvgModel): AcDbEntity[] {
  const entities: AcDbEntity[] = []
  for (const prim of model.primitives) {
    switch (prim.kind) {
      case 'line': {
        const line = new AcDbLine(
          new AcGePoint3d(prim.start.x, prim.start.y, 0),
          new AcGePoint3d(prim.end.x, prim.end.y, 0)
        )
        applyStyle(line, prim.style)
        entities.push(line)
        break
      }
      case 'polyline': {
        if (prim.points.length < 2) break
        if (prim.points.length === 2 && !prim.closed) {
          const line = new AcDbLine(
            new AcGePoint3d(prim.points[0].x, prim.points[0].y, 0),
            new AcGePoint3d(prim.points[1].x, prim.points[1].y, 0)
          )
          applyStyle(line, prim.style)
          entities.push(line)
          break
        }
        const poly = new AcDbPolyline()
        for (let i = 0; i < prim.points.length; i++) {
          poly.addVertexAt(
            i,
            new AcGePoint2d(prim.points[i].x, prim.points[i].y)
          )
        }
        poly.closed = prim.closed
        applyStyle(poly, prim.style)
        entities.push(poly)
        break
      }
      case 'circle': {
        if (prim.radius <= 0) break
        const circle = new AcDbCircle(
          new AcGePoint3d(prim.center.x, prim.center.y, 0),
          prim.radius
        )
        applyStyle(circle, prim.style)
        entities.push(circle)
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
        applyStyle(ellipse, prim.style)
        entities.push(ellipse)
        break
      }
      case 'text': {
        if (!prim.text || prim.height <= 0) break
        const text = new AcDbText()
        text.textString = prim.text
        text.position = new AcGePoint3d(prim.position.x, prim.position.y, 0)
        text.height = prim.height
        text.rotation = prim.rotation
        applyStyle(text, prim.style)
        entities.push(text)
        break
      }
    }
  }
  return entities
}

function applyStyle(entity: AcDbEntity, style: AcDbSvgStyle) {
  if (style.stroke) {
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
}
