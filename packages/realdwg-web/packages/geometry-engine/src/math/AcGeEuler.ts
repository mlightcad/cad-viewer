import { clamp } from '../util'
import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGeQuaternion } from './AcGeQuaternion'
import { AcGeVector3d } from './AcGeVector3d'

const _matrix = /*@__PURE__*/ new AcGeMatrix3d()
const _quaternion = /*@__PURE__*/ new AcGeQuaternion()

export class AcGeEuler {
  static DEFAULT_ORDER = 'XYZ'
  private _x: number
  private _y: number
  private _z: number
  private _order: string

  /**
   * Create one instance of this class
   * @param x (optional) the angle of the x axis in radians. Default is 0.
   * @param y (optional) the angle of the y axis in radians. Default is 0.
   * @param z (optional) the angle of the z axis in radians. Default is 0.
   * @param order (optional) a string representing the order that the rotations are applied,
   * defaults to 'XYZ' (must be upper case).
   */
  constructor(x = 0, y = 0, z = 0, order = AcGeEuler.DEFAULT_ORDER) {
    this._x = x
    this._y = y
    this._z = z
    this._order = order
  }

  /**
   * The current value of the x component.
   */
  get x() {
    return this._x
  }
  set x(value: number) {
    this._x = value
    this._onChangeCallback()
  }

  /**
   * The current value of the y component.
   */
  get y() {
    return this._y
  }
  set y(value: number) {
    this._y = value
    this._onChangeCallback()
  }

  /**
   * The current value of the z component.
   */
  get z() {
    return this._z
  }
  set z(value: number) {
    this._z = value
    this._onChangeCallback()
  }

  /**
   * The order in which to apply rotations. Default is 'XYZ', which means that the object will first be
   * rotated around its X axis, then its Y axis and finally its Z axis. Other possibilities are: 'YZX',
   * 'ZXY', 'XZY', 'YXZ' and 'ZYX'. These must be in upper case.
   *
   * It uses intrinsic Tait-Bryan angles. This means that rotations are performed with respect to the
   * local coordinate system. That is, for order 'XYZ', the rotation is first around the local-X axis
   * (which is the same as the world-X axis), then around local-Y (which may now be different from the
   * world Y-axis), then local-Z (which may be different from the world Z-axis).
   */
  get order() {
    return this._order
  }
  set order(value: string) {
    this._order = value
    this._onChangeCallback()
  }

  /**
   * Set the angles of this euler transform and optionally the order.
   * @param x (optional) the angle of the x axis in radians. Default is 0.
   * @param y (optional) the angle of the y axis in radians. Default is 0.
   * @param z (optional) the angle of the z axis in radians. Default is 0.
   * @param order (optional) a string representing the order that the rotations are applied,
   * defaults to 'XYZ' (must be upper case).
   * @returns Return this euler
   */
  set(x: number, y: number, z: number, order = this._order) {
    this._x = x
    this._y = y
    this._z = z
    this._order = order

    this._onChangeCallback()

    return this
  }

  /**
   * Return a new Euler with the same parameters as this one.
   * @returns Return a new Euler with the same parameters as this one.
   */
  clone() {
    return new AcGeEuler(this._x, this._y, this._z, this._order)
  }

  /**
   * Copy value of euler to this euler.
   * @param euler Input the eurler copied from
   * @returns Return this euler
   */
  copy(euler: AcGeEuler) {
    this._x = euler._x
    this._y = euler._y
    this._z = euler._z
    this._order = euler._order

    this._onChangeCallback()
    return this
  }

