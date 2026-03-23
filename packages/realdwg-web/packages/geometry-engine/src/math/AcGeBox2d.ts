import { AcGeVector2d, AcGeVector2dLike } from './AcGeVector2d'

const _vector = /*@__PURE__*/ new AcGeVector2d()

/**
 * The class representing an axis-aligned bounding box (AABB) in 2D space.
 */
export class AcGeBox2d {
  /**
   * The lower (x, y) boundary of the box
   */
  min: AcGeVector2d
  /**
   * The upper (x, y) boundary of the box
   */
  max: AcGeVector2d

  /**
   * Create a 2d box bounded by min and max.
   * @param min (optional) Input 2d vector representing the lower (x, y) boundary of the box.
   * Set it to ( + Infinity, + Infinity ) if undefined or null provided.
   * @param max (optional) Input 2d vector representing the upper (x, y) boundary of the box.
   * Set it to ( - Infinity, - Infinity ) if undefined or null provided.
   */
  constructor(
    min: AcGeVector2dLike | undefined = undefined,
    max: AcGeVector2dLike | undefined = undefined
  ) {
    this.min =
      min == null
        ? new AcGeVector2d(+Infinity, +Infinity)
        : new AcGeVector2d(min.x, min.y)
    this.max =
      max == null
        ? new AcGeVector2d(-Infinity, -Infinity)
        : new AcGeVector2d(max.x, max.y)
  }

  /**
   * Set the lower and upper (x, y) boundaries of this box.
   * Please note that this method only copies the values from the given objects.
   * @param min Input 2d vector representing the lower (x, y) boundary of the box.
   * @param max Input 2d vector representing the upper (x, y) boundary of the box.
   * @returns Return this box
   */
  set(min: AcGeVector2dLike, max: AcGeVector2dLike) {
    this.min.copy(min)
    this.max.copy(max)

    return this
  }

  /**
   * Set the upper and lower bounds of this box to include all of the points in points.
   * @param points Input one array of 2d vector that the resulting box will contain.
   * @returns Return this box
   */
  setFromPoints(points: AcGeVector2dLike[]) {
    this.makeEmpty()

    for (let i = 0, il = points.length; i < il; i++) {
      this.expandByPoint(points[i])
    }

    return this
  }

  /**
   * Center this box on center and set this box's width and height to the values specified in size.
   * @param center Input the desired center position of the box.
   * @param size Input the desired x and y dimensions of the box.
   * @returns Return this box
   */
  setFromCenterAndSize(center: AcGeVector2dLike, size: AcGeVector2dLike) {
    const halfSize = _vector.copy(size).multiplyScalar(0.5)
    this.min.copy(center).sub(halfSize)
    this.max.copy(center).add(halfSize)

    return this
  }

  /**
   * Return a new 2d box with the same min and max as this one.
   * @returns Return a new 2d box with the same min and max as this one.
   */
  clone() {
    return new AcGeBox2d().copy(this)
  }

  /**
   * Copy the min and max from box to this box.
   * @param box Input the box to copy from
   * @returns Return this box
   */
  copy(box: AcGeBox2d) {
    this.min.copy(box.min)
    this.max.copy(box.max)

    return this
  }

  /**
   * Make this box empty.
   * @returns Return this box
   */
  makeEmpty() {
    this.min.x = this.min.y = +Infinity
    this.max.x = this.max.y = -Infinity

    return this
  }

  /**
   * Return true if this box includes zero points within its bounds. Note that a box with equal lower
   * and upper bounds still includes one point, the one both bounds share.
   * @returns Return true if this box includes zero points within its bounds.
   */
  isEmpty() {
    // this is a more robust check for empty than ( volume <= 0 ) because volume can get positive with two negative axes

    return this.max.x < this.min.x || this.max.y < this.min.y
  }

  /**
   * Return the center point of the box as a 2d vector.
   * @param target Input the result will be copied into this 2d vector.
   * @returns Return the center point of the box as a 2d vector.
   */
  getCenter(target: AcGeVector2d) {
    return this.isEmpty()
      ? target.set(0, 0)
      : target.addVectors(this.min, this.max).multiplyScalar(0.5)
  }

  /**
   * Return the width and height of this box.
   * @param target Input the result will be copied into this 2d vector.
   * @returns Return this box.
   */
  getSize(target: AcGeVector2d) {
    return this.isEmpty()
      ? target.set(0, 0)
      : target.subVectors(this.max, this.min)
  }

  /**
   * Center point of this box
   */
  get center() {
    return this.isEmpty()
      ? new AcGeVector2d(0, 0)
      : new AcGeVector2d(0, 0)
          .addVectors(this.min, this.max)
          .multiplyScalar(0.5)
  }

