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

import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrMTextRenderer } from '../renderer'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import {
  AcTrMTextColorUtil,
  type AcTrMTextEntityTraits,
  AcTrSubEntityTraitsUtil,
  resolveShapeGlyphKey,
  resolveShapeTextStyle
} from '../util'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import {
  getSceneDrawableUserData,
  resolveMTextRenderRoot
} from '../util/AcTrObjectUserData'
import { AcTrEntity } from './AcTrEntity'

const _raycastBox = /*@__PURE__*/ new THREE.Box3()
const _raycastPoint = /*@__PURE__*/ new THREE.Vector3()

export class AcTrShape extends AcTrEntity {
  private _rendered?: MTextObject
  private _shape: AcGiShapeData
  private _style: AcGiTextStyle
  private _colorSettings: ColorSettings
  private _entityTraits: AcTrMTextEntityTraits

  constructor(
    shape: AcGiShapeData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle | null | undefined,
    context: AcTrRenderContext,
    delay: boolean = false
  ) {
    super(context)
    this._shape = shape
    this._style = resolveShapeTextStyle(shape, style, context)
    this._entityTraits = AcTrMTextColorUtil.snapshotEntityTraits(traits)
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      context.styleManager.currentBackgroundColor
    )
    if (!delay) {
      this.syncDraw()
    }
  }

  /** Reapplies CAD text materials from the entity traits snapshot. */
  refreshTextMaterials(): void {
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      {
        ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
        color: this._entityTraits.color,
        layer: this._entityTraits.layer
      },
      this.renderContext.styleManager.currentBackgroundColor
    )
    AcTrMTextColorUtil.rematerializeTextHierarchy(
      this,
      this._entityTraits,
      this.renderContext.styleManager
    )
  }

  /**
   * Builds renderer input with only the glyph key that should be resolved.
   *
   * mtext-renderer falls back from shape name to shape number when both are
   * present; SHAPE entities should use the name exclusively when it is set.
   */
  private toRenderableShapeData(): ShapeData {
    const source = this._shape as ShapeData
    const { byName, byCode } = resolveShapeGlyphKey(this._shape)
    return {
      ...source,
      name: byName,
      shapeNumber: byCode
    }
  }

  override syncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = mtextRenderer.syncRenderShape(
        this.toRenderableShapeData(),
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

  override async asyncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = await mtextRenderer.asyncRenderShape(
        this.toRenderableShapeData(),
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
    if (intersects.length > previousLength || this.wcsBbox.isEmpty()) return

    _raycastBox.copy(this.wcsBbox)
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

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      position: this._shape.position
    })
  }

  private attachRendered(rendered: MTextObject) {
    this.add(rendered)
    const renderRoot = resolveMTextRenderRoot(rendered)
    if (this.resolveDrawMode() === 'unbatch') {
      this.markDrawableUnbatched(renderRoot)
    } else {
      this.flatten()
    }
    this.removeInvalidGeometryLeaves()
    this.traverse(object => {
      getSceneDrawableUserData(object).bboxIntersectionCheck = true
    })
    this.updateSelectionBox(rendered)
  }

  private updateSelectionBox(rendered: MTextObject) {
    const geometryBox = this.computeGeometryBox()
    if (geometryBox.isEmpty()) {
      this.wcsBbox = rendered.box
      return
    }
    if (!rendered.box.isEmpty() && rendered.box.intersectsBox(geometryBox)) {
      this.wcsBbox = geometryBox.clone().union(rendered.box)
      return
    }
    this.wcsBbox = geometryBox
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
