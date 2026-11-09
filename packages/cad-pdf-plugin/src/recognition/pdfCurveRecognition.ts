/**
 * Recovers CAD curves (circle, arc, ellipse, bulged polyline, spline) from
 * the exact segments of an imported PDF subpath.
 *
 * PDF has no arc primitive: producers write circles and arcs as cubic Bezier
 * chains (typically one cubic per 90°), and some flatten them into short
 * lines. This module undoes both, conservatively: a shape is only promoted
 * when every sample stays within tolerance of the recovered curve.
 */

import type { PdfImportPoint, PdfImportSegment } from '../pdfVectorImport'
import {
  circleFrom3Points,
  cross,
  cubicAt,
  dist,
  distanceToLine,
  dot,
  ellipseDeviation,
  ellipseParam,
  fitCircleLeastSquares,
  fitEllipse,
  maxCircleDeviation,
  normalizeAngle,
  type PdfRecPoint,
  signedSweep,
  sub,
  TWO_PI
} from './pdfRecGeometry'

/** Tuning for {@link recognizePdfCurves}. */
export interface PdfCurveRecognitionOptions {
  /** Absolute tolerance in millimeters. Default `0.01`. */
  tolerance?: number
  /** Tolerance relative to the radius of a candidate arc. Default `0.002`. */
  relativeTolerance?: number
  /**
   * Rebuild arcs from runs of short line segments (arcs a producer already
   * flattened). Default `true`.
   */
  fitFlattenedArcs?: boolean
  /** Minimum segment count of a flattened arc run. Default `6`. */
  minFlattenedArcSegments?: number
  /**
   * Largest turn angle (radians) between two segments of a flattened arc.
   * Keeps regular polygons such as octagons from becoming circles.
   * Default 15°.
   */
  maxFlattenedArcTurn?: number
  /** Recover ellipses and elliptical arcs. Default `true`. */
  ellipses?: boolean
  /**
   * Emit free-form Bezier chains as splines. When `false`, they become
   * adaptively flattened polylines. Default `true`.
   */
  splines?: boolean
}

/** Polyline vertex with an AutoCAD-style bulge (tan(sweep / 4)). */
export interface PdfRecognizedVertex {
  x: number
  y: number
  bulge: number
}

/**
 * CAD-ready shape recovered from one PDF subpath. Angles are radians,
 * counterclockwise from +X, and arcs always run counterclockwise from
 * `startAngle` to `endAngle` (as `AcDbArc` / `AcDbEllipse` expect).
 */
export type PdfRecognizedShape =
  | { kind: 'line'; start: PdfImportPoint; end: PdfImportPoint }
  | { kind: 'circle'; center: PdfImportPoint; radius: number }
  | {
      kind: 'arc'
      center: PdfImportPoint
      radius: number
      startAngle: number
      endAngle: number
    }
  | {
      kind: 'ellipse'
      center: PdfImportPoint
      /** Major axis vector; its length is the major radius. */
      majorAxis: PdfImportPoint
      /** Minor radius / major radius, in `(0, 1]`. */
      radiusRatio: number
      startAngle: number
      endAngle: number
    }
  | { kind: 'polyline'; vertices: PdfRecognizedVertex[]; closed: boolean }
  | {
      kind: 'spline'
      /** Bezier-chain control points (shared end points included once). */
      controlPoints: PdfImportPoint[]
      /** Clamped knot vector with triple interior knots (exact Beziers). */
      knots: number[]
    }

type Primitive =
  | { kind: 'line'; p0: PdfRecPoint; p1: PdfRecPoint }
  | {
      kind: 'arc'
      p0: PdfRecPoint
      p1: PdfRecPoint
      center: PdfRecPoint
      radius: number
      /** Signed sweep, positive counterclockwise. */
      sweep: number
    }
  | {
      kind: 'curve'
      p0: PdfRecPoint
      c1: PdfRecPoint
      c2: PdfRecPoint
      p1: PdfRecPoint
    }

interface ResolvedOptions {
  tolerance: number
  relativeTolerance: number
  fitFlattenedArcs: boolean
  minFlattenedArcSegments: number
  maxFlattenedArcTurn: number
  ellipses: boolean
  splines: boolean
}

