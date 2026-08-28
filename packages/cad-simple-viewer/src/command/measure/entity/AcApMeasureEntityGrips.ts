/**
 * Shared measurement grip helpers (selection + angle badge placement).
 */

import type { AcTrView2d } from '../../../view'

/**
 * Select a measurement HTML group (syncs store selection via onSelectedChanged).
 *
 * @param view - Active 2D view.
 * @param id - Measurement / group id to select.
 */
export function selectMeasurementGroup(view: AcTrView2d, id: string): void {
  view.htmlTransientManager.selectGroup(id)
}

/**
 * World-space badge anchor along the angle bisector.
 *
 * @param vertex - Angle vertex.
 * @param arm1 - First arm endpoint.
 * @param arm2 - Second arm endpoint.
 * @returns Badge position in world XY.
 */
export function measureAngleBadgeWorld(
  vertex: { x: number; y: number },
  arm1: { x: number; y: number },
  arm2: { x: number; y: number }
): { x: number; y: number } {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const wLen1 = Math.hypot(dx1, dy1)
  const wLen2 = Math.hypot(dx2, dy2)
  const u1x = wLen1 > 0 ? dx1 / wLen1 : 1
  const u1y = wLen1 > 0 ? dy1 / wLen1 : 0
  const u2x = wLen2 > 0 ? dx2 / wLen2 : 1
  const u2y = wLen2 > 0 ? dy2 / wLen2 : 0
  let bx = u1x + u2x
  let by = u1y + u2y
  const bLen = Math.hypot(bx, by)
  if (bLen > 0) {
    bx /= bLen
    by /= bLen
  } else {
    bx = -u1y
    by = u1x
  }
  const badgeOffset = Math.max(
    Math.min(wLen1, wLen2) * 0.4,
    Math.max(wLen1, wLen2) * 0.15
  )
  return {
    x: vertex.x + bx * badgeOffset,
    y: vertex.y + by * badgeOffset
  }
}
