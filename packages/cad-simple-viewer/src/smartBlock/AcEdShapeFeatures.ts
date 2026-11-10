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
 * Open 2D polylines are described by their path, not their vertices, so
 * copies split into different vertices (e.g. after a PDF round trip) match.
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
    return polylinePathFeature(id, vertices, mids.map(xy), entity.closed)
  }
  if (entity instanceof AcDb2dPolyline) {
    const vertices: AcEdPoint2d[] = []
    const bulges: number[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      vertices.push(xy(entity.getPointAt(i)))
      bulges.push(entity.getBulgeAt(i) ?? 0)
    }
    if (vertices.length === 0) return undefined
    // Same description as a light polyline, so both match.
    return polylinePathFeature(
      id,
      vertices,
      segmentMidpoints(vertices, bulges, entity.closed),
      entity.closed
    )
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
 * Samples per polyline path. Enough to tell paths apart; matching compares
 * them pairwise, so cost grows with the square.
 */
const PATH_SAMPLES = 32

/**
 * Describes a light or heavy 2D polyline by its path rather than its
 * vertices.
 *
 * The same path can be stored with different vertices: a curve flattened
 * into many short segments or partly rebuilt as arcs (as a PDF round trip
 * does, differently for each copy), an arc split in two, a straight edge
 * with an extra vertex, or a closed outline starting at another vertex.
 * Points sampled at equal path-length steps do not depend on any of that:
 *
 * - Open paths are sampled from one end to the other, so a reversed path
 *   gives the same set.
 * - Closed paths have no end, so sampling starts at the point farthest from
 *   the path's centroid. Several equally far points only occur on symmetric
 *   outlines, where each start gives the same set; on a closed path the
 *   direction does not matter either.
 *
 * @param vertices - WCS vertices.
 * @param mids - WCS midpoint of each segment (on the arc for bulges).
 * @param closed - Whether the last vertex connects back to the first.
 */
function polylinePathFeature<Id>(
  id: Id,
  vertices: AcEdPoint2d[],
  mids: AcEdPoint2d[],
  closed: boolean
): AcEdShapeFeature<Id> {
  const kind = `polyline:${closed ? 'closed' : 'open'}`
  const segments: PathSegment[] = []
  const count = closed ? vertices.length : vertices.length - 1
  for (let i = 0; i < count; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    const m = mids[i] ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const segment = pathSegment(a, m, b)
    if (segment.length > 0) segments.push(segment)
  }
  const size = segments.reduce((sum, s) => sum + s.length, 0)
  if (size === 0) {
    return { id, kind, center: vertices[0], size: 0, points: [vertices[0]] }
  }
  const center = pathCentroid(segments, size)
  const points: AcEdPoint2d[] = []
  if (closed) {
    const start = farthestPosition(segments, center)
    for (let k = 0; k < PATH_SAMPLES; k++) {
      points.push(pointAt(segments, (start + (size * k) / PATH_SAMPLES) % size))
    }
  } else {
    for (let k = 0; k < PATH_SAMPLES; k++) {
      points.push(pointAt(segments, (size * k) / PATH_SAMPLES))
    }
    points.push(segments[segments.length - 1].b)
  }
  return {
    id,
    kind,
    center,
    size,
    points,
    path: flattenPath(segments, size, closed)
  }
}

/** Straight or circular piece of a polyline path. */
interface PathSegment {
  /** Start point. */
  a: AcEdPoint2d
  /** End point. */
  b: AcEdPoint2d
  length: number
  /** Arc center; `undefined` for straight segments. */
  center?: AcEdPoint2d
  /** Start angle of the arc. */
  angle: number
  /** Signed sweep of the arc, positive counterclockwise. */
  sweep: number
}

/** Segment from `a` to `b` through its midpoint `m`. */
function pathSegment(
  a: AcEdPoint2d,
  m: AcEdPoint2d,
  b: AcEdPoint2d
): PathSegment {
  const chord = Math.hypot(b.x - a.x, b.y - a.y)
  const straight: PathSegment = { a, b, length: chord, angle: 0, sweep: 0 }
  if (chord === 0) return straight
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const sagitta = Math.hypot(m.x - cx, m.y - cy)
  // Below this the arc cannot be told from its chord.
  if (sagitta <= chord * 1e-9) return straight
  // tan(sweep / 4) = 2·sagitta / chord (the bulge).
  const sweepSize = 4 * Math.atan((2 * sagitta) / chord)
  const radius = (chord * chord) / (8 * sagitta) + sagitta / 2
  // The center lies on the chord's bisector, away from the midpoint.
  const k = (sagitta - radius) / sagitta
  const center = { x: cx + (m.x - cx) * k, y: cy + (m.y - cy) * k }
  const turn =
    (a.x - center.x) * (m.y - center.y) - (a.y - center.y) * (m.x - center.x)
  return {
    a,
    b,
    length: radius * sweepSize,
    center,
    angle: Math.atan2(a.y - center.y, a.x - center.x),
    sweep: turn >= 0 ? sweepSize : -sweepSize
  }
}

/**
 * The path as a polyline for outline matching. Arcs are split so that no
 * chord strays more than 1e-4 of the path length from the arc, far below
 * any matching tolerance. A closed path repeats its first point at the end.
 */
function flattenPath(
  segments: PathSegment[],
  length: number,
  closed: boolean
): AcEdPoint2d[] {
  const sagitta = length * 1e-4
  const path: AcEdPoint2d[] = []
  for (const s of segments) {
    path.push(s.a)
    if (!s.center) continue
    const r = s.length / Math.abs(s.sweep)
    const step = sagitta < r ? 2 * Math.acos(1 - sagitta / r) : Math.PI
    const pieces = Math.min(64, Math.ceil(Math.abs(s.sweep) / step))
    for (let i = 1; i < pieces; i++) path.push(segmentPoint(s, i / pieces))
  }
  path.push(closed ? segments[0].a : segments[segments.length - 1].b)
  return path
}

/** Point of a segment at `t` (0 = start, 1 = end). */
function segmentPoint(s: PathSegment, t: number): AcEdPoint2d {
  if (!s.center) {
    return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }
  }
  const r = s.length / Math.abs(s.sweep)
  const angle = s.angle + s.sweep * t
  return {
    x: s.center.x + r * Math.cos(angle),
    y: s.center.y + r * Math.sin(angle)
  }
}

