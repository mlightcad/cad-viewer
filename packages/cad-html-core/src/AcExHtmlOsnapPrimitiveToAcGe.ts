/**
 * Converts exported {@link AcExHtmlOsnapPrimitive} records into `AcGe*` curves
 * for object snap evaluation in the offline HTML viewer.
 *
 * @packageDocumentation
 */

import {
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeNurbsCurve,
  AcGePoint2d,
  TAU
} from '@mlightcad/data-model'

import type {
  AcExHtmlOsnapArcPrimitive,
  AcExHtmlOsnapCirclePrimitive,
  AcExHtmlOsnapEllipsePrimitive,
  AcExHtmlOsnapPrimitive,
  AcExHtmlOsnapSplinePrimitive
} from './AcExHtmlOsnapPrimitiveTypes'

/** Discriminated result of {@link acexHtmlPrimitiveToAcGeCurve}. */
export type AcExHtmlOsnapAcGeCurve =
  | { kind: 'line'; curve: AcGeLine2d }
  | { kind: 'circArc'; curve: AcGeCircArc2d }
  | { kind: 'ellipse'; curve: AcGeEllipseArc2d }
  | { kind: 'spline'; curve: AcGeNurbsCurve }
  | { kind: 'point'; point: AcGePoint2d }

/** Positive CCW sweep from start to end angle (radians). */
export function acexHtmlNormalizeArcDelta(
  startAngle: number,
  endAngle: number
): number {
  let delta = endAngle - startAngle
  while (delta <= 0) delta += TAU
  while (delta > TAU) delta -= TAU
  return delta
}

/** WCS point on a circular arc from center/radius and OCS-style angle. */
export function acexHtmlArcWcsPoint(
  cx: number,
  cy: number,
  r: number,
  angle: number,
  normalSign: 1 | -1
): AcGePoint2d {
  const sx = normalSign === -1 ? -1 : 1
  return new AcGePoint2d(
    cx + sx * r * Math.cos(angle),
    cy + r * Math.sin(angle)
  )
}

/**
 * Inverse of {@link acexHtmlArcWcsPoint}: OCS parameter angle of a WCS point.
 *
 * Used when exporting WCS {@link AcGeCircArc2d} bulge geometry (polylines,
 * hatch loops). Clockwise `AcGeCircArc2d` public angles are Y-mirrored, which
 * is not the AutoCAD −Z / X-mirror convention {@link acexHtmlArcToAcGe} expects.
 */
export function acexHtmlWcsPointToOcsArcAngle(
  cx: number,
  cy: number,
  x: number,
  y: number,
  normalSign: 1 | -1
): number {
  return Math.atan2(y - cy, normalSign * (x - cx))
}

/**
 * Builds an open circular arc in WCS from exported center/angle data.
 *
 * AutoCAD stores arc angles in OCS; a `-Z` extrusion mirrors X when mapping to
 * WCS. {@link AcGeCircArc2d}'s `clockwise` flag alone does not reproduce that,
 * so the arc is reconstructed from WCS endpoints and bulge.
 */
export function acexHtmlArcToAcGe(prim: AcExHtmlOsnapArcPrimitive): AcGeCircArc2d {
  const start = acexHtmlArcWcsPoint(
    prim.cx,
    prim.cy,
    prim.r,
    prim.startAngle,
    prim.normalSign
  )
  const end = acexHtmlArcWcsPoint(
    prim.cx,
    prim.cy,
    prim.r,
    prim.endAngle,
    prim.normalSign
  )
  const delta = acexHtmlNormalizeArcDelta(prim.startAngle, prim.endAngle)
  const bulge = prim.normalSign * Math.tan(delta / 4)
  return new AcGeCircArc2d(start, end, bulge)
}

/**
 * Positive parameter sweep for an elliptical arc (radians).
 *
 * @param prim - Exported ellipse primitive.
 */
export function acexHtmlEllipseArcDelta(prim: AcExHtmlOsnapEllipsePrimitive): number {
  return acexHtmlNormalizeArcDelta(prim.startAngle, prim.endAngle)
}

