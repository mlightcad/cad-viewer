import { AcCmErrors } from '@mlightcad/common'

import { AcGeMathUtil } from '../util/AcGeMathUtil'
import { AcGeMatrix2d } from './AcGeMatrix2d'
import { AcGePoint2dLike } from './AcGePoint2d'

/**
 * The interface representing a 2d vector.
 */
export interface AcGeVector2dLike {
  /**
   * X coordinate of a 2d vector
   */
  x: number
  /**
   * Y coordinate of a 2d vector
   */
  y: number
}

/**
 * The class representing a 2d vector.
 */
export class AcGeVector2d {
  static EMPTY = Object.freeze(new AcGeVector2d(0, 0))

  /**
   * X coordinate of a vector
   */
  x: number
  /**
   * Y coordinate of a vector
   */
  y: number

  constructor()
  constructor(x: number, y: number)
  constructor(other: AcGeVector2dLike)
  constructor(other: [number, number])
  /**
   * Construct one vector by two numbers
   */
  constructor(a?: unknown, b?: unknown) {
    this.x = 0
    this.y = 0

    const argsLength = +(a !== undefined) + +(b !== undefined)

    if (argsLength === 0) {
      return
    }

    if (argsLength === 1 && a instanceof Array) {
      this.x = a[0]
      this.y = a[1]
      return
    }

    if (argsLength === 1) {
      const { x, y } = a as AcGeVector2dLike
      this.x = x
      this.y = y
      return
    }

    if (argsLength === 2) {
      this.x = a as number
      this.y = b as number
      return
    }

    throw AcCmErrors.ILLEGAL_PARAMETERS
  }

  /**
   * Alias for x.
   */
  get width() {
    return this.x
  }
  set width(value) {
    this.x = value
  }

  /**
   * Alias for y.
   */
  get height() {
    return this.y
  }
  set height(value) {
    this.y = value
  }

  /**
   * Sets the x and y components of this vector.
   * @param x Input x component of this vector
   * @param y Input y component of this vector
   * @returns Return this vector
   */
  set(x: number, y: number) {
    this.x = x
    this.y = y

    return this
  }

  /**
   * Set the x and y values of this vector both equal to scalar.
   * @param scalar Input one scalar value
   * @returns Return this vector
   */
  setScalar(scalar: number) {
    this.x = scalar
    this.y = scalar

    return this
  }

  /**
   * Replace this vector's x value with x.
   * @param x Input new value of x component of this vector
   * @returns Return this vector
   */
  setX(x: number) {
    this.x = x

    return this
  }

  /**
   * Replace this vector's y value with y.
   * @param y Input new value of y component of this vector
   * @returns Return this vector
   */
  setY(y: number) {
    this.y = y

    return this
  }

  /**
   * If index equals 0 set x to value.
   * If index equals 1 set y to value
   * @param index 0 or 1.
   * @param value Input one number
   * @returns Return this vector
   */
  setComponent(index: number, value: number) {
    switch (index) {
      case 0:
        this.x = value
        break
      case 1:
        this.y = value
        break
      default:
        throw new Error('index is out of range: ' + index)
    }

    return this
  }

  /**
   * If index equals 0 returns the x value.
   * If index equals 1 returns the y value.
   * @param index 0 or 1.
   * @returns Return this matrix
   */
  getComponent(index: number) {
    switch (index) {
      case 0:
        return this.x
      case 1:
        return this.y
      default:
        throw new Error('index is out of range: ' + index)
    }
  }

  /**
   * Return a new 2d vector with the same x and y values as this one.
   * @returns Return the cloned vector
   */
  clone() {
    return new AcGeVector2d(this.x, this.y)
  }

  /**
   * Copy the values of the passed vector's x and y properties to this vector.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  copy(v: AcGeVector2dLike) {
    this.x = v.x
    this.y = v.y

    return this
  }

  /**
   * Add v to this vector.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  add(v: AcGeVector2dLike) {
    this.x += v.x
    this.y += v.y

    return this
  }

  /**
   * Add the scalar value s to this vector's x and y values.
   * @param s Input one scalar value
   * @returns Return this vector
   */
  addScalar(s: number) {
    this.x += s
    this.y += s

    return this
  }

