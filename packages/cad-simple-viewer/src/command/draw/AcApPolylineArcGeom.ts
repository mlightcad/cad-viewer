import {
  acgeBulgeArcTangentAtEnd,
  acgeComplementBulge,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeTol,
  TAU
} from '@mlightcad/data-model'

/**
 * Resolved arc segment for PLINE Angle mode: projected endpoint + bulge.
 */
export type AcApPolylineArcSegment = {
  end: AcGePoint2d
  bulge: number
}

/**
 * Ctrl-toggle bulge for PLINE arc: complementary arc on the opposite side of
 * the chord (negated complement), matching AutoCAD.
 */
export function acapPolylineFlipArcBulgeForCtrl(bulge: number) {
  return -acgeComplementBulge(bulge)
}

/**
 * Incoming tangent at the last vertex (exit direction of the previous segment).
 * With fewer than two points, returns `0` (AutoCAD LASTANGLE initial value).
 */
export function acapPolylineIncomingTangentRadians(
  points: readonly AcGePoint2dLike[],
  bulges: readonly (number | undefined)[]
) {
  if (points.length < 2) return 0

  const start = points[points.length - 1]
  const prev = points[points.length - 2]
  const prevBulge = bulges[points.length - 2]
  if (prevBulge == null || AcGeTol.equalToZero(prevBulge)) {
    return Math.atan2(start.y - prev.y, start.x - prev.x)
  }
  const exitTangent = acgeBulgeArcTangentAtEnd(prev, start, prevBulge)
  return exitTangent ?? Math.atan2(start.y - prev.y, start.x - prev.x)
}

/**
 * Arc with fixed included angle that stays G1 with `tangentRad` at `start`.
 *
 * Chord direction is `tangent ± θ/2`; cursor distance from `start` sets the
 * chord length (and thus the radius). Returns the projected endpoint and bulge.
 */
export function acapPolylineArcFromTangentAndIncludedAngle(
  start: AcGePoint2dLike,
  cursor: AcGePoint2dLike,
  tangentRad: number,
  includedAngleRad: number
): AcApPolylineArcSegment | undefined {
  if (
    !Number.isFinite(includedAngleRad) ||
    AcGeTol.equalToZero(includedAngleRad)
  ) {
    return undefined
  }
  const absSweep = Math.abs(includedAngleRad)
  if (!AcGeTol.great(TAU - absSweep, 0)) return undefined

  const chordLen = Math.hypot(cursor.x - start.x, cursor.y - start.y)
  if (AcGeTol.isNonPositive(chordLen)) return undefined

  const chordAngle = tangentRad + includedAngleRad / 2
  const end = new AcGePoint2d(
    start.x + Math.cos(chordAngle) * chordLen,
    start.y + Math.sin(chordAngle) * chordLen
  )
  const bulge = Math.tan(includedAngleRad / 4)
  if (!Number.isFinite(bulge) || AcGeTol.equalToZero(bulge)) return undefined
  return { end, bulge }
}

/**
 * Next vertex for PLINE Length: distance along the previous exit tangent.
 */
export function acapPolylinePointAlongTangent(
  start: AcGePoint2dLike,
  tangentRad: number,
  length: number
) {
  if (!Number.isFinite(length) || AcGeTol.isNonPositive(length)) {
    return undefined
  }
  return new AcGePoint2d(
    start.x + Math.cos(tangentRad) * length,
    start.y + Math.sin(tangentRad) * length
  )
}