/** Point at path length `at` from the start of the first segment. */
function pointAt(segments: PathSegment[], at: number): AcEdPoint2d {
  let start = 0
  for (const s of segments) {
    if (at <= start + s.length) {
      return segmentPoint(s, Math.max(0, (at - start) / s.length))
    }
    start += s.length
  }
  return segments[segments.length - 1].b
}

/**
 * Centroid of the path as a curve (each piece weighted by its length), so
 * it does not depend on how the path is split into vertices.
 */
function pathCentroid(segments: PathSegment[], length: number): AcEdPoint2d {
  let x = 0
  let y = 0
  for (const s of segments) {
    let c: AcEdPoint2d
    if (s.center) {
      // An arc's centroid lies toward its midpoint, at r·sin(α)/α from the
      // center (α = half the sweep).
      const half = Math.abs(s.sweep) / 2
      const r = s.length / Math.abs(s.sweep)
      const d = (r * Math.sin(half)) / half
      const mid = s.angle + s.sweep / 2
      c = {
        x: s.center.x + d * Math.cos(mid),
        y: s.center.y + d * Math.sin(mid)
      }
    } else {
      c = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 }
    }
    x += c.x * s.length
    y += c.y * s.length
  }
  return { x: x / length, y: y / length }
}

/**
 * Path length at which a closed path is farthest from `p`: a segment start,
 * or the point of an arc that faces away from `p`.
 */
function farthestPosition(segments: PathSegment[], p: AcEdPoint2d): number {
  let best = 0
  let bestDist = -1
  let start = 0
  const consider = (s: PathSegment, t: number) => {
    const q = segmentPoint(s, t)
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    // Ties are left to the first one: equally far points only occur on
    // symmetric outlines, where every start gives the same samples.
    if (d > bestDist * (1 + 1e-9)) {
      bestDist = d
      best = start + t * s.length
    }
  }
  for (const s of segments) {
    consider(s, 0)
    if (s.center) {
      const away = Math.atan2(s.center.y - p.y, s.center.x - p.x)
      let t = (away - s.angle) / s.sweep
      // Bring the angle into the arc's own turn before testing the range.
      const turn = (Math.PI * 2) / Math.abs(s.sweep)
      t -= Math.floor(t / turn) * turn
      if (t > 0 && t < 1) consider(s, t)
    }
    start += s.length
  }
  return best
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
