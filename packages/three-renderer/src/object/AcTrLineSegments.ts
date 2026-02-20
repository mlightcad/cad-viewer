import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

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

    if (material instanceof LineMaterial) {
      const segmentCount = Math.floor(indices.length / 2)
      const segmentPositions = new Float32Array(segmentCount * 6)
      const box = new THREE.Box3()
      for (let i = 0; i < array.length; i += itemSize) {
        box.expandByPoint(
          _point.set(array[i], array[i + 1], (array[i + 2] as number) ?? 0)
        )
      }
      for (let i = 0, pos = 0; i < segmentCount; i++) {
        const i1 = indices[i * 2]
        const i2 = indices[i * 2 + 1]
        const base1 = i1 * itemSize
        const base2 = i2 * itemSize
        segmentPositions[pos++] = array[base1]
        segmentPositions[pos++] = array[base1 + 1]
        segmentPositions[pos++] = array[base1 + 2] ?? 0
        segmentPositions[pos++] = array[base2]
        segmentPositions[pos++] = array[base2 + 1]
        segmentPositions[pos++] = array[base2 + 2] ?? 0
      }

      const lineGeometry = new LineSegmentsGeometry()
      lineGeometry.setPositions(segmentPositions)
      lineGeometry.computeBoundingBox()
      lineGeometry.computeBoundingSphere()
      this.box.copy(box)

      const line = new LineSegments2(lineGeometry, material)
      line.userData.styleMaterialId = material.id
      this.add(line)
      return
    }

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

const _point = /*@__PURE__*/ new THREE.Vector3()
