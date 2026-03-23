import { AcCmErrors } from '@mlightcad/common'

import {
  AcGeBox2d,
  AcGeMatrix2d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeVector2d
} from '../math'
import { AcGeMathUtil, TAU } from '../util'
import { AcGeCurve2d } from './AcGeCurve2d'

/**
 * Represent a circular arc.
 *
 * The angle system behavior depends on the clockwise property:
 * - If clockwise = false (counterclockwise): Angles are stored in normal mathematical sense
 *   (0° = +X axis, 90° = +Y axis, 180° = -X axis, 270° = -Y axis)
 * - If clockwise = true: Angles are stored in a mirrored system where positive angles go clockwise
 *   (0° = +X axis, 270° = +Y axis, 180° = -X axis, 90° = -Y axis)
 *
 * This means a "90° above X axis" in counterclockwise mode becomes "270°" in clockwise mode.
 */
export class AcGeCircArc2d extends AcGeCurve2d {
  private _center!: AcGePoint2d
  private _radius!: number
  private _startAngle!: number
  private _endAngle!: number
  private _clockwise!: boolean

  constructor(p1: AcGePoint2dLike, p2: AcGePoint2dLike, p3: AcGePoint2dLike)
  constructor(start: AcGePoint2dLike, end: AcGePoint2dLike, bulge: number)
  constructor(
    center: AcGePoint2dLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean
  )
  constructor(a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) {
    super()
    const argsLength =
      +(a !== undefined) +
      +(b !== undefined) +
      +(c !== undefined) +
      +(d !== undefined) +
      +(e !== undefined)
    if (argsLength == 3) {
      if (
        typeof a == 'object' &&
        typeof b == 'object' &&
        typeof c == 'object'
      ) {
        this.createByThreePoints(
          a as AcGePoint2dLike,
          b as AcGePoint2dLike,
          c as AcGePoint2dLike
        )
      } else {
        this.createByStartEndPointsAndBulge(
          a as AcGePoint2dLike,
          b as AcGePoint2dLike,
          c as number
        )
      }
    } else if (argsLength == 5) {
      const center = a as AcGePoint2dLike
      this.center = new AcGePoint2d(center.x, center.y)
      this.radius = b as number
      this._clockwise = e as boolean
      // Store internal angles (unmirrored)
      this._startAngle = this._clockwise
        ? this._mirrorAngle(AcGeMathUtil.normalizeAngle(c as number))
        : AcGeMathUtil.normalizeAngle(c as number)
      this._endAngle = this._clockwise
        ? this._mirrorAngle(AcGeMathUtil.normalizeAngle(d as number))
        : AcGeMathUtil.normalizeAngle(d as number)
    } else {
      throw AcCmErrors.ILLEGAL_PARAMETERS
    }
  }

