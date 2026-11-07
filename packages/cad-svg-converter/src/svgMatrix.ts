import { AcGeMatrix2d, AcGePoint2d } from '@mlightcad/data-model'

/**
 * Parses an SVG `transform` attribute into a 2D matrix.
 *
 * Supports `matrix`, `translate`, `scale`, `rotate`, `skewX`, and `skewY`.
 * Returns identity when the attribute is empty or unparseable.
 */
export function acdbSvgParseTransform(transform: string | null): AcGeMatrix2d {
  const result = new AcGeMatrix2d()
  if (!transform || !transform.trim()) return result

  const re = /(\w+)\s*\(([^)]*)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(transform)) != null) {
    const name = match[1]
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number.parseFloat)
      .filter(n => Number.isFinite(n))

    const op = new AcGeMatrix2d()
    switch (name) {
      case 'matrix': {
        if (args.length >= 6) {
          // SVG matrix(a b c d e f) → row-major [[a,c,e],[b,d,f],[0,0,1]]
          op.set(args[0], args[2], args[4], args[1], args[3], args[5], 0, 0, 1)
        }
        break
      }
      case 'translate': {
        const tx = args[0] ?? 0
        const ty = args[1] ?? 0
        op.makeTranslation(tx, ty)
        break
      }
      case 'scale': {
        const sx = args[0] ?? 1
        const sy = args[1] ?? sx
        op.makeScale(sx, sy)
        break
      }
      case 'rotate': {
        const angleDeg = args[0] ?? 0
        const cx = args[1] ?? 0
        const cy = args[2] ?? 0
        const rad = (angleDeg * Math.PI) / 180
        if (cx !== 0 || cy !== 0) {
          op.makeTranslation(cx, cy)
          op.multiply(new AcGeMatrix2d().makeRotation(rad))
          op.multiply(new AcGeMatrix2d().makeTranslation(-cx, -cy))
        } else {
          op.makeRotation(rad)
        }
        break
      }
      case 'skewX': {
        const ax = ((args[0] ?? 0) * Math.PI) / 180
        op.set(1, Math.tan(ax), 0, 0, 1, 0, 0, 0, 1)
        break
      }
      case 'skewY': {
        const ay = ((args[0] ?? 0) * Math.PI) / 180
        op.set(1, 0, 0, Math.tan(ay), 1, 0, 0, 0, 1)
        break
      }
      default:
        break
    }
    // SVG applies transforms left-to-right; compose as result = result * op.
    result.multiply(op)
  }
  return result
}

/**
 * Builds the SVG→CAD Y-up flip matrix for a given viewBox.
 *
 * `x' = x`, `y' = (minY + height) - y`
 */
export function acdbSvgYFlipMatrix(viewBox: {
  minX: number
  minY: number
  height: number
}): AcGeMatrix2d {
  const flip = new AcGeMatrix2d()
  // scale(1, -1) then translate(0, minY + height)
  flip.set(1, 0, 0, 0, -1, viewBox.minY + viewBox.height, 0, 0, 1)
  return flip
}

/** Transforms a point by a 2D matrix. */
export function acdbSvgTransformPoint(
  matrix: AcGeMatrix2d,
  x: number,
  y: number
): { x: number; y: number } {
  const p = new AcGePoint2d(x, y)
  p.applyMatrix2d(matrix)
  return { x: p.x, y: p.y }
}

/**
 * Uniform scale factor extracted from a 2D matrix (average of column lengths).
 * Used for circle radii and text heights.
 */
export function acdbSvgMatrixUniformScale(matrix: AcGeMatrix2d): number {
  const e = matrix.elements
  const sx = Math.hypot(e[0], e[1])
  const sy = Math.hypot(e[3], e[4])
  const scale = (sx + sy) / 2
  return scale > 0 ? scale : 1
}

/**
 * Rotation (radians, CCW) of the matrix X axis.
 */
export function acdbSvgMatrixRotation(matrix: AcGeMatrix2d): number {
  const e = matrix.elements
  return Math.atan2(e[1], e[0])
}

/**
 * True when scale is nearly uniform (circle stays a circle under the CTM).
 */
export function acdbSvgMatrixIsUniformScale(
  matrix: AcGeMatrix2d,
  epsilon = 1e-6
): boolean {
  const e = matrix.elements
  const sx = Math.hypot(e[0], e[1])
  const sy = Math.hypot(e[3], e[4])
  if (sx < epsilon || sy < epsilon) return false
  return Math.abs(sx - sy) / Math.max(sx, sy) < 1e-3
}
