import {
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle,
  log
} from '@mlightcad/data-model'
import {
  ColorSettings,
  MTextObject,
  ShapeData
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrMTextRenderer } from '../renderer'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrMTextColorUtil } from '../util'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import { getSceneDrawableUserData } from '../util/AcTrObjectUserData'
import { AcTrEntity } from './AcTrEntity'

const _raycastBox = /*@__PURE__*/ new THREE.Box3()
const _raycastPoint = /*@__PURE__*/ new THREE.Vector3()

export class AcTrShape extends AcTrEntity {
  private _rendered?: MTextObject
  private _shape: AcGiShapeData
  private _style: AcGiTextStyle
  private _colorSettings: ColorSettings

  constructor(
    shape: AcGiShapeData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    styleManager: AcTrStyleManager,
    delay: boolean = false
  ) {
    super(styleManager)
    this._shape = shape
    this._style = { ...style }
    this._colorSettings = {
      layer: traits.layer,
      color: AcTrMTextColorUtil.toMTextColor(traits.color),
      byLayerColor: 0xffffff,
      byBlockColor: 0xffffff
    }
    if (!delay) {
      this.syncDraw()
    }
  }

  syncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = mtextRenderer.syncRenderShape(
        this._shape as ShapeData,
        this._style,
        this._colorSettings
      )
      this.attachRendered(this._rendered)
    } catch (error) {
      log.info(
        `Failed to render shape '${this.describeShape()}' with the following error:\n`,
        error
      )
    }
  }

  async draw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = await mtextRenderer.asyncRenderShape(
        this._shape as ShapeData,
        this._style,
        this._colorSettings
      )
      this.attachRendered(this._rendered)
    } catch (error) {
      log.info(
        `Failed to render shape '${this.describeShape()}' with the following error:\n`,
        error
      )
    }
  }

  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const previousLength = intersects.length

    this._rendered?.raycast(raycaster, intersects)
    if (intersects.length > previousLength || this.box.isEmpty()) return

    _raycastBox.copy(this.box).applyMatrix4(this.matrixWorld)
    if (raycaster.ray.intersectBox(_raycastBox, _raycastPoint)) {
      intersects.push({
        distance: raycaster.ray.origin.distanceTo(_raycastPoint),
        point: _raycastPoint.clone(),
        object: this,
        face: null,
        faceIndex: undefined,
        uv: undefined
      })
    }
  }

  private describeShape() {
    return this._shape.name?.trim() || String(this._shape.shapeNumber ?? '')
  }

  private attachRendered(rendered: MTextObject) {
    this.add(rendered)
    this.flatten()
    this.removeInvalidGeometryLeaves()
    this.traverse(object => {
      getSceneDrawableUserData(object).bboxIntersectionCheck = true
    })
    this.updateSelectionBox(rendered)
  }

  private updateSelectionBox(rendered: MTextObject) {
    const geometryBox = this.computeGeometryBox()
    if (geometryBox.isEmpty()) {
      this.box = rendered.box
      return
    }
    if (!rendered.box.isEmpty() && rendered.box.intersectsBox(geometryBox)) {
      this.box = geometryBox.clone().union(rendered.box)
      return
    }
    this.box = geometryBox
  }

  private computeGeometryBox() {
    const box = new THREE.Box3()
    const childBox = new THREE.Box3()

    this.updateMatrixWorld(true)
    this.traverse(object => {
      if (!this.hasGeometry(object)) return

      const geometry = object.geometry
      const boundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (boundingBox == null) return

      object.updateMatrixWorld(true)
      childBox.copy(boundingBox).applyMatrix4(object.matrixWorld)
      box.union(childBox)
    })

    return box
  }

  private removeInvalidGeometryLeaves() {
    const invalidObjects: THREE.Object3D[] = []
    this.traverse(object => {
      if (!this.hasGeometry(object)) return
      if (AcTrBufferGeometryUtil.hasFinitePositions(object.geometry)) return
      invalidObjects.push(object)
    })

    for (const object of invalidObjects) {
      object.parent?.remove(object)
      if (this.hasGeometry(object)) {
        object.geometry.dispose()
      }
    }
  }

  private hasGeometry(
    object: THREE.Object3D
  ): object is THREE.Mesh | THREE.Line | THREE.Points {
    return (
      'geometry' in object && object.geometry instanceof THREE.BufferGeometry
    )
  }
}
