import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGePlane } from './AcGePlane'
import { AcGeVector3d, AcGeVector3dLike } from './AcGeVector3d'

/**
 * The class representing an axis-aligned bounding box (AABB) in 3d space.
 */
export class AcGeBox3d {
  /**
   * The lower (x, y, z) boundary of the box.
   */
  min: AcGeVector3d
  /**
   * The upper (x, y, z) boundary of the box.
   */
  max: AcGeVector3d

  /**
   * Create a 3d box bounded by min and max.
   * @param min (optional) Input the lower (x, y, z) boundary of the box.
   * Set it to ( + Infinity, + Infinity, + Infinity ) if undefined or null provided.
   * @param max (optional) Input the upper (x, y, z) boundary of the box.
   * Set it to ( - Infinity, - Infinity, - Infinity ) if undefined or null provided.
   */
  constructor(
    min: AcGeVector3dLike | undefined = undefined,
    max: AcGeVector3dLike | undefined = undefined
  ) {
    this.min =
      min == null
        ? new AcGeVector3d(+Infinity, +Infinity, +Infinity)
        : new AcGeVector3d(min.x, min.y, min.z)
    this.max =
      max == null
        ? new AcGeVector3d(-Infinity, -Infinity, -Infinity)
        : new AcGeVector3d(max.x, max.y, max.z)
  }

  /**
   * Set the lower and upper (x, y, z) boundaries of this box.
   * Please note that this method only copies the values from the given objects.
   * @param min Input the lower (x, y, z) boundary of the box.
   * @param max Input the upper (x, y, z) boundary of the box.
   * @returns Return this box.
   */
  set(min: AcGeVector3dLike, max: AcGeVector3dLike) {
    this.min.copy(min)
    this.max.copy(max)

    return this
  }

  /**
   * Set the upper and lower bounds of this box to include all of the data in array.
   * @param array Input an array of position data that the resulting box will envelop.
   * @returns Return this box
   */
  setFromArray(array: number[]) {
    this.makeEmpty()
    for (let i = 0, il = array.length; i < il; i += 3) {
      this.expandByPoint(_vector.fromArray(array, i))
    }
    return this
  }

  /**
   * Set the upper and lower bounds of this box to include all of the points in points.
   * @param points Input an array of 3d point or 3d vector that the resulting box will contain.
   * @returns Return this box
   */
  setFromPoints(points: AcGeVector3dLike[]) {
    this.makeEmpty()

    for (let i = 0, il = points.length; i < il; i++) {
      this.expandByPoint(points[i])
    }

    return this
  }

  /**
   * Center this box on center and set this box's width, height and depth to the values specified in size
   * @param center Input the desired center position of the box.
   * @param size Input the desired x, y and z dimensions of the box.
   * @returns Return this box
   */
  setFromCenterAndSize(center: AcGeVector3dLike, size: AcGeVector3dLike) {
    const halfSize = _vector.copy(size).multiplyScalar(0.5)
    this.min.copy(center).sub(halfSize)
    this.max.copy(center).add(halfSize)
    return this
  }

  /**
   * Return a new box with the same min and max as this one.
   * @returns Return a new box with the same min and max as this one.
   */
  clone() {
    return new AcGeBox3d().copy(this)
  }

  /**
   * Copy the min and max from box to this box.
   * @param box Input box to copy.
   * @returns Return this box
   */
  copy(box: AcGeBox3d) {
    this.min.copy(box.min)
    this.max.copy(box.max)
    return this
  }

  /**
   * Make this box empty.
   * @returns Return this box
   */
  makeEmpty() {
    this.min.x = this.min.y = this.min.z = +Infinity
    this.max.x = this.max.y = this.max.z = -Infinity
    return this
  }

  /**
   * Return true if this box includes zero points within its bounds.
   * Note that a box with equal lower and upper bounds still includes one point, the one both bounds share.
   * @returns Return true if this box includes zero points within its bounds.
   */
  isEmpty() {
    // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes
    return (
      this.max.x < this.min.x ||
      this.max.y < this.min.y ||
      this.max.z < this.min.z
    )
  }

