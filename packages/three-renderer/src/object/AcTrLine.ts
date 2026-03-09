import { AcGePoint3dLike, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrLineMaterialManager } from '../style/AcTrLineMaterialManager'
import { AcTrSolidLineShaders } from '../style/AcTrSolidLineShaders'
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

    // Always create standard line geometry for bbox and batching/raycaster
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeBoundingBox()
    this.box = geometry.boundingBox!
    this.geometry = geometry

    if (material instanceof THREE.LineBasicMaterial) {
      // Use triangle-based quad geometry for non-patterned solid lines to avoid
      // WebGL gl.LINES brightness/gap artifacts. Patterned lines still use
      // LineSegments because they rely on lineDistance attributes.
      const segmentCount = (maxVertexCount - 1)
      const usedIndices = indices.slice(0, segmentCount * 2)
      const mesh = AcTrSolidLineShaders.buildQuadMesh(
        vertices, usedIndices, geometry, material,
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
