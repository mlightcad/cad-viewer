import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

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
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(array, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeBoundingBox()
    this.box = geometry.boundingBox!

    const line = new THREE.LineSegments(geometry, material)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
  }
}
