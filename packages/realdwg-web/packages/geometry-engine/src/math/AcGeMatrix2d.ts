import { AcGeMatrix3d } from './AcGeMatrix3d'
import { AcGeVector2d } from './AcGeVector2d'
import { AcGeVector3d } from './AcGeVector3d'

/**
 * The class representing a 3x3 matrix.
 */
export class AcGeMatrix2d {
  /**
   * Identity matrix.
   */
  static IDENTITY = Object.freeze(new AcGeMatrix2d())
  /**
   * A column-major list of matrix values.
   */
  elements: number[]

  /**
   * Create a 3x3 matrix with the given arguments in row-major order. If no arguments are provided,
   * the constructor initializes the Matrix3 to the 3x3 identity matrix.
   * @param n11 Input element in the first row and the first column
   * @param n12 Input element in the first row and the second column
   * @param n13 Input element in the first row and the third column
   * @param n21 Input element in the second row and the first column
   * @param n22 Input element in the second row and the second column
   * @param n23 Input element in the second row and the third column
   * @param n31 Input element in the third row and the first column
   * @param n32 Input element in the third row and the second column
   * @param n33 Input element in the third row and the third column
   */
  constructor(
    n11?: number,
    n12?: number,
    n13?: number,
    n21?: number,
    n22?: number,
    n23?: number,
    n31?: number,
    n32?: number,
    n33?: number
  ) {
    this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1]

