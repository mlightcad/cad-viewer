/**
 * Converts exported {@link AcExOsnapPrimitive} records into `AcGe*` curves
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
  AcExOsnapArcPrimitive,
  AcExOsnapCirclePrimitive,
  AcExOsnapEllipsePrimitive,
  AcExOsnapPrimitive,
  AcExOsnapSplinePrimitive
} from './AcExOsnapPrimitiveTypes'

/** Discriminated result of {@link primitiveToAcGeCurve}. */
export type AcExOsnapAcGeCurve =
  | { kind: 'line'; curve: AcGeLine2d }
  | { kind: 'circArc'; curve: AcGeCircArc2d }
  | { kind: 'ellipse'; curve: AcGeEllipseArc2d }
  | { kind: 'spline'; curve: AcGeNurbsCurve }
  | { kind: 'point'; point: AcGePoint2d }

/** Positive CCW sweep from start to end angle (radians). */
export function normalizeArcDelta(
  startAngle: number,
  endAngle: number
): number {
  let delta = endAngle - startAngle
  while (delta <= 0) delta += TAU
  while (delta > TAU) delta -= TAU
  return delta
}

/** WCS point on a circular arc from center/radius and OCS-style angle. */
export function arcWcsPoint(
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
 * Builds an open circular arc in WCS from exported center/angle data.
 *
 * AutoCAD stores arc angles in OCS; a `-Z` extrusion mirrors X when mapping to
 * WCS. {@link AcGeCircArc2d}'s `clockwise` flag alone does not reproduce that,
 * so the arc is reconstructed from WCS endpoints and bulge.
 */
export function arcToAcGe(prim: AcExOsnapArcPrimitive): AcGeCircArc2d {
  const start = arcWcsPoint(
    prim.cx,
    prim.cy,
    prim.r,
    prim.startAngle,
    prim.normalSign
  )
  const end = arcWcsPoint(
    prim.cx,
    prim.cy,
    prim.r,
    prim.endAngle,
    prim.normalSign
  )
  const delta = normalizeArcDelta(prim.startAngle, prim.endAngle)
  const bulge = prim.normalSign * Math.tan(delta / 4)
  return new AcGeCircArc2d(start, end, bulge)
}

/**
 * Positive parameter sweep for an elliptical arc (radians).
 *
 * @param prim - Exported ellipse primitive.
 */
export function ellipseArcDelta(prim: AcExOsnapEllipsePrimitive): number {
  return normalizeArcDelta(prim.startAngle, prim.endAngle)
}

/**
 * Evaluates a WCS point on an elliptical arc at normalized parameter `u` ∈ [0, 1].
 *
 * Matches AutoCAD / `AcDbEllipse` OCS→WCS mapping (including `-Z` extrusion).
 *
 * @param prim - Exported ellipse primitive.
 * @param u - Normalized parameter along the arc (`0` = start, `1` = end).
 */
export function ellipsePointAtNormalized(
  prim: AcExOsnapEllipsePrimitive,
  u: number
): AcGePoint2d {
  const delta = ellipseArcDelta(prim)
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
export function circleOrArcToAcGe(
  prim: AcExOsnapCirclePrimitive | AcExOsnapArcPrimitive
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
  return arcToAcGe(prim)
}

/**
 * Builds an `AcGeEllipseArc2d` from an ellipse primitive.
 *
 * @param prim - Ellipse or elliptical arc in WCS.
 */
export function ellipseToAcGe(
  prim: AcExOsnapEllipsePrimitive
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
export function splineToAcGe(prim: AcExOsnapSplinePrimitive): AcGeNurbsCurve {
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
 * @param prim - Exported primitive from {@link AcExOsnapCatalog}.
 * @returns Wrapped geometry for snap evaluation.
 */
export function primitiveToAcGeCurve(
  prim: AcExOsnapPrimitive
): AcExOsnapAcGeCurve {
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
      return { kind: 'circArc', curve: circleOrArcToAcGe(prim) }
    case 'ellipse':
      return { kind: 'ellipse', curve: ellipseToAcGe(prim) }
    case 'spline':
      return { kind: 'spline', curve: splineToAcGe(prim) }
    case 'point':
      return { kind: 'point', point: new AcGePoint2d(prim.x, prim.y) }
  }
}
