/**
 * Finds repeated copies of a group of shapes ("block instances") under a
 * similarity transform: translation, rotation, optional uniform scale and
 * optional mirroring.
 *
 * Pure geometry: shapes are described by {@link PdfMatchFeature}s so the
 * algorithm is testable without the data model.
 */

import { dist, type PdfRecPoint } from './pdfRecGeometry'

/** One shape to match. */
export interface PdfMatchFeature<Id = unknown> {
  id: Id
  /**
   * Shape class; only equal kinds match. Encode anything that must be
   * identical here (e.g. `text:Ø20`).
   */
  kind: string
  /** Reference point that moves with the shape (midpoint, center, ...). */
  center: PdfRecPoint
  /** Characteristic length (line length, radius, perimeter, text height). */
  size: number
  /**
   * Characteristic points (end points, vertices, samples). Matching compares
   * them as a set, so drawing direction does not matter. Rotation-invariant
   * shapes (circles) may leave this empty.
   */
  points: PdfRecPoint[]
}

/** 2D affine map: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export interface PdfAffine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/** One found copy of the template. */
export interface PdfShapeMatch<Id = unknown> {
  /** Maps template coordinates onto this copy. */
  transform: PdfAffine
  /** Rotation in radians. */
  rotation: number
  /** Uniform scale. */
  scale: number
  /** True when the copy is mirrored. */
  mirrored: boolean
  /** Ids of the matched shapes, in template order. */
  ids: Id[]
}

/** Tuning for {@link findPdfShapeMatches}. */
export interface PdfShapeMatchOptions {
  /** Absolute tolerance. Default: 0.2 % of the template extent. */
  tolerance?: number
  /** Accept rotated copies. Default `true`. */
  allowRotation?: boolean
  /** Accept mirrored copies. Default `true`. */
  allowMirror?: boolean
  /** Accept uniformly scaled copies. Default `false`. */
  allowScale?: boolean
}

/** Applies an affine map to a point. */
export function applyPdfAffine(t: PdfAffine, p: PdfRecPoint): PdfRecPoint {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f }
}

/**
 * Similarity mapping `p0 → q0` and `p1 → q1`. With `mirror`, the template is
 * reflected across its local x axis first (`y → -y`).
 */
function similarityFrom(
  p0: PdfRecPoint,
  p1: PdfRecPoint,
  q0: PdfRecPoint,
  q1: PdfRecPoint,
  mirror: boolean
): { t: PdfAffine; rotation: number; scale: number } | undefined {
  const sign = mirror ? -1 : 1
  const vx = p1.x - p0.x
  const vy = (p1.y - p0.y) * sign
  const wx = q1.x - q0.x
  const wy = q1.y - q0.y
  const len = Math.hypot(vx, vy)
  if (len === 0) return undefined
  const scale = Math.hypot(wx, wy) / len
  const rotation = Math.atan2(wy, wx) - Math.atan2(vy, vx)
  const cos = Math.cos(rotation) * scale
  const sin = Math.sin(rotation) * scale
  // M = R(θ)·s·diag(1, sign)
  const a = cos
  const b = sin
  const c = -sin * sign
  const d = cos * sign
  const t: PdfAffine = {
    a,
    b,
    c,
    d,
    e: q0.x - (a * p0.x + c * p0.y),
    f: q0.y - (b * p0.x + d * p0.y)
  }
  return { t, rotation, scale }
}

