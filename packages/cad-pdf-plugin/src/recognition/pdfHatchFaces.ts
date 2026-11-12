/**
 * Hatch boundaries from the faces of the surrounding line work.
 *
 * A hatch written to PDF keeps its strokes but loses its boundary object;
 * the boundary usually survives as ordinary lines, arcs and polylines that
 * cross each other, meet in T-junctions and run on past the hatch. This
 * module splits those edges at every intersection (a planar arrangement),
 * walks the faces of the resulting graph and returns the outline of the
 * faces that hold hatch strokes, holes included.
 *
 * Pure data in, pure data out.
 */

import type { PdfRecognizedShape } from './pdfCurveRecognition'
import { cubicAt, type PdfRecPoint } from './pdfRecGeometry'

/** Tuning for {@link acapPdfFaceBoundary}. */
export interface PdfFaceBoundaryOptions {
  /** Snap and intersection tolerance in drawing units. */
  tolerance: number
  /**
   * Share of the hit points the chosen faces must hold, in `[0, 1]`.
   * Default `0.9`.
   */
  minCoverage?: number
  /** Most edge segments considered (larger inputs are refused). */
  maxSegments?: number
}

/**
 * Planar arrangement of some line work: the faces its edges enclose, ready
 * to be matched against several hit sets with
 * {@link acapPdfFaceBoundaryIn}. Opaque to callers.
 */
export interface PdfFaceArrangement {
  /** Brand; the contents are internal. */
  readonly kind: 'pdfFaceArrangement'
}

interface Arrangement extends PdfFaceArrangement {
  graph: Graph
  faces: Face[]
  /** Faces with positive area. */
  bounded: Face[]
  /** Spatial index over {@link bounded}. */
  grid: BoxGrid
  /** Island owners, filled on first use. */
  owner?: Map<Face, Face>
  tolerance: number
}

/**
 * Splits `edges` at every crossing and near touch and walks the faces of
 * the result. Returns `undefined` when they enclose nothing or hold more
 * than `maxSegments` segments.
 *
 * @param edges - Open or closed polylines of the line work.
 */
export function acapPdfFaceArrangement(
  edges: readonly (readonly PdfRecPoint[])[],
  options: Omit<PdfFaceBoundaryOptions, 'minCoverage'>
): PdfFaceArrangement | undefined {
  const tol = options.tolerance
  const maxSegments = options.maxSegments ?? 20000
  const segments = toSegments(edges, tol)
  if (segments.length < 3 || segments.length > maxSegments) return undefined
  const graph = buildGraph(segments, tol)
  pruneDangling(graph)
  if (graph.edges.length < 3) return undefined
  const faces = traceFaces(graph)
  const bounded = faces.filter(face => face.area > 0)
  if (bounded.length === 0) return undefined
  const grid = new BoxGrid(
    bounded.map(face => face.box),
    bounded.length
  )
  const arrangement: Arrangement = {
    kind: 'pdfFaceArrangement',
    graph,
    faces,
    bounded,
    grid,
    tolerance: tol
  }
  return arrangement
}

/**
 * Outline loops (outer and holes, to be filled even-odd) of the faces of
 * `edges` that contain the `hits`, or `undefined` when the edges do not
 * enclose them.
 *
 * @param edges - Open or closed polylines of the line work around the hatch.
 * @param hits - Points known to lie inside the hatch (stroke midpoints).
 */
export function acapPdfFaceBoundary(
  edges: readonly (readonly PdfRecPoint[])[],
  hits: readonly PdfRecPoint[],
  options: PdfFaceBoundaryOptions
): PdfRecPoint[][] | undefined {
  if (hits.length === 0) return undefined
  const arrangement = acapPdfFaceArrangement(edges, options)
  return arrangement
    ? acapPdfFaceBoundaryIn(arrangement, hits, options)
    : undefined
}

/**
 * {@link acapPdfFaceBoundary} on an arrangement built once with
 * {@link acapPdfFaceArrangement}, for callers that try several hit sets
 * against the same line work.
 *
 * @param arrangement - Faces of the line work around the hatch.
 * @param hits - Points known to lie inside the hatch (stroke midpoints).
 */
export function acapPdfFaceBoundaryIn(
  arrangement: PdfFaceArrangement,
  hits: readonly PdfRecPoint[],
  options?: Pick<PdfFaceBoundaryOptions, 'minCoverage'>
): PdfRecPoint[][] | undefined {
  return acapPdfFaceBoundaryParts(arrangement, hits, options)?.[0]
}

