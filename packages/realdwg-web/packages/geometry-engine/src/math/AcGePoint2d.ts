import { AcGeVector2d, AcGeVector2dLike } from './AcGeVector2d'

/**
 * The interface representing a point in 2-dimensional space.
 */
export type AcGePoint2dLike = AcGeVector2dLike

/**
 * The class representing a point in 2-dimensional space.
 */
export class AcGePoint2d extends AcGeVector2d {
  /**
   * Convert one point array to one number array
   * @param array Input one point array
   * @returns Return converted number array
   */
  static pointArrayToNumberArray(array: AcGePoint2d[]) {
    const numberArray = new Array<number>(array.length * 2)
    array.forEach((item, index) => {
      item.toArray(numberArray, index * 2)
    })
    return numberArray
  }
}
