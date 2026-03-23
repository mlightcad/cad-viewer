import { AcGeBox3d } from './AcGeBox3d'
import { AcGeMatrix2d } from './AcGeMatrix2d'
import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGeVector3d, AcGeVector3dLike } from './AcGeVector3d'

const _vector1 = /*@__PURE__*/ new AcGeVector3d()
const _vector2 = /*@__PURE__*/ new AcGeVector3d()
const _normalMatrix = /*@__PURE__*/ new AcGeMatrix2d()

/**
 * A two dimensional surface that extends infinitely in 3d space, represented in Hessian normal form
 * by a unit length normal vector and a constant.
 */
export class AcGePlane {
  normal: AcGeVector3d
  constant: number

  /**
   * Create one plane
   * @param normal (optional) Input a unit length Vector3 defining the normal of the plane.
   * Default is (1, 0, 0).
   * @param constant (optional) Input the signed distance from the origin to the plane. Default is 0.
   */
  constructor(normal = new AcGeVector3d(1, 0, 0), constant = 0) {
    // normal is assumed to be normalized
    this.normal = normal
    this.constant = constant
  }

  /**
   * Set this plane's normal and constant properties by copying the values from the given normal.
   * @param normal Input a unit length 3d vector defining the normal of the plane.
   * @param constant Input the signed distance from the origin to the plane.
   * @returns Return this plane
   */
  set(normal: AcGeVector3dLike, constant: number) {
    this.normal.copy(normal)
    this.constant = constant

    return this
  }

  /**
   * Set the individual components that define the plane.
   * @param x Input x value of the unit length normal vector.
   * @param y Input y value of the unit length normal vector.
   * @param z Input z value of the unit length normal vector.
   * @param w Input the value of the plane's constant property.
   * @returns Return this plane
   */
  setComponents(x: number, y: number, z: number, w: number) {
    this.normal.set(x, y, z)
    this.constant = w
    return this
  }

  /**
   * Set the plane's properties as defined by a normal and an arbitrary coplanar point.
   * @param normal Input a unit length Vector3 defining the normal of the plane.
   * @param point Input an arbitrary coplanar point.
   * @returns Return this plane
   */
  setFromNormalAndCoplanarPoint(normal: AcGeVector3dLike, point: AcGeVector3d) {
    this.normal.copy(normal)
    this.constant = -point.dot(this.normal)
    return this
  }

  /**
   * Defines the plane based on the 3 provided points. The winding order is assumed to be
   * counter-clockwise, and determines the direction of the normal.
   * @param a Input the first point on the plane.
   * @param b Input the second point on the plane.
   * @param c Input the third point on the plane.
   * @returns Return this plane
   */
  setFromCoplanarPoints(a: AcGeVector3d, b: AcGeVector3d, c: AcGeVector3d) {
    const normal = _vector1
      .subVectors(c, b)
      .cross(_vector2.subVectors(a, b))
      .normalize()

    // Q: should an error be thrown if normal is zero (e.g. degenerate plane)?

    this.setFromNormalAndCoplanarPoint(normal, a)

    return this
  }

  /**
   * Copy the values of the passed plane's normal and constant properties to this plane.
   * @param plane Input the plane to copy
   * @returns Return this plane
   */
  copy(plane: AcGePlane) {
    this.normal.copy(plane.normal)
    this.constant = plane.constant

    return this
  }

  /**
   * Normalize the normal vector, and adjusts the constant value accordingly.
   * @returns Return this plane
   */
  normalize() {
    // Note: will lead to a divide by zero if the plane is invalid.

    const inverseNormalLength = 1.0 / this.normal.length()
    this.normal.multiplyScalar(inverseNormalLength)
    this.constant *= inverseNormalLength

    return this
  }

  /**
   * Negate both the normal vector and the constant.
   * @returns Return this plane
   */
  negate() {
    this.constant *= -1
    this.normal.negate()
    return this
  }

  /**
   * Return the signed distance from the point to the plane.
   * @param point Input one 3d point
   * @returns Return the caculated distance
   */
  distanceToPoint(point: AcGeVector3dLike) {
    return this.normal.dot(point) + this.constant
  }

