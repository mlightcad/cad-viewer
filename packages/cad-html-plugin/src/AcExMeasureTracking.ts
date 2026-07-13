/**
 * Orthogonal and polar cursor tracking for offline HTML measurement tools.
 *
 * Lightweight port of {@link AcEdPolarTracking} / {@link AcEdOrthoMode} without
 * an open {@link AcDbDatabase} — uses snapshot unit metadata instead.
 *
 * @packageDocumentation
 */

/** Options for {@link constrainToAcExTracking}. */
export interface AcExTrackingOptions {
  /** When true, locks movement to horizontal/vertical from the reference point. */
  ortho: boolean
  /** When true, snaps direction to {@link polarAng} increments (and ortho dirs if enabled). */
  polar: boolean
  /** Polar angle increment in degrees (AutoCAD **POLARANG**; default 90). */
  polarAng: number
  /** AutoCAD **ANGBASE** in radians. */
  angbase: number
  /** AutoCAD **ANGDIR** — `0` = CCW positive, `1` = CW positive. */
  angdir: number
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2
  let a = angle % twoPi
  if (a < 0) a += twoPi
  return a
}

function constrainToOrtho(
  point: { x: number; y: number },
  reference: { x: number; y: number }
): { x: number; y: number } {
  const dx = point.x - reference.x
  const dy = point.y - reference.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: reference.y }
  }
  return { x: reference.x, y: point.y }
}

function toDisplayAngleRadians(
  radians: number,
  angbase: number,
  angdir: number
): number {
  let angle = radians - angbase
  if (angdir === 1) angle = -angle
  return normalizeAngle(angle)
}

function fromDisplayAngleRadians(
  displayRadians: number,
  angbase: number,
  angdir: number
): number {
  let angle = displayRadians
  if (angdir === 1) angle = -angle
  return normalizeAngle(angle + angbase)
}

function buildTrackingDisplayAnglesRadians(
  options: AcExTrackingOptions
): number[] {
  const degreeSet = new Set<number>()
  if (options.ortho) {
    for (const degrees of [0, 90, 180, 270]) {
      degreeSet.add(degrees)
    }
  }
  if (options.polar) {
    const increment = options.polarAng
    if (increment > 0) {
      const steps = Math.max(1, Math.round(360 / increment))
      for (let i = 0; i < steps; i++) {
        degreeSet.add((((i * increment) % 360) + 360) % 360)
      }
    }
  }
  return [...degreeSet].map(deg => (deg * Math.PI) / 180)
}

function smallestAngleDelta(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a - b))
  return Math.min(diff, Math.PI * 2 - diff)
}

function nearestDisplayAngle(target: number, candidates: number[]): number {
  let best = candidates[0]!
  let bestDelta = smallestAngleDelta(target, best)
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]!
    const delta = smallestAngleDelta(target, candidate)
    if (delta < bestDelta) {
      bestDelta = delta
      best = candidate
    }
  }
  return best
}

/**
 * Constrains a WCS point to orthogonal and/or polar tracking relative to a reference.
 *
 * Matches AutoCAD behavior: OSNAP should be applied before calling this function.
 *
 * @param point - Cursor position after object snap (if any).
 * @param reference - Tracking base (last picked point or angle vertex).
 * @param options - Ortho/polar flags and drawing angle metadata.
 */
export function constrainToAcExTracking(
  point: { x: number; y: number },
  reference: { x: number; y: number },
  options: AcExTrackingOptions
): { x: number; y: number } {
  if (!options.ortho && !options.polar) return point
  if (options.ortho && !options.polar) {
    return constrainToOrtho(point, reference)
  }

  const dx = point.x - reference.x
  const dy = point.y - reference.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-10) return point

  const wcsAngle = Math.atan2(dy, dx)
  const displayAngle = toDisplayAngleRadians(
    wcsAngle,
    options.angbase,
    options.angdir
  )
  const candidates = buildTrackingDisplayAnglesRadians(options)
  if (candidates.length === 0) return point

  const lockedDisplay = nearestDisplayAngle(displayAngle, candidates)
  const lockedWcs = fromDisplayAngleRadians(
    lockedDisplay,
    options.angbase,
    options.angdir
  )

  return {
    x: reference.x + distance * Math.cos(lockedWcs),
    y: reference.y + distance * Math.sin(lockedWcs)
  }
}