  /**
   * Set this euler by exatracting rotation information from the specified matrix.
   * @param m Input a Matrix4 of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @param order (optional) a string representing the order that the rotations are applied. Sets the
   * angles of this euler transform from a pure rotation matrix based on the orientation specified by
   * order.
   * @param update Input one flag to indicate whether to trigger change callback function
   * @returns Return this euler
   */
  setFromRotationMatrix(m: AcGeMatrix3d, order = this._order, update = true) {
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    const te = m.elements
    const m11 = te[0],
      m12 = te[4],
      m13 = te[8]
    const m21 = te[1],
      m22 = te[5],
      m23 = te[9]
    const m31 = te[2],
      m32 = te[6],
      m33 = te[10]

    switch (order) {
      case 'XYZ':
        this._y = Math.asin(clamp(m13, -1, 1))

        if (Math.abs(m13) < 0.9999999) {
          this._x = Math.atan2(-m23, m33)
          this._z = Math.atan2(-m12, m11)
        } else {
          this._x = Math.atan2(m32, m22)
          this._z = 0
        }

        break

      case 'YXZ':
        this._x = Math.asin(-clamp(m23, -1, 1))

        if (Math.abs(m23) < 0.9999999) {
          this._y = Math.atan2(m13, m33)
          this._z = Math.atan2(m21, m22)
        } else {
          this._y = Math.atan2(-m31, m11)
          this._z = 0
        }

        break

      case 'ZXY':
        this._x = Math.asin(clamp(m32, -1, 1))

        if (Math.abs(m32) < 0.9999999) {
          this._y = Math.atan2(-m31, m33)
          this._z = Math.atan2(-m12, m22)
        } else {
          this._y = 0
          this._z = Math.atan2(m21, m11)
        }

        break

      case 'ZYX':
        this._y = Math.asin(-clamp(m31, -1, 1))

        if (Math.abs(m31) < 0.9999999) {
          this._x = Math.atan2(m32, m33)
          this._z = Math.atan2(m21, m11)
        } else {
          this._x = 0
          this._z = Math.atan2(-m12, m22)
        }

        break

      case 'YZX':
        this._z = Math.asin(clamp(m21, -1, 1))

        if (Math.abs(m21) < 0.9999999) {
          this._x = Math.atan2(-m23, m22)
          this._y = Math.atan2(-m31, m11)
        } else {
          this._x = 0
          this._y = Math.atan2(m13, m33)
        }

        break

      case 'XZY':
        this._z = Math.asin(-clamp(m12, -1, 1))

        if (Math.abs(m12) < 0.9999999) {
          this._x = Math.atan2(m32, m22)
          this._y = Math.atan2(m13, m11)
        } else {
          this._x = Math.atan2(-m23, m33)
          this._y = 0
        }

        break

      default:
        console.warn(
          'THREE.Euler: .setFromRotationMatrix() encountered an unknown order: ' +
            order
        )
    }

    this._order = order
    if (update === true) this._onChangeCallback()
    return this
  }

  /**
   * Set this urler from the specified quaternion.
   * @param q Input a normalized quaternion.
   * @param order (optional) a string representing the order that the rotations are applied. Sets the
   * angles of this euler transform from a pure rotation matrix based on the orientation specified by
   * order.
   * @param update Input one flag to indicate whether to trigger change callback function
   * @returns Return this euler
   */
  setFromQuaternion(q: AcGeQuaternion, order: string, update: boolean = true) {
    _matrix.makeRotationFromQuaternion(q)
    return this.setFromRotationMatrix(_matrix, order, update)
  }

  /**
   * Set the x, y and z, and optionally update the order.
   * @param v Input one 3d vector
   * @param order Input a optional string representing the order that the rotations are applied.
   * @returns Return this euler
   */
  setFromVector3(v: AcGeVector3d, order = this._order) {
    return this.set(v.x, v.y, v.z, order)
  }

  /**
   * Resets the euler angle with a new order by creating a quaternion from this euler angle and then
   * setting this euler angle with the quaternion and the new order.
   * @param newOrder Input the new order that the rotations are applied.
   * @returns Return this euler
   */
  reorder(newOrder: string) {
    // WARNING: this discards revolution information -bhouston
    _quaternion.setFromEuler(this)
    return this.setFromQuaternion(_quaternion, newOrder)
  }

  /**
   * Check for strict equality of this euler and euler.
   * @param euler Input the euler to compare
   * @returns Return true if the specified euler and this euler represent the same rotation.
   */
  equals(euler: AcGeEuler) {
    return (
      euler._x === this._x &&
      euler._y === this._y &&
      euler._z === this._z &&
      euler._order === this._order
    )
  }

  /**
   * Set this euler from the specified array.
   * @param array Input an array of length 3 or 4. The optional 4th argument corresponds to the order.
   * - Assign this euler's x angle to array[0].
   * - Assign this euler's y angle to array[1].
   * - Assign this euler's z angle to array[2].
   * - Optionally assign this euler's order to array[3].
   * @returns
   */
  fromArray(array: (number | string)[]) {
    this._x = array[0] as number
    this._y = array[1] as number
    this._z = array[2] as number
    if (array[3] !== undefined) this._order = array[3] as string

    this._onChangeCallback()

    return this
  }

  /**
   * Return an array of the form [x, y, z, order ].
   * @param array Input an optional array to store the euler in.
   * @param offset Input an optional offset in the array.
   * @returns Return an array of the form [x, y, z, order].
   */
  toArray(array: (number | string)[] = [], offset = 0) {
    array[offset] = this._x
    array[offset + 1] = this._y
    array[offset + 2] = this._z
    array[offset + 3] = this._order

    return array
  }

  /**
   * Trigger the specified callback function once this euler changes
   * @param callback
   * @returns
   */
  _onChange(callback: () => void) {
    this._onChangeCallback = callback
    return this
  }

  _onChangeCallback() {}

  *[Symbol.iterator]() {
    yield this._x
    yield this._y
    yield this._z
    yield this._order
  }
}