function resolveOptions(
  options: PdfCurveRecognitionOptions | undefined
): ResolvedOptions {
  return {
    tolerance: options?.tolerance ?? 0.01,
    relativeTolerance: options?.relativeTolerance ?? 0.002,
    fitFlattenedArcs: options?.fitFlattenedArcs ?? true,
    minFlattenedArcSegments: Math.max(3, options?.minFlattenedArcSegments ?? 6),
    maxFlattenedArcTurn: options?.maxFlattenedArcTurn ?? (15 * Math.PI) / 180,
    ellipses: options?.ellipses ?? true,
    splines: options?.splines ?? true
  }
}

/**
 * Recognizes the CAD shape of one subpath.
 *
 * @param segments - Exact segments of the subpath, in path order.
 * @param options - Tolerances and feature switches.
 * @returns Shapes to create. Usually one; empty for degenerate input.
 */
export function recognizePdfCurves(
  segments: readonly PdfImportSegment[],
  options?: PdfCurveRecognitionOptions
): PdfRecognizedShape[] {
  const opts = resolveOptions(options)
  let prims = segments
    .map(segment => classifySegment(segment, opts))
    .filter((prim): prim is Primitive => prim !== undefined)
  if (prims.length === 0) return []

  const closed =
    dist(prims[0].p0, prims[prims.length - 1].p1) <= opts.tolerance * 0.1

  if (opts.fitFlattenedArcs) {
    prims = fitFlattenedArcs(prims, opts)
  }
  prims = mergeArcs(prims, closed, opts)

  const hasCurve = prims.some(prim => prim.kind === 'curve')
  if (hasCurve) {
    const hasLine = prims.some(prim => prim.kind === 'line')
    if (!hasLine && opts.ellipses) {
      const ellipse = recognizeEllipse(prims, closed, opts)
      if (ellipse) return [ellipse]
    }
    if (prims.every(prim => prim.kind === 'curve') && opts.splines) {
      return [toSpline(prims as Extract<Primitive, { kind: 'curve' }>[])]
    }
    return [toPolyline(prims, closed, opts)]
  }

  if (prims.length === 1) {
    const prim = prims[0]
    if (prim.kind === 'line') {
      return [{ kind: 'line', start: prim.p0, end: prim.p1 }]
    }
    if (prim.kind === 'arc') {
      if (closed && Math.abs(Math.abs(prim.sweep) - TWO_PI) < 1e-3) {
        return [{ kind: 'circle', center: prim.center, radius: prim.radius }]
      }
      return [arcShape(prim)]
    }
  }
  return [toPolyline(prims, closed, opts)]
}

function tolFor(radius: number, opts: ResolvedOptions) {
  return Math.max(opts.tolerance, opts.relativeTolerance * radius)
}

function classifySegment(
  segment: PdfImportSegment,
  opts: ResolvedOptions
): Primitive | undefined {
  const minLength = opts.tolerance * 0.1
  if (segment.kind === 'line') {
    if (dist(segment.p0, segment.p1) <= minLength) return undefined
    return { kind: 'line', p0: segment.p0, p1: segment.p1 }
  }

  const { p0, p1, p2, p3 } = segment
  const chord = dist(p0, p3)
  const hull = Math.max(chord, dist(p0, p1), dist(p2, p3), dist(p1, p2))
  if (hull <= minLength) return undefined

  // Straight cubic: both controls on the chord line.
  if (
    chord > minLength &&
    distanceToLine(p1, p0, p3) <= opts.tolerance &&
    distanceToLine(p2, p0, p3) <= opts.tolerance &&
    dot(sub(p1, p0), sub(p3, p0)) >= 0 &&
    dot(sub(p2, p3), sub(p0, p3)) >= 0
  ) {
    return { kind: 'line', p0, p1: p3 }
  }

  const mid = cubicAt(p0, p1, p2, p3, 0.5)
  const circle = chord > minLength ? circleFrom3Points(p0, mid, p3) : undefined
  if (circle) {
    const tol = tolFor(circle.radius, opts)
    const samples: PdfRecPoint[] = []
    for (let i = 1; i < 8; i++) samples.push(cubicAt(p0, p1, p2, p3, i / 8))
    const sweep = signedSweep(circle.center, p0, mid, p3)
    if (
      Math.abs(sweep) <= Math.PI * 1.05 &&
      maxCircleDeviation(samples, circle) <= tol &&
      tangentMatches(p0, p1, circle.center) &&
      tangentMatches(p3, p2, circle.center)
    ) {
      return {
        kind: 'arc',
        p0,
        p1: p3,
        center: circle.center,
        radius: circle.radius,
        sweep
      }
    }
  }
  return { kind: 'curve', p0, c1: p1, c2: p2, p1: p3 }
}

