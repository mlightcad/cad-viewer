import type { Point2dInput } from '../tools/types.js'
import type {
  RedrawCalibrationSpec,
  RedrawPointInput,
  RedrawViewSpec
} from './types.js'

/** Maps one pixel point (top-left origin, y down) to CAD WCS. */
export type RedrawPointTransform = (point: Point2dInput) => Point2dInput

/** Resolved pixel → CAD transform plus diagnostics. */
export interface RedrawResolvedCalibration {
  id: string
  /** Kind of model actually fitted. */
  model: 'scale' | 'similarity' | 'affine' | 'homography'
  transform: RedrawPointTransform
  /** Approximate CAD units per pixel (geometric mean for non-uniform fits). */
  unitsPerPixel: number
  /** Max distance between mapped source points and declared CAD points. */
  residual?: number
}

/**
 * Normalizes `[x, y]` or `{ x, y }` to a point.
 *
 * @returns The point, or `undefined` when the input is not two finite numbers.
 */
export function acexRedrawPoint(value: unknown): Point2dInput | undefined {
  if (Array.isArray(value)) {
    const [x, y] = value
    if (typeof x === 'number' && typeof y === 'number') {
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    const { x, y } = value as { x?: unknown; y?: unknown }
    if (
      typeof x === 'number' &&
      typeof y === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y)
    ) {
      return { x, y }
    }
  }
  return undefined
}

/**
 * Solves `A x = b` in the least-squares sense via the normal equations.
 *
 * Systems here are tiny (≤ 8 unknowns), so Gaussian elimination with partial
 * pivoting on `AᵀA` is accurate enough and avoids a matrix dependency.
 */
function solveLeastSquares(rows: number[][], rhs: number[]): number[] {
  const n = rows[0].length
  const ata = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const atb = new Array<number>(n).fill(0)
  rows.forEach((row, r) => {
    for (let i = 0; i < n; i++) {
      atb[i] += row[i] * rhs[r]
      for (let j = 0; j < n; j++) ata[i][j] += row[i] * row[j]
    }
  })
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(ata[r][col]) > Math.abs(ata[pivot][col])) pivot = r
    }
    if (Math.abs(ata[pivot][col]) < 1e-12) {
      throw new Error(
        'calibration points are degenerate (collinear or repeated)'
      )
    }
    ;[ata[col], ata[pivot]] = [ata[pivot], ata[col]]
    ;[atb[col], atb[pivot]] = [atb[pivot], atb[col]]
    for (let r = col + 1; r < n; r++) {
      const factor = ata[r][col] / ata[col][col]
      for (let c = col; c < n; c++) ata[r][c] -= factor * ata[col][c]
      atb[r] -= factor * atb[col]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let sum = atb[r]
    for (let c = r + 1; c < n; c++) sum -= ata[r][c] * x[c]
    x[r] = sum / ata[r][r]
  }
  return x
}

/**
 * Fits `cad = s·R·flip(src) + t`, where `flip` turns image y-down into CAD
 * y-up. Four unknowns (a, b, tx, ty) with `x' = a·u − b·v + tx`,
 * `y' = b·u + a·v + ty` and `(u, v) = (x, −y)`.
 */
function fitSimilarity(
  src: Point2dInput[],
  dst: Point2dInput[]
): RedrawPointTransform {
  const rows: number[][] = []
  const rhs: number[] = []
  src.forEach((p, i) => {
    const u = p.x
    const v = -p.y
    rows.push([u, -v, 1, 0])
    rhs.push(dst[i].x)
    rows.push([v, u, 0, 1])
    rhs.push(dst[i].y)
  })
  const [a, b, tx, ty] = solveLeastSquares(rows, rhs)
  return p => {
    const u = p.x
    const v = -p.y
    return { x: a * u - b * v + tx, y: b * u + a * v + ty }
  }
}

/** Fits a full 2D affine transform (six unknowns). */
function fitAffine(
  src: Point2dInput[],
  dst: Point2dInput[]
): RedrawPointTransform {
  const rows: number[][] = []
  const rhs: number[] = []
  src.forEach((p, i) => {
    rows.push([p.x, p.y, 1, 0, 0, 0])
    rhs.push(dst[i].x)
    rows.push([0, 0, 0, p.x, p.y, 1])
    rhs.push(dst[i].y)
  })
  const [a, b, c, d, e, f] = solveLeastSquares(rows, rhs)
  return p => ({ x: a * p.x + b * p.y + c, y: d * p.x + e * p.y + f })
}

