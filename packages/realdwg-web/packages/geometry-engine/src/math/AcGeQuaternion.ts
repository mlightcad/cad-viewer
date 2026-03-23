import * as MathUtils from '../util'
import { AcGeEuler } from './AcGeEuler'
import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGeVector3d, AcGeVector3dLike } from './AcGeVector3d'

export class AcGeQuaternion {
  private _x: number
  private _y: number
  private _z: number
  private _w: number

  /**
   * Create one instance of this class
   * @param x Input x coordinate
   * @param y Input y coordinate
   * @param z Input z coordinate
   * @param w Input w coordinate
   */
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this._x = x
    this._y = y
    this._z = z
    this._w = w
  }

  /**
   * This SLERP implementation assumes the quaternion data are managed in flat arrays.
   * @param dst Input the output array
   * @param dstOffset Input an offset into the output array
   * @param src0 Input the source array of the starting quaternion.
   * @param srcOffset0 Input an offset into the array src0.
   * @param src1 Input the source array of the target quaternion.
   * @param srcOffset1 Input an offset into the array src1.
   * @param t Input normalized interpolation factor (between 0 and 1).
   */
  static slerpFlat(
    dst: number[],
    dstOffset: number,
    src0: number[],
    srcOffset0: number,
    src1: number[],
    srcOffset1: number,
    t: number
  ) {
    // fuzz-free, array-based Quaternion SLERP operation
    let x0 = src0[srcOffset0 + 0],
      y0 = src0[srcOffset0 + 1],
      z0 = src0[srcOffset0 + 2],
      w0 = src0[srcOffset0 + 3]

    const x1 = src1[srcOffset1 + 0],
      y1 = src1[srcOffset1 + 1],
      z1 = src1[srcOffset1 + 2],
      w1 = src1[srcOffset1 + 3]

    if (t === 0) {
      dst[dstOffset + 0] = x0
      dst[dstOffset + 1] = y0
      dst[dstOffset + 2] = z0
      dst[dstOffset + 3] = w0
      return
    }

    if (t === 1) {
      dst[dstOffset + 0] = x1
      dst[dstOffset + 1] = y1
      dst[dstOffset + 2] = z1
      dst[dstOffset + 3] = w1
      return
    }

    if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
      let s = 1 - t
      const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,
        dir = cos >= 0 ? 1 : -1,
        sqrSin = 1 - cos * cos

      // Skip the Slerp for tiny steps to avoid numeric problems:
      if (sqrSin > Number.EPSILON) {
        const sin = Math.sqrt(sqrSin),
          len = Math.atan2(sin, cos * dir)

        s = Math.sin(s * len) / sin
        t = Math.sin(t * len) / sin
      }

      const tDir = t * dir

      x0 = x0 * s + x1 * tDir
      y0 = y0 * s + y1 * tDir
      z0 = z0 * s + z1 * tDir
      w0 = w0 * s + w1 * tDir

      // Normalize in case we just did a lerp:
      if (s === 1 - t) {
        const f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0)
        x0 *= f
        y0 *= f
        z0 *= f
        w0 *= f
      }
    }

    dst[dstOffset] = x0
    dst[dstOffset + 1] = y0
    dst[dstOffset + 2] = z0
    dst[dstOffset + 3] = w0
  }

  /**
   * This multiplication implementation assumes the quaternion data are managed in flat arrays.
   * @param dst Input the output array.
   * @param dstOffset Input an offset into the output array.
   * @param src0 Input the source array of the starting quaternion.
   * @param srcOffset0 Input an offset into the array src0.
   * @param src1 Input the source array of the target quaternion.
   * @param srcOffset1 Input an offset into the array src1.
   * @returns Return an array
   */
  static multiplyQuaternionsFlat(
    dst: number[],
    dstOffset: number,
    src0: number[],
    srcOffset0: number,
    src1: number[],
    srcOffset1: number
  ) {
    const x0 = src0[srcOffset0]
    const y0 = src0[srcOffset0 + 1]
    const z0 = src0[srcOffset0 + 2]
    const w0 = src0[srcOffset0 + 3]

    const x1 = src1[srcOffset1]
    const y1 = src1[srcOffset1 + 1]
    const z1 = src1[srcOffset1 + 2]
    const w1 = src1[srcOffset1 + 3]

    dst[dstOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1
    dst[dstOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1
    dst[dstOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1
    dst[dstOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1

    return dst
  }

  /**
   * X cooridinate
   */
  get x() {
    return this._x
  }
  set x(value) {
    this._x = value
    this._onChangeCallback()
  }

  /**
   * Y cooridinate
   */
  get y() {
    return this._y
  }
  set y(value) {
    this._y = value
    this._onChangeCallback()
  }

  /**
   * Z cooridinate
   */
  get z() {
    return this._z
  }
  set z(value) {
    this._z = value
    this._onChangeCallback()
  }

  /**
   * W cooridinate
   */
  get w() {
    return this._w
  }
  set w(value) {
    this._w = value
    this._onChangeCallback()
  }

  /**
   * Set x, y, z, w properties of this quaternion.
   * @param x Input x coordinate
   * @param y Input y coordinate
   * @param z Input z coordinate
   * @param w Input w coordinate
   * @returns Return this quaternion
   */
  set(x: number, y: number, z: number, w: number) {
    this._x = x
    this._y = y
    this._z = z
    this._w = w

    this._onChangeCallback()

    return this
  }

  /**
   * Create a new quaternion with identical x, y, z and w properties to this one.
   * @returns Return cloned instance
   */
  clone() {
    return new AcGeQuaternion(this._x, this._y, this._z, this._w)
  }

  /**
   * Copy the x, y, z and w properties of q into this quaternion.
   * @param quaternion Input the quaternion copied from
   * @returns Return this quaternion
   */
  copy(quaternion: AcGeQuaternion) {
    this._x = quaternion.x
    this._y = quaternion.y
    this._z = quaternion.z
    this._w = quaternion.w

    this._onChangeCallback()
    return this
  }

  /**
   * Sets this quaternion from the rotation specified by euler angle.
   * @param euler Input one euler angle
   * @param update Input one flag whether to trigger change callback function
   * @returns Return this quaternion
   */
  setFromEuler(euler: AcGeEuler, update = true) {
    const x = euler.x,
      y = euler.y,
      z = euler.z,
      order = euler.order

    // http://www.mathworks.com/matlabcentral/fileexchange/
    // 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //	content/SpinCalc.m

    const cos = Math.cos
    const sin = Math.sin

    const c1 = cos(x / 2)
    const c2 = cos(y / 2)
    const c3 = cos(z / 2)

    const s1 = sin(x / 2)
    const s2 = sin(y / 2)
    const s3 = sin(z / 2)

    switch (order) {
      case 'XYZ':
        this._x = s1 * c2 * c3 + c1 * s2 * s3
        this._y = c1 * s2 * c3 - s1 * c2 * s3
        this._z = c1 * c2 * s3 + s1 * s2 * c3
        this._w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'YXZ':
        this._x = s1 * c2 * c3 + c1 * s2 * s3
        this._y = c1 * s2 * c3 - s1 * c2 * s3
        this._z = c1 * c2 * s3 - s1 * s2 * c3
        this._w = c1 * c2 * c3 + s1 * s2 * s3
        break

      case 'ZXY':
        this._x = s1 * c2 * c3 - c1 * s2 * s3
        this._y = c1 * s2 * c3 + s1 * c2 * s3
        this._z = c1 * c2 * s3 + s1 * s2 * c3
        this._w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'ZYX':
        this._x = s1 * c2 * c3 - c1 * s2 * s3
        this._y = c1 * s2 * c3 + s1 * c2 * s3
        this._z = c1 * c2 * s3 - s1 * s2 * c3
        this._w = c1 * c2 * c3 + s1 * s2 * s3
        break

      case 'YZX':
        this._x = s1 * c2 * c3 + c1 * s2 * s3
        this._y = c1 * s2 * c3 + s1 * c2 * s3
        this._z = c1 * c2 * s3 - s1 * s2 * c3
        this._w = c1 * c2 * c3 - s1 * s2 * s3
        break

      case 'XZY':
        this._x = s1 * c2 * c3 - c1 * s2 * s3
        this._y = c1 * s2 * c3 - s1 * c2 * s3
        this._z = c1 * c2 * s3 + s1 * s2 * c3
        this._w = c1 * c2 * c3 + s1 * s2 * s3
        break

      default:
        console.warn(
          'THREE.Quaternion: .setFromEuler() encountered an unknown order: ' +
            order
        )
    }

    if (update === true) this._onChangeCallback()

    return this
  }

  /**
   * Set this quaternion from rotation specified by axis and angle. Axis is assumed to be normalized,
   * angle is in radians.
   * @param axis Input one normalized axis
   * @param angle Input one angle in radians
   * @returns Return this quaternion
   */
  setFromAxisAngle(axis: AcGeVector3dLike, angle: number) {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

    // assumes axis is normalized

    const halfAngle = angle / 2,
      s = Math.sin(halfAngle)

    this._x = axis.x * s
    this._y = axis.y * s
    this._z = axis.z * s
    this._w = Math.cos(halfAngle)

    this._onChangeCallback()

    return this
  }

  /**
   * Set this quaternion from rotation component of the specified matrix.
   * @param m Input a Matrix4 of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @returns Return this quaternion
   */
  setFromRotationMatrix(m: AcGeMatrix3d) {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

    const te = m.elements,
      m11 = te[0],
      m12 = te[4],
      m13 = te[8],
      m21 = te[1],
      m22 = te[5],
      m23 = te[9],
      m31 = te[2],
      m32 = te[6],
      m33 = te[10],
      trace = m11 + m22 + m33

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0)

      this._w = 0.25 / s
      this._x = (m32 - m23) * s
      this._y = (m13 - m31) * s
      this._z = (m21 - m12) * s
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33)

      this._w = (m32 - m23) / s
      this._x = 0.25 * s
      this._y = (m12 + m21) / s
      this._z = (m13 + m31) / s
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33)

      this._w = (m13 - m31) / s
      this._x = (m12 + m21) / s
      this._y = 0.25 * s
      this._z = (m23 + m32) / s
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22)

      this._w = (m21 - m12) / s
      this._x = (m13 + m31) / s
      this._y = (m23 + m32) / s
      this._z = 0.25 * s
    }

    this._onChangeCallback()

    return this
  }

  /**
   * Set this quaternion to the rotation required to rotate direction vector vFrom to direction vector vTo.
   * @param vFrom Input one normalized direction vector
   * @param vTo Input one normalized direction vector
   * @returns Return this quaternion
   */
  setFromUnitVectors(vFrom: AcGeVector3d, vTo: AcGeVector3d) {
    // assumes direction vectors vFrom and vTo are normalized

    let r = vFrom.dot(vTo) + 1

    if (r < Number.EPSILON) {
      // vFrom and vTo point in opposite directions

      r = 0

      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        this._x = -vFrom.y
        this._y = vFrom.x
        this._z = 0
        this._w = r
      } else {
        this._x = 0
        this._y = -vFrom.z
        this._z = vFrom.y
        this._w = r
      }
    } else {
      // crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

      this._x = vFrom.y * vTo.z - vFrom.z * vTo.y
      this._y = vFrom.z * vTo.x - vFrom.x * vTo.z
      this._z = vFrom.x * vTo.y - vFrom.y * vTo.x
      this._w = r
    }

    return this.normalize()
  }

  /**
   * Return the angle between this quaternion and quaternion q in radians.
   * @param q Input one quaternion
   * @returns Return the angle between this quaternion and quaternion q in radians.
   */
  angleTo(q: AcGeQuaternion) {
    return 2 * Math.acos(Math.abs(MathUtils.clamp(this.dot(q), -1, 1)))
  }

  /**
   * Rotate this quaternion by a given angular step to the defined quaternion q. The method ensures
   * that the final quaternion will not overshoot q.
   * @param q Input the target quaternion.
   * @param step Input the angular step in radians.
   * @returns Return this quaternion
   */
  rotateTowards(q: AcGeQuaternion, step: number) {
    const angle = this.angleTo(q)
    if (angle === 0) return this
    const t = Math.min(1, step / angle)
    this.slerp(q, t)
    return this
  }

  /**
   * Set this quaternion to the identity quaternion; that is, to the quaternion that represents
   * "no rotation".
   * @returns Return this quaternion.
   */
  identity() {
    return this.set(0, 0, 0, 1)
  }

  /**
   * Invert this quaternion - calculates the conjugate. The quaternion is assumed to have unit length.
   * @returns Return this quaternion.
   */
  invert() {
    // quaternion is assumed to have unit length
    return this.conjugate()
  }

  /**
   * Return the rotational conjugate of this quaternion. The conjugate of a quaternion represents the
   * same rotation in the opposite direction about the rotational axis.
   * @returns Return this quaternion
   */
  conjugate() {
    this._x *= -1
    this._y *= -1
    this._z *= -1
    this._onChangeCallback()
    return this
  }

  /**
   * Calculate the dot product of quaternions v and this one.
   * @param v Input one quaternion
   * @returns Return the dot product of quaternions v and this one
   */
  dot(v: AcGeQuaternion) {
    return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w
  }

  /**
   * Compute the squared Euclidean length (straight-line length) of this quaternion, considered as a
   * 4 dimensional vector. This can be useful if you are comparing the lengths of two quaternions, as
   * this is a slightly more efficient calculation than length().
   * @returns Return the squared Euclidean length (straight-line length) of this quaternion
   */
  lengthSq() {
    return (
      this._x * this._x +
      this._y * this._y +
      this._z * this._z +
      this._w * this._w
    )
  }

  /**
   * Compute the Euclidean length (straight-line length) of this quaternion, considered as a 4 dimensional
   * vector.
   * @returns Return the Euclidean length (straight-line length) of this quaternion.
   */
  length() {
    return Math.sqrt(
      this._x * this._x +
        this._y * this._y +
        this._z * this._z +
        this._w * this._w
    )
  }

  /**
   * Normalize this quaternion - that is, calculated the quaternion that performs the same rotation as
   * this one, but has length equal to 1.
   * @returns Return this quaternion
   */
  normalize() {
    let l = this.length()

    if (l === 0) {
      this._x = 0
      this._y = 0
      this._z = 0
      this._w = 1
    } else {
      l = 1 / l

      this._x = this._x * l
      this._y = this._y * l
      this._z = this._z * l
      this._w = this._w * l
    }

    this._onChangeCallback()
    return this
  }

  /**
   * Multiply this quaternion by q.
   * @param q Input one quaternion to multiply
   * @returns Return this quaternion
   */
  multiply(q: AcGeQuaternion) {
    return this.multiplyQuaternions(this, q)
  }

  /**
   * Pre-multiply this quaternion by q.
   * @param q Input one quaternion
   * @returns Return this quaternion
   */
  premultiply(q: AcGeQuaternion) {
    return this.multiplyQuaternions(q, this)
  }

  /**
   * Sets this quaternion to a x b.
   * @param a Input one quaternion
   * @param b Input one quaternion
   * @returns Return this quaternion
   */
  multiplyQuaternions(a: AcGeQuaternion, b: AcGeQuaternion) {
    // from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

    const qax = a._x,
      qay = a._y,
      qaz = a._z,
      qaw = a._w
    const qbx = b._x,
      qby = b._y,
      qbz = b._z,
      qbw = b._w

    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz

    this._onChangeCallback()

    return this
  }

  /**
   * Handles the spherical linear interpolation between quaternions. t represents the amount of rotation
   * between this quaternion (where t is 0) and qb (where t is 1).
   * @param qb Input the other quaternion rotation
   * @param t Input interpolation factor in the closed interval [0, 1].
   * @returns Return this quaternion
   */
  slerp(qb: AcGeQuaternion, t: number) {
    if (t === 0) return this
    if (t === 1) return this.copy(qb)

    const x = this._x,
      y = this._y,
      z = this._z,
      w = this._w

    // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

    let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z

    if (cosHalfTheta < 0) {
      this._w = -qb._w
      this._x = -qb._x
      this._y = -qb._y
      this._z = -qb._z

      cosHalfTheta = -cosHalfTheta
    } else {
      this.copy(qb)
    }

    if (cosHalfTheta >= 1.0) {
      this._w = w
      this._x = x
      this._y = y
      this._z = z

      return this
    }

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta

    if (sqrSinHalfTheta <= Number.EPSILON) {
      const s = 1 - t
      this._w = s * w + t * this._w
      this._x = s * x + t * this._x
      this._y = s * y + t * this._y
      this._z = s * z + t * this._z

      this.normalize() // normalize calls _onChangeCallback()

      return this
    }

    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta)
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta)
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta,
      ratioB = Math.sin(t * halfTheta) / sinHalfTheta

    this._w = w * ratioA + this._w * ratioB
    this._x = x * ratioA + this._x * ratioB
    this._y = y * ratioA + this._y * ratioB
    this._z = z * ratioA + this._z * ratioB

    this._onChangeCallback()

    return this
  }

  /**
   * Perform a spherical linear interpolation between the given quaternions and stores the result in
   * this quaternion.
   * @param qa Input one quaternion rotation
   * @param qb Input the other quaternion rotation
   * @param t Input interpolation factor in the closed interval [0, 1].
   * @returns Return this quaternion
   */
  slerpQuaternions(qa: AcGeQuaternion, qb: AcGeQuaternion, t: number) {
    return this.copy(qa).slerp(qb, t)
  }

  /**
   * Set this quaternion to a uniformly random, normalized quaternion.
   * @returns Return this quaternion
   */
  random() {
    // sets this quaternion to a uniform random unit quaternnion

    // Ken Shoemake
    // Uniform random rotations
    // D. Kirk, editor, Graphics Gems III, pages 124-132. Academic Press, New York, 1992.

    const theta1 = 2 * Math.PI * Math.random()
    const theta2 = 2 * Math.PI * Math.random()

    const x0 = Math.random()
    const r1 = Math.sqrt(1 - x0)
    const r2 = Math.sqrt(x0)

    return this.set(
      r1 * Math.sin(theta1),
      r1 * Math.cos(theta1),
      r2 * Math.sin(theta2),
      r2 * Math.cos(theta2)
    )
  }

  /**
   * Compare the x, y, z and w properties of v to the equivalent properties of this quaternion to
   * determine if they represent the same rotation.
   * @param quaternion Input quaternion that this quaternion will be compared to.
   * @returns Return true if the specified quaternion and this quaternion represent the same rotation.
   */
  equals(quaternion: AcGeQuaternion) {
    return (
      quaternion._x === this._x &&
      quaternion._y === this._y &&
      quaternion._z === this._z &&
      quaternion._w === this._w
    )
  }

  /**
   * Set this quaternion's x, y, z and w properties from an array.
   * @param array Input an array of format (x, y, z, w) used to construct the quaternion.
   * @param offset Input an optional offset into the array
   * @returns Return this quaternion
   */
  fromArray(array: number[], offset = 0) {
    this._x = array[offset]
    this._y = array[offset + 1]
    this._z = array[offset + 2]
    this._w = array[offset + 3]

    this._onChangeCallback()

    return this
  }

  /**
   * Return the numerical elements of this quaternion in an array of format [x, y, z, w].
   * @param array Input an optional array to store the quaternion. If not specified, a new array will be created.
   * @param offset (optional) if specified, the result will be copied into this Array.
   * @returns Return an array
   */
  toArray(array: number[] = [], offset = 0) {
    array[offset] = this._x
    array[offset + 1] = this._y
    array[offset + 2] = this._z
    array[offset + 3] = this._w

    return array
  }

  toJSON() {
    return this.toArray()
  }

  _onChange(callback: () => void) {
    this._onChangeCallback = callback

    return this
  }

  _onChangeCallback() {}

  *[Symbol.iterator]() {
    yield this._x
    yield this._y
    yield this._z
    yield this._w
  }
}
