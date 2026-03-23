import { AcCmErrors } from '@mlightcad/common'

import { AcGeEuler } from './AcGeEuler'
import { AcGeMatrix2d } from './AcGeMatrix2d'
import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGeQuaternion } from './AcGeQuaternion'
import { AcGeVectorLike } from './AcGeVector'

/**
 * The interface representing a vector in 3-dimensional space.
 */
export interface AcGeVector3dLike {
  /**
   * X coordinate of the 3d vector
   */
  x: number
  /**
   * Y coordinate of the 3d vector
   */
  y: number
  /**
   * Z coordinate of the 3d vector
   */
  z: number
}

/**
 * Class representing a vector in 3-dimensional space. A 3d vector is an ordered triplet of
 * numbers (labeled x, y, and z).
 */
export class AcGeVector3d {
  /**
   * Origin
   */
  static ORIGIN = Object.freeze(new AcGeVector3d(0, 0, 0))
  /**
   * X-Axis
   */
  static X_AXIS = Object.freeze(new AcGeVector3d(1, 0, 0))
  /**
   * Negative X-Axis
   */
  static NEGATIVE_X_AXIS = Object.freeze(new AcGeVector3d(-1, 0, 0))
  /**
   * Y-Axis
   */
  static Y_AXIS = Object.freeze(new AcGeVector3d(0, 1, 0))
  /**
   * Negative Y-Axis
   */
  static NEGATIVE_Y_AXIS = Object.freeze(new AcGeVector3d(0, -1, 0))
  /**
   * Z-Axis
   */
  static Z_AXIS = Object.freeze(new AcGeVector3d(0, 0, 1))
  /**
   * Negative Z-Axis
   */
  static NEGATIVE_Z_AXIS = Object.freeze(new AcGeVector3d(0, 0, -1))
  /**
   * X coordinate of the vector
   */
  public x: number
  /**
   * Y coordinate of the vector
   */
  public y: number
  /**
   * Z coordinate of the vector
   */
  public z: number

  constructor()
  constructor(x: number, y: number, z: number)
  constructor(other: AcGeVectorLike)
  constructor(other: [number, number, number])
  /**
   * Vector may be constructed by three points, or by three float numbers,
   * or by array of three numbers
   */
  constructor(a?: unknown, b?: unknown, c?: unknown) {
    this.x = 0
    this.y = 0
    this.z = 0

    const argsLength =
      +(a !== undefined) + +(b !== undefined) + +(c !== undefined)

    if (argsLength === 0) {
      return
    }

    if (argsLength === 1 && a instanceof Array) {
      this.x = a[0]
      this.y = a[1]
      this.z = a[2]
      return
    }

    if (argsLength === 1) {
      const { x, y, z } = a as AcGeVectorLike
      this.x = x
      this.y = y
      this.z = z || 0
      return
    }

    if (argsLength === 3) {
      this.x = a as number
      this.y = b as number
      this.z = c as number
      return
    }

    throw AcCmErrors.ILLEGAL_PARAMETERS
  }

  /**
   * Sets the x, y and z components of this vector.
   * @param x Input the x components of this vector.
   * @param y Input the y components of this vector.
   * @param z Input the z components of this vector.
   * @returns Return this vector
   */
  set(x: number, y: number, z: number) {
    if (z === undefined) z = this.z // sprite.scale.set(x,y)

    this.x = x
    this.y = y
    this.z = z

    return this
  }

  /**
   * Set the x, y and z values of this vector both equal to scalar.
   * @param scalar Input a scalar value
   * @returns Return this vector
   */
  setScalar(scalar: number) {
    this.x = scalar
    this.y = scalar
    this.z = scalar

    return this
  }

  /**
   * Replace this vector's x value with x.
   * @param x Input the new vector's x value
   * @returns Return this vector
   */
  setX(x: number) {
    this.x = x

    return this
  }

  /**
   * Replace this vector's y value with y.
   * @param y Input the new vector's y value
   * @returns Return this vector
   */
  setY(y: number) {
    this.y = y

    return this
  }

  /**
   * Replace this vector's z value with z.
   * @param z Input the new vector's z value
   * @returns Return this vector
   */
  setZ(z: number) {
    this.z = z

    return this
  }

