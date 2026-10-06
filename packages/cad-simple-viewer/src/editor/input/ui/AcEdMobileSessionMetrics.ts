import { AcGePoint2dLike } from '@mlightcad/data-model'

/**
 * Live values shown on the mobile command session panel, replacing desktop
 * Dynamic Input boxes next to the cursor.
 */
export interface AcEdMobileSessionMetrics {
  /** True when a rubber-band / last-point reference exists. */
  hasBasePoint: boolean
  /** Distance from the reference to the cursor (0 without a reference). */
  length: number
  /** Polar angle in degrees, 0–360, from +X (0 without a reference). */
  angleDeg: number
  /** Cursor X minus reference X (0 without a reference). */
  dx: number
  /** Cursor Y minus reference Y (0 without a reference). */
  dy: number
  /** Cursor X in WCS. */
  x: number
  /** Cursor Y in WCS. */
  y: number
}

/**
 * Computes length / angle / ΔX / ΔY for the mobile session panel.
 *
 * @param cursor - Current pick position in WCS (after OSNAP / ortho).
 * @param basePoint - Rubber-band origin or last point; omit for absolute X/Y.
 */
export function acedComputeSessionMetrics(
  cursor: AcGePoint2dLike,
  basePoint?: AcGePoint2dLike | null
): AcEdMobileSessionMetrics {
  const x = cursor.x
  const y = cursor.y
  if (basePoint == null) {
    return {
      hasBasePoint: false,
      length: 0,
      angleDeg: 0,
      dx: 0,
      dy: 0,
      x,
      y
    }
  }
  const dx = x - basePoint.x
  const dy = y - basePoint.y
  const length = Math.hypot(dx, dy)
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angleDeg < 0) angleDeg += 360
  return {
    hasBasePoint: true,
    length,
    angleDeg,
    dx,
    dy,
    x,
    y
  }
}
