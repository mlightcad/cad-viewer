import { AcGeBox2d, AcGeMatrix2d, AcGePoint2d, AcGePoint2dLike } from '../math'
import { AcGeCurve2d } from './AcGeCurve2d'

/**
 * The class represents one 3d line geometry specified by its start point and end point.
 */
export class AcGeLine2d extends AcGeCurve2d {
  private _start: AcGePoint2d
  private _end: AcGePoint2d
  /**
   * This constructor initializes the line object to use start as the start point, and end
   * as the endpoint. Both points must be in WCS coordinates.
   */
  constructor(start: AcGePoint2dLike, end: AcGePoint2dLike) {
    super()
    this._start = new AcGePoint2d(start)
    this._end = new AcGePoint2d(end)
  }

  /**
   * The line's startpoint in WCS coordinates
   * @returns Return the line's startpoint in WCS coordinates.
   */
  get startPoint(): AcGePoint2d {
    return this._start
  }
  set startPoint(value: AcGePoint2dLike) {
    this._start.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * The line's endpoint in WCS coordinates
   * @returns Return the line's endpoint in WCS coordinates.
   */
  get endPoint(): AcGePoint2d {
    return this._end
  }
  set endPoint(value: AcGePoint2dLike) {
    this._end.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Convert line to a point array with start point and end point.
   * @returns Return an array of point
   */
  getPoints(): AcGePoint2d[] {
    return [this.startPoint, this.endPoint]
  }

  /**
   * @inheritdoc
   */
  get length() {
    return this.startPoint.distanceTo(this.endPoint)
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): AcGeBox2d {
    const min = new AcGePoint2d(
      Math.min(this._start.x, this._end.x),
      Math.min(this._start.y, this._end.y)
    )
    const max = new AcGePoint2d(
      Math.max(this._start.x, this._end.x),
      Math.max(this._start.y, this._end.y)
    )
    return new AcGeBox2d(min, max)
  }

  /**
   * @inheritdoc
   */
  transform(matrix: AcGeMatrix2d) {
    this._start.applyMatrix2d(matrix)
    this._end.applyMatrix2d(matrix)
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
  copy(value: AcGeLine2d) {
    this.startPoint = value.startPoint
    this.endPoint = value.endPoint
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    return new AcGeLine2d(this._start.clone(), this._end.clone())
  }
}