  /**
   * Set this vector to a + b.
   * @param a Input one 2d vector
   * @param b Input one 2d vector
   * @returns Return this vector
   */
  addVectors(a: AcGeVector2d, b: AcGeVector2d) {
    this.x = a.x + b.x
    this.y = a.y + b.y

    return this
  }

  /**
   * Add the multiple of v and s to this vector.
   * @param v Input one 2d vector
   * @param s Input one scalar value
   * @returns Return this vector
   */
  addScaledVector(v: AcGeVector2d, s: number) {
    this.x += v.x * s
    this.y += v.y * s

    return this
  }

  /**
   * Subtract v from this vector.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  sub(v: AcGeVector2dLike) {
    this.x -= v.x
    this.y -= v.y

    return this
  }

  /**
   * Subtract s from this vector's x and y components.
   * @param s Input one scalar value
   * @returns Return this vector
   */
  subScalar(s: number) {
    this.x -= s
    this.y -= s
    return this
  }

  /**
   * Sets this vector to a - b.
   * @param a Input one 2d vector
   * @param b Input one 2d vector
   * @returns Return this vector
   */
  subVectors(a: AcGeVector2dLike, b: AcGeVector2dLike) {
    this.x = a.x - b.x
    this.y = a.y - b.y
    return this
  }

  /**
   * Multiply this vector by v.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  multiply(v: AcGeVector2dLike) {
    this.x *= v.x
    this.y *= v.y
    return this
  }

  /**
   * Multiply this vector by scalar s.
   * @param scalar Input one scalar value
   * @returns Return this vector
   */
  multiplyScalar(scalar: number) {
    this.x *= scalar
    this.y *= scalar

    return this
  }

  /**
   * Divide this vector by v.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  divide(v: AcGeVector2d) {
    this.x /= v.x
    this.y /= v.y

    return this
  }

  /**
   * Divide this vector by scalar s.
   * @param scalar Input one scalar value
   * @returns Return this vector
   */
  divideScalar(scalar: number) {
    return this.multiplyScalar(1 / scalar)
  }

  /**
   * Multiply this vector (with an implicit 1 as the 3rd component) by m.
   * @param m Input one 3x3 matrix
   * @returns Return this vector
   */
  applyMatrix2d(m: AcGeMatrix2d) {
    const x = this.x,
      y = this.y
    const e = m.elements

    this.x = e[0] * x + e[3] * y + e[6]
    this.y = e[1] * x + e[4] * y + e[7]

    return this
  }

  /**
   * If this vector's x or y value is greater than v's x or y value, replace that value with the
   * corresponding min value.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  min(v: AcGeVector2dLike) {
    this.x = Math.min(this.x, v.x)
    this.y = Math.min(this.y, v.y)

    return this
  }

  /**
   * If this vector's x or y value is less than v's x or y value, replace that value with the
   * corresponding max value.
   * @param v Input one 2d vector
   * @returns Return this vector
   */
  max(v: AcGeVector2dLike) {
    this.x = Math.max(this.x, v.x)
    this.y = Math.max(this.y, v.y)

    return this
  }

  /**
   * If this vector's x or y value is greater than the max vector's x or y value, it is replaced
   * by the corresponding value.
   * If this vector's x or y value is less than the min vector's x or y value, it is replaced by
   * the corresponding value.
   * @param min Input the minimum x and y values
   * @param max Input the maximum x and y values in the desired range
   * @returns
   */
  clamp(min: AcGeVector2dLike, max: AcGeVector2dLike) {
    // assumes min < max, componentwise

    this.x = Math.max(min.x, Math.min(max.x, this.x))
    this.y = Math.max(min.y, Math.min(max.y, this.y))

    return this
  }

  /**
   * If this vector's x or y values are greater than the max value, they are replaced by the max value.
   * If this vector's x or y values are less than the min value, they are replaced by the min value.
   * @param minVal Input the minimum value the components will be clamped to
   * @param maxVal Input the maximum value the length will be clamped to
   * @returns Return this vector
   */
  clampScalar(minVal: number, maxVal: number) {
    this.x = Math.max(minVal, Math.min(maxVal, this.x))
    this.y = Math.max(minVal, Math.min(maxVal, this.y))

    return this
  }

