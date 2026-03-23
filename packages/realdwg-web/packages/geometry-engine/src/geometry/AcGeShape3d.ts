import { AcGeBox3d, AcGeMatrix3d, AcGeVector3dLike } from '../math'
import { AcGeShape } from './AcGeShape'

/**
 * Abstract base class for all kinds of 3d shapes.
 */
export abstract class AcGeShape3d extends AcGeShape {
  /**
   * The bounding box of this shape
   */
  private _box?: AcGeBox3d
  /**
   * Return new shape translated by given vector.
   * Translation vector may be also defined by a pair of numbers.
   */
  translate(v: AcGeVector3dLike): AcGeShape3d {
    return this.transform(new AcGeMatrix3d().makeTranslation(v.x, v.y, v.z))
  }

  /**
   * Transforms the entity by applying the input matrix.
   * @param matrix Input transformation matrix
   * @return Return this shape
   */
  abstract transform(matrix: AcGeMatrix3d): this

  /**
   * The bounding box of this shape. Because it is a time-consuming operation to calculate the bounding
   * box of one shape, the bounding box value is cached. It will be calculated again lazily once there
   * are any changes to properties of this shape.
   */
  get box() {
    if (this._box == null || this._boundingBoxNeedsUpdate) {
      this._box = this.calculateBoundingBox()
      this._boundingBoxNeedsUpdate = false
    }
    return this._box
  }

  /**
   * Return true if this shape contains the specified shape
   */
  protected abstract calculateBoundingBox(): AcGeBox3d
}