/** A hatch stroke, for {@link acapPdfFaceBoundaryParts}. */
export type PdfFaceStroke = readonly [PdfRecPoint, PdfRecPoint]

/**
 * Like {@link acapPdfFaceBoundaryIn}, but split into separate hatches.
 *
 * Without `strokes` every face holding hits joins one outline. With them,
 * two such faces join only when strokes run across the edge between them
 * (a line drawn over one hatch, such as an axis). When strokes stop on the
 * edge from both sides instead, each side was clipped to its own boundary:
 * two hatches of one pattern that touch, kept apart.
 *
 * @param strokes - The hatch strokes the hits came from.
 * @returns Outline loops per hatch, the one with the most hits first.
 */
export function acapPdfFaceBoundaryParts(
  arrangement: PdfFaceArrangement,
  hits: readonly PdfRecPoint[],
  options?: Pick<PdfFaceBoundaryOptions, 'minCoverage'> & {
    strokes?: readonly PdfFaceStroke[]
  }
): PdfRecPoint[][][] | undefined {
  const minCoverage = options?.minCoverage ?? 0.9
  if (hits.length === 0) return undefined
  const state = arrangement as Arrangement
  const { graph, faces, bounded, grid } = state

  // Each hit belongs to the smallest bounded face around it; a face of an
  // island inside a bigger face is smaller, so islands come out right.
  const hitCount = new Map<Face, number>()
  let assigned = 0
  for (const p of hits) {
    let best: Face | undefined
    grid.forEachAt(p, i => {
      const face = bounded[i]
      if (best && face.area >= best.area) return
      if (!inBox(p, face.box) || !pointInPolygon(p, face.points)) return
      best = face
    })
    if (best) {
      hitCount.set(best, (hitCount.get(best) ?? 0) + 1)
      assigned++
    }
  }
  if (assigned < hits.length * minCoverage) return undefined

  // Stray strokes (a dimension tick, a stub of another hatch) must not pull
  // in a large empty face: keep faces whose hit density fits the rest.
  const densities = [...hitCount.entries()]
    .map(([face, count]) => count / face.area)
    .sort((p, q) => p - q)
  const median = densities[Math.floor(densities.length / 2)]
  const selected = new Set<Face>()
  let kept = 0
  for (const [face, count] of hitCount) {
    // A face the hatch covers holds about as many hits as its area says;
    // a big face with a few stray strokes does not. Small faces (expected
    // to hold a handful) are judged leniently.
    const expected = median * face.area
    const sparse =
      expected >= 6 ? count < expected * MIN_DENSITY_SHARE : count < 3
    if (sparse && count / face.area < median * 0.1) continue
    if (sparse && expected >= 6) continue
    selected.add(face)
    kept += count
  }
  if (kept < hits.length * minCoverage) return undefined

  // Outer cycles of islands bound the face around them.
  state.owner ??= resolveHoleOwners(faces, bounded, grid)
  const owner = state.owner
  const resolve = (face: Face) => owner.get(face) ?? face
  const parts = splitFaces(
    graph,
    faces,
    resolve,
    selected,
    options?.strokes,
    state.tolerance
  )
  const out: { loops: PdfRecPoint[][]; hits: number }[] = []
  for (const part of parts) {
    const loops = unionOutline(
      graph,
      faces,
      face => part.has(resolve(face)),
      state.tolerance
    )
    if (!loops) continue
    let count = 0
    for (const face of part) count += hitCount.get(face) ?? 0
    out.push({ loops, hits: count })
  }
  if (out.length === 0) return undefined
  return out.sort((p, q) => q.hits - p.hits).map(part => part.loops)
}

/**
 * Polyline through a recognized shape, with curves sampled so no chord is
 * further than `chordTolerance` from the curve.
 */
