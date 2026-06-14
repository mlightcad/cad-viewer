/**
 * Object snap candidate collection for exported analytic primitives.
 *
 * Thin orchestration layer: converts {@link AcExOsnapPrimitive} via
 * {@link primitiveToAcGeCurve}, then calls `AcGeLine2d`, `AcGeCircArc2d`,
 * `AcGeEllipseArc2d`, and `AcGeNurbsCurve` from `@mlightcad/data-model`
 * (geometry-engine) for all snap math.
 *
 * @packageDocumentation
 */

import type { AcGePoint2dLike } from '@mlightcad/data-model'

import {
  type AcExOsnapAcGeCurve,
  ellipsePointAtNormalized,
  primitiveToAcGeCurve
} from './AcExOsnapPrimitiveToAcGe'
import type {
  AcExOsnapMode,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'

/**
 * Squared Euclidean distance between two XY points.
 *
 * @param ax - First point X.
 * @param ay - First point Y.
 * @param bx - Second point X.
 * @param by - Second point Y.
 */
export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function pushPoint(
  out: AcExOsnapCandidate[],
  p: AcGePoint2dLike,
  mode: AcExOsnapMode
): void {
  out.push({ x: p.x, y: p.y, mode })
}

/** One snap candidate before distance filtering in {@link AcExOsnapIndex}. */
export interface AcExOsnapCandidate {
  x: number
  y: number
  mode: AcExOsnapMode
}

/**
 * Collects discrete (non-nearest) snap points for one primitive at index build time.
 *
 * @param prim - Exported primitive in WCS.
 * @param modes - Enabled OSNAP modes.
 * @param geo - Optional pre-built curve from {@link primitiveToAcGeCurve}.
 */
export function collectPrimitiveDiscreteSnapCandidates(
  prim: AcExOsnapPrimitive,
  modes: Set<AcExOsnapMode>,
  geo?: AcExOsnapAcGeCurve
): AcExOsnapCandidate[] {
  const out: AcExOsnapCandidate[] = []
  const resolved = geo ?? primitiveToAcGeCurve(prim)

  switch (resolved.kind) {
    case 'line': {
      const line = resolved.curve
      if (modes.has('endpoint')) {
        pushPoint(out, line.startPoint, 'endpoint')
        pushPoint(out, line.endPoint, 'endpoint')
      }
      if (modes.has('midpoint')) {
        pushPoint(
          out,
          {
            x: (line.startPoint.x + line.endPoint.x) * 0.5,
            y: (line.startPoint.y + line.endPoint.y) * 0.5
          },
          'midpoint'
        )
      }
      break
    }
    case 'circArc': {
      const arc = resolved.curve
      if (modes.has('endpoint') && !arc.closed) {
        pushPoint(out, arc.startPoint, 'endpoint')
        pushPoint(out, arc.endPoint, 'endpoint')
      }
      if (modes.has('center')) {
        pushPoint(out, arc.center, 'center')
      }
      if (modes.has('midpoint') && !arc.closed) {
        pushPoint(out, arc.midPoint, 'midpoint')
      }
      if (modes.has('quadrant')) {
        for (const p of arc.getQuadrantPoints()) {
          pushPoint(out, p, 'quadrant')
        }
      }
      break
    }
    case 'ellipse': {
      const ellipse = resolved.curve
      if (prim.kind !== 'ellipse') break
      if (modes.has('endpoint') && !prim.closed) {
        pushPoint(out, ellipsePointAtNormalized(prim, 0), 'endpoint')
        pushPoint(out, ellipsePointAtNormalized(prim, 1), 'endpoint')
      }
      if (modes.has('center')) {
        pushPoint(out, ellipse.center, 'center')
      }
      if (modes.has('midpoint') && !prim.closed) {
        pushPoint(out, ellipsePointAtNormalized(prim, 0.5), 'midpoint')
      }
      if (modes.has('quadrant')) {
        for (const p of ellipse.getQuadrantPoints()) {
          pushPoint(out, p, 'quadrant')
        }
      }
      break
    }
    case 'spline': {
      const spline = resolved.curve
      const { start, end } = spline.getParameterRange()
      const startPt = spline.point(start)
      const endPt = spline.point(end)
      if (modes.has('endpoint')) {
        pushPoint(out, { x: startPt[0]!, y: startPt[1]! }, 'endpoint')
        pushPoint(out, { x: endPt[0]!, y: endPt[1]! }, 'endpoint')
      }
      if (modes.has('node') && prim.kind === 'spline') {
        const seen = new Set<number>()
        for (const k of prim.knots) {
          if (seen.has(k)) continue
          seen.add(k)
          const p = spline.point(k)
          pushPoint(out, { x: p[0]!, y: p[1]! }, 'node')
        }
      }
      break
    }
    case 'point': {
      if (modes.has('node') || modes.has('endpoint')) {
        pushPoint(out, resolved.point, 'node')
      }
      break
    }
  }

  return out
}

/**
 * Nearest snap on one primitive; uses a pre-built curve when provided.
 */
export function collectPrimitiveNearestSnapCandidate(
  prim: AcExOsnapPrimitive,
  px: number,
  py: number,
  geo?: AcExOsnapAcGeCurve
): AcExOsnapCandidate | undefined {
  const pick = { x: px, y: py, z: 0 }
  const resolved = geo ?? primitiveToAcGeCurve(prim)

  switch (resolved.kind) {
    case 'line': {
      const p = resolved.curve.nearestPoint(pick)
      return { x: p.x, y: p.y, mode: 'nearest' }
    }
    case 'circArc': {
      const p = resolved.curve.nearestPoint(pick)
      return { x: p.x, y: p.y, mode: 'nearest' }
    }
    case 'ellipse': {
      const p = resolved.curve.nearestPoint(pick)
      return { x: p.x, y: p.y, mode: 'nearest' }
    }
    case 'spline': {
      const p = resolved.curve.nearestPoint(pick)
      return { x: p.x, y: p.y, mode: 'nearest' }
    }
    default:
      return undefined
  }
}

/**
 * Collects snap candidates for one primitive using `AcGe*` geometry.
 *
 * @param prim - Exported primitive in WCS.
 * @param px - Pick X in WCS.
 * @param py - Pick Y in WCS.
 * @param modes - Enabled OSNAP modes.
 */
export function collectPrimitiveSnapCandidates(
  prim: AcExOsnapPrimitive,
  px: number,
  py: number,
  modes: Set<AcExOsnapMode>
): AcExOsnapCandidate[] {
  const out = collectPrimitiveDiscreteSnapCandidates(prim, modes)
  if (modes.has('nearest')) {
    const nearest = collectPrimitiveNearestSnapCandidate(prim, px, py)
    if (nearest) out.push(nearest)
  }
  return out
}
