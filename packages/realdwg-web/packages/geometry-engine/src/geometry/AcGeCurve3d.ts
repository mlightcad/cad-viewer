import { AcGePoint3d } from '../math/AcGePoint3d'
import { AcGeShape3d } from './AcGeShape3d'

/**
 * Abstract base class for all 3d curves. Any class that is derived from this class represents
 * a 3d curve.
 */
export abstract class AcGeCurve3d extends AcGeShape3d {
  /**
   * Return true if its start point is identical to its end point. Otherwise, return false.
   */
  abstract get closed(): boolean

  /**
   * Start point of this curve. If the curve is closed, coordinates of start point will be equal to coordinates
   * of end point.
   */
  abstract get startPoint(): AcGePoint3d

  /**
   * End point of this curve. If the curve is closed, coordinates of start point will be equal to coordinates
   * of end point.
   */
  abstract get endPoint(): AcGePoint3d

  /**
   * Length of this curve.
   */
  abstract get length(): number
}
