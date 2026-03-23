import { AcCmErrors } from '@mlightcad/common'

import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePlane,
  AcGePoint3d,
  AcGePointLike,
  AcGeVector3d,
  AcGeVector3dLike
} from '../math'
import { AcGeMathUtil, ORIGIN_POINT_3D, TAU } from '../util'
import { AcGeTol } from '../util/AcGeTol'
import { AcGeCurve3d } from './AcGeCurve3d'

/**
 * Class representing a 3d ellipse arc defined by center, normal, majorAxis, majorAxisRadius,
 * minorAxisRadius, startAngle, and endAngle.
 * - The majorAxis vector represents half the major axis of the ellipse (that is, from the center
 * point to the start point of the ellipse) and is the zero angle for startAngle and endAngle.
 * - Positive angles are counter-clockwise when looking down the normal vector (that is, right-hand
 * rule). A startAngle of 0 and endAngle of 2pi will produce a closed Ellipse.
 * - If startAngle is equal to 0 and endAngle is equal to 2 * Math.PI, it represents a full 3d ellipse.
 */
export class AcGeEllipseArc3d extends AcGeCurve3d {
  // Center of the ellipse in 3d space
  private _center!: AcGePoint3d
  // Normal vector defining the plane of the ellipse
  private _normal!: AcGeVector3d
  // Major axis vector (in WCS coordinates) of the ellipse.
  private _majorAxis!: AcGeVector3d
  // Major axis radius of the ellipse
  private _majorAxisRadius!: number
  // Minor axis radius of the ellipse
  private _minorAxisRadius!: number
  // Start angle of the ellipse arc in radians
  private _startAngle!: number
  // End angle of the ellipse arc in radians
  private _endAngle!: number

  /**
   * Construct an instance of the ellipse arc.
   * @param center Center point of the ellipse.
   * @param normal Normal vector defining the plane of the ellipse
   * @param majorAxis Major axis vector (in WCS coordinates) of the ellipse.
   * @param majorAxisRadius Major axis radius of the ellipse.
   * @param minorAxisRadius Minor axis radius of the ellipse.
   * @param startAngle Start angle of the ellipse arc in radians.
   * @param endAngle End angle of the ellipse arc in radians.
   */
  constructor(
    center: AcGePointLike,
    normal: AcGeVector3dLike,
    majorAxis: AcGeVector3dLike,
    majorAxisRadius: number,
    minorAxisRadius: number,
    startAngle: number = 0,
    endAngle: number = TAU
  ) {
    super()
    this.center = center
    this.normal = normal
    this.majorAxis = majorAxis
    this.majorAxisRadius = majorAxisRadius
    this.minorAxisRadius = minorAxisRadius
    // Check whether it is a full ellipse
    const angleDiff = Math.abs(endAngle - startAngle)
    if (
      Math.abs(angleDiff - TAU) < 1e-10 ||
      Math.abs(angleDiff - 2 * TAU) < 1e-10
    ) {
      this.startAngle = 0
      this.endAngle = TAU
    } else {
      this.startAngle = startAngle
      this.endAngle = endAngle
    }
  }

