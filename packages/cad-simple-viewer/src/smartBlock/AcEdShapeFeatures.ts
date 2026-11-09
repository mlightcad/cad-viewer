import {
  AcDb2dPolyline,
  AcDb3dPolyline,
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEllipse,
  type AcDbEntity,
  AcDbHatch,
  AcDbLine,
  AcDbMText,
  AcDbOsnapMode,
  AcDbPoint,
  AcDbPolyline,
  AcDbSolid,
  AcDbSpline,
  AcDbText,
  AcDbTrace,
  type AcGePoint3dLike
} from '@mlightcad/data-model'

import type { AcEdPoint2d, AcEdShapeFeature } from './AcEdShapeMatcher'

/** Options for {@link acedEntityToShapeFeature}. */
export interface AcEdShapeFeatureOptions {
  /**
   * Shapes on different layers never match. Default `true`, which mirrors
   * AutoCAD's Search and Convert: a copy on another layer is not "the same".
   */
  matchLayer?: boolean
  /** Describe block references too (as `insert:<name>`). Default `true`. */
  includeBlockReferences?: boolean
}

/**
 * Describes an entity for repeated-geometry matching (Smart Blocks search).
 *
 * Single-line text carries its string in {@link AcEdShapeFeature.label} so a
 * search can either require identical text or accept text variations.
 *
 * @param entity - Entity to describe.
 * @param id - Id stored in the feature (usually the entity's object id).
 * @param options - Layer and block-reference handling.
 * Supported: lines, arcs, circles, ellipses, splines, light and heavy 2D
 * polylines (bulges included), 3D polylines, traces and 2D solids, points,
 * hatches, text, mtext and block references. All coordinates are WCS so
 * entities with a flipped extrusion (mirrored arcs) compare correctly.
 *
 * @returns The feature, or `undefined` for entity types matching does not
 * support (images, dimensions, tables, ...).
 */
export function acedEntityToShapeFeature<Id>(
  entity: AcDbEntity,
  id: Id,
  options: AcEdShapeFeatureOptions = {}
): AcEdShapeFeature<Id> | undefined {
  const feature = describe(entity, id, options)
  if (!feature) return undefined
  if (options.matchLayer ?? true) {
    feature.kind = `${entity.layer}|${feature.kind}`
  }
  return feature
}