  /**
   * If this vector's length is greater than the max value, it is replaced by the max value.
   * If this vector's length is less than the min value, it is replaced by the min value.
   * @param min Input the minimum value the length will be clamped to
   * @param max Input the maximum value the length will be clamped to
   * @returns Return this vector
   */
  clampLength(min: number, max: number) {
    const length = this.length()

    return this.divideScalar(length || 1).multiplyScalar(
      Math.max(min, Math.min(max, length))
    )
  }

  /**
   * The components of this vector are rounded down to the nearest integer value.
   * @returns Return this vector
   */
  floor() {
    this.x = Math.floor(this.x)
    this.y = Math.floor(this.y)

    return this
  }

  /**
   * The x and y components of this vector are rounded up to the nearest integer value.
   * @returns Return this vector
   */
  ceil() {
    this.x = Math.ceil(this.x)
    this.y = Math.ceil(this.y)

    return this
  }

  /**
   * The components of this vector are rounded to the nearest integer value.
   * @returns Return this vector
   */
  round() {
    this.x = Math.round(this.x)
    this.y = Math.round(this.y)

    return this
  }

  /**
   * The components of this vector are rounded towards zero (up if negative, down if positive) to
   * an integer value.
   * @returns Return this vector
   */
  roundToZero() {
    this.x = Math.trunc(this.x)
    this.y = Math.trunc(this.y)

    return this
  }

  /**
   * Invert this vector - i.e. sets x = -x and y = -y.
   * @returns Return this vector
   */
  negate() {
    this.x = -this.x
    this.y = -this.y

    return this
  }

  /**
   * Calculate the dot product of this vector and v.
   * @param v Input one 2d vector
   * @returns Return the dot product of this vector and v.
   */
  dot(v: AcGeVector2d) {
    return this.x * v.x + this.y * v.y
  }

  /**
   * Calculate the cross product of this vector and v. Note that a 'cross-product' in 2D is not
   * well-defined. This function computes a geometric cross-product often used in 2D graphics.
   * @param v Input one 2d vector
   * @returns Return the cross product of this vector and v.
   */
  cross(v: AcGeVector2d) {
    return this.x * v.y - this.y * v.x
  }

  /**
   * Compute the square of the Euclidean length (straight-line length) from (0, 0) to (x, y).
   * If you are comparing the lengths of vectors, you should compare the length squared instead
   * as it is slightly more efficient to calculate.
   * @returns Return the square of the Euclidean length (straight-line length) from (0, 0) to (x, y)
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y
  }

  /**
   * Compute the Euclidean length (straight-line length) from (0, 0) to (x, y).
   * @returns Return the Euclidean length (straight-line length) from (0, 0) to (x, y).
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  /**
   * Compute the Manhattan length of this vector.
   * @returns Return the Manhattan length of this vector。
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y)
  }

  /**
   * Converts this vector to a unit vector - that is, sets it equal to a vector with the same
   * direction as this one, but length 1.
   * @returns Return this vector
   */
  normalize() {
    return this.divideScalar(this.length() || 1)
  }

  /**
   * Compute the angle in radians of this vector with respect to the positive x-axis.
   * @returns Return the angle in radians of this vector with respect to the positive x-axis.
   */
  angle() {
    // computes the angle in radians with respect to the positive x-axis
    const angle = Math.atan2(-this.y, -this.x) + Math.PI
    return angle
  }

