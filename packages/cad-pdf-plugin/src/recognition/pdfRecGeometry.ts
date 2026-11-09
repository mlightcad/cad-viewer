/**
 * Small, dependency-free 2D geometry helpers shared by the PDF recognition
 * passes. Everything works on plain `{ x, y }` points in model-space
 * millimeters so the algorithms can be unit-tested without the data model.
 */

/** 2D point or vector. */
export interface PdfRecPoint {
  x: number
  y: number
}

/** Circle described by center and radius. */
export interface PdfRecCircle {
  center: PdfRecPoint
  radius: number
}

export const TWO_PI = Math.PI * 2

export function dist(a: PdfRecPoint, b: PdfRecPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function sub(a: PdfRecPoint, b: PdfRecPoint): PdfRecPoint {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function cross(a: PdfRecPoint, b: PdfRecPoint): number {
  return a.x * b.y - a.y * b.x
}

export function dot(a: PdfRecPoint, b: PdfRecPoint): number {
  return a.x * b.x + a.y * b.y
}

/** Normalizes an angle into `[0, 2π)`. */
export function normalizeAngle(angle: number): number {
  let a = angle % TWO_PI
  if (a < 0) a += TWO_PI
  // Tiny negative inputs land just below 2π; snap them back to 0.
  return a >= TWO_PI - 1e-12 ? 0 : a
}

/** Evaluates a cubic Bezier at `t`. */
export function cubicAt(
  p0: PdfRecPoint,
  p1: PdfRecPoint,
  p2: PdfRecPoint,
  p3: PdfRecPoint,
  t: number
): PdfRecPoint {
  const mt = 1 - t
  const a = mt * mt * mt
  const b = 3 * mt * mt * t
  const c = 3 * mt * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
  }
}

/** Distance from `p` to the infinite line through `a` and `b`. */
export function distanceToLine(
  p: PdfRecPoint,
  a: PdfRecPoint,
  b: PdfRecPoint
): number {
  const len = dist(a, b)
  if (len === 0) return dist(p, a)
  return Math.abs(cross(sub(b, a), sub(p, a))) / len
}

/**
 * Circle through three points, or `undefined` when they are (nearly)
 * collinear.
 */
export function circleFrom3Points(
  a: PdfRecPoint,
  b: PdfRecPoint,
  c: PdfRecPoint
): PdfRecCircle | undefined {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  const scale = Math.max(dist(a, b), dist(b, c), dist(a, c))
  if (scale === 0 || Math.abs(d) < 1e-12 * scale * scale) return undefined
  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const center = {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  }
  return { center, radius: dist(center, a) }
}

/**
 * Algebraic (Kåsa) least-squares circle fit.
 *
 * Accurate when the points cover a reasonable arc, which is the case for the
 * flattened arcs this is used on.
 */
export function fitCircleLeastSquares(
  points: readonly PdfRecPoint[]
): PdfRecCircle | undefined {
  const n = points.length
  if (n < 3) return undefined
  // Center the data to keep the normal equations well conditioned.
  let mx = 0
  let my = 0
  for (const p of points) {
    mx += p.x
    my += p.y
  }
  mx /= n
  my /= n
  let suu = 0
  let suv = 0
  let svv = 0
  let suuu = 0
  let svvv = 0
  let suvv = 0
  let svuu = 0
  for (const p of points) {
    const u = p.x - mx
    const v = p.y - my
    suu += u * u
    suv += u * v
    svv += v * v
    suuu += u * u * u
    svvv += v * v * v
    suvv += u * v * v
    svuu += v * u * u
  }
  const det = suu * svv - suv * suv
  if (Math.abs(det) < 1e-18) return undefined
  const rhsU = 0.5 * (suuu + suvv)
  const rhsV = 0.5 * (svvv + svuu)
  const uc = (rhsU * svv - rhsV * suv) / det
  const vc = (suu * rhsV - suv * rhsU) / det
  const center = { x: uc + mx, y: vc + my }
  const radius = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n)
  if (!Number.isFinite(radius)) return undefined
  return { center, radius }
}

/** Largest radial deviation of `points` from `circle`. */
export function maxCircleDeviation(
  points: readonly PdfRecPoint[],
  circle: PdfRecCircle
): number {
  let max = 0
  for (const p of points) {
    max = Math.max(max, Math.abs(dist(p, circle.center) - circle.radius))
  }
  return max
}

/**
 * Signed sweep (radians) going from `start` through `mid` to `end` on a
 * circle around `center`. Positive is counterclockwise.
 */
export function signedSweep(
  center: PdfRecPoint,
  start: PdfRecPoint,
  mid: PdfRecPoint,
  end: PdfRecPoint
): number {
  const a0 = Math.atan2(start.y - center.y, start.x - center.x)
  const am = Math.atan2(mid.y - center.y, mid.x - center.x)
  const a1 = Math.atan2(end.y - center.y, end.x - center.x)
  const ccwToEnd = normalizeAngle(a1 - a0)
  const ccwToMid = normalizeAngle(am - a0)
  // `mid` lies on the CCW path to `end` exactly when it is reached first.
  if (ccwToMid <= ccwToEnd) {
    return ccwToEnd === 0 ? TWO_PI : ccwToEnd
  }
  return ccwToEnd === 0 ? -TWO_PI : ccwToEnd - TWO_PI
}

