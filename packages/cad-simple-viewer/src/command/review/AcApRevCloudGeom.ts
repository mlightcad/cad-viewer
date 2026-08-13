import {
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbPolyline,
  AcDbSpline,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeTol
} from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'

/** Classic AutoCAD scallop: 180° arc (`bulge = tan(π/4)`). */
export const REVCLOUD_BULGE = 1

/** Fraction of the current view diagonal used for the first-time arc length. */
const DEFAULT_ARC_LENGTH_VIEW_RATIO = 0.005

/** Calligraphy pen end-width as a fraction of the arc chord length. */
const CALLIGRAPHY_WIDTH_RATIO = 0.1

export type AcApRevCloudStyle = 'normal' | 'calligraphy'

export interface AcApRevCloudBuildOptions {
  /** Approximate chord length of each cloud arc. */
  arcLength: number
  /** When true, arcs bulge inward instead of outward. */
  reverse?: boolean
  /** Normal (constant width) or calligraphy (tapered) style. */
  style?: AcApRevCloudStyle
  /**
   * When true, chord lengths vary for a hand-drawn look
   * (`REVCLOUDARCVARIANCE` On).
   */
  variance?: boolean
}

/**
 * World distance of the current view diagonal.
 */
export function viewDiagonalLength(view: AcEdBaseView): number {
  const width = Math.max(1, view.width)
  const height = Math.max(1, view.height)
  const topLeft = view.screenToWorld({ x: 0, y: 0 })
  const bottomRight = view.screenToWorld({ x: width, y: height })
  return Math.hypot(bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
}

/**
 * AutoCAD-like default arc length: a small percentage of the view diagonal.
 */
export function defaultRevCloudArcLength(view: AcEdBaseView): number {
  const diagonal = viewDiagonalLength(view)
  const length = diagonal * DEFAULT_ARC_LENGTH_VIEW_RATIO
  return Number.isFinite(length) && length > 0 ? length : 1
}

export function distance2d(a: AcGePoint2dLike, b: AcGePoint2dLike): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * Rectangle outline in CCW order from two opposite corners.
 */
export function rectanglePath(
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): AcGePoint2d[] {
  const minX = Math.min(first.x, second.x)
  const maxX = Math.max(first.x, second.x)
  const minY = Math.min(first.y, second.y)
  const maxY = Math.max(first.y, second.y)
  return [
    new AcGePoint2d(minX, minY),
    new AcGePoint2d(maxX, minY),
    new AcGePoint2d(maxX, maxY),
    new AcGePoint2d(minX, maxY)
  ]
}

/**
 * Signed polygon area. Positive means counterclockwise.
 */
export function signedArea(points: AcGePoint2dLike[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

/**
 * Returns a CCW copy of a closed path so positive bulges face outward.
 */
export function ensureCounterClockwise(
  points: AcGePoint2dLike[]
): AcGePoint2d[] {
  const copy = points.map(p => new AcGePoint2d(p.x, p.y))
  if (copy.length >= 3 && signedArea(copy) < 0) {
    copy.reverse()
  }
  return copy
}

function polylineLength(points: AcGePoint2dLike[], closed: boolean): number {
  if (points.length < 2) return 0
  let length = 0
  const last = closed ? points.length : points.length - 1
  for (let i = 0; i < last; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    length += distance2d(a, b)
  }
  return length
}

function pointAtLength(
  points: AcGePoint2dLike[],
  closed: boolean,
  distance: number
): AcGePoint2d {
  const total = polylineLength(points, closed)
  let remaining = total > 0 ? ((distance % total) + total) % total : 0
  const last = closed ? points.length : points.length - 1
  for (let i = 0; i < last; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const seg = distance2d(a, b)
    if (remaining <= seg || i === last - 1) {
      const t = seg > 0 ? remaining / seg : 0
      return new AcGePoint2d(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    }
    remaining -= seg
  }
  const end = points[closed ? 0 : points.length - 1]
  return new AcGePoint2d(end.x, end.y)
}

/**
 * Deterministic 0.75–1.25 factor so preview does not flicker while dragging.
 */
function varianceFactor(index: number, enabled: boolean): number {
  if (!enabled) return 1
  const t = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return 0.75 + (t - Math.floor(t)) * 0.5
}

function chordLengths(
  perimeter: number,
  arcLength: number,
  variance: boolean
): number[] {
  const minChord = Math.max(arcLength * 0.35, perimeter * 1e-4)
  const chords: number[] = []
  let remaining = perimeter
  let index = 0
  while (remaining > minChord * 0.5) {
    let chord = arcLength * varianceFactor(index, variance)
    chord = Math.min(Math.max(chord, minChord), remaining)
    if (remaining - chord < minChord * 0.5) {
      chord = remaining
    }
    chords.push(chord)
    remaining -= chord
    index++
    if (chords.length > 4096) break
  }
  if (chords.length === 0) {
    chords.push(perimeter)
  }
  return chords
}

/**
 * Rebuilds `cloud` as a revision-cloud polyline along `path`.
 *
 * @returns `false` when the path is degenerate and no cloud was built.
 */
export function buildRevCloud(
  cloud: AcDbPolyline,
  path: AcGePoint2dLike[],
  closed: boolean,
  options: AcApRevCloudBuildOptions
): boolean {
  if (path.length < 2) return false

  const oriented = closed ? ensureCounterClockwise(path) : path
  const perimeter = polylineLength(oriented, closed)
  if (!AcGeTol.isPositive(perimeter)) return false

  const arcLength = Math.max(options.arcLength, perimeter * 1e-4)
  const chords = chordLengths(perimeter, arcLength, options.variance !== false)
  if (closed && chords.length < 3) {
    const equal = perimeter / 3
    chords.length = 0
    chords.push(equal, equal, equal)
  }

  const bulge = options.reverse ? -REVCLOUD_BULGE : REVCLOUD_BULGE
  const calligraphy = options.style === 'calligraphy'
  const endWidth = calligraphy ? arcLength * CALLIGRAPHY_WIDTH_RATIO : undefined

  cloud.reset(false)
  let traveled = 0
  chords.forEach((chord, index) => {
    const point = pointAtLength(oriented, closed, traveled)
    if (calligraphy && endWidth != null) {
      cloud.addVertexAt(index, point, bulge, 0, endWidth)
    } else {
      cloud.addVertexAt(index, point, bulge)
    }
    traveled += chord
  })
  cloud.closed = closed
  return cloud.numberOfVertices >= 2
}

function sampleLine(
  start: AcGePoint2dLike,
  end: AcGePoint2dLike,
  spacing: number
): AcGePoint2d[] {
  const len = distance2d(start, end)
  const count = Math.max(1, Math.ceil(len / Math.max(spacing, 1e-8)))
  const points: AcGePoint2d[] = []
  for (let i = 0; i < count; i++) {
    const t = i / count
    points.push(
      new AcGePoint2d(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t
      )
    )
  }
  return points
}

function sampleBulgeArc(
  start: AcGePoint2dLike,
  end: AcGePoint2dLike,
  bulge: number,
  spacing: number
): AcGePoint2d[] {
  if (Math.abs(bulge) < 1e-12) {
    return sampleLine(start, end, spacing)
  }

  const dx = end.x - start.x
  const dy = end.y - start.y
  const chord = Math.hypot(dx, dy)
  if (!AcGeTol.isPositive(chord)) {
    return [new AcGePoint2d(start.x, start.y)]
  }

  const sign = bulge >= 0 ? 1 : -1
  const included = 4 * Math.atan(Math.abs(bulge))
  const radius = chord / (2 * Math.sin(included / 2))
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const leftX = -dy / chord
  const leftY = dx / chord
  const offset = radius * Math.cos(included / 2)
  const cx = mx + leftX * offset * sign
  const cy = my + leftY * offset * sign
  const startAngle = Math.atan2(start.y - cy, start.x - cx)
  const sweep = included * sign
  const arcLen = Math.abs(radius * sweep)
  const count = Math.max(2, Math.ceil(arcLen / Math.max(spacing, 1e-8)))
  const points: AcGePoint2d[] = []
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (sweep * i) / count
    points.push(
      new AcGePoint2d(
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle)
      )
    )
  }
  return points
}

function polylineVertices(entity: AcDbPolyline): Array<{
  x: number
  y: number
  bulge: number
}> {
  const runtimeVertices = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices

  if (runtimeVertices && runtimeVertices.length > 1) {
    return runtimeVertices.map(v => ({
      x: v.x,
      y: v.y,
      bulge: v.bulge ?? 0
    }))
  }

  const count = entity.numberOfVertices
  const getBulgeAt = (
    entity as unknown as { getBulgeAt?: (index: number) => number }
  ).getBulgeAt
  return Array.from({ length: count }, (_, i) => {
    const p = entity.getPoint2dAt(i)
    return {
      x: p.x,
      y: p.y,
      bulge: getBulgeAt?.(i) ?? 0
    }
  })
}

function samplePolyline(entity: AcDbPolyline, spacing: number): AcGePoint2d[] {
  const vertices = polylineVertices(entity)
  if (vertices.length < 2) return []
  const points: AcGePoint2d[] = []
  const last = entity.closed ? vertices.length : vertices.length - 1
  for (let i = 0; i < last; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length]
    points.push(...sampleBulgeArc(start, end, start.bulge, spacing))
  }
  if (!entity.closed) {
    const end = vertices[vertices.length - 1]
    points.push(new AcGePoint2d(end.x, end.y))
  }
  return points
}

function sampleCircle(entity: AcDbCircle, spacing: number): AcGePoint2d[] {
  const radius = entity.radius
  if (!AcGeTol.isPositive(radius)) return []
  const circumference = 2 * Math.PI * radius
  const count = Math.max(8, Math.ceil(circumference / Math.max(spacing, 1e-8)))
  const center = entity.center
  const points: AcGePoint2d[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    points.push(
      new AcGePoint2d(
        center.x + radius * Math.cos(angle),
        center.y + radius * Math.sin(angle)
      )
    )
  }
  return points
}

function sampleEllipse(entity: AcDbEllipse, spacing: number): AcGePoint2d[] {
  const a = entity.majorAxisRadius
  const b = entity.minorAxisRadius
  if (!AcGeTol.isPositive(a) || !AcGeTol.isPositive(b)) return []

  const geo = (entity as unknown as { _geo?: { majorAxis?: AcGePoint2dLike } })
    ._geo
  const major = geo?.majorAxis ?? { x: 1, y: 0 }
  const majorLen = Math.hypot(major.x, major.y) || 1
  const ux = major.x / majorLen
  const uy = major.y / majorLen
  const vx = -uy
  const vy = ux
  const perimeter =
    Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
  const count = Math.max(12, Math.ceil(perimeter / Math.max(spacing, 1e-8)))
  const center = entity.center
  const start = entity.startAngle ?? 0
  const end = entity.endAngle ?? Math.PI * 2
  let sweep = end - start
  if (sweep <= 0) sweep += Math.PI * 2
  const closed = Math.abs(sweep - Math.PI * 2) < 1e-6
  const steps = closed ? count : count + 1
  const points: AcGePoint2d[] = []
  for (let i = 0; i < steps; i++) {
    const t = start + (sweep * i) / count
    const x = a * Math.cos(t)
    const y = b * Math.sin(t)
    points.push(
      new AcGePoint2d(center.x + ux * x + vx * y, center.y + uy * x + vy * y)
    )
  }
  return points
}

function sampleSpline(entity: AcDbSpline, spacing: number): AcGePoint2d[] {
  const geo = (
    entity as unknown as {
      _geo?: {
        fitPoints?: AcGePoint2dLike[]
        controlPoints?: AcGePoint2dLike[]
      }
    }
  )._geo
  const source = geo?.fitPoints?.length ? geo.fitPoints : geo?.controlPoints
  if (!source || source.length < 2) return []

  const points: AcGePoint2d[] = []
  const last = entity.closed ? source.length : source.length - 1
  for (let i = 0; i < last; i++) {
    const start = source[i]
    const end = source[(i + 1) % source.length]
    points.push(...sampleLine(start, end, spacing))
  }
  if (!entity.closed) {
    const end = source[source.length - 1]
    points.push(new AcGePoint2d(end.x, end.y))
  }
  return points
}

/**
 * Samples a supported curve into a path that can be turned into a revision cloud.
 */
export function sampleEntityPath(
  entity: AcDbEntity,
  spacing: number
): { points: AcGePoint2d[]; closed: boolean } | undefined {
  if (entity instanceof AcDbPolyline) {
    const points = samplePolyline(entity, spacing)
    return points.length >= 2 ? { points, closed: entity.closed } : undefined
  }
  if (entity instanceof AcDbCircle) {
    const points = sampleCircle(entity, spacing)
    return points.length >= 2 ? { points, closed: true } : undefined
  }
  if (entity instanceof AcDbEllipse) {
    const points = sampleEllipse(entity, spacing)
    const start = entity.startAngle ?? 0
    const end = entity.endAngle ?? Math.PI * 2
    let sweep = end - start
    while (sweep < 0) sweep += Math.PI * 2
    const closed = sweep < 1e-6 || Math.abs(sweep - Math.PI * 2) < 1e-3
    return points.length >= 2 ? { points, closed } : undefined
  }
  if (entity instanceof AcDbSpline) {
    const points = sampleSpline(entity, spacing)
    return points.length >= 2 ? { points, closed: !!entity.closed } : undefined
  }
  return undefined
}

/**
 * True when the cursor is close enough to the start point to close a freehand cloud.
 */
export function isRevCloudCloseToStart(
  start: AcGePoint2dLike,
  current: AcGePoint2dLike,
  arcLength: number
): boolean {
  return distance2d(start, current) <= Math.max(arcLength * 0.5, 1e-6)
}
