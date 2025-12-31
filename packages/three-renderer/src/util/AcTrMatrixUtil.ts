import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

/**
 * Util class for Threejs Matrix
 * @internal
 */
export class AcTrMatrixUtil {
  static createMatrix4(matrix: AcGeMatrix3d) {
    const elements = matrix.elements
    return new THREE.Matrix4(
      elements[0],
      elements[4],
      elements[8],
      elements[12],
      elements[1],
      elements[5],
      elements[9],
      elements[13],
      elements[2],
      elements[6],
      elements[10],
      elements[14],
      elements[3],
      elements[7],
      elements[11],
      elements[15]
    )
  }
}