/**
 * True when the control handle at an end point is tangent to the circle.
 * Degenerate handles (control on the end point) carry no tangent and pass.
 */
function tangentMatches(
  end: PdfRecPoint,
  control: PdfRecPoint,
  center: PdfRecPoint
) {
  const handle = sub(control, end)
  const radial = sub(end, center)
  const hl = Math.hypot(handle.x, handle.y)
  const rl = Math.hypot(radial.x, radial.y)
  if (hl < 1e-9 || rl < 1e-9) return true
  return Math.abs(dot(handle, radial)) / (hl * rl) <= 0.02
}

function turnAngle(a: Primitive, b: Primitive) {
  const da = sub(a.p1, a.p0)
  const db = sub(b.p1, b.p0)
  return Math.atan2(cross(da, db), dot(da, db))
}

/** Replaces runs of short, evenly turning lines with fitted arcs. */
function fitFlattenedArcs(
  prims: Primitive[],
  opts: ResolvedOptions
): Primitive[] {
  const out: Primitive[] = []
  let i = 0
  while (i < prims.length) {
    const run = longestArcRun(prims, i, opts)
    if (run) {
      out.push(run.arc)
      i = run.end
    } else {
      out.push(prims[i])
      i++
    }
  }
  return out
}

function longestArcRun(
  prims: Primitive[],
  start: number,
  opts: ResolvedOptions
): { arc: Primitive; end: number } | undefined {
  if (prims[start].kind !== 'line') return undefined
  let best: { arc: Primitive; end: number } | undefined
  let sign = 0
  let minTurn = Infinity
  let maxTurn = 0
  let minLen = Infinity
  let maxLen = 0
  let end = start
  while (end < prims.length && prims[end].kind === 'line') {
    const len = dist(prims[end].p0, prims[end].p1)
    minLen = Math.min(minLen, len)
    maxLen = Math.max(maxLen, len)
    if (end > start) {
      const turn = turnAngle(prims[end - 1], prims[end])
      const turnSign = Math.sign(turn)
      const magnitude = Math.abs(turn)
      if (
        turnSign === 0 ||
        magnitude > opts.maxFlattenedArcTurn ||
        (sign !== 0 && turnSign !== sign)
      ) {
        break
      }
      sign = turnSign
      minTurn = Math.min(minTurn, magnitude)
      maxTurn = Math.max(maxTurn, magnitude)
      // Producers flatten arcs uniformly. Uneven turns or lengths mean a
      // free-form curve or a deliberate polygon, so stop the run.
      if (maxTurn > minTurn * 2 || maxLen > minLen * 2) break
    }
    end++
    const count = end - start
    if (count >= opts.minFlattenedArcSegments) {
      const arc = fitArcToRun(prims, start, end, opts)
      if (!arc) break
      best = { arc, end }
    }
  }
  return best
}

function fitArcToRun(
  prims: Primitive[],
  start: number,
  end: number,
  opts: ResolvedOptions
): Primitive | undefined {
  const points: PdfRecPoint[] = [prims[start].p0]
  for (let k = start; k < end; k++) points.push(prims[k].p1)
  const circle = fitCircleLeastSquares(points)
  if (!circle) return undefined
  if (maxCircleDeviation(points, circle) > tolFor(circle.radius, opts)) {
    return undefined
  }
  const p0 = points[0]
  const p1 = points[points.length - 1]
  const mid = points[Math.floor(points.length / 2)]
  let sweep = signedSweep(circle.center, p0, mid, p1)
  if (dist(p0, p1) <= opts.tolerance * 0.1) {
    // Closed run: the 3-point sweep is ambiguous, use the turn direction.
    const turn = turnAngle(prims[start], prims[start + 1])
    sweep = turn >= 0 ? TWO_PI : -TWO_PI
  }
  return {
    kind: 'arc',
    p0,
    p1,
    center: circle.center,
    radius: circle.radius,
    sweep
  }
}

