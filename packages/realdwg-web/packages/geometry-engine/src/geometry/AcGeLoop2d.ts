import { AcGeEllipseArc2d, AcGeSpline3d } from '../geometry'
import { AcGeBox2d, AcGeMatrix2d, AcGePoint2d, AcGePoint3d } from '../math'
import { AcGeCircArc2d } from './AcGeCircArc2d'
import { AcGeCurve2d } from './AcGeCurve2d'
import { AcGeLine2d } from './AcGeLine2d'

export type AcGeBoundaryEdgeType =
  | AcGeLine2d
  | AcGeCircArc2d
  | AcGeSpline3d
  | AcGeEllipseArc2d

/**
 * The class representing one closed loop created by connected edges, which can be line, circular arc,
 * ellipse arc, or spline.
 */
export class AcGeLoop2d extends AcGeCurve2d {
  private _curves: Array<AcGeBoundaryEdgeType>

  /**
   * Create one loop by connected curves
   * @param curves Input one array of connected curves
   */
  constructor(curves: Array<AcGeBoundaryEdgeType> = []) {
    super()
    this._curves = curves
  }

  get curves() {
    return this._curves as ReadonlyArray<AcGeBoundaryEdgeType>
  }

  /**
   * Append an edge to this loop
   * @param curve
   */
  add(curve: AcGeBoundaryEdgeType) {
    this._curves.push(curve)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * The number of edges in this loop
   */
  get numberOfEdges() {
    return this._curves.length
  }

  /**
   * Start point of this polyline
   */
  get startPoint(): AcGePoint2d {
    if (this._curves.length > 0) {
      const temp = this._curves[0].startPoint
      return new AcGePoint2d(temp.x, temp.y)
    }
    throw new Error('Start point does not exist in an empty loop.')
  }

  /**
   * End point of this polyline
   */
  get endPoint(): AcGePoint2d {
    return this.startPoint
  }

  /**
   * @inheritdoc
   */
  get length() {
    let length = 0
    this._curves.forEach(curve => {
      length += curve.length
    })
    return length
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): AcGeBox2d {
    const points = this.getPoints(100)
    const box2d = new AcGeBox2d()
    box2d.setFromPoints(points)
    return box2d
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
  get closed(): boolean {
    return true
  }

  /**
   * Return boundary points of this area
   * @param numPoints Input the nubmer of points returned for arc segmentation
   * @returns Return points
   */
  getPoints(numPoints: number): AcGePoint2d[] {
    const points: AcGePoint2d[] = []
    this.curves.forEach(curve => {
      curve.getPoints(numPoints).forEach((point: AcGePoint2d | AcGePoint3d) => {
        points.push(new AcGePoint2d(point.x, point.y))
      })
    })
    return points
  }
}
