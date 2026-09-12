import { AcGeBox2d, AcGeMatrix3d, AcGePoint3dLike } from '@mlightcad/data-model'

/**
 * 2D helpers for AcGe 4×4 matrices used while painting PDF content.
 */
export class AcPdfMatrixUtil {
  /**
   * PDF `cm` operands `[a b c d e f]` for the XY affine part of a 4×4 matrix.
   */
  static toPdfMatrix(matrix: AcGeMatrix3d): {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
  } {
    const el = matrix.elements
    return {
      a: el[0],
      b: el[1],
      c: el[4],
      d: el[5],
      e: el[12],
      f: el[13]
    }
  }

  static transformPoint(
    matrix: AcGeMatrix3d,
    point: AcGePoint3dLike
  ): { x: number; y: number } {
    const el = matrix.elements
    const x = point.x
    const y = point.y
    const z = point.z ?? 0
    const w = el[3] * x + el[7] * y + el[11] * z + el[15]
    const invW = w === 0 ? 1 : 1 / w
    return {
      x: (el[0] * x + el[4] * y + el[8] * z + el[12]) * invW,
      y: (el[1] * x + el[5] * y + el[9] * z + el[13]) * invW
    }
  }

  static transformBox(box: AcGeBox2d, matrix: AcGeMatrix3d): void {
    if (box.isEmpty()) {
      return
    }
    const min = box.min
    const max = box.max
    const corners: AcGePoint3dLike[] = [
      { x: min.x, y: min.y, z: 0 },
      { x: max.x, y: min.y, z: 0 },
      { x: max.x, y: max.y, z: 0 },
      { x: min.x, y: max.y, z: 0 }
    ]
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const corner of corners) {
      const p = this.transformPoint(matrix, corner)
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    box.min.set(minX, minY)
    box.max.set(maxX, maxY)
  }
}