  /**
   * Set vector component by index - 0, 1 or 2.
   * - If index equals 0 set x to value.
   * - If index equals 1 set y to value.
   * - If index equals 2 set z to value
   * @param index Input index value - 0, 1 or 2.
   * @param value Input value to be set
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
      case 2:
        this.z = value
        break
      default:
        throw new Error('index is out of range: ' + index)
    }

    return this
  }

  /**
   * Return vector component by index - 0, 1 or 2.
   * - If index equals 0 returns the x value.
   * - If index equals 1 returns the y value.
   * - If index equals 2 returns the z value.
   * @param index Input index value - 0, 1 or 2.
   * @returns Return vector component with the specified index
   */
  getComponent(index: number) {
    switch (index) {
      case 0:
        return this.x
      case 1:
        return this.y
      case 2:
        return this.z
      default:
        throw new Error('index is out of range: ' + index)
    }
  }

  /**
   * Return a new vector3 with the same x, y and z values as this one.
   * @returns Return a new vector3 with the same x, y and z values as this one.
   */
  clone() {
    return new AcGeVector3d(this.x, this.y, this.z)
  }

  /**
   * Copy the values of the passed vector3's x, y and z properties to this vector3.
   * @param v Input the vector to copy
   * @returns Return this vector
   */
  copy(v: AcGeVectorLike) {
    this.x = v.x
    this.y = v.y
    this.z = v.z || 0

    return this
  }

  /**
   * Add the specified 3d vector to this vector.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  add(v: AcGeVectorLike) {
    this.x += v.x
    this.y += v.y
    this.z += v.z || 0
    return this
  }

  /**
   * Add the scalar value s to this vector's x, y and z values.
   * @param s Input a scalar value
   * @returns Return this vector
   */
  addScalar(s: number) {
    this.x += s
    this.y += s
    this.z += s
    return this
  }

  /**
   * Set this vector to a + b.
   * @param a Input the first 3d vector
   * @param b Input the second 3d vector
   * @returns Return this vector
   */
  addVectors(a: AcGeVector3dLike, b: AcGeVector3dLike) {
    this.x = a.x + b.x
    this.y = a.y + b.y
    this.z = a.z + b.z
    return this
  }

  /**
   * Add the multiple of v and s to this vector.
   * @param v Input a 3d vector
   * @param s Input a scalar value
   * @returns Return this vector
   */
  addScaledVector(v: AcGeVector3dLike, s: number) {
    this.x += v.x * s
    this.y += v.y * s
    this.z += v.z * s
    return this
  }

  /**
   * Subtract v from this vector.
   * @param v Input a 3d vector to subtract
   * @returns Return this vector
   */
  sub(v: AcGeVector3dLike) {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z

    return this
  }

  /**
   * Subtract s from this vector's x, y and z components.
   * @param s Input a number value to substract
   * @returns Return this vector
   */
  subScalar(s: number) {
    this.x -= s
    this.y -= s
    this.z -= s

    return this
  }

  /**
   * Set this vector to a - b.
   * @param a Input a 3d vector
   * @param b Input a 3d vector
   * @returns Return this vector
   */
  subVectors(a: AcGeVector3dLike, b: AcGeVector3dLike) {
    this.x = a.x - b.x
    this.y = a.y - b.y
    this.z = a.z - b.z
    return this
  }

  /**
   * Multiply this vector by v.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  multiply(v: AcGeVector3dLike) {
    this.x *= v.x
    this.y *= v.y
    this.z *= v.z
    return this
  }

  /**
   * Multiply this vector by scalar s.
   * @param scalar Input a scalar value
   * @returns Return this vector
   */
  multiplyScalar(scalar: number) {
    this.x *= scalar
    this.y *= scalar
    this.z *= scalar

    return this
  }

  /**
   * Set this vector equal to a * b, component-wise.
   * @param a Input a 3d vector
   * @param b Input a 3d vector
   * @returns Return this vector
   */
  multiplyVectors(a: AcGeVector3dLike, b: AcGeVector3dLike) {
    this.x = a.x * b.x
    this.y = a.y * b.y
    this.z = a.z * b.z

    return this
  }

  /**
   * Apply euler transform to this vector by converting the Euler object to a Quaternion and applying.
   * @param euler Input an euler object
   * @returns Return this vector
   */
  applyEuler(euler: AcGeEuler) {
    return this.applyQuaternion(_quaternion.setFromEuler(euler))
  }