    if (
      n11 != null &&
      n12 != null &&
      n13 != null &&
      n21 != null &&
      n22 != null &&
      n23 != null &&
      n31 != null &&
      n32 != null &&
      n33 != null
    ) {
      this.set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
    }
  }

  /**
   * Set the 3x3 matrix values to the given row-major sequence of values.
   *
   * @param n11 Input element in the first row and the first column
   * @param n12 Input element in the first row and the second column
   * @param n13 Input element in the first row and the third column
   * @param n21 Input element in the second row and the first column
   * @param n22 Input element in the second row and the second column
   * @param n23 Input element in the second row and the third column
   * @param n31 Input element in the third row and the first column
   * @param n32 Input element in the third row and the second column
   * @param n33 Input element in the third row and the third column
   * @returns Return this matrix
   */
  set(
    n11: number,
    n12: number,
    n13: number,
    n21: number,
    n22: number,
    n23: number,
    n31: number,
    n32: number,
    n33: number
  ) {
    const te = this.elements

    te[0] = n11
    te[1] = n21
    te[2] = n31
    te[3] = n12
    te[4] = n22
    te[5] = n32
    te[6] = n13
    te[7] = n23
    te[8] = n33

    return this
  }

  /**
   * Reset this matrix to the 3x3 identity matrix:
   * @returns Return this matrix
   */
  identity() {
    this.set(1, 0, 0, 0, 1, 0, 0, 0, 1)

    return this
  }

  /**
   * Copy the elements of matrix m into this matrix.
   * @param m Input one matrix copied from
   * @returns Return this matrix
   */
  copy(m: AcGeMatrix2d) {
    const te = this.elements
    const me = m.elements

    te[0] = me[0]
    te[1] = me[1]
    te[2] = me[2]
    te[3] = me[3]
    te[4] = me[4]
    te[5] = me[5]
    te[6] = me[6]
    te[7] = me[7]
    te[8] = me[8]

    return this
  }

  /**
   * Extracts the basis of this matrix into the three axis vectors provided
   * @param xAxis Input X axis vector
   * @param yAxis Input Y axis vector
   * @param zAxis Input Z axis vector
   * @returns Return this matrix
   */
  extractBasis(xAxis: AcGeVector3d, yAxis: AcGeVector3d, zAxis: AcGeVector3d) {
    xAxis.setFromMatrix3Column(this, 0)
    yAxis.setFromMatrix3Column(this, 1)
    zAxis.setFromMatrix3Column(this, 2)

    return this
  }

  /**
   * Set this matrix to the upper 3x3 matrix of the Matrix4 m.
   * @param m Input one 4x4 matrix
   * @returns Return this matrix
   */
  setFromMatrix4(m: AcGeMatrix3d) {
    const me = m.elements

    this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10])

    return this
  }

  /**
   * Post-multiplies this matrix by m.
   * @param m Input one 3x3 matrix
   * @returns Return this matrix
   */
  multiply(m: AcGeMatrix2d) {
    return this.multiplyMatrices(this, m)
  }

  /**
   * Pre-multiplies this matrix by m.
   * @param m Input one 3x3 matrix
   * @returns Return this matrix
   */
  premultiply(m: AcGeMatrix2d) {
    return this.multiplyMatrices(m, this)
  }

  /**
   * Set this matrix to a x b.
   * @param a Input one 3x3 matrix
   * @param b Input one 3x3 matrix
   * @returns Return this matrix
   */
  multiplyMatrices(a: AcGeMatrix2d, b: AcGeMatrix2d) {
    const ae = a.elements
    const be = b.elements
    const te = this.elements

    const a11 = ae[0],
      a12 = ae[3],
      a13 = ae[6]
    const a21 = ae[1],
      a22 = ae[4],
      a23 = ae[7]
    const a31 = ae[2],
      a32 = ae[5],
      a33 = ae[8]

    const b11 = be[0],
      b12 = be[3],
      b13 = be[6]
    const b21 = be[1],
      b22 = be[4],
      b23 = be[7]
    const b31 = be[2],
      b32 = be[5],
      b33 = be[8]

    te[0] = a11 * b11 + a12 * b21 + a13 * b31
    te[3] = a11 * b12 + a12 * b22 + a13 * b32
    te[6] = a11 * b13 + a12 * b23 + a13 * b33

    te[1] = a21 * b11 + a22 * b21 + a23 * b31
    te[4] = a21 * b12 + a22 * b22 + a23 * b32
    te[7] = a21 * b13 + a22 * b23 + a23 * b33

    te[2] = a31 * b11 + a32 * b21 + a33 * b31
    te[5] = a31 * b12 + a32 * b22 + a33 * b32
    te[8] = a31 * b13 + a32 * b23 + a33 * b33

    return this
  }

  /**
   * Multiply every component of the matrix by the scalar value s.
   * @param s Input one scalar value
   * @returns Return this matrix
   */
  multiplyScalar(s: number) {
    const te = this.elements

    te[0] *= s
    te[3] *= s
    te[6] *= s
    te[1] *= s
    te[4] *= s
    te[7] *= s
    te[2] *= s
    te[5] *= s
    te[8] *= s

    return this
  }

  /**
   * Compute and return the determinant of this matrix.
   * @returns Return the determinant of this matrix
   */
  determinant() {
    const te = this.elements

    const a = te[0],
      b = te[1],
      c = te[2],
      d = te[3],
      e = te[4],
      f = te[5],
      g = te[6],
      h = te[7],
      i = te[8]

    return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g
  }

  /**
   * Invert this matrix, using the analytic method. You can not invert with a determinant of zero.
   * If you attempt this, the method produces a zero matrix instead.
   * @returns Return this matrix
   */
  invert() {
    const te = this.elements,
      n11 = te[0],
      n21 = te[1],
      n31 = te[2],
      n12 = te[3],
      n22 = te[4],
      n32 = te[5],
      n13 = te[6],
      n23 = te[7],
      n33 = te[8],
      t11 = n33 * n22 - n32 * n23,
      t12 = n32 * n13 - n33 * n12,
      t13 = n23 * n12 - n22 * n13,
      det = n11 * t11 + n21 * t12 + n31 * t13

    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0)

    const detInv = 1 / det

    te[0] = t11 * detInv
    te[1] = (n31 * n23 - n33 * n21) * detInv
    te[2] = (n32 * n21 - n31 * n22) * detInv

    te[3] = t12 * detInv
    te[4] = (n33 * n11 - n31 * n13) * detInv
    te[5] = (n31 * n12 - n32 * n11) * detInv

    te[6] = t13 * detInv
    te[7] = (n21 * n13 - n23 * n11) * detInv
    te[8] = (n22 * n11 - n21 * n12) * detInv

    return this
  }

  /**
   * Transpose this matrix in place.
   * @returns Return this matrix
   */
  transpose() {
    let tmp
    const m = this.elements

    tmp = m[1]
    m[1] = m[3]
    m[3] = tmp
    tmp = m[2]
    m[2] = m[6]
    m[6] = tmp
    tmp = m[5]
    m[5] = m[7]
    m[7] = tmp

    return this
  }

  /**
   * Sets this matrix as the upper left 3x3 of the normal matrix of the passed matrix4. The normal
   * matrix is the inverse transpose of the matrix m.
   * @param matrix4 Input one 4x4 matrix
   * @returns Return this matrix
   */
  getNormalMatrix(matrix4: AcGeMatrix3d) {
    return this.setFromMatrix4(matrix4).invert().transpose()
  }

  /**
   * Set this matrix as the upper left 3x3 of the normal matrix of the passed matrix4. The normal
   * matrix is the inverse transpose of the matrix m.
   * @param r Input one 4x4 matrix
   * @returns Return this matrix
   */
  transposeIntoArray(r: AcGeMatrix3d) {
    const m = this.elements

    r.elements[0] = m[0]
    r.elements[1] = m[3]
    r.elements[2] = m[6]
    r.elements[3] = m[1]
    r.elements[4] = m[4]
    r.elements[5] = m[7]
    r.elements[6] = m[2]
    r.elements[7] = m[5]
    r.elements[8] = m[8]

    return this
  }

  /**
   * Set the UV transform matrix from offset, repeat, rotation, and center.
   * @param tx Input offset x
   * @param ty Input offset y
   * @param sx Input repeat x
   * @param sy Input repeat y
   * @param rotation Input rotation, in radians. Positive values rotate counterclockwise
   * @param cx Input center x of rotation
   * @param cy Input center y of rotation
   * @returns Return this matrix
   */
  setUvTransform(
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    rotation: number,
    cx: number,
    cy: number
  ) {
    const c = Math.cos(rotation)
    const s = Math.sin(rotation)

    this.set(
      sx * c,
      sx * s,
      -sx * (c * cx + s * cy) + cx + tx,
      -sy * s,
      sy * c,
      -sy * (-s * cx + c * cy) + cy + ty,
      0,
      0,
      1
    )

    return this
  }

  /**
   * Scale this matrix with the given scalar values.
   * @param sx Input one scalar value
   * @param sy Input one scalar value
   * @returns Return this matrix
   */
  scale(sx: number, sy: number) {
    this.premultiply(_m3.makeScale(sx, sy))

    return this
  }

  /**
   * Rotate this matrix by the given angle (in radians).
   * @param theta Input one angle in radians
   * @returns Return this matrix
   */
  rotate(theta: number) {
    this.premultiply(_m3.makeRotation(-theta))

    return this
  }

  /**
   * Translate this matrix by the given scalar values.
   * @param tx Input one scalar value
   * @param ty Input one scalar value
   * @returns Return this matrix
   */
  translate(tx: number, ty: number) {
    this.premultiply(_m3.makeTranslation(tx, ty))

    return this
  }

  /**
   * Set this matrix as a 2D translation transform:
   * @param x Input one 2d vector or one number
   * @param y Input one number
   * @returns Return this matrix
   */
  makeTranslation(x: number | AcGeVector2d, y: number) {
    if (x instanceof AcGeVector2d) {
      this.set(1, 0, x.x, 0, 1, x.y, 0, 0, 1)
    } else {
      this.set(1, 0, x, 0, 1, y, 0, 0, 1)
    }

    return this
  }

  /**
   * Set this matrix as a 2D rotational transformation by theta radians
   * @param theta Input rotation angle in radians. Positive values rotate counterclockwise.
   * @returns Return this matrix
   */
  makeRotation(theta: number) {
    // counterclockwise

    const c = Math.cos(theta)
    const s = Math.sin(theta)

    this.set(c, -s, 0, s, c, 0, 0, 0, 1)

    return this
  }

  /**
   * Set this matrix as a 2D scale transform
   * @param x Input the amount to scale in the X axis.
   * @param y Input the amount to scale in the Y axis.
   * @returns Return this matrix
   */
  makeScale(x: number, y: number) {
    this.set(x, 0, 0, 0, y, 0, 0, 0, 1)

    return this
  }

  /**
   * Return true if this matrix and m are equal.
   * @param matrix Input one matrix to compare
   * @returns Return true if this matrix and m are equal.
   */
  equals(matrix: AcGeMatrix2d) {
    const te = this.elements
    const me = matrix.elements

    for (let i = 0; i < 9; i++) {
      if (te[i] !== me[i]) return false
    }

    return true
  }

  /**
   * Set the elements of this matrix based on an array in column-major format.
   * @param array Input the array to read the elements from.
   * @param offset Input (optional) index of first element in the array. Default is 0.
   * @returns Return this matrix
   */
  fromArray(array: number[], offset: number = 0) {
    for (let i = 0; i < 9; i++) {
      this.elements[i] = array[i + offset]
    }

    return this
  }

  /**
   * Write the elements of this matrix to an array in column-major format.
   * @param array  Input (optional) array to store the resulting vector in. If not given a new array will be created.
   * @param offset Input (optional) offset in the array at which to put the result.
   * @returns Return this matrix
   */
  toArray(array: number[] = [], offset: number = 0) {
    const te = this.elements

    array[offset] = te[0]
    array[offset + 1] = te[1]
    array[offset + 2] = te[2]

    array[offset + 3] = te[3]
    array[offset + 4] = te[4]
    array[offset + 5] = te[5]

    array[offset + 6] = te[6]
    array[offset + 7] = te[7]
    array[offset + 8] = te[8]

    return array
  }

  /**
   * Creates a new 3x3 matrix and with identical elements to this one.
   * @returns Return the cloned matrix
   */
  clone() {
    return new AcGeMatrix2d().fromArray(this.elements)
  }
}

const _m3 = /*@__PURE__*/ new AcGeMatrix2d()
