import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d
} from '../math'
import { AcGeMathUtil } from '../util'
import { AcGeCurve3d } from './AcGeCurve3d'

/**
 * The class represents one 3d line geometry specified by its start point and end point.
 */
export class AcGeLine3d extends AcGeCurve3d {
  private _start: AcGePoint3d
  private _end: AcGePoint3d
  /**
   * This constructor initializes the line object to use start as the start point, and end
   * as the endpoint. Both points must be in WCS coordinates.
   */
  constructor(start: AcGePoint3dLike, end: AcGePoint3dLike) {
    super()
    this._start = new AcGePoint3d(start)
    this._end = new AcGePoint3d(end)
  }

  /**
   * The line's startpoint in WCS coordinates
   */
  get startPoint(): AcGePoint3d {
    return this._start
  }
  set startPoint(value: AcGePoint3dLike) {
    this._start.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * The line's endpoint in WCS coordinates
   */
  get endPoint(): AcGePoint3d {
    return this._end
  }
  set endPoint(value: AcGePoint3dLike) {
    this._end.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Normalized direction vector of this line
   */
  get direction() {
    return new AcGeVector3d()
      .subVectors(this.endPoint, this.startPoint)
      .normalize()
  }

  /**
   * The middle point of this line.
   */
  get midPoint(): AcGePoint3d {
    return new AcGePoint3d(
      (this._start.x + this._end.x) / 2,
      (this._start.y + this._end.y) / 2,
      (this._start.z + this._end.z) / 2
    )
  }

  /**
   * Returns the nerest point on this line to the given point.
   * @param point Input point
   */
  nearestPoint(point: AcGePoint3dLike): AcGePoint3d {
    return this.project(point)
  }

  /**
   * @inheritdoc
   */
  get length() {
    return this.startPoint.distanceTo(this.endPoint)
  }

  /**
   * Check whether the specified point is on this line.
   * @param point Input point to check
   * @returns Return true if the specified point is on this line. Otherwise, return false.
   */
  isPointOnLine(point: AcGePoint3dLike): boolean {
    // Compute the projected point on the line
    const projectedPoint = this.project(point)
    const tolerance = 1e-6
    return projectedPoint.distanceTo(point) < tolerance
  }

  /**
   * Return a point at a certain position along the line. When t = 0, it returns the start point,
   * and when t = 1 it returns the end point.
   * @param t Use values 0-1 to return a position along the line.
   * @param target The result will be copied into this point.
   * @returns Return a point at a certain position along the line.
   */
  at(t: number, target: AcGePoint3d) {
    return this.delta(target).multiplyScalar(t).add(this._start)
  }

  /**
   * Return a point at a certain position along the line.
   * - If `flag` is false, use the length from start point to determinate the point
   * - If `flag` is true, use the length from end point to determinate the point
   * @param length Use this length value to return a position along the line.
   * @returns Return a point at a certain position along the line.
   */
  atLength(length: number, flag: boolean = false) {
    if (flag) {
      const direction = this.delta(_vector).normalize()
      return new AcGePoint3d(this._start).addScaledVector(direction, length)
    } else {
      const direction = this.delta(_vector).normalize()
      return new AcGePoint3d(this._end).addScaledVector(direction, length)
    }
  }

  /**
   * Extend this line with the specified length
   * @param length Input the length of extension
   * @param inversed Input the flag to determinate which point is used to calculate the length
   * - ture: start point is used as the start point of the line extension
   * - false: end point is used as the start point of the line extension
   */
  extend(length: number, inversed: boolean = false) {
    if (inversed) {
      const direction = _vector.subVectors(this._start, this._end).normalize()
      this._start = new AcGePoint3d(this._start).addScaledVector(
        direction,
        length
      )
    } else {
      const direction = this.delta(_vector).normalize()
      this._end = new AcGePoint3d(this._end).addScaledVector(direction, length)
    }
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * Return a point parameter based on the closest point as projected on the line segment. If clampToLine
   * is true, then the returned value will be between 0 and 1.
   * @param point Input the point for which to return a point parameter.
   * @param clampToLine Whether to clamp the result to the range [0, 1].
   * @returns Return a point parameter based on the closest point as projected on the line segment.
   */
  closestPointToPointParameter(point: AcGePoint3d, clampToLine: boolean) {
    _startP.subVectors(point, this._start)
    _startEnd.subVectors(this.endPoint, this.startPoint)

    const startEnd2 = _startEnd.dot(_startEnd)
    const startEnd_startP = _startEnd.dot(_startP)

    let t = startEnd_startP / startEnd2
    if (clampToLine) {
      t = AcGeMathUtil.clamp(t, 0, 1)
    }
    return t
  }

  /**
   * Return the closets point on the line. If clampToLine is true, then the returned value will be
   * clamped to the line segment.
   * @param point Return the closest point on the line to this point.
   * @param clampToLine Whether to clamp the returned value to the line segment.
   * @param target The result will be copied into this point.
   * @returns Return the closets point on the line.
   */
  closestPointToPoint(
    point: AcGePoint3d,
    clampToLine: boolean,
    target: AcGePoint3d
  ) {
    const t = this.closestPointToPointParameter(point, clampToLine)
    return this.delta(target).multiplyScalar(t).add(this._start)
  }

  /**
   * Returns the delta vector of the line segment (end vector minus the start vector).
   * @param target The result will be copied into this vector.
   * @returns Return the delta vector of the line segment (end vector minus the start vector).
   */
  delta(target: AcGeVector3d) {
    return target.subVectors(this._end, this._start)
  }

  /**
   * Return the square of the Euclidean distance (straight-line distance) between the line's start and
   * end point.
   * @returns Return the square of the Euclidean distance (straight-line distance) between the line's
   * start and end point.
   */
  distanceSq() {
    return this._start.distanceToSquared(this._end)
  }

  /**
   * Return the Euclidean distance (straight-line distance) between the line's start and end points.
   * @returns Return the Euclidean distance (straight-line distance) between the line's start and end points.
   */
  distance() {
    return this._start.distanceTo(this._end)
  }

  /**
   * Project a 3d point onto this line
   */
  project(pt: AcGePoint3dLike) {
    const lineDirection = this.direction

    // Create the vector from the start point to the point to project
    const pointDirection = _vector.subVectors(pt, this.startPoint)

    // Project the point onto the line using the dot product
    const projectionLength = pointDirection.dot(lineDirection)

    // Calculate the projected point
    return new AcGePoint3d()
      .copy(lineDirection)
      .multiplyScalar(projectionLength)
      .add(this.startPoint)
  }

  /**
   * Finds the point on the line that is perpendicular to the given point. When you need the shortest distance
   * between the given point and the line, perpPoint gives the point on the line that is the closest to the
   * given point.
   * @param point Input one point to calculate the point on the line that is the closest to this point
   * @returns Return the point on the line that is the closest to the given point.
   */
  perpPoint(point: AcGePoint3dLike) {
    const lineDirection = this.direction
    const lineStart = this.startPoint

    // Create a vector from the line start to the given point
    const pointToLineStart = _vector.subVectors(point, lineStart)

    // Project the point-to-line-start vector onto the line direction
    const projectionLength = pointToLineStart.dot(lineDirection)

    // Calculate the projected point on the line
    const projectedVector = _vector
      .copy(lineDirection)
      .multiplyScalar(projectionLength)

    // The perpendicular point on the line
    return new AcGePoint3d().addVectors(lineStart, projectedVector)
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): AcGeBox3d {
    const min = new AcGePoint3d(
      Math.min(this._start.x, this._end.x),
      Math.min(this._start.y, this._end.y),
      Math.min(this._start.z, this._end.z)
    )
    const max = new AcGePoint3d(
      Math.max(this._start.x, this._end.x),
      Math.max(this._start.y, this._end.y),
      Math.max(this._start.z, this._end.z)
    )
    return new AcGeBox3d(min, max)
  }

  /**
   * @inheritdoc
   */
  transform(matrix: AcGeMatrix3d) {
    this._start.applyMatrix4(matrix)
    this._end.applyMatrix4(matrix)
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  get closed(): boolean {
    return false
  }

  /**
   * @inheritdoc
   */
  copy(value: AcGeLine3d) {
    this.startPoint = value.startPoint
    this.endPoint = value.endPoint
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    return new AcGeLine3d(this._start.clone(), this._end.clone())
  }
}

const _vector = /*@__PURE__*/ new AcGeVector3d()
const _startP = /*@__PURE__*/ new AcGeVector3d()
const _startEnd = /*@__PURE__*/ new AcGeVector3d()
