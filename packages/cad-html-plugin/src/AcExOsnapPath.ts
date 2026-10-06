/**
 * Expands compact ACEO {@link AcExOsnapPathPrimitive} records into line/arc
 * edges for query-time snap (entity-bbox index, not per-edge export).
 *
 * @packageDocumentation
 */

import { AcGeCircArc2d, AcGeTol } from '@mlightcad/data-model'

import { wcsPointToOcsArcAngle } from './AcExOsnapPrimitiveToAcGe'
import type {
  AcExOsnapArcPrimitive,
  AcExOsnapLinePrimitive,
  AcExOsnapPathPrimitive,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'

/** Line or bulge-arc edge produced by {@link expandOsnapPath}. */
export type AcExOsnapPathEdge = AcExOsnapLinePrimitive | AcExOsnapArcPrimitive

/**
 * Axis-aligned bounds of a fill/frame path in WCS.
 */
export function pathPrimitiveBounds(path: AcExOsnapPathPrimitive): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const verts = path.vertices
  const count = (verts.length / 3) | 0
  for (let i = 0; i < count; i++) {
    const x = verts[i * 3]!
    const y = verts[i * 3 + 1]!
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const segmentCount = path.closed ? count : count - 1
  for (let i = 0; i < segmentCount; i++) {
    const bulge = verts[i * 3 + 2]!
    if (!AcGeTol.isPositive(Math.abs(bulge))) continue
    const i1 = ((i + 1) % count) * 3
    const arc = new AcGeCircArc2d(
      { x: verts[i * 3]!, y: verts[i * 3 + 1]! },
      { x: verts[i1]!, y: verts[i1 + 1]! },
      bulge
    )
    if (!(arc.radius > 0) || !Number.isFinite(arc.radius)) continue
    minX = Math.min(minX, arc.center.x - arc.radius)
    minY = Math.min(minY, arc.center.y - arc.radius)
    maxX = Math.max(maxX, arc.center.x + arc.radius)
    maxY = Math.max(maxY, arc.center.y + arc.radius)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Turns one path into straight segments and circular-arc edges (WCS).
 *
 * Bulge vertices use {@link AcGeCircArc2d} the same way hatch/polyline export
 * does, so endpoint / midpoint / center snap matches the live viewer.
 */
export function expandOsnapPath(
  path: AcExOsnapPathPrimitive
): AcExOsnapPathEdge[] {
  const verts = path.vertices
  const count = (verts.length / 3) | 0
  if (count < 2 || verts.length !== count * 3) {
    return []
  }

  const segmentCount = path.closed ? count : count - 1
  const out: AcExOsnapPathEdge[] = []
  for (let i = 0; i < segmentCount; i++) {
    const i0 = i * 3
    const i1 = ((i + 1) % count) * 3
    const x0 = verts[i0]!
    const y0 = verts[i0 + 1]!
    const bulge = verts[i0 + 2]!
    const x1 = verts[i1]!
    const y1 = verts[i1 + 1]!
    if (!Number.isFinite(x0) || !Number.isFinite(y0)) continue
    if (!Number.isFinite(x1) || !Number.isFinite(y1)) continue

    if (AcGeTol.isPositive(Math.abs(bulge))) {
      const arc = pathEdgeFromBulge(path.layer, x0, y0, x1, y1, bulge)
      if (arc) out.push(arc)
    } else {
      out.push({
        kind: 'line',
        layer: path.layer,
        x0,
        y0,
        x1,
        y1
      })
    }
  }
  return out
}

/**
 * True when an edge bbox is within `threshold` of `(px, py)`.
 */
export function pathEdgeNearAperture(
  edge: AcExOsnapPathEdge,
  px: number,
  py: number,
  threshold: number
): boolean {
  if (edge.kind === 'line') {
    const minX = Math.min(edge.x0, edge.x1) - threshold
    const maxX = Math.max(edge.x0, edge.x1) + threshold
    const minY = Math.min(edge.y0, edge.y1) - threshold
    const maxY = Math.max(edge.y0, edge.y1) + threshold
    return px >= minX && px <= maxX && py >= minY && py <= maxY
  }
  return (
    px >= edge.cx - edge.r - threshold &&
    px <= edge.cx + edge.r + threshold &&
    py >= edge.cy - edge.r - threshold &&
    py <= edge.cy + edge.r + threshold
  )
}

function pathEdgeFromBulge(
  layer: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bulge: number
): AcExOsnapArcPrimitive | undefined {
  const arc = new AcGeCircArc2d({ x: x0, y: y0 }, { x: x1, y: y1 }, bulge)
  if (!(arc.radius > 0) || !Number.isFinite(arc.radius)) {
    return undefined
  }
  const normalSign: 1 | -1 = arc.clockwise ? -1 : 1
  const cx = arc.center.x
  const cy = arc.center.y
  return {
    kind: 'arc',
    layer,
    cx,
    cy,
    r: arc.radius,
    startAngle: wcsPointToOcsArcAngle(
      cx,
      cy,
      arc.startPoint.x,
      arc.startPoint.y,
      normalSign
    ),
    endAngle: wcsPointToOcsArcAngle(
      cx,
      cy,
      arc.endPoint.x,
      arc.endPoint.y,
      normalSign
    ),
    normalSign
  }
}

/** Type guard used when walking mixed ACEO catalogs. */
export function isOsnapPathPrimitive(
  prim: AcExOsnapPrimitive
): prim is AcExOsnapPathPrimitive {
  return prim.kind === 'path'
}
