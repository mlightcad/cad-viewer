import { AcGeVector3d, AcGeVector3dLike } from '../math/AcGeVector3d'

/**
 * The interface representing a point in 3-dimensional space.
 */
export type AcGePoint3dLike = AcGeVector3dLike

/**
 * The class representing a point in 3-dimensional space.
 */
export class AcGePoint3d extends AcGeVector3d {
  /**
   * Convert one point array to one number array
   * @param array Input one point array
   * @param includeZ Include z cooridinate in returned number array if it is true.
   * @returns Return converted number array
   */
  static pointArrayToNumberArray(
    array: AcGePoint3d[],
    includeZ: boolean = true
  ) {
    const dimension = includeZ ? 3 : 2
    const numberArray = new Array<number>(array.length * dimension)
    array.forEach((item, index) => {
      item.toArray(numberArray, index * dimension)
    })
    return numberArray
  }
}
