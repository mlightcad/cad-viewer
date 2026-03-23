/**
 * NURBS utility functions for spline calculations
 */

/**
 * Generate uniform knot vector
 */
export function generateUniformKnots(
  degree: number,
  numControlPoints: number
): number[] {
  const knots: number[] = []
  const n = numControlPoints - 1
  const p = degree

  // First p+1 knots are 0
  for (let i = 0; i <= p; i++) {
    knots.push(0)
  }

  // Middle knots are uniform
  for (let i = 1; i <= n - p; i++) {
    knots.push(i)
  }

  // Last p+1 knots are n-p+1
  for (let i = 0; i <= p; i++) {
    knots.push(n - p + 1)
  }

  return knots
}

/**
 * Generate chord-length parameterized knots
 */
export function generateChordKnots(
  degree: number,
  points: number[][]
): number[] {
  const n = points.length - 1
  const p = degree

  // Calculate chord lengths
  const chordLengths: number[] = [0]
  let totalLength = 0

  for (let i = 1; i <= n; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    const dz = points[i][2] - points[i - 1][2]
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    totalLength += length
    chordLengths.push(totalLength)
  }

  // Generate knots based on chord lengths
  const knots: number[] = []

  // First p+1 knots are 0
  for (let i = 0; i <= p; i++) {
    knots.push(0)
  }

  // Middle knots based on chord lengths
  for (let i = 1; i <= n - p; i++) {
    const t = chordLengths[i] / totalLength
    knots.push(t * (n - p + 1))
  }

  // Last p+1 knots are n-p+1
  for (let i = 0; i <= p; i++) {
    knots.push(n - p + 1)
  }

  return knots
}

/**
 * Generate sqrt-chord parameterized knots
 */
export function generateSqrtChordKnots(
  degree: number,
  points: number[][]
): number[] {
  const n = points.length - 1
  const p = degree

  // Calculate sqrt chord lengths
  const sqrtChordLengths: number[] = [0]
  let totalSqrtLength = 0

  for (let i = 1; i <= n; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    const dz = points[i][2] - points[i - 1][2]
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const sqrtLength = Math.sqrt(length)
    totalSqrtLength += sqrtLength
    sqrtChordLengths.push(totalSqrtLength)
  }

  // Generate knots based on sqrt chord lengths
  const knots: number[] = []

  // First p+1 knots are 0
  for (let i = 0; i <= p; i++) {
    knots.push(0)
  }

  // Middle knots based on sqrt chord lengths
  for (let i = 1; i <= n - p; i++) {
    const t = sqrtChordLengths[i] / totalSqrtLength
    knots.push(t * (n - p + 1))
  }

  // Last p+1 knots are n-p+1
  for (let i = 0; i <= p; i++) {
    knots.push(n - p + 1)
  }

  return knots
}

/**
 * Calculate basis function value for NURBS
 */
export function basisFunction(
  i: number,
  k: number,
  u: number,
  knots: number[]
): number {
  if (k === 0) {
    return u >= knots[i] && u < knots[i + 1] ? 1.0 : 0.0
  }

  const d1 = knots[i + k] - knots[i]
  const d2 = knots[i + k + 1] - knots[i + 1]

  const c1 = d1 > 1e-10 ? (u - knots[i]) / d1 : 0.0
  const c2 = d2 > 1e-10 ? (knots[i + k + 1] - u) / d2 : 0.0

  return (
    c1 * basisFunction(i, k - 1, u, knots) +
    c2 * basisFunction(i + 1, k - 1, u, knots)
  )
}

/**
 * Calculate point on NURBS curve
 */
export function evaluateNurbsPoint(
  u: number,
  degree: number,
  knots: number[],
  controlPoints: number[][],
  weights: number[]
): number[] {
  const n = controlPoints.length - 1
  const p = degree

  // Clamp parameter to valid range
  u = Math.max(knots[p], Math.min(knots[n + 1], u))

  // If u is very close to the end, return the last control point
  if (Math.abs(u - knots[n + 1]) < 1e-8) {
    return [...controlPoints[n]]
  }

  // If u is very close to the start, return the first control point
  if (Math.abs(u - knots[p]) < 1e-8) {
    return [...controlPoints[0]]
  }

  const point = [0, 0, 0]
  let weight = 0

  for (let i = 0; i <= n; i++) {
    const basis = basisFunction(i, p, u, knots)
    const w = weights[i] * basis

    point[0] += controlPoints[i][0] * w
    point[1] += controlPoints[i][1] * w
    point[2] += controlPoints[i][2] * w
    weight += w
  }

  // If weight is very small (all basis functions are zero),
  // check if we're at the end and return the last control point
  if (weight < 1e-10) {
    // Check if we're at the end of the domain
    const endParam = knots[knots.length - p - 1]
    if (Math.abs(u - endParam) < 1e-8) {
      return [...controlPoints[n]]
    }
    // Check if we're at the start of the domain
    if (Math.abs(u - knots[p]) < 1e-8) {
      return [...controlPoints[0]]
    }
  }

  if (weight > 1e-10) {
    point[0] /= weight
    point[1] /= weight
    point[2] /= weight
  }

  return point
}

/**
 * Calculate curve length using numerical integration
 */
export function calculateCurveLength(
  degree: number,
  knots: number[],
  controlPoints: number[][],
  weights: number[]
): number {
  const p = degree
  const startParam = knots[p]
  const endParam = knots[knots.length - p - 1]

  let length = 0
  const steps = 1000
  const step = (endParam - startParam) / steps

  let prevPoint = evaluateNurbsPoint(
    startParam,
    degree,
    knots,
    controlPoints,
    weights
  )

  for (let i = 1; i <= steps; i++) {
    const u = startParam + i * step
    const point = evaluateNurbsPoint(u, degree, knots, controlPoints, weights)

    const dx = point[0] - prevPoint[0]
    const dy = point[1] - prevPoint[1]
    const dz = point[2] - prevPoint[2]

    length += Math.sqrt(dx * dx + dy * dy + dz * dz)
    prevPoint = point
  }

  // Add the final segment to the end point
  const finalPoint = evaluateNurbsPoint(
    endParam,
    degree,
    knots,
    controlPoints,
    weights
  )
  const dx = finalPoint[0] - prevPoint[0]
  const dy = finalPoint[1] - prevPoint[1]
  const dz = finalPoint[2] - prevPoint[2]
  length += Math.sqrt(dx * dx + dy * dy + dz * dz)

  return length
}

/**
 * Generate control points from fit points using interpolation
 * This is a simplified implementation - for production use, you might want
 * to implement a more sophisticated interpolation algorithm
 */
export function interpolateControlPoints(fitPoints: number[][]): number[][] {
  // For now, use fit points as control points
  // In a full implementation, you would solve the interpolation system
  // by setting up and solving a linear system of equations
  return fitPoints.map(p => [...p])
}
