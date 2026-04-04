import { AcGePoint3dLike, AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrBufferGeometryUtil } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrLine extends AcTrEntity {
  public geometry: THREE.BufferGeometry | LineSegmentsGeometry

  constructor(
    points: AcGePoint3dLike[],
    traits: AcGiSubEntityTraits,
    styleManager: AcTrStyleManager,
    basicMaterialOnly: boolean = false
  ) {
    super(styleManager)

    const material = this.styleManager.getLineMaterial(
      traits,
      basicMaterialOnly
    )
    const maxVertexCount = points.length
    const localOrigin = this.computeLocalOrigin(points)

    if (material instanceof LineMaterial) {
      const segmentPositions = new Float32Array((maxVertexCount - 1) * 6)
      for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]
        segmentPositions[pos++] = p1.x - localOrigin.x
        segmentPositions[pos++] = p1.y - localOrigin.y
        segmentPositions[pos++] = (p1.z ?? 0) - localOrigin.z
        segmentPositions[pos++] = p2.x - localOrigin.x
        segmentPositions[pos++] = p2.y - localOrigin.y
        segmentPositions[pos++] = (p2.z ?? 0) - localOrigin.z
      }

      const lineGeometry = new LineSegmentsGeometry()
      lineGeometry.setPositions(segmentPositions)
      lineGeometry.computeBoundingBox()
      lineGeometry.computeBoundingSphere()
      this.geometry = lineGeometry
      this.setBoundingBox(
        lineGeometry as unknown as THREE.BufferGeometry,
        localOrigin
      )

      const line = new LineSegments2(lineGeometry, material)
      line.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
      line.userData.styleMaterialId = material.id
      this.add(line)
      return
    }

    const vertices = new Float32Array(maxVertexCount * 3)
    const indices =
      maxVertexCount * 2 > 65535
        ? new Uint32Array(maxVertexCount * 2)
        : new Uint16Array(maxVertexCount * 2)

    for (let i = 0, pos = 0; i < maxVertexCount; i++) {
      const point = points[i]
      vertices[pos++] = point.x - localOrigin.x
      vertices[pos++] = point.y - localOrigin.y
      vertices[pos++] = (point.z ?? 0) - localOrigin.z
    }
    for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
      indices[pos++] = i
      indices[pos++] = i + 1
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry, localOrigin)

    this.geometry = geometry
    const line = new THREE.LineSegments(geometry, material)
    line.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
  }

  private setBoundingBox(
    geometry: THREE.BufferGeometry,
    localOrigin: THREE.Vector3
  ) {
    geometry.computeBoundingBox()
    const worldBox = geometry.boundingBox!.clone()
    worldBox.translate(localOrigin)
    this.box = worldBox
  }

  private computeLocalOrigin(points: AcGePoint3dLike[]) {
    const box = new THREE.Box3()
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      box.expandByPoint(_point1.set(p.x, p.y, p.z ?? 0))
    }
    return box.getCenter(new THREE.Vector3())
  }
}

const _point1 = /*@__PURE__*/ new THREE.Vector3()