export function acapPdfShapePolyline(
  shape: PdfRecognizedShape,
  chordTolerance: number
): PdfRecPoint[] {
  const arcPoints = (
    center: PdfRecPoint,
    radius: number,
    start: number,
    sweep: number
  ) => {
    const steps = arcSteps(radius, Math.abs(sweep), chordTolerance)
    const out: PdfRecPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const a = start + (sweep * i) / steps
      out.push({
        x: center.x + radius * Math.cos(a),
        y: center.y + radius * Math.sin(a)
      })
    }
    return out
  }
  switch (shape.kind) {
    case 'line':
      return [shape.start, shape.end]
    case 'circle':
      return arcPoints(shape.center, shape.radius, 0, Math.PI * 2)
    case 'arc': {
      let sweep = shape.endAngle - shape.startAngle
      if (sweep <= 0) sweep += Math.PI * 2
      return arcPoints(shape.center, shape.radius, shape.startAngle, sweep)
    }
    case 'ellipse': {
      let sweep = shape.endAngle - shape.startAngle
      if (sweep <= 0) sweep += Math.PI * 2
      const major = Math.hypot(shape.majorAxis.x, shape.majorAxis.y)
      const steps = arcSteps(major, sweep, chordTolerance)
      const mx = shape.majorAxis.x
      const my = shape.majorAxis.y
      const out: PdfRecPoint[] = []
      for (let i = 0; i <= steps; i++) {
        const a = shape.startAngle + (sweep * i) / steps
        const cos = Math.cos(a)
        const sin = Math.sin(a) * shape.radiusRatio
        out.push({
          x: shape.center.x + mx * cos - my * sin,
          y: shape.center.y + my * cos + mx * sin
        })
      }
      return out
    }
    case 'polyline': {
      const v = shape.vertices
      const out: PdfRecPoint[] = []
      const count = shape.closed ? v.length : v.length - 1
      for (let i = 0; i < count; i++) {
        const a = v[i]
        const b = v[(i + 1) % v.length]
        if (Math.abs(a.bulge) <= 1e-12) {
          out.push({ x: a.x, y: a.y })
          continue
        }
        const sweep = 4 * Math.atan(a.bulge)
        const chord = Math.hypot(b.x - a.x, b.y - a.y)
        const radius = chord / (2 * Math.sin(Math.abs(sweep) / 2))
        const h = radius * Math.cos(Math.abs(sweep) / 2) * Math.sign(a.bulge)
        const center = {
          x: (a.x + b.x) / 2 - (h * (b.y - a.y)) / chord,
          y: (a.y + b.y) / 2 + (h * (b.x - a.x)) / chord
        }
        const start = Math.atan2(a.y - center.y, a.x - center.x)
        const arc = arcPoints(center, radius, start, sweep)
        out.push(...arc.slice(0, -1))
      }
      const end = shape.closed ? v[0] : v[v.length - 1]
      if (end) out.push({ x: end.x, y: end.y })
      return out
    }
    case 'spline': {
      const c = shape.controlPoints
      if (c.length < 4) return c.map(p => ({ x: p.x, y: p.y }))
      const out: PdfRecPoint[] = [c[0]]
      for (let i = 0; i + 3 < c.length; i += 3) {
        for (let k = 1; k <= 16; k++) {
          out.push(cubicAt(c[i], c[i + 1], c[i + 2], c[i + 3], k / 16))
        }
      }
      return out
    }
  }
}

function arcSteps(radius: number, sweep: number, chordTolerance: number) {
  // Sagitta r(1 - cos(θ/2)) <= tolerance.
  const ratio = Math.min(1, Math.max(0, 1 - chordTolerance / radius))
  const step = ratio > 0 ? 2 * Math.acos(ratio) : Math.PI / 4
  return Math.min(256, Math.max(2, Math.ceil(sweep / Math.max(step, 1e-3))))
}

// ---------------------------------------------------------------------------
// Graph

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type Segment = [PdfRecPoint, PdfRecPoint]

interface Graph {
  points: PdfRecPoint[]
  /** Undirected edges as vertex pairs; removed edges become `undefined`. */
  edges: ([number, number] | undefined)[]
  /** Outgoing half-edges of each vertex (`2e` = u→v, `2e + 1` = v→u). */
  out: number[][]
}

function toSegments(
  edges: readonly (readonly PdfRecPoint[])[],
  tol: number
): Segment[] {
  const out: Segment[] = []
  const min = tol * 0.01
  for (const polyline of edges) {
    for (let i = 0; i + 1 < polyline.length; i++) {
      const a = polyline[i]
      const b = polyline[i + 1]
      if (Math.hypot(b.x - a.x, b.y - a.y) > min) out.push([a, b])
    }
  }
  return out
}

