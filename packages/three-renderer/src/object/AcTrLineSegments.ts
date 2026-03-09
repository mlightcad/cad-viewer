import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrLineMaterialManager } from '../style/AcTrLineMaterialManager'
import { AcTrSolidLineShaders } from '../style/AcTrSolidLineShaders'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrBufferGeometryUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrLineSegments extends AcTrEntity {
  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    styleManager: AcTrStyleManager
  ) {
    super(styleManager)

    const material = this.styleManager.getLineMaterial(traits)

    // Always create standard geometry for bbox, batching, and raycaster
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(array, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeBoundingBox()
    this.box = geometry.boundingBox!

    if (material instanceof THREE.LineBasicMaterial) {
      // Use triangle-based quad geometry for non-patterned solid lines to avoid
      // WebGL gl.LINES brightness/gap artifacts. Patterned lines still use
      // LineSegments because they rely on lineDistance attributes.
      let positions3: Float32Array
      if (itemSize === 2) {
        const vertexCount = array.length / 2
        positions3 = new Float32Array(vertexCount * 3)
        for (let i = 0; i < vertexCount; i++) {
          positions3[i * 3] = array[i * 2]
          positions3[i * 3 + 1] = array[i * 2 + 1]
          positions3[i * 3 + 2] = 0
        }
      } else {
        positions3 = array
      }

      const mesh = AcTrSolidLineShaders.buildQuadMesh(
        positions3, indices as unknown as ArrayLike<number>, geometry, material,
        material.color.getHex(), AcTrLineMaterialManager.ResolutionUniform
      )
      this.add(mesh)
    } else {
      const line = new THREE.LineSegments(geometry, material)
      AcTrBufferGeometryUtil.computeLineDistances(line)
      this.add(line)
    }
  }
}