  /**
   * Return the center point of the box as a 3d vector.
   * @param target Input the result copied into this 3d vector.
   * @returns Return the center point of the box
   */
  getCenter(target: AcGeVector3d) {
    return this.isEmpty()
      ? target.set(0, 0, 0)
      : target.addVectors(this.min, this.max).multiplyScalar(0.5)
  }

  /**
   * Return the width, height and depth of this box.
   * @param target Return the result copied into this 3d vector.
   * @returns Return the width, height and depth of this box.
   */
  getSize(target: AcGeVector3d) {
    return this.isEmpty()
      ? target.set(0, 0, 0)
      : target.subVectors(this.max, this.min)
  }

  /**
   * Center point of this box
   */
  get center() {
    return this.isEmpty()
      ? new AcGeVector3d(0, 0, 0)
      : new AcGeVector3d(0, 0, 0)
          .addVectors(this.min, this.max)
          .multiplyScalar(0.5)
  }

  /**
   * Return the width, height and depth of this box.
   */
  get size() {
    return this.isEmpty()
      ? new AcGeVector3d(0, 0, 0)
      : new AcGeVector3d(0, 0, 0).subVectors(this.max, this.min)
  }

  /**
   * Expand the boundaries of this box to include point.
   * @param point
   * @returns
   */
  expandByPoint(point: AcGeVector3dLike) {
    this.min.min(point)
    this.max.max(point)
    return this
  }

  /**
   * Expand this box equilaterally by vector. The width of this box will be expanded by the x component
   * of vector in both directions. The height of this box will be expanded by the y component of vector
   * in both directions. The depth of this box will be expanded by the z component of vector in both
   * directions.
   * @param vector Input one 3d vector to expand the box by.
   * @returns Return this box
   */
  expandByVector(vector: AcGeVector3dLike) {
    this.min.sub(vector)
    this.max.add(vector)

    return this
  }

  /**
   * Expand each dimension of the box by scalar. If negative, the dimensions of the box will be contracted.
   * @param scalar Input distance to expand the box by.
   * @returns Return this box
   */
  expandByScalar(scalar: number) {
    this.min.addScalar(-scalar)
    this.max.addScalar(scalar)

    return this
  }

  /**
   * Return true if the specified point lies within or on the boundaries of this box.
   * @param point Input point to check for inclusion.
   * @returns Return true if the specified point lies within or on the boundaries of this box.
   */
  containsPoint(point: AcGeVector3dLike) {
    return point.x < this.min.x ||
      point.x > this.max.x ||
      point.y < this.min.y ||
      point.y > this.max.y ||
      point.z < this.min.z ||
      point.z > this.max.z
      ? false
      : true
  }

  /**
   * Return true if this box includes the entirety of box. If this and box are identical,
   * this function also returns true.
   * @param box Input 3d box to test for inclusion.
   * @returns Return true if this box includes the entirety of box.
   */
  containsBox(box: AcGeBox3d) {
    return (
      this.min.x <= box.min.x &&
      box.max.x <= this.max.x &&
      this.min.y <= box.min.y &&
      box.max.y <= this.max.y &&
      this.min.z <= box.min.z &&
      box.max.z <= this.max.z
    )
  }

  /**
   * Return a point as a proportion of this box's width, height and depth.
   * @param point Input one point
   * @param target Input the result will be copied into this Vector3.
   * @returns Return one point
   */
  getParameter(point: AcGeVector3dLike, target: AcGeVector3d) {
    // This can potentially have a divide by zero if the box
    // has a size dimension of 0.

    return target.set(
      (point.x - this.min.x) / (this.max.x - this.min.x),
      (point.y - this.min.y) / (this.max.y - this.min.y),
      (point.z - this.min.z) / (this.max.z - this.min.z)
    )
  }

  /**
   * Determine whether or not this box intersects box.
   * @param box Input 3d box to check for intersection against.
   * @returns Return true if this box intersects the specified box.
   */
  intersectsBox(box: AcGeBox3d) {
    // using 6 splitting planes to rule out intersections.
    return box.max.x < this.min.x ||
      box.min.x > this.max.x ||
      box.max.y < this.min.y ||
      box.min.y > this.max.y ||
      box.max.z < this.min.z ||
      box.min.z > this.max.z
      ? false
      : true
  }

