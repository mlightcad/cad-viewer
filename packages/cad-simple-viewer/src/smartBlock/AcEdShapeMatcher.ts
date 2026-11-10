/**
 * Finds repeated copies of a group of shapes ("block instances") under a
 * similarity transform: translation, rotation, optional uniform scale and
 * optional mirroring.
 *
 * Pure geometry: shapes are described by {@link AcEdShapeFeature}s so the
 * algorithm is testable without the data model.
 */

/** Plain 2D point or vector used by shape matching. */
export interface AcEdPoint2d {
  x: number
  y: number
}

// Math.hypot is several times slower than sqrt in V8, and matching calls
// this in its innermost loops.
function dist(a: AcEdPoint2d, b: AcEdPoint2d): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** One shape to match. */
export interface AcEdShapeFeature<Id = unknown> {
  id: Id
  /**
   * Shape class; only equal kinds match. Encode anything that must be
   * identical here (e.g. `line`, `polyline:closed:4`).
   */
  kind: string
  /**
   * Optional content label (the string of a text). Labels must be equal for
   * two shapes to match unless {@link AcEdShapeMatchOptions.ignoreLabels} is
   * set, which lets copies differ in their text (text variations).
   */
  label?: string
  /** Reference point that moves with the shape (midpoint, center, ...). */
  center: AcEdPoint2d
  /** Characteristic length (line length, radius, perimeter, text height). */
  size: number
  /**
   * Characteristic points (end points, vertices, samples). Matching compares
   * them as a set, so drawing direction does not matter. Rotation-invariant
   * shapes (circles) may leave this empty.
   */
  points: AcEdPoint2d[]
}

/** 2D affine map: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export interface AcEdAffine2d {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/** One found copy of the template. */
export interface AcEdShapeMatch<Id = unknown> {
  /** Maps template coordinates onto this copy. */
  transform: AcEdAffine2d
  /** Rotation in radians. */
  rotation: number
  /** Uniform scale. */
  scale: number
  /** True when the copy is mirrored. */
  mirrored: boolean
  /** Ids of the matched shapes, in template order. */
  ids: Id[]
}

/** Tuning for {@link acedFindShapeMatches}. */
export interface AcEdShapeMatchOptions<Id = unknown> {
  /** Absolute tolerance. Default: 0.2 % of the template extent. */
  tolerance?: number
  /** Accept rotated copies. Default `true`. */
  allowRotation?: boolean
  /** Accept mirrored copies. Default `true`. */
  allowMirror?: boolean
  /** Accept uniformly scaled copies. Default `false`. */
  allowScale?: boolean
  /**
   * Ignore {@link AcEdShapeFeature.label} differences so copies whose texts
   * differ still match. Default `false`.
   */
  ignoreLabels?: boolean
  /**
   * Extra check of a found copy, e.g. that it also carries matching texts.
   * Returning `false` makes the search try the copy's other transforms
   * (symmetric shapes have several) before giving up on it. Called at most
   * once per accepted copy with `true`, so it may record state.
   */
  accept?: (match: AcEdShapeMatch<Id>) => boolean
  /**
   * Reuses spatial indexes between searches over the same candidates (the
   * same shapes, template shapes included). Only share a cache while the
   * candidate set does not change.
   */
  gridCache?: AcEdShapeGridCache
}

/**
 * Opaque store of spatial indexes for {@link AcEdShapeMatchOptions.gridCache}.
 * Create one per unchanged candidate set, e.g. per detection run.
 */
export class AcEdShapeGridCache {}

const gridStores = new WeakMap<
  AcEdShapeGridCache,
  Map<string, KindGrid<unknown>>
>()

function gridStoreOf<Id>(cache: AcEdShapeGridCache) {
  let store = gridStores.get(cache)
  if (!store) gridStores.set(cache, (store = new Map()))
  return store as unknown as Map<string, KindGrid<Id>>
}

function groupByKind<Id>(features: AcEdShapeFeature<Id>[]) {
  const map = new Map<string, AcEdShapeFeature<Id>[]>()
  for (const f of features) {
    const list = map.get(f.kind)
    if (list) list.push(f)
    else map.set(f.kind, [f])
  }
  return map
}

/** Applies an affine map to a point. */
export function acedApplyAffine2d(
  t: AcEdAffine2d,
  p: AcEdPoint2d
): AcEdPoint2d {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f }
}

/**
 * Similarity mapping `p0 → q0` and `p1 → q1`. With `mirror`, the template is
 * reflected across its local x axis first (`y → -y`).
 */