/** Splits segments at every crossing and near touch, snapping vertices. */
function buildGraph(segments: Segment[], tol: number): Graph {
  const params: number[][] = segments.map(() => [0, 1])
  const boxes = segments.map(([a, b]) => ({
    minX: Math.min(a.x, b.x) - tol,
    minY: Math.min(a.y, b.y) - tol,
    maxX: Math.max(a.x, b.x) + tol,
    maxY: Math.max(a.y, b.y) + tol
  }))
  forEachNearPair(boxes, (i, j) => {
    const [a, b] = segments[i]
    const [c, d] = segments[j]
    const cross = crossing(a, b, c, d)
    if (cross) {
      params[i].push(cross[0])
      params[j].push(cross[1])
    }
    // T-junctions and ends that stop just short of (or past) another edge.
    let t = projectWithin(a, c, d, tol)
    if (t !== undefined) params[j].push(t)
    t = projectWithin(b, c, d, tol)
    if (t !== undefined) params[j].push(t)
    t = projectWithin(c, a, b, tol)
    if (t !== undefined) params[i].push(t)
    t = projectWithin(d, a, b, tol)
    if (t !== undefined) params[i].push(t)
  })

  // Snap grid with numeric cell keys (string keys dominate on big inputs).
  let originX = Infinity
  let originY = Infinity
  let maxY = -Infinity
  for (const box of boxes) {
    originX = Math.min(originX, box.minX)
    originY = Math.min(originY, box.minY)
    maxY = Math.max(maxY, box.maxY)
  }
  const cell = tol * 2
  // A spare cell on each side keeps neighbour keys from wrapping.
  originX -= cell
  originY -= cell
  const stride = Math.floor((maxY - originY) / cell) + 3
  const points: PdfRecPoint[] = []
  const grid = new Map<number, number[]>()
  const vertexAt = (x: number, y: number) => {
    const gx = Math.floor((x - originX) / cell)
    const gy = Math.floor((y - originY) / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get((gx + dx) * stride + gy + dy)
        if (!list) continue
        for (const id of list) {
          const q = points[id]
          if (Math.hypot(q.x - x, q.y - y) <= tol) return id
        }
      }
    }
    const id = points.length
    points.push({ x, y })
    const key = gx * stride + gy
    const list = grid.get(key)
    if (list) list.push(id)
    else grid.set(key, [id])
    return id
  }

  let maxPoints = 0
  for (const list of params) maxPoints += list.length
  const seen = new Set<number>()
  const edges: [number, number][] = []
  segments.forEach(([a, b], i) => {
    const ts = params[i].sort((p, q) => p - q)
    let prev = -1
    let last = NaN
    for (const t of ts) {
      if (t === last) continue
      last = t
      const id = vertexAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
      if (prev >= 0 && id !== prev) {
        const key = prev < id ? prev * maxPoints + id : id * maxPoints + prev
        if (!seen.has(key)) {
          seen.add(key)
          edges.push([prev, id])
        }
      }
      prev = id
    }
  })

  const out: number[][] = points.map(() => [])
  edges.forEach(([u, v], e) => {
    out[u].push(2 * e)
    out[v].push(2 * e + 1)
  })
  return { points, edges, out }
}

/** Calls `fn` once for every pair of boxes that overlap. */
function forEachNearPair(boxes: Box[], fn: (i: number, j: number) => void) {
  if (boxes.length < 2) return
  const grid = new BoxGrid(boxes, boxes.length)
  grid.forEachCell((ids, cx, cy) => {
    for (let p = 0; p < ids.length; p++) {
      const a = boxes[ids[p]]
      for (let q = p + 1; q < ids.length; q++) {
        const b = boxes[ids[q]]
        if (
          a.maxX < b.minX ||
          b.maxX < a.minX ||
          a.maxY < b.minY ||
          b.maxY < a.minY
        ) {
          continue
        }
        // Two boxes share several cells; only the one holding the low
        // corner of their overlap reports the pair.
        if (
          grid.cellX(Math.max(a.minX, b.minX)) !== cx ||
          grid.cellY(Math.max(a.minY, b.minY)) !== cy
        ) {
          continue
        }
        const i = ids[p]
        const j = ids[q]
        if (i < j) fn(i, j)
        else fn(j, i)
      }
    }
  })
}

/**
 * Uniform grid over boxes in compressed rows with numeric cells. Cells
 * follow the median box, enlarged so the grid stays near `cellBudget`
 * cells.
 */
