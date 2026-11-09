import {
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline,
  AcDbText
} from '@mlightcad/data-model'

import type { PdfRecPoint } from './recognition/pdfRecGeometry'
import type { PdfMatchFeature } from './recognition/pdfShapeMatching'

/**
 * Describes an entity for block-instance matching.
 *
 * @returns The feature, or `undefined` for entity types matching does not
 * support (hatches, block references, images, ...).
 */
export function pdfEntityToFeature<Id>(
  entity: AcDbEntity,
  id: Id
): PdfMatchFeature<Id> | undefined {
  if (entity instanceof AcDbLine) {
    const a = { x: entity.startPoint.x, y: entity.startPoint.y }
    const b = { x: entity.endPoint.x, y: entity.endPoint.y }
    return {
      id,
      kind: 'line',
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      size: Math.hypot(b.x - a.x, b.y - a.y),
      points: [a, b]
    }
  }
  if (entity instanceof AcDbArc) {
    const c = entity.center
    let sweep = entity.endAngle - entity.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    const at = (angle: number) => ({
      x: c.x + entity.radius * Math.cos(angle),
      y: c.y + entity.radius * Math.sin(angle)
    })
    return {
      id,
      kind: 'arc',
      center: { x: c.x, y: c.y },
      size: entity.radius,
      points: [
        at(entity.startAngle),
        at(entity.startAngle + sweep / 2),
        at(entity.startAngle + sweep)
      ]
    }
  }
  if (entity instanceof AcDbCircle) {
    return {
      id,
      kind: 'circle',
      center: { x: entity.center.x, y: entity.center.y },
      size: entity.radius,
      points: []
    }
  }
  if (entity instanceof AcDbPolyline) {
    const points: PdfRecPoint[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      const p = entity.getPoint2dAt(i)
      points.push({ x: p.x, y: p.y })
    }
    if (points.length === 0) return undefined
    return {
      id,
      kind: `polyline:${entity.closed ? 'closed' : 'open'}:${points.length}`,
      center: centroid(points),
      size: pathLength(points, entity.closed),
      points
    }
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    const axis = entity.majorAxis
    const len = Math.hypot(axis.x, axis.y) || 1
    const ux = axis.x / len
    const uy = axis.y / len
    let sweep = entity.endAngle - entity.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    const points: PdfRecPoint[] = []
    // Fixed parameter samples move with the ellipse under any similarity.
    for (let i = 0; i <= 8; i++) {
      const t = entity.startAngle + (sweep * i) / 8
      const u = entity.majorAxisRadius * Math.cos(t)
      const v = entity.minorAxisRadius * Math.sin(t)
      points.push({ x: c.x + u * ux - v * uy, y: c.y + u * uy + v * ux })
    }
    // A full ellipse closes on itself; drop the duplicate end sample.
    if (Math.abs(sweep - Math.PI * 2) < 1e-9) points.pop()
    return {
      id,
      kind: 'ellipse',
      center: { x: c.x, y: c.y },
      size: entity.majorAxisRadius,
      points
    }
  }
  if (entity instanceof AcDbSpline) {
    const points = entity.subGetGripPoints().map(p => ({ x: p.x, y: p.y }))
    if (points.length === 0) return undefined
    return {
      id,
      kind: `spline:${points.length}`,
      center: centroid(points),
      size: pathLength(points, false),
      points
    }
  }
  if (entity instanceof AcDbText) {
    const p = entity.position
    return {
      id,
      kind: `text:${entity.textString}`,
      center: { x: p.x, y: p.y },
      size: entity.height,
      points: []
    }
  }
  return undefined
}

function centroid(points: PdfRecPoint[]): PdfRecPoint {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

function pathLength(points: PdfRecPoint[], closed: boolean) {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    )
  }
  if (closed && points.length > 1) {
    const a = points[points.length - 1]
    length += Math.hypot(points[0].x - a.x, points[0].y - a.y)
  }
  return length
}