/** Fits a projective homography (h33 = 1) for photographed sheets. */
function fitHomography(
  src: Point2dInput[],
  dst: Point2dInput[]
): RedrawPointTransform {
  const rows: number[][] = []
  const rhs: number[] = []
  src.forEach((p, i) => {
    const { x: X, y: Y } = dst[i]
    rows.push([p.x, p.y, 1, 0, 0, 0, -p.x * X, -p.y * X])
    rhs.push(X)
    rows.push([0, 0, 0, p.x, p.y, 1, -p.x * Y, -p.y * Y])
    rhs.push(Y)
  })
  const [a, b, c, d, e, f, g, h] = solveLeastSquares(rows, rhs)
  return p => {
    const w = g * p.x + h * p.y + 1
    if (Math.abs(w) < 1e-12) {
      throw new Error('homography maps this point to infinity')
    }
    return {
      x: (a * p.x + b * p.y + c) / w,
      y: (d * p.x + e * p.y + f) / w
    }
  }
}

function distance(a: Point2dInput, b: Point2dInput): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Estimates CAD units per pixel at `at` from how the transform scales a unit
 * square (geometric mean of the x/y stretch).
 */
export function acexRedrawUnitsPerPixel(
  transform: RedrawPointTransform,
  at: Point2dInput
): number {
  const o = transform(at)
  const dx = distance(o, transform({ x: at.x + 1, y: at.y }))
  const dy = distance(o, transform({ x: at.x, y: at.y + 1 }))
  return Math.sqrt(dx * dy)
}

/**
 * Rotation in degrees the transform applies at `at` to the image +X axis.
 * Zero for an axis-aligned calibration (image y-down is already flipped).
 */
export function acexRedrawRotationDeg(
  transform: RedrawPointTransform,
  at: Point2dInput
): number {
  const o = transform(at)
  const p = transform({ x: at.x + 1, y: at.y })
  return (Math.atan2(p.y - o.y, p.x - o.x) * 180) / Math.PI
}

function toPoints(values: RedrawPointInput[] | undefined): Point2dInput[] {
  if (!Array.isArray(values)) return []
  const points: Point2dInput[] = []
  for (const value of values) {
    const point = acexRedrawPoint(value)
    if (!point) throw new Error('calibration points must be [x, y] numbers')
    points.push(point)
  }
  return points
}

/**
 * Builds the pixel → CAD transform for one calibration.
 *
 * With CAD point pairs the model follows the method (`homography` needs 4,
 * `affine` 3, everything else fits a similarity from 2+). Without CAD points
 * the calibration is scale-only: `scale` CAD units per pixel, or for a
 * `dimension-anchor` `value / pixelDistance(sourcePoints[0], sourcePoints[1])`,
 * anchored at the view's ROI bottom-left → `cadOrigin`.
 *
 * @param calibration - Calibration evidence from the spec.
 * @param view - View whose ROI / origin anchor a scale-only calibration.
 * @throws Error when the evidence cannot define a transform.
 */
export function acexRedrawResolveCalibration(
  calibration: RedrawCalibrationSpec,
  view?: RedrawViewSpec
): RedrawResolvedCalibration {
  const src = toPoints(calibration.sourcePoints)
  const dst = toPoints(calibration.cadPoints)
  if (dst.length > 0 && dst.length !== src.length) {
    throw new Error('sourcePoints and cadPoints must have the same length')
  }
  const probe = src[0] ?? { x: 0, y: 0 }

  if (dst.length >= 2) {
    let model: RedrawResolvedCalibration['model'] = 'similarity'
    let transform: RedrawPointTransform
    if (calibration.method === 'homography') {
      if (dst.length < 4) throw new Error('homography needs 4+ point pairs')
      model = 'homography'
      transform = fitHomography(src, dst)
    } else if (calibration.method === 'affine') {
      if (dst.length < 3) throw new Error('affine needs 3+ point pairs')
      model = 'affine'
      transform = fitAffine(src, dst)
    } else {
      transform = fitSimilarity(src, dst)
    }
    const residual = Math.max(
      ...src.map((p, i) => distance(transform(p), dst[i]))
    )
    return {
      id: calibration.id,
      model,
      transform,
      unitsPerPixel: acexRedrawUnitsPerPixel(transform, probe),
      residual
    }
  }

  let scale = calibration.scale
  if (
    calibration.method === 'dimension-anchor' &&
    typeof calibration.value === 'number' &&
    src.length >= 2
  ) {
    const pixels = distance(src[0], src[1])
    if (pixels <= 0) throw new Error('dimension anchor points coincide')
    scale = calibration.value / pixels
  }
  if (scale == null && calibration.method === 'visual-only') scale = 1
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    throw new Error(
      'calibration needs cadPoints, a positive scale, or a dimension-anchor value with two sourcePoints'
    )
  }
  const roi = view?.sourceRoi
  const left = roi ? roi[0] : 0
  const bottom = roi ? roi[3] : 0
  const origin = acexRedrawPoint(view?.cadOrigin) ?? { x: 0, y: 0 }
  const s = scale
  return {
    id: calibration.id,
    model: 'scale',
    transform: p => ({
      x: origin.x + (p.x - left) * s,
      y: origin.y + (bottom - p.y) * s
    }),
    unitsPerPixel: s
  }
}