  /**
   * Create arc by three points
   * @param p1 Input the start point
   * @param p2 Input one point between the start point and the end point
   * @param p3 Input the end point
   */
  private createByThreePoints(
    p1: AcGePoint2dLike,
    p2: AcGePoint2dLike,
    p3: AcGePoint2dLike
  ) {
    const midpoint = (
      p1: AcGePoint2dLike,
      p2: AcGePoint2dLike
    ): AcGePoint2dLike => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    })

    const slope = (p1: AcGePoint2dLike, p2: AcGePoint2dLike): number =>
      (p2.y - p1.y) / (p2.x - p1.x)

    const perpSlope = (m: number): number => -1 / m

    const midpoint1 = midpoint(p1, p2)
    const midpoint2 = midpoint(p2, p3)

    const slope1 = slope(p1, p2)
    const slope2 = slope(p2, p3)

    const perpSlope1 = perpSlope(slope1)
    const perpSlope2 = perpSlope(slope2)

    const intersect = (
      m1: number,
      b1: number,
      m2: number,
      b2: number
    ): AcGePoint2dLike => {
      const x = (b2 - b1) / (m1 - m2)
      const y = m1 * x + b1
      return { x, y }
    }

    const b1 = midpoint1.y - perpSlope1 * midpoint1.x
    const b2 = midpoint2.y - perpSlope2 * midpoint2.x

    const center = intersect(perpSlope1, b1, perpSlope2, b2)

    const radius = Math.sqrt(
      Math.pow(p1.x - center.x, 2) + Math.pow(p1.y - center.y, 2)
    )

    const angle = (p: AcGePoint2dLike, center: AcGePoint2dLike): number =>
      Math.atan2(p.y - center.y, p.x - center.x)

    const startAngle = angle(p1, center)
    const midAngle = angle(p2, center)
    const endAngle = angle(p3, center)

    const isCounterclockwise =
      (endAngle > startAngle && endAngle < midAngle) ||
      (startAngle > endAngle && startAngle < midAngle) ||
      (midAngle > endAngle && midAngle < startAngle)

    this.center = center
    this.radius = radius
    this._clockwise = !isCounterclockwise
    // Store internal angles (unmirrored)
    this._startAngle = startAngle
    this._endAngle = endAngle
  }

  /**
   * Create circular arc by two points and one bugle factor
   * @param from Input start point
   * @param to Input end point
   * @param bulge Input the bulge factor used to indicate how much of an arc segment is present at this
   * vertex. The bulge factor is the tangent of one fourth the included angle for an arc segment, made
   * negative if the arc goes clockwise from the start point to the endpoint. A bulge of 0 indicates a
   * straight segment, and a bulge of 1 is a semicircle. Get more details from the following links.
   * - https://ezdxf.readthedocs.io/en/stable/dxfentities/lwpolyline.html
   * - https://www.afralisp.net/archive/lisp/Bulges1.htm
   */
  private createByStartEndPointsAndBulge(
    from: AcGePoint2dLike,
    to: AcGePoint2dLike,
    bulge: number
  ) {
    let theta: number
    let a: AcGeVector2d
    let b: AcGeVector2d

    if (bulge < 0) {
      theta = Math.atan(-bulge) * 4
      a = new AcGeVector2d(from)
      b = new AcGeVector2d(to)
    } else {
      // Default is counter-clockwise
      theta = Math.atan(bulge) * 4
      a = new AcGeVector2d(to)
      b = new AcGeVector2d(from)
    }

    const ab = new AcGeVector2d().subVectors(b, a)
    const lengthAB = ab.length()
    const c = new AcGeVector2d().addVectors(a, ab.multiplyScalar(0.5))

    // Distance from center of arc to line between form and to points
    const lengthCD = Math.abs(lengthAB / 2 / Math.tan(theta / 2))
    const normAB = ab.normalize()

    let d: AcGeVector2d
    if (theta < Math.PI) {
      const normDC = new AcGeVector2d(
        normAB.x * Math.cos(Math.PI / 2) - normAB.y * Math.sin(Math.PI / 2),
        normAB.y * Math.cos(Math.PI / 2) + normAB.x * Math.sin(Math.PI / 2)
      )
      // d is the center of the arc
      d = c.add(normDC.multiplyScalar(-lengthCD))
    } else {
      const normCD = new AcGeVector2d(
        normAB.x * Math.cos(Math.PI / 2) - normAB.y * Math.sin(Math.PI / 2),
        normAB.y * Math.cos(Math.PI / 2) + normAB.x * Math.sin(Math.PI / 2)
      )
      // d is the center of the arc
      d = c.add(normCD.multiplyScalar(lengthCD))
    }

    // Add points between start start and eng angle relative
    // to the center point
    if (bulge < 0) {
      this._startAngle = Math.atan2(a.y - d.y, a.x - d.x)
      this._endAngle = Math.atan2(b.y - d.y, b.x - d.x)
    } else {
      this._startAngle = Math.atan2(b.y - d.y, b.x - d.x)
      this._endAngle = Math.atan2(a.y - d.y, a.x - d.x)
    }
    this._clockwise = bulge < 0
    this.center = d
    this.radius = b.sub(d).length()
  }

  /**
   * Center of circular arc
   */
  get center(): AcGePoint2d {
    return this._center
  }
  set center(value: AcGePoint2dLike) {
    this._center = new AcGePoint2d(value.x, value.y)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Radius of circular arc
   */
  get radius(): number {
    return this._radius
  }
  set radius(value: number) {
    this._radius = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start angle in radians of circular arc in the range 0 to 2 * PI.
   * If clockwise=true, angles are mirrored (0 = +X, 270° = +Y, 180° = -X, 90° = -Y).
   * If clockwise=false, angles are in normal mathematical sense (0 = +X, 90° = +Y, 180° = -X, 270° = -Y).
   */
  get startAngle(): number {
    return this._clockwise
      ? this._mirrorAngle(this._startAngle)
      : this._startAngle
  }
  set startAngle(value: number) {
    this._startAngle = this._clockwise
      ? this._mirrorAngle(AcGeMathUtil.normalizeAngle(value))
      : AcGeMathUtil.normalizeAngle(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * End angle in radians of circular arc in the range 0 to 2 * PI.
   * If clockwise=true, angles are mirrored (0 = +X, 270° = +Y, 180° = -X, 90° = -Y).
   * If clockwise=false, angles are in normal mathematical sense (0 = +X, 90° = +Y, 180° = -X, 270° = -Y).
   */
  get endAngle(): number {
    return this._clockwise ? this._mirrorAngle(this._endAngle) : this._endAngle
  }
  set endAngle(value: number) {
    const normalizedValue =
      this.startAngle == 0 && value == TAU
        ? value
        : AcGeMathUtil.normalizeAngle(value)
    this._endAngle = this._clockwise
      ? this._mirrorAngle(normalizedValue)
      : normalizedValue
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Mirror an angle for clockwise mode: 0° stays 0°, 90° becomes 270°, 180° stays 180°, 270° becomes 90°
   * @param angle Input angle in radians
   * @returns Mirrored angle in radians
   */
  private _mirrorAngle(angle: number): number {
    // Convert to degrees for easier calculation
    const degrees = (angle * 180) / Math.PI
    // Mirror: 0°→0°, 90°→270°, 180°→180°, 270°→90°
    const mirroredDegrees = (360 - degrees) % 360
    return (mirroredDegrees * Math.PI) / 180
  }

  /**
   * Get the internal (unmirrored) angle for calculations
   * @param angle Input angle (may be mirrored)
   * @returns Internal angle for calculations
   */
  private _getInternalAngle(angle: number): number {
    return this._clockwise ? this._mirrorAngle(angle) : angle
  }

  /**
   * Angle between endAngle and startAngle in range 0 to 2*PI
   */
  get deltaAngle() {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalEndAngle = this._getInternalAngle(this.endAngle)
    return this.clockwise
      ? AcGeMathUtil.normalizeAngle(internalStartAngle - internalEndAngle)
      : AcGeMathUtil.normalizeAngle(internalEndAngle - internalStartAngle)
  }

  /**
   * Rotation direction of the arc.
   */
  get clockwise() {
    return this._clockwise
  }
  set clockwise(value: boolean) {
    this._clockwise = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start point of circular arc
   */
  get startPoint(): AcGePoint2d {
    return this.getPointAtAngle(this.startAngle)
  }

  /**
   * End point of circular arc
   */
  get endPoint(): AcGePoint2d {
    return this.getPointAtAngle(this.endAngle)
  }

  /**
   * Middle point of circular arc
   */
  get midPoint(): AcGePoint2d {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalEndAngle = this._getInternalAngle(this.endAngle)
    const internalMidAngle = AcGeMathUtil.normalizeAngle(
      (internalStartAngle + internalEndAngle) / 2
    )
    const midAngle = this._clockwise
      ? this._mirrorAngle(internalMidAngle)
      : internalMidAngle
    return this.getPointAtAngle(midAngle)
  }

  /**
   * Return true if its start point is identical to its end point. Otherwise, return false.
   */
  get closed() {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalEndAngle = this._getInternalAngle(this.endAngle)
    return (Math.abs(internalEndAngle - internalStartAngle) / Math.PI) % 2 == 0
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): AcGeBox2d {
    const points = [this.startPoint, this.endPoint]

    const criticalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    for (const angle of criticalAngles) {
      const internalAngle = this._getInternalAngle(angle)
      if (
        AcGeMathUtil.isBetweenAngle(
          internalAngle,
          this._getInternalAngle(this.startAngle),
          this._getInternalAngle(this.endAngle),
          this.clockwise
        )
      ) {
        points.push(this.getPointAtAngle(angle))
      }
    }

    const xValues = points.map(p => p.x)
    const yValues = points.map(p => p.y)

    return new AcGeBox2d(
      new AcGePoint2d(Math.min(...xValues), Math.min(...yValues)),
      new AcGePoint2d(Math.max(...xValues), Math.max(...yValues))
    )
  }

  /**
   * Get length of circular arc
   */
  get length() {
    return Math.abs(this.deltaAngle * this.radius)
  }

  /**
   * @inheritdoc
   */
  transform(_matrix: AcGeMatrix2d) {
    // TODO: implement it
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    return new AcGeCircArc2d(
      this.center.clone(),
      this.radius,
      this._startAngle,
      this._endAngle,
      this.clockwise
    )
  }

  /**
   * Calculate a point on the ellipse at a given angle.
   * @param angle Input the angle in radians where the point is to be calculated.
   * @returns Return the 2d coordinates of the point on the circular arc.
   */
  getPointAtAngle(angle: number): AcGePoint2d {
    const internalAngle = this._getInternalAngle(angle)
    const x = this.center.x + this.radius * Math.cos(internalAngle)
    const y = this.center.y + this.radius * Math.sin(internalAngle)
    return new AcGePoint2d(x, y)
  }

  /**
   * Divide this arc into the specified nubmer of points and return those points as an array of points.
   * @param numPoints Input the nubmer of points returned
   * @returns Return an array of points
   */
  getPoints(numPoints: number = 100): AcGePoint2d[] {
    const points: AcGePoint2d[] = []
    let deltaAngle = this.deltaAngle
    let internalStartAngle = this._getInternalAngle(this.startAngle)
    if (this.closed) {
      deltaAngle = TAU
      internalStartAngle = 0
    }
    if (this.clockwise) {
      for (let i = 0; i <= numPoints; i++) {
        const internalAngle = internalStartAngle - deltaAngle * (i / numPoints)
        const angle = this._clockwise
          ? this._mirrorAngle(internalAngle)
          : internalAngle
        const point = this.getPointAtAngle(angle)
        points.push(new AcGePoint2d(point.x, point.y))
      }
    } else {
      for (let i = 0; i <= numPoints; i++) {
        const internalAngle = internalStartAngle + deltaAngle * (i / numPoints)
        const angle = this._clockwise
          ? this._mirrorAngle(internalAngle)
          : internalAngle
        const point = this.getPointAtAngle(angle)
        points.push(new AcGePoint2d(point.x, point.y))
      }
    }
    return points
  }
}