  /**
   * Center of the ellipse in 3d space
   */
  get center(): AcGePoint3d {
    return this._center
  }
  set center(value: AcGePointLike) {
    this._center = new AcGePoint3d(value.x, value.y, value.z || 0)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Major axis radius of the ellipse
   */
  get majorAxisRadius(): number {
    return this._majorAxisRadius
  }
  set majorAxisRadius(value: number) {
    if (value < 0) throw AcCmErrors.ILLEGAL_PARAMETERS
    this._majorAxisRadius = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Minor axis radius of the ellipse
   */
  get minorAxisRadius(): number {
    return this._minorAxisRadius
  }
  set minorAxisRadius(value: number) {
    if (value < 0) throw AcCmErrors.ILLEGAL_PARAMETERS
    this._minorAxisRadius = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start angle of the ellipse arc in radians in the range -pi to pi.
   */
  get startAngle(): number {
    return this._startAngle
  }
  set startAngle(value: number) {
    this._startAngle = AcGeMathUtil.normalizeAngle(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * End angle of the ellipse arc in radians in the range -pi to pi.
   */
  get endAngle(): number {
    return this._endAngle
  }
  set endAngle(value: number) {
    this._endAngle =
      this.startAngle == 0 && value == TAU
        ? value
        : AcGeMathUtil.normalizeAngle(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Return angle between endAngle and startAngle in range 0 to 2*PI
   */
  get deltaAngle() {
    const diff = this.endAngle - this.startAngle
    // Handle full circle case
    if (Math.abs(diff - TAU) < 1e-10) {
      return TAU
    }
    return AcGeMathUtil.normalizeAngle(diff)
  }

  /**
   * Return true if the arc is a large arc whose delta angle value is greater than PI.
   */
  get isLargeArc() {
    return Math.abs(this.deltaAngle) > Math.PI ? 1 : 0
  }

  /**
   * Return true if the arc is clockwise from startAngle to endAngle
   */
  get clockwise() {
    return this.deltaAngle <= 0
  }

  /**
   * Unit normal vector defining the plane of the ellipse
   */
  get normal(): AcGeVector3d {
    return this._normal
  }
  set normal(value: AcGeVector3dLike) {
    this._normal = new AcGeVector3d(value.x, value.y, value.z)
    // Normalize the normal vector to ensure it's a unit vector
    this._normal.normalize()
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Unit major axis vector (in WCS coordinates) of the ellipse. The major axis vector is the vector from the
   * ellipse's center point to its start point.
   */
  get majorAxis(): AcGeVector3d {
    return this._majorAxis
  }
  set majorAxis(value: AcGeVector3dLike) {
    this._majorAxis = new AcGeVector3d(value.x, value.y, value.z)
    // Normalize the normal vector to ensure it's a unit vector
    this._majorAxis.normalize()
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Unit minor axis vector (in WCS coordinates) of the ellipse.
   */
  get minorAxis(): AcGeVector3d {
    return new AcGeVector3d()
      .crossVectors(this.normal, this.majorAxis)
      .normalize()
  }

  /**
   * Compute the start point of the ellipse arc.
   * @returns Return the start point of the ellipse arc.
   */
  get startPoint(): AcGePoint3d {
    return this.getPointAtAngle(this._startAngle)
  }

  /**
   * Compute the end point of the ellipse arc.
   * @returns Return the end point of the ellipse arc.
   */
  get endPoint(): AcGePoint3d {
    return this.getPointAtAngle(this._endAngle)
  }

  /**
   * Compute the midpoint of the ellipse arc.
   * The midpoint is defined at the middle parameter angle
   * (not arc-length midpoint).
   */
  get midPoint(): AcGePoint3d {
    let startAngle = this.startAngle
    let deltaAngle = this.deltaAngle

    // Closed ellipse: midpoint at PI
    if (this.closed || Math.abs(deltaAngle - TAU) < 1e-10) {
      startAngle = 0
      deltaAngle = TAU
    }

    const midAngle = startAngle + deltaAngle / 2
    return this.getPointAtAngle(midAngle)
  }

  /**
   * @inheritdoc
   */
  /**
   * Check if this ellipse arc is actually a circular arc (major and minor radii are equal)
   * @returns True if the ellipse arc is circular
   */
  get isCircular(): boolean {
    return AcGeTol.equal(this.majorAxisRadius, this.minorAxisRadius)
  }

  get length(): number {
    // For circular arcs, use the exact formula: length = radius * deltaAngle
    if (this.isCircular) {
      return this.majorAxisRadius * Math.abs(this.deltaAngle)
    }

    // For elliptical arcs, use numerical integration
    const steps = 1000
    const step = this.deltaAngle / steps
    let length = 0

    let prevPoint = this.getPointAtAngle(this.startAngle)

    for (let i = 1; i <= steps; i++) {
      const angle = this.startAngle + i * step
      const point = this.getPointAtAngle(angle)

      const dx = point.x - prevPoint.x
      const dy = point.y - prevPoint.y
      const dz = point.z - prevPoint.z

      length += Math.sqrt(dx * dx + dy * dy + dz * dz)
      prevPoint = point
    }

    return length
  }

  /**
   * Compute the area of the ellipse or ellipse arc.
   * - Full ellipse: π * a * b
   * - Ellipse arc: exact analytical area (not numerical integration)
   */
  get area(): number {
    const a = this.majorAxisRadius
    const b = this.minorAxisRadius

    const t1 = this.startAngle
    const t2 = t1 + this.deltaAngle

    // Full ellipse
    if (Math.abs(this.deltaAngle - TAU) < 1e-10) {
      return Math.PI * a * b
    }

    const area =
      ((a * b) / 2) *
      (t2 - t1 - (Math.sin(t2) * Math.cos(t2) - Math.sin(t1) * Math.cos(t1)))

    // Always return positive area
    return Math.abs(area)
  }

  /**
   * Compute the bounding box of the 3D ellipse arc.
   * The bounding box is defined by its minimum and maximum x, y, and z coordinates.
   * @returns Return bounding box containing the min and max coordinates
   */
  calculateBoundingBox() {
    // To make it faster, check whether major axis is euqal to x-axis or y-axis firstly because
    // major axis of ellipse arc is equal to x-axis or y-axis in most of cases.
    if (
      this.majorAxis.equals(AcGeVector3d.X_AXIS) ||
      this.majorAxis.equals(AcGeVector3d.Y_AXIS) ||
      this.majorAxis.isParallelTo(AcGeVector3d.X_AXIS) ||
      this.majorAxis.isParallelTo(AcGeVector3d.Y_AXIS)
    ) {
      const angles = [this.startAngle, this.endAngle]
      for (let i = 0; i < 2 * Math.PI; i += Math.PI / 2) {
        if (AcGeMathUtil.isBetweenAngle(i, this.startAngle, this.endAngle)) {
          angles.push(i)
        }
      }

      let minX = Infinity,
        minY = Infinity,
        minZ = Infinity
      let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity

      for (const angle of angles) {
        const point = this.getPointAtAngle(angle)
        if (point.x < minX) minX = point.x
        if (point.y < minY) minY = point.y
        if (point.z < minZ) minZ = point.z
        if (point.x > maxX) maxX = point.x
        if (point.y > maxY) maxY = point.y
        if (point.z > maxZ) maxZ = point.z
      }

      return new AcGeBox3d(
        { x: minX, y: minY, z: minZ },
        { x: maxX, y: maxY, z: maxZ }
      )
    } else {
      const numPoints = 100
      let minX = Infinity,
        minY = Infinity,
        minZ = Infinity
      let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity

      for (let i = 0; i <= numPoints; i++) {
        const angle = this.startAngle + this.deltaAngle * (i / numPoints)
        const point = this.getPointAtAngle(angle)
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        minZ = Math.min(minZ, point.z)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
        maxZ = Math.max(maxZ, point.z)
      }

      // Return the bounding box defined by min and max coordinates
      return new AcGeBox3d(
        { x: minX, y: minY, z: minZ },
        { x: maxX, y: maxY, z: maxZ }
      )
    }
  }

  /**
   * Return true if its start point is identical to its end point. Otherwise, return false.
   */
  get closed() {
    return this.deltaAngle == 0
  }

  getPoints(numPoints: number = 100): AcGePoint3d[] {
    const points: AcGePoint3d[] = []
    let deltaAngle = this.deltaAngle
    let startAngle = this.startAngle
    if (this.closed) {
      deltaAngle = TAU
      startAngle = 0
    }
    for (let i = 0; i <= numPoints; i++) {
      const angle = startAngle + deltaAngle * (i / numPoints)
      const point = this.getPointAtAngle(angle)
      points.push(point)
    }
    return points
  }

  /**
   * Calculate a point on the ellipse at a given angle.
   * @param angle Input the angle in radians where the point is to be calculated.
   * @returns Return the 3d coordinates of the point on the ellipse.
   */
  getPointAtAngle(angle: number): AcGePoint3d {
    const cosTheta = Math.cos(angle)
    const sinTheta = Math.sin(angle)

    const tmp = this.minorAxis
      .clone()
      .multiplyScalar(this.minorAxisRadius)
      .multiplyScalar(sinTheta)
    const point = this.majorAxis
      .clone()
      .multiplyScalar(cosTheta * this.majorAxisRadius)
      .add(tmp)
    return new AcGePoint3d(
      this.center.x + point.x,
      this.center.y + point.y,
      this.center.z + point.z
    )
  }

  /**
   * Determines whether a given point is inside the ellipse.
   * @param point - The 3D point to check.
   * @returns - True if the point is inside the ellipse, false otherwise.
   */
  contains(point: AcGePoint3d): boolean {
    const toPoint = new AcGeVector3d(point).sub(this.center)

    const majorDist = toPoint.dot(this.majorAxis)
    const minorDist = toPoint.dot(this.minorAxis)

    const normalizedMajorDist = majorDist / this.majorAxisRadius
    const normalizedMinorDist = minorDist / this.minorAxisRadius

    return (
      normalizedMajorDist * normalizedMajorDist +
        normalizedMinorDist * normalizedMinorDist <=
      1
    )
  }

  /**
   * @inheritdoc
   */
  transform(_matrix: AcGeMatrix3d) {
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  copy(value: AcGeEllipseArc3d) {
    this.center = value.center
    this.normal = value.normal
    this.majorAxis = value.majorAxis
    this.majorAxisRadius = value.majorAxisRadius
    this.minorAxisRadius = value.minorAxisRadius
    this.startAngle = value.startAngle
    this.endAngle = value.endAngle
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    return new AcGeEllipseArc3d(
      this.center,
      this.normal,
      this.majorAxis,
      this.majorAxisRadius,
      this.minorAxisRadius,
      this.startAngle,
      this.endAngle
    )
  }

  /**
   * Return the plane in which the ellipse arc lies.
   */
  get plane(): AcGePlane {
    const distance = new AcGeVector3d(this.center).distanceTo(ORIGIN_POINT_3D)
    return new AcGePlane(this.normal, distance)
  }
}