  /**
   * Project a point onto the plane.
   * @param point Input a point to be projected
   * @param target Input the result to be copied into.
   * @returns Return the target

   */
  projectPoint(point: AcGeVector3dLike, target: AcGeVector3d) {
    return target
      .copy(point)
      .addScaledVector(this.normal, -this.distanceToPoint(point))
  }

  /**
   * Return the intersection point of the passed line and the plane. Returns null if the line does not
   * intersect. Returns the line's starting point if the line is coplanar with the plane.
   * @param line Input the 3d line to check for intersection.
   * @param target Input the result will be copied into this Vector3.
   * @returns Return the target
   */
  // intersectLine(line: Line3, target: AcGeVector3d) {
  //   const direction = line.delta(_vector1)

  //   const denominator = this.normal.dot(direction)

  //   if (denominator === 0) {
  //     // line is coplanar, return origin
  //     if (this.distanceToPoint(line.start) === 0) {
  //       return target.copy(line.start)
  //     }

  //     // Unsure if this is the correct method to handle this case.
  //     return null
  //   }

  //   const t = -(line.start.dot(this.normal) + this.constant) / denominator

  //   if (t < 0 || t > 1) {
  //     return null
  //   }

  //   return target.copy(line.start).addScaledVector(direction, t)
  // }

  // intersectsLine(line) {
  //   // Note: this tests if a line intersects the plane, not whether it (or its end-points) are coplanar with it.

  //   const startSign = this.distanceToPoint(line.start)
  //   const endSign = this.distanceToPoint(line.end)

  //   return (startSign < 0 && endSign > 0) || (endSign < 0 && startSign > 0)
  // }

  /**
   * Determine whether or not this plane intersects box.
   * @param box Input the 3d box to check for intersection.
   * @returns Return true if this plane intersects the specified 3d box.
   */
  intersectsBox(box: AcGeBox3d) {
    return box.intersectsPlane(this)
  }

  /**
   * Returns a 3d vector coplanar to the plane, by calculating the projection of the normal vector at the
   * origin onto the plane.
   * @param target Input the result will be copied into this 3d vector.
   * @returns Return the 3d vector coplanar to the plane
   */
  coplanarPoint(target: AcGeVector3d) {
    return target.copy(this.normal).multiplyScalar(-this.constant)
  }

  /**
   * Apply a Matrix4 to the plane. The matrix must be an affine, homogeneous transform.
   * If supplying an optionalNormalMatrix, it can be created like so:
   * <pre>
   * const optionalNormalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );
   * </pre>
   * @param matrix Input the Matrix4 to apply.
   * @param optionalNormalMatrix (optional) Input pre-computed normal Matrix3 of the Matrix4 being applied.
   * @returns Return this plane
   */
  applyMatrix4(matrix: AcGeMatrix3d, optionalNormalMatrix: AcGeMatrix2d) {
    const normalMatrix =
      optionalNormalMatrix || _normalMatrix.getNormalMatrix(matrix)

    const referencePoint = this.coplanarPoint(_vector1).applyMatrix4(matrix)

    const normal = this.normal.applyMatrix3(normalMatrix).normalize()

    this.constant = -referencePoint.dot(normal)

    return this
  }

  /**
   * Translates the plane by the distance defined by the offset vector. Note that this only affects the
   * plane constant and will not affect the normal vector.
   * @param offset Input the amount to move the plane by.
   * @returns Return this plane
   */
  translate(offset: AcGeVector3d) {
    this.constant -= offset.dot(this.normal)

    return this
  }

  /**
   * Check to see if two planes are equal (their normal and constant properties match).
   * @param plane Input the plane to compare with this one.
   * @returns Return true if two planes are equal
   */
  equals(plane: AcGePlane) {
    return plane.normal.equals(this.normal) && plane.constant === this.constant
  }

  /**
   * Return a new plane with the same normal and constant as this one.
   * @returns Return the cloned plane
   */
  clone() {
    return new AcGePlane().copy(this)
  }
}