function sameCircle(
  a: Extract<Primitive, { kind: 'arc' }>,
  b: Extract<Primitive, { kind: 'arc' }>,
  opts: ResolvedOptions
) {
  const tol = tolFor(Math.max(a.radius, b.radius), opts)
  return (
    Math.sign(a.sweep) === Math.sign(b.sweep) &&
    Math.abs(a.radius - b.radius) <= tol &&
    dist(a.center, b.center) <= tol &&
    Math.abs(a.sweep + b.sweep) <= TWO_PI + 1e-6
  )
}

function joinArcs(
  a: Extract<Primitive, { kind: 'arc' }>,
  b: Extract<Primitive, { kind: 'arc' }>
): Extract<Primitive, { kind: 'arc' }> {
  const wa = Math.abs(a.sweep)
  const wb = Math.abs(b.sweep)
  const w = wa + wb
  return {
    kind: 'arc',
    p0: a.p0,
    p1: b.p1,
    center: {
      x: (a.center.x * wa + b.center.x * wb) / w,
      y: (a.center.y * wa + b.center.y * wb) / w
    },
    radius: (a.radius * wa + b.radius * wb) / w,
    sweep: a.sweep + b.sweep
  }
}

function mergeArcs(
  prims: Primitive[],
  closed: boolean,
  opts: ResolvedOptions
): Primitive[] {
  const out: Primitive[] = []
  for (const prim of prims) {
    const last = out[out.length - 1]
    if (
      prim.kind === 'arc' &&
      last?.kind === 'arc' &&
      sameCircle(last, prim, opts)
    ) {
      out[out.length - 1] = joinArcs(last, prim)
    } else {
      out.push(prim)
    }
  }
  if (closed && out.length > 1) {
    const first = out[0]
    const last = out[out.length - 1]
    if (
      first.kind === 'arc' &&
      last.kind === 'arc' &&
      sameCircle(last, first, opts)
    ) {
      out[0] = joinArcs(last, first)
      out.pop()
    }
  }
  return out
}

function arcShape(
  prim: Extract<Primitive, { kind: 'arc' }>
): PdfRecognizedShape {
  const a0 = Math.atan2(prim.p0.y - prim.center.y, prim.p0.x - prim.center.x)
  const a1 = Math.atan2(prim.p1.y - prim.center.y, prim.p1.x - prim.center.x)
  // CAD arcs are counterclockwise; a clockwise path arc swaps its ends.
  const [startAngle, endAngle] = prim.sweep >= 0 ? [a0, a1] : [a1, a0]
  return {
    kind: 'arc',
    center: prim.center,
    radius: prim.radius,
    startAngle: normalizeAngle(startAngle),
    endAngle: normalizeAngle(endAngle)
  }
}

function samplePrimitive(prim: Primitive, steps: number): PdfRecPoint[] {
  const out: PdfRecPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (prim.kind === 'curve') {
      out.push(cubicAt(prim.p0, prim.c1, prim.c2, prim.p1, t))
    } else if (prim.kind === 'arc') {
      const a0 = Math.atan2(
        prim.p0.y - prim.center.y,
        prim.p0.x - prim.center.x
      )
      const a = a0 + prim.sweep * t
      out.push({
        x: prim.center.x + prim.radius * Math.cos(a),
        y: prim.center.y + prim.radius * Math.sin(a)
      })
    } else {
      out.push({
        x: prim.p0.x + (prim.p1.x - prim.p0.x) * t,
        y: prim.p0.y + (prim.p1.y - prim.p0.y) * t
      })
    }
  }
  return out
}