/** Solves a small dense linear system with partial pivoting. */
export function solveLinearSystem(
  matrix: number[][],
  rhs: number[]
): number[] | undefined {
  const n = rhs.length
  const a = matrix.map((row, i) => [...row, rhs[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    }
    if (Math.abs(a[pivot][col]) < 1e-14) return undefined
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    for (let row = col + 1; row < n; row++) {
      const f = a[row][col] / a[col][col]
      for (let k = col; k <= n; k++) a[row][k] -= f * a[col][k]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let sum = a[row][n]
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k]
    x[row] = sum / a[row][row]
  }
  return x
}

/** Ellipse in center / axis form. */
export interface PdfRecEllipse {
  center: PdfRecPoint
  /** Unit direction of the major axis. */
  majorDirection: PdfRecPoint
  majorRadius: number
  minorRadius: number
}

/**
 * Least-squares ellipse fit of a general conic.
 *
 * Points are centered first so the conic does not pass through the origin,
 * which lets the constant term be fixed at -1.
 */
export function fitEllipse(
  points: readonly PdfRecPoint[]
): PdfRecEllipse | undefined {
  const n = points.length
  if (n < 6) return undefined
  let mx = 0
  let my = 0
  for (const p of points) {
    mx += p.x
    my += p.y
  }
  mx /= n
  my /= n
  let scale = 0
  for (const p of points)
    scale = Math.max(scale, Math.abs(p.x - mx), Math.abs(p.y - my))
  if (scale === 0) return undefined

  // A u² + B uv + C v² + D u + E v = 1 in normalized coordinates.
  const ata = Array.from({ length: 5 }, () => new Array<number>(5).fill(0))
  const atb = new Array<number>(5).fill(0)
  for (const p of points) {
    const u = (p.x - mx) / scale
    const v = (p.y - my) / scale
    const row = [u * u, u * v, v * v, u, v]
    for (let i = 0; i < 5; i++) {
      atb[i] += row[i]
      for (let j = 0; j < 5; j++) ata[i][j] += row[i] * row[j]
    }
  }
  const sol = solveLinearSystem(ata, atb)
  if (!sol) return undefined
  const [A, B, C, D, E] = sol
  const disc = B * B - 4 * A * C
  if (!(disc < 0)) return undefined

  // Center: gradient of the quadratic form vanishes.
  const det = 4 * A * C - B * B
  const uc = (B * E - 2 * C * D) / det
  const vc = (B * D - 2 * A * E) / det
  // Value of the conic (with F = -1) at its center.
  const fc = A * uc * uc + B * uc * vc + C * vc * vc + D * uc + E * vc - 1
  if (!(fc < 0)) return undefined

  // Eigen-decomposition of [[A, B/2], [B/2, C]].
  const tr = A + C
  const diff = Math.sqrt((A - C) * (A - C) + B * B)
  const l1 = (tr + diff) / 2
  const l2 = (tr - diff) / 2
  if (!(l1 > 0 && l2 > 0)) return undefined
  // Smaller eigenvalue belongs to the major axis.
  const majorRadius = Math.sqrt(-fc / l2) * scale
  const minorRadius = Math.sqrt(-fc / l1) * scale
  // Both rows of (M - l2·I) give an eigenvector; near-axis-aligned ellipses
  // make one of them two noisy near-zero numbers, so use the longer one.
  const rowA: PdfRecPoint = { x: B / 2, y: l2 - A }
  const rowC: PdfRecPoint = { x: l2 - C, y: B / 2 }
  let dir =
    Math.hypot(rowA.x, rowA.y) >= Math.hypot(rowC.x, rowC.y) ? rowA : rowC
  if (Math.hypot(dir.x, dir.y) < 1e-15) {
    // Circle-like: any direction is an eigenvector.
    dir = { x: 1, y: 0 }
  }
  const len = Math.hypot(dir.x, dir.y)
  return {
    center: { x: uc * scale + mx, y: vc * scale + my },
    majorDirection: { x: dir.x / len, y: dir.y / len },
    majorRadius,
    minorRadius
  }
}

/** Ellipse parameter (eccentric anomaly) of a point near the ellipse. */
export function ellipseParam(e: PdfRecEllipse, p: PdfRecPoint): number {
  const d = sub(p, e.center)
  const u = dot(d, e.majorDirection)
  const v = cross(e.majorDirection, d)
  return normalizeAngle(Math.atan2(v / e.minorRadius, u / e.majorRadius))
}

/** Approximate geometric distance from `p` to the ellipse. */
export function ellipseDeviation(e: PdfRecEllipse, p: PdfRecPoint): number {
  const d = sub(p, e.center)
  const u = dot(d, e.majorDirection) / e.majorRadius
  const v = cross(e.majorDirection, d) / e.minorRadius
  const r = Math.hypot(u, v)
  if (r === 0) return e.minorRadius
  // Scale the normalized radial error back by the local radius.
  const t = Math.atan2(v, u)
  const local = Math.hypot(
    e.majorRadius * Math.cos(t),
    e.minorRadius * Math.sin(t)
  )
  return Math.abs(r - 1) * local
}
