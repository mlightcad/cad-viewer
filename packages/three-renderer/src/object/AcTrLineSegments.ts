import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { resolveAnchorFromBox } from '../draw/AcTrBatchDrawPolicy'
import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil, getSceneDrawableUserData } from '../util'
import { AcTrEntity } from './AcTrEntity'

export class AcTrLineSegments extends AcTrEntity {
  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ) {
    super(context)

    const material = this.styleManager.getLineMaterial(traits)
    const localOrigin = this.computeLocalOrigin(array, itemSize)

    if (material instanceof LineMaterial) {
      const segmentCount = Math.floor(indices.length / 2)
      const segmentPositions = new Float32Array(segmentCount * 6)
      for (let i = 0, pos = 0; i < segmentCount; i++) {
        const i1 = indices[i * 2]
        const i2 = indices[i * 2 + 1]
        const base1 = i1 * itemSize
        const base2 = i2 * itemSize
        segmentPositions[pos++] = array[base1] - localOrigin.x
        segmentPositions[pos++] = array[base1 + 1] - localOrigin.y
        segmentPositions[pos++] =
          this.getZ(array, base1, itemSize) - localOrigin.z
        segmentPositions[pos++] = array[base2] - localOrigin.x
        segmentPositions[pos++] = array[base2 + 1] - localOrigin.y
        segmentPositions[pos++] =
          this.getZ(array, base2, itemSize) - localOrigin.z
      }

      const lineGeometry = new LineSegmentsGeometry()
      lineGeometry.setPositions(segmentPositions)
      lineGeometry.computeBoundingBox()
      lineGeometry.computeBoundingSphere()
      this.setBoundingBox(
        lineGeometry as unknown as THREE.BufferGeometry,
        localOrigin
      )

      const line = new LineSegments2(lineGeometry, material)
      line.position.copy(localOrigin)
      getSceneDrawableUserData(line).styleMaterialId = material.id
      this.add(line)
      this.finalizeLeafDrawables()
      return
    }

    const localArray = new Float32Array(array.length)
    for (let i = 0; i < array.length; i += itemSize) {
      localArray[i] = array[i] - localOrigin.x
      localArray[i + 1] = array[i + 1] - localOrigin.y
      if (itemSize > 2) {
        localArray[i + 2] = this.getZ(array, i, itemSize) - localOrigin.z
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(localArray, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry, localOrigin)

    const line = new THREE.LineSegments(geometry, material)
    line.position.copy(localOrigin)
    AcTrBufferGeometryUtil.computeLineDistances(line)
    this.add(line)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.box)
    })
  }

  private computeLocalOrigin(array: Float32Array, itemSize: number) {
    const box = new THREE.Box3()
    for (let i = 0; i < array.length; i += itemSize) {
      box.expandByPoint(
        _point.set(array[i], array[i + 1], this.getZ(array, i, itemSize))
      )
    }
    return box.getCenter(new THREE.Vector3())
  }

  private getZ(array: Float32Array, base: number, itemSize: number) {
    return itemSize > 2 ? array[base + 2] : 0
  }

  private setBoundingBox(
    geometry: THREE.BufferGeometry,
    localOrigin: THREE.Vector3
  ) {
    const localBox = AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (!localBox) {
      return
    }
    const worldBox = localBox.clone()
    worldBox.translate(localOrigin)
    this.box = worldBox
  }
}

const _point = /*@__PURE__*/ new THREE.Vector3()
