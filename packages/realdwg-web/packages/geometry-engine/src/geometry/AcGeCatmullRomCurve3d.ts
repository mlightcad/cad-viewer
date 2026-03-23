import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d
} from '../math'
import { AcGeCurve3d } from './AcGeCurve3d'

/**
 * Centripetal CatmullRom Curve - which is useful for avoiding
 * cusps and self-intersections in non-uniform catmull rom curves.
 * http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
 *
 * curve.type accepts centripetal(default), chordal and catmullrom
 * curve.tension is used for catmullrom which defaults to 0.5
 */

/**
 * Type for curve interpolation methods
 */
export type CatmullRomCurveType = 'centripetal' | 'chordal' | 'catmullrom'

/**
 * Internal class for computing cubic polynomial coefficients
 * Based on an optimized c++ solution in
 * - http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/
 * - http://ideone.com/NoEbVM
 */
class CubicPoly {
  private c0 = 0
  private c1 = 0
  private c2 = 0
  private c3 = 0

  /**
   * Compute coefficients for a cubic polynomial
   *   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
   * such that
   *   p(0) = x0, p(1) = x1
   *  and
   *   p'(0) = t0, p'(1) = t1.
   */
  private init(x0: number, x1: number, t0: number, t1: number): void {
    this.c0 = x0
    this.c1 = t0
    this.c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1
    this.c3 = 2 * x0 - 2 * x1 + t0 + t1
  }

  /**
   * Initialize for Catmull-Rom interpolation
   */
  initCatmullRom(
    x0: number,
    x1: number,
    x2: number,
    x3: number,
    tension: number
  ): void {
    this.init(x1, x2, tension * (x2 - x0), tension * (x3 - x1))
  }

  /**
   * Initialize for non-uniform Catmull-Rom interpolation
   */
  initNonuniformCatmullRom(
    x0: number,
    x1: number,
    x2: number,
    x3: number,
    dt0: number,
    dt1: number,
    dt2: number
  ): void {
    // compute tangents when parameterized in [t1,t2]
    let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1
    let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2

    // rescale tangents for parametrization in [0,1]
    t1 *= dt1
    t2 *= dt1

    this.init(x1, x2, t1, t2)
  }

  /**
   * Calculate the polynomial value at parameter t
   */
  calc(t: number): number {
    const t2 = t * t
    const t3 = t2 * t
    return this.c0 + this.c1 * t + this.c2 * t2 + this.c3 * t3
  }
}

/**
 * A curve representing a Catmull-Rom spline.
 *
 * ```js
 * //Create a closed wavey loop
 * const curve = new AcGeCatmullRomCurve3d( [
 *   new AcGePoint3d( -10, 0, 10 ),
 *   new AcGePoint3d( -5, 5, 5 ),
 *   new AcGePoint3d( 0, 0, 0 ),
 *   new AcGePoint3d( 5, -5, 5 ),
 *   new AcGePoint3d( 10, 0, 10 )
 * ], true ); // true for closed curve
 *
 * const points = curve.getPoints( 50 );
 *
 * // Convert to NURBS curve
 * const nurbsCurve = curve.toNurbsCurve();
 * ```
 */
export class AcGeCatmullRomCurve3d extends AcGeCurve3d {
  /**
   * This flag can be used for type testing.
   */
  readonly isCatmullRomCurve3d = true

  /**
   * The curve type identifier
   */
  readonly type = 'CatmullRomCurve3d'

  /**
   * An array of 3D points defining the curve.
   */
  private _points: AcGePoint3d[]

  /**
   * Whether the curve is closed or not.
   */
  private _closed: boolean

  /**
   * The curve type.
   */
  private _curveType: CatmullRomCurveType

  /**
   * Tension of the curve.
   */
  private _tension: number

  // Internal computation objects
  private readonly _tmp = new AcGeVector3d()
  private readonly _px = new CubicPoly()
  private readonly _py = new CubicPoly()
  private readonly _pz = new CubicPoly()

  /**
   * Constructs a new Catmull-Rom curve.
   *
   * @param points - An array of 3D points defining the curve.
   * @param closed - Whether the curve is closed or not.
   * @param curveType - The curve type.
   * @param tension - Tension of the curve.
   */
  constructor(
    points: AcGePoint3dLike[] = [],
    closed = false,
    curveType: CatmullRomCurveType = 'centripetal',
    tension = 0.5
  ) {
    super()
    this._points = points.map(p => new AcGePoint3d(p))
    this._closed = closed
    this._curveType = curveType
    this._tension = tension
  }

  /**
   * An array of 3D points defining the curve.
   */
  get points(): AcGePoint3d[] {
    return this._points
  }

  /**
   * Whether the curve is closed or not.
   */
  get closed(): boolean {
    return this._closed
  }

  /**
   * The curve type.
   */
  get curveType(): CatmullRomCurveType {
    return this._curveType
  }

  /**
   * Tension of the curve.
   */
  get tension(): number {
    return this._tension
  }

  /**
   * Start point of this curve.
   */
  get startPoint(): AcGePoint3d {
    return this._points.length > 0 ? this._points[0] : new AcGePoint3d()
  }