class BoxGrid {
  private minX = 0
  private minY = 0
  private size = 1
  private nx = 1
  private ny = 1
  private start = new Int32Array(2)
  private ids = new Int32Array(0)

  constructor(boxes: readonly Box[], cellBudget: number) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const b of boxes) {
      minX = Math.min(minX, b.minX)
      minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX)
      maxY = Math.max(maxY, b.maxY)
    }
    if (!Number.isFinite(minX + minY + maxX + maxY)) return
    const width = maxX - minX
    const height = maxY - minY
    // The median keeps short edges in few cells; the budget keeps a few
    // long edges from multiplying the cell count.
    const sizes = boxes.map(b => Math.max(b.maxX - b.minX, b.maxY - b.minY))
    sizes.sort((p, q) => p - q)
    const typical = sizes[Math.floor(sizes.length / 2)]
    const budget = Math.sqrt((width * height) / Math.max(1, cellBudget))
    this.size = Math.max(typical, budget, width / 2048, height / 2048, 1e-9)
    this.minX = minX
    this.minY = minY
    this.nx = Math.floor(width / this.size) + 1
    this.ny = Math.floor(height / this.size) + 1
    const counts = new Int32Array(this.nx * this.ny + 1)
    for (const b of boxes) {
      const x0 = this.cellX(b.minX)
      const x1 = this.cellX(b.maxX)
      const y0 = this.cellY(b.minY)
      const y1 = this.cellY(b.maxY)
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) counts[x * this.ny + y + 1]++
      }
    }
    for (let c = 1; c < counts.length; c++) counts[c] += counts[c - 1]
    this.start = counts.slice()
    this.ids = new Int32Array(counts[counts.length - 1])
    boxes.forEach((b, i) => {
      const x0 = this.cellX(b.minX)
      const x1 = this.cellX(b.maxX)
      const y0 = this.cellY(b.minY)
      const y1 = this.cellY(b.maxY)
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) this.ids[counts[x * this.ny + y]++] = i
      }
    })
  }

  cellX(x: number): number {
    const c = Math.floor((x - this.minX) / this.size)
    return c < 0 ? 0 : c >= this.nx ? this.nx - 1 : c
  }

  cellY(y: number): number {
    const c = Math.floor((y - this.minY) / this.size)
    return c < 0 ? 0 : c >= this.ny ? this.ny - 1 : c
  }

  /** Calls `fn` with every box id registered in the cell of `p`. */
  forEachAt(p: PdfRecPoint, fn: (id: number) => void) {
    const c = this.cellX(p.x) * this.ny + this.cellY(p.y)
    for (let k = this.start[c]; k < this.start[c + 1]; k++) fn(this.ids[k])
  }

  /** Calls `fn` with the box ids of every cell that holds two or more. */
  forEachCell(fn: (ids: Int32Array, cx: number, cy: number) => void) {
    for (let x = 0; x < this.nx; x++) {
      for (let y = 0; y < this.ny; y++) {
        const c = x * this.ny + y
        const from = this.start[c]
        const to = this.start[c + 1]
        if (to - from >= 2) fn(this.ids.subarray(from, to), x, y)
      }
    }
  }
}

/** Parameters where segments ab and cd cross, if they do. */
function crossing(
  a: PdfRecPoint,
  b: PdfRecPoint,
  c: PdfRecPoint,
  d: PdfRecPoint
): [number, number] | undefined {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = d.x - c.x
  const sy = d.y - c.y
  const den = rx * sy - ry * sx
  if (Math.abs(den) <= 1e-12 * Math.hypot(rx, ry) * Math.hypot(sx, sy)) {
    return undefined
  }
  const qx = c.x - a.x
  const qy = c.y - a.y
  const t = (qx * sy - qy * sx) / den
  const u = (qx * ry - qy * rx) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return undefined
  return [t, u]
}

/** Parameter of `p` projected on segment ab when it lies within `tol`. */
function projectWithin(
  p: PdfRecPoint,
  a: PdfRecPoint,
  b: PdfRecPoint,
  tol: number
): number | undefined {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (!(len2 > 0)) return undefined
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  if (t < 0 || t > 1) return undefined
  const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
  return d <= tol ? t : undefined
}

