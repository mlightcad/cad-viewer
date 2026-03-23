import { AcGePoint2dLike, AcGePoint3dLike } from '../math'

/**
 * Floating point comparison tolerance.
 * Default value is 0.000001 (1e-6)
 */
export const FLOAT_TOL: number = 0.000001

/**
 * 2 * Math.PI
 */
export const TAU = 2 * Math.PI

/**
 * 2d origin point
 */
export const ORIGIN_POINT_2D: AcGePoint2dLike = {
  x: 0,
  y: 0
}

/**
 * 3d origin point
 */
export const ORIGIN_POINT_3D: AcGePoint3dLike = {
  x: 0,
  y: 0,
  z: 0
}