  /**
   * Return the width, height and depth of this box.
   */
  get size() {
    return this.isEmpty()
      ? new AcGeVector2d(0, 0)
      : new AcGeVector2d(0, 0).subVectors(this.max, this.min)
  }

  /**
   * Expand the boundaries of this box to include point.
   * @param point Input one point that should be included in the box.
   * @returns Return this box
   */
  expandByPoint(point: AcGeVector2dLike) {
    this.min.min(point)
    this.max.max(point)

    return this
  }

  /**
   * Expand this box equilaterally by vector. The width of this box will be expanded by the x component
   * of vector in both directions. The height of this box will be expanded by the y component of vector
   * in both directions.
   * @param vector Input 2d vector to expand the box by.
   * @returns Return this box
   */
  expandByVector(vector: AcGeVector2dLike) {
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
   * @param point Input 2d point to check for inclusion.
   * @returns Return true if the specified point lies within or on the boundaries of this box.
   */
  containsPoint(point: AcGeVector2dLike) {
    return point.x < this.min.x ||
      point.x > this.max.x ||
      point.y < this.min.y ||
      point.y > this.max.y
      ? false
      : true
  }

  /**
   * Return true if this box includes the entirety of box. If this and box are identical,
   * this function also returns true.
   * @param box Input 2d box to test for inclusion.
   * @returns Return true if this box includes the entirety of box.
   */
  containsBox(box: AcGeBox2d) {
    return (
      this.min.x <= box.min.x &&
      box.max.x <= this.max.x &&
      this.min.y <= box.min.y &&
      box.max.y <= this.max.y
    )
  }

  /**
   * Return a point as a proportion of this box's width and height.
   * @param point Input one point
   * @param target Input the result will be copied into this 2d vector.
   * @returns Return a point as a proportion of this box's width and height.
   */
  getParameter(point: AcGeVector2dLike, target: AcGeVector2d) {
    // This can potentially have a divide by zero if the box
    // has a size dimension of 0.

    return target.set(
      (point.x - this.min.x) / (this.max.x - this.min.x),
      (point.y - this.min.y) / (this.max.y - this.min.y)
    )
  }

  /**
   * Determine whether or not this box intersects box.
   * @param box Input 2d box to check for intersection against.
   * @returns Return true if this box intersects box.
   */
  intersectsBox(box: AcGeBox2d) {
    // using 4 splitting planes to rule out intersections

    return box.max.x < this.min.x ||
      box.min.x > this.max.x ||
      box.max.y < this.min.y ||
      box.min.y > this.max.y
      ? false
      : true
  }

  /**
   * Clamp the point within the bounds of this box.
   * @param point Input one 2d point
   * @param target Input the result will be copied into this Vector2.
   * @returns Return the target
   */
  clampPoint(point: AcGeVector2dLike, target: AcGeVector2d) {
    return target.copy(point).clamp(this.min, this.max)
  }

  /**
   * Return the distance from any edge of this box to the specified point. If the point lies inside of
   * this box, the distance will be 0.
   * @param point Input 2d vector to measure distance to.
   * @returns Return the distance from any edge of this box to the specified point.
   */
  distanceToPoint(point: AcGeVector2dLike) {
    return this.clampPoint(point, _vector).distanceTo(point)
  }

  /**
   * Return the intersection of this and box, setting the upper bound of this box to the lesser of the
   * two boxes' upper bounds and the lower bound of this box to the greater of the two boxes' lower bounds.
   * @param box Input box to intersect with
   * @returns Return this box
   */
  intersect(box: AcGeBox2d) {
    this.min.max(box.min)
    this.max.min(box.max)

    if (this.isEmpty()) this.makeEmpty()

    return this
  }

  /**
   * Union this box with box, setting the upper bound of this box to the greater of the two boxes' upper
   * bounds and the lower bound of this box to the lesser of the two boxes' lower bounds.
   * @param box Input the box that will be unioned with this box.
   * @returns Return this box
   */
  union(box: AcGeBox2d) {
    this.min.min(box.min)
    this.max.max(box.max)

    return this
  }

  /**
   * Add offset to both the upper and lower bounds of this box, effectively moving this box offset units
   * in 2D space.
   * @param offset Input direction and distance of offset.
   * @returns Return this box
   */
  translate(offset: AcGeVector2dLike) {
    this.min.add(offset)
    this.max.add(offset)

    return this
  }

  /**
   * Return true if this box and box share the same lower and upper bounds.
   * @param box Input box to compare with this one.
   * @returns Return true if this box and box share the same lower and upper bounds.
   */
  equals(box: AcGeBox2d) {
    return box.min.equals(this.min) && box.max.equals(this.max)
  }
}