/** Removes edges that end in a vertex of degree one, repeatedly. */
function pruneDangling(graph: Graph) {
  const degree = graph.out.map(list => list.length)
  const stack: number[] = []
  degree.forEach((d, v) => {
    if (d === 1) stack.push(v)
  })
  while (stack.length > 0) {
    const v = stack.pop()!
    if (degree[v] !== 1) continue
    for (const h of graph.out[v]) {
      const e = h >> 1
      const edge = graph.edges[e]
      if (!edge) continue
      graph.edges[e] = undefined
      const other = edge[0] === v ? edge[1] : edge[0]
      degree[v]--
      degree[other]--
      if (degree[other] === 1) stack.push(other)
      break
    }
  }
  graph.edges = graph.edges.filter(edge => edge)
  rebuildIds(graph)
}

function rebuildIds(graph: Graph) {
  const edges = graph.edges as [number, number][]
  const out: number[][] = graph.points.map(() => [])
  edges.forEach(([u, v], e) => {
    out[u].push(2 * e)
    out[v].push(2 * e + 1)
  })
  const angle = (h: number) => {
    const [from, to] = halfEdge(graph, h)
    const p = graph.points[from]
    const q = graph.points[to]
    return Math.atan2(q.y - p.y, q.x - p.x)
  }
  for (const list of out) list.sort((p, q) => angle(p) - angle(q))
  graph.out = out
}

function halfEdge(graph: Graph, h: number): [number, number] {
  const edge = graph.edges[h >> 1]!
  return h & 1 ? [edge[1], edge[0]] : [edge[0], edge[1]]
}

// ---------------------------------------------------------------------------
// Faces

interface Face {
  halfEdges: number[]
  points: PdfRecPoint[]
  /** Signed area: positive for bounded faces (counterclockwise). */
  area: number
  box: Box
  component: number
}

/** Next half-edge around the face on the left of `h`. */
function nextHalfEdge(graph: Graph, h: number): number {
  const [, to] = halfEdge(graph, h)
  const list = graph.out[to]
  const twin = h ^ 1
  const at = list.indexOf(twin)
  // The neighbour clockwise from the twin keeps the face on the left.
  return list[(at - 1 + list.length) % list.length]
}

function traceFaces(graph: Graph): Face[] {
  const component = components(graph)
  const faceOf = new Int32Array(graph.edges.length * 2).fill(-1)
  const faces: Face[] = []
  for (let start = 0; start < graph.edges.length * 2; start++) {
    if (faceOf[start] >= 0) continue
    const halfEdges: number[] = []
    let h = start
    while (faceOf[h] < 0 && halfEdges.length <= graph.edges.length * 2) {
      faceOf[h] = faces.length
      halfEdges.push(h)
      h = nextHalfEdge(graph, h)
    }
    const points = halfEdges.map(e => graph.points[halfEdge(graph, e)[0]])
    faces.push({
      halfEdges,
      points,
      area: signedArea(points),
      box: boxOf(points),
      component: component[halfEdge(graph, start)[0]]
    })
  }
  return faces
}

function components(graph: Graph): number[] {
  const id = new Array<number>(graph.points.length).fill(-1)
  let next = 0
  for (let v = 0; v < graph.points.length; v++) {
    if (id[v] >= 0 || graph.out[v].length === 0) continue
    const stack = [v]
    id[v] = next
    while (stack.length > 0) {
      const u = stack.pop()!
      for (const h of graph.out[u]) {
        const [, w] = halfEdge(graph, h)
        if (id[w] < 0) {
          id[w] = next
          stack.push(w)
        }
      }
    }
    next++
  }
  return id
}

/**
 * The bounded face of another component that encloses each outer cycle
 * (negative area) of a component: an island's outer cycle is a hole of
 * that face.
 */
function resolveHoleOwners(
  faces: Face[],
  bounded: Face[],
  grid: BoxGrid
): Map<Face, Face> {
  const owner = new Map<Face, Face>()
  for (const face of faces) {
    if (face.area > 0) continue
    const p = face.points[0]
    let best: Face | undefined
    grid.forEachAt(p, i => {
      const candidate = bounded[i]
      if (candidate.component === face.component) return
      if (candidate.area <= -face.area) return
      if (best && candidate.area >= best.area) return
      if (!inBox(p, candidate.box) || !pointInPolygon(p, candidate.points)) {
        return
      }
      best = candidate
    })
    if (best) owner.set(face, best)
  }
  return owner
}