/**
 * Evaluates a WCS point on an elliptical arc at normalized parameter `u` ∈ [0, 1].
 *
 * Matches AutoCAD / `AcDbEllipse` OCS→WCS mapping (including `-Z` extrusion).
 *
 * @param prim - Exported ellipse primitive.
 * @param u - Normalized parameter along the arc (`0` = start, `1` = end).
 */
export function acexHtmlEllipsePointAtNormalized(
  prim: AcExHtmlOsnapEllipsePrimitive,
  u: number
): AcGePoint2d {
  const delta = acexHtmlEllipseArcDelta(prim)
  const t = prim.startAngle + u * delta
  const normalSign = prim.normalSign ?? 1
  const lx = prim.majorR * Math.cos(t)
  const ly = normalSign * prim.minorR * Math.sin(t)
  const c = prim.majorX
  const s = prim.majorY
  return new AcGePoint2d(prim.cx + lx * c - ly * s, prim.cy + lx * s + ly * c)
}

/**
 * Builds an `AcGeCircArc2d` from a circle or arc primitive.
 *
 * @param prim - Circle or arc in WCS.
 */
export function acexHtmlCircleOrArcToAcGe(
  prim: AcExHtmlOsnapCirclePrimitive | AcExHtmlOsnapArcPrimitive
): AcGeCircArc2d {
  if (prim.kind === 'circle') {
    return new AcGeCircArc2d(
      { x: prim.cx, y: prim.cy },
      prim.r,
      0,
      TAU,
      prim.normalSign === -1
    )
  }
  return acexHtmlArcToAcGe(prim)
}

/**
 * Builds an `AcGeEllipseArc2d` from an ellipse primitive.
 *
 * @param prim - Ellipse or elliptical arc in WCS.
 */
export function acexHtmlEllipseToAcGe(
  prim: AcExHtmlOsnapEllipsePrimitive
): AcGeEllipseArc2d {
  const rotation = Math.atan2(prim.majorY, prim.majorX)
  return new AcGeEllipseArc2d(
    { x: prim.cx, y: prim.cy, z: 0 },
    prim.majorR,
    prim.minorR,
    prim.startAngle,
    prim.endAngle,
    prim.closed,
    rotation
  )
}

/**
 * Builds an `AcGeNurbsCurve` from a spline primitive.
 *
 * @param prim - Serialized NURBS data in WCS.
 */
export function acexHtmlSplineToAcGe(prim: AcExHtmlOsnapSplinePrimitive): AcGeNurbsCurve {
  const controlPoints: { x: number; y: number; z: number }[] = []
  for (let i = 0; i + 1 < prim.controlPoints.length; i += 2) {
    controlPoints.push({
      x: prim.controlPoints[i]!,
      y: prim.controlPoints[i + 1]!,
      z: 0
    })
  }
  return new AcGeNurbsCurve(
    prim.degree,
    prim.knots,
    controlPoints,
    prim.weights.length > 0 ? prim.weights : undefined
  )
}

/**
 * Maps one snapshot primitive to the corresponding `AcGe` curve or point.
 *
 * @param prim - Exported primitive from {@link AcExHtmlOsnapCatalog}.
 * @returns Wrapped geometry for snap evaluation.
 */
export function acexHtmlPrimitiveToAcGeCurve(
  prim: AcExHtmlOsnapPrimitive
): AcExHtmlOsnapAcGeCurve {
  switch (prim.kind) {
    case 'line':
      return {
        kind: 'line',
        curve: new AcGeLine2d(
          { x: prim.x0, y: prim.y0 },
          { x: prim.x1, y: prim.y1 }
        )
      }
    case 'circle':
    case 'arc':
      return { kind: 'circArc', curve: acexHtmlCircleOrArcToAcGe(prim) }
    case 'ellipse':
      return { kind: 'ellipse', curve: acexHtmlEllipseToAcGe(prim) }
    case 'spline':
      return { kind: 'spline', curve: acexHtmlSplineToAcGe(prim) }
    case 'point':
      return { kind: 'point', point: new AcGePoint2d(prim.x, prim.y) }
    case 'path':
      throw new Error('path primitives must be expanded before curve conversion')
  }
}
