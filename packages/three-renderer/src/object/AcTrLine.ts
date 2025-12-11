import { AcGePoint3dLike, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrBufferGeometryUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrLine extends AcTrEntity {
  public geometry: THREE.BufferGeometry

  constructor(
    points: AcGePoint3dLike[],
    traits: AcGiSubEntityTraits,
    styleManager: AcTrStyleManager
  ) {
    super(styleManager)

    const material = this.styleManager.getLineMaterial(traits)
    const maxVertexCount = points.length
    const vertices = new Float32Array(maxVertexCount * 3)
    const indices =
      maxVertexCount * 2 > 65535
        ? new Uint32Array(maxVertexCount * 2)
        : new Uint16Array(maxVertexCount * 2)

    for (let i = 0, pos = 0; i < maxVertexCount; i++) {
      const point = points[i]
      vertices[pos++] = point.x
      vertices[pos++] = point.y
      vertices[pos++] = point.z ?? 0
    }
    for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
      indices[pos++] = i
      indices[pos++] = i + 1
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry)
    this.geometry = geometry

    const line = new THREE.LineSegments(geometry, material)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
  }

  private setBoundingBox(geometry: THREE.BufferGeometry) {
    geometry.computeBoundingBox()
    this.box = geometry.boundingBox!
  }
}
