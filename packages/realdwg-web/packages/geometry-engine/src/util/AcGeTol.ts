import {
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGeVector2d,
  AcGeVector3d
} from '../math'
import { FLOAT_TOL } from './AcGeConstants'

/**
 * The class used to store some tolerance values.
 */
export class AcGeTol {
  /**
   * Tolerance value to check whether two points are equal. Two points, p1 and p2, are equal if
   * <pre>
   * (p1 - p2).length() <= equalPointTol
   * </pre
   */
  equalPointTol: number
  /**
   * Tolerance value to compare two vectors.
   *
   * 1. Two vectors, v1 and v2, are equal if
   * <pre>
   * (p1 - p2).length() <= equalPoint
   * </pre>
   *
   * 2. Two vectors, v1 and v2, are parallel if
   * <pre>
   * (v1/v1.length() - v2/v2.length() ).length() < equalVectorTol
   * </pre>
   * Or
   * <pre>
   * (v1/v1.length() + v2/v2.length() ).length() < equalVectorTol
   * </pre>
   *
   * 3. Two vectors, v1 and v2, are perpendicular if
   * <pre>
   * abs((v1.dotProduct(v2))/(v1.length()*v2.length())) <= equalVectorTol
   * </pre>
   */
  equalVectorTol: number

  /**
   * Create tolerance class with default tolerance values
   */
  constructor() {
    this.equalPointTol = FLOAT_TOL
    this.equalVectorTol = FLOAT_TOL
  }

  /**
   * Return true if two points are equal with the specified tolerance.
   * @param p1 Input the first 2d point
   * @param p2 Input the second 2d point
   * @returns Return true if two poitns are equal with the specified tolerance.
   */
  equalPoint2d(p1: AcGePoint2dLike, p2: AcGePoint2dLike) {
    return new AcGeVector2d(p1).sub(p2).length() < this.equalPointTol
  }

  /**
   * Return true if two points are equal with the specified tolerance.
   * @param p1 Input the first 2d point
   * @param p2 Input the second 2d point
   * @returns Return true if two poitns are equal with the specified tolerance.
   */
  equalPoint3d(p1: AcGePoint3dLike, p2: AcGePoint3dLike) {
    return new AcGeVector3d(p1).sub(p2).length() < this.equalPointTol
  }

  /**
   * Return true if the value is equal to zero with the specified tolerance.
   */
  static equalToZero(x: number, tol: number = FLOAT_TOL) {
    return x < tol && x > -tol
  }

  /**
   * Return true if two values are equal with the sepcified tolerance.
   *
   * @param value1 Input the first value
   * @param value2 Input the second value
   * @param tol Input the tolerance value
   * @returns Return true if two values are equal with the sepcified tolerance
   */
  static equal(
    value1: number,
    value2: number,
    tol: number = FLOAT_TOL
  ): boolean {
    return Math.abs(value1 - value2) < tol
  }

  /**
   * Return true if the first argument are greater than the second argument with the sepcified
   * tolerance.
   *
   * @param value1 Input the first value
   * @param value2 Input the second value
   * @param tol Input the tolerance value
   * @returns Return true if the first argument are greater than the second argument with the
   * sepcified tolerance.
   */
  static great(
    value1: number,
    value2: number,
    tol: number = FLOAT_TOL
  ): boolean {
    return value1 - value2 > tol
  }

  /**
   * Return true if the first argument less than the second argument with the specified tolerance
   * value
   *
   * @param value1 Input the first value
   * @param value2 Input the second value
   * @param tol Input the tolerance value
   * @returns Return *true* if the first argument less than the second argument with the specified
   * tolerance value
   */
  static less(value1: number, value2: number, tol: number = FLOAT_TOL) {
    return value1 - value2 < tol
  }
}

export const DEFAULT_TOL = new AcGeTol()