  /**
   * Determine whether or not this box intersects plane.
   * @param plane Input the plane to check for intersection against.
   * @returns Return true if this box intersects the specified plane.
   */
  intersectsPlane(plane: AcGePlane) {
    // We compute the minimum and maximum dot product values. If those values
    // are on the same side (back or front) of the plane, then there is no intersection.

    let min, max

    if (plane.normal.x > 0) {
      min = plane.normal.x * this.min.x
      max = plane.normal.x * this.max.x
    } else {
      min = plane.normal.x * this.max.x
      max = plane.normal.x * this.min.x
    }

    if (plane.normal.y > 0) {
      min += plane.normal.y * this.min.y
      max += plane.normal.y * this.max.y
    } else {
      min += plane.normal.y * this.max.y
      max += plane.normal.y * this.min.y
    }

    if (plane.normal.z > 0) {
      min += plane.normal.z * this.min.z
      max += plane.normal.z * this.max.z
    } else {
      min += plane.normal.z * this.max.z
      max += plane.normal.z * this.min.z
    }

    return min <= -plane.constant && max >= -plane.constant
  }

  /**
   * Clamp the point within the bounds of this box.
   * @param point Input the point to clamp.
   * @param target Input the result will be copied into this 3d vector.
   * @returns Return the target
   */
  clampPoint(point: AcGeVector3dLike, target: AcGeVector3d) {
    return target.copy(point).clamp(this.min, this.max)
  }

  /**
   * Returns the distance from any edge of this box to the specified point. If the point lies inside of
   * this box, the distance will be 0.
   * @param point Input one 3d point to measure distance to.
   * @returns Return the distance from any edge of this box to the specified point.
   */
  distanceToPoint(point: AcGeVector3dLike) {
    return this.clampPoint(point, _vector).distanceTo(point)
  }

  /**
   * Compute the intersection of this and box, setting the upper bound of this box to the lesser of the
   * two boxes' upper bounds and the lower bound of this box to the greater of the two boxes' lower bounds.
   * If there's no overlap, makes this box empty.
   * @param box Input 3d box to intersect with.
   * @returns Return this box
   */
  intersect(box: AcGeBox3d) {
    this.min.max(box.min)
    this.max.min(box.max)

    // ensure that if there is no overlap, the result is fully empty, not slightly empty with non-inf/+inf values that will cause subsequence intersects to erroneously return valid values.
    if (this.isEmpty()) this.makeEmpty()

    return this
  }

  /**
   * Compute the union of this box and box, setting the upper bound of this box to the greater of the two
   * boxes' upper bounds and the lower bound of this box to the lesser of the two boxes' lower bounds.
   * @param box Input the 3d box that will be unioned with this box.
   * @returns Return this box
   */
  union(box: AcGeBox3d) {
    this.min.min(box.min)
    this.max.max(box.max)

    return this
  }

  /**
   * Transform this box with the supplied matrix.
   * @param matrix Input 4x4 matrix to apply
   * @returns Return this box
   */
  applyMatrix4(matrix: AcGeMatrix3d) {
    // transform of empty box is an empty box.
    if (this.isEmpty()) return this

    // NOTE: I am using a binary pattern to specify all 2^3 combinations below
    _points[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(matrix) // 000
    _points[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(matrix) // 001
    _points[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(matrix) // 010
    _points[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(matrix) // 011
    _points[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(matrix) // 100
    _points[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(matrix) // 101
    _points[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(matrix) // 110
    _points[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(matrix) // 111

    this.setFromPoints(_points)

    return this
  }

  /**
   * Add offset to both the upper and lower bounds of this box, effectively moving this box offset units
   * in 3d space.
   * @param offset Input direction and distance of offset.
   * @returns Return this box
   */
  translate(offset: AcGeVector3dLike) {
    this.min.add(offset)
    this.max.add(offset)

    return this
  }

  /**
   * Return true if this box and box share the same lower and upper bounds.
   * @param box Input box to compare with this one.
   * @returns Return true if this box and box share the same lower and upper bounds.
   */
  equals(box: AcGeBox3d) {
    return box.min.equals(this.min) && box.max.equals(this.max)
  }
}

const _points = [
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d(),
  /*@__PURE__*/ new AcGeVector3d()
]

const _vector = /*@__PURE__*/ new AcGeVector3d()
