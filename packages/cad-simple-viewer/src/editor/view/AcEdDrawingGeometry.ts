import {
  AcDb2dPolyline,
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEllipse,
  AcDbOsnapMode,
  AcDbPolyline,
  type AcGeIntersectPrimitive,
  AcGeMatrix3d,
  AcGePoint3d,
  type AcGePoint3dLike,
  acgeTransformIntersectPrimitive,
  AcGeVector3d,
  type AcGeVector3dLike
} from '@mlightcad/data-model'

import type { AcEdDrawingPickResult } from './AcEdDrawingPickResult'

/** Whether a displayed point survives this occurrence's paper viewport clip. */
export function acEdDrawingPointVisible(
  candidate: AcEdDrawingPickResult,
  point: { x: number; y: number }
): boolean {
  const clip = candidate.clipBounds
  return (
    !clip ||
    (point.x >= clip.minX &&
      point.x <= clip.maxX &&
      point.y >= clip.minY &&
      point.y <= clip.maxY)
  )
}

/** Existing interactive intersection ceiling, also used by affine metric fallback.
 * Native subGetIntersectCurves materializes first: this bounds subsequent transform
 * and pair work, not native collection allocation or total pointer-query time. */
const MAX_INTERSECTION_PRIMITIVES = 32

function invertibleAffine(matrix: AcGeMatrix3d): boolean {
  const e = matrix.elements
  return (
    e.every(Number.isFinite) &&
    e[3] === 0 &&
    e[7] === 0 &&
    e[11] === 0 &&
    e[15] === 1 &&
    Number.isFinite(matrix.determinant()) &&
    matrix.determinant() !== 0
  )
}

/** Similarities preserve native local distance/angle queries. A planar curve may
 * scale differently along its normal, provided normal and tangents stay orthogonal. */
function similarity(matrix: AcGeMatrix3d, normal?: AcGeVector3dLike): boolean {
  const e = normal
    ? matrix
        .clone()
        .multiply(
          new AcGeMatrix3d().setFromExtrusionDirection(new AcGeVector3d(normal))
        ).elements
    : matrix.elements
  const axes = [
    [e[0], e[1], e[2]],
    [e[4], e[5], e[6]],
    [e[8], e[9], e[10]]
  ]
  const dot = (a: number[], b: number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const lengths = axes.map(axis => dot(axis, axis))
  const equal = (a: number, b: number) =>
    Math.abs(a - b) <= Math.max(a, b) * 1e-9
  const orthogonal = (a: number, b: number) =>
    Math.abs(dot(axes[a], axes[b])) <= Math.sqrt(lengths[a] * lengths[b]) * 1e-9
  return (
    lengths.every(length => length > 0) &&
    equal(lengths[0], lengths[1]) &&
    (normal !== undefined || equal(lengths[0], lengths[2])) &&
    orthogonal(0, 1) &&
    orthogonal(0, 2) &&
    orthogonal(1, 2)
  )
}

function entitySimilarity(candidate: AcEdDrawingPickResult): boolean {
  const entity = candidate.entity
  const normal =
    entity instanceof AcDbCircle ||
    entity instanceof AcDbArc ||
    entity instanceof AcDbEllipse ||
    entity instanceof AcDbPolyline ||
    entity instanceof AcDb2dPolyline
      ? entity.normal
      : undefined
  return similarity(candidate.transform, normal)
}

/**
 * Native curve copies in display coordinates, without allocating database entities.
 * Nonuniform/sheared circles and ellipses are omitted: the native transforms do
 * not represent their general affine image exactly. Lines and splines remain valid.
 * Coarse INSERT roots are not expanded into every child during pointer movement.
 */
export function acEdDrawingIntersectCurves(
  candidate: AcEdDrawingPickResult
): AcGeIntersectPrimitive[] {
  if (
    !invertibleAffine(candidate.transform) ||
    candidate.entity instanceof AcDbBlockReference
  )
    return []
  const primitives = candidate.entity.subGetIntersectCurves()
  if (primitives.length > MAX_INTERSECTION_PRIMITIVES) return []
  return primitives
    .filter(
      primitive =>
        primitive.kind === 'line' ||
        primitive.kind === 'spline' ||
        similarity(candidate.transform, primitive.arc.normal)
    )
    .map(primitive =>
      acgeTransformIntersectPrimitive(primitive, candidate.transform)
    )
}

/**
 * Queries the native entity in its own drawing frame, then maps owned points to
 * displayed WCS. For nonuniform/sheared occurrences, distance queries use native
 * transformed line/spline primitives; unsupported curved modes return no points.
 * No source entity or process-global working database is modified.
 */
export function acEdDrawingOsnapPoints(
  candidate: AcEdDrawingPickResult,
  mode: AcDbOsnapMode,
  pickWcs: AcGePoint3dLike,
  lastWcs: AcGePoint3dLike = pickWcs
): AcGePoint3d[] {
  const transform = candidate.transform
  if (!invertibleAffine(transform)) return []
  if (
    candidate.entity instanceof AcDbBlockReference &&
    mode !== AcDbOsnapMode.Insertion
  )
    return []
  const metricMode =
    mode === AcDbOsnapMode.Nearest ||
    mode === AcDbOsnapMode.Perpendicular ||
    mode === AcDbOsnapMode.Tangent
  if (metricMode && !entitySimilarity(candidate)) {
    const pick = new AcGePoint3d(pickWcs)
    const points: AcGePoint3d[] = []
    for (const primitive of acEdDrawingIntersectCurves(candidate)) {
      if (primitive.kind === 'line') {
        if (mode === AcDbOsnapMode.Perpendicular)
          points.push(primitive.line.perpPoint(pick))
        if (mode === AcDbOsnapMode.Nearest) {
          if (
            primitive.extent === 'ray' &&
            primitive.line.closestPointToPointParameter(pick, false) < 0
          ) {
            points.push(primitive.line.startPoint.clone())
          } else {
            points.push(
              primitive.line.closestPointToPoint(
                pick,
                primitive.extent === 'bounded',
                new AcGePoint3d()
              )
            )
          }
        }
      } else if (
        primitive.kind === 'spline' &&
        mode === AcDbOsnapMode.Nearest
      ) {
        points.push(primitive.spline.nearestPoint(pick))
      }
    }
    return points
  }
  const inverse = transform.clone().invert()
  const local: AcGePoint3dLike[] = []
  candidate.entity.subGetOsnapPoints(
    mode,
    new AcGePoint3d(pickWcs).applyMatrix4(inverse),
    new AcGePoint3d(lastWcs).applyMatrix4(inverse),
    local
  )
  return local.map(point => new AcGePoint3d(point).applyMatrix4(transform))
}
