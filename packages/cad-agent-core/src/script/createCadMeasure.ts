import type { Point2dInput } from '../tools/types'
import type { EntitySnapshot } from './entitySnapshot'

/** One row from {@link CadMeasureApi.check}. */
export interface MeasureCheck {
  name: string
  expected: number
  actual: number
  pass: boolean
}

/** Aggregate from {@link CadMeasureApi.report}. */
export interface MeasureReport {
  ok: boolean
  checks: MeasureCheck[]
}

/**
 * Compact WCS measure helpers for script self-check.
 *
 * Prefer these over hand-rolled Math when verifying drawn geometry — shorter
 * scripts and a stable return shape for the model.
 */
export interface CadMeasureApi {
  /** Euclidean distance between two points (xy only). */
  distance(a: Point2dInput, b: Point2dInput): number
  /**
   * With two points: direction of a→b from +X, degrees in (-180, 180].
   * With three points: interior angle at b (a–b–c), degrees in [0, 180].
   */
  angleDeg(a: Point2dInput, b: Point2dInput, c?: Point2dInput): number
  /** Smallest absolute difference between two bearings, degrees in [0, 180]. */
  deltaAngleDeg(fromDeg: number, toDeg: number): number
  /**
   * Circle / Arc / Ellipse center, or Point / Text / MText position.
   * Undefined when the id is missing or the type has no single point.
   */
  center(id: string): Point2dInput | undefined
  /**
   * Circle / Arc radius, or Ellipse majorRadius.
   * Undefined when missing or unsupported.
   */
  radius(id: string): number | undefined
  /**
   * Line length, or polyline / spline / 2dPolyline / 3dPolyline path length
   * (closed loops include the closing segment). Undefined when unsupported.
   */
  length(id: string): number | undefined
  /**
   * One check row. Default absolute tolerance is `1e-3` drawing units.
   * Passes when `|actual - expected| <= tolerance`.
   */
  check(
    name: string,
    expected: number,
    actual: number,
    tolerance?: number
  ): MeasureCheck
  /** `ok` is true iff every check passed. */
  report(checks: MeasureCheck[]): MeasureReport
}

const DEFAULT_TOLERANCE = 1e-3

/**
 * Builds `cad.measure` using entity snapshots from the host.
 *
 * @param byId - Resolves an entity snapshot by object id.
 */
export function createCadMeasure(
  byId: (id: string) => EntitySnapshot | undefined
): CadMeasureApi {
  return {
    distance(a, b) {
      const pa = requirePoint(a, 'distance a')
      const pb = requirePoint(b, 'distance b')
      return Math.hypot(pb.x - pa.x, pb.y - pa.y)
    },

    angleDeg(a, b, c) {
      if (c === undefined) {
        const from = requirePoint(a, 'angleDeg a')
        const to = requirePoint(b, 'angleDeg b')
        return radToDeg(Math.atan2(to.y - from.y, to.x - from.x))
      }
      const pa = requirePoint(a, 'angleDeg a')
      const pb = requirePoint(b, 'angleDeg b')
      const pc = requirePoint(c, 'angleDeg c')
      const v1x = pa.x - pb.x
      const v1y = pa.y - pb.y
      const v2x = pc.x - pb.x
      const v2y = pc.y - pb.y
      const len1 = Math.hypot(v1x, v1y)
      const len2 = Math.hypot(v2x, v2y)
      if (len1 === 0 || len2 === 0) {
        throw new Error('angleDeg: zero-length side')
      }
      const cos = (v1x * v2x + v1y * v2y) / (len1 * len2)
      return radToDeg(Math.acos(clamp(cos, -1, 1)))
    },

    deltaAngleDeg(fromDeg, toDeg) {
      if (typeof fromDeg !== 'number' || typeof toDeg !== 'number') {
        throw new Error('deltaAngleDeg expects numbers')
      }
      let d = ((toDeg - fromDeg) % 360) + 360
      d = d % 360
      if (d > 180) d = 360 - d
      return d
    },

    center(id) {
      const geometry = geometryOf(byId, id)
      if (!geometry) return undefined
      const center = asPoint(geometry.center)
      if (center) return center
      return asPoint(geometry.position)
    },

    radius(id) {
      const geometry = geometryOf(byId, id)
      if (!geometry) return undefined
      if (typeof geometry.radius === 'number') return geometry.radius
      if (typeof geometry.majorRadius === 'number') return geometry.majorRadius
      return undefined
    },

    length(id) {
      const snapshot = byId(id)
      if (!snapshot?.geometry) return undefined
      const geometry = snapshot.geometry
      const start = asPoint(geometry.start)
      const end = asPoint(geometry.end)
      if (start && end) {
        return Math.hypot(end.x - start.x, end.y - start.y)
      }
      const points = asPointList(geometry.points)
      if (!points || points.length < 2) return undefined
      let total = 0
      for (let i = 1; i < points.length; i++) {
        total += Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y
        )
      }
      if (geometry.closed === true) {
        const first = points[0]
        const last = points[points.length - 1]
        total += Math.hypot(first.x - last.x, first.y - last.y)
      }
      return total
    },

    check(name, expected, actual, tolerance = DEFAULT_TOLERANCE) {
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error('check expects a non-empty name')
      }
      if (typeof expected !== 'number' || typeof actual !== 'number') {
        throw new Error('check expects numeric expected and actual')
      }
      const tol =
        typeof tolerance === 'number' && Number.isFinite(tolerance)
          ? Math.abs(tolerance)
          : DEFAULT_TOLERANCE
      return {
        name,
        expected,
        actual,
        pass: Math.abs(actual - expected) <= tol
      }
    },

    report(checks) {
      if (!Array.isArray(checks)) {
        throw new Error('report expects an array of checks')
      }
      return {
        ok: checks.every(row => row && row.pass === true),
        checks
      }
    }
  }
}

function geometryOf(
  byId: (id: string) => EntitySnapshot | undefined,
  id: string
): Record<string, unknown> | undefined {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('measure id must be a non-empty string')
  }
  return byId(id)?.geometry
}

function requirePoint(value: Point2dInput, label: string): Point2dInput {
  const point = asPoint(value)
  if (!point) throw new Error(`${label} must be { x, y }`)
  return point
}

function asPoint(value: unknown): Point2dInput | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as { x?: unknown; y?: unknown }
  if (typeof record.x !== 'number' || typeof record.y !== 'number') {
    return undefined
  }
  return { x: record.x, y: record.y }
}

function asPointList(value: unknown): Point2dInput[] | undefined {
  if (!Array.isArray(value)) return undefined
  const points: Point2dInput[] = []
  for (const item of value) {
    const point = asPoint(item)
    if (!point) return undefined
    points.push(point)
  }
  return points
}

function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
