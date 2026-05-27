import {
  AcGePoint3dLike,
  AcGiPointStyle,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import * as THREE from 'three'

import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import { getSceneDrawableUserData } from '../util/AcTrObjectUserData'
import { AcTrEntity } from './AcTrEntity'

const _vector3 = /*@__PURE__*/ new THREE.Vector3()

export class AcTrPoint extends AcTrEntity {
  /**
   * The flag whether to use one point using THREE.Points
   */
  isShowPoint: boolean
  private _point: AcGePoint3dLike

  constructor(
    point: AcGePoint3dLike,
    traits: AcGiSubEntityTraits,
    style: AcGiPointStyle,
    context: AcTrRenderContext
  ) {
    super(context)
    this._point = point
    const pointSymbol = AcTrPointSymbolCreator.instance.create(
      style.displayMode
    )
    const localOrigin = _vector3.set(point.x, point.y, point.z ?? 0)

    this.isShowPoint = pointSymbol.point != null

    // Always create one THREE.Points object. If 'isShowPoint' is true, show it. Otherwise, hide it.
    const geometry =
      pointSymbol.point ??
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()])
    const pointBoundingBox =
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (pointBoundingBox) {
      this.box.union(pointBoundingBox.clone().translate(localOrigin))
    }
    const material = this.styleManager.getPointsMaterial(traits)
    const pointObj = new THREE.Points(geometry, material)
    pointObj.position.copy(localOrigin)
    // Add the flag to check intersection using bounding box of the mesh
    getSceneDrawableUserData(pointObj).bboxIntersectionCheck = true
    pointObj.visible = this.isShowPoint
    this.add(pointObj)

    if (pointSymbol.line) {
      const geometry = pointSymbol.line
      const lineBoundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (lineBoundingBox) {
        this.box.union(lineBoundingBox.clone().translate(localOrigin))
      }
      const material = this.styleManager.getLineMaterial(traits, true)
      const lineSegmentsObj = new THREE.LineSegments(geometry, material)
      lineSegmentsObj.position.copy(localOrigin)
      const lineDrawable = getSceneDrawableUserData(lineSegmentsObj)
      // Add the flag to check intersection using bounding box of the mesh
      lineDrawable.bboxIntersectionCheck = true
      // Add this flag so that batched group can handle it with different logic
      lineDrawable.isPoint = true
      lineDrawable.position = { x: point.x, y: point.y, z: point.z }
      this.add(lineSegmentsObj)
    }
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      position: this._point
    })
  }
}
