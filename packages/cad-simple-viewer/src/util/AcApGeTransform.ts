import { AcGeMatrix3d, AcGePoint3dLike } from '@mlightcad/data-model'

/**
 * Builds a world-space rotation matrix around a given base point.
 *
 * @param basePoint - Rotation origin.
 * @param angleRad - Rotation angle in radians.
 * @returns Composite transform that rotates around `basePoint`.
 */
export function createRotationMatrix(
  basePoint: AcGePoint3dLike,
  angleRad: number
) {
  return new AcGeMatrix3d()
    .makeTranslation(basePoint.x, basePoint.y, basePoint.z)
    .multiply(new AcGeMatrix3d().makeRotationZ(angleRad))
    .multiply(
      new AcGeMatrix3d().makeTranslation(
        -basePoint.x,
        -basePoint.y,
        -basePoint.z
      )
    )
}

/**
 * Builds a world-space uniform scale matrix around a given base point.
 *
 * @param basePoint - Scale origin, which stays fixed.
 * @param factor - Uniform scale factor (must be positive).
 * @returns Composite transform that scales around `basePoint`.
 */
export function createScaleMatrix(basePoint: AcGePoint3dLike, factor: number) {
  return new AcGeMatrix3d()
    .makeTranslation(basePoint.x, basePoint.y, basePoint.z)
    .multiply(new AcGeMatrix3d().makeScale(factor, factor, factor))
    .multiply(
      new AcGeMatrix3d().makeTranslation(
        -basePoint.x,
        -basePoint.y,
        -basePoint.z
      )
    )
}