function similarityFrom(
  p0: AcEdPoint2d,
  p1: AcEdPoint2d,
  q0: AcEdPoint2d,
  q1: AcEdPoint2d,
  mirror: boolean
): { t: AcEdAffine2d; rotation: number; scale: number } | undefined {
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
  const t: AcEdAffine2d = {
    a,
    b,
    c,
    d,
    e: q0.x - (a * p0.x + c * p0.y),
    f: q0.y - (b * p0.x + d * p0.y)
  }
  return { t, rotation, scale }
}

/**
 * Uniform grid over feature centers, one per shape kind so a lookup only
 * touches shapes that can match. Cells are nested numeric maps: no string
 * keys and no overflow for far-away coordinates.
 */
class KindGrid<Id> {
  private readonly cells = new Map<
    number,
    Map<number, AcEdShapeFeature<Id>[]>
  >()
  readonly size: number
  /** Feature sizes, ascending. */
  private readonly sizes: Float64Array
  constructor(
    features: AcEdShapeFeature<Id>[],
    private readonly cell: number
  ) {
    this.size = features.length
    this.sizes = Float64Array.from(features, f => f.size).sort()
    for (const feature of features) {
      const gx = Math.floor(feature.center.x / cell)
      const gy = Math.floor(feature.center.y / cell)
      let column = this.cells.get(gx)
      if (!column) this.cells.set(gx, (column = new Map()))
      const bucket = column.get(gy)
      if (bucket) bucket.push(feature)
      else column.set(gy, [feature])
    }
  }
  /** Number of features whose size is within `tol` of `size`. */
  countSizes(size: number, tol: number): number {
    return (
      lowerBound(this.sizes, size + tol, true) -
      lowerBound(this.sizes, size - tol, false)
    )
  }
  /** Calls `visit` for features whose center is within `radius` of `p`. */
  forEachNear(
    p: AcEdPoint2d,
    radius: number,
    visit: (f: AcEdShapeFeature<Id>) => boolean | void
  ): boolean {
    const x0 = Math.floor((p.x - radius) / this.cell)
    const x1 = Math.floor((p.x + radius) / this.cell)
    const y0 = Math.floor((p.y - radius) / this.cell)
    const y1 = Math.floor((p.y + radius) / this.cell)
    const r2 = radius * radius
    for (let gx = x0; gx <= x1; gx++) {
      const column = this.cells.get(gx)
      if (!column) continue
      for (let gy = y0; gy <= y1; gy++) {
        const bucket = column.get(gy)
        if (!bucket) continue
        for (const f of bucket) {
          const dx = f.center.x - p.x
          const dy = f.center.y - p.y
          // `visit` returns true to stop the search.
          if (dx * dx + dy * dy <= r2 && visit(f)) return true
        }
      }
    }
    return false
  }
}

/**
 * First index whose value is `>= value` (or `> value` with `after`) in an
 * ascending array.
 */
function lowerBound(values: Float64Array, value: number, after: boolean) {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] < value || (after && values[mid] === value)) lo = mid + 1
    else hi = mid
  }
  return lo
}

