import { AcGePoint3d, AcGePoint3dLike } from '../math'
import {
  calculateCurveLength,
  evaluateNurbsPoint,
  generateChordKnots,
  generateSqrtChordKnots,
  generateUniformKnots
} from '../util'
import { AcGeCatmullRomCurve3d } from './AcGeCatmullRomCurve3d'

/**
 * Type for NURBS knot parameterization
 */
export type AcGeKnotParameterizationType = 'Uniform' | 'Chord' | 'SqrtChord'

/**
 * A NURBS curve implementation that can be used by other curve classes
 */
export class AcGeNurbsCurve {
  private _degree: number
  private _knots: number[]
  private _controlPoints: AcGePoint3dLike[]
  private _weights: number[]

  constructor(
    degree: number,
    knots: number[],
    controlPoints: AcGePoint3dLike[],
    weights?: number[]
  ) {
    this._degree = degree
    this._knots = [...knots]
    this._controlPoints = controlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
    this._weights = weights
      ? [...weights]
      : new Array(controlPoints.length).fill(1.0)
  }

  /**
   * Get the degree of the NURBS curve
   */
  degree(): number {
    return this._degree
  }

  /**
   * Get the knot vector
   */
  knots(): number[] {
    return [...this._knots]
  }

  /**
   * Get the control points
   */
  controlPoints(): AcGePoint3dLike[] {
    return this._controlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }))
  }

  /**
   * Get the weights
   */
  weights(): number[] {
    return [...this._weights]
  }

  /**
   * Calculate a point on the curve at parameter u
   */
  point(u: number): number[] {
    // Convert AcGePoint3dLike[] to number[][] for utility functions
    const controlPointsArray = this._controlPoints.map(p => [p.x, p.y, p.z])
    return evaluateNurbsPoint(
      u,
      this._degree,
      this._knots,
      controlPointsArray,
      this._weights
    )
  }

  /**
   * Calculate curve length using numerical integration
   */
  length(): number {
    // Convert AcGePoint3dLike[] to number[][] for utility functions
    const controlPointsArray = this._controlPoints.map(p => [p.x, p.y, p.z])
    return calculateCurveLength(
      this._degree,
      this._knots,
      controlPointsArray,
      this._weights
    )
  }

  /**
   * Create a NURBS curve from control points and knots
   */
  static byKnotsControlPointsWeights(
    degree: number,
    knots: number[],
    controlPoints: AcGePoint3dLike[],
    weights?: number[]
  ): AcGeNurbsCurve {
    return new AcGeNurbsCurve(degree, knots, controlPoints, weights)
  }

  /**
   * Create a NURBS curve from fit points using interpolation
   */
  static byPoints(
    points: number[][],
    degree: number,
    parameterization: AcGeKnotParameterizationType = 'Uniform'
  ): AcGeNurbsCurve {
    // Generate knots based on parameterization type
    let knots: number[]
    switch (parameterization) {
      case 'Chord':
        knots = generateChordKnots(degree, points)
        break
      case 'SqrtChord':
        knots = generateSqrtChordKnots(degree, points)
        break
      case 'Uniform':
      default:
        knots = generateUniformKnots(degree, points.length)
        break
    }

    // Convert number[][] to AcGePoint3dLike[] for control points
    const controlPoints = points.map(p => ({ x: p[0], y: p[1], z: p[2] }))
    const weights = new Array(controlPoints.length).fill(1.0)

    return new AcGeNurbsCurve(degree, knots, controlPoints, weights)
  }

  /**
   * Get the valid parameter range for this curve
   */
  getParameterRange(): { start: number; end: number } {
    const startParam = this._knots[this._degree]
    const endParam = this._knots[this._knots.length - this._degree - 1]
    return { start: startParam, end: endParam }
  }

  /**
   * Get points along the curve
   * @param divisions - Number of divisions to create
   * @returns Array of points along the curve
   */
  getPoints(divisions: number): number[][] {
    const points: number[][] = []
    const { start, end } = this.getParameterRange()

    for (let i = 0; i <= divisions; i++) {
      const t = start + (end - start) * (i / divisions)
      points.push(this.point(t))
    }

    return points
  }

  /**
   * Check if the curve is closed by comparing start and end points
   */
  isClosed(tolerance: number = 1e-6): boolean {
    const { start, end } = this.getParameterRange()
    const startPoint = this.point(start)
    const endPoint = this.point(end)

    const dx = startPoint[0] - endPoint[0]
    const dy = startPoint[1] - endPoint[1]
    const dz = startPoint[2] - endPoint[2]

    return Math.sqrt(dx * dx + dy * dy + dz * dz) < tolerance
  }

  /**
   * Create fit points for a closed NURBS curve using Catmull-Rom interpolation
   */
  static createFitPointsForClosedCurve(
    points: AcGePoint3dLike[]
  ): AcGePoint3d[] {
    if (points.length < 4) {
      throw new Error('At least 4 points are required for a closed NURBS curve')
    }

    // Create a closed Catmull-Rom curve
    const catmullRomCurve = new AcGeCatmullRomCurve3d(
      points,
      true,
      'centripetal'
    )

    // Get points along the curve for NURBS interpolation
    // Use more divisions for smoother curve
    const divisions = Math.max(50, points.length * 2)
    return catmullRomCurve.getPoints(divisions)
  }

  /**
   * Create a closed NURBS curve using Catmull-Rom interpolation for smooth closure
   */
  static createClosedCurve(
    points: AcGePoint3dLike[],
    degree: number,
    parameterization: AcGeKnotParameterizationType = 'Chord'
  ): AcGeNurbsCurve {
    const curvePoints = this.createFitPointsForClosedCurve(points)

    // Convert AcGePoint3d[] back to number[][]
    const nurbsPoints = curvePoints.map(point => [point.x, point.y, point.z])

    // Create NURBS curve from the interpolated points
    return AcGeNurbsCurve.byPoints(nurbsPoints, degree, parameterization)
  }
}