/** Share of the median hit density a big face needs to be hatched. */
const MIN_DENSITY_SHARE = 0.25

/** Strokes ending on an edge that mark it as two hatches' shared edge. */
const MIN_CLIPPED_ENDS = 3
/** Most edge-stroke pairs tested before splitting is skipped. */
const MAX_SPLIT_TESTS = 4_000_000

/**
 * Groups the selected faces into hatches: neighbours join unless the
 * strokes stop on the edge between them without crossing it.
 */
function splitFaces(
  graph: Graph,
  faces: Face[],
  resolve: (face: Face) => Face,
  selected: Set<Face>,
  strokes: readonly PdfFaceStroke[] | undefined,
  tol: number
): Set<Face>[] {
  const list = [...selected]
  if (!strokes || strokes.length === 0 || list.length < 2) return [selected]
  const index = new Map(list.map((face, i) => [face, i]))
  const faceOf = new Int32Array(graph.edges.length * 2)
  faces.forEach((face, i) => {
    for (const h of face.halfEdges) faceOf[h] = i
  })
  const internal: { e: number; a: number; b: number }[] = []
  for (let e = 0; e < graph.edges.length; e++) {
    const a = index.get(resolve(faces[faceOf[2 * e]]))
    const b = index.get(resolve(faces[faceOf[2 * e + 1]]))
    if (a === undefined || b === undefined || a === b) continue
    internal.push({ e, a, b })
  }
  if (internal.length * strokes.length > MAX_SPLIT_TESTS) return [selected]

  const parent = list.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  // Judge each pair of neighbouring faces on all the edges they share: a
  // short piece of a shared outline may hold too few stroke ends alone.
  const shared = new Map<string, { a: number; b: number; edges: number[] }>()
  for (const { e, a, b } of internal) {
    const key = a < b ? `${a},${b}` : `${b},${a}`
    const entry = shared.get(key)
    if (entry) entry.edges.push(e)
    else shared.set(key, { a, b, edges: [e] })
  }
  const cuts: { e: number; a: number; b: number }[] = []
  for (const { a, b, edges } of shared.values()) {
    const segments = edges.map(e => {
      const [u, v] = graph.edges[e]!
      return [graph.points[u], graph.points[v]] as const
    })
    if (separates(segments, strokes, tol)) {
      for (const e of edges) cuts.push({ e, a, b })
    } else {
      parent[find(a)] = find(b)
    }
  }
  // Loops of one hatch picked on both sides of an axis are clipped there
  // too, but they meet along that one straight line. Two hatches that
  // touch share a bent piece of outline instead.
  // Repeat with the merged parts: four loops around a cross of axes join
  // in pairs first, then the pairs along the other axis.
  for (let merged = true; merged; ) {
    merged = false
    const byPair = new Map<string, number[]>()
    for (const { e, a, b } of cuts) {
      const ra = find(a)
      const rb = find(b)
      if (ra === rb) continue
      const key = ra < rb ? `${ra},${rb}` : `${rb},${ra}`
      const pair = byPair.get(key)
      if (pair) pair.push(e)
      else byPair.set(key, [e])
    }
    for (const [key, edges] of byPair) {
      const [ra, rb] = key.split(',').map(Number)
      if (isStraightCut(graph, edges, tol)) {
        parent[ra] = rb
        merged = true
        break
      }
    }
  }
  const groups = new Map<number, Set<Face>>()
  list.forEach((face, i) => {
    const root = find(i)
    let group = groups.get(root)
    if (!group) groups.set(root, (group = new Set()))
    group.add(face)
  })
  return [...groups.values()]
}

/**
 * True when `edges` lie on one straight line: an axis or grid line drawn
 * across the loops of one hatch. Two hatches that touch share a bent piece
 * of outline (a notch, a recess) instead.
 */
function isStraightCut(graph: Graph, edges: number[], tol: number): boolean {
  let p: PdfRecPoint | undefined
  let q: PdfRecPoint | undefined
  let best = 0
  // The longest edge fixes the direction most reliably.
  for (const e of edges) {
    const [u, v] = graph.edges[e]!
    const a = graph.points[u]
    const b = graph.points[v]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len > best) {
      best = len
      p = a
      q = b
    }
  }
  if (!p || !q || !(best > 0)) return false
  const ux = (q.x - p.x) / best
  const uy = (q.y - p.y) / best
  for (const e of edges) {
    for (const v of graph.edges[e]!) {
      const r = graph.points[v]
      if (Math.abs(-uy * (r.x - p.x) + ux * (r.y - p.y)) > tol) return false
    }
  }
  return true
}

