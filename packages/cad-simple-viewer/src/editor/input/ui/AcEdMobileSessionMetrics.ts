import { AcGePoint2dLike } from '@mlightcad/data-model'

import { AcApUcsService } from '../../../service/AcApUcsService.js'

/**
 * Live values shown on the mobile command session panel, replacing desktop
 * Dynamic Input boxes next to the cursor.
 *
 * Absolute X/Y and ΔX/ΔY/angle are expressed in the current UCS; length is
 * Euclidean (frame-invariant). Inputs remain WCS pick positions.
 */
export interface AcEdMobileSessionMetrics {
  /** True when a rubber-band / last-point reference exists. */
  hasBasePoint: boolean
  /** Distance from the reference to the cursor (0 without a reference). */
  length: number
  /** Polar angle in degrees, 0–360, from current UCS +X (0 without a reference). */
  angleDeg: number
  /** Cursor UCS X minus reference UCS X (0 without a reference). */
  dx: number
  /** Cursor UCS Y minus reference UCS Y (0 without a reference). */
  dy: number
  /** Cursor X in the current UCS. */
  x: number
  /** Cursor Y in the current UCS. */
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
  const cursorU = AcApUcsService.wcsToUcs({
    x: cursor.x,
    y: cursor.y,
    z: 0
  })
  const x = cursorU.x
  const y = cursorU.y
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
  const baseU = AcApUcsService.wcsToUcs({
    x: basePoint.x,
    y: basePoint.y,
    z: 0
  })
  const dx = x - baseU.x
  const dy = y - baseU.y
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
