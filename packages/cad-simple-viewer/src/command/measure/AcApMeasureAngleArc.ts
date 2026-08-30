/**
 * Angle-dimension arc radius in world space.
 *
 * Shared by canvas drawing and hit-testing so the painted arc and pick
 * target stay aligned across zoom.
 */

/** Fraction of the shorter world-space arm used as the dimension arc radius. */
export const MEASURE_ANGLE_ARC_RADIUS_FRACTION = 0.3

/**
 * World-space radius of the interior angle dimension arc.
 *
 * @param vertex - Angle vertex in world coordinates
 * @param arm1 - First arm endpoint in world coordinates
 * @param arm2 - Second arm endpoint in world coordinates
 * @returns Radius in world units (`0` when either arm is degenerate)
 */
export function measureAngleArcRadiusWcs(
  vertex: { x: number; y: number },
  arm1: { x: number; y: number },
  arm2: { x: number; y: number }
): number {
  const len1 = Math.hypot(arm1.x - vertex.x, arm1.y - vertex.y)
  const len2 = Math.hypot(arm2.x - vertex.x, arm2.y - vertex.y)
  return Math.min(len1, len2) * MEASURE_ANGLE_ARC_RADIUS_FRACTION
}
