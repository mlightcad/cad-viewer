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
  return new AcGeCircArc2d(
    { x: prim.cx, y: prim.cy },
    prim.r,
    prim.startAngle,
    prim.endAngle,
    prim.normalSign === -1
  )
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
    false,
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