function recognizeEllipse(
  prims: Primitive[],
  closed: boolean,
  opts: ResolvedOptions
): PdfRecognizedShape | undefined {
  // A single short curve fits too many conics; require a real chain.
  if (prims.length < 2) return undefined
  const samples: PdfRecPoint[] = []
  for (const prim of prims) {
    const pts = samplePrimitive(prim, 8)
    samples.push(...(samples.length > 0 ? pts.slice(1) : pts))
  }
  const ellipse = fitEllipse(samples)
  if (!ellipse) return undefined
  const tol = tolFor(ellipse.minorRadius, opts)
  for (const p of samples) {
    if (ellipseDeviation(ellipse, p) > tol) return undefined
  }

  // Walk the samples to get the signed parametric sweep.
  let sweep = 0
  let prev = ellipseParam(ellipse, samples[0])
  for (let i = 1; i < samples.length; i++) {
    const param = ellipseParam(ellipse, samples[i])
    let delta = param - prev
    if (delta > Math.PI) delta -= TWO_PI
    if (delta < -Math.PI) delta += TWO_PI
    sweep += delta
    prev = param
  }
  if (Math.abs(sweep) < Math.PI / 2) return undefined

  const majorAxis = {
    x: ellipse.majorDirection.x * ellipse.majorRadius,
    y: ellipse.majorDirection.y * ellipse.majorRadius
  }
  const radiusRatio = Math.min(1, ellipse.minorRadius / ellipse.majorRadius)
  const isFull = closed && Math.abs(Math.abs(sweep) - TWO_PI) < 1e-2
  if (isFull) {
    return {
      kind: 'ellipse',
      center: ellipse.center,
      majorAxis,
      radiusRatio,
      startAngle: 0,
      endAngle: TWO_PI
    }
  }
  const t0 = ellipseParam(ellipse, samples[0])
  const t1 = ellipseParam(ellipse, samples[samples.length - 1])
  const [startAngle, endAngle] = sweep >= 0 ? [t0, t1] : [t1, t0]
  return {
    kind: 'ellipse',
    center: ellipse.center,
    majorAxis,
    radiusRatio,
    startAngle,
    endAngle
  }
}

function toSpline(
  prims: Extract<Primitive, { kind: 'curve' }>[]
): PdfRecognizedShape {
  const controlPoints: PdfImportPoint[] = [prims[0].p0]
  for (const prim of prims) {
    controlPoints.push(prim.c1, prim.c2, prim.p1)
  }
  const knots = [0, 0, 0, 0]
  for (let i = 1; i < prims.length; i++) knots.push(i, i, i)
  knots.push(prims.length, prims.length, prims.length, prims.length)
  return { kind: 'spline', controlPoints, knots }
}

function flattenSteps(
  prim: Extract<Primitive, { kind: 'curve' }>,
  opts: ResolvedOptions
) {
  // Sagitta-based estimate: deviation of the controls from the chord bounds
  // the curve's flatness.
  const d = Math.max(
    distanceToLine(prim.c1, prim.p0, prim.p1),
    distanceToLine(prim.c2, prim.p0, prim.p1)
  )
  const steps = Math.ceil(
    Math.sqrt((0.75 * d) / Math.max(opts.tolerance, 1e-6))
  )
  return Math.min(64, Math.max(2, steps))
}

function toPolyline(
  prims: Primitive[],
  closed: boolean,
  opts: ResolvedOptions
): PdfRecognizedShape {
  const vertices: PdfRecognizedVertex[] = []
  const push = (p: PdfRecPoint, bulge: number) =>
    vertices.push({ x: p.x, y: p.y, bulge })
  for (const prim of prims) {
    if (prim.kind === 'line') {
      push(prim.p0, 0)
    } else if (prim.kind === 'arc') {
      push(prim.p0, Math.tan(prim.sweep / 4))
    } else {
      const pts = samplePrimitive(prim, flattenSteps(prim, opts))
      for (let i = 0; i < pts.length - 1; i++) push(pts[i], 0)
    }
  }
  if (!closed) {
    const last = prims[prims.length - 1]
    push(last.p1, 0)
  }
  return { kind: 'polyline', vertices, closed }
}
