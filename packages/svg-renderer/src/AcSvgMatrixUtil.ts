import { AcGeBox2d, AcGeMatrix3d, AcGePoint3dLike } from '@mlightcad/data-model'

/**
 * Converts CAD 4×4 matrices to SVG transforms and transforms 2D boxes.
 */
export class AcSvgMatrixUtil {
  /**
   * SVG `matrix(a,b,c,d,e,f)` for 2D geometry (CAD Y-up, applied before root Y-flip).
   */
  static toSvgTransform(matrix: AcGeMatrix3d): string {
    const e = matrix.elements
    return `matrix(${e[0]},${e[1]},${e[4]},${e[5]},${e[12]},${e[13]})`
  }

  static transformPoint(
    matrix: AcGeMatrix3d,
    point: AcGePoint3dLike
  ): { x: number; y: number } {
    const e = matrix.elements
    const x = point.x
    const y = point.y
    const z = point.z ?? 0
    const w = e[3] * x + e[7] * y + e[11] * z + e[15]
    const invW = w === 0 ? 1 : 1 / w
    return {
      x: (e[0] * x + e[4] * y + e[8] * z + e[12]) * invW,
      y: (e[1] * x + e[5] * y + e[9] * z + e[13]) * invW
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
