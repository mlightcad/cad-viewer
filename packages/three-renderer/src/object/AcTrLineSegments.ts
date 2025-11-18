import { AcGePoint3d, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrBufferGeometryUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'
import { AcTrFloatArrayRebaser } from './rebaser'

export class AcTrLineSegments extends AcTrEntity {
  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    styleManager: AcTrStyleManager,
    basePoint?: AcGePoint3d,
  ) {
    super(styleManager, basePoint)

    const material = this.styleManager.getLineMaterial(traits)
    const geometry = new THREE.BufferGeometry()
    const offset = this.rebase(
      new AcTrFloatArrayRebaser(array, itemSize),
      basePoint
    )

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(array, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry, offset)

    const line = new THREE.LineSegments(geometry, material)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
  }
}