function describe<Id>(
  entity: AcDbEntity,
  id: Id,
  options: AcEdShapeFeatureOptions
): AcEdShapeFeature<Id> | undefined {
  if (entity instanceof AcDbLine) {
    const a = xy(entity.startPoint)
    const b = xy(entity.endPoint)
    return {
      id,
      kind: 'line',
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      size: Math.hypot(b.x - a.x, b.y - a.y),
      points: [a, b]
    }
  }
  if (entity instanceof AcDbArc) {
    // WCS end and mid points stay correct for arcs with a flipped extrusion
    // (how mirrored arcs are often stored), unlike OCS angles.
    return {
      id,
      kind: 'arc',
      center: xy(entity.center),
      size: entity.radius,
      points: [xy(entity.startPoint), xy(entity.midPoint), xy(entity.endPoint)]
    }
  }
  if (entity instanceof AcDbCircle) {
    return {
      id,
      kind: 'circle',
      center: xy(entity.center),
      size: entity.radius,
      points: []
    }
  }
  if (entity instanceof AcDbPolyline) {
    const vertices: AcEdPoint2d[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      vertices.push(xy(entity.getPoint3dAt(i)))
    }
    if (vertices.length === 0) return undefined
    // Segment midpoints lie on the arc for bulged segments, so they tell a
    // straight edge from an arc edge without reading private bulge data.
    const mids: AcGePoint3dLike[] = []
    entity.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      mids
    )
    return {
      id,
      kind: `polyline:${entity.closed ? 'closed' : 'open'}:${vertices.length}`,
      center: centroid(vertices),
      size: pathLength(vertices, entity.closed),
      points: [...vertices, ...mids.map(xy)]
    }
  }
  if (entity instanceof AcDb2dPolyline) {
    const vertices: AcEdPoint2d[] = []
    const bulges: number[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      vertices.push(xy(entity.getPointAt(i)))
      bulges.push(entity.getBulgeAt(i) ?? 0)
    }
    if (vertices.length === 0) return undefined
    // Same kind and point layout as a light polyline, so both match.
    return {
      id,
      kind: `polyline:${entity.closed ? 'closed' : 'open'}:${vertices.length}`,
      center: centroid(vertices),
      size: pathLength(vertices, entity.closed),
      points: [
        ...vertices,
        ...segmentMidpoints(vertices, bulges, entity.closed)
      ]
    }
  }
  if (entity instanceof AcDb3dPolyline) {
    const vertices: AcEdPoint2d[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      vertices.push(xy(entity.getPointAt(i)))
    }
    if (vertices.length === 0) return undefined
    return {
      id,
      kind: `polyline3d:${entity.closed ? 'closed' : 'open'}:${vertices.length}`,
      center: centroid(vertices),
      size: pathLength(vertices, entity.closed),
      points: vertices
    }
  }
  if (entity instanceof AcDbTrace) {
    // AcDbSolid extends AcDbTrace; corners compare as a set, so the odd
    // 1-2-4-3 corner order of 2D solids does not matter.
    const corners = [0, 1, 2, 3].map(i => xy(entity.getPointAt(i)))
    return {
      id,
      kind: entity instanceof AcDbSolid ? 'solid' : 'trace',
      center: centroid(corners),
      size: pathLength(corners, true),
      points: corners
    }
  }
  if (entity instanceof AcDbPoint) {
    return {
      id,
      kind: 'point',
      center: xy(entity.position),
      size: 0,
      points: []
    }
  }
  if (entity instanceof AcDbHatch) {
    const pattern = `${entity.patternName}:${entity.isSolidFill ? 'solid' : ''}`
    const area = Math.abs(entity.area)
    // Non-associative hatches expose their boundary points as grips.
    // Associative ones do not; their boundary geometry is matched on its own
    // and the hatch by pattern, area and center.
    const boundary = entity.subGetGripPoints().map(xy)
    if (boundary.length > 0) {
      return {
        id,
        kind: `hatch:${pattern}:${boundary.length}`,
        center: centroid(boundary),
        size: Math.sqrt(area),
        points: boundary
      }
    }
    const ext = entity.geometricExtents
    if (ext.isEmpty()) return undefined
    return {
      id,
      kind: `hatch:${pattern}`,
      center: {
        x: (ext.min.x + ext.max.x) / 2,
        y: (ext.min.y + ext.max.y) / 2
      },
      size: Math.sqrt(area),
      points: []
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
    const full = Math.abs(sweep - Math.PI * 2) < 1e-9
    // The minor axis is normal × major: it flips with the extrusion.
    const flip = (entity.normal?.z ?? 1) < 0 ? -1 : 1
    const vx = -uy * flip
    const vy = ux * flip
    // Full ellipses are sampled from parameter 0 so the start parameter
    // stored in the file does not change the sample set.
    const start = full ? 0 : entity.startAngle
    const points: AcEdPoint2d[] = []
    // Fixed parameter samples move with the ellipse under any similarity.
    for (let i = 0; i <= 8; i++) {
      const t = start + (sweep * i) / 8
      const u = entity.majorAxisRadius * Math.cos(t)
      const v = entity.minorAxisRadius * Math.sin(t)
      points.push({ x: c.x + u * ux + v * vx, y: c.y + u * uy + v * vy })
    }
    // A full ellipse closes on itself; drop the duplicate end sample.
    if (full) points.pop()
    return {
      id,
      kind: 'ellipse',
      center: xy(c),
      size: entity.majorAxisRadius,
      points
    }
  }
  if (entity instanceof AcDbSpline) {
    const points = entity.subGetGripPoints().map(xy)
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
    const p = xy(entity.position)
    return textFeature(
      id,
      'text',
      p,
      entity.height,
      entity.rotation,
      entity.textString
    )
  }
  if (entity instanceof AcDbMText) {
    const p = xy(entity.location)
    const dir = entity.direction
    const angle =
      Math.hypot(dir.x, dir.y) > 0
        ? Math.atan2(dir.y, dir.x)
        : (entity.rotation ?? 0)
    // MText cannot become a single-line attribute, so its contents are part
    // of the kind and must always match exactly.
    return textFeature(id, `mtext:${entity.contents}`, p, entity.height, angle)
  }
  if (
    entity instanceof AcDbBlockReference &&
    (options.includeBlockReferences ?? true)
  ) {
    const m = entity.blockTransform
    const e = m.elements
    const origin = { x: e[12], y: e[13] }
    // The images of the block's unit axes pin rotation, scale and mirroring.
    return {
      id,
      kind: `insert:${entity.blockName}`,
      center: origin,
      size: Math.hypot(e[0], e[1]),
      points: [
        { x: origin.x + e[0], y: origin.y + e[1] },
        { x: origin.x + e[4], y: origin.y + e[5] }
      ]
    }
  }
  return undefined
}

/**
 * Text is described by its insertion point plus a point one text height
 * along its baseline, so rotated copies only match with the same rotation
 * relative to the rest of the template.
 */
function textFeature<Id>(
  id: Id,
  kind: string,
  p: AcEdPoint2d,
  height: number,
  angle: number,
  label?: string
): AcEdShapeFeature<Id> {
  const h = height > 0 ? height : 1
  return {
    id,
    kind,
    label,
    center: p,
    size: height,
    points: [p, { x: p.x + h * Math.cos(angle), y: p.y + h * Math.sin(angle) }]
  }
}

function xy(p: { x: number; y: number }): AcEdPoint2d {
  return { x: p.x, y: p.y }
}

/**
 * Midpoint of every polyline segment; on the arc for bulged segments, so it
 * tells straight edges from arcs (same layout as the light polyline's
 * midpoint osnaps).
 */
function segmentMidpoints(
  vertices: AcEdPoint2d[],
  bulges: number[],
  closed: boolean
): AcEdPoint2d[] {
  const mids: AcEdPoint2d[] = []
  const count = closed ? vertices.length : vertices.length - 1
  for (let i = 0; i < count; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const bulge = bulges[i] ?? 0
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (bulge === 0 || len === 0) {
      mids.push({ x: mx, y: my })
      continue
    }
    // Sagitta = bulge · chord / 2, on the right of a→b for a positive
    // (counter-clockwise) bulge.
    const sagitta = (bulge * len) / 2
    mids.push({ x: mx + (dy / len) * sagitta, y: my - (dx / len) * sagitta })
  }
  return mids
}

function centroid(points: AcEdPoint2d[]): AcEdPoint2d {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

function pathLength(points: AcEdPoint2d[], closed: boolean) {
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