function extentOf(features: AcEdShapeFeature[]) {
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
  points: AcEdPoint2d[],
  target: AcEdPoint2d[],
  tol: number
) {
  if (points.length !== target.length) return false
  const used = new Array<boolean>(target.length).fill(false)
  const tol2 = tol * tol
  for (const p of points) {
    let best = -1
    let bestDist = tol2
    for (let i = 0; i < target.length; i++) {
      if (used[i]) continue
      const dx = p.x - target[i].x
      const dy = p.y - target[i].y
      const d = dx * dx + dy * dy
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
 * Each copy is located through an anchor pair that fixes the similarity
 * transform:
 *
 * - Anchor 0 is the template shape whose kind is rarest among the
 *   candidates (fewest seeds to try); among equals, the largest.
 * - Anchor 1 is the shape whose center is farthest from anchor 0. When all
 *   shapes share one center (a single polyline, concentric shapes), the
 *   farthest characteristic point of anchor 0 fixes rotation and mirroring
 *   instead; shapes without any orientation (circles) match by translation
 *   (and scale) only.
 *
 * Every template shape must then land on a free candidate of the same kind,
 * label, size and point set. Shapes are checked rarest kind first, so a
 * wrong transform is rejected early. Matches never share shapes and never
 * reuse template shapes.
 *
 * Cost is roughly `seeds × partners × template size` grid lookups, where
 * seeds are the candidates of the first anchor kind; candidate grids are per
 * kind so dense drawings do not slow down unrelated lookups.
 *
 * @param template - Shapes of one instance (at least one).
 * @param candidates - Shapes to search, typically the rest of the drawing.
 * @param options - Tolerance and allowed transform types.
 */
export function acedFindShapeMatches<Id>(
  template: AcEdShapeFeature<Id>[],
  candidates: AcEdShapeFeature<Id>[],
  options: AcEdShapeMatchOptions<Id> = {}
): AcEdShapeMatch<Id>[] {
  if (template.length === 0) return []
  const extent = extentOf(template)
  const tol = options.tolerance ?? Math.max(extent * 0.002, 1e-9)
  const allowRotation = options.allowRotation ?? true
  const allowMirror = options.allowMirror ?? true
  const allowScale = options.allowScale ?? false
  const ignoreLabels = options.ignoreLabels ?? false
  const labelOk = (a: AcEdShapeFeature<Id>, b: AcEdShapeFeature<Id>) =>
    ignoreLabels || (a.label ?? '') === (b.label ?? '')
  // Absolute tolerance grows with the copy so scaled copies are judged
  // relative to their own size.
  const tolAt = (scale: number) => tol * Math.max(1, scale)
  const sizeOk = (expected: number, actual: number, scale: number) =>
    Math.abs(expected - actual) <= tolAt(scale)

  const templateKinds = new Set(template.map(f => f.kind))
  const templateIds = new Set(template.map(f => f.id))
  const byKind = new Map<string, AcEdShapeFeature<Id>[]>()
  for (const f of candidates) {
    if (templateIds.has(f.id) || !templateKinds.has(f.kind)) continue
    const list = byKind.get(f.kind)
    if (list) list.push(f)
    else byKind.set(f.kind, [f])
  }
  // A kind without candidates cannot be matched at all.
  for (const kind of templateKinds) if (!byKind.has(kind)) return []

  let cell = Math.max(extent, tol * 10, 1e-9)
  const grids = new Map<string, KindGrid<Id>>()
  const store = options.gridCache && gridStoreOf<Id>(options.gridCache)
  if (store) {
    // Power-of-two cells let templates of similar size share grids. Cached
    // grids hold every candidate, template shapes included; lookups skip
    // those.
    cell = 2 ** Math.ceil(Math.log2(cell))
    let all: Map<string, AcEdShapeFeature<Id>[]> | undefined
    for (const kind of byKind.keys()) {
      const key = `${cell}|${kind}`
      let grid = store.get(key)
      if (!grid) {
        all ??= groupByKind(candidates)
        grid = new KindGrid(all.get(kind)!, cell)
        store.set(key, grid)
      }
      grids.set(kind, grid)
    }
  } else {
    for (const [kind, list] of byKind) grids.set(kind, new KindGrid(list, cell))
  }
  // Without scaling only equally sized shapes can match, so rarity is
  // counted by size too: one kind (lines of a layer) can hold thousands of
  // shapes while few have the anchor's length.
  const countOf = (f: AcEdShapeFeature<Id>) => {
    const grid = grids.get(f.kind)!
    return allowScale ? grid.size : grid.countSizes(f.size, tolAt(1))
  }

  // Anchor 0: rarest kind, then largest size (a zero-size anchor cannot
  // give the scale).
  const a0 = template.reduce((best, f) => {
    if (best.size <= 0 && f.size > 0) return f
    if (f.size <= 0 && best.size > 0) return best
    const cf = countOf(f)
    const cb = countOf(best)
    if (cf !== cb) return cf < cb ? f : best
    return f.size > best.size ? f : best
  })
  let a1 = a0
  for (const f of template) {
    if (dist(f.center, a0.center) > dist(a1.center, a0.center)) a1 = f
  }
  const span = dist(a0.center, a1.center)
  // Orientation point of anchor 0 for templates without a second center.
  let orient: AcEdPoint2d | undefined
  let orientRadius = 0
  for (const p of a0.points) {
    const r = dist(p, a0.center)
    if (r > orientRadius) {
      orientRadius = r
      orient = p
    }
  }
  const lever = Math.max(span, orientRadius, 1e-9)
  const mirrors = allowMirror ? [false, true] : [false]

  // Check order: anchors first, then rarest kinds, so wrong transforms fail
  // fast. Results are still reported in template order.
  const rank = (f: AcEdShapeFeature<Id>) =>
    f === a0 ? -2 : f === a1 ? -1 : countOf(f)
  const order = template
    .map((f, index) => ({ f, index }))
    .sort((x, y) => rank(x.f) - rank(y.f))

  const claimed = new Set<Id>()
  const tryTransform = (t: AcEdAffine2d, scale: number): Id[] | undefined => {
    const ids = new Array<Id>(template.length)
    const taken = new Set<Id>()
    const pointTol = tolAt(scale)
    for (const { f, index } of order) {
      const c = acedApplyAffine2d(t, f.center)
      let mapped: AcEdPoint2d[] | undefined
      let hit: AcEdShapeFeature<Id> | undefined
      grids.get(f.kind)!.forEachNear(c, pointTol, g => {
        if (claimed.has(g.id) || taken.has(g.id)) return false
        if (templateIds.has(g.id)) return false
        if (!labelOk(f, g) || !sizeOk(f.size * scale, g.size, scale)) {
          return false
        }
        if (g.points.length !== f.points.length) return false
        mapped ??= f.points.map(p => acedApplyAffine2d(t, p))
        if (!pointSetsMatch(mapped, g.points, pointTol)) return false
        hit = g
        return true
      })
      if (!hit) return undefined
      ids[index] = hit.id
      taken.add(hit.id)
    }
    return ids
  }

  const accept = (
    t: AcEdAffine2d,
    rotation: number,
    scale: number,
    mirrored: boolean
  ): AcEdShapeMatch<Id> | undefined => {
    const r = Math.atan2(Math.sin(rotation), Math.cos(rotation))
    if (!allowScale && Math.abs(scale - 1) * lever > tol * 2) return undefined
    if (!allowRotation && Math.abs(r) * lever > tol) return undefined
    const ids = tryTransform(t, scale)
    if (!ids) return undefined
    const match = { transform: t, rotation: r, scale, mirrored, ids }
    return !options.accept || options.accept(match) ? match : undefined
  }

  const matches: AcEdShapeMatch<Id>[] = []
  const seeds = byKind
    .get(a0.kind)!
    .filter(
      f =>
        labelOk(a0, f) &&
        (allowScale ? f.size > 0 || a0.size <= 0 : sizeOk(a0.size, f.size, 1))
    )
  for (const c0 of seeds) {
    if (claimed.has(c0.id)) continue
    const scale0 = allowScale && a0.size > 0 ? c0.size / a0.size : 1

    let found: AcEdShapeMatch<Id> | undefined
    if (span > tol) {
      // Second anchor: a free shape of the anchor 1 kind at the right
      // distance from the seed.
      const reach = span * scale0
      const ringTol = tolAt(scale0) * 2
      const partners: AcEdShapeFeature<Id>[] = []
      grids.get(a1.kind)!.forEachNear(c0.center, reach + ringTol, g => {
        if (g.id === c0.id || claimed.has(g.id) || !labelOk(a1, g)) return
        if (templateIds.has(g.id)) return
        if (!sizeOk(a1.size * scale0, g.size, scale0)) return
        if (Math.abs(dist(g.center, c0.center) - reach) <= ringTol) {
          partners.push(g)
        }
      })
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
          found = accept(sim.t, sim.rotation, sim.scale, mirror)
          if (found) break outer
        }
      }
    } else if (orient && orientRadius > tol) {
      // One center only: the farthest point of anchor 0 fixes the
      // orientation. Try each seed point at the right radius (symmetric
      // shapes offer several; any that maps the whole template is valid).
      const reach = orientRadius * scale0
      const ringTol = tolAt(scale0) * 2
      outer: for (const q of c0.points) {
        if (Math.abs(dist(q, c0.center) - reach) > ringTol) continue
        for (const mirror of mirrors) {
          const sim = similarityFrom(a0.center, orient, c0.center, q, mirror)
          if (!sim) continue
          found = accept(sim.t, sim.rotation, sim.scale, mirror)
          if (found) break outer
        }
      }
    } else {
      // No orientation at all (circles, points): translation and scale only.
      const t: AcEdAffine2d = {
        a: scale0,
        b: 0,
        c: 0,
        d: scale0,
        e: c0.center.x - scale0 * a0.center.x,
        f: c0.center.y - scale0 * a0.center.y
      }
      found = accept(t, 0, scale0, false)
    }
    if (found) {
      for (const id of found.ids) claimed.add(id)
      matches.push(found)
    }
  }
  return matches
}