/**
 * True when strokes end on the shared edges from their sides and none
 * crosses them: the edges are where two hatches were each clipped.
 */
function separates(
  edges: readonly (readonly [PdfRecPoint, PdfRecPoint])[],
  strokes: readonly PdfFaceStroke[],
  tol: number
): boolean {
  let ends = 0
  for (const [p, q] of edges) {
    const minX = Math.min(p.x, q.x) - tol
    const maxX = Math.max(p.x, q.x) + tol
    const minY = Math.min(p.y, q.y) - tol
    const maxY = Math.max(p.y, q.y) + tol
    for (const [a, b] of strokes) {
      if (
        Math.max(a.x, b.x) < minX ||
        Math.min(a.x, b.x) > maxX ||
        Math.max(a.y, b.y) < minY ||
        Math.min(a.y, b.y) > maxY
      ) {
        continue
      }
      const cross = crossing(a, b, p, q)
      if (cross) {
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const margin = len > 0 ? tol / len : 1
        // Crossing away from the stroke's ends: it runs across the edge.
        if (cross[0] > margin && cross[0] < 1 - margin) return false
      }
      if (
        distanceToSegment(a, p, q) <= tol ||
        distanceToSegment(b, p, q) <= tol
      ) {
        ends++
      }
    }
  }
  return ends >= MIN_CLIPPED_ENDS
}

/** Loops along the edges between selected and unselected faces. */
function unionOutline(
  graph: Graph,
  faces: Face[],
  isSelected: (face: Face) => boolean,
  tol: number
): PdfRecPoint[][] | undefined {
  const faceOf = new Int32Array(graph.edges.length * 2)
  faces.forEach((face, i) => {
    for (const h of face.halfEdges) faceOf[h] = i
  })
  const onOutline = (h: number) =>
    isSelected(faces[faceOf[h]]) && !isSelected(faces[faceOf[h ^ 1]])
  const used = new Uint8Array(graph.edges.length * 2)
  const loops: PdfRecPoint[][] = []
  for (let start = 0; start < graph.edges.length * 2; start++) {
    if (used[start] || !onOutline(start)) continue
    const loop: PdfRecPoint[] = []
    let h = start
    let guard = graph.edges.length * 2 + 1
    while (!used[h] && guard-- > 0) {
      used[h] = 1
      loop.push(graph.points[halfEdge(graph, h)[0]])
      // Turn past edges that lie between two selected faces.
      let g = nextHalfEdge(graph, h)
      let spin = graph.edges.length * 2 + 1
      while (!onOutline(g) && spin-- > 0) g = nextHalfEdge(graph, g ^ 1)
      h = g
    }
    const simple = simplify(loop, tol * 0.1)
    if (simple.length >= 3 && Math.abs(signedArea(simple)) > tol * tol) {
      loops.push(simple)
    }
  }
  return loops.length > 0 ? loops : undefined
}

/** Drops vertices on the straight line between their neighbours. */
function simplify(points: PdfRecPoint[], tol: number): PdfRecPoint[] {
  let out = points
  for (let pass = 0; pass < 4; pass++) {
    const next = out.filter((p, i) => {
      const a = out[(i - 1 + out.length) % out.length]
      const b = out[(i + 1) % out.length]
      return distanceToSegment(p, a, b) > tol
    })
    if (next.length === out.length || next.length < 3) break
    out = next
  }
  return out
}

function distanceToSegment(
  p: PdfRecPoint,
  a: PdfRecPoint,
  b: PdfRecPoint
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

function signedArea(points: readonly PdfRecPoint[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

function boxOf(points: readonly PdfRecPoint[]): Box {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  }
  for (const p of points) {
    box.minX = Math.min(box.minX, p.x)
    box.minY = Math.min(box.minY, p.y)
    box.maxX = Math.max(box.maxX, p.x)
    box.maxY = Math.max(box.maxY, p.y)
  }
  return box
}

function inBox(p: PdfRecPoint, box: Box): boolean {
  return (
    p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY
  )
}

function pointInPolygon(p: PdfRecPoint, polygon: readonly PdfRecPoint[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}