  /**
   * End point of this curve.
   */
  get endPoint(): AcGePoint3d {
    return this._points.length > 0
      ? this._points[this._points.length - 1]
      : new AcGePoint3d()
  }

  /**
   * Length of this curve (approximated).
   */
  get length(): number {
    if (this._points.length < 2) return 0

    let totalLength = 0
    for (let i = 1; i < this._points.length; i++) {
      totalLength += this._points[i - 1].distanceTo(this._points[i])
    }

    if (this._closed && this._points.length > 2) {
      totalLength += this._points[this._points.length - 1].distanceTo(
        this._points[0]
      )
    }

    return totalLength
  }

  /**
   * Returns a point on the curve.
   *
   * @param t - A interpolation factor representing a position on the curve. Must be in the range `[0,1]`.
   * @param optionalTarget - The optional target vector the result is written to.
   * @return The position on the curve.
   */
  getPoint(t: number, optionalTarget = new AcGePoint3d()): AcGePoint3d {
    const point = optionalTarget

    const points = this._points
    const l = points.length

    if (l === 0) {
      return point.set(0, 0, 0)
    }

    if (l === 1) {
      return point.copy(points[0])
    }

    const p = (l - (this._closed ? 0 : 1)) * t
    let intPoint = Math.floor(p)
    let weight = p - intPoint

    if (this._closed) {
      intPoint +=
        intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l
    } else if (weight === 0 && intPoint === l - 1) {
      intPoint = l - 2
      weight = 1
    }

    let p0: AcGePoint3d, p3: AcGePoint3d // 4 points (p1 & p2 defined below)

    if (this._closed || intPoint > 0) {
      p0 = points[(intPoint - 1) % l]
    } else {
      // extrapolate first point
      this._tmp.subVectors(points[0], points[1]).add(points[0])
      p0 = new AcGePoint3d(this._tmp.x, this._tmp.y, this._tmp.z)
    }

    const p1 = points[intPoint % l]
    const p2 = points[(intPoint + 1) % l]

    if (this._closed || intPoint + 2 < l) {
      p3 = points[(intPoint + 2) % l]
    } else {
      // extrapolate last point
      this._tmp.subVectors(points[l - 1], points[l - 2]).add(points[l - 1])
      p3 = new AcGePoint3d(this._tmp.x, this._tmp.y, this._tmp.z)
    }

    if (this._curveType === 'centripetal' || this._curveType === 'chordal') {
      // init Centripetal / Chordal Catmull-Rom
      const pow = this._curveType === 'chordal' ? 0.5 : 0.25
      let dt0 = Math.pow(p0.distanceToSquared(p1), pow)
      let dt1 = Math.pow(p1.distanceToSquared(p2), pow)
      let dt2 = Math.pow(p2.distanceToSquared(p3), pow)

      // safety check for repeated points
      if (dt1 < 1e-4) dt1 = 1.0
      if (dt0 < 1e-4) dt0 = dt1
      if (dt2 < 1e-4) dt2 = dt1

      this._px.initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2)
      this._py.initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2)
      this._pz.initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2)
    } else if (this._curveType === 'catmullrom') {
      this._px.initCatmullRom(p0.x, p1.x, p2.x, p3.x, this._tension)
      this._py.initCatmullRom(p0.y, p1.y, p2.y, p3.y, this._tension)
      this._pz.initCatmullRom(p0.z, p1.z, p2.z, p3.z, this._tension)
    }

    point.set(
      this._px.calc(weight),
      this._py.calc(weight),
      this._pz.calc(weight)
    )

    return point
  }

  /**
   * Get an array of points along the curve
   * @param divisions - Number of divisions to create
   * @returns Array of points along the curve
   */
  getPoints(divisions: number): AcGePoint3d[] {
    const points: AcGePoint3d[] = []

    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPoint(d / divisions))
    }

    return points
  }

  /**
   * Set the points defining the curve
   * @param points - Array of points
   */
  setPoints(points: AcGePoint3dLike[]): void {
    this._points = points.map(p => new AcGePoint3d(p))
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Set whether the curve is closed
   * @param closed - Whether the curve should be closed
   */
  setClosed(closed: boolean): void {
    if (this._closed === closed) {
      return
    }

    this._closed = closed
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Set the curve type
   * @param curveType - The curve type
   */
  setCurveType(curveType: CatmullRomCurveType): void {
    this._curveType = curveType
  }

  /**
   * Set the tension of the curve
   * @param tension - The tension value
   */
  setTension(tension: number): void {
    this._tension = tension
  }

  /**
   * Transforms the curve by applying the input matrix.
   * @param matrix Input transformation matrix
   * @return Return this curve
   */
  transform(matrix: AcGeMatrix3d): this {
    this._points = this._points.map(point => {
      const transformedPoint = new AcGePoint3d()
      transformedPoint.copy(point)
      transformedPoint.applyMatrix4(matrix)
      return transformedPoint
    })
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * Calculate the bounding box of this curve.
   * @return The bounding box
   */
  protected calculateBoundingBox(): AcGeBox3d {
    if (this._points.length === 0) {
      return new AcGeBox3d()
    }

    const box = new AcGeBox3d()
    this._points.forEach(point => {
      box.expandByPoint(point)
    })
    return box
  }
}