/** Uniform grid over feature centers. */
class CenterGrid<Id> {
  private readonly cells = new Map<string, PdfMatchFeature<Id>[]>()
  constructor(
    features: PdfMatchFeature<Id>[],
    private readonly cell: number
  ) {
    for (const feature of features) {
      const key = this.key(feature.center.x, feature.center.y)
      const bucket = this.cells.get(key)
      if (bucket) bucket.push(feature)
      else this.cells.set(key, [feature])
    }
  }
  private key(x: number, y: number) {
    return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`
  }
  /** Features whose center is within `radius` of `p`. */
  near(p: PdfRecPoint, radius: number): PdfMatchFeature<Id>[] {
    const out: PdfMatchFeature<Id>[] = []
    const x0 = Math.floor((p.x - radius) / this.cell)
    const x1 = Math.floor((p.x + radius) / this.cell)
    const y0 = Math.floor((p.y - radius) / this.cell)
    const y1 = Math.floor((p.y + radius) / this.cell)
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        for (const f of this.cells.get(`${gx},${gy}`) ?? []) {
          if (dist(f.center, p) <= radius) out.push(f)
        }
      }
    }
    return out
  }
}

function extentOf(features: PdfMatchFeature[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const f of features) {
    for (const p of [f.center, ...f.points]) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    minX = Math.min(minX, f.center.x - f.size)
    maxX = Math.max(maxX, f.center.x + f.size)
  }
  return Math.max(maxX - minX, maxY - minY, 0)
}

/** True when `points` (already transformed) coincide with `target` as sets. */
function pointSetsMatch(
  points: PdfRecPoint[],
  target: PdfRecPoint[],
  tol: number
) {
  if (points.length !== target.length) return false
  const used = new Array<boolean>(target.length).fill(false)
  for (const p of points) {
    let best = -1
    let bestDist = tol
    for (let i = 0; i < target.length; i++) {
      if (used[i]) continue
      const d = dist(p, target[i])
      if (d <= bestDist) {
        bestDist = d
        best = i
      }
    }
    if (best < 0) return false
    used[best] = true
  }
  return true
}

/**
 * Finds copies of `template` among `candidates`.
 *
 * Two anchor shapes (the largest, and the one farthest from it) fix the
 * transform for each candidate pair; every template shape must then land on
 * a free candidate of the same kind, size and point set. Matches never
 * share shapes and never reuse template shapes.
 *
 * @param template - Shapes of one instance (at least one).
 * @param candidates - Shapes to search, typically the rest of the drawing.
 * @param options - Tolerance and allowed transform types.
 */
export function findPdfShapeMatches<Id>(
  template: PdfMatchFeature<Id>[],
  candidates: PdfMatchFeature<Id>[],
  options: PdfShapeMatchOptions = {}
): PdfShapeMatch<Id>[] {
  if (template.length === 0) return []
  const extent = extentOf(template)
  const tol = options.tolerance ?? Math.max(extent * 0.002, 1e-9)
  const allowRotation = options.allowRotation ?? true
  const allowMirror = options.allowMirror ?? true
  const allowScale = options.allowScale ?? false

  const templateIds = new Set(template.map(f => f.id))
  const pool = candidates.filter(f => !templateIds.has(f.id))
  const cell = Math.max(extent, tol * 10, 1e-6)
  const grid = new CenterGrid(pool, cell)
  const claimed = new Set<Id>()

  // Anchor 0: largest shape; anchor 1: the shape whose center is farthest
  // from anchor 0 (fixes rotation and scale).
  const a0 = template.reduce((best, f) => (f.size > best.size ? f : best))
  let a1 = a0
  for (const f of template) {
    if (dist(f.center, a0.center) > dist(a1.center, a0.center)) a1 = f
  }
  const span = dist(a0.center, a1.center)
  const mirrors = allowMirror ? [false, true] : [false]

  const sizeOk = (expected: number, actual: number) =>
    Math.abs(expected - actual) <= tol

  const tryTransform = (t: PdfAffine, scale: number): Id[] | undefined => {
    const ids: Id[] = []
    const taken = new Set<Id>()
    const pointTol = tol * Math.max(1, scale)
    for (const f of template) {
      const c = applyPdfAffine(t, f.center)
      const mapped = f.points.map(p => applyPdfAffine(t, p))
      const hit = grid
        .near(c, pointTol)
        .find(
          g =>
            g.kind === f.kind &&
            !claimed.has(g.id) &&
            !taken.has(g.id) &&
            sizeOk(f.size * scale, g.size) &&
            pointSetsMatch(mapped, g.points, pointTol)
        )
      if (!hit) return undefined
      ids.push(hit.id)
      taken.add(hit.id)
    }
    return ids
  }

  const matches: PdfShapeMatch<Id>[] = []
  const seeds = pool.filter(
    f =>
      f.kind === a0.kind && (allowScale ? f.size > 0 : sizeOk(a0.size, f.size))
  )
  for (const c0 of seeds) {
    if (claimed.has(c0.id)) continue
    const scale0 = a0.size > 0 ? c0.size / a0.size : 1
    if (!allowScale && Math.abs(scale0 - 1) * a0.size > tol) continue

    let found: PdfShapeMatch<Id> | undefined
    if (span <= tol) {
      // All shapes share one center (e.g. concentric circles): translation only.
      const t: PdfAffine = {
        a: scale0,
        b: 0,
        c: 0,
        d: scale0,
        e: c0.center.x - scale0 * a0.center.x,
        f: c0.center.y - scale0 * a0.center.y
      }
      const ids = tryTransform(t, scale0)
      if (ids) {
        found = {
          transform: t,
          rotation: 0,
          scale: scale0,
          mirrored: false,
          ids
        }
      }
    } else {
      const reach = span * scale0
      const partners = grid
        .near(c0.center, reach + tol * 2)
        .filter(
          g =>
            g.kind === a1.kind &&
            g.id !== c0.id &&
            Math.abs(dist(g.center, c0.center) - reach) <= tol * 2
        )
      outer: for (const c1 of partners) {
        for (const mirror of mirrors) {
          const sim = similarityFrom(
            a0.center,
            a1.center,
            c0.center,
            c1.center,
            mirror
          )
          if (!sim) continue
          if (!allowScale && Math.abs(sim.scale - 1) * span > tol * 2) continue
          if (!allowRotation) {
            const r = Math.atan2(Math.sin(sim.rotation), Math.cos(sim.rotation))
            if (Math.abs(r) * span > tol) continue
          }
          const ids = tryTransform(sim.t, sim.scale)
          if (ids) {
            found = {
              transform: sim.t,
              rotation: Math.atan2(
                Math.sin(sim.rotation),
                Math.cos(sim.rotation)
              ),
              scale: sim.scale,
              mirrored: mirror,
              ids
            }
            break outer
          }
        }
      }
    }
    if (found) {
      for (const id of found.ids) claimed.add(id)
      matches.push(found)
    }
  }
  return matches
}