  /**
   * Apply a rotation specified by an axis and an angle to this vector.
   * @param axis Input a normalized Vector3.
   * @param angle Input an angle in radians.
   * @returns Return this vector
   */
  applyAxisAngle(axis: AcGeVector3dLike, angle: number) {
    return this.applyQuaternion(_quaternion.setFromAxisAngle(axis, angle))
  }

  /**
   * Multipliy this vector by m
   * @param m Input a 3*3 matrix
   * @returns Return this vector
   */
  applyMatrix3(m: AcGeMatrix2d) {
    const x = this.x,
      y = this.y,
      z = this.z
    const e = m.elements

    this.x = e[0] * x + e[3] * y + e[6] * z
    this.y = e[1] * x + e[4] * y + e[7] * z
    this.z = e[2] * x + e[5] * y + e[8] * z

    return this
  }

  /**
   * Multiply this vector by normal matrix m and normalizes the result.
   * @param m Input one normal matrix
   * @returns Return this vector
   */
  applyNormalMatrix(m: AcGeMatrix2d) {
    return this.applyMatrix3(m).normalize()
  }

  /**
   * Multiplies this vector (with an implicit 1 in the 4th dimension) by m, and divides by perspective.
   * @param m Input one 4x4 matrix
   * @returns Return this vector
   */
  applyMatrix4(m: AcGeMatrix3d) {
    const x = this.x,
      y = this.y,
      z = this.z
    const e = m.elements

    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15])

    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w

    return this
  }

  /**
   * Apply a quaternion transform to this vector.
   * @param q Input one quaternion transform
   * @returns Return this vector
   */
  applyQuaternion(q: AcGeQuaternion) {
    // quaternion q is assumed to have unit length

    const vx = this.x,
      vy = this.y,
      vz = this.z
    const qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w

    // t = 2 * cross( q.xyz, v );
    const tx = 2 * (qy * vz - qz * vy)
    const ty = 2 * (qz * vx - qx * vz)
    const tz = 2 * (qx * vy - qy * vx)

    // v + q.w * t + cross( q.xyz, t );
    this.x = vx + qw * tx + qy * tz - qz * ty
    this.y = vy + qw * ty + qz * tx - qx * tz
    this.z = vz + qw * tz + qx * ty - qy * tx

    return this
  }

  /**
   * Transforms the direction of this vector by a matrix (the upper left 3 x 3 subset of a m) and
   * then normalizes the result.
   * @param m
   * @returns
   */
  transformDirection(m: AcGeMatrix3d) {
    // input: THREE.Matrix4 affine matrix
    // vector interpreted as a direction

    const x = this.x,
      y = this.y,
      z = this.z
    const e = m.elements

    this.x = e[0] * x + e[4] * y + e[8] * z
    this.y = e[1] * x + e[5] * y + e[9] * z
    this.z = e[2] * x + e[6] * y + e[10] * z

    return this.normalize()
  }

  /**
   * Divide this vector by v.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  divide(v: AcGeVector3dLike) {
    this.x /= v.x
    this.y /= v.y
    this.z /= v.z

    return this
  }

  /**
   * Divide this vector by scalar s.
   * @param scalar Input a scalar value
   * @returns Return this vector
   */
  divideScalar(scalar: number) {
    return this.multiplyScalar(1 / scalar)
  }

  /**
   * If this vector's x, y or z value is greater than v's x, y or z value, replace that value with
   * the corresponding min value.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  min(v: AcGeVector3dLike) {
    this.x = Math.min(this.x, v.x)
    this.y = Math.min(this.y, v.y)
    this.z = Math.min(this.z, v.z)

    return this
  }

  /**
   * If this vector's x, y or z value is less than v's x, y or z value, replace that value with
   * the corresponding max value.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  max(v: AcGeVector3dLike) {
    this.x = Math.max(this.x, v.x)
    this.y = Math.max(this.y, v.y)
    this.z = Math.max(this.z, v.z)

    return this
  }

  /**
   * If this vector's x, y or z value is greater than the max vector's x, y or z value, it is
   * replaced by the corresponding value. If this vector's x, y or z value is less than the min
   * vector's x, y or z value, it is replaced by the corresponding value.
   * @param min Input the minimum x, y and z values.
   * @param max Input the maximum x, y and z values in the desired range
   * @returns Return this vector
   */
  clamp(min: AcGeVector3dLike, max: AcGeVector3dLike) {
    // assumes min < max, componentwise

    this.x = Math.max(min.x, Math.min(max.x, this.x))
    this.y = Math.max(min.y, Math.min(max.y, this.y))
    this.z = Math.max(min.z, Math.min(max.z, this.z))

    return this
  }

  /**
   * If this vector's x, y or z values are greater than the max value, they are replaced by the
   * max value. If this vector's x, y or z values are less than the min value, they are replaced
   * by the min value.
   * @param minVal Input the minimum value the components will be clamped to
   * @param maxVal Input the maximum value the components will be clamped to
   * @returns Return this vector
   */
  clampScalar(minVal: number, maxVal: number) {
    this.x = Math.max(minVal, Math.min(maxVal, this.x))
    this.y = Math.max(minVal, Math.min(maxVal, this.y))
    this.z = Math.max(minVal, Math.min(maxVal, this.z))

    return this
  }

  /**
   * If this vector's length is greater than the max value, the vector will be scaled down so
   * its length is the max value. If this vector's length is less than the min value, the vector
   * will be scaled up so its length is the min value.
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
    this.z = Math.floor(this.z)

    return this
  }

  /**
   * The x, y and z components of this vector are rounded up to the nearest integer value.
   * @returns Return this vector
   */
  ceil() {
    this.x = Math.ceil(this.x)
    this.y = Math.ceil(this.y)
    this.z = Math.ceil(this.z)

    return this
  }

  /**
   * The components of this vector are rounded to the nearest integer value.
   * @returns Return this vector
   */
  round() {
    this.x = Math.round(this.x)
    this.y = Math.round(this.y)
    this.z = Math.round(this.z)

    return this
  }

  /**
   * The components of this vector are rounded towards zero (up if negative, down if positive)
   * to an integer value.
   * @returns Return this vector
   */
  roundToZero() {
    this.x = Math.trunc(this.x)
    this.y = Math.trunc(this.y)
    this.z = Math.trunc(this.z)

    return this
  }

  /**
   * Inverts this vector - i.e. sets x = -x, y = -y and z = -z.
   * @returns Return this vector
   */
  negate() {
    this.x = -this.x
    this.y = -this.y
    this.z = -this.z

    return this
  }

  /**
   * Calculate the dot product of this vector and v.
   * @param v Input a 3d vector
   * @returns Return the dot product of this vector and v
   */
  dot(v: AcGeVector3dLike) {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  /**
   * Return true if vec is parallel to this vector
   * @param vec Input vector to check parallelism
   * @returns Return true if vec is parallel to this vector
   */
  isParallelTo(vec: AcGeVector3d) {
    const dotProduct = this.dot(vec)
    const magnitudeA = this.length()
    const magnitudeB = vec.length()
    return Math.abs(dotProduct) === magnitudeA * magnitudeB
  }

  /**
   * Compute the square of the Euclidean length (straight-line length) from (0, 0, 0)
   * to (x, y, z). If you are comparing the lengths of vectors, you should compare the
   * length squared instead as it is slightly more efficient to calculate.
   * @returns Return the square of the Euclidean length
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /**
   * Compute the Euclidean length (straight-line length) from (0, 0, 0) to (x, y, z).
   * @returns Return the Euclidean length (straight-line length) from (0, 0, 0) to (x, y, z).
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  /**
   * Compute the Manhattan length of this vector.
   * @returns Return the Manhattan length of this vector.
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z)
  }

  /**
   * Convert this vector to a unit vector - that is, sets it equal to a vector with
   * the same direction as this one, but length 1.
   * @returns Return this vector
   */
  normalize() {
    return this.divideScalar(this.length() || 1)
  }

  /**
   * Set this vector to a vector with the same direction as this one, but length l.
   * @param l Input a lenght value
   * @returns Return this vector
   */
  setLength(l: number) {
    return this.normalize().multiplyScalar(l)
  }

  /**
   * Linearly interpolate between this vector and v, where alpha is the percent distance along
   * the line - alpha = 0 will be this vector, and alpha = 1 will be v.
   * @param v Input vector to interpolate towards
   * @param alpha Input interpolation factor, typically in the closed interval [0, 1]
   * @returns Return this vector
   */
  lerp(v: AcGeVector3dLike, alpha: number) {
    this.x += (v.x - this.x) * alpha
    this.y += (v.y - this.y) * alpha
    this.z += (v.z - this.z) * alpha

    return this
  }

  /**
   * Set this vector to be the vector linearly interpolated between v1 and v2 where alpha is
   * the percent distance along the line connecting the two vectors - alpha = 0 will be v1,
   * and alpha = 1 will be v2.
   * @param v1 Input the starting vector
   * @param v2 Input vector to interpolate towards
   * @param alpha Input interpolation factor, typically in the closed interval [0, 1].
   * @returns Return this vector
   */
  lerpVectors(v1: AcGeVector3dLike, v2: AcGeVector3dLike, alpha: number) {
    this.x = v1.x + (v2.x - v1.x) * alpha
    this.y = v1.y + (v2.y - v1.y) * alpha
    this.z = v1.z + (v2.z - v1.z) * alpha

    return this
  }

  /**
   * Set this vector to cross product of itself and v.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  cross(v: AcGeVector3dLike) {
    return this.crossVectors(this, v)
  }

  /**
   * Set this vector to cross product of a and b.
   * @param a Input a 3d vector
   * @param b Input a 3d vector
   * @returns Return this vector
   */
  crossVectors(a: AcGeVector3dLike, b: AcGeVector3dLike) {
    const ax = a.x,
      ay = a.y,
      az = a.z
    const bx = b.x,
      by = b.y,
      bz = b.z

    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx

    return this
  }

  /**
   * Project this vector onto v.
   * @param v Input a 3d vector
   * @returns Return this vector
   */
  projectOnVector(v: AcGeVector3d) {
    const denominator = v.lengthSq()
    if (denominator === 0) return this.set(0, 0, 0)
    const scalar = v.dot(this) / denominator
    return this.copy(v).multiplyScalar(scalar)
  }

  /**
   * Project this vector onto a plane by subtracting this vector projected onto the plane's normal
   * from this vector.
   * @param planeNormal Input a vector representing a plane normal.
   * @returns Return this vector
   */
  projectOnPlane(planeNormal: AcGeVector3d) {
    _vector.copy(this).projectOnVector(planeNormal)
    return this.sub(_vector)
  }

  /**
   * Reflect this vector off of plane orthogonal to normal. Normal is assumed to have unit length.
   * @param normal Input the normal to the reflecting plane
   * @returns Return this vector
   */
  reflect(normal: AcGeVector3dLike) {
    // reflect incident vector off plane orthogonal to normal
    // normal is assumed to have unit length
    return this.sub(_vector.copy(normal).multiplyScalar(2 * this.dot(normal)))
  }

  /**
   * Return the angle between this vector and vector v in radians.
   * @param v Input a 3d vector
   * @returns Return the angle between this vector and vector v in radians.
   */
  angleTo(v: AcGeVector3d) {
    const denominator = Math.sqrt(this.lengthSq() * v.lengthSq())
    if (denominator === 0) return Math.PI / 2
    const theta = this.dot(v) / denominator

    // clamp, to handle numerical problems
    return Math.acos(Math.max(-1, Math.min(1, theta)))
  }

  /**
   * Compute the distance from this vector to v.
   * @param v Input a 3d vector
   * @returns Return the distance from this vector to v
   */
  distanceTo(v: AcGeVector3dLike) {
    return Math.sqrt(this.distanceToSquared(v))
  }

  /**
   * Compute the squared distance from this vector to v. If you are just comparing the distance
   * with another distance, you should compare the distance squared instead as it is slightly more
   * efficient to calculate.
   * @param v Input a 3d vector
   * @returns Return the squared distance from this vector to v
   */
  distanceToSquared(v: AcGeVector3dLike) {
    const dx = this.x - v.x,
      dy = this.y - v.y,
      dz = this.z - v.z

    return dx * dx + dy * dy + dz * dz
  }

  /**
   * Compute the Manhattan distance from this vector to v.
   * @param v Input a 3d vector
   * @returns Return the Manhattan distance from this vector to v
   */
  manhattanDistanceTo(v: AcGeVector3dLike) {
    return (
      Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z)
    )
  }

  // setFromSpherical(s) {
  //   return this.setFromSphericalCoords(s.radius, s.phi, s.theta)
  // }

  // setFromSphericalCoords(radius, phi, theta) {
  //   const sinPhiRadius = Math.sin(phi) * radius

  //   this.x = sinPhiRadius * Math.sin(theta)
  //   this.y = Math.cos(phi) * radius
  //   this.z = sinPhiRadius * Math.cos(theta)

  //   return this
  // }

  // setFromCylindrical(c) {
  //   return this.setFromCylindricalCoords(c.radius, c.theta, c.y)
  // }

  // setFromCylindricalCoords(radius, theta, y) {
  //   this.x = radius * Math.sin(theta)
  //   this.y = y
  //   this.z = radius * Math.cos(theta)

  //   return this
  // }

  /**
   * Set this vector to the position elements of the transformation matrix m.
   * @param m Input one 4x4 matrix
   * @returns Return this vector
   */
  setFromMatrixPosition(m: AcGeMatrix3d) {
    const e = m.elements

    this.x = e[12]
    this.y = e[13]
    this.z = e[14]

    return this
  }

  /**
   * Set this vector to the scale elements of the transformation matrix m.
   * @param m Input one 4x4 matrix
   * @returns Return this vector
   */
  setFromMatrixScale(m: AcGeMatrix3d) {
    const sx = this.setFromMatrixColumn(m, 0).length()
    const sy = this.setFromMatrixColumn(m, 1).length()
    const sz = this.setFromMatrixColumn(m, 2).length()

    this.x = sx
    this.y = sy
    this.z = sz

    return this
  }

  /**
   * Set this vector's x, y and z components from index column of matrix.
   * @param m Input one 4x4 matrix
   * @param index Input column index
   * @returns Return this vector
   */
  setFromMatrixColumn(m: AcGeMatrix3d, index: number) {
    return this.fromArray(m.elements, index * 4)
  }

  /**
   * Set this vector's x, y and z components from index column of matrix.
   * @param m Input one 3x3 matrix
   * @param index Input column index
   * @returns Return this vector
   */
  setFromMatrix3Column(m: AcGeMatrix2d, index: number) {
    return this.fromArray(m.elements, index * 3)
  }

  /**
   * Return true if the components of this vector and v are strictly equal; false otherwise.
   * @param v Input a 3d vector
   * @returns Return true if the components of this vector and v are strictly equal; false otherwise.
   */
  equals(v: AcGeVector3dLike) {
    return v.x === this.x && v.y === this.y && v.z === this.z
  }

  /**
   * Set this vector's x value to be array[ offset + 0 ], y value to be array[ offset + 1 ] and
   * z value to be array[ offset + 2 ].
   * @param array Input the source array.
   * @param offset (optional) Input offset into the array. Default is 0.
   * @returns Return this vector
   */
  fromArray(array: number[], offset: number = 0) {
    this.x = array[offset]
    this.y = array[offset + 1]
    this.z = array[offset + 2]

    return this
  }

  /**
   * Return an array [x, y, z], or copies x, y and z into the provided array.
   * @param array  (optional) Input array to store this vector to. If this is not provided a new array will be created.
   * @param offset (optional) Input optional offset into the array.
   * @returns Return an array [x, y, z], or copies x, y and z into the provided array.
   */
  toArray(array: number[] | Float32Array = [], offset = 0) {
    array[offset] = this.x
    array[offset + 1] = this.y
    array[offset + 2] = this.z

    return array
  }

  /**
   * Set each component of this vector to a pseudo-random value between 0 and 1, excluding 1.
   * @returns Return this vector
   */
  random() {
    this.x = Math.random()
    this.y = Math.random()
    this.z = Math.random()

    return this
  }

  /**
   * Set this vector to a uniformly random point on a unit sphere.
   * @returns Return this vector
   */
  randomDirection() {
    // https://mathworld.wolfram.com/SpherePointPicking.html

    const theta = Math.random() * Math.PI * 2
    const u = Math.random() * 2 - 1
    const c = Math.sqrt(1 - u * u)

    this.x = c * Math.cos(theta)
    this.y = u
    this.z = c * Math.sin(theta)

    return this
  }

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
    yield this.z
  }
}

const _vector = /*@__PURE__*/ new AcGeVector3d()
const _quaternion = /*@__PURE__*/ new AcGeQuaternion()
