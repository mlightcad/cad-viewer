/** 2D point in screen / canvas pixels. */
export interface AcApScreenPoint {
  x: number
  y: number
}

/**
 * Shortest distance from a point to a line segment, in pixels.
 */
export function distPointToSegmentPx(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-10) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Minimum distance from a point to a polyline (open or closed).
 */
export function distPointToPolylinePx(
  px: number,
  py: number,
  verts: AcApScreenPoint[],
  closed = false
): number {
  if (verts.length === 0) return Infinity
  if (verts.length === 1) return Math.hypot(px - verts[0].x, py - verts[0].y)
  let best = Infinity
  const last = closed ? verts.length : verts.length - 1
  for (let i = 0; i < last; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % verts.length]
    best = Math.min(best, distPointToSegmentPx(px, py, a.x, a.y, b.x, b.y))
  }
  return best
}

/**
 * Distance from a point to a rectangle outline (not the interior).
 */
export function distPointToRectOutlinePx(
  px: number,
  py: number,
  a: AcApScreenPoint,
  b: AcApScreenPoint
): number {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return distPointToPolylinePx(
    px,
    py,
    [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ],
    true
  )
}

/**
 * Whether a point lies inside an axis-aligned rectangle (inclusive).
 */
export function pointInRectPx(
  px: number,
  py: number,
  a: AcApScreenPoint,
  b: AcApScreenPoint
): boolean {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}

/**
 * Absolute difference between a point's distance to `center` and `radius`.
 * Zero means the point is on the circumference.
 */
export function distPointToCirclePx(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): number {
  return Math.abs(Math.hypot(px - cx, py - cy) - radius)
}

/**
 * Ray-casting point-in-polygon test in screen space.
 */
export function pointInPolygonPx(
  px: number,
  py: number,
  verts: AcApScreenPoint[]
): boolean {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x
    const yi = verts[i].y
    const xj = verts[j].x
    const yj = verts[j].y
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-15) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Screen distance from a point to a circular arc (sampled).
 */
export function distPointToArcPx(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  antiClockwise: boolean
): number {
  const samples = 24
  let best = Infinity
  const span = antiClockwise ? startAngle - endAngle : endAngle - startAngle
  const total = Math.abs(span)
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const a = antiClockwise ? startAngle - t * total : startAngle + t * total
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    best = Math.min(best, Math.hypot(px - x, py - y))
  }
  return best
}