  /**
   * Return the angle between this vector and vector v in radians.
   * @param v Input one 2d vector
   * @returns Return the angle between this vector and vector v in radians.
   */
  angleTo(v: AcGeVector2d) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq())

    if (denominator === 0) return Math.PI / 2

    const theta = this.dot(v) / denominator

    // clamp, to handle numerical problems
    return Math.acos(Math.max(-1, Math.min(1, theta)))
  }

  /**
   * Compute the distance from this vector to v.
   * @param v Input one 2d vector
   * @returns Return the distance from this vector to v.
   */
  distanceTo(v: AcGeVector2dLike) {
    return Math.sqrt(this.distanceToSquared(v))
  }

  /**
   * Compute the squared distance from this vector to v. If you are just comparing the distance with
   * another distance, you should compare the distance squared instead as it is slightly more efficient
   * to calculate.
   * @param v Input one 2d vector
   * @returns Return the squared distance from this vector to v.
   */
  distanceToSquared(v: AcGeVector2dLike) {
    const dx = this.x - v.x,
      dy = this.y - v.y
    return dx * dx + dy * dy
  }

  /**
   * Compute the Manhattan distance from this vector to v.
   * @param v Input one 2d vector
   * @returns Return the Manhattan distance from this vector to v.
   */
  manhattanDistanceTo(v: AcGeVector2d) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y)
  }

  /**
   * Sets this vector to a vector with the same direction as this one, but length l.
   * @param len Input one sclar value
   * @returns Return this vector
   */
  setLength(len: number) {
    return this.normalize().multiplyScalar(len)
  }

  /**
   * Linearly interpolates between this vector and v, where alpha is the percent distance along the
   * line - alpha = 0 will be this vector, and alpha = 1 will be v.
   * @param v Input 2d vector to interpolate towards.
   * @param alpha Input interpolation factor, typically in the closed interval [0, 1].
   * @returns Return this vector
   */
  lerp(v: AcGeVector2d, alpha: number) {
    this.x += (v.x - this.x) * alpha
    this.y += (v.y - this.y) * alpha

    return this
  }

  /**
   * Sets this vector to be the vector linearly interpolated between v1 and v2 where alpha is the
   * percent distance along the line connecting the two vectors - alpha = 0 will be v1, and
   * alpha = 1 will be v2.
   * @param v1 Input the starting vector.
   * @param v2 Input vector to interpolate towards.
   * @param alpha Input interpolation factor, typically in the closed interval [0, 1].
   * @returns
   */
  lerpVectors(v1: AcGeVector2d, v2: AcGeVector2d, alpha: number) {
    this.x = v1.x + (v2.x - v1.x) * alpha
    this.y = v1.y + (v2.y - v1.y) * alpha

    return this
  }

  /**
   * Return true if the components of this vector and v are strictly equal; false otherwise.
   * @param v Input one 2d vector to compare
   * @returns Return true if the components of this vector and v are strictly equal; false otherwise.
   */
  equals(v: AcGeVector2d) {
    return v.x === this.x && v.y === this.y
  }

  /**
   * Set this vector's x value to be array[ offset ] and y value to be array[ offset + 1 ].
   * @param array Input the source array.
   * @param offset Input (optional) offset into the array. Default is 0.
   * @returns Return this vector
   */
  fromArray(array: number[], offset: number = 0) {
    this.x = array[offset]
    this.y = array[offset + 1]

    return this
  }

  /**
   * Return an array [x, y], or copies x and y into the provided array.
   * @param array Input (optional) array to store this vector to. If this is not provided, a new array will be created.
   * @param offset Input (optional) optional offset into the array.
   * @returns Return an array [x, y], or copies x and y into the provided array.
   */
  toArray(array: number[] = [], offset: number = 0) {
    array[offset] = this.x
    array[offset + 1] = this.y

    return array
  }

  // fromBufferAttribute(attribute, index) {
  //   this.x = attribute.getX(index)
  //   this.y = attribute.getY(index)

  //   return this
  // }

  /**
   * Rotate this vector around center by angle radians.
   * @param center Input the point around which to rotate.
   * @param angle Input the angle to rotate, in radians.
   * @returns Return this vector
   */
  rotateAround(center: AcGePoint2dLike, angle: number) {
    const c = Math.cos(angle),
      s = Math.sin(angle)

    const x = this.x - center.x
    const y = this.y - center.y

    this.x = x * c - y * s + center.x
    this.y = x * s + y * c + center.y

    return this
  }

  /**
   * Set each component of this vector to a pseudo-random value between 0 and 1, excluding 1.
   * @returns Return this vector
   */
  random() {
    this.x = Math.random()
    this.y = Math.random()

    return this
  }

  relativeEps(epsilon = 1.0e-7) {
    return Math.min(
      AcGeMathUtil.relativeEps(this.x, epsilon),
      AcGeMathUtil.relativeEps(this.y, epsilon)
    )
  }

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
  }
}
