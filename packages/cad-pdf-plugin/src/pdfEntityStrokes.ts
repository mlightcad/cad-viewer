import {
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  type AcDbEntity,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline
} from '@mlightcad/data-model'

import type { PdfTextStroke } from './recognition/pdfGlyphClustering'
import type { PdfRecPoint } from './recognition/pdfRecGeometry'

/** Samples along a full circle; arcs use a proportional share. */
const CIRCLE_SAMPLES = 24

/**
 * Samples a curve entity into a stroke polyline for text recognition.
 *
 * Only the shape matters (bounding boxes and glyph signatures), so arcs and
 * ellipses are sampled coarsely and splines use their control polygon.
 *
 * @returns The stroke, or `undefined` for entities that cannot be glyph
 * strokes (text, hatches, blocks, ...).
 */
export function pdfEntityToStroke<Id>(
  entity: AcDbEntity,
  id: Id
): PdfTextStroke<Id> | undefined {
  const points = sampleEntity(entity)
  if (!points || points.length === 0) return undefined
  return { id, points }
}

function sampleEntity(entity: AcDbEntity): PdfRecPoint[] | undefined {
  if (entity instanceof AcDbLine) {
    const a = entity.startPoint
    const b = entity.endPoint
    return [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y }
    ]
  }
  if (entity instanceof AcDbPolyline) {
    const points: PdfRecPoint[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      const p = entity.getPoint2dAt(i)
      points.push({ x: p.x, y: p.y })
    }
    if (entity.closed && points.length > 1) points.push({ ...points[0] })
    return points
  }
  if (entity instanceof AcDbArc) {
    let sweep = entity.endAngle - entity.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    return sampleCircular(
      entity.center,
      entity.radius,
      entity.radius,
      { x: 1, y: 0 },
      entity.startAngle,
      sweep
    )
  }
  if (entity instanceof AcDbCircle) {
    return sampleCircular(
      entity.center,
      entity.radius,
      entity.radius,
      { x: 1, y: 0 },
      0,
      Math.PI * 2
    )
  }
  if (entity instanceof AcDbEllipse) {
    let sweep = entity.endAngle - entity.startAngle
    if (sweep <= 0) sweep += Math.PI * 2
    return sampleCircular(
      entity.center,
      entity.majorAxisRadius,
      entity.minorAxisRadius,
      entity.majorAxis,
      entity.startAngle,
      sweep
    )
  }
  if (entity instanceof AcDbSpline) {
    return entity.subGetGripPoints().map(p => ({ x: p.x, y: p.y }))
  }
  return undefined
}

function sampleCircular(
  center: PdfRecPoint,
  rx: number,
  ry: number,
  axis: PdfRecPoint,
  start: number,
  sweep: number
): PdfRecPoint[] {
  const len = Math.hypot(axis.x, axis.y) || 1
  const ux = axis.x / len
  const uy = axis.y / len
  const steps = Math.max(2, Math.ceil((CIRCLE_SAMPLES * sweep) / (Math.PI * 2)))
  const points: PdfRecPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps
    const u = rx * Math.cos(t)
    const v = ry * Math.sin(t)
    points.push({
      x: center.x + u * ux - v * uy,
      y: center.y + u * uy + v * ux
    })
  }
  return points
}
